import * as THREE from 'three';
import { Board } from '../game/Board';
import { BoardRenderer } from './BoardRenderer';
import { Cursor } from '../game/Cursor';

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private gameContainer: THREE.Group;
  private uiContainer: THREE.Group;
  
  // Scene dimensions (game world units)
  private readonly WORLD_WIDTH = 800;
  private readonly WORLD_HEIGHT = 600;
  
  // Game board
  private board: Board | null = null;
  private boardRenderer: BoardRenderer | null = null;
  
  // Game cursor
  private cursor: Cursor | null = null;
  
  // Test sprite for Phase 1 (remove in Phase 2)
  private testSprite: THREE.Mesh | null = null;
  private testSpriteRotation = 0;
  
  constructor() {
    this.scene = new THREE.Scene();
    
    // Create orthographic camera for pixel-perfect 2D rendering
    const aspect = this.WORLD_WIDTH / this.WORLD_HEIGHT;
    const frustumSize = this.WORLD_HEIGHT;
    
    this.camera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2, // left
      (frustumSize * aspect) / 2,  // right
      frustumSize / 2,             // top
      frustumSize / -2,            // bottom
      -1000,                       // near
      1000                         // far
    );
    
    this.camera.position.set(0, 0, 100);
    
    // Create container groups for organization
    this.gameContainer = new THREE.Group();
    this.gameContainer.name = 'GameContainer';
    this.scene.add(this.gameContainer);
    
    this.uiContainer = new THREE.Group();
    this.uiContainer.name = 'UIContainer';
    this.uiContainer.position.z = 10; // UI in front of game
    this.scene.add(this.uiContainer);
  }
  
  public initialize(): void {
    this.setupLighting();
    this.initializeGameBoard();
    
    // Keep test sprite for now, will be removed when board is fully functional
    this.createTestSprite();
    
    console.log('SceneManager initialized with game board');
  }
  
  private setupLighting(): void {
    // Ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    ambientLight.name = 'AmbientLight';
    this.scene.add(ambientLight);
    
    // Directional light for depth
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(100, 100, 100);
    directionalLight.name = 'DirectionalLight';
    this.scene.add(directionalLight);
  }
  
  private createTestSprite(): void {
    // Create a simple test sprite to verify rendering
    const geometry = new THREE.PlaneGeometry(64, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff6b6b,
      transparent: true,
      opacity: 0.8,
    });
    
    this.testSprite = new THREE.Mesh(geometry, material);
    this.testSprite.name = 'TestSprite';
    this.testSprite.position.set(0, 0, 0);
    
    this.gameContainer.add(this.testSprite);
  }
  
  // Initialize game board and renderer
  private initializeGameBoard(): void {
    // Create game board
    this.board = new Board();
    
    // Create board renderer
    this.boardRenderer = new BoardRenderer(this.board);
    
    // Position board in the center-left of the screen
    const boardGroup = this.boardRenderer.getBoardGroup();
    boardGroup.position.set(-100, 0, 0); // Offset left to leave room for UI
    boardGroup.name = 'GameBoard';
    
    // Add board to game container
    this.gameContainer.add(boardGroup);
  }

  public tick(): void {
    // Update game board
    if (this.board && this.boardRenderer) {
      this.board.tick();
      this.boardRenderer.tick();
    }
    
    // Update cursor
    if (this.cursor) {
      this.cursor.tick();
    }
    
    // Animate test sprite for visual confirmation (Phase 1 compatibility)
    if (this.testSprite) {
      this.testSpriteRotation += 0.02;
      this.testSprite.rotation.z = this.testSpriteRotation;
      
      // Move test sprite to the right to avoid overlap with board
      this.testSprite.position.x = 200 + Math.sin(this.testSpriteRotation) * 50;
      this.testSprite.position.y = Math.sin(this.testSpriteRotation * 2) * 20;
    }
  }
  
  public render(renderer: THREE.WebGLRenderer, _alpha: number): void {
    // Render the main scene
    renderer.render(this.scene, this.camera);
  }
  
  public handleResize(width: number, height: number): void {
    const aspect = width / height;
    const frustumSize = this.WORLD_HEIGHT;
    
    this.camera.left = (frustumSize * aspect) / -2;
    this.camera.right = (frustumSize * aspect) / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = frustumSize / -2;
    
    this.camera.updateProjectionMatrix();
    
    console.log(`Scene resized to ${width}x${height}`);
  }
  
  // Getters for accessing scene components
  public getScene(): THREE.Scene {
    return this.scene;
  }
  
  public getCamera(): THREE.OrthographicCamera {
    return this.camera;
  }
  
  public getGameContainer(): THREE.Group {
    return this.gameContainer;
  }
  
  public getUIContainer(): THREE.Group {
    return this.uiContainer;
  }
  
  // Get game board for external access
  public getBoard(): Board | null {
    return this.board;
  }
  
  // Get board renderer for external access
  public getBoardRenderer(): BoardRenderer | null {
    return this.boardRenderer;
  }
  
  // Add cursor to the scene
  public setCursor(cursor: Cursor): void {
    // Remove existing cursor if any
    if (this.cursor) {
      this.gameContainer.remove(this.cursor.getMesh());
      this.cursor.dispose();
    }
    
    this.cursor = cursor;
    
    if (cursor) {
      // Add cursor mesh to game container
      this.gameContainer.add(cursor.getMesh());
    }
  }
  
  // Get cursor for external access
  public getCursor(): Cursor | null {
    return this.cursor;
  }

  // Method to remove test sprite when moving to Phase 3
  public removeTestSprite(): void {
    if (this.testSprite) {
      this.gameContainer.remove(this.testSprite);
      this.testSprite.geometry.dispose();
      if (this.testSprite.material instanceof THREE.Material) {
        this.testSprite.material.dispose();
      }
      this.testSprite = null;
    }
  }
  
  // Clean up resources
  public dispose(): void {
    // Clean up cursor
    if (this.cursor) {
      this.cursor.dispose();
      this.cursor = null;
    }
    
    // Clean up board renderer
    if (this.boardRenderer) {
      this.boardRenderer.dispose();
      this.boardRenderer = null;
    }
    
    // Clean up test sprite
    this.removeTestSprite();
    
    // Clean up scene
    while (this.scene.children.length > 0) {
      const child = this.scene.children[0];
      this.scene.remove(child);
    }
  }
}