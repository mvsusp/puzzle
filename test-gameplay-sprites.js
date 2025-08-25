import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testGameplaySprites() {
  console.log('🧪 Testing pixel-perfect sprites in actual gameplay...');
  
  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'test-artifacts', 'gameplay-sprites');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 }
  });
  
  const page = await context.newPage();
  
  // Track console messages related to sprites
  const spriteMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Pixel-perfect sprite renderer') || 
        text.includes('sprite') || 
        text.includes('texture') || 
        text.includes('renderer')) {
      spriteMessages.push({
        type: msg.type(),
        text: text,
        timestamp: new Date().toISOString()
      });
      console.log(`📝 ${msg.type()}: ${text}`);
    }
  });
  
  try {
    console.log('🌐 Navigating to game...');
    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle' });
    
    // Wait for initialization
    await page.waitForTimeout(3000);
    
    console.log('🎮 Starting Endless Mode...');
    // Click on Endless Mode to start the game
    await page.keyboard.press('Enter'); // Press Enter to select Endless Mode
    await page.waitForTimeout(2000);
    
    // Take screenshot of initial game state
    console.log('📸 Taking initial gameplay screenshot...');
    await page.screenshot({
      path: path.join(screenshotsDir, 'gameplay-initial.png'),
      fullPage: false
    });
    
    // Enable debug UI to see game state
    console.log('🔍 Enabling debug UI...');
    await page.keyboard.press('F3');
    await page.waitForTimeout(500);
    
    console.log('📸 Taking screenshot with debug UI...');
    await page.screenshot({
      path: path.join(screenshotsDir, 'gameplay-debug.png'),
      fullPage: false
    });
    
    // Move cursor around to interact with blocks
    console.log('🎮 Moving cursor around...');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    
    console.log('📸 Taking screenshot after cursor movement...');
    await page.screenshot({
      path: path.join(screenshotsDir, 'gameplay-cursor-moved.png'),
      fullPage: false
    });
    
    // Try to swap some blocks
    console.log('🔄 Attempting block swap...');
    await page.keyboard.press('x'); // Swap blocks
    await page.waitForTimeout(500);
    
    console.log('📸 Taking screenshot after swap...');
    await page.screenshot({
      path: path.join(screenshotsDir, 'gameplay-after-swap.png'),
      fullPage: false
    });
    
    // Raise the stack to get more blocks
    console.log('⬆️ Raising stack...');
    await page.keyboard.press('z'); // Raise stack
    await page.waitForTimeout(1000);
    
    console.log('📸 Taking screenshot after stack raise...');
    await page.screenshot({
      path: path.join(screenshotsDir, 'gameplay-stack-raised.png'),
      fullPage: false
    });
    
    // Drop some garbage blocks
    console.log('🗿 Dropping garbage blocks...');
    await page.keyboard.press('q');
    await page.waitForTimeout(1500);
    
    console.log('📸 Taking screenshot with garbage blocks...');
    await page.screenshot({
      path: path.join(screenshotsDir, 'gameplay-with-garbage.png'),
      fullPage: false
    });
    
    // Try to get a close-up of the blocks by focusing on game area
    try {
      const canvas = await page.locator('canvas').first();
      const canvasBox = await canvas.boundingBox();
      
      if (canvasBox) {
        console.log('📸 Taking close-up of game blocks...');
        await page.screenshot({
          path: path.join(screenshotsDir, 'blocks-closeup.png'),
          clip: {
            x: canvasBox.x + 300, // Focus on center-right area where blocks should be
            y: canvasBox.y + 100,
            width: 400,
            height: 400
          }
        });
      }
    } catch (e) {
      console.log('⚠️ Could not take close-up screenshot:', e.message);
    }
    
    // Save sprite-related messages
    const logPath = path.join(screenshotsDir, 'sprite-messages.json');
    fs.writeFileSync(logPath, JSON.stringify({
      messages: spriteMessages,
      summary: {
        totalSpriteMessages: spriteMessages.length,
        pixelPerfectInitialized: spriteMessages.some(m => m.text.includes('Pixel-perfect sprite renderer initialized'))
      }
    }, null, 2));
    
    console.log(`\n📁 Gameplay screenshots saved to: ${screenshotsDir}`);
    console.log('📄 Sprite messages saved to:', logPath);
    
    // Summary
    const pixelPerfectFound = spriteMessages.some(m => m.text.includes('Pixel-perfect sprite renderer initialized'));
    console.log(`\n✅ Pixel-perfect sprite renderer initialized: ${pixelPerfectFound}`);
    console.log(`📊 Total sprite-related messages: ${spriteMessages.length}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testGameplaySprites().then(() => {
  console.log('✅ Gameplay sprite test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});