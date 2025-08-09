# Panel Pop Three.js Implementation Plan

## Executive Summary
Panel Pop is a Panel de Pon / Tetris Attack / Puzzle League clone built with C++ and SDL. This document provides a comprehensive technical blueprint for porting the game to Three.js, maintaining all original mechanics while leveraging modern web technologies.

## 1. Game Architecture Overview

### Core Game Structure
The game follows a state-based architecture with clear separation between game logic, rendering, and input handling.

#### Key Components:
- **State Management**: Hierarchical state system (Title Screen → Menu → Game States)
- **Game Loop**: Fixed tick rate (60 FPS) with separate update and render cycles
- **Board System**: 6x24 grid with 12 visible rows (rows 0-11 are buffer/hidden)
- **Event System**: Event-driven architecture for game events (combos, chains, explosions)

### Game Modes
1. **Endless Mode**: Single-player survival with score tracking
2. **VS Mode**: Two-player competitive with garbage blocks
3. **Demo Mode**: AI-controlled demonstration (triggers after 600 idle ticks)

## 2. Complete Feature Inventory

### Core Gameplay Features
- **Block Swapping**: Horizontal swapping with 3-tick delay
- **Gravity System**: Blocks fall with 12-tick float timer
- **Match Detection**: 3+ blocks horizontally/vertically
- **Chain System**: Sequential matches from falling blocks
- **Combo System**: Multiple simultaneous matches
- **Stack Raising**: Manual (Z key) or automatic progression
- **Garbage Blocks**: Multi-tile blocks that transform when triggered
- **Panic Mode**: Accelerated gameplay at height threshold (row 9)
- **Warning System**: Visual indicators at row 10
- **Countdown System**: 3-2-1-GO sequence (188 ticks total)

### Visual Features
- **Particle Effects**: Block explosions with directional particles
- **Popups**: Chain and combo value displays
- **Animations**: 
  - Block swap animation (left/right states)
  - Block explosion sequence
  - Garbage transformation
  - Cursor pulsing
  - Stack rise (32 steps per row)
- **Visual States**: Normal, floating, matched, exploding, swapping

### Audio Features
- **Dynamic Music**: Normal and panic tracks
- **Sound Effects Matrix**: 
  - Chain sounds (1x1 to 4x10)
  - Combo sounds
  - Swap, cursor, countdown sounds
  - Thump effects for garbage
- **Volume Control**: Separate music and SFX sliders

## 3. Technical Components (Three.js Specific)

### 3.1 Scene Structure
```javascript
// Main scene hierarchy
Scene
├── Camera (Orthographic)
├── Lighting (Ambient + Directional)
├── Game Container
│   ├── Board Mesh Groups (1 or 2 for VS)
│   │   ├── Grid Background
│   │   ├── Block Instances
│   │   ├── Garbage Block Meshes
│   │   ├── Cursor Mesh
│   │   └── Particle Systems
│   ├── UI Layer
│   │   ├── Score Display
│   │   ├── Timer Display
│   │   ├── Chain/Combo Popups
│   │   └── Countdown Display
│   └── Background Elements
```

### 3.2 Rendering Architecture
- **Instanced Rendering**: Use InstancedMesh for blocks (5 colors × ~144 blocks max)
- **Texture Atlas**: Single sprite sheet for all block/UI graphics
- **Render Layers**: 
  1. Background layer
  2. Game board layer
  3. Effects layer (particles, popups)
  4. UI overlay layer

### 3.3 Animation System
- **Tween Manager**: Handle all position/scale/opacity animations
- **Frame-based Timing**: Maintain 60 FPS tick system from original
- **Animation Queue**: Sequential animation handling for chains

### 3.4 Input System
- **Keyboard Manager**: Map SDL keys to web KeyboardEvent codes
- **Gamepad API**: Support for game controllers
- **Touch Controls**: Mobile-friendly touch interface
- **Input Buffer**: Queue inputs during animations

## 4. Game Logic Breakdown

