import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function compareSprites() {
  console.log('🧪 Testing sprite quality comparison between different rendering methods...');
  
  const screenshotsDir = path.join(__dirname, 'test-artifacts', 'sprite-comparison');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 }
  });
  
  try {
    // Test the original sprite test page
    console.log('📸 Testing original sprite test (WebGL UV mapping)...');
    const page1 = await context.newPage();
    await page1.goto('http://localhost:3001/sprite-test.html', { waitUntil: 'networkidle' });
    await page1.waitForTimeout(2000);
    
    await page1.screenshot({
      path: path.join(screenshotsDir, 'sprite-test-webgl.png'),
      fullPage: false
    });
    
    // Test the 2D canvas sprite test page
    console.log('📸 Testing 2D canvas sprite test (pixel-perfect)...');
    const page2 = await context.newPage();
    await page2.goto('http://localhost:3001/sprite-test-2d.html', { waitUntil: 'networkidle' });
    await page2.waitForTimeout(2000);
    
    await page2.screenshot({
      path: path.join(screenshotsDir, 'sprite-test-2d-canvas.png'),
      fullPage: false
    });
    
    // Test the main game (should use pixel-perfect renderer now)
    console.log('📸 Testing main game (should use pixel-perfect renderer)...');
    const page3 = await context.newPage();
    
    // Track console messages
    const consoleMessages = [];
    page3.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (text.includes('Pixel-perfect sprite renderer initialized')) {
        console.log('✅ Found pixel-perfect renderer initialization in main game');
      } else if (text.includes('sprite') || text.includes('texture') || text.includes('renderer')) {
        console.log(`📝 ${msg.type()}: ${text}`);
      }
    });
    
    await page3.goto('http://localhost:3001/', { waitUntil: 'networkidle' });
    await page3.waitForTimeout(3000);
    
    await page3.screenshot({
      path: path.join(screenshotsDir, 'main-game.png'),
      fullPage: false
    });
    
    // Focus on the canvas area of the main game
    try {
      const canvas = await page3.locator('canvas').first();
      const box = await canvas.boundingBox();
      
      if (box) {
        await page3.screenshot({
          path: path.join(screenshotsDir, 'main-game-canvas.png'),
          clip: {
            x: box.x,
            y: box.y,
            width: Math.min(box.width, 800),
            height: Math.min(box.height, 600)
          }
        });
      }
    } catch (e) {
      console.log('⚠️ Could not capture canvas area:', e.message);
    }
    
    // Take close-up screenshots for detailed comparison
    console.log('🔍 Taking close-up screenshots for quality comparison...');
    
    // Close-up of WebGL version
    const webglCloseup = await page1.locator('canvas').first();
    const webglBox = await webglCloseup.boundingBox();
    if (webglBox) {
      await page1.screenshot({
        path: path.join(screenshotsDir, 'webgl-closeup.png'),
        clip: {
          x: webglBox.x + 50,
          y: webglBox.y + 50,
          width: 300,
          height: 300
        }
      });
    }
    
    // Close-up of 2D Canvas version
    const canvasCloseup = await page2.locator('canvas').first();
    const canvasBox = await canvasCloseup.boundingBox();
    if (canvasBox) {
      await page2.screenshot({
        path: path.join(screenshotsDir, '2d-canvas-closeup.png'),
        clip: {
          x: canvasBox.x + 50,
          y: canvasBox.y + 50,
          width: 300,
          height: 300
        }
      });
    }
    
    // Save console log analysis
    const logPath = path.join(screenshotsDir, 'console-analysis.json');
    fs.writeFileSync(logPath, JSON.stringify({
      messages: consoleMessages,
      pixelPerfectInitialized: consoleMessages.some(m => m.includes('Pixel-perfect sprite renderer initialized')),
      spriteRelatedMessages: consoleMessages.filter(m => 
        m.includes('sprite') || m.includes('texture') || m.includes('renderer')
      )
    }, null, 2));
    
    console.log(`\n📁 Comparison screenshots saved to: ${screenshotsDir}`);
    console.log('📋 Files created:');
    console.log('  - sprite-test-webgl.png (Original WebGL UV mapping)');
    console.log('  - sprite-test-2d-canvas.png (Pixel-perfect 2D canvas)');
    console.log('  - main-game.png (Main game with pixel-perfect renderer)');
    console.log('  - main-game-canvas.png (Main game canvas area)');
    console.log('  - webgl-closeup.png (WebGL close-up for quality check)');
    console.log('  - 2d-canvas-closeup.png (2D canvas close-up for quality check)');
    
    await page1.close();
    await page2.close();
    await page3.close();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
compareSprites().then(() => {
  console.log('✅ Sprite comparison test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});