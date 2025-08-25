import { test } from '@playwright/test';

test.describe('Visual Sprite Rendering Test', () => {
  test('create corrected sprite test and compare visually', async ({ page }) => {
    // First take screenshot of current broken sprites
    await page.goto('/sprite-test.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ 
      path: `test-artifacts/sprites-BEFORE-fix-${timestamp}.png`,
      fullPage: true 
    });

    // Now inject corrected coordinates directly into the page
    await page.evaluate(() => {
      // Create a corrected version by modifying the test
      const container = document.getElementById('container') as HTMLElement;
      container.innerHTML = '<h2 style="color: white; width: 100%;">CORRECTED SPRITES (640px width)</h2>';

      const TILE_SIZE = 32;
      const SPRITESHEET_WIDTH = 640;  // CORRECTED from 620
      const SPRITESHEET_HEIGHT = 480;

      const uvs = {
        purple: { x: 96, y: 0 },
        yellow: { x: 0, y: 0 },
        red: { x: 128, y: 0 },
        cyan: { x: 64, y: 0 },
        green: { x: 32, y: 0 },
      };

      const states = {
        normal: { y: 0 },
        landed: { y: 128 },
        exploding: { y: 160 },
      };

      // Get the spritesheet texture
      const img = new Image();
      img.onload = () => {
        Object.entries(uvs).forEach(([colorName, colorPos]) => {
          Object.entries(states).forEach(([stateName, statePos]) => {
            const canvas = document.createElement('canvas');
            canvas.width = TILE_SIZE * 2; // Make bigger for visibility
            canvas.height = TILE_SIZE * 2;
            
            const ctx = canvas.getContext('2d')!;
            ctx.imageSmoothingEnabled = false; // Keep pixels crisp

            // Extract the sprite from the correct location
            const sx = colorPos.x;
            const sy = statePos.y;
            
            // Draw sprite scaled 2x for visibility
            ctx.drawImage(img, sx, sy, TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE * 2, TILE_SIZE * 2);

            const spriteContainer = document.createElement('div');
            spriteContainer.className = 'sprite-container';
            spriteContainer.style.display = 'inline-block';
            spriteContainer.style.margin = '10px';
            spriteContainer.style.textAlign = 'center';

            const description = document.createElement('p');
            description.textContent = `${colorName} - ${stateName}`;
            description.style.color = 'white';
            description.style.margin = '5px';

            spriteContainer.appendChild(canvas);
            spriteContainer.appendChild(description);
            container.appendChild(spriteContainer);
          });
        });
      };
      img.src = '/assets/sprites/sprites.png';
    });

    // Wait for corrected sprites to render
    await page.waitForTimeout(2000);

    // Take screenshot of corrected sprites
    await page.screenshot({ 
      path: `test-artifacts/sprites-AFTER-fix-${timestamp}.png`,
      fullPage: true 
    });

    console.log(`Screenshots saved:`);
    console.log(`  Before fix: test-artifacts/sprites-BEFORE-fix-${timestamp}.png`);
    console.log(`  After fix: test-artifacts/sprites-AFTER-fix-${timestamp}.png`);
  });
});