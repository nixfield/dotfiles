/* See LICENSE file for copyright and license details. */

/* Constants */
#define TERMINAL "st"
#define TERMCLASS "St"

/* appearance */
static unsigned int borderpx  = 2;        /* border pixel of windows */
static unsigned int snap      = 32;       /* snap pixel */
static unsigned int gappih    = 5;       /* horiz inner gap between windows */
static unsigned int gappiv    = 5;       /* vert inner gap between windows */
static unsigned int gappoh    = 5;       /* horiz outer gap between windows and screen edge */
static unsigned int gappov    = 5;       /* vert outer gap between windows and screen edge */
static unsigned int systraypinning = 1;   /* 0: sloppy systray follows selected monitor, >0: pin systray to monitor X */
static unsigned int systrayspacing = 2;   /* systray spacing */
static int systraypinningfailfirst = 1;   /* 1: if pinning fails, display systray on the first monitor, False: display systray on the last monitor*/
static int showsystray        = 1;     /* 0 means no systray */
static int swallowfloating    = 0;        /* 1 means swallow floating windows by default */
static int smartgaps          = 1;        /* 1 means no outer gap when there is only one window */
static int showbar            = 1;        /* 0 means no bar */
static int topbar             = 1;        /* 0 means bottom bar */
static int user_bh            = 20;        /* 0 means that dwm will calculate bar height, >= 1 means dwm will user_bh as bar height */
static char *fonts[]          = {"JetBrains Mono Nerd Font Bandit:size=10"};
static char normbgcolor[]           = "#151515";
static char normbordercolor[]       = "#151515";
static char normfgcolor[]           = "#f5f5f5";
static char selfgcolor[]            = "#151515";
static char selbordercolor[]        = "#8aabac";
static char selbgcolor[]            = "#8aabac";
static char titlefgcolor[]            = "#f5f5f5";
static char titlebordercolor[]        = "#151515";
static char titlebgcolor[]            = "#151515";
static char *colors[][3] = {
       /*               fg           bg           border   */
       [SchemeNorm] = { normfgcolor, normbgcolor, normbordercolor },
       [SchemeSel]  = { selfgcolor,  selbgcolor,  selbordercolor  },
       [SchemeTitle]  = { titlefgcolor, titlebgcolor,  titlebordercolor  },
};

typedef struct {
	const char *name;
	const void *cmd;
} Sp;
const char *spcmd1[] = {TERMINAL, "-n", "spterm", "-g", "120x32", NULL };
const char *spcmd2[] = {TERMINAL, "-n", "spcalc", "-f", "JetBrainsMono Nerd Font Bandit:size=14", "-g", "60x20", "-e", "bc", "-lq", NULL };
const char *spcmd6[] = {TERMINAL, "-n", "spranger", "-g", "120x32", "-e", "ranger", NULL };
const char *spcmd3[] = {TERMINAL, "-n", "spfm", "-g", "120x32", "-e", "lfrun", NULL };
const char *spcmd4[] = {TERMINAL, "-n", "spmusic", "-g", "100x25", "-e", "ncmpcpp", NULL };
const char *spcmd5[] = {TERMINAL, "-n", "spcalcurse", "-g", "100x25", "-e", "calcurse", NULL };
static Sp scratchpads[] = {
	/* name          cmd  */
	{"spterm",      spcmd1},
	{"spcalc",      spcmd2},
	{"spfm",    spcmd3},
	{"spmusic",     spcmd4},
	{"spcalcurse",  spcmd5},
	{"spranger",    spcmd6},
};

/* tagging */
static const char *tags[] = { "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX" };

/* tagging Japanase Letter */
/* static const char *tags[] = { "一", "二", "三", "四", "五", "六", "七", "八", "九" }; */

