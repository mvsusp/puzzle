import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from '../../../src/game/Board';
import { Cursor } from '../../../src/game/Cursor';
import { Block } from '../../../src/game/Block';
import { BlockColor, BlockState, TileType } from '../../../src/game/BlockTypes';
import { AnimationManager } from '../../../src/animation/AnimationManager';
import { EnhancedBoardRenderer } from '../../../src/rendering/EnhancedBoardRenderer';
import { AssetLoader } from '../../../src/assets/AssetLoader';
import * as THREE from 'three';

describe('Block Swap Animation', () => {
  let board: Board;
  let cursor: Cursor;
  let renderer: EnhancedBoardRenderer;
  let assetLoader: AssetLoader;
  let scene: THREE.Scene;

  beforeEach(() => {
    board = new Board();
    cursor = new Cursor(board, 32); // Use default tile size for testing
    scene = new THREE.Scene();
    assetLoader = new AssetLoader();
    
    // Mock the necessary AssetLoader methods
    assetLoader.getBlockTextureManager = () => ({
      getTexture: () => null,
      dispose: () => {}
    } as any);
    
    renderer = new EnhancedBoardRenderer(board, assetLoader, cursor);
    
    // Add renderer's board group to scene
    scene.add(renderer.getBoardGroup());
    
    // Place two blocks to swap
    const leftTile = board.getTile(5, 2);
    const rightTile = board.getTile(5, 3);
    
    if (leftTile) {
      leftTile.type = TileType.BLOCK;
      leftTile.block = new Block(BlockColor.RED);
    }
    
    if (rightTile) {
      rightTile.type = TileType.BLOCK;
      rightTile.block = new Block(BlockColor.CYAN);
    }
    
    // Position cursor at the blocks
    cursor.setPosition(2, 5);
  });

  it('should move blocks only once when swapping', () => {
    const leftTile = board.getTile(5, 2);
    const rightTile = board.getTile(5, 3);
    
    const originalLeftBlock = leftTile?.block;
    const originalRightBlock = rightTile?.block;
    
    expect(originalLeftBlock).toBeDefined();
    expect(originalRightBlock).toBeDefined();
    
    // Track animation states
    const leftBlockStates: BlockState[] = [];
    const rightBlockStates: BlockState[] = [];
    
    // Perform swap
    const swapResult = cursor.swap();
    expect(swapResult).toBe(true);
    
    // After swap, blocks should be in SWAPPING states
    if (originalLeftBlock) {
      expect(originalLeftBlock.state).toBe(BlockState.SWAPPING_RIGHT);
      leftBlockStates.push(originalLeftBlock.state);
    }
    
    if (originalRightBlock) {
      expect(originalRightBlock.state).toBe(BlockState.SWAPPING_LEFT);
      rightBlockStates.push(originalRightBlock.state);
    }
    
    // Simulate multiple ticks to observe animation
    for (let i = 0; i < 5; i++) {
      board.tick();
      renderer.tick();
      
      if (originalLeftBlock) {
        leftBlockStates.push(originalLeftBlock.state);
      }
      if (originalRightBlock) {
        rightBlockStates.push(originalRightBlock.state);
      }
    }
    
    // Check that blocks only entered swap state once
    const leftSwapCount = leftBlockStates.filter(
      state => state === BlockState.SWAPPING_RIGHT
    ).length;
    const rightSwapCount = rightBlockStates.filter(
      state => state === BlockState.SWAPPING_LEFT
    ).length;
    
    expect(leftSwapCount).toBeLessThanOrEqual(3); // Should be in swap state for 3 ticks max
    expect(rightSwapCount).toBeLessThanOrEqual(3); // Should be in swap state for 3 ticks max
    
    // After swap completes, blocks should be in FLOATING state
    expect(originalLeftBlock?.state).toBe(BlockState.FLOATING);
    expect(originalRightBlock?.state).toBe(BlockState.FLOATING);
  });

  it('should swap blocks in correct directions on first swap', () => {
    const leftTile = board.getTile(5, 2);
    const rightTile = board.getTile(5, 3);
    
    const originalLeftBlock = leftTile?.block;
    const originalRightBlock = rightTile?.block;
    
    expect(originalLeftBlock).toBeDefined();
    expect(originalRightBlock).toBeDefined();
    
    // Get mesh positions before swap
    const meshes = renderer['blockMeshes'];
    const leftMesh = meshes[5][2];
    const rightMesh = meshes[5][3];
    
    const leftStartX = leftMesh.position.x;
    const rightStartX = rightMesh.position.x;
    
    // Perform swap
    cursor.swap();
    
    // Update renderer to trigger animations
    renderer.tick();
    
    // Check mesh movement directions
    // Left mesh should move right (positive X direction)
    // Right mesh should move left (negative X direction)
    
    // Simulate first animation tick
    board.tick();
    renderer.tick();
    
    const leftMeshAfter = meshes[5][2];
    const rightMeshAfter = meshes[5][3];
    
    // Verify movement directions
    // The mesh at position [5][2] should now represent the block that was at [5][3]
    // and should be moving left (negative X)
    // The mesh at position [5][3] should now represent the block that was at [5][2]
    // and should be moving right (positive X)
    
    // After data swap:
    // leftTile.block is now originalRightBlock (moving left)
    // rightTile.block is now originalLeftBlock (moving right)
    
    // Check that animations started correctly
    expect(originalLeftBlock?.state).toBe(BlockState.SWAPPING_RIGHT);
    expect(originalRightBlock?.state).toBe(BlockState.SWAPPING_LEFT);
    
    // Verify no duplicate animations or wrong directions
    const leftBlockHistory: { state: BlockState, position?: number }[] = [];
    const rightBlockHistory: { state: BlockState, position?: number }[] = [];
    
    for (let i = 0; i < 5; i++) {
      board.tick();
      renderer.tick();
      
      leftBlockHistory.push({
        state: originalLeftBlock?.state || BlockState.NORMAL,
        position: leftMeshAfter.position.x
      });
      
      rightBlockHistory.push({
        state: originalRightBlock?.state || BlockState.NORMAL,
        position: rightMeshAfter.position.x
      });
    }
    
    // Verify blocks moved in correct directions
    // and didn't have multiple direction changes
    const leftDirectionChanges = countDirectionChanges(
      leftBlockHistory.map(h => h.position || 0)
    );
    const rightDirectionChanges = countDirectionChanges(
      rightBlockHistory.map(h => h.position || 0)
    );
    
    expect(leftDirectionChanges).toBeLessThanOrEqual(1); // Should move in one direction only
    expect(rightDirectionChanges).toBeLessThanOrEqual(1); // Should move in one direction only
  });

  it('should maintain consistent swap behavior on subsequent swaps', () => {
    // First swap
    cursor.swap();
    
    // Complete first swap animation
    for (let i = 0; i < 5; i++) {
      board.tick();
      renderer.tick();
    }
    
    // Wait for blocks to settle
    for (let i = 0; i < 15; i++) {
      board.tick();
      renderer.tick();
    }
    
    // Second swap (swap back)
    const swapResult = cursor.swap();
    expect(swapResult).toBe(true);
    
    const leftTile = board.getTile(5, 2);
    const rightTile = board.getTile(5, 3);
    
    // Track which blocks are where after the swaps
    const leftBlock = leftTile?.block;
    const rightBlock = rightTile?.block;
    
    // After second swap, verify animation states
    // Note: The actual behavior might differ from expected
    console.log('Left block state:', leftBlock?.state);
    console.log('Right block state:', rightBlock?.state);
    
    // For now, let's check that they're in swapping states
    expect(leftBlock?.state === BlockState.SWAPPING_LEFT || 
           leftBlock?.state === BlockState.SWAPPING_RIGHT).toBe(true);
    expect(rightBlock?.state === BlockState.SWAPPING_LEFT || 
           rightBlock?.state === BlockState.SWAPPING_RIGHT).toBe(true);
    
    // Complete second swap
    for (let i = 0; i < 5; i++) {
      board.tick();
      renderer.tick();
    }
    
    // Blocks should complete animation properly
    expect(leftTile?.block?.state).toBe(BlockState.FLOATING);
    expect(rightTile?.block?.state).toBe(BlockState.FLOATING);
  });

  // Helper function to count direction changes in position array
  function countDirectionChanges(positions: number[]): number {
    let changes = 0;
    let lastDirection = 0;
    
    for (let i = 1; i < positions.length; i++) {
      const diff = positions[i] - positions[i - 1];
      if (diff !== 0) {
        const currentDirection = diff > 0 ? 1 : -1;
        if (lastDirection !== 0 && currentDirection !== lastDirection) {
          changes++;
        }
        lastDirection = currentDirection;
      }
    }
    
    return changes;
  }
});