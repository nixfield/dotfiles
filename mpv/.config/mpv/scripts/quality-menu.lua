-- quality-menu.lua
--
-- Change the stream video and audio quality on the fly.
--
-- Usage:
-- add bindings to input.conf:
-- Ctrl+f   script-message-to quality_menu video_formats_toggle
-- Alt+f    script-message-to quality_menu audio_formats_toggle
--
-- Displays a menu that lets you switch to different ytdl-format settings while
-- you're in the middle of a video (just like you were using the web player).

local mp = require 'mp'
local utils = require 'mp.utils'
local msg = require 'mp.msg'
local assdraw = require 'mp.assdraw'

local opts = {
  --key bindings
  up_binding = "UP WHEEL_UP",
  down_binding = "DOWN WHEEL_DOWN",
  select_binding = "ENTER MBTN_LEFT",
  close_menu_binding = "ESC MBTN_RIGHT Ctrl+f Alt+f",

  --youtube-dl version(could be youtube-dl or yt-dlp, or something else)
  ytdl_ver = "yt-dlp",

  --formatting / cursors
  selected_and_active     = "▶  - ",
  selected_and_inactive   = "●  - ",
  unselected_and_active   = "▷ - ",
  unselected_and_inactive = "○ - ",

  --font size scales by window, if false requires larger font and padding sizes
  scale_playlist_by_window = true,

  --playlist ass style overrides inside curly brackets, \keyvalue is one field, extra \ for escape in lua
  --example {\\fnUbuntu\\fs10\\b0\\bord1} equals: font=Ubuntu, size=10, bold=no, border=1
  --read http://docs.aegisub.org/3.2/ASS_Tags/ for reference of tags
  --undeclared tags will use default osd settings
  --these styles will be used for the whole playlist. More specific styling will need to be hacked in
  --
  --(a monospaced font is recommended but not required)
  style_ass_tags = "{\\fnmonospace\\fs10\\bord1}",

  --paddings for top left corner
  text_padding_x = 5,
  text_padding_y = 5,

  --how many seconds until the quality menu times out
  --setting this to 0 deactivates the timeout
  menu_timeout = 6,

  --use youtube-dl to fetch a list of available formats (overrides quality_strings)
  fetch_formats = true,

  --default menu entries
  quality_strings = [[
    [
    {"4320p" : "bestvideo[height<=?4320p]+bestaudio/best"},
    {"2160p" : "bestvideo[height<=?2160]+bestaudio/best"},
    {"1440p" : "bestvideo[height<=?1440]+bestaudio/best"},
    {"1080p" : "bestvideo[height<=?1080]+bestaudio/best"},
    {"720p" : "bestvideo[height<=?720]+bestaudio/best"},
    {"480p" : "bestvideo[height<=?480]+bestaudio/best"},
    {"360p" : "bestvideo[height<=?360]+bestaudio/best"},
    {"240p" : "bestvideo[height<=?240]+bestaudio/best"},
    {"144p" : "bestvideo[height<=?144]+bestaudio/best"}
    ]
    ]],

  --reset ytdl-format to the original format string when changing files (e.g. going to the next playlist entry)
  --if file was opened previously, reset to previously selected format
  reset_format = true,

  --automatically fetch available formats when opening a file
  fetch_on_start = false,

  --show the video format menu after opening a file
  start_with_menu = false,

  --include unknown formats in the list
  --Unfortunately choosing which formats are video or audio is not always perfect.
  --Set to true to make sure you don't miss any formats, but then the list
  --might also include formats that aren't actually video or audio.
  --Formats that are known to not be video or audio are still filtered out.
  include_unknown = false,

  --hide columns that are identical for all formats
  hide_identical_columns = true,

  --which columns are shown in which order
  --comma separated list, prefix column with "-" to align left
  --
  --columns that might be useful are:
  --resolution, width, height, fps, dynamic_range, tbr, vbr, abr, asr,
  --filesize, filesize_approx, vcodec, acodec, ext, video_ext, audio_ext,
  --language, format, format_note, quality
  --
  --columns that are derived from the above, but with special treatment:
  --frame_rate, bitrate_total, bitrate_video, bitrate_audio,
  --codec_video, codec_audio, audio_sample_rate
  --
  --If those still aren't enough or you're just curious, run:
  --yt-dlp -j <url>
  --This outputs unformatted JSON.
  --Format it and look under "formats" to see what's available.
  --
  --Not all videos have all columns available.
  --Be careful, misspelled columns simply won't be displayed, there is no error.
  columns_video = '-resolution,frame_rate,dynamic_range,language,bitrate_total,size,codec_video,codec_audio',
  columns_audio = 'audio_sample_rate,bitrate_total,size,language,codec_audio',

  --columns used for sorting, see "columns_video" for available columns
  --comma separated list, prefix column with "-" to reverse sorting order
  --Leaving this empty keeps the order from yt-dlp/youtube-dl.
  --Be careful, misspelled columns won't result in an error,
  --but they might influence the result.
  sort_video = 'height,fps,tbr,size,format_id',
  sort_audio = 'asr,tbr,size,format_id',
}
(require 'mp.options').read_options(opts, "quality-menu")
opts.quality_strings = utils.parse_json(opts.quality_strings)

-- special thanks to reload.lua (https://github.com/4e6/mpv-reload/)
local function reload_resume()
  local playlist_pos = mp.get_property_number("playlist-pos")
  local reload_duration = mp.get_property_native("duration")
  local time_pos = mp.get_property("time-pos")

  mp.set_property_number("playlist-pos", playlist_pos)

  -- Tries to determine live stream vs. pre-recorded VOD. VOD has non-zero
  -- duration property. When reloading VOD, to keep the current time position
  -- we should provide offset from the start. Stream doesn't have fixed start.
  -- Decent choice would be to reload stream from it's current 'live' position.
  -- That's the reason we don't pass the offset when reloading streams.
  if reload_duration and reload_duration > 0 then
    local function seeker()
      mp.commandv("seek", time_pos, "absolute")
      mp.unregister_event(seeker)
    end

    mp.register_event("file-loaded", seeker)
  end
end

local ytdl = {
  path = opts.ytdl_ver,
  searched = false,
  blacklisted = {}
}

local function process_json(json)
  local function is_video(format)
    -- "none" means it is not a video
    -- nil means it is unknown
    return (opts.include_unknown or format.vcodec) and format.vcodec ~= "none"
  end

  local function is_audio(format)
    return (opts.include_unknown or format.acodec) and format.acodec ~= "none"
  end

  local vfmt = nil
  local afmt = nil
  local requested_formats = json["requested_formats"] or json["requested_downloads"]
  for _, format in ipairs(requested_formats) do
    if is_video(format) then
      vfmt = format["format_id"]
    elseif is_audio(format) then
      afmt = format["format_id"]
    end
  end

  local video_formats = {}
  local audio_formats = {}
  local all_formats = {}
  for i = #json.formats, 1, -1 do
    local format = json.formats[i]
    if is_video(format) then
      video_formats[#video_formats + 1] = format
      all_formats[#all_formats + 1] = format
    elseif is_audio(format) then
      audio_formats[#audio_formats + 1] = format
      all_formats[#all_formats + 1] = format
    end
  end

  local function populate_special_fields(format)
    format.size = format.filesize or format.filesize_approx
    format.frame_rate = format.fps
    format.bitrate_total = format.tbr
    format.bitrate_video = format.vbr
    format.bitrate_audio = format.abr
    format.codec_video = format.vcodec
    format.codec_audio = format.acodec
    format.audio_sample_rate = format.asr
  end

  for _, format in ipairs(all_formats) do
    populate_special_fields(format)
  end

  local function strip_minus(list)
    local stripped_list = {}
    local had_minus = {}
    for i, val in ipairs(list) do
      if string.sub(val, 1, 1) == "-" then
        val = string.sub(val, 2)
        had_minus[val] = true
      end
      stripped_list[i] = val
    end
    return stripped_list, had_minus
  end

  local function string_split(inputstr, sep)
    if sep == nil then
      sep = "%s"
    end
    local t = {}
    for str in string.gmatch(inputstr, "([^" .. sep .. "]+)") do
      table.insert(t, str)
    end
    return t
  end

  local sort_video, reverse_video = strip_minus(string_split(opts.sort_video, ','))
  local sort_audio, reverse_audio = strip_minus(string_split(opts.sort_audio, ','))

  local function comp(properties, reverse)
    return function(a, b)
      for _, prop in ipairs(properties) do
        local a_val = a[prop]
        local b_val = b[prop]
        if a_val and b_val and type(a_val) ~= 'table' and a_val ~= b_val then
          if reverse[prop] then
            return a_val < b_val
          else
            return a_val > b_val
          end
        end
      end
      return false
    end
  end

  if #sort_video > 0 then
    table.sort(video_formats, comp(sort_video, reverse_video))
  end
  if #sort_audio > 0 then
    table.sort(audio_formats, comp(sort_audio, reverse_audio))
  end

  local function scale_filesize(size)
    if size == nil then
      return ""
    end
    size = tonumber(size)

    local counter = 0
    while size > 1024 do
      size = size / 1024
      counter = counter + 1
    end

    if counter >= 3 then return string.format("%.1fGiB", size)
    elseif counter >= 2 then return string.format("%.1fMiB", size)
    elseif counter >= 1 then return string.format("%.1fKiB", size)
    else return string.format("%.1fB  ", size)
    end
  end

  local function scale_bitrate(br)
    if br == nil then
      return ""
    end
    br = tonumber(br)

    local counter = 0
    while br > 1000 do
      br = br / 1000
      counter = counter + 1
    end

    if counter >= 2 then return string.format("%.1fGbps", br)
    elseif counter >= 1 then return string.format("%.1fMbps", br)
    else return string.format("%.1fKbps", br)
    end
  end

  local function format_special_fields(format)
    local size_prefix = not format.filesize and format.filesize_approx and "~" or ""
    format.size = (size_prefix) .. scale_filesize(format.size)
    format.frame_rate = format.fps and format.fps .. "fps" or ""
    format.bitrate_total = scale_bitrate(format.tbr)
    format.bitrate_video = scale_bitrate(format.vbr)
    format.bitrate_audio = scale_bitrate(format.abr)
    format.codec_video = format.vcodec == nil and "unknown" or format.vcodec == "none" and "" or format.vcodec
    format.codec_audio = format.acodec == nil and "unknown" or format.acodec == "none" and "" or format.acodec
    format.audio_sample_rate = format.asr and tostring(format.asr) .. "Hz" or ""
  end

  for _, format in ipairs(all_formats) do
    format_special_fields(format)
  end

  local function format_table(formats, columns)
    local function calc_shown_columns()
      local display_col = {}
      local column_widths = {}
      local column_values = {}
      local columns, column_align_left = strip_minus(columns)

      for _, format in pairs(formats) do
        for col, prop in ipairs(columns) do
          local label = tostring(format[prop] or "")
          format[prop] = label

          if not column_widths[col] or column_widths[col] < label:len() then
            column_widths[col] = label:len()
          end

          column_values[col] = column_values[col] or label
          display_col[col] = display_col[col] or (column_values[col] ~= label)
        end
      end

      local show_columns = {}
      for i, width in ipairs(column_widths) do
        if width > 0 and not opts.hide_identical_columns or display_col[i] then
          local prop = columns[i]
          show_columns[#show_columns + 1] = {
            prop = prop,
            width = width,
            align_left = column_align_left[prop]
          }
        end
      end
      return show_columns
    end

    local show_columns = calc_shown_columns()

    local spacing = 2
    local res = {}
    for _, f in ipairs(formats) do
      local row = ''
      for i, column in ipairs(show_columns) do
        -- lua errors out with width > 99 ("invalid conversion specification")
        local width = math.min(column.width * (column.align_left and -1 or 1), 99)
        row = row .. (i > 1 and string.format('%' .. spacing .. 's', '') or '')
            .. string.format('%' .. width .. 's', f[column.prop] or "")
      end
      res[#res + 1] = { label = row, format = f.format_id }
    end
    return res
  end

  local columns_video = string_split(opts.columns_video, ',')
  local columns_audio = string_split(opts.columns_audio, ',')
  local vres = format_table(video_formats, columns_video)
  local ares = format_table(audio_formats, columns_audio)
  return vres, ares, vfmt, afmt
end

local url_data = {}
local function process_json_string(url, json)
  local json, err = utils.parse_json(json)

  if (json == nil) then
    mp.osd_message("fetching formats failed...", 2)
    msg.error("failed to parse JSON data: " .. err)
    return
  end

  if json.formats == nil then
    return
  end

  local vres, ares, vfmt, afmt = process_json(json)
  url_data[url] = { voptions = vres, aoptions = ares, vfmt = vfmt, afmt = afmt }
  return vres, ares, vfmt, afmt
end

local function download_formats(url)

  mp.osd_message("fetching available formats with youtube-dl...", 60)

  if not (ytdl.searched) then
    local ytdl_mcd = mp.find_config_file(opts.ytdl_ver)
    if not (ytdl_mcd == nil) then
      msg.verbose("found youtube-dl at: " .. ytdl_mcd)
      ytdl.path = ytdl_mcd
    end
    ytdl.searched = true
  end

  local function exec(args)
    local res, err = mp.command_native({ name = "subprocess", args = args, capture_stdout = true, capture_stderr = true })
    return res.status, res.stdout, res.stderr
  end

  local ytdl_format = mp.get_property("ytdl-format")
  local command = nil
  if (ytdl_format == nil or ytdl_format == "") then
    command = { ytdl.path, "--no-warnings", "--no-playlist", "-J", url }
  else
    command = { ytdl.path, "--no-warnings", "--no-playlist", "-J", "-f", ytdl_format, url }
  end

  msg.verbose("calling youtube-dl with command: " .. table.concat(command, " "))

  local es, stdout, stderr = exec(command)

  if (es < 0) or (stdout == nil) or (stdout == "") then
    mp.osd_message("fetching formats failed...", 2)
    msg.error("failed to get format list: " .. es)
    msg.error("stderr: " .. stderr)
    return
  end

  msg.verbose("youtube-dl succeeded!")
  mp.osd_message("", 0)

  local vres, ares, vfmt, afmt = process_json_string(url, stdout)
  return vres, ares, vfmt, afmt
end

local function get_url()
  local path = mp.get_property("path")
  path = string.gsub(path, "ytdl://", "") -- Strip possible ytdl:// prefix.

  local function is_url(s)
    -- adapted the regex from https://stackoverflow.com/questions/3809401/what-is-a-good-regular-expression-to-match-a-url
    return nil ~=
        string.match(path,
          "^[%w]-://[-a-zA-Z0-9@:%._\\+~#=]+%.[a-zA-Z0-9()][a-zA-Z0-9()]?[a-zA-Z0-9()]?[a-zA-Z0-9()]?[a-zA-Z0-9()]?[a-zA-Z0-9()]?[-a-zA-Z0-9()@:%_\\+.~#?&/=]*")
  end

  return is_url(path) and path or nil
end

local function get_formats()

  local url = get_url()
  if url == nil then
    return
  end

  if url_data[url] then
    local data = url_data[url]
    return data.voptions, data.aoptions, data.vfmt, data.afmt, url
  end

  if opts.fetch_formats == false then
    local vres = {}
    for i, v in ipairs(opts.quality_strings) do
      for k, v2 in pairs(v) do
        vres[i] = { label = k, format = v2 }
      end
    end
    url_data[url] = { voptions = vres, aoptions = {}, vfmt = nil, afmt = nil }
    return vres, {}, nil, nil, url
  end

  local vres, ares, vfmt, afmt = download_formats(url)
  return vres, ares, vfmt, afmt, url
end

local function format_string(vfmt, afmt)
  if vfmt and afmt then
    return vfmt .. "+" .. afmt
  elseif vfmt then
    return vfmt
  elseif afmt then
    return afmt
  else
    return ""
  end
end

local destroyer = nil
local function show_menu(isvideo)

  if destroyer then
    destroyer()
  end

  local voptions, aoptions, vfmt, afmt, url = get_formats()

  local options
  local fmt
  if isvideo then
    options = voptions
    fmt = vfmt
  else
    options = aoptions
    fmt = afmt
  end

  if options == nil then
    return
  end

  msg.verbose("current ytdl-format: " .. format_string(vfmt, afmt))

  local active = 0
  local selected = 1
  --set the cursor to the current format
  if fmt then
    for i, v in ipairs(options) do
      if v.format == fmt then
        active = i
        selected = active
        break
      end
    end
  else
    active = #options + 1
    selected = active
  end

  local function table_size(t)
    local s = 0
    for i, v in ipairs(t) do
      s = s + 1
    end
    return s
  end

  local function choose_prefix(i)
    if i == selected and i == active then return opts.selected_and_active
    elseif i == selected then return opts.selected_and_inactive end

    if i ~= selected and i == active then return opts.unselected_and_active
    elseif i ~= selected then return opts.unselected_and_inactive end
    return "> " --shouldn't get here.
  end

  local function draw_menu()
    local ass = assdraw.ass_new()

    ass:pos(opts.text_padding_x, opts.text_padding_y)
    ass:append(opts.style_ass_tags)

    if options[1] then
      for i, v in ipairs(options) do
        ass:append(choose_prefix(i) .. v.label .. "\\N")
      end
      ass:append(choose_prefix(#options + 1) .. "None")
    else
      ass:append("no formats found")
    end

    local w, h = mp.get_osd_size()
    if opts.scale_playlist_by_window then w, h = 0, 0 end
    mp.set_osd_ass(w, h, ass.text)
  end

  local num_options = table_size(options) + 1
  local timeout = nil

  local function selected_move(amt)
    selected = selected + amt
    if selected < 1 then selected = num_options
    elseif selected > num_options then selected = 1 end
    if timeout then
      timeout:kill()
      timeout:resume()
    end
    draw_menu()
  end

  local function bind_keys(keys, name, func, opts)
    if not keys then
      mp.add_forced_key_binding(keys, name, func, opts)
      return
    end
    local i = 1
    for key in keys:gmatch("[^%s]+") do
      local prefix = i == 1 and '' or i
      mp.add_forced_key_binding(key, name .. prefix, func, opts)
      i = i + 1
    end
  end

  local function unbind_keys(keys, name)
    if not keys then
      mp.remove_key_binding(name)
      return
    end
    local i = 1
    for key in keys:gmatch("[^%s]+") do
      local prefix = i == 1 and '' or i
      mp.remove_key_binding(name .. prefix)
      i = i + 1
    end
  end

  local function destroy()
    if timeout then
      timeout:kill()
    end
    mp.set_osd_ass(0, 0, "")
    unbind_keys(opts.up_binding, "move_up")
    unbind_keys(opts.down_binding, "move_down")
    unbind_keys(opts.select_binding, "select")
    unbind_keys(opts.close_menu_binding, "close")
    destroyer = nil
  end

  if opts.menu_timeout > 0 then
    timeout = mp.add_periodic_timer(opts.menu_timeout, destroy)
  end
  destroyer = destroy

  bind_keys(opts.up_binding, "move_up", function() selected_move(-1) end, { repeatable = true })
  bind_keys(opts.down_binding, "move_down", function() selected_move(1) end, { repeatable = true })
  if options[1] then
    bind_keys(opts.select_binding, "select", function()
      destroy()
      if selected == active then return end

      fmt = options[selected] and options[selected].format or nil
      if isvideo == true then
        vfmt = fmt
        url_data[url].vfmt = vfmt
      else
        afmt = fmt
        url_data[url].afmt = afmt
      end
      mp.set_property("ytdl-raw-options", "") --reset youtube-dl raw options before changing format
      mp.set_property("ytdl-format", format_string(vfmt, afmt))
      reload_resume()
    end)
  end
  bind_keys(opts.close_menu_binding, "close", destroy) --close menu using ESC
  mp.osd_message("", 0)
  draw_menu()
end

local function video_formats_toggle()
  show_menu(true)
end

local function audio_formats_toggle()
  show_menu(false)
end

-- keybind to launch menu
mp.add_key_binding(nil, "video_formats_toggle", video_formats_toggle)
mp.add_key_binding(nil, "audio_formats_toggle", audio_formats_toggle)
mp.add_key_binding(nil, "reload", reload_resume)

local original_format = mp.get_property("ytdl-format")
local path = nil
local function file_start()
  local new_path = get_url()
  if not new_path then return end

  local data = url_data[new_path]

  if opts.reset_format and path and new_path ~= path then
    if data then
      msg.verbose("setting previously set format")
      mp.set_property("ytdl-format", format_string(data.vfmt, data.afmt))
    else
      msg.verbose("setting original format")
      mp.set_property("ytdl-format", original_format)
    end
  end
  if opts.start_with_menu and new_path ~= path then
    video_formats_toggle()
  elseif opts.fetch_on_start and not data then
    download_formats(new_path)
  end
  path = new_path
end

mp.register_event("start-file", file_start)