static const Rule rules[] = {
	/* xprop(1):
	 *	WM_CLASS(STRING) = instance, class
	 *	WM_NAME(STRING) = title
	*/
	/* class    instance      title       	 tags mask    isfloating   isterminal  noswallow  monitor */
	{ "Gimp",     NULL,       NULL,       	    1 << 8,       0,           0,         0,        -1 },
	{ "Spotify",  NULL,       NULL,       	    1 << 8,       0,           0,         0,        -1 },
	{ "Brave-browser",  NULL,       NULL,       	    1 << 8,       0,           0,         0,        -1 },
	{ "Brave-browser",  NULL,       NULL,       	    1 << 8,       0,           0,         0,        -1 },
	{ "TelegramDesktop",  NULL,       NULL,       	    1 << 8,       0,           0,         0,        -1 },
	{ "MEGAsync",  NULL,       NULL,       	    0,       1,           0,         0,        -1 },
    { TERMCLASS,  NULL,       NULL,       	    0,            0,           1,         0,        -1 },
	{ NULL,       NULL,       "Event Tester",   0,            0,           0,         1,        -1 },
	{ NULL,      "spterm",    NULL,       	    SPTAG(0),     1,           1,         0,        -1 },
	{ NULL,      "spcalc",    NULL,       	    SPTAG(1),     1,           1,         0,        -1 },
	{ NULL,      "spfm",  NULL,       	    SPTAG(2),     1,           1,         1,        -1 },
	{ NULL,      "spranger",  NULL,       	    SPTAG(5),     1,           1,         0,        -1 },
	{ NULL,      "spmusic",  NULL,       	    SPTAG(3),     1,           1,         0,        -1 },
	{ NULL,      "spcalcurse",  NULL,       	    SPTAG(4),     1,           1,         0,        -1 },
};

/* layout(s) */
static float mfact     = 0.55; /* factor of master area size [0.05..0.95] */
static int nmaster     = 1;    /* number of clients in master area */
static int resizehints = 0;    /* 1 means respect size hints in tiled resizals */
static int attachbelow = 1;    /* 1 means attach after the currently active window */
#define FORCE_VSPLIT 1  /* nrowgrid layout: force two clients to always split vertically */
#include "vanitygaps.c"
static const Layout layouts[] = {
	/* symbol     arrange function */
 	{ "[]=",	tile },			/* Default: Master on left, slaves on right */
	{ "TTT",	bstack },		/* Master on top, slaves on bottom */

	{ "[@]",	spiral },		/* Fibonacci spiral */
	{ "[\\]",	dwindle },		/* Decreasing in size right and leftward */

	{ "[D]",	deck },			/* Master on left, slaves in monocle-like mode on right */
 	{ "[M]",	monocle },		/* All windows on top of eachother */

	{ "|M|",	centeredmaster },		/* Master in middle, slaves on sides */
	{ ">M>",	centeredfloatingmaster },	/* Same but master floats */

	{ "><>",	NULL },			/* no layout function means floating behavior */
	{ NULL,		NULL },
};

/* key definitions */
#define MODKEY Mod4Mask
#define TAGKEYS(KEY,TAG) \
	{ MODKEY,                       KEY,      view,           {.ui = 1 << TAG} }, \
	{ MODKEY|ControlMask,           KEY,      toggleview,     {.ui = 1 << TAG} }, \
	{ MODKEY|ShiftMask,             KEY,      tag,            {.ui = 1 << TAG} }, \
	{ MODKEY|ControlMask|ShiftMask, KEY,      toggletag,      {.ui = 1 << TAG} },
