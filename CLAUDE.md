# Panel Pop Three.js Implementation - Development Guide

## Project Overview
Panel Pop is a Tetris Attack/Puzzle League clone being ported from C++ to Three.js. This document defines development best practices, testing standards, and quality assurance procedures.

## Code Quality Standards

### Required Tools & Configuration

#### ESLint Configuration
```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "no-unused-vars": "error",
    "no-console": "warn",
    "prefer-const": "error",
    "no-var": "error",
    "eqeqeq": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

#### TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true
  }
}
```

#### Prettier Configuration
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

### Development Workflow

#### Pre-Commit Requirements
**ALWAYS run these commands before committing ANY code changes:**

```bash
# 1. Lint code and fix issues
npm run lint
npm run lint:fix

# 2. Type check
npm run type-check

# 3. Format code
npm run format

# 4. Run all tests
npm run test

# 5. Run build to ensure no compilation errors
npm run build
```

#### Package.json Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src/**/*.{js,ts,tsx} --max-warnings 0",
    "lint:fix": "eslint src/**/*.{js,ts,tsx} --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write src/**/*.{js,ts,tsx,json,css}",
    "format:check": "prettier --check src/**/*.{js,ts,tsx,json,css}",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest --coverage",
    "test:ui": "vitest --ui"
  }
}
```

## Testing Standards

### Testing Framework Setup
- **Unit Tests**: Vitest + @testing-library
- **Integration Tests**: Playwright (for browser testing)
- **Coverage Target**: Minimum 80% line coverage for core game logic

### Test Structure
```
tests/
├── unit/
│   ├── core/
│   │   ├── Board.test.ts
│   │   ├── Block.test.ts
│   │   └── GameEngine.test.ts
│   ├── game/
│   │   ├── MatchDetection.test.ts
│   │   ├── ChainSystem.test.ts
│   │   └── ScoreCalculation.test.ts
│   └── input/
│       └── InputManager.test.ts
├── integration/
│   ├── GameFlow.test.ts
│   ├── VSMode.test.ts
│   └── EndlessMode.test.ts
└── e2e/
    ├── FullGameplay.spec.ts
    └── MenuNavigation.spec.ts