### 4.1 Board Class Implementation
```javascript
class Board {
  // Constants
  static BOARD_WIDTH = 6;
  static BOARD_HEIGHT = 24;
  static TOP_ROW = 11;
  static PANIC_HEIGHT = 9;
  static WARN_HEIGHT = 10;
  static FLOAT_TICKS = 12;
  static STACK_RAISE_STEPS = 32;
  static BASE_EXPLOSION_TICKS = 61;
  static ADD_EXPL_TICKS = 9;
  static SWAP_DELAY = 3;
  static COUNTDOWN_TICKS = 188;

  // Core properties
  tiles = []; // 24x6 array
  bufferRow = []; // 6 blocks
  garbageBlocks = [];
  garbageQueue = [];
  
  // State tracking
  state; // RUNNING, COUNTDOWN, WON, GAME_OVER
  cursorX = 2;
  cursorY = 5;
  stackOffset = 0;
  stackRaiseTicks = 10;
  chainCounter = 1;
  score = 0;
  ticksRun = 0;
  panic = false;
  
  // Methods
  tick() {}
  matchBlocks() {}
  handleFalling() {}
  raiseStack() {}
  swapBlocks(x, y) {}
  checkChain(row, col) {}
  spawnGarbage() {}
}
```

### 4.2 Block State Machine
```javascript
BlockState = {
  NORMAL: 'normal',
  FLOATING: 'floating',
  MATCHED: 'matched',
  EXPLODING: 'exploding',
  SWAPPING_LEFT: 'swapping_left',
  SWAPPING_RIGHT: 'swapping_right'
};

BlockColor = {
  PURPLE: 0,
  YELLOW: 1,
  RED: 2,
  CYAN: 3,
  GREEN: 4
};
```

### 4.3 Match Detection Algorithm
1. **Horizontal Matching**: Scan each row left-to-right
2. **Vertical Matching**: Scan each column bottom-to-top
3. **Match Validation**: Only NORMAL state blocks can match
4. **Chain Detection**: Check if matched blocks were falling or above falling blocks
5. **Combo Calculation**: Count total matched blocks this tick

### 4.4 Garbage Block System
```javascript
class GarbageBlock {
  x, y; // Upper-left corner
  width, height;
  type; // NORMAL or GRAY
  state; // NORMAL, TRIGGERED, TRANSFORMING
  transformationTicks;
  bufferRow = []; // Blocks to spawn after transformation
  
  trigger() {}
  transform() {}
  canFall() {}
}
```

### 4.5 Scoring System
- **Combo Scoring**: (10 × blocks × blocks)
- **Chain Scoring**: 
  - Chain 2: 50
  - Chain 3: 80
  - Chain 4: 150
  - Chain 5: 300
  - Chain 6: 400
  - Chain 7: 500
  - Chain 8: 700
  - Chain 9: 900
  - Chain 10: 1100
  - Chain 11+: 1300+

## 5. Assets & Resources

### 5.1 Visual Assets
- **sprites.png**: Main sprite sheet containing:
  - Block tiles (5 colors × multiple states)
  - Cursor frames
  - Particle sprites
  - UI elements
- **bg1.png**: Game background
- **title.png**: Title screen logo
- **1p.png, 2p.png**: Player indicators

### 5.2 Audio Assets
#### Music Tracks
- `panelpop_intro.ogg`: Title screen intro
- `panelpop_loop.ogg`: Title screen loop
- `battle1_loop.ogg`: Gameplay music
- `battle1_panic.ogg`: Panic mode music

#### Sound Effects
- **Chain SFX**: 40 files (1x1.wav to 4x10.wav)
- **System SFX**: 
  - cursor.wav, swap.wav
  - countdown.wav, go.wav
  - pause.wav
  - thump.wav, bigthump.wav
  - chain.wav, combo.wav
  - fanfare1-3.wav

### 5.3 Fonts
- **PressStart2P.ttf**: Retro pixel font for UI
- **square_sans_serif_7.ttf**: Secondary UI font

## 6. Implementation Phases

### Phase 1: Foundation & Core Engine (Days 1-5)

#### Objective
Establish the technical foundation and core rendering pipeline for the game.

#### Deliverables
1. **Project Infrastructure**
   ```
   ├── src/
   │   ├── core/           # Game engine core
   │   ├── game/           # Game logic
   │   ├── rendering/      # Three.js rendering
   │   ├── input/          # Input handling
   │   ├── assets/         # Asset management
   │   └── utils/          # Utilities
   ├── public/
   │   └── assets/         # Game assets
   └── package.json
   ```

