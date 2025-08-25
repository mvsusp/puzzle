import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Sprite Rendering Investigation', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
  });

  test('investigate sprite sheet loading and rendering', async () => {
    console.log('Starting sprite investigation...');

    // Navigate to sprite test page
    await page.goto('/sprite-test.html');
    
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give sprites time to render

    // Take initial screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ 
      path: `test-artifacts/sprite-test-${timestamp}.png`,
      fullPage: true 
    });

    // Check console for errors
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    // Check network requests for sprite sheet
    let spriteSheetResponse: any = null;
    page.on('response', async (response) => {
      if (response.url().includes('sprites.png')) {
        spriteSheetResponse = {
          url: response.url(),
          status: response.status(),
          contentType: response.headers()['content-type'],
          contentLength: response.headers()['content-length']
        };
      }
    });

    // Reload page to capture network activity
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Analyze the sprite sheet image properties
    const spriteSheetInfo = await page.evaluate(() => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            complete: img.complete
          });
        };
        img.onerror = () => {
          resolve({
            error: 'Failed to load sprite sheet',
            naturalWidth: 0,
            naturalHeight: 0,
            complete: false
          });
        };
        img.src = '/assets/sprites/sprites.png';
      });
    });

    // Check what sprites are actually rendered on the page
    const spriteContainers = await page.$$('.sprite-container');
    const renderedSprites: any[] = [];

    for (const container of spriteContainers) {
      const label = await container.$('p');
      const canvas = await container.$('canvas');
      
      if (label && canvas) {
        const text = await label.textContent();
        const canvasSize = await canvas.evaluate((el: HTMLCanvasElement) => ({
          width: el.width,
          height: el.height
        }));
        
        renderedSprites.push({
          label: text,
          canvasSize
        });
      }
    }

    // Get the actual sprite coordinates from the test code
    const spriteTestCoords = await page.evaluate(() => {
      // Access the coordinates used in the sprite test
      return {
        TILE_SIZE: 32,
        SPRITESHEET_WIDTH: 620,
        SPRITESHEET_HEIGHT: 480,
        uvs: {
          purple: { x: 96, y: 0 },
          yellow: { x: 0, y: 0 },
          red: { x: 128, y: 0 },
          cyan: { x: 64, y: 0 },
          green: { x: 32, y: 0 },
        },
        states: {
          normal: { y: 0 },
          landed: { y: 128 },
          exploding: { y: 160 },
        }
      };
    });

    // Calculate UV coordinates for verification
    const uvCalculations: any[] = [];
    Object.entries(spriteTestCoords.uvs).forEach(([color, pos]: [string, any]) => {
      Object.entries(spriteTestCoords.states).forEach(([state, statePos]: [string, any]) => {
        const u = pos.x / spriteTestCoords.SPRITESHEET_WIDTH;
        const v = (spriteTestCoords.SPRITESHEET_HEIGHT - statePos.y - spriteTestCoords.TILE_SIZE) / spriteTestCoords.SPRITESHEET_HEIGHT;
        const width = spriteTestCoords.TILE_SIZE / spriteTestCoords.SPRITESHEET_WIDTH;
        const height = spriteTestCoords.TILE_SIZE / spriteTestCoords.SPRITESHEET_HEIGHT;
        
        uvCalculations.push({
          color,
          state,
          pixelCoords: { x: pos.x, y: statePos.y },
          uvCoords: { u, v, width, height },
          normalized: {
            u: u.toFixed(4),
            v: v.toFixed(4),
            width: width.toFixed(4),
            height: height.toFixed(4)
          }
        });
      });
    });

    // Take a final screenshot
    await page.screenshot({ 
      path: `test-artifacts/sprite-analysis-${timestamp}.png`,
      fullPage: true 
    });

    // Compile findings
    const findings = {
      timestamp,
      spriteSheetResponse,
      spriteSheetInfo,
      renderedSprites,
      spriteTestCoords,
      uvCalculations,
      consoleMessages,
      totalSpritesRendered: renderedSprites.length,
      expectedSpriteSize: spriteTestCoords.TILE_SIZE
    };

    // Save findings to file
    const findingsPath = `test-artifacts/sprite-findings-${timestamp}.json`;
    fs.writeFileSync(findingsPath, JSON.stringify(findings, null, 2));

    // Output findings to console for immediate review
    console.log('=== SPRITE INVESTIGATION FINDINGS ===');
    console.log(`Sprite Sheet Response:`, spriteSheetResponse);
    console.log(`Sprite Sheet Dimensions:`, spriteSheetInfo);
    console.log(`Total Sprites Rendered: ${renderedSprites.length}`);
    console.log(`Console Messages:`, consoleMessages);
    
    console.log('\n=== UV COORDINATE ANALYSIS ===');
    uvCalculations.forEach(calc => {
      console.log(`${calc.color} ${calc.state}: Pixel(${calc.pixelCoords.x}, ${calc.pixelCoords.y}) -> UV(${calc.normalized.u}, ${calc.normalized.v})`);
    });

    // Assertions for investigation
    expect(spriteSheetResponse).toBeTruthy();
    expect(spriteSheetResponse?.status).toBe(200);
    expect(spriteSheetInfo).toHaveProperty('naturalWidth');
    expect(spriteSheetInfo).toHaveProperty('naturalHeight');
    expect(renderedSprites.length).toBeGreaterThan(0);

    console.log(`\nFindings saved to: ${findingsPath}`);
  });

  test('analyze actual sprite sheet dimensions and content', async () => {
    // Load the actual sprite sheet file to analyze its properties
    const spriteSheetPath = path.join(process.cwd(), 'public/assets/sprites/sprites.png');
    
    // Navigate to a simple page to execute sprite analysis
    await page.goto('/sprite-test.html');
    await page.waitForLoadState('networkidle');

    // Analyze sprite sheet using browser APIs
    const spriteAnalysis = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas to analyze the sprite sheet
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          
          ctx.drawImage(img, 0, 0);
          
          // Sample pixels at expected sprite locations to see if they're empty
          const samples: any[] = [];
          const coordinates = [
            { name: 'Yellow Normal', x: 0, y: 0 },
            { name: 'Green Normal', x: 32, y: 0 },
            { name: 'Cyan Normal', x: 64, y: 0 },
            { name: 'Purple Normal', x: 96, y: 0 },
            { name: 'Red Normal', x: 128, y: 0 },
          ];
          
          coordinates.forEach(coord => {
            const imageData = ctx.getImageData(coord.x + 8, coord.y + 8, 1, 1);
            const pixel = imageData.data;
            samples.push({
              location: coord.name,
              coordinates: coord,
              rgba: [pixel[0], pixel[1], pixel[2], pixel[3]],
              isEmpty: pixel[3] === 0 // Check if alpha is 0 (transparent)
            });
          });

          resolve({
            dimensions: {
              width: img.naturalWidth,
              height: img.naturalHeight
            },
            pixelSamples: samples,
            canvasSupported: true
          });
        };
        
        img.onerror = () => {
          resolve({
            error: 'Could not load sprite sheet for analysis',
            canvasSupported: false
          });
        };
        
        img.src = '/assets/sprites/sprites.png';
      });
    });

    console.log('\n=== SPRITE SHEET ANALYSIS ===');
    console.log('Sprite Sheet Dimensions:', (spriteAnalysis as any).dimensions);
    console.log('Pixel Samples at Expected Locations:');
    
    if ((spriteAnalysis as any).pixelSamples) {
      (spriteAnalysis as any).pixelSamples.forEach((sample: any) => {
        console.log(`${sample.location} (${sample.coordinates.x}, ${sample.coordinates.y}):`, 
          `RGBA(${sample.rgba.join(', ')})`, sample.isEmpty ? '- EMPTY' : '- HAS CONTENT');
      });
    }

    // Save analysis
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const analysisPath = `test-artifacts/sprite-sheet-analysis-${timestamp}.json`;
    fs.writeFileSync(analysisPath, JSON.stringify(spriteAnalysis, null, 2));
    
    console.log(`\nSprite sheet analysis saved to: ${analysisPath}`);
  });

  test('check if sprites are 16x16 instead of 32x32', async () => {
    await page.goto('/sprite-test.html');
    await page.waitForLoadState('networkidle');

    // Test with 16x16 dimensions to see if sprites render correctly
    const test16x16 = await page.evaluate(() => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          // Test coordinates for 16x16 sprites
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          canvas.width = 16;
          canvas.height = 16;
          
          // Test yellow block at 0,0 with 16x16 size
          ctx.drawImage(img, 0, 0, 16, 16, 0, 0, 16, 16);
          
          // Check if we got any non-transparent pixels
          const imageData = ctx.getImageData(0, 0, 16, 16);
          let hasContent = false;
          
          for (let i = 3; i < imageData.data.length; i += 4) {
            if (imageData.data[i] > 0) {
              hasContent = true;
              break;
            }
          }
          
          resolve({
            spriteSheetDimensions: { width: img.naturalWidth, height: img.naturalHeight },
            test16x16HasContent: hasContent,
            testResults: 'Tested 16x16 sprite extraction from origin (0,0)'
          });
        };
        
        img.src = '/assets/sprites/sprites.png';
      });
    });

    console.log('\n=== 16x16 SPRITE TEST ===');
    console.log('Results:', test16x16);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const testPath = `test-artifacts/16x16-test-${timestamp}.json`;
    fs.writeFileSync(testPath, JSON.stringify(test16x16, null, 2));
  });
});