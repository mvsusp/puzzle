import * as THREE from 'three';
import { Board, Tile } from '../game/Board';
import { Block } from '../game/Block';
import { BLOCK_COLORS, BlockColor, BlockState, TileType } from '../game/BlockTypes';

export class BoardRenderer {
  // Rendering constants
  public static readonly TILE_SIZE = 32;
  public static readonly BOARD_PIXEL_WIDTH = Board.BOARD_WIDTH * BoardRenderer.TILE_SIZE;
  public static readonly BOARD_PIXEL_HEIGHT = (Board.TOP_ROW + 1) * BoardRenderer.TILE_SIZE;
  
  // Animation constants
  public static readonly CURSOR_ANIM_TICKS = 30;
  public static readonly BLINK_TIME = 45;
  
  private board: Board;
  private boardGroup: THREE.Group;
  private gridMesh: THREE.Mesh | null = null;
  
  // Block rendering
  private blockGeometry: THREE.PlaneGeometry;
  private blockMaterials: Map<BlockColor, THREE.MeshLambertMaterial> = new Map();
  private blockMeshes: THREE.Mesh[][] = [];
  
  // Visual effects
  private blinkTimer: number = 0;
  
  constructor(board: Board) {
    this.board = board;
    this.boardGroup = new THREE.Group();
    this.boardGroup.name = 'BoardGroup';
    
    // Create reusable block geometry
    this.blockGeometry = new THREE.PlaneGeometry(BoardRenderer.TILE_SIZE, BoardRenderer.TILE_SIZE);
    
    // Initialize block materials
    this.initializeBlockMaterials();
    
    // Initialize block meshes grid
    this.initializeBlockMeshes();
    
    // Create grid background
    this.createGridBackground();
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
  
  // Initialize mesh grid for blocks
  private initializeBlockMeshes(): void {
    this.blockMeshes = [];
    
    for (let row = 0; row < Board.BOARD_HEIGHT; row++) {
      this.blockMeshes[row] = [];
      
      for (let col = 0; col < Board.BOARD_WIDTH; col++) {
        // Create mesh but don't assign material yet
        const mesh = new THREE.Mesh(this.blockGeometry);
        mesh.position.set(
          col * BoardRenderer.TILE_SIZE - (BoardRenderer.BOARD_PIXEL_WIDTH / 2) + (BoardRenderer.TILE_SIZE / 2),
          row * BoardRenderer.TILE_SIZE - (BoardRenderer.BOARD_PIXEL_HEIGHT / 2) + (BoardRenderer.TILE_SIZE / 2),
          1 // Blocks in front of grid
        );
        mesh.name = `Block_${row}_${col}`;
        mesh.visible = false; // Start hidden
        
        this.blockMeshes[row][col] = mesh;
        this.boardGroup.add(mesh);
      }
    }
  }
  
  // Create grid background
  private createGridBackground(): void {
    const gridGeometry = new THREE.PlaneGeometry(
      BoardRenderer.BOARD_PIXEL_WIDTH,
      BoardRenderer.BOARD_PIXEL_HEIGHT
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
    
    // Add grid lines
    this.createGridLines();
  }
  
  // Create grid lines for visual clarity
  private createGridLines(): void {
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x444444,
      transparent: true,
      opacity: 0.5,
    });
    
    // Vertical lines
    for (let col = 0; col <= Board.BOARD_WIDTH; col++) {
      const points = [];
      const x = col * BoardRenderer.TILE_SIZE - (BoardRenderer.BOARD_PIXEL_WIDTH / 2);
      
      points.push(new THREE.Vector3(x, -BoardRenderer.BOARD_PIXEL_HEIGHT / 2, 0.1));
      points.push(new THREE.Vector3(x, BoardRenderer.BOARD_PIXEL_HEIGHT / 2, 0.1));
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, lineMaterial);
      line.name = `VerticalLine_${col}`;
      this.boardGroup.add(line);
    }
    
