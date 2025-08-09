import { GameEngine } from './core/GameEngine';

class Application {
  private gameEngine: GameEngine | null = null;
  
  constructor() {
    this.initialize();
  }
  
  private async initialize(): Promise<void> {
    try {
      // Get canvas element
      const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
      if (!canvas) {
        throw new Error('Canvas element not found');
      }
      
      // Create and initialize game engine
      this.gameEngine = new GameEngine(canvas);
      
      // Initialize and start the engine
      await this.gameEngine.initialize();
      this.gameEngine.start();
      
      console.log('Panel Pop application started successfully');
      
      // Set up global error handlers
      this.setupErrorHandlers();
      
    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.showError('Failed to start the game. Please refresh the page and try again.');
    }
  }
  
  private setupErrorHandlers(): void {
    // Handle unhandled errors
    window.addEventListener('error', (event) => {
      console.error('Unhandled error:', event.error);
      this.showError('An unexpected error occurred. Please refresh the page.');
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.showError('An unexpected error occurred. Please refresh the page.');
    });
  }
  
  private showError(message: string): void {
    // Hide loading screen
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }
    
    // Show error message
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #ff4444;
      color: white;
      padding: 20px;
      border-radius: 10px;
      font-family: monospace;
      text-align: center;
      z-index: 1000;
      max-width: 400px;
    `;
    errorDiv.innerHTML = `
      <h3>Error</h3>
      <p>${message}</p>
      <button onclick="location.reload()" style="
        margin-top: 10px;
        padding: 10px 20px;
        background: white;
        color: #ff4444;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-family: monospace;
      ">Reload Game</button>
    `;
    
    document.body.appendChild(errorDiv);
  }
}

// Start the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new Application();
});

// For debugging in development
if (import.meta.env?.DEV) {
  (window as unknown as Record<string, unknown>).app = Application;
}