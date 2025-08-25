import * as THREE from 'three';
import { AssetLoader } from './assets/AssetLoader';
import { BlockColor, BlockState } from './game/BlockTypes';

class SpriteTest {
  private assetLoader: AssetLoader;
  private container: HTMLElement;

  constructor() {
    this.container = document.getElementById('container') as HTMLElement;
    this.assetLoader = new AssetLoader();
    this.init();
  }

  private async init(): Promise<void> {
    await this.assetLoader.loadGameSprites();
    this.createAllBlockSprites();
  }

  private createAllBlockSprites(): void {
    const spritesheet = this.assetLoader.getTexture('spritesheet');
    if (!spritesheet) {
      console.error('Spritesheet not found!');
      return;
    }

    const TILE_SIZE = 32;
    const SPRITESHEET_WIDTH = 640;
    const SPRITESHEET_HEIGHT = 480;

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
          canvas.width = TILE_SIZE;
          canvas.height = TILE_SIZE;

          const renderer = new THREE.WebGLRenderer({ 
            canvas, 
            alpha: true,
            antialias: false,
            preserveDrawingBuffer: true
          });
          renderer.setSize(TILE_SIZE, TILE_SIZE);
          renderer.setPixelRatio(1);

          const scene = new THREE.Scene();
          const camera = new THREE.OrthographicCamera(-TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2, -TILE_SIZE / 2, 1, 1000);
          camera.position.z = 100;

          const texture = spritesheet.clone();
          texture.needsUpdate = true;
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.NearestFilter;

          const u = uv.x / SPRITESHEET_WIDTH;
          const v = (SPRITESHEET_HEIGHT - stateY - TILE_SIZE) / SPRITESHEET_HEIGHT;
          const width = TILE_SIZE / SPRITESHEET_WIDTH;
          const height = TILE_SIZE / SPRITESHEET_HEIGHT;

          texture.repeat.set(width, height);
          texture.offset.set(u, v);

          const geometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
          const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
          const block = new THREE.Mesh(geometry, material);

          scene.add(block);
          renderer.render(scene, camera);

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
  }
}

new SpriteTest();