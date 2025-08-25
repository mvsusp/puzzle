import { test, expect } from '@playwright/test';
import fs from 'fs';

test.describe('Sprite Correction Analysis', () => {
  test('verify sprite sheet dimensions and analyze correction needed', async ({ page }) => {
    await page.goto('/sprite-test.html');
    await page.waitForLoadState('networkidle');

    // Get actual sprite sheet dimensions
    const spriteSheetInfo = await page.evaluate(() => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            actualWidth: img.naturalWidth,
            actualHeight: img.naturalHeight,
            complete: img.complete
          });
        };
        img.src = '/assets/sprites/sprites.png';
      });
    });

    // Current test coordinates from sprite-test.ts
    const currentCoords = {
      SPRITESHEET_WIDTH: 620,  // WRONG - actual is 640
      SPRITESHEET_HEIGHT: 480,  // Correct
      TILE_SIZE: 32,           // From C++ original
      // These should be correct based on C++ code
      uvs: {
        yellow: { x: 0, y: 0 },   // Correct
        green: { x: 32, y: 0 },   // Correct  
        cyan: { x: 64, y: 0 },    // Correct
        purple: { x: 96, y: 0 },  // Correct
        red: { x: 128, y: 0 },    // Correct
      },
      states: {
        normal: { y: 0 },      // Correct
        landed: { y: 128 },    // Correct but labeled as "landed" instead of "dimmed"
        exploding: { y: 160 }, // Correct
      }
    };

    // Test with corrected spritesheet width
    const correctedResults = await page.evaluate((data) => {
      const results: any[] = [];
      const CORRECTED_WIDTH = data.actualWidth;
      
      Object.entries(data.coords.uvs).forEach(([color, pos]: [string, any]) => {
        Object.entries(data.coords.states).forEach(([state, statePos]: [string, any]) => {
          // Calculate with WRONG width (620)
          const wrongU = pos.x / data.coords.SPRITESHEET_WIDTH;
          const wrongWidth = data.coords.TILE_SIZE / data.coords.SPRITESHEET_WIDTH;
          
          // Calculate with CORRECT width (640)  
          const correctU = pos.x / CORRECTED_WIDTH;
          const correctWidth = data.coords.TILE_SIZE / CORRECTED_WIDTH;
          
          const v = (data.coords.SPRITESHEET_HEIGHT - statePos.y - data.coords.TILE_SIZE) / data.coords.SPRITESHEET_HEIGHT;
          const height = data.coords.TILE_SIZE / data.coords.SPRITESHEET_HEIGHT;
          
          results.push({
            color,
            state,
            pixelCoords: { x: pos.x, y: statePos.y },
            wrongUV: { u: wrongU, v, width: wrongWidth, height },
            correctUV: { u: correctU, v, width: correctWidth, height },
            difference: {
              uShift: correctU - wrongU,
              widthChange: correctWidth - wrongWidth
            }
          });
        });
      });
      
      return results;
    }, { coords: currentCoords, actualWidth: (spriteSheetInfo as any).actualWidth });

    // Generate corrected sprite test coordinates 
    const correctedCoordinates = {
      TILE_SIZE: 32,
      SPRITESHEET_WIDTH: (spriteSheetInfo as any).actualWidth, // 640 instead of 620
      SPRITESHEET_HEIGHT: (spriteSheetInfo as any).actualHeight, // 480
      uvs: {
        yellow: { x: 0, y: 0 },
        green: { x: 32, y: 0 },
        cyan: { x: 64, y: 0 },
        purple: { x: 96, y: 0 },
        red: { x: 128, y: 0 },
      },
      states: {
        normal: { y: 0 },
        landed: { y: 128 },      // This might be "dimmed" state in original
        exploding: { y: 160 },
      }
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const findings = {
      timestamp,
      issue: 'SPRITESHEET_WIDTH is 620 but actual sprite sheet is 640 pixels wide',
      currentSpriteSheetInfo: spriteSheetInfo,
      currentCoords,
      correctedCoordinates,
      uvComparisons: correctedResults,
      fix: 'Change SPRITESHEET_WIDTH from 620 to 640 in sprite-test.ts'
    };

    const findingsPath = `test-artifacts/sprite-correction-${timestamp}.json`;
    fs.writeFileSync(findingsPath, JSON.stringify(findings, null, 2));

    console.log('=== SPRITE CORRECTION ANALYSIS ===');
    console.log(`Actual sprite sheet: ${(spriteSheetInfo as any).actualWidth} x ${(spriteSheetInfo as any).actualHeight}`);
    console.log(`Current code assumes: ${currentCoords.SPRITESHEET_WIDTH} x ${currentCoords.SPRITESHEET_HEIGHT}`);
    console.log(`ISSUE: Width mismatch - should be ${(spriteSheetInfo as any).actualWidth}, not ${currentCoords.SPRITESHEET_WIDTH}`);
    console.log('');
    console.log('UV coordinate differences (first few examples):');
    correctedResults.slice(0, 3).forEach(result => {
      console.log(`${result.color} ${result.state}:`);
      console.log(`  Wrong UV: ${result.wrongUV.u.toFixed(4)}, ${result.wrongUV.v.toFixed(4)}`);
      console.log(`  Correct UV: ${result.correctUV.u.toFixed(4)}, ${result.correctUV.v.toFixed(4)}`);
      console.log(`  U shift: ${result.difference.uShift.toFixed(6)}`);
      console.log('');
    });

    console.log(`Full analysis saved to: ${findingsPath}`);

    // Assertions
    expect((spriteSheetInfo as any).actualWidth).toBe(640);
    expect((spriteSheetInfo as any).actualHeight).toBe(480);
    expect(currentCoords.SPRITESHEET_WIDTH).toBe(620); // This is wrong
    expect((spriteSheetInfo as any).actualWidth).not.toBe(currentCoords.SPRITESHEET_WIDTH);
  });
});