    // Horizontal lines
    for (let row = 0; row <= Board.TOP_ROW + 1; row++) {
      const points = [];
      const y = row * BoardRenderer.TILE_SIZE - (BoardRenderer.BOARD_PIXEL_HEIGHT / 2);
      
      points.push(new THREE.Vector3(-BoardRenderer.BOARD_PIXEL_WIDTH / 2, y, 0.1));
      points.push(new THREE.Vector3(BoardRenderer.BOARD_PIXEL_WIDTH / 2, y, 0.1));
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, lineMaterial);
      line.name = `HorizontalLine_${row}`;
      this.boardGroup.add(line);
    }
  }
  
  // Main render update
  public tick(): void {
    this.blinkTimer++;
    this.updateBlockVisuals();
  }
  
  // Update block visuals based on board state
  private updateBlockVisuals(): void {
    // Update visible blocks only (rows 0 to TOP_ROW)
    for (let row = 0; row <= Board.TOP_ROW; row++) {
      for (let col = 0; col < Board.BOARD_WIDTH; col++) {
        const tile = this.board.getTile(row, col);
        const mesh = this.blockMeshes[row][col];
        
        if (tile && tile.type === TileType.BLOCK && tile.block) {
          this.updateBlockMesh(mesh, tile.block, tile);
        } else {
          // Hide mesh if no block
          mesh.visible = false;
        }
      }
    }
  }
  
  // Update individual block mesh
  private updateBlockMesh(mesh: THREE.Mesh, block: Block, tile: Tile): void {
    // Show the mesh
    mesh.visible = true;
    
    // Update material based on block color
    const material = this.blockMaterials.get(block.color);
    if (material) {
      mesh.material = material;
    }
    
    // Update visual effects based on block state
    this.applyBlockStateEffects(mesh, block, tile);
  }
  
  // Apply visual effects based on block state
  private applyBlockStateEffects(mesh: THREE.Mesh, block: Block, tile: Tile): void {
    const material = mesh.material as THREE.MeshLambertMaterial;
    
    // Reset transform
    mesh.scale.set(1, 1, 1);
    mesh.rotation.z = 0;
    
    switch (block.state) {
      case BlockState.NORMAL:
        material.opacity = 1.0;
        break;
        
      case BlockState.FLOATING: {
        // Subtle bobbing animation
        const bobOffset = Math.sin(this.blinkTimer * 0.3) * 2;
        mesh.position.y += bobOffset;
        material.opacity = 0.9;
        break;
      }
        
      case BlockState.MATCHED: {
        // Blinking effect
        const blinkIntensity = Math.sin(this.blinkTimer * 0.8);
        material.opacity = 0.5 + (blinkIntensity * 0.5);
        break;
      }
        
      case BlockState.EXPLODING:
        // Scale and fade based on explosion progress
        if (block.explosionTicks > 0) {
          const progress = block.explosionTimer / block.explosionTicks;
          const scale = 1 + (progress * 0.5); // Grow slightly
          mesh.scale.set(scale, scale, 1);
          material.opacity = 1 - progress; // Fade out
          
          // Rotate during explosion
          mesh.rotation.z = progress * Math.PI * 2;
        }
        break;
        
      case BlockState.SWAPPING_LEFT:
        // Slide animation (will be enhanced in Phase 6)
        mesh.position.x -= 2;
        break;
        
      case BlockState.SWAPPING_RIGHT:
        // Slide animation (will be enhanced in Phase 6)
        mesh.position.x += 2;
        break;
        
      default:
        material.opacity = 1.0;
        break;
    }
    
    // Chain indicator
    if (tile.chain) {
      // Add slight glow effect
      material.opacity = Math.min(material.opacity + 0.2, 1.0);
    }
    
    // Warning indicator for top rows
    if (mesh.position.y > BoardRenderer.BOARD_PIXEL_HEIGHT * 0.7) {
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
  
  // Get the board group for adding to scene
  public getBoardGroup(): THREE.Group {
    return this.boardGroup;
  }
  
  // Get board bounds for positioning
  public getBounds(): { width: number; height: number } {
    return {
      width: BoardRenderer.BOARD_PIXEL_WIDTH,
      height: BoardRenderer.BOARD_PIXEL_HEIGHT
    };
  }
  
  // Convert board coordinates to world position
  public boardToWorldPosition(row: number, col: number): THREE.Vector3 {
    return new THREE.Vector3(
      col * BoardRenderer.TILE_SIZE - (BoardRenderer.BOARD_PIXEL_WIDTH / 2) + (BoardRenderer.TILE_SIZE / 2),
      row * BoardRenderer.TILE_SIZE - (BoardRenderer.BOARD_PIXEL_HEIGHT / 2) + (BoardRenderer.TILE_SIZE / 2),
      1
    );
  }
  
  // Convert world position to board coordinates
  public worldToBoardPosition(worldPos: THREE.Vector3): { row: number; col: number } {
    const localX = worldPos.x + (BoardRenderer.BOARD_PIXEL_WIDTH / 2) - (BoardRenderer.TILE_SIZE / 2);
    const localY = worldPos.y + (BoardRenderer.BOARD_PIXEL_HEIGHT / 2) - (BoardRenderer.TILE_SIZE / 2);
    
    return {
      row: Math.floor(localY / BoardRenderer.TILE_SIZE),
      col: Math.floor(localX / BoardRenderer.TILE_SIZE)
    };
  }
  
  // Clean up resources
  public dispose(): void {
    // Dispose of geometries
    this.blockGeometry.dispose();
    
    // Dispose of materials
    this.blockMaterials.forEach(material => material.dispose());
    this.blockMaterials.clear();
    
    // Remove all children from board group
    while (this.boardGroup.children.length > 0) {
      const child = this.boardGroup.children[0];
      this.boardGroup.remove(child);
      
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    }
    
    // Clear mesh references
    this.blockMeshes = [];
  }
  
  // Debug: highlight specific tile
  public highlightTile(row: number, col: number, color: number = 0xff0000): void {
    if (row >= 0 && row < Board.BOARD_HEIGHT && col >= 0 && col < Board.BOARD_WIDTH) {
      const mesh = this.blockMeshes[row][col];
      const material = mesh.material as THREE.MeshLambertMaterial;
      material.emissive.setHex(color);
    }
  }
  
  // Debug: clear all highlights
  public clearHighlights(): void {
    for (let row = 0; row < Board.BOARD_HEIGHT; row++) {
      for (let col = 0; col < Board.BOARD_WIDTH; col++) {
        const mesh = this.blockMeshes[row][col];
        const material = mesh.material as THREE.MeshLambertMaterial;
        material.emissive.setHex(0x000000);
      }
    }
  }
}