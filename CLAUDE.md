# Panel Pop - Three.js Implementation Context

## Project Overview
A faithful recreation of Panel de Pon / Tetris Attack / Puzzle League using Three.js and TypeScript. This is a frame-perfect port of the original C++/SDL game found in the `original/` folder.

## Current Implementation Status

### ✅ Phase 1: Foundation & Core Engine (COMPLETE)
- Three.js scene with orthographic camera (800x600)
- Asset loading system with progress tracking
- Fixed timestep game loop (60 FPS)
- Basic sprite rendering system
- Development environment with hot reload
- Comprehensive test suite setup

### ✅ Phase 2: Board System & Block Rendering (COMPLETE)
- 6x24 grid board system (only rows 0-11 visible)
- Block class with 6 states (Normal, Floating, Matched, Exploding, Swapping Left/Right)
- Tile data structure with type, block, and garbage references
- BoardRenderer with Three.js integration
- Visual effects for all block states (floating bob, match blink, explosion scale/fade)
- Grid background with guidelines
- Buffer row management for stack raising

### ✅ Phase 3: Input System & Cursor (COMPLETE)
- InputManager with keyboard event handling, state tracking, and input queue
- Cursor class with grid-aligned movement, horizontal wrapping, visual pulsing
- GameController orchestrating input, cursor, and board interactions
- Block swapping logic with animations
- Manual stack raising
- Pause functionality
- Comprehensive debug UI with real-time input/cursor/game state display

## Project Structure
```
├── src/
│   ├── core/           # GameEngine (main loop, debug UI)
│   ├── game/           # Board, Block, Cursor, GameController, BlockTypes
│   ├── rendering/      # SceneManager, BoardRenderer, SpriteRenderer
│   ├── input/          # InputManager
│   ├── assets/         # AssetLoader
│   └── main.ts         # Application entry point
├── tests/              # Comprehensive test suites
├── public/assets/      # Game assets (sprites, audio, fonts)
└── original/           # Reference C++ implementation
```

## Key Technical Decisions

### Architecture
- **Fixed timestep game loop**: 60 FPS with accumulator pattern for consistent gameplay
- **Orthographic camera**: Pixel-perfect 2D rendering in 3D engine
- **State machines**: Block states, board states, game controller states
- **Event-driven input**: Queue-based input handling with repeat logic

### Game Constants (from original)
```typescript
BOARD_WIDTH = 6
BOARD_HEIGHT = 24
TOP_ROW = 11          // Visible top row (rows 12-23 are buffer)
TILE_SIZE = 32        // Pixels per tile
FLOAT_TICKS = 12      // Ticks before block falls
SWAP_DELAY = 3        // Ticks for swap animation
COUNTDOWN_TICKS = 188 // Countdown duration
STACK_RAISE_STEPS = 32 // Animation steps per row raise
BASE_EXPLOSION_TICKS = 61
ADD_EXPLOSION_TICKS = 9
```

### Input System
- **Arrow Keys/WASD**: Cursor movement
- **X**: Block swap
- **Z**: Manual stack raise
- **ESC**: Pause
- **F3**: Toggle debug UI

## Development Commands

```bash
# Development
npm run dev           # Start dev server (localhost:3001)
npm run build         # Production build
npm run preview       # Preview production build

# Code Quality (ALWAYS run before commit)
npm run lint          # ESLint check
npm run type-check    # TypeScript check
npm test              # Run all tests

# Testing specific components
npm test -- tests/unit/game/       # Game logic tests
npm test -- tests/unit/rendering/  # Rendering tests
npm test -- tests/unit/input/      # Input tests (some failing - event dispatch issues in test env)
```

## Current Test Status
- ✅ 108/108 game logic tests passing (Block, Board, Cursor, GameController)
- ✅ 8/8 rendering tests passing (SceneManager)
- ⚠️ InputManager tests have issues with event dispatching in test environment (works in browser)

## Debug UI Features
Press **F3** to toggle debug display showing:
- Performance metrics (FPS, frame time, ticks)
- Cursor position (current, target, moving state)
- Input states (visual indicators for all keys)
- Game controller stats (swaps, raises, moves)
- Board state and score

## Next Implementation Phases

### Phase 4: Core Game Mechanics (Days 16-25)
**Priority: Implement gravity, matching, and timing systems**
- Block falling logic with support checking
- Float timer (12 ticks) implementation
- Match detection (horizontal and vertical 3+ blocks)
- Match marking and explosion timing (61 + 9n frames)
- State transitions (NORMAL → MATCHED → EXPLODING)
- Block removal after explosion

### Phase 5: Chain & Combo System (Days 26-30)
- Chain flag propagation
- Chain detection on match
- Chain counter management
- Combo size calculation
- Score calculation formulas

### Phase 6: Animation System (Days 31-35)
- Smooth swap animations
- Fall animations
- Explosion effects
- Stack rise animation (32 steps)

### Remaining Phases
7. Garbage Blocks
8. Visual Effects & Particles
9. Game States & UI
10. Audio System
11. Game Modes
12. AI System
13. Configuration & Persistence
14. Optimization & Polish
15. Testing & Release

## Important Implementation Notes

### Current Issues/Considerations
1. **Cursor Movement**: The cursor position updates during `tick()`, so tests must call `cursor.tick()` after movement
2. **Input Tests**: Browser event simulation works differently in test environment vs actual browser
3. **Board Creation**: SceneManager creates its own board in `initializeGameBoard()`, accessed via `getBoard()`
4. **Grace Timer**: Set to 30 ticks after block swap to prevent immediate stack raising

### Key Files to Reference
- `implementation_plan.md`: Complete 15-phase roadmap with detailed specifications
- `src/game/BlockTypes.ts`: All enums and constants
- `src/game/Board.ts`: Core game logic placeholder for Phase 4
- `src/game/GameController.ts`: Input processing and game flow
- `original/panel-pop`: C++ reference for exact mechanics

### Visual Confirmation
The game currently displays:
- 6x24 grid with colored blocks (Purple, Yellow, Red, Cyan, Green)
- Grid lines and background
- Pulsing white cursor (red in panic mode)
- Countdown state transitioning to running state
- Debug UI with comprehensive game information

## Critical Next Steps for Phase 4

1. **Gravity System**
   - Implement `checkSupport()` method in Board
   - Add falling state to blocks
   - Handle float timer countdown

2. **Match Detection**
   - Implement `matchBlocks()` in Board
   - Add horizontal and vertical scanning
   - Mark matched blocks

3. **Explosion Timing**
   - Handle explosion countdown
   - Remove blocks after explosion
   - Trigger chain checks

4. **Integration**
   - Update Board.tick() to call gravity/matching
   - Add visual feedback for falling/matched states
   - Test frame-perfect timing

## Testing Approach
1. Always run `npm run lint && npm run type-check && npm test` before commits
2. Visual testing at `localhost:3001` with debug UI (F3)
3. Compare behavior with original C++ game
4. Verify frame-perfect timing (60 FPS fixed timestep)

## Contact for Questions
Refer to implementation_plan.md for detailed specifications of each phase.
Check original/panel-pop source code for exact game mechanics.