```

### Required Test Coverage

#### Core Game Logic (MUST be tested)
1. **Board Class**
   ```typescript
   describe('Board', () => {
     test('initializes with correct dimensions', () => {
       const board = new Board();
       expect(board.getWidth()).toBe(6);
       expect(board.getHeight()).toBe(24);
     });

     test('detects horizontal matches correctly', () => {
       const board = new Board();
       // Set up 3 purple blocks horizontally
       board.setTile(0, 0, new Block(BlockColor.PURPLE));
       board.setTile(0, 1, new Block(BlockColor.PURPLE));
       board.setTile(0, 2, new Block(BlockColor.PURPLE));
       
       board.matchBlocks();
       expect(board.getTile(0, 0).block.state).toBe(BlockState.MATCHED);
     });

     test('chain detection works correctly', () => {
       const board = setupChainScenario();
       board.tick();
       expect(board.getChainCounter()).toBe(2);
     });
   });
   ```

2. **Match Detection System**
   ```typescript
   describe('MatchDetection', () => {
     test('requires minimum 3 blocks for match', () => {
       // Test 2-block non-match
       // Test 3-block match
       // Test 4+ block match
     });

     test('only matches NORMAL state blocks', () => {
       // Test that FLOATING/MATCHED/EXPLODING blocks don't match
     });

     test('handles L-shaped matches correctly', () => {
       // Test complex match patterns
     });
   });
   ```

3. **Chain System**
   ```typescript
   describe('ChainSystem', () => {
     test('chain counter increments on falling block matches', () => {
       // Set up scenario where matched blocks create falling blocks
       // Verify chain counter increases
     });

     test('chain ends when no chain-flagged blocks match', () => {
       // Test chain termination
     });
   });
   ```

4. **Score Calculation**
   ```typescript
   describe('ScoreCalculation', () => {
     test('combo scoring: 10 * blocks * blocks', () => {
       expect(calculateComboScore(4)).toBe(160); // 10 * 4 * 4
     });

     test('chain scoring matches original values', () => {
       expect(getChainScore(2)).toBe(50);
       expect(getChainScore(3)).toBe(80);
       expect(getChainScore(11)).toBe(1300);
     });
   });
   ```

5. **Garbage Block System**
   ```typescript
   describe('GarbageBlocks', () => {
     test('spawn at correct positions', () => {
       // Test garbage queue and positioning
     });

     test('transform correctly when triggered', () => {
       // Test transformation logic
     });

     test('gray blocks require multiple triggers', () => {
       // Test gray block behavior
     });
   });
   ```

6. **Input System**
   ```typescript
   describe('InputManager', () => {
     test('queues inputs during animations', () => {
       // Test input buffering
     });

     test('respects key bindings configuration', () => {
       // Test custom key mapping
     });
   });
   ```

### Integration Tests

#### Game Flow Tests
```typescript
describe('Game Flow Integration', () => {
  test('complete chain sequence', async () => {
    const game = new EndlessGame();
    
    // Set up chain scenario
    setupChainBlocks(game.getBoard());
    
    // Trigger initial match
    game.getBoard().inputSwapBlocks();
    
    // Run game ticks until chain completes
    while (game.getBoard().hasActiveBlocks()) {
      game.tick();
    }
    
    // Verify final state
    expect(game.getBoard().getChainCounter()).toBe(4);
    expect(game.getBoard().getScore()).toBe(expectedChainScore);
  });

  test('panic mode activation', () => {
    const game = new EndlessGame();
    const board = game.getBoard();
    
    // Fill board to panic height
    fillBoardToPanicHeight(board);
    
    game.tick();
    
    expect(game.isPanic()).toBe(true);
    expect(board.getStackRaiseTicks()).toBeLessThan(10); // Faster raising
  });
});
```

### Performance Tests
```typescript
describe('Performance', () => {
  test('maintains 60 FPS with full board', () => {
    const game = new EndlessGame();
    fillBoardCompletely(game.getBoard());
    
    const startTime = performance.now();
    
    // Run 60 ticks (1 second worth)
    for (let i = 0; i < 60; i++) {
      game.tick();
    }
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(16.67); // 60 FPS threshold
  });

  test('particle system handles 100+ particles', () => {
    const particleSystem = new ParticleSystem();
    
    // Create explosion with many particles
    for (let i = 0; i < 100; i++) {
      particleSystem.createParticle(Math.random() * 400, Math.random() * 600);
    }
    
    const startTime = performance.now();
    particleSystem.update();
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(1); // 1ms budget
  });
});
```

## Quality Gates

### Pre-Commit Checklist
- [ ] All linting rules pass (0 warnings, 0 errors)
- [ ] TypeScript compilation succeeds with no errors
- [ ] All unit tests pass
- [ ] Code coverage remains above 80%
- [ ] No new console.log statements (use proper logging)
- [ ] Performance tests pass
- [ ] Integration tests pass

### Pull Request Requirements
- [ ] All quality gates pass
- [ ] New features include corresponding tests
- [ ] Test coverage for new code is ≥90%
- [ ] No breaking changes to existing API
- [ ] Performance regression tests pass
- [ ] Memory leak tests pass

## Development Commands Reference

### Daily Development
```bash
# Start development server
npm run dev

# Run tests in watch mode while coding
npm run test:watch

# Check code quality
npm run lint && npm run type-check
```

### Before Committing
```bash
# Complete quality check (run this EVERY time before commit)
npm run lint:fix && npm run type-check && npm run test && npm run build

# Check test coverage
npm run test:coverage
```

### Debugging
```bash
# Run specific test file
npx vitest Board.test.ts

# Run tests with debugger
npx vitest --inspect-brk Board.test.ts

# Run tests with UI
npm run test:ui
```

## Game-Specific Testing Requirements

### Critical Game Logic Verification

#### Timing Accuracy
All frame-based timing must match the original game exactly:
```typescript
test('explosion timing matches original', () => {
  const block = new Block(BlockColor.PURPLE);
  block.state = BlockState.MATCHED;
  block.explosionTicks = 61; // Base explosion time
  
  // Simulate ticks
  for (let i = 0; i < 61; i++) {
    block.tick();
  }
  
  expect(block.state).toBe(BlockState.EXPLODING);
});