#define STACKKEYS(MOD,ACTION) \
	{ MOD,	XK_j,	ACTION##stack,	{.i = INC(+1) } }, \
	{ MOD,	XK_k,	ACTION##stack,	{.i = INC(-1) } }, \

	/* { MOD,  XK_v,   ACTION##stack,  {.i = 0 } }, \ */
	/* { MOD, XK_grave, ACTION##stack, {.i = PREVSEL } }, \ */
	/* { MOD, XK_a,     ACTION##stack, {.i = 1 } }, \ */
	/* { MOD, XK_z,     ACTION##stack, {.i = 2 } }, \ */
	/* { MOD, XK_x,     ACTION##stack, {.i = -1 } }, */

/* helper for spawning shell commands in the pre dwm-5.0 fashion */
#define SHCMD(cmd) { .v = (const char*[]){ "/bin/sh", "-c", cmd, NULL } }

/* commands */
static const char *termcmd[]  = { TERMINAL, NULL };

/*
 * Xresources preferences to load at startup
 */
ResourcePref resources[] = {
		{ "color0",		STRING,	&normbordercolor }, // none active window border
		{ "color4",		STRING,	&selbordercolor }, // active window border
		{ "color0",		STRING,	&titlebordercolor }, // dwm title border
		{ "color0",		STRING,	&normbgcolor }, // dmw tags, dwmblocks bg
		{ "color4",		STRING,	&selbgcolor }, // dmw tags bg
		{ "color0",		STRING,	&titlebgcolor },  // dwm title bg
		{ "color15",		STRING,	&normfgcolor }, // dwm tags, dwmblocks fg
		{ "color0",		STRING,	&selfgcolor }, // dwm fg
		{ "color15",		STRING,	&titlefgcolor }, // dwm title fg
		{ "borderpx",		INTEGER, &borderpx },
		{ "snap",		INTEGER, &snap },
		{ "showbar",		INTEGER, &showbar },
		{ "topbar",		INTEGER, &topbar },
		{ "nmaster",		INTEGER, &nmaster },
		{ "resizehints",	INTEGER, &resizehints },
		{ "mfact",		FLOAT,	&mfact },
		{ "gappih",		INTEGER, &gappih },
		{ "gappiv",		INTEGER, &gappiv },
		{ "gappoh",		INTEGER, &gappoh },
		{ "gappov",		INTEGER, &gappov },
		{ "swallowfloating",	INTEGER, &swallowfloating },
		{ "smartgaps",		INTEGER, &smartgaps },
};

#include <X11/XF86keysym.h>
#include "shiftview.c"

/* Bindings */
static Key keys[] = {
	/* Dwm stuff binding */
	/* modifier                     key        function        argument */
	STACKKEYS(MODKEY,                          focus)
	STACKKEYS(MODKEY|ShiftMask,                push)
	TAGKEYS(			XK_1,		0)
	TAGKEYS(			XK_2,		1)
	TAGKEYS(			XK_3,		2)
	TAGKEYS(			XK_4,		3)
	TAGKEYS(			XK_5,		4)
	TAGKEYS(			XK_6,		5)
	TAGKEYS(			XK_7,		6)
	TAGKEYS(			XK_8,		7)
	TAGKEYS(			XK_9,		8)
	{ MODKEY,			XK_0,		view,		{.ui = ~0 } },
	{ MODKEY|ShiftMask,		XK_0,		tag,		{.ui = ~0 } },

	/* --- Layouting --- */
	{ MODKEY,			XK_t,		setlayout,	{.v = &layouts[0]} }, /* tile */
	{ MODKEY|ShiftMask,		XK_t,		setlayout,	{.v = &layouts[8]} }, /* floating */
	{ MODKEY,			XK_y,		setlayout,	{.v = &layouts[4]} }, /* deck */
	{ MODKEY|ShiftMask,		XK_y,		setlayout,	{.v = &layouts[5]} }, /* monocle */
	{ MODKEY,			XK_u,		setlayout,	{.v = &layouts[6]} }, /* centeredmaster */
	{ MODKEY|ShiftMask,		XK_u,		setlayout,	{.v = &layouts[7]} }, /* centeredfloatingmaster */


	/* Inc n Dec master */
	{ MODKEY,			XK_i,		incnmaster,     {.i = +1 } },
	{ MODKEY|ShiftMask,		XK_i,		incnmaster,     {.i = -1 } },

	{ MODKEY,             XK_o,      setcfact,       {.f =  0.00} },
	{ MODKEY|ShiftMask,		XK_o,		defaultgaps,	{0} },

	{ MODKEY,			XK_a,		togglegaps,	{0} },
	{ MODKEY|ShiftMask,			XK_a,		togglebar,	{0} },

	{ MODKEY,			XK_s,		togglesticky,	{0} },
	{ MODKEY,			XK_f,		togglefullscr,	{0} },
	{ MODKEY|ShiftMask,             XK_f,      togglefakefullscreen, {0} },

	/* Change gaps */
	{ MODKEY,			XK_g,		incrgaps,	{.i = +3 } },
	{ MODKEY|ShiftMask,		XK_g,		incrgaps,	{.i = -3 } },

	/* Change Window size */
	{ MODKEY,			XK_h,		setmfact,	{.f = -0.05} },
	{ MODKEY|ShiftMask,             XK_h,      setcfact,       {.f = +0.25} },
	/* J and K are automatically bound above in STACKEYS */
	{ MODKEY,			XK_l,		setmfact,      	{.f = +0.05} },
	{ MODKEY|ShiftMask,             XK_l,      setcfact,       {.f = -0.25} },

    /* Resize Window */
	{ MODKEY,                       XK_Down,   moveresize,     {.v = "0x 25y 0w 0h" } },
	{ MODKEY,                       XK_Up,     moveresize,     {.v = "0x -25y 0w 0h" } },
	{ MODKEY,                       XK_Right,  moveresize,     {.v = "25x 0y 0w 0h" } },
	{ MODKEY,                       XK_Left,   moveresize,     {.v = "-25x 0y 0w 0h" } },
	{ MODKEY|ShiftMask,             XK_Down,   moveresize,     {.v = "0x 0y 0w 25h" } },
	{ MODKEY|ShiftMask,             XK_Up,     moveresize,     {.v = "0x 0y 0w -25h" } },
	{ MODKEY|ShiftMask,             XK_Right,  moveresize,     {.v = "0x 0y 25w 0h" } },
	{ MODKEY|ShiftMask,             XK_Left,   moveresize,     {.v = "0x 0y -25w 0h" } },

	/* Back to last tag */
	{ MODKEY,			XK_Tab,		view,		{0} },
	{ MODKEY,			XK_x,		killclient,	{0} },
	{ MODKEY|ShiftMask,			XK_x,		quit,	{1} },
	{ MODKEY|ControlMask,			XK_x,		quit,	{0} },

	{ MODKEY,			XK_space,	zoom,		{0} },
	{ MODKEY|ShiftMask,		XK_space,	togglefloating,	{0} },

    /* scratchpads */
	{ MODKEY|ShiftMask,		XK_Return,	togglescratch,	{.ui = 0} },
	{ MODKEY,			XK_grave,	togglescratch,	{.ui = 1} },
	{ MODKEY,			XK_e,		togglescratch,	{.ui = 2} },
	{ MODKEY|ShiftMask,			XK_e,		togglescratch,	{.ui = 5} },
	{ MODKEY,			XK_m,		togglescratch,	{.ui = 3} },
	{ MODKEY,			XK_c,		togglescratch,	{.ui = 4} },


	/* Change window monitor focus */
    /* NOTE:Uncomment this if using more than 1 monitor */
	/* { MODKEY,			XK_Left,	focusmon,	{.i = -1 } }, */
	/* { MODKEY|ShiftMask,		XK_Left,	tagmon,		{.i = -1 } }, */
	/* { MODKEY,			XK_Right,	focusmon,	{.i = +1 } }, */
	/* { MODKEY|ShiftMask,		XK_Right,	tagmon,		{.i = +1 } }, */

};

/* button definitions */
/* click can be ClkTagBar, ClkLtSymbol, ClkStatusText, ClkWinTitle, ClkClientWin, or ClkRootWin */
static Button buttons[] = {
	/* click                event mask      button          function        argument */

  // button 1 = klik kiri, 2 = middle, 3 = klik kanan. event mask 0 = doesnt have to press another key 
#ifndef __OpenBSD__
	{ ClkWinTitle,          0,              Button1,        togglefullscr,           {0} },
	{ ClkWinTitle,          0,              Button2,        zoom,           {0} },
	{ ClkStatusText,        0,              Button1,        sigdwmblocks,   {.i = 1} },
	{ ClkStatusText,        0,              Button2,        sigdwmblocks,   {.i = 2} },
	{ ClkStatusText,        0,              Button3,        sigdwmblocks,   {.i = 3} },
	{ ClkStatusText,        0,              Button4,        sigdwmblocks,   {.i = 4} },
	{ ClkStatusText,        0,              Button5,        sigdwmblocks,   {.i = 5} },
	{ ClkStatusText,        ShiftMask,      Button1,        sigdwmblocks,   {.i = 6} },
#endif
	{ ClkStatusText,        ShiftMask,      Button3,        spawn,          SHCMD(TERMINAL " -e nvim ~/.local/src/dwmblocks/config.h") },
	/* placemouse options, choose which feels more natural:
	 *    0 - tiled position is relative to mouse cursor
	 *    1 - tiled postiion is relative to window center
	 *    2 - mouse pointer warps to window center
	 *
	 * The moveorplace uses movemouse or placemouse depending on the floating state
	 * of the selected client. Set up individual keybindings for the two if you want
	 * to control these separately (i.e. to retain the feature to move a tiled window
	 * into a floating position).
	 */
	/* { ClkClientWin,         0,         Button2,        togglefullscr,	{0} }, */
	{ ClkClientWin,         MODKEY,         Button1,        moveorplace,    {.i = 1} },
	{ ClkClientWin,         MODKEY,         Button2,        defaultgaps,	{0} },
	{ ClkClientWin,         MODKEY,         Button3,        resizemouse,    {0} },
  { ClkClientWin,         MODKEY|ControlMask,    Button1,        dragmfact,      {0} },
  { ClkClientWin,         MODKEY|ControlMask,    Button3,        dragcfact,      {0} },
	{ ClkClientWin,		      MODKEY,		      Button4,	      incrgaps,	{.i = +1} },
	{ ClkClientWin,		      MODKEY,		      Button5,	      incrgaps,	{.i = -1} },
	{ ClkTagBar,            0,              Button1,        view,           {0} },
	{ ClkTagBar,            0,              Button3,        toggleview,     {0} },
	{ ClkTagBar,            MODKEY,         Button1,        tag,            {0} },
	{ ClkTagBar,            MODKEY,         Button3,        toggletag,      {0} },
	{ ClkTagBar,		0,		Button4,	shiftview,	{.i = -1} },
	{ ClkTagBar,		0,		Button5,	shiftview,	{.i = 1} },
	{ ClkRootWin,		0,		Button2,	togglebar,	{0} },
};

void
setlayoutex(const Arg *arg)
{
	setlayout(&((Arg) { .v = &layouts[arg->i] }));
}

void
viewex(const Arg *arg)
{
	view(&((Arg) { .ui = 1 << arg->ui }));
}

void
viewall(const Arg *arg)
{
	view(&((Arg){.ui = ~0}));
}

void
toggleviewex(const Arg *arg)
{
	toggleview(&((Arg) { .ui = 1 << arg->ui }));
}

void
tagex(const Arg *arg)
{
	tag(&((Arg) { .ui = 1 << arg->ui }));
}

void
toggletagex(const Arg *arg)
{
	toggletag(&((Arg) { .ui = 1 << arg->ui }));
}

void
tagall(const Arg *arg)
{
	tag(&((Arg){.ui = ~0}));
}

/* signal definitions */
/* signum must be greater than 0 */
/* trigger signals using `xsetroot -name "fsignal:<signame> [<type> <value>]"` */
static Signal signals[] = {
	/* signum           function */
	{ "focusstack",     focusstack },
	{ "setmfact",       setmfact },
	{ "togglebar",      togglebar },
	{ "incnmaster",     incnmaster },
	{ "togglefloating", togglefloating },
	{ "focusmon",       focusmon },
	{ "tagmon",         tagmon },
	{ "zoom",           zoom },
	{ "view",           view },
	{ "viewall",        viewall },
	{ "viewex",         viewex },
	{ "toggleview",     view },
	{ "toggleviewex",   toggleviewex },
	{ "tag",            tag },
	{ "tagall",         tagall },
	{ "tagex",          tagex },
	{ "toggletag",      tag },
	{ "toggletagex",    toggletagex },
	{ "killclient",     killclient },
	{ "quit",           quit },
	{ "setlayout",      setlayout },
	{ "setlayoutex",    setlayoutex },
};
