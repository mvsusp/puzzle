import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testSpriteRendering() {
  console.log('🧪 Starting pixel-perfect sprite rendering test...');
  
  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'test-artifacts', 'sprite-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 }
  });
  
  const page = await context.newPage();
  
  // Track console messages
  const consoleMessages = [];
  const consoleErrors = [];
  
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({
      type: msg.type(),
      text: text,
      timestamp: new Date().toISOString()
    });
    
    if (msg.type() === 'error') {
      consoleErrors.push(text);
      console.log('❌ Console Error:', text);
    } else if (text.includes('Pixel-perfect sprite renderer')) {
      console.log('✅ Found sprite renderer message:', text);
    } else if (text.includes('sprite') || text.includes('texture') || text.includes('renderer')) {
      console.log('📝 Sprite-related message:', text);
    }
  });
  
  // Track network requests for sprite assets
  page.on('request', request => {
    const url = request.url();
    if (url.includes('.png') || url.includes('sprite') || url.includes('texture')) {
      console.log('🖼️  Loading asset:', url);
    }
  });
  
  try {
    console.log('🌐 Navigating to game at http://localhost:3001/');
    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle' });
    
    // Wait for the game to initialize
    console.log('⏳ Waiting for game initialization...');
    await page.waitForTimeout(3000);
    
    // Look for the canvas element
    const canvas = await page.locator('canvas').first();
    if (await canvas.count() > 0) {
      console.log('✅ Found game canvas');
    } else {
      console.log('❌ No canvas found');
    }
    
    // Take initial screenshot
    console.log('📸 Taking initial screenshot...');
    await page.screenshot({
      path: path.join(screenshotsDir, 'game-initial.png'),
      fullPage: false
    });
    
    // Wait a bit more for any animations or loading
    await page.waitForTimeout(2000);
    
    // Take screenshot focused on the game area
    console.log('📸 Taking game area screenshot...');
    await page.screenshot({
      path: path.join(screenshotsDir, 'game-sprites.png'),
      fullPage: false
    });
    
    // Try to interact with the game to ensure blocks are visible
    console.log('🎮 Simulating game interaction...');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(500);
    
    // Take screenshot after interaction
    console.log('📸 Taking post-interaction screenshot...');
    await page.screenshot({
      path: path.join(screenshotsDir, 'game-after-interaction.png'),
      fullPage: false
    });
    
    // Try to trigger some blocks by pressing Q (garbage blocks)
    console.log('🎮 Testing garbage block spawn (Q key)...');
    await page.keyboard.press('q');
    await page.waitForTimeout(1000);
    
    await page.screenshot({
      path: path.join(screenshotsDir, 'game-with-garbage.png'),
      fullPage: false
    });
    
    // Check for debug UI with F3
    console.log('🔍 Toggling debug UI (F3)...');
    await page.keyboard.press('F3');
    await page.waitForTimeout(500);
    
    await page.screenshot({
      path: path.join(screenshotsDir, 'game-debug-ui.png'),
      fullPage: false
    });
    
    // Focus on a specific area with blocks if possible
    try {
      const gameArea = await page.locator('canvas').boundingBox();
      if (gameArea) {
        console.log('📸 Taking focused screenshot of game area...');
        await page.screenshot({
          path: path.join(screenshotsDir, 'game-blocks-focused.png'),
          clip: {
            x: gameArea.x,
            y: gameArea.y,
            width: Math.min(gameArea.width, 800),
            height: Math.min(gameArea.height, 600)
          }
        });
      }
    } catch (e) {
      console.log('⚠️  Could not take focused screenshot:', e.message);
    }
    
    // Get final console state
    console.log('\n📋 Console Analysis:');
    console.log(`Total messages: ${consoleMessages.length}`);
    console.log(`Errors: ${consoleErrors.length}`);
    
    // Check for specific messages
    const spriteRendererInit = consoleMessages.find(msg => 
      msg.text.includes('Pixel-perfect sprite renderer initialized')
    );
    
    if (spriteRendererInit) {
      console.log('✅ Pixel-perfect sprite renderer initialized successfully');
    } else {
      console.log('❌ Pixel-perfect sprite renderer initialization message not found');
    }
    
    // Look for any sprite-related errors
    const spriteErrors = consoleErrors.filter(error => 
      error.includes('sprite') || 
      error.includes('texture') || 
      error.includes('renderer') ||
      error.includes('canvas')
    );
    
    if (spriteErrors.length > 0) {
      console.log('❌ Sprite-related errors found:');
      spriteErrors.forEach(error => console.log('   -', error));
    } else {
      console.log('✅ No sprite-related errors detected');
    }
    
    // Save console log
    const logPath = path.join(screenshotsDir, 'console-log.json');
    fs.writeFileSync(logPath, JSON.stringify({
      messages: consoleMessages,
      errors: consoleErrors,
      summary: {
        totalMessages: consoleMessages.length,
        totalErrors: consoleErrors.length,
        spriteRendererInitialized: !!spriteRendererInit,
        spriteErrors: spriteErrors
      }
    }, null, 2));
    
    console.log(`\n📁 Screenshots saved to: ${screenshotsDir}`);
    console.log('📄 Console log saved to:', logPath);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testSpriteRendering().then(() => {
  console.log('✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});