test('float timer duration', () => {
  const block = new Block(BlockColor.RED);
  block.state = BlockState.FLOATING;
  block.floatTimer = 12;
  
  // Should remain floating for exactly 12 ticks
  for (let i = 0; i < 11; i++) {
    block.tick();
    expect(block.state).toBe(BlockState.FLOATING);
  }
  
  block.tick(); // 12th tick
  expect(block.state).toBe(BlockState.NORMAL);
});
```

#### Match Detection Accuracy
```typescript
test('match detection edge cases', () => {
  const board = new Board();
  
  // Test various match patterns that must work exactly like original
  testVerticalMatch(board);
  testHorizontalMatch(board);
  testLShapedMatch(board);
  testMatchDuringFall(board);
});
```

#### Chain Mechanics Verification
```typescript
test('chain propagation rules', () => {
  const board = new Board();
  
  // Verify chain flags propagate correctly
  // Test multiple chain scenarios
  // Ensure chain counter accuracy
});
```

## Error Handling Standards

### Required Error Boundaries
```typescript
// All Three.js operations must be wrapped
try {
  mesh.position.set(x, y, z);
} catch (error) {
  Logger.error('Mesh positioning failed', { x, y, z, error });
  // Fallback behavior
}

// All game state changes must be validated
function swapBlocks(x: number, y: number): boolean {
  if (!isValidPosition(x, y)) {
    Logger.warn('Invalid swap position', { x, y });
    return false;
  }
  
  // Perform swap
  return true;
}
```

## Memory Management

### Required Cleanup Patterns
```typescript
class ParticleSystem {
  private particles: Particle[] = [];
  
  update(): void {
    // Remove dead particles to prevent memory leaks
    this.particles = this.particles.filter(particle => particle.alive);
  }
  
  dispose(): void {
    // Clean up Three.js resources
    this.particles.forEach(particle => {
      particle.mesh.geometry.dispose();
      particle.mesh.material.dispose();
    });
    this.particles.length = 0;
  }
}
```

## Performance Monitoring

### Required Metrics
```typescript
class PerformanceMonitor {
  private frameTimes: number[] = [];
  
  recordFrame(deltaTime: number): void {
    this.frameTimes.push(deltaTime);
    
    // Alert if frame time exceeds budget
    if (deltaTime > 16.67) { // 60 FPS threshold
      Logger.warn('Frame time exceeded budget', { deltaTime });
    }
    
    // Keep only last 60 frames
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
    }
  }
  
  getAverageFrameTime(): number {
    return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
  }
}
```

## Commit Message Standards

### Format
```
type(scope): description

body (optional)

Closes #issue-number (if applicable)
```

### Examples
```
feat(board): implement chain detection system

- Add chain flag propagation logic
- Implement chain counter management
- Add chain end detection
- All chain tests passing

test(game): add comprehensive match detection tests

- Cover horizontal and vertical matches
- Test L-shaped match patterns
- Add edge case coverage
- Achieve 95% coverage for match system

fix(rendering): resolve particle memory leak

- Properly dispose particle geometries
- Implement particle pooling
- Add cleanup in dispose method
- Memory usage now stable during long gameplay

Closes #42
```

## Documentation Requirements

### Code Comments
```typescript
/**
 * Detects and marks blocks for matching based on Panel de Pon rules.
 * Only NORMAL state blocks can participate in matches.
 * Minimum match size is 3 blocks in a line (horizontal or vertical).
 * 
 * @returns Number of blocks marked for matching this tick
 */
matchBlocks(): number {
  // Implementation details...
}
```

### README Updates
Any new feature or significant change requires corresponding README updates with:
- Usage examples
- Configuration options
- Performance implications
- Breaking changes

Remember: The goal is to create a pixel-perfect recreation of the original Panel Pop game with modern web technologies while maintaining the highest code quality standards.