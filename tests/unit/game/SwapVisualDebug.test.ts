import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from '../../../src/game/Board';
import { Cursor } from '../../../src/game/Cursor';
import { Block } from '../../../src/game/Block';
import { BlockColor, BlockState, TileType } from '../../../src/game/BlockTypes';
import { EnhancedBoardRenderer } from '../../../src/rendering/EnhancedBoardRenderer';
import { AssetLoader } from '../../../src/assets/AssetLoader';
import * as THREE from 'three';

describe('Swap Visual Debug', () => {
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
    
    // Place two blocks to swap with distinct colors
    const leftTile = board.getTile(5, 2);
    const rightTile = board.getTile(5, 3);
    
    if (leftTile) {
      leftTile.type = TileType.BLOCK;
      leftTile.block = new Block(BlockColor.RED);
      (leftTile.block as any).debugId = 'RED_BLOCK';
    }
    
    if (rightTile) {
      rightTile.type = TileType.BLOCK;
      rightTile.block = new Block(BlockColor.CYAN);
      (rightTile.block as any).debugId = 'CYAN_BLOCK';
    }
    
    // Position cursor at the blocks
    cursor.setPosition(2, 5);
  });

  it('should track mesh positions and block associations during first swap', () => {
    const leftTile = board.getTile(5, 2);
    const rightTile = board.getTile(5, 3);
    
    const originalLeftBlock = leftTile?.block;
    const originalRightBlock = rightTile?.block;
    
    // Get mesh references
    const meshes = renderer['blockMeshes'];
    const leftMesh = meshes[5][2];
    const rightMesh = meshes[5][3];
    
    // Track detailed state changes
    const debugLog: any[] = [];
    
    // Pre-swap state
    debugLog.push({
      tick: 0,
      phase: 'pre-swap',
      leftTileBlock: (leftTile?.block as any)?.debugId,
      rightTileBlock: (rightTile?.block as any)?.debugId,
      leftMeshPos: { x: leftMesh.position.x, y: leftMesh.position.y },
      rightMeshPos: { x: rightMesh.position.x, y: rightMesh.position.y },
      leftMeshUserData: (leftMesh.userData.registeredBlock as any)?.debugId,
      rightMeshUserData: (rightMesh.userData.registeredBlock as any)?.debugId
    });
    
    // Perform swap
    const swapResult = cursor.swap();
    expect(swapResult).toBe(true);
    
    // Immediate post-swap state (before any ticks)
    debugLog.push({
      tick: 0,
      phase: 'post-swap-immediate',
      leftTileBlock: (leftTile?.block as any)?.debugId,
      rightTileBlock: (rightTile?.block as any)?.debugId,
      leftBlockState: originalLeftBlock?.state,
      rightBlockState: originalRightBlock?.state,
      leftMeshPos: { x: leftMesh.position.x, y: leftMesh.position.y },
      rightMeshPos: { x: rightMesh.position.x, y: rightMesh.position.y },
      leftMeshUserData: (leftMesh.userData.registeredBlock as any)?.debugId,
      rightMeshUserData: (rightMesh.userData.registeredBlock as any)?.debugId
    });
    
    // Simulate animation ticks
    for (let i = 1; i <= 5; i++) {
      board.tick();
      renderer.tick();
      
      // Get current mesh positions after update
      const currentLeftMesh = meshes[5][2];
      const currentRightMesh = meshes[5][3];
      
      debugLog.push({
        tick: i,
        phase: 'animating',
        leftTileBlock: (leftTile?.block as any)?.debugId,
        rightTileBlock: (rightTile?.block as any)?.debugId,
        leftBlockState: originalLeftBlock?.state,
        rightBlockState: originalRightBlock?.state,
        leftMeshPos: { x: currentLeftMesh.position.x, y: currentLeftMesh.position.y },
        rightMeshPos: { x: currentRightMesh.position.x, y: currentRightMesh.position.y },
        leftMeshUserData: (currentLeftMesh.userData.registeredBlock as any)?.debugId,
        rightMeshUserData: (currentRightMesh.userData.registeredBlock as any)?.debugId,
        leftMeshVisible: currentLeftMesh.visible,
        rightMeshVisible: currentRightMesh.visible
      });
    }
    
    // Print debug log for analysis
    console.log('\n=== FIRST SWAP DEBUG LOG ===');
    debugLog.forEach(entry => {
      console.log(JSON.stringify(entry, null, 2));
    });
    
    // Verify expected behavior
    // After swap, tiles should have swapped blocks
    expect((leftTile?.block as any)?.debugId).toBe('CYAN_BLOCK');
    expect((rightTile?.block as any)?.debugId).toBe('RED_BLOCK');
    
    // Original blocks should have correct animation states
    expect(originalLeftBlock?.state).toBe(BlockState.FLOATING); // After animation completes
    expect(originalRightBlock?.state).toBe(BlockState.FLOATING);
    
    // Check for position anomalies
    const positionChanges = analyzePositionChanges(debugLog);
    console.log('\n=== POSITION ANALYSIS ===');
    console.log('Left mesh movement:', positionChanges.leftMesh);
    console.log('Right mesh movement:', positionChanges.rightMesh);
    
    // Log results for investigation
    if (positionChanges.leftMesh.totalMovement === 0) {
      console.log('⚠️ WARNING: Left mesh did not move!');
    }
    if (positionChanges.rightMesh.totalMovement === 0) {
      console.log('⚠️ WARNING: Right mesh did not move!');
    }
  });

  it('should compare first swap vs second swap behavior', () => {
    const meshes = renderer['blockMeshes'];
    const firstSwapLog: any[] = [];
    const secondSwapLog: any[] = [];
    
    // First swap
    console.log('\n=== FIRST SWAP ===');
    performSwapWithLogging(board, cursor, renderer, meshes, firstSwapLog, 'first');
    
    // Wait for blocks to settle
    for (let i = 0; i < 15; i++) {
      board.tick();
      renderer.tick();
    }
    
    // Second swap
    console.log('\n=== SECOND SWAP ===');
    performSwapWithLogging(board, cursor, renderer, meshes, secondSwapLog, 'second');
    
    // Analyze swaps
    console.log('\n=== BEHAVIOR COMPARISON ===');
    const firstAnalysis = analyzeSwapBehavior(firstSwapLog);
    const secondAnalysis = analyzeSwapBehavior(secondSwapLog);

    console.log('First swap:', firstAnalysis);
    console.log('Second swap:', secondAnalysis);

    // Ensure the second swap behaves correctly
    expect(secondAnalysis.meshesSwapped).toBe(true);
  });

  function performSwapWithLogging(
    board: Board,
    cursor: Cursor,
    renderer: EnhancedBoardRenderer,
    meshes: any,
    log: any[],
    swapId: string
  ) {
    const leftTile = board.getTile(5, 2);
    const rightTile = board.getTile(5, 3);
    
    // Pre-swap
    log.push({
      swapId,
      tick: 0,
      phase: 'pre-swap',
      leftMeshX: meshes[5][2].position.x,
      rightMeshX: meshes[5][3].position.x,
      leftBlockId: (leftTile?.block as any)?.debugId,
      rightBlockId: (rightTile?.block as any)?.debugId
    });
    
    // Perform swap
    cursor.swap();
    
    // Animate
    for (let i = 1; i <= 5; i++) {
      board.tick();
      renderer.tick();
      
      log.push({
        swapId,
        tick: i,
        phase: 'animating',
        leftMeshX: meshes[5][2].position.x,
        rightMeshX: meshes[5][3].position.x,
        leftBlockState: leftTile?.block?.state,
        rightBlockState: rightTile?.block?.state
      });
    }
  }

  function analyzePositionChanges(log: any[]) {
    const leftPositions = log.map(entry => entry.leftMeshPos?.x || 0);
    const rightPositions = log.map(entry => entry.rightMeshPos?.x || 0);
    
    return {
      leftMesh: {
        start: leftPositions[0],
        end: leftPositions[leftPositions.length - 1],
        totalMovement: leftPositions[leftPositions.length - 1] - leftPositions[0],
        changes: leftPositions.map((pos, i) => i === 0 ? 0 : pos - leftPositions[i - 1])
      },
      rightMesh: {
        start: rightPositions[0],
        end: rightPositions[rightPositions.length - 1],
        totalMovement: rightPositions[rightPositions.length - 1] - rightPositions[0],
        changes: rightPositions.map((pos, i) => i === 0 ? 0 : pos - rightPositions[i - 1])
      }
    };
  }

  function analyzeSwapBehavior(log: any[]) {
    const preSwap = log.find(e => e.phase === 'pre-swap');
    const postSwap = log[log.length - 1];
    const anomalies: string[] = [];
    
    // Check if meshes actually swapped positions
    const leftMoved = postSwap.leftMeshX - preSwap.leftMeshX;
    const rightMoved = postSwap.rightMeshX - preSwap.rightMeshX;
    
    // Check for unexpected movements
    if (Math.abs(leftMoved) < 10) {
      anomalies.push('Left mesh barely moved');
    }
    if (Math.abs(rightMoved) < 10) {
      anomalies.push('Right mesh barely moved');
    }
    if (Math.sign(leftMoved) === Math.sign(rightMoved) && leftMoved !== 0) {
      anomalies.push('Both meshes moved in same direction');
    }
    
    // Check for double movements
    const movements = log.filter(e => e.phase === 'animating')
      .map((e, i, arr) => i === 0 ? 0 : e.leftMeshX - arr[i - 1].leftMeshX);
    const directionChanges = movements.filter((m, i, arr) => 
      i > 0 && Math.sign(m) !== Math.sign(arr[i - 1]) && m !== 0 && arr[i - 1] !== 0
    ).length;
    
    if (directionChanges > 0) {
      anomalies.push(`Direction changed ${directionChanges} times`);
    }
    
    return {
      meshesSwapped: Math.sign(leftMoved) !== Math.sign(rightMoved),
      leftMovement: leftMoved,
      rightMovement: rightMoved,
      anomalies
    };
  }
});