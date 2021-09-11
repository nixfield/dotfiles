local M = {}

M.config = function()
vim.g.vimwiki_list = {
	{ path = "/$HOME/Vimwiki", syntax = "markdown", ext = ".md" },
	{ path = "/$HOME/Vimwiki/project", syntax = "markdown", ext = ".md" },
}
end

return M
