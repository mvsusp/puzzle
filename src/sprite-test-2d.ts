import { BlockColor, BlockState } from './game/BlockTypes';

class SpriteTest2D {
  private container: HTMLElement;
  private spritesheet: HTMLImageElement;

  constructor() {
    this.container = document.getElementById('container') as HTMLElement;
    this.spritesheet = new Image();
    this.init();
  }

  private async init(): Promise<void> {
    await this.loadSpritesheet();
    this.createAllBlockSprites();
  }

  private loadSpritesheet(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.spritesheet.onload = () => resolve();
      this.spritesheet.onerror = reject;
      this.spritesheet.src = '/assets/sprites/sprites.png';
    });
  }

  private createAllBlockSprites(): void {
    const TILE_SIZE = 32;
    const SCALE = 2; // Scale up for better visibility

    const uvs: Record<string, { x: number; y: number }> = {
      purple: { x: 96, y: 0 },
      yellow: { x: 0, y: 0 },
      red: { x: 128, y: 0 },
      cyan: { x: 64, y: 0 },
      green: { x: 32, y: 0 },
    };

    const states: Record<string, { y: number }> = {
      normal: { y: 0 },
      landed: { y: 128 },
      exploding: { y: 160 },
    };

    for (const [colorName] of Object.entries(BlockColor).filter(([k]) => isNaN(Number(k)))) {
      for (const [stateName] of Object.entries(BlockState).filter(([k]) => isNaN(Number(k)))) {
        const uv = uvs[colorName.toLowerCase()];
        const stateY = states[stateName.toLowerCase()]?.y;

        if (uv && stateY !== undefined) {
          const canvas = document.createElement('canvas');
          canvas.width = TILE_SIZE * SCALE;
          canvas.height = TILE_SIZE * SCALE;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          // Disable image smoothing for crisp pixel art
          ctx.imageSmoothingEnabled = false;

          // Draw sprite from spritesheet
          ctx.drawImage(
            this.spritesheet,
            uv.x,           // source x
            stateY,         // source y
            TILE_SIZE,      // source width
            TILE_SIZE,      // source height
            0,              // dest x
            0,              // dest y
            TILE_SIZE * SCALE,  // dest width (scaled)
            TILE_SIZE * SCALE   // dest height (scaled)
          );

          const spriteContainer = document.createElement('div');
          spriteContainer.className = 'sprite-container';

          const description = document.createElement('p');
          description.textContent = `${colorName} - ${stateName}`;

          spriteContainer.appendChild(canvas);
          spriteContainer.appendChild(description);
          this.container.appendChild(spriteContainer);
        }
      }
    }

    // Add comparison with original at 1:1 scale
    this.addOriginalComparison();
  }

  private addOriginalComparison(): void {
    const comparisonDiv = document.createElement('div');
    comparisonDiv.style.cssText = 'width: 100%; margin-top: 40px; border-top: 2px solid #666; padding-top: 20px;';
    
    const title = document.createElement('h2');
    title.textContent = 'Original Sprites (1:1 scale)';
    title.style.cssText = 'width: 100%; text-align: center; color: white;';
    comparisonDiv.appendChild(title);
    
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    canvas.style.cssText = 'display: block; margin: 20px auto; image-rendering: pixelated; image-rendering: crisp-edges;';
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.spritesheet, 0, 0);
    }
    
    comparisonDiv.appendChild(canvas);
    this.container.appendChild(comparisonDiv);
  }
}

new SpriteTest2D();