2. **Core Systems**
   - Three.js scene initialization with orthographic camera
   - Asset loader for textures, sprites, and audio
   - Game loop with fixed timestep (60 FPS)
   - Basic sprite rendering using texture atlas
   - Development environment with hot reload

#### Success Criteria
- [x] Three.js renders a test sprite on screen
- [x] Game loop runs at stable 60 FPS
- [ ] Assets load without errors
- [x] Basic project structure established

#### Code Structure
```javascript
// Core game loop implementation
class GameEngine {
  constructor() {
    this.clock = new THREE.Clock();
    this.accumulator = 0;
    this.timestep = 1/60;
  }
  
  update(deltaTime) {
    this.accumulator += deltaTime;
    while (this.accumulator >= this.timestep) {
      this.tick();
      this.accumulator -= this.timestep;
    }
  }
}
```

---

### Phase 2: Board System & Block Rendering (Days 6-10)

#### Objective
Implement the game board structure and basic block rendering system.

#### Deliverables
1. **Board Implementation**
   - 6x24 grid system with proper indexing
   - Tile data structure (type, block, garbage reference)
   - Buffer row management (row 0)
   - Board state management

2. **Block System**
   - Block class with color and state properties
   - Block mesh generation using instanced rendering
   - Proper positioning in 3D space
   - Visual representation of 5 block colors

3. **Basic Visuals**
   - Grid background rendering
   - Block sprite extraction from texture atlas
   - Proper layering and depth sorting

#### Success Criteria
- [ ] Board displays initial random block configuration
- [ ] All 5 block colors render correctly
- [ ] Grid aligns properly with blocks
- [ ] Buffer row remains hidden

#### Key Classes
```javascript
class Board {
  constructor() {
    this.tiles = Array(24).fill().map(() => Array(6).fill(null));
    this.bufferRow = Array(6).fill(null);
    this.state = BoardState.COUNTDOWN;
  }
}

class Block {
  constructor(color) {
    this.color = color;
    this.state = BlockState.NORMAL;
    this.mesh = null;
  }
}
```

---

### Phase 3: Input System & Cursor (Days 11-15)

#### Objective
Implement complete input handling and cursor mechanics.

#### Deliverables
1. **Input Manager**
   - Keyboard event handling
   - Input mapping system
   - Input state tracking (pressed, released, held)
   - Input queue for buffering

2. **Cursor System**
   - Cursor mesh and positioning
   - Movement constraints (grid-aligned)
   - Visual feedback (pulsing animation)
   - Cursor wrapping at board edges

3. **Basic Interactions**
   - Block swapping logic (without animation)
   - Manual stack raising
   - Pause functionality

#### Success Criteria
- [ ] Cursor moves smoothly within grid bounds
- [ ] Block swapping exchanges blocks correctly
- [ ] Input feels responsive (no dropped inputs)
- [ ] All keybindings work as specified

#### Implementation Details
```javascript
class InputManager {
  constructor() {
    this.keyStates = new Map();
    this.inputQueue = [];
    this.keyBindings = {
      up: 'ArrowUp',
      down: 'ArrowDown',
      left: 'ArrowLeft',
      right: 'ArrowRight',
      swap: 'KeyX',
      raise: 'KeyZ',
      pause: 'Escape'
    };
  }
}
```

---

### Phase 4: Core Game Mechanics (Days 16-25)

#### Objective
Implement the fundamental gameplay mechanics including gravity, matching, and timing.

#### Deliverables
1. **Gravity System**
   - Block falling logic
   - Float timer (12 ticks)
   - Fall detection algorithm
   - Support checking

2. **Match Detection**
   - Horizontal match scanning
   - Vertical match scanning
   - Match validation (only NORMAL blocks)
   - Match marking system

3. **Block States**
   - State machine implementation
   - State transitions (NORMAL → MATCHED → EXPLODING)
   - Timer management for each state
   - Proper state cleanup

4. **Timing System**
   - Frame-based tick counter
   - Explosion timing (61 + 9n frames)
   - Swap delay (3 frames)
   - Float duration tracking

#### Success Criteria
- [ ] Blocks fall when unsupported
- [ ] 3+ blocks match correctly
- [ ] Matched blocks explode after proper delay
- [ ] Swapped blocks float before falling
- [ ] No blocks get stuck in invalid states

#### Critical Algorithms
```javascript
// Match detection
matchBlocks() {
  // Horizontal matching
  for (let row = 0; row < TOP_ROW; row++) {
    for (let col = 0; col < BOARD_WIDTH - 2; col++) {
      if (this.checkHorizontalMatch(row, col)) {
        this.markMatched(row, col, horizontal);
      }
    }
  }
  // Vertical matching follows similar pattern
}
```

---

### Phase 5: Chain & Combo System (Days 26-30)

#### Objective
Implement the advanced scoring mechanics that create depth in gameplay.

#### Deliverables
1. **Chain System**
   - Chain flag propagation
   - Chain detection on match
   - Chain counter management
   - Chain end detection

2. **Combo System**
   - Simultaneous match detection
   - Combo size calculation
   - Combo multiplier logic

3. **Scoring**
   - Score calculation formulas
   - Score accumulation
   - Score display updates

#### Success Criteria
- [ ] Chains trigger correctly from falling blocks
- [ ] Chain counter increments properly
- [ ] Combos detect all simultaneous matches
- [ ] Score calculations match original game
- [ ] Chain/combo events trigger properly

#### Implementation
```javascript
checkChain(row, col) {
  // Check if block was falling or above falling block
  const tile = this.tiles[row][col];
  if (tile.block.falling || tile.chain) {
    return true;
  }
  // Check if supported by matched block
  if (row > 0) {
    const below = this.tiles[row - 1][col];
    if (below.type === TileType.BLOCK && 
        below.block.state === BlockState.MATCHED) {
      return true;
    }
  }
  return false;
}
```

---

### Phase 6: Animation System (Days 31-35)

#### Objective
Add smooth animations and visual feedback to all game actions.

#### Deliverables
1. **Block Animations**
   - Swap animation (slide left/right)
   - Fall animation (smooth drop)
   - Explosion animation (scale and fade)
   - Float animation (subtle bobbing)

2. **Stack Animation**
   - 32-step rise animation
   - Smooth scrolling
   - Row emergence from bottom

3. **Cursor Animation**
   - Pulsing effect
   - Movement smoothing
   - Swap feedback

4. **Tween System**
   - Animation queue management
   - Easing functions
   - Animation blending

#### Success Criteria
- [ ] All animations play smoothly at 60 FPS
- [ ] No animation glitches or pops
- [ ] Animations feel responsive
- [ ] Visual feedback enhances gameplay

---

### Phase 7: Garbage Blocks (Days 36-40)

#### Objective
Implement the garbage block system for versus mode gameplay.

#### Deliverables
1. **Garbage Block Logic**
   - Multi-tile block structure
   - Spawn queue system
   - Fall detection for large blocks
   - Transformation mechanics

2. **Triggering System**
   - Adjacent match detection
   - Trigger propagation
   - Transformation timing
   - Buffer row generation

3. **Visual Representation**
   - Large block rendering
   - Transformation animation
   - Connection visualization

#### Success Criteria
- [ ] Garbage blocks spawn correctly
- [ ] Large blocks fall as units
- [ ] Transformation creates proper blocks
- [ ] Gray blocks require multiple triggers

---

### Phase 8: Visual Effects & Particles (Days 41-45)

#### Objective
Add polish through particle effects and visual feedback systems.

#### Deliverables
1. **Particle System**
   - Block explosion particles
   - Directional velocity
   - Particle pooling
   - Color-matched particles

2. **Popup System**
   - Chain value popups
   - Combo value popups
   - Positioning and animation
   - Lifetime management

3. **Visual Feedback**
   - Screen shake on big chains
   - Warning column indicators
   - Panic mode visuals
   - Match flash effects

#### Success Criteria
- [ ] Particles spawn at correct positions
- [ ] Popups display accurate values
- [ ] Effects don't impact performance
- [ ] Visual feedback feels satisfying

---

### Phase 9: Game States & UI (Days 46-50)

#### Objective
Implement the complete game state system and user interface.

#### Deliverables
1. **State Management**
   - Title screen state
   - Menu states
   - Game states (countdown, running, game over)
   - State transitions

2. **UI Systems**
   - Score display
   - Timer display
   - Countdown sequence (3-2-1-GO)
   - Game over screen
   - Win/lose indicators

3. **Menu System**
   - Main menu
   - Options menu
   - Pause menu
   - Navigation logic

#### Success Criteria
- [ ] All states transition correctly
- [ ] UI updates in real-time
- [ ] Menus navigate properly
- [ ] Countdown sequence times correctly

---

### Phase 10: Audio System (Days 51-55)

#### Objective
Implement complete audio with music and sound effects.

#### Deliverables
1. **Audio Engine**
   - Web Audio API setup
   - Audio context management
   - Volume control system
   - Audio pooling

2. **Music System**
   - Track loading and playback
   - Loop points
   - Crossfading (normal to panic)
   - Pause/resume

3. **Sound Effects**
   - SFX triggering system
   - Chain/combo sound matrix
   - Priority system
   - Positional audio (for VS mode)

#### Success Criteria
- [ ] Music loops seamlessly
- [ ] SFX sync with actions
- [ ] Volume controls work
- [ ] No audio glitches or delays

---

### Phase 11: Game Modes (Days 56-60)

#### Objective
Implement the different game modes with their specific rules.

#### Deliverables
1. **Endless Mode**
   - Progressive speed increase
   - Score tracking
   - High score system
   - Difficulty curve

2. **VS Mode**
   - Dual board rendering
   - Garbage sending logic
   - Match point system
   - Win conditions

3. **Demo Mode**
   - AI controller hookup
   - Idle detection (600 ticks)
   - Automatic start/stop

#### Success Criteria
- [ ] Each mode follows correct rules
- [ ] VS mode synchronizes properly
- [ ] Demo mode showcases gameplay
- [ ] Mode transitions work correctly

---

### Phase 12: AI System (Days 61-65)

#### Objective
Implement the AI opponent for single player and demo modes.

#### Deliverables
1. **Board Scanner**
   - Pattern recognition
   - Match opportunity detection
   - Chain setup identification

2. **AI Controller**
   - Move evaluation
   - Decision making
   - Input simulation
   - Difficulty levels

3. **Strategy System**
   - Vertical match priority
   - Chain setup strategies
   - Defensive play

#### Success Criteria
- [ ] AI makes legal moves
- [ ] AI demonstrates competent play
- [ ] Different difficulty levels work
- [ ] AI doesn't cheat

---

### Phase 13: Configuration & Persistence (Days 66-68)

#### Objective
Add configuration options and data persistence.

#### Deliverables
1. **Settings System**
   - Configuration loading/saving
   - Local storage integration
   - Default values

2. **Input Configuration**
   - Key remapping interface
   - Gamepad configuration
   - Control presets

3. **High Scores**
   - Score persistence
   - Leaderboard display
   - Score validation

#### Success Criteria
- [ ] Settings persist between sessions
- [ ] Controls can be remapped
- [ ] High scores save correctly
- [ ] Configuration doesn't corrupt

---

### Phase 14: Optimization & Polish (Days 69-72)

#### Objective
Optimize performance and add final polish.

#### Deliverables
1. **Performance Optimization**
   - Draw call batching
   - Object pooling
   - Texture atlas optimization
   - Memory management

2. **Mobile Support**
   - Touch controls
   - Responsive sizing
   - Performance scaling
   - Mobile UI adjustments

3. **Polish**
   - Loading screens
   - Transitions
   - Error handling
   - Edge case fixes

#### Success Criteria
- [ ] Maintains 60 FPS on target hardware
- [ ] No memory leaks
- [ ] Works on mobile devices
- [ ] Feels polished and complete

---

### Phase 15: Testing & Release (Days 73-75)

#### Objective
Complete testing and prepare for release.

#### Deliverables
1. **Testing Suite**
   - Unit tests for game logic
   - Integration tests
   - Performance benchmarks
   - Playtest feedback

2. **Documentation**
   - Player guide
   - Developer documentation
   - API reference
   - Deployment guide

