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
- **Stack raising mechanics fully operational** (fixed forced raise bug)

### ✅ Phase 8: Visual Effects & Particles (COMPLETE)
- Particle system for explosions and matches
- Screen shake effects for large chains/combos
- Enhanced visual feedback for special events
- Polish existing animations

### ✅ Phase 9: Game States & UI (COMPLETE)
- Game over detection and handling
- Victory conditions and level progression
- Menu system and game state management
- HUD elements (score, time, level indicators)

### ✅ Phase 10: Audio System (COMPLETE)
- Sound effect integration
- Music system with dynamic tracks
- Audio feedback for actions and events

### ✅ Phase 11: High-Resolution Asset Migration (COMPLETE)
- Migrated from 32x32 pixel blocks to 108x103 pixel blocks
- Individual PNG textures for each block color and state
- 10-pixel gaps between blocks for visual clarity
- BlockTextureManager for efficient texture loading and caching
- BlockConstants for centralized dimension management
- Updated all animations and positioning for new dimensions
- Camera and viewport adjusted for larger board (698x1346 pixels)

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

// Block dimensions (new high-res assets)
BLOCK_WIDTH = 108, BLOCK_HEIGHT = 103, BLOCK_GAP = 10
TILE_SIZE_X = 118, TILE_SIZE_Y = 113  // Including gaps
BOARD_PIXEL_WIDTH = 698, BOARD_PIXEL_HEIGHT = 1346
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
│   │   ├── BlockConstants.ts     # Centralized block dimensions
│   │   └── BlockTextureManager.ts # Individual texture loading
│   ├── input/          # InputManager
│   ├── animation/      # Animation system components
│   └── main.ts
├── public/
│   └── assets/sprites/blocks/  # High-res block textures
│       ├── normal/     # Normal state blocks
│       ├── landed/     # Matched/landed state blocks
│       └── blink/      # Exploding state blocks
├── tests/              # Comprehensive test suites (218 tests passing)
└── original/           # Reference C++ implementation
```

## Development Workflow & Best Practices

### Essential Commands
```bash
npm run dev           # Start dev server (localhost:3000)
npm run lint          # ESLint check (ALWAYS run before commit)
npm run type-check    # TypeScript check (ALWAYS run before commit)
npm test              # Run all tests (ALWAYS run before commit)
```

### Pre-Commit Checklist
1. **Run full quality check**: `npm run lint && npm run type-check && npm test`
2. **Verify no regressions**: All 218 tests must pass
3. **Test visual changes**: Check at `localhost:3000` with debug UI (F3)
4. **Reference original**: Compare behavior with C++ implementation when in doubt

### Debugging Tips
- Use F3 to toggle debug UI for real-time game state inspection
- Test specific features: Q for garbage blocks, Z for manual stack raise
- Run individual tests: `npm test -- -t "test name"` for focused debugging
- Check `original/panel-pop` for reference implementation details

## Current Game State
The game currently has:
- Full block physics with gravity, matching, chains, and combos
- Complete animation system with visual effects
- Garbage block system with spawning, falling, and transformation
- Working input system with cursor control and swapping
- Debug UI showing performance, input states, and game stats
- Score system with chain/combo bonuses
- High-resolution 108x103 pixel block assets with 10px gaps
- Individual texture loading system for optimal performance

## Remaining Implementation Phases

### Phase 12-15: Polish & Release
- Game modes (puzzle, versus, endless)
- AI opponent system
- Configuration and persistence
- Performance optimization
- Final testing and release preparation

## Critical Technical Notes

### Key Files
- `src/game/Board.ts`: Core game logic with gravity, matching, chains
- `src/rendering/EnhancedBoardRenderer.ts`: Visual rendering with animations
- `src/rendering/BlockConstants.ts`: Centralized block dimensions and positioning helpers
- `src/rendering/BlockTextureManager.ts`: Individual texture loading and caching system
- `src/game/GarbageBlock.ts`: Garbage block implementation
- `src/animation/AnimationManager.ts`: Animation system coordination
- `original/panel-pop`: C++ reference implementation

### Important Implementation Details
1. **EnhancedBoardRenderer**: Used for garbage block support (not BoardRenderer)
2. **Enum comparisons**: Always use `TileType.AIR` not `'AIR'` string comparisons
3. **Animation timing**: All effects use 60 FPS fixed timestep for frame-perfect gameplay
4. **Garbage spawning**: Spawns in buffer area (row 16+) then falls into view
5. **Test coverage**: 218 tests passing, always run before commits
6. **Stack raising**: Force raise bypasses timer but still steps per tick (32 steps/row)
7. **Block textures**: Individual PNG files per color/state, loaded via BlockTextureManager
8. **Color mapping**: Game uses `CYAN` internally, files must be named `cyan.png` (not `blue.png`)
9. **Board dimensions**: Board size increased from 192x384 to 698x1346 pixels with gaps

### Recent Fixes & Resolved Issues
- **Stack Raise Bug (Fixed)**: `stackRaiseForced` was being reset prematurely on every tick instead of only after full row raise completion. Fixed in `Board.ts:handleStackRaising()` to match original C++ behavior.
- **Board Movement**: Tiles correctly shift up during stack raise with buffer row replacing bottom row
- **Asset Migration (Complete)**: Migrated from 32x32 sprites to 108x103 individual PNG textures with 10px gaps. All animations and positioning updated accordingly.
- **Color Naming Fix**: Renamed blue assets to cyan to match internal `BlockColor.CYAN` enum

## Testing & Verification
1. Visual testing at `localhost:3000` with debug UI (F3)
2. Test garbage blocks with Q key
3. Verify chain/combo mechanics work correctly
4. Compare timing with original C++ reference
5. Always run `npm run lint && npm run type-check && npm test` before commits

## Code Quality Principles
- **Frame-Perfect Accuracy**: Match original game timing exactly (60 FPS fixed timestep)
- **Type Safety**: Use TypeScript enums and interfaces, avoid string comparisons
- **Test Coverage**: Maintain comprehensive test suite, add tests for new features
- **Reference Implementation**: When uncertain, check `original/panel-pop` C++ code
- **Clean Code**: Follow existing patterns, use descriptive names, avoid magic numbers
- **Performance**: Optimize hot paths, use object pooling for frequently created objects

## Common Pitfalls to Avoid
1. **Don't reset flags prematurely**: Game state flags should only reset when their full action completes
2. **Respect the fixed timestep**: All timing must be in ticks (1/60 second), not real time
3. **Test edge cases**: Stack raising at boundaries, garbage blocks at edges, chain breaks
4. **Maintain separation**: Keep game logic (Board.ts) separate from rendering (EnhancedBoardRenderer.ts)
5. **Asset naming**: Block assets must match internal color names (`cyan.png`, not `blue.png`)

The core gameplay mechanics are complete and functional with high-resolution visual assets. Focus next on game modes and multiplayer features.