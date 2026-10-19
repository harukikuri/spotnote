// Where things are, in the desktop's own pixels (1440 × 810, drawn at 4/3 to
// fill 1920 × 1080, like a Retina screen). Spotnote's overlay needs to know
// where the card is, so the shop's layout is fixed here too.
export const SCREEN = { w: 1440, h: 810, scale: 1920 / 1440 };
export const MENU_BAR = 25;

export const BROWSER = { x: 60, y: 45, w: 1320, h: 740, chrome: 82 };
export const VIEWPORT = { x: BROWSER.x, y: BROWSER.y + BROWSER.chrome, w: BROWSER.w, h: BROWSER.h - BROWSER.chrome };

// The shop's product grid, in the viewport.
export const GRID = { x: 140, y: 178, cols: 3, w: 330, h: 262, gap: 30 };
export const card = (i) => ({
  x: GRID.x + (i % GRID.cols) * (GRID.w + GRID.gap),
  y: GRID.y + Math.floor(i / GRID.cols) * (GRID.h + GRID.gap),
  w: GRID.w,
  h: GRID.h,
});

export const CHAT = { x: 150, y: 70, w: 1140, h: 700 };
export const TERMINAL = { x: 110, y: 60, w: 1220, h: 720 };

// A point in the viewport → on the desktop.
export const onScreen = (x, y) => [VIEWPORT.x + x, VIEWPORT.y + y];
