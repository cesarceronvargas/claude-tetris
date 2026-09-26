# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A classic Tetris implementation in vanilla JavaScript using HTML5 Canvas — no dependencies, no build step, no package.json. Three files: `index.html` (DOM/canvas structure), `style.css` (dark/retro theme), `game.js` (all game logic, ~300 lines).

## Running the game

No install or build required. Either open `index.html` directly in a browser, or serve it locally:

```bash
python3 -m http.server 8000
# or
npx serve .
```

Then visit `http://localhost:8000`. There is no test suite, linter, or build command in this repo — verify changes by playing the game in a browser.

## Architecture

Everything lives in `game.js` as module-level state and functions (no classes, no bundler). Key pieces:

- **Board model**: `board` is a `ROWS × COLS` matrix; each cell is `0` (empty) or a piece color index `1–7`.
- **Pieces**: `PIECES` defines each of the 7 tetrominoes as a square matrix. `current` and `next` hold `{ type, shape, x, y }`. Rotation (`rotateCW`) transposes + reverses rows; `tryRotate` applies it with basic wall kicks (tries offsets `[0, -1, 1, -2, 2]` before giving up).
- **Collision** (`collide`): checks board bounds and existing locked cells for a shape at a given offset. Used for movement, rotation, ghost projection, and spawn checks.
- **Game loop** (`loop`): driven by `requestAnimationFrame`, accumulates elapsed time in `dropAccum` and advances the piece one row once `dropInterval` is exceeded, otherwise calls `lockPiece()`.
- **Locking & line clears**: `lockPiece` → `merge` (writes piece into `board`) → `clearLines` (scans bottom-up, splices full rows, unshifts empty ones, updates score/level/dropInterval) → `spawn` (promotes `next` to `current`, generates a new `next`, triggers `endGame()` if the new piece immediately collides).
- **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by `level`; hard drop adds 2 pts/row dropped, soft drop adds 1 pt/row.
- **Level/speed**: level increases every 10 lines; `dropInterval = max(100, 1000 - (level - 1) * 90)` ms.
- **Ghost piece**: `ghostY()` projects the current piece straight down until collision; drawn at `globalAlpha = 0.2`.
- **Rendering**: `draw()` clears and redraws the grid, locked board, ghost, and current piece every frame onto `#board`; `drawNext()` renders the preview piece onto the separate `#next-canvas`.
- **Input**: a single `keydown` listener handles arrows (move/soft-drop), Up/X (rotate), Space (hard drop, with `preventDefault`), and P/Escape (pause menu, ignoring `e.repeat`), gated by `paused`/`gameOver` flags.
- **Pause menu**: `togglePause()` opens/closes the dedicated `#pause-menu` overlay (`#overlay` is only for GAME OVER; P/Escape do nothing after game over). While open, `paused` blocks all game keys. `resumeGame()` hides the menu and unpauses on the next animation frame so the closing key/click never reaches the game. The menu offers Reanudar, Reiniciar (`init()`), Ver controles (toggles `#pause-controls`) and a Nivel inicial `<select>` (1–10) that sets `startLevel`; `init()` starts at `level = startLevel` and `clearLines` levels up to `max(gameStartLevel, floor(lines / 10) + 1)` (`gameStartLevel` is snapshotted in `init()` so changing the select mid-game has no effect until restart), with speed from `intervalForLevel(level)`.

Tunable constants live at the top of `game.js`: `COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`, initial `dropInterval`. If `COLS`, `ROWS`, or `BLOCK` change, update the `#board` canvas `width`/`height` in `index.html` to match (`COLS × BLOCK` and `ROWS × BLOCK`).

## Language note

The README is written in Spanish (`es`), and `index.html` sets `lang="es"`. UI text (labels, overlay messages) is in Spanish — match this when adding user-facing strings.
