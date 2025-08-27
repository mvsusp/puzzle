# Asset Migration Plan: 108x103 Pixel Block Rendering

## Current State Analysis

### Existing System
- **Current block size**: 32x32 pixels (TILE_SIZE constant)
- **Rendering method**: Three.js PlaneGeometry with texture mapping
- **Asset loading**: Uses spritesheet (sprites.png) with UV mapping
- **Block states**: NORMAL, LANDED (exploding), EXPLODING (blink)
- **Renderer**: EnhancedBoardRenderer with PixelPerfectSpriteRenderer
- **Grid dimensions**: 6x24 (6 width x 12 visible rows)
- **Board pixel dimensions**: 192x384 pixels (6 * 32 x 12 * 32)

### New Assets Specifications
- **New block size**: 108x103 pixels
- **Gap between blocks**: 10 pixels
- **Individual PNG files** for each color and state:
  - Normal: red.png, blue.png, yellow.png, purple.png, green.png
  - Landed: red-landed.png, blue-landed.png, etc.
  - Blink: red-blink.png, blue-blink.png, etc.
- **Total grid width**: (108 * 6) + (10 * 5) = 698 pixels
- **Total grid height**: (103 * 12) + (10 * 11) = 1346 pixels

## Implementation Challenges

### 1. Size Discrepancy
- New blocks are ~3.3x larger than current blocks
- Board dimensions will increase from 192x384 to 698x1346 pixels
- Camera and scene dimensions need adjustment

### 2. Rendering Method Change
- Move from spritesheet UV mapping to individual texture files
- Each block needs its own texture instance
- Memory management for 15 textures (5 colors × 3 states)

### 3. Positioning System
- Current: Blocks positioned at TILE_SIZE intervals (32px)
- New: Blocks positioned at (108 + 10) = 118px horizontal, (103 + 10) = 113px vertical
- Offset calculations need complete overhaul

### 4. Animation Impacts
- Swap animations need larger movement distances
- Fall animations need adjusted speeds
- Cursor needs resizing (2 blocks wide = 226px instead of 64px)

## Implementation Plan

