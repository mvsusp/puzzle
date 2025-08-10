import * as THREE from 'three';
import { Board } from './Board';

export class Cursor {
  // Position constants
  private static readonly CURSOR_Z_POSITION = 2; // In front of blocks
  private static readonly CURSOR_SIZE = 30;
  
  // Animation constants
  private static readonly PULSE_SPEED = 0.15;
  private static readonly PULSE_SCALE_MIN = 0.9;
  private static readonly PULSE_SCALE_MAX = 1.1;
  private static readonly MOVE_SMOOTHING = 0.3;
  
  // Position state
  public x: number;
  public y: number;
  private targetX: number;
  private targetY: number;
  private currentWorldX: number;
  private currentWorldY: number;
  private targetWorldX: number = 0;
  private targetWorldY: number = 0;
  
  // Visual state
  private mesh!: THREE.Mesh;
  private material!: THREE.MeshLambertMaterial;
  private geometry!: THREE.PlaneGeometry;
  
  // Animation state
  private pulseTimer: number = 0;
  private pulseEnabled: boolean = true;
  
  // Board reference
  private board: Board;
  private tileSize: number;
  private boardPixelWidth: number;
  private boardPixelHeight: number;

  constructor(board: Board, tileSize: number) {
    this.board = board;
    this.tileSize = tileSize;
    this.boardPixelWidth = Board.BOARD_WIDTH * tileSize;
    this.boardPixelHeight = (Board.TOP_ROW + 1) * tileSize;
    
    // Initialize cursor position (center of board)
    this.x = this.board.cursorX;
    this.y = this.board.cursorY;
    this.targetX = this.x;
    this.targetY = this.y;
    
    // Calculate initial world positions
    this.updateWorldPositions();
    this.currentWorldX = this.targetWorldX;
    this.currentWorldY = this.targetWorldY;
    
    // Create cursor visual
    this.createMesh();
  }

  // Create cursor mesh
  private createMesh(): void {
    this.geometry = new THREE.PlaneGeometry(Cursor.CURSOR_SIZE, Cursor.CURSOR_SIZE);
    this.material = new THREE.MeshLambertMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = 'Cursor';
    this.mesh.position.set(
      this.currentWorldX,
      this.currentWorldY,
      Cursor.CURSOR_Z_POSITION
    );
    
    // Add wireframe outline for better visibility
    const wireframeGeometry = new THREE.EdgesGeometry(this.geometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.6
    });
    const wireframeMesh = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
    this.mesh.add(wireframeMesh);
  }

  // Update world positions based on grid coordinates (adjusted for 2-block-wide cursor)
  private updateWorldPositions(): void {
    // Position cursor so it's centered between two blocks
    this.targetWorldX = this.targetX * this.tileSize - (this.boardPixelWidth / 2) + this.tileSize; // One tile offset to center over 2 blocks
    this.targetWorldY = this.targetY * this.tileSize - (this.boardPixelHeight / 2) + (this.tileSize / 2);
  }

  // Move cursor in specified direction
  public move(deltaX: number, deltaY: number): boolean {
    const newX = this.targetX + deltaX;
    const newY = this.targetY + deltaY;
    
    // Apply board boundaries with wrapping
    let finalX = newX;
    let finalY = newY;
    
    // Horizontal wrapping (adjusted for 2-block-wide cursor)
    // Cursor can only be at positions 0-4 since it spans 2 blocks
    const maxCursorX = Board.BOARD_WIDTH - 2; // 6 - 2 = 4 (cursor at 4 spans blocks 4-5)
    
    if (finalX < 0) {
      finalX = maxCursorX; // Wrap to rightmost valid position
    } else if (finalX > maxCursorX) {
      finalX = 0; // Wrap to leftmost position
    }
    
    // Vertical clamping (no wrapping)
    finalY = Math.max(0, Math.min(Board.TOP_ROW, finalY));
    
    // Check if position changed
    if (finalX !== this.targetX || finalY !== this.targetY) {
      this.targetX = finalX;
      this.targetY = finalY;
      this.updateWorldPositions();
      
      // Update board cursor position
      this.board.cursorX = this.targetX;
      this.board.cursorY = this.targetY;
      
      return true;
    }
    
    return false;
  }

  // Set cursor position directly
  public setPosition(x: number, y: number): void {
    // Clamp to valid bounds for 2-block-wide cursor (can only be at positions 0-4)
    const maxCursorX = Board.BOARD_WIDTH - 2; // 6 - 2 = 4 (cursor at 4 spans blocks 4-5)
    this.targetX = Math.max(0, Math.min(maxCursorX, x));
    this.targetY = Math.max(0, Math.min(Board.TOP_ROW, y));
    this.updateWorldPositions();
    
    // Update board cursor position
    this.board.cursorX = this.targetX;
    this.board.cursorY = this.targetY;
  }

  // Get current grid position
  public getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  // Get target grid position
  public getTargetPosition(): { x: number; y: number } {
    return { x: this.targetX, y: this.targetY };
  }

  // Check if cursor can swap at current position
  public canSwap(): boolean {
    // With 2-block cursor, we can always swap since cursor spans 2 blocks
    // and can never be positioned where there isn't a right block
    const maxCursorX = Board.BOARD_WIDTH - 2; // Valid positions are 0-4
    if (this.targetX > maxCursorX) return false; // Should never happen due to clamping
    
    const leftTile = this.board.getTile(this.targetY, this.targetX);
    const rightTile = this.board.getTile(this.targetY, this.targetX + 1);
    
    // Need at least one valid tile (can be empty for swapping with air)
    return leftTile !== null && rightTile !== null;
  }

  // Perform swap operation
  public swap(): boolean {
    if (!this.canSwap()) return false;
    
    const leftTile = this.board.getTile(this.targetY, this.targetX);
    const rightTile = this.board.getTile(this.targetY, this.targetX + 1);
    
    if (!leftTile || !rightTile) return false;
    
    // Swap the tiles by exchanging their contents
    const tempType = leftTile.type;
    const tempBlock = leftTile.block;
    const tempGarbageRef = leftTile.garbageRef;
    const tempChain = leftTile.chain;
    
    leftTile.type = rightTile.type;
    leftTile.block = rightTile.block;
    leftTile.garbageRef = rightTile.garbageRef;
    leftTile.chain = rightTile.chain;
    
    rightTile.type = tempType;
    rightTile.block = tempBlock;
    rightTile.garbageRef = tempGarbageRef;
    rightTile.chain = tempChain;
    
    // Start swap animations for blocks
    if (leftTile.block) {
      leftTile.block.startSwap('right');
    }
    if (rightTile.block) {
      rightTile.block.startSwap('left');
    }
    
    // Set grace period to prevent immediate stack raising
    this.board.graceTimer = 30;
    
    return true;
  }

  // Update cursor state
  public tick(): void {
    this.pulseTimer++;
    
    // Update grid position
    this.x = this.targetX;
    this.y = this.targetY;
    
    // Smooth movement interpolation
    const smoothFactor = Cursor.MOVE_SMOOTHING;
    this.currentWorldX += (this.targetWorldX - this.currentWorldX) * smoothFactor;
    this.currentWorldY += (this.targetWorldY - this.currentWorldY) * smoothFactor;
    
    // Update mesh position
    this.mesh.position.x = this.currentWorldX;
    this.mesh.position.y = this.currentWorldY;
    
    // Update pulsing animation
    if (this.pulseEnabled) {
      const pulseValue = Math.sin(this.pulseTimer * Cursor.PULSE_SPEED);
      const scale = Cursor.PULSE_SCALE_MIN + 
        (Cursor.PULSE_SCALE_MAX - Cursor.PULSE_SCALE_MIN) * 
        (pulseValue * 0.5 + 0.5);
      
      this.mesh.scale.set(scale, scale, 1);
      
      // Pulse opacity as well
      const opacity = 0.6 + 0.3 * (pulseValue * 0.5 + 0.5);
      this.material.opacity = opacity;
    }
  }

  // Enable/disable pulsing animation
  public setPulseEnabled(enabled: boolean): void {
    this.pulseEnabled = enabled;
    
    if (!enabled) {
      this.mesh.scale.set(1, 1, 1);
      this.material.opacity = 0.8;
    }
  }

  // Set cursor color
  public setColor(color: number): void {
    this.material.color.setHex(color);
  }

  // Show/hide cursor
  public setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  // Get cursor mesh for adding to scene
  public getMesh(): THREE.Mesh {
    return this.mesh;
  }

  // Get cursor bounds for collision detection
  public getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.currentWorldX - Cursor.CURSOR_SIZE / 2,
      y: this.currentWorldY - Cursor.CURSOR_SIZE / 2,
      width: Cursor.CURSOR_SIZE,
      height: Cursor.CURSOR_SIZE
    };
  }

  // Convert world position to cursor grid position
  public static worldToGrid(worldX: number, worldY: number, tileSize: number, boardWidth: number, boardHeight: number): { x: number; y: number } {
    const boardPixelWidth = boardWidth * tileSize;
    const boardPixelHeight = boardHeight * tileSize;
    
    const localX = worldX + (boardPixelWidth / 2) - (tileSize / 2);
    const localY = worldY + (boardPixelHeight / 2) - (tileSize / 2);
    
    return {
      x: Math.floor(localX / tileSize),
      y: Math.floor(localY / tileSize)
    };
  }

  // Check if cursor is at specific grid position
  public isAt(x: number, y: number): boolean {
    return this.x === x && this.y === y;
  }

  // Check if cursor is moving
  public isMoving(): boolean {
    const threshold = 0.1;
    return Math.abs(this.currentWorldX - this.targetWorldX) > threshold ||
           Math.abs(this.currentWorldY - this.targetWorldY) > threshold;
  }

  // Reset cursor to center position
  public resetToCenter(): void {
    this.setPosition(Math.floor(Board.BOARD_WIDTH / 2), Math.floor(Board.TOP_ROW / 2));
    this.currentWorldX = this.targetWorldX;
    this.currentWorldY = this.targetWorldY;
  }

  // Get debug information
  public getDebugInfo(): string {
    return `Cursor: (${this.x},${this.y}) Target:(${this.targetX},${this.targetY}) Moving:${this.isMoving()}`;
  }

  // Cleanup resources
  public dispose(): void {
    if (this.geometry) {
      this.geometry.dispose();
    }
    if (this.material) {
      this.material.dispose();
    }
    
    // Remove wireframe
    if (this.mesh.children.length > 0) {
      const wireframe = this.mesh.children[0] as THREE.LineSegments;
      if (wireframe.geometry) wireframe.geometry.dispose();
      if (wireframe.material instanceof THREE.Material) wireframe.material.dispose();
    }
  }
}