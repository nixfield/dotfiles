local M = {}

M.catppuccino = function()
local catppuccino = require("catppuccino")

-- configure it
catppuccino.setup(
    {
		colorscheme = "dark_catppuccino",
		transparency = false,
		term_colors = false,
		styles = {
			comments = "italic",
			functions = "italic",
			keywords = "italic",
			strings = "NONE",
			variables = "NONE",
		},
		integrations = {
			treesitter = true,
			native_lsp = {
				enabled = true,
				virtual_text = {
					errors = "italic",
					hints = "italic",
					warnings = "italic",
					information = "italic",
				},
				underlines = {
					errors = "underline",
					hints = "underline",
					warnings = "underline",
					information = "underline",
				}
			},
			lsp_trouble = true,
			lsp_saga = false,
			gitgutter = false,
			gitsigns = true,
			telescope = false,
			nvimtree = {
				enabled = true,
				show_root = true,
			},
			which_key = true,
			indent_blankline = {
				enabled = true,
				colored_indent_levels = true,
			},
			dashboard = false,
			neogit = false,
			vim_sneak = false,
			fern = false,
			barbar = false,
			bufferline = true,
			markdown = false,
			lightspeed = false,
			ts_rainbow = true,
			hop = false,
		}
	}
)
  catppuccino.load()
end

M.colors = {
  catppuccino_colors = {
    none = "NONE",
    bg_alt = "#0e171c", -- nvim bg
    -- bg = "#24283b",
    bg = "#0e171c",
    fg = "#abb2bf", -- fg color (text)
    fg_gutter = "#3b4261",
    black = "#393b44",
    gray = "#2a2e36",
    red = "#c94f6d",
    green = "#97c374",
    yellow = "#dbc074",
    blue = "#61afef",
    magenta = "#c678dd",
    cyan = "#63cdcf",
    white = "#dfdfe0",
    orange = "#F4A261",
    pink = "#D67AD2",
    black_br = "#7f8c98",
    red_br = "#e06c75",
    green_br = "#58cd8b",
    yellow_br = "#FFE37E",
    blue_br = "#84CEE4",
    magenta_br = "#B8A1E3",
    cyan_br = "#59F0FF",
    white_br = "#FDEBC3",
    orange_br = "#F6A878",
    pink_br = "#DF97DB",
    comment = "#526175",
    git = {
      add = "#61afef",
      change = "#dbc074",
      delete = "#e06c75",
      conflict = "#F4A261",
    },
  },

}

return M