### Phase 1: Asset Preparation
1. **Copy assets to public directory**
   - Copy neo-assets/*.png to public/assets/sprites/blocks/
   - Organize by state folders: normal/, landed/, blink/

2. **Update AssetLoader**
   - Add new texture loading method for individual block textures
   - Implement texture caching for all 15 block variations
   - Remove dependency on spritesheet for blocks

### Phase 2: Rendering Constants Update
1. **Update EnhancedBoardRenderer constants**
   ```typescript
   // Old
   public static readonly TILE_SIZE = 32;
   
   // New
   public static readonly BLOCK_WIDTH = 108;
   public static readonly BLOCK_HEIGHT = 103;
   public static readonly BLOCK_GAP = 10;
   public static readonly TILE_SIZE_X = BLOCK_WIDTH + BLOCK_GAP;
   public static readonly TILE_SIZE_Y = BLOCK_HEIGHT + BLOCK_GAP;
   ```

2. **Update board pixel dimensions**
   ```typescript
   // Calculate with gaps
   public static readonly BOARD_PIXEL_WIDTH = 
     (BLOCK_WIDTH * Board.BOARD_WIDTH) + 
     (BLOCK_GAP * (Board.BOARD_WIDTH - 1));
   public static readonly BOARD_PIXEL_HEIGHT = 
     (BLOCK_HEIGHT * (Board.TOP_ROW + 1)) + 
     (BLOCK_GAP * Board.TOP_ROW);
   ```

### Phase 3: Texture Management
1. **Create BlockTextureManager class**
   - Load individual PNG files for each color/state combo
   - Implement texture pooling and reuse
   - Handle texture disposal properly

2. **Update PixelPerfectSpriteRenderer**
   - Remove spritesheet dependency for blocks
   - Load textures from individual files
   - Maintain backward compatibility for other sprites

### Phase 4: Positioning System
1. **Update block positioning logic**
   ```typescript
   // Calculate position with gaps
   getBlockPosition(row: number, col: number): Vector3 {
     const x = col * TILE_SIZE_X - (BOARD_PIXEL_WIDTH / 2) + (BLOCK_WIDTH / 2);
     const y = row * TILE_SIZE_Y - (BOARD_PIXEL_HEIGHT / 2) + (BLOCK_HEIGHT / 2);
     return new Vector3(x, y, 1);
   }
   ```

2. **Update mesh geometry**
   - Change PlaneGeometry size from 32x32 to 108x103
   - Adjust mesh scaling for proper display

### Phase 5: Camera and Scene Adjustment
1. **Update SceneManager camera**
   - Increase world dimensions to accommodate larger board
   - Adjust camera frustum for new board size
   - Maintain pixel-perfect rendering

2. **Scale adjustment options**:
   - Option A: Keep 1:1 pixel rendering, adjust viewport
   - Option B: Scale down entire board to fit original viewport
   - Option C: Dynamic scaling based on window size

### Phase 6: Animation System Updates
1. **BlockAnimator adjustments**
   - Scale swap distance from 32px to 118px
   - Adjust fall speed for 113px vertical distance
   - Update float animation amplitude

2. **CursorAnimator updates**
   - Resize cursor to 226px width (2 blocks + gap)
   - Adjust cursor movement speed
   - Update blink animation

3. **StackAnimator modifications**
   - Update rise distance per step
   - Adjust animation smoothing for larger blocks

### Phase 7: Effects and Polish
1. **Particle system scaling**
   - Scale particle positions for larger blocks
   - Adjust particle size and spread

2. **Visual effects adjustments**
   - Scale screen shake magnitude
   - Update explosion animations
   - Adjust chain/combo indicators

### Phase 8: Testing and Optimization
1. **Performance testing**
   - Profile texture memory usage
   - Test animation frame rates
   - Optimize rendering pipeline

2. **Visual testing**
   - Verify pixel-perfect rendering
   - Test all block states and animations
   - Ensure proper gap rendering

## File Changes Required

### Core Files to Modify
1. `src/assets/AssetLoader.ts` - Add individual texture loading
2. `src/rendering/EnhancedBoardRenderer.ts` - Update all positioning and sizing
3. `src/rendering/PixelPerfectSpriteRenderer.ts` - Load from individual files
4. `src/rendering/SceneManager.ts` - Adjust camera and world size
5. `src/animation/BlockAnimator.ts` - Scale animations
6. `src/animation/CursorAnimator.ts` - Resize cursor
7. `src/animation/StackAnimator.ts` - Adjust rise animation
8. `src/effects/VisualEffectsManager.ts` - Scale particle effects

### New Files to Create
1. `src/rendering/BlockTextureManager.ts` - Manage individual block textures
2. `src/rendering/BlockConstants.ts` - Centralize block dimension constants

### Configuration Updates
1. Update webpack/vite config to handle new asset structure
2. Ensure proper asset copying in build process

## Migration Strategy

### Step 1: Parallel Implementation
- Keep existing 32x32 system intact
- Build new 108x103 system alongside
- Use feature flag to switch between systems

### Step 2: Gradual Migration
1. Migrate texture loading first
2. Update positioning system
3. Adjust animations
4. Scale effects
5. Remove old system

### Step 3: Testing Phases
1. Unit tests for new positioning math
2. Visual regression tests
3. Performance benchmarks
4. Full gameplay testing

## Considerations and Risks

### Memory Impact
- 15 individual textures vs 1 spritesheet
- Estimated memory: 108×103×4×15 = ~650KB (manageable)
- Consider texture atlasing if memory becomes issue

### Performance Impact
- More draw calls with individual textures
- Larger geometry requires more GPU bandwidth
- May need batching optimizations

### Visual Impact
- Significantly larger game display
- May require responsive scaling
- UI elements may need repositioning

### Backward Compatibility
- Save states may need migration
- Replays could be affected
- Test suites need updating

## Alternative Approaches

### Option 1: Dynamic Scaling
- Keep internal logic at 32x32
- Scale up visually to 108x103
- Pros: Minimal code changes
- Cons: Potential quality loss

### Option 2: Viewport Scaling
- Render at full 108x103
- Scale viewport to fit screen
- Pros: Pixel-perfect quality
- Cons: May require scrolling

### Option 3: Hybrid Approach
- Use 108x103 textures
- Scale to intermediate size (e.g., 64x64)
- Pros: Balance of quality and compatibility
- Cons: Not true to original asset size

## Recommended Approach

**Primary recommendation**: Full migration with viewport scaling
- Implement complete 108x103 system
- Add dynamic viewport scaling
- Maintain aspect ratio
- Provide zoom controls

This approach preserves asset quality while maintaining playability across different screen sizes.

## Timeline Estimate

- Phase 1-2: 2 hours (asset setup, constants)
- Phase 3-4: 3 hours (texture management, positioning)
- Phase 5-6: 3 hours (camera, animations)
- Phase 7-8: 2 hours (effects, testing)
- **Total: ~10 hours**

## Success Criteria

1. All blocks render at 108x103 pixels
2. 10-pixel gaps visible between blocks
3. All animations work correctly
4. Performance remains at 60 FPS
5. Game remains fully playable
6. All tests pass with updated dimensions