3. **Release Package**
   - Production build
   - Asset optimization
   - Deployment scripts
   - Version tagging

#### Success Criteria
- [ ] All tests pass
- [ ] No critical bugs
- [ ] Documentation complete
- [ ] Ready for deployment

## 7. Implementation Notes

### Critical Timing Values
- **Frame Rate**: 60 FPS (16.67ms per frame)
- **Swap Delay**: 3 frames
- **Float Duration**: 12 frames
- **Base Explosion**: 61 frames
- **Additional Explosion**: 9 frames per block
- **Stack Raise**: 32 steps per row
- **Countdown**: 188 total frames
- **Grace Period**: Variable based on activity

### Complex Mechanics Details

#### Chain System
1. Blocks are marked with chain flag when:
   - They fall after being supported by matched blocks
   - They match while having the chain flag
2. Chain counter increments when chain-flagged blocks match
3. Chain ends when no chain-flagged blocks match in a tick

#### Garbage Transformation
1. Triggered by adjacent matches
2. Transformation time based on size
3. Spawns buffer row of random blocks
4. Gray garbage requires multiple triggers

#### Stack Raising
1. Automatic raise based on timer (speeds up over time)
2. Manual raise with immediate effect
3. 32-step animation per row
4. Grace period prevents raise during active play

#### Panic Mode
1. Triggers when blocks reach row 9
2. Speeds up music and stack raising
3. Visual warning at row 10
4. Increases game tension

### Performance Considerations
- Use object pooling for particles and popups
- Implement frustum culling for off-screen elements
- Batch draw calls using instanced rendering
- Optimize texture atlas for minimal draw calls
- Use RAF (requestAnimationFrame) for smooth animations
- Implement frame skipping for low-performance devices

### Mobile Adaptations
- Touch controls with drag for cursor, tap for swap
- Responsive canvas sizing
- Optimized shaders for mobile GPUs
- Reduced particle count option
- Simplified effects mode

### Data Structures
```javascript
// Tile Structure
{
  type: 'AIR' | 'BLOCK' | 'GARBAGE',
  block: Block | null,
  garbageRef: GarbageBlock | null,
  chain: boolean
}

// GarbageSpawn Queue
{
  fullWidth: boolean,
  type: 'NORMAL' | 'GRAY',
  size: number,
  spawnTimer: number
}

// Input Event
{
  type: 'KEYBOARD' | 'GAMEPAD' | 'TOUCH',
  action: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'SWAP' | 'RAISE' | 'PAUSE',
  timestamp: number
}
```

## 8. Testing Checklist

### Core Mechanics
- [ ] Blocks fall correctly with gravity
- [ ] Float timer prevents immediate falling
- [ ] Matches detect properly (horizontal and vertical)
- [ ] Chains trigger from falling matches
- [ ] Combos calculate correctly
- [ ] Score increments properly
- [ ] Stack raises at correct speed
- [ ] Garbage blocks spawn and transform correctly

### Visual
- [ ] All animations play smoothly
- [ ] Particles spawn at correct positions
- [ ] Popups display correct values
- [ ] No visual glitches or z-fighting
- [ ] Proper layering of elements

### Audio
- [ ] Music loops seamlessly
- [ ] SFX trigger at correct times
- [ ] Volume controls work
- [ ] Panic music transitions smoothly

### Input
- [ ] All keys respond correctly
- [ ] Gamepad support functional
- [ ] Touch controls responsive
- [ ] Input buffer prevents dropped inputs

### Game States
- [ ] Title screen loads properly
- [ ] Menus navigate correctly
- [ ] Game modes initialize properly
- [ ] Pause functionality works
- [ ] Game over triggers correctly
- [ ] High scores save/load

### Performance
- [ ] Maintains 60 FPS on target hardware
- [ ] No memory leaks
- [ ] Efficient garbage collection
- [ ] Smooth on mobile devices

## Conclusion
This implementation plan provides a complete blueprint for porting Panel Pop to Three.js. The modular approach allows for iterative development while maintaining the precise mechanics that make the original game engaging. Focus on maintaining frame-perfect timing and responsive controls to preserve the competitive gameplay experience.