import * as THREE from 'three';
import { Board, Tile } from '../game/Board';
import { Block } from '../game/Block';
import { Cursor } from '../game/Cursor';
import { BLOCK_COLORS, BlockColor, TileType, GARBAGE_COLORS, BlockState } from '../game/BlockTypes';
import { GarbageBlock, GarbageBlockState, GarbageBlockType } from '../game/GarbageBlock';
import { AnimationManager } from '../animation/AnimationManager';
import { VisualEffectsManager, MatchEventData, GarbageEventData } from '../effects/VisualEffectsManager';

export class EnhancedBoardRenderer {
  // Rendering constants
  public static readonly TILE_SIZE = 32;
  public static readonly BOARD_PIXEL_WIDTH = Board.BOARD_WIDTH * EnhancedBoardRenderer.TILE_SIZE;
  public static readonly BOARD_PIXEL_HEIGHT = (Board.TOP_ROW + 1) * EnhancedBoardRenderer.TILE_SIZE;
  
  private board: Board;
  private boardGroup: THREE.Group;
  private animationManager: AnimationManager;
  private visualEffectsManager: VisualEffectsManager | null = null;
  private gridMesh: THREE.Mesh | null = null;
  private gridLines: THREE.Line[] = [];
  
  // Block rendering
  private blockGeometry: THREE.PlaneGeometry;
  private blockMaterials: Map<BlockColor, THREE.MeshLambertMaterial> = new Map();
  private blockMeshes: THREE.Mesh[][] = [];
  
  // Garbage block rendering
  private garbageMaterials: Map<string, THREE.MeshLambertMaterial> = new Map();
  
  // Cursor rendering
  private cursorMesh: THREE.LineSegments | null = null;
  private cursorMaterial: THREE.LineBasicMaterial | null = null;
  
  // Visual effects
  private blinkTimer: number = 0;
  
  // Game state tracking for effects
  private lastBoardState = {
    score: 0,
    chainCounter: 1,
    tickMatched: 0,
    tickComboSize: 0,
    panic: false
  };

  constructor(board: Board, cursor?: Cursor) {
    this.board = board;
    this.boardGroup = new THREE.Group();
    this.boardGroup.name = 'EnhancedBoardGroup';
    
    // Initialize animation manager
    this.animationManager = new AnimationManager(board, {
      enableBlockAnimations: true,
      enableStackAnimations: true,
      enableCursorAnimations: true,
      animationSpeed: 1.0
    });
    
    if (cursor) {
      this.animationManager.setCursor(cursor);
    }
    
    // Create reusable block geometry
    this.blockGeometry = new THREE.PlaneGeometry(
      EnhancedBoardRenderer.TILE_SIZE, 
      EnhancedBoardRenderer.TILE_SIZE
    );
    
    // Initialize rendering components
    this.initializeBlockMaterials();
    this.initializeGarbageMaterials();
    this.initializeBlockMeshes();
    this.createGridBackground();
    this.createCursor(cursor);
  }

  // Initialize materials for each block color
  private initializeBlockMaterials(): void {
    Object.entries(BLOCK_COLORS).forEach(([colorKey, colorValue]) => {
      const color = parseInt(colorKey) as BlockColor;
      const material = new THREE.MeshLambertMaterial({
        color: colorValue,
        transparent: true,
        opacity: 1.0,
        emissive: 0x000000,
      });
      this.blockMaterials.set(color, material);
    });
  }

  // Initialize materials for garbage blocks
  private initializeGarbageMaterials(): void {
    Object.entries(GARBAGE_COLORS).forEach(([stateKey, colorValue]) => {
      const material = new THREE.MeshLambertMaterial({
        color: colorValue,
        transparent: true,
        opacity: 1.0,
        emissive: 0x000000,
      });
      this.garbageMaterials.set(stateKey, material);
    });
  }

  // Initialize mesh grid for blocks
  private initializeBlockMeshes(): void {
    this.blockMeshes = [];
    
    for (let row = 0; row < Board.BOARD_HEIGHT; row++) {
      this.blockMeshes[row] = [];
      
      for (let col = 0; col < Board.BOARD_WIDTH; col++) {
        // Create mesh with shared geometry
        const mesh = new THREE.Mesh(this.blockGeometry);
        mesh.position.set(
          col * EnhancedBoardRenderer.TILE_SIZE - (EnhancedBoardRenderer.BOARD_PIXEL_WIDTH / 2) + (EnhancedBoardRenderer.TILE_SIZE / 2),
          row * EnhancedBoardRenderer.TILE_SIZE - (EnhancedBoardRenderer.BOARD_PIXEL_HEIGHT / 2) + (EnhancedBoardRenderer.TILE_SIZE / 2),
          1 // Blocks in front of grid
        );
        mesh.name = `Block_${row}_${col}`;
        mesh.visible = false; // Start hidden
        
        this.blockMeshes[row][col] = mesh;
        this.boardGroup.add(mesh);
      }
    }
  }

  // Create grid background with enhanced visuals
  private createGridBackground(): void {
    const gridGeometry = new THREE.PlaneGeometry(
      EnhancedBoardRenderer.BOARD_PIXEL_WIDTH,
      EnhancedBoardRenderer.BOARD_PIXEL_HEIGHT
    );
    
    const gridMaterial = new THREE.MeshBasicMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.3,
      wireframe: false,
    });
    
    this.gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
    this.gridMesh.name = 'GridBackground';
    this.gridMesh.position.z = 0; // Behind blocks
    
    this.boardGroup.add(this.gridMesh);
    
    // Add enhanced grid lines
    this.createEnhancedGridLines();
  }

  // Create enhanced grid lines with animation support
  private createEnhancedGridLines(): void {
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x444444,
      transparent: true,
      opacity: 0.5,
    });
    
    // Vertical lines
    for (let col = 0; col <= Board.BOARD_WIDTH; col++) {
      const points = [];
      const x = col * EnhancedBoardRenderer.TILE_SIZE - (EnhancedBoardRenderer.BOARD_PIXEL_WIDTH / 2);
      
      points.push(new THREE.Vector3(x, -EnhancedBoardRenderer.BOARD_PIXEL_HEIGHT / 2, 0.1));
      points.push(new THREE.Vector3(x, EnhancedBoardRenderer.BOARD_PIXEL_HEIGHT / 2, 0.1));
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, lineMaterial.clone());
      line.name = `VerticalLine_${col}`;
      this.gridLines.push(line);
      this.boardGroup.add(line);
    }
    
    // Horizontal lines
    for (let row = 0; row <= Board.TOP_ROW + 1; row++) {
      const points = [];
      const y = row * EnhancedBoardRenderer.TILE_SIZE - (EnhancedBoardRenderer.BOARD_PIXEL_HEIGHT / 2);
      
      points.push(new THREE.Vector3(-EnhancedBoardRenderer.BOARD_PIXEL_WIDTH / 2, y, 0.1));
      points.push(new THREE.Vector3(EnhancedBoardRenderer.BOARD_PIXEL_WIDTH / 2, y, 0.1));
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, lineMaterial.clone());
      line.name = `HorizontalLine_${row}`;
      this.gridLines.push(line);
      this.boardGroup.add(line);
    }
  }

  // Create animated cursor (2 blocks wide)
  private createCursor(cursor?: Cursor): void {
    if (!cursor) return;

    // Create a 2-block-wide rectangular cursor outline
    const cursorWidth = EnhancedBoardRenderer.TILE_SIZE * 2; // 2 blocks wide
    const cursorHeight = EnhancedBoardRenderer.TILE_SIZE;
    const borderThickness = 4; // Pixel thickness of cursor border
    
    // Create cursor as a rectangular outline using LineSegments
    const cursorGeometry = new THREE.EdgesGeometry(
      new THREE.PlaneGeometry(cursorWidth, cursorHeight)
    );
    
    this.cursorMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      linewidth: borderThickness,
    });
    
    this.cursorMesh = new THREE.LineSegments(cursorGeometry, this.cursorMaterial);
    this.cursorMesh.name = 'AnimatedCursor';
    this.cursorMesh.position.z = 2; // Above blocks
    
    // Register cursor with animation manager
    if (this.cursorMesh && this.cursorMaterial) {
      this.animationManager.setCursorMesh(this.cursorMesh, this.cursorMaterial);
    }
    
    if (this.cursorMesh) {
      this.boardGroup.add(this.cursorMesh);
    }
  }

  // Set visual effects manager
  public setVisualEffectsManager(effectsManager: VisualEffectsManager): void {
    this.visualEffectsManager = effectsManager;
  }

  // Main render update with enhanced animations
  public tick(): void {
    this.blinkTimer++;
    
    // Update animation manager (handles all animations)
    this.animationManager.tick();
    
    // Update visual effects
    if (this.visualEffectsManager) {
      this.visualEffectsManager.tick();
      this.checkForGameEvents();
    }
    
    // Update block visuals
    this.updateBlockVisuals();
    
    // Handle stack rise animation for grid
    this.updateStackRiseVisuals();
    
    // Update cursor (basic fallback if no animation manager)
    this.updateCursorFallback();
  }

  // Update block visuals with animation integration
  private updateBlockVisuals(): void {
    // Update visible blocks only (rows 0 to TOP_ROW)
    for (let row = 0; row <= Board.TOP_ROW; row++) {
      for (let col = 0; col < Board.BOARD_WIDTH; col++) {
        const tile = this.board.getTile(row, col);
        const mesh = this.blockMeshes[row][col];
        
        if (tile && tile.type === TileType.BLOCK && tile.block) {
          this.updateBlockMesh(mesh, tile.block, tile, row, col);
        } else if (tile && tile.type === TileType.GARBAGE && tile.garbageRef) {
          this.updateGarbageMesh(mesh, tile.garbageRef, tile, row, col);
        } else {
          // Hide mesh if no block
          mesh.visible = false;
          // Unregister from animation manager if previously registered
          if (mesh.userData.registeredBlock) {
            this.animationManager.unregisterBlockMesh(mesh.userData.registeredBlock);
            mesh.userData.registeredBlock = null;
          }
        }
      }
    }
  }

  // Update individual block mesh with animation support
  private updateBlockMesh(mesh: THREE.Mesh, block: Block, tile: Tile, row: number, col: number): void {
    // Show the mesh
    mesh.visible = true;
    
    // Update material based on block color
    const material = this.blockMaterials.get(block.color);
    if (material) {
      mesh.material = material;
      
      // Register with animation manager if not already registered
      if (mesh.userData.registeredBlock !== block) {
        if (mesh.userData.registeredBlock) {
          this.animationManager.unregisterBlockMesh(mesh.userData.registeredBlock);
        }
        this.animationManager.registerBlockMesh(block, mesh, material);
        mesh.userData.registeredBlock = block;
      }
    }
    
    // Reset mesh position to its base grid position
    // (animations will override this as needed)
    const baseX = col * EnhancedBoardRenderer.TILE_SIZE - (EnhancedBoardRenderer.BOARD_PIXEL_WIDTH / 2) + (EnhancedBoardRenderer.TILE_SIZE / 2);
    const baseY = row * EnhancedBoardRenderer.TILE_SIZE - (EnhancedBoardRenderer.BOARD_PIXEL_HEIGHT / 2) + (EnhancedBoardRenderer.TILE_SIZE / 2);
    
    // Only set position if no animation is overriding it
    if (!this.isBlockAnimating(block)) {
      mesh.position.x = baseX;
      mesh.position.y = baseY;
    }
    
    // Apply state-based visual effects (non-animated fallbacks)
    this.applyBlockStateFallbacks(mesh, block, tile);
  }

  // Apply visual effects for blocks not handled by animations
  private applyBlockStateFallbacks(mesh: THREE.Mesh, block: Block, tile: Tile): void {
    const material = mesh.material as THREE.MeshLambertMaterial;
    
    // Only apply fallbacks if not being animated
    if (this.isBlockAnimating(block)) return;
    
    // Reset transform for non-animated blocks
    mesh.scale.set(1, 1, 1);
    mesh.rotation.z = 0;
    material.opacity = 1.0;
    
    // Chain indicator
    if (tile.chain) {
      material.opacity = Math.min(material.opacity + 0.2, 1.0);
    }
    
    // Warning indicator for top rows
    if (mesh.position.y > EnhancedBoardRenderer.BOARD_PIXEL_HEIGHT * 0.7) {
      const warningBlink = Math.sin(this.blinkTimer * 0.5);
      if (warningBlink > 0) {
        material.emissive.setHex(0x440000); // Red warning glow
      } else {
        material.emissive.setHex(0x000000);
      }
    } else {
      material.emissive.setHex(0x000000);
    }
  }

  // Check if block is currently being animated
  private isBlockAnimating(block: Block): boolean {
    const animState = this.animationManager['blockAnimator'].getAnimationState(block);
    return !!(animState?.isFalling || animState?.isSwapping || animState?.isExploding || animState?.isFloating);
  }

  // Update individual garbage mesh
  private updateGarbageMesh(mesh: THREE.Mesh, garbageBlock: GarbageBlock, tile: Tile, row: number, col: number): void {
    // Show the mesh
    mesh.visible = true;
    
    // Determine material based on garbage state
    let materialKey = 'NORMAL';
    if (garbageBlock.type === GarbageBlockType.GRAY) {
      materialKey = 'GRAY';
    }
    if (garbageBlock.state === GarbageBlockState.TRIGGERED) {
      materialKey = 'TRIGGERED';
    } else if (garbageBlock.state === GarbageBlockState.TRANSFORMING) {
      materialKey = 'TRANSFORMING';
    }
    
    const material = this.garbageMaterials.get(materialKey);
    if (material) {
      mesh.material = material;
    }
    
    // Reset mesh position to its base grid position
    const baseX = col * EnhancedBoardRenderer.TILE_SIZE - (EnhancedBoardRenderer.BOARD_PIXEL_WIDTH / 2) + (EnhancedBoardRenderer.TILE_SIZE / 2);
    const baseY = row * EnhancedBoardRenderer.TILE_SIZE - (EnhancedBoardRenderer.BOARD_PIXEL_HEIGHT / 2) + (EnhancedBoardRenderer.TILE_SIZE / 2);
    
    mesh.position.x = baseX;
    mesh.position.y = baseY;
    
    // Apply visual effects based on garbage state
    mesh.scale.set(1, 1, 1);
    mesh.rotation.z = 0;
    
    // Add transformation animation effect
    if (garbageBlock.state === GarbageBlockState.TRANSFORMING) {
      // Pulsing effect during transformation
      const pulse = 1.0 + Math.sin(this.blinkTimer * 0.3) * 0.1;
      mesh.scale.set(pulse, pulse, 1);
    }
    
    // Add triggering flash effect
    if (garbageBlock.state === GarbageBlockState.TRIGGERED) {
      const flash = Math.sin(this.blinkTimer * 0.8) * 0.5 + 0.5;
      if (material) {
        material.emissive.setRGB(flash * 0.2, flash * 0.1, 0);
      }
    } else if (material) {
      material.emissive.setHex(0x000000);
    }
  }

  // Update stack rise visual effects
  private updateStackRiseVisuals(): void {
    // Animate block meshes during stack rise
    this.animationManager.animateBlockMeshesForStackRise(this.blockMeshes);
    
    // Animate grid lines during stack rise (if needed)
    // this.animationManager['stackAnimator'].animateGridLines(this.gridLines);
  }

  // Fallback cursor update if animation manager isn't handling it
  private updateCursorFallback(): void {
    if (!this.cursorMesh || !this.cursorMaterial) return;
    
    // Animation manager handles cursor, this is just a safety fallback
    // The cursor position and effects should be handled by CursorAnimator
  }

  // Check for game events and trigger visual effects
  private checkForGameEvents(): void {
    if (!this.visualEffectsManager) return;

    const currentState = {
      score: this.board.score,
      chainCounter: this.board.getChainCounter(),
      tickMatched: this.board.tickMatched,
      tickComboSize: this.board.tickComboSize,
      panic: this.board.panic
    };

    // Check for match events
    if (currentState.tickMatched > 0) {
      this.triggerMatchEffects(currentState);
    }

    // Check for panic mode changes
    if (currentState.panic !== this.lastBoardState.panic) {
      if (currentState.panic) {
        this.visualEffectsManager.onSpecialEvent('panic_start');
      } else {
        this.visualEffectsManager.onSpecialEvent('panic_end');
      }
    }

    // Check for garbage events
    this.checkForGarbageEvents();

    // Update last state
    this.lastBoardState = { ...currentState };
  }

  // Trigger match-related visual effects
  private triggerMatchEffects(currentState: {
    score: number;
    chainCounter: number;
    tickMatched: number;
    tickComboSize: number;
    panic: boolean;
  }): void {
    if (!this.visualEffectsManager) return;

    // Collect all matched blocks and their positions
    const matchedBlocks: Block[] = [];
    const matchedPositions: THREE.Vector3[] = [];

    // Find currently matched or exploding blocks
    for (let row = 0; row <= Board.TOP_ROW; row++) {
      for (let col = 0; col < Board.BOARD_WIDTH; col++) {
        const tile = this.board.getTile(row, col);
        if (tile && tile.type === TileType.BLOCK && tile.block && 
            (tile.block.state === BlockState.MATCHED || tile.block.state === BlockState.EXPLODING)) {
          matchedBlocks.push(tile.block);
          matchedPositions.push(this.boardToWorldPosition(row, col));
        }
      }
    }

    if (matchedBlocks.length > 0) {
      // Calculate score for this match
      const scoreDifference = currentState.score - this.lastBoardState.score;

      const eventData: MatchEventData = {
        blocks: matchedBlocks,
        positions: matchedPositions,
        isChain: currentState.chainCounter > 1,
        chainLength: currentState.chainCounter > 1 ? currentState.chainCounter : undefined,
        comboSize: currentState.tickComboSize > 1 ? currentState.tickComboSize : undefined,
        score: scoreDifference > 0 ? scoreDifference : 0
      };

      this.visualEffectsManager.onBlockMatch(eventData);
    }
  }

  // Check for garbage block events
  private checkForGarbageEvents(): void {
    if (!this.visualEffectsManager) return;

    // Check for transforming garbage blocks
    const garbageBlocks = (this.board as { garbageBlocks: GarbageBlock[] }).garbageBlocks || [];
    garbageBlocks.forEach((garbage: GarbageBlock) => {
      if (garbage.state === GarbageBlockState.TRANSFORMING && this.visualEffectsManager) {
        const eventData: GarbageEventData = {
          position: this.boardToWorldPosition(garbage.y + garbage.height / 2, garbage.x + garbage.width / 2),
          size: garbage.width * garbage.height,
          type: 'transform'
        };
        this.visualEffectsManager.onGarbageEvent(eventData);
      }
    });
  }

  // Trigger stack rise animation
  public triggerStackRise(onComplete?: () => void): void {
    this.animationManager.startStackRise(onComplete);
  }

  // Trigger swap feedback animation
  public triggerSwapFeedback(): void {
    this.animationManager.triggerSwapFeedback();
  }

  // Set panic mode
  public setPanicMode(enabled: boolean): void {
    this.animationManager.setPanicMode(enabled);
    
    // Additional panic mode visuals
    if (this.gridMesh) {
      const gridMaterial = this.gridMesh.material as THREE.MeshBasicMaterial;
      if (enabled) {
        gridMaterial.color.setHex(0x440000); // Red tint
        gridMaterial.opacity = 0.4;
      } else {
        gridMaterial.color.setHex(0x222222); // Normal color
        gridMaterial.opacity = 0.3;
      }
    }
  }

  // Check if critical animations are playing
  public hasCriticalAnimations(): boolean {
    return this.animationManager.hasCriticalAnimations();
  }

  // Get the board group for adding to scene
  public getBoardGroup(): THREE.Group {
    return this.boardGroup;
  }

  // Get board bounds for positioning
  public getBounds(): { width: number; height: number } {
    return {
      width: EnhancedBoardRenderer.BOARD_PIXEL_WIDTH,
      height: EnhancedBoardRenderer.BOARD_PIXEL_HEIGHT
    };
  }

  // Convert board coordinates to world position (accounting for board group offset)
  public boardToWorldPosition(row: number, col: number): THREE.Vector3 {
    // Calculate position relative to board
    const boardRelativeX = col * EnhancedBoardRenderer.TILE_SIZE - (EnhancedBoardRenderer.BOARD_PIXEL_WIDTH / 2) + (EnhancedBoardRenderer.TILE_SIZE / 2);
    const boardRelativeY = row * EnhancedBoardRenderer.TILE_SIZE - (EnhancedBoardRenderer.BOARD_PIXEL_HEIGHT / 2) + (EnhancedBoardRenderer.TILE_SIZE / 2);
    
    // Add the board group's world position offset
    const worldPosition = this.boardGroup.position.clone();
    worldPosition.x += boardRelativeX;
    worldPosition.y += boardRelativeY;
    worldPosition.z = 1;
    
    return worldPosition;
  }

  // Get animation debug info
  public getAnimationDebugInfo(): string {
    return this.animationManager.getDebugInfo();
  }

  // Clean up resources
  public dispose(): void {
    // Dispose visual effects manager
    if (this.visualEffectsManager) {
      this.visualEffectsManager.dispose();
    }
    
    // Dispose animation manager
    this.animationManager.dispose();
    
    // Dispose of geometries
    this.blockGeometry.dispose();
    if (this.cursorMesh?.geometry) {
      this.cursorMesh.geometry.dispose();
    }
    
    // Dispose of materials
    this.blockMaterials.forEach(material => material.dispose());
    this.blockMaterials.clear();
    
    this.garbageMaterials.forEach(material => material.dispose());
    this.garbageMaterials.clear();
    
    if (this.cursorMaterial) {
      this.cursorMaterial.dispose();
    }
    
    // Remove all children from board group
    while (this.boardGroup.children.length > 0) {
      const child = this.boardGroup.children[0];
      this.boardGroup.remove(child);
      
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      } else if (child instanceof THREE.Line) {
        if (child.geometry) child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    }
    
    // Clear mesh references
    this.blockMeshes = [];
    this.gridLines = [];
  }
}