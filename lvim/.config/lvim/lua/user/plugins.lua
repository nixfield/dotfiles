local M = {}
M.config = function()
lvim.plugins = {
	{
		"iamcco/markdown-preview.nvim",
		run = "cd app && npm install",
		ft = "markdown",
	},
  {
		"norcalli/nvim-colorizer.lua",
		config = function()
			require("user.colorizer").config()
		end,
	},
	{ "vimwiki/vimwiki",
		config = function()
			require("user.vimwiki").config()
		end,
  },
  {
    "lukas-reineke/indent-blankline.nvim",
		config = function()
			require("user.blankline")
		end,
    event = "BufRead",
  },
  {
    "Pocco81/Catppuccino.nvim",
    config = function()
      require("user/theme").catppuccino()
    end,
    -- cond = function()
    --   local _time = os.date "*t"
    --   return (_time.hour >= 0 and _time.hour < 17)
    -- end,
  },
}
end
return M
