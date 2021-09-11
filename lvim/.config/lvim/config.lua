-- THESE ARE EXAMPLE CONFIGS FEEL FREE TO CHANGE TO WHATEVER YOU WANT

-- general
lvim.format_on_save = false
lvim.lint_on_save = true
lvim.colorscheme = "dark_catppuccino"
vim.opt.scrolloff = 999 -- keep cursor centered on the screen while scrolling
vim.opt.wrap = true
vim.opt.relativenumber = true
vim.opt.cmdheight = 1

-- uncomment this line and change fancy statusline to true if want change colorscheme automatically based on time
-- local _time = os.date "*t"
-- if _time.hour >= 17 and _time.hour <= 24 then
--   lvim.colorscheme = "onedarker"
-- end

-- if _time.hour >= 0 and _time.hour < 17 then
--   lvim.colorscheme = "dark_catppuccino"
-- end

-- lvim stuff
lvim.builtin.nvimtree.hide_dotfiles = 0
lvim.builtin.dashboard.active = true
lvim.builtin.terminal.active = true
lvim.builtin.nvimtree.side = "left"
lvim.builtin.nvimtree.show_icons.git = 0

lvim.builtin.treesitter.ensure_installed = {}
lvim.builtin.treesitter.ignore_install = { "haskell" }
lvim.builtin.treesitter.highlight.enabled = true

lvim.builtin.fancy_statusline = { active = true } -- change this to enable/disable fancy statusline
if lvim.builtin.fancy_statusline.active then
  require("user.lualine").config()
end

require("user.plugins").config()

-- keymappings [view all the defaults by pressing <leader>Lk]
lvim.leader = "space"
lvim.keys.normal_mode["<C-s>"] = ":w<cr>"
lvim.builtin.which_key.mappings["C"] = { "<cmd>ColorizerToggle<CR>", "Colorizer" }
vim.cmd([[
  nnoremap + <C-a>
  nnoremap - <C-x>
  nnoremap <expr> j v:count ? (v:count > 5 ? "m'" . v:count : '') . 'j' : 'gj'
  nnoremap <expr> k v:count ? (v:count > 5 ? "m'" . v:count : '') . 'k' : 'gk'
  nnoremap <Backspace> <C-^>
  xnoremap . :norm.<CR>
  nnoremap c "_c
  nnoremap C "_C
]])
