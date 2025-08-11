# Panel Pop - Three.js Implementation Context

## Project Overview
A faithful recreation of Panel de Pon / Tetris Attack / Puzzle League using Three.js and TypeScript. Frame-perfect port of the original C++/SDL game found in the `original/` folder.

## Current Implementation Status

### ✅ Phase 1-3: Foundation, Board, Input & Cursor (COMPLETE)
- Three.js scene with orthographic camera (800x600), fixed timestep game loop (60 FPS)
- 6x24 grid board system (rows 0-11 visible, 12-23 buffer)
- Block class with 6 states, tile data structure with garbage references
- InputManager, Cursor with 2-block-wide design, GameController
- Block swapping, manual stack raising, pause functionality
- Comprehensive debug UI (F3 to toggle)

### ✅ Phase 4-5: Core Game Mechanics & Chain System (COMPLETE)
- Block falling logic with support checking and float timer (12 ticks)
- Match detection (horizontal/vertical 3+ blocks) with proper timing
- Chain flag propagation and combo detection
- Score calculation with chain/combo multipliers
- State transitions: NORMAL → MATCHED → EXPLODING → removal

### ✅ Phase 6: Animation System (COMPLETE)
- AnimationManager with smooth swap, fall, explosion, and stack rise animations
- BlockAnimator, StackAnimator, CursorAnimator integration
- Visual effects for all block states with proper timing

### ✅ Phase 7: Garbage Block System (COMPLETE)
- Multi-tile garbage blocks with GarbageBlock class
- Spawn queue system with timing delays
- Garbage states: NORMAL → TRIGGERED → TRANSFORMING
- Fall detection for large blocks, transformation mechanics
- EnhancedBoardRenderer with garbage-specific materials and effects
- Q key binding for testing garbage drops

## Technical Architecture

### Core Systems
- **Fixed timestep**: 60 FPS with accumulator pattern
- **Board**: 6x24 grid, tile-based with block/garbage references
- **Rendering**: EnhancedBoardRenderer with Three.js materials and animations
- **Input**: Event-driven with repeat logic and action mapping

### Key Game Constants
```typescript
BOARD_WIDTH = 6, BOARD_HEIGHT = 24, TOP_ROW = 11
FLOAT_TICKS = 12, BASE_EXPLOSION_TICKS = 61, ADD_EXPLOSION_TICKS = 9
COUNTDOWN_TICKS = 188, STACK_RAISE_STEPS = 32
```

### Input Controls
- **Arrow Keys/WASD**: Cursor movement
- **X**: Block swap, **Z**: Manual stack raise, **ESC**: Pause
- **Q**: Drop garbage blocks (testing), **F3**: Toggle debug UI

## Project Structure
```
├── src/
│   ├── core/           # GameEngine (main loop, debug UI)
│   ├── game/           # Board, Block, Cursor, GameController, GarbageBlock
│   ├── rendering/      # SceneManager, EnhancedBoardRenderer, AnimationManager
│   ├── input/          # InputManager
│   ├── animation/      # Animation system components
│   └── main.ts
├── tests/              # Comprehensive test suites (171+ tests passing)
└── original/           # Reference C++ implementation
```

## Development Commands
```bash
npm run dev           # Start dev server (localhost:3001)
npm run lint          # ESLint check (ALWAYS run before commit)
npm run type-check    # TypeScript check (ALWAYS run before commit)
npm test              # Run all tests (ALWAYS run before commit)
```

## Current Game State
The game currently has:
- Full block physics with gravity, matching, chains, and combos
- Complete animation system with visual effects
- Garbage block system with spawning, falling, and transformation
- Working input system with cursor control and swapping
- Debug UI showing performance, input states, and game stats
- Score system with chain/combo bonuses

## Remaining Implementation Phases

### Phase 8: Visual Effects & Particles (NEXT PRIORITY)
- Particle system for explosions and matches
- Screen shake effects for large chains/combos
- Enhanced visual feedback for special events
- Polish existing animations

### Phase 9: Game States & UI
- Game over detection and handling
- Victory conditions and level progression
- Menu system and game state management
- HUD elements (score, time, level indicators)

### Phase 10: Audio System
- Sound effect integration
- Music system with dynamic tracks
- Audio feedback for actions and events

### Phase 11-15: Polish & Release
- Game modes (puzzle, versus, endless)
- AI opponent system
- Configuration and persistence
- Performance optimization
- Final testing and release preparation

## Critical Technical Notes

### Key Files
- `src/game/Board.ts`: Core game logic with gravity, matching, chains
- `src/rendering/EnhancedBoardRenderer.ts`: Visual rendering with animations
- `src/game/GarbageBlock.ts`: Garbage block implementation
- `src/animation/AnimationManager.ts`: Animation system coordination
- `original/panel-pop`: C++ reference implementation

### Important Implementation Details
1. **EnhancedBoardRenderer**: Used for garbage block support (not BoardRenderer)
2. **Enum comparisons**: Always use `TileType.AIR` not `'AIR'` string comparisons
3. **Animation timing**: All effects use 60 FPS fixed timestep for frame-perfect gameplay
4. **Garbage spawning**: Spawns in buffer area (row 16+) then falls into view
5. **Test coverage**: 171+ tests passing, always run before commits

## Testing & Verification
1. Visual testing at `localhost:3001` with debug UI (F3)
2. Test garbage blocks with Q key
3. Verify chain/combo mechanics work correctly
4. Compare timing with original C++ reference
5. Always run `npm run lint && npm run type-check && npm test` before commits

The core gameplay mechanics are complete and functional. Focus next on visual polish and game state management.