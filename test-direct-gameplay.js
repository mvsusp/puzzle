import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testDirectGameplay() {
  console.log('🧪 Testing pixel-perfect sprites with direct gameplay access...');
  
  const screenshotsDir = path.join(__dirname, 'test-artifacts', 'direct-gameplay');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 }
  });
  
  const page = await context.newPage();
  
  // Track all console messages for debugging
  const allMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    allMessages.push({
      type: msg.type(),
      text: text,
      timestamp: new Date().toISOString()
    });
    
    if (text.includes('Pixel-perfect sprite renderer') || 
        text.includes('sprite') || 
        text.includes('texture') ||
        text.includes('State transition') ||
        text.includes('GameController') ||
        text.includes('Board')) {
      console.log(`📝 ${msg.type()}: ${text}`);
    }
  });
  
  try {
    console.log('🌐 Navigating to game...');
    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle' });
    
    // Wait for full initialization
    await page.waitForTimeout(4000);
    
    console.log('🎮 Attempting to start gameplay by clicking Endless Mode...');
    
    // Try clicking on "Endless Mode" text/button
    try {
      await page.click('text=Endless Mode', { timeout: 2000 });
      console.log('✅ Clicked Endless Mode');
    } catch (e) {
      console.log('⚠️ Could not click Endless Mode, trying Enter key...');
      await page.keyboard.press('Enter');
    }
    
    await page.waitForTimeout(3000);
    
    // Check if we're still on title screen and try different approaches
    const titleVisible = await page.isVisible('text=PANEL POP').catch(() => false);
    if (titleVisible) {
      console.log('🔄 Still on title screen, trying Demo mode...');
      
      // Navigate to Demo
      await page.keyboard.press('ArrowDown'); // Move to Demo
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
    }
    
    // Try direct game mode by evaluating JavaScript
    console.log('🎯 Attempting direct game state transition...');
    try {
      await page.evaluate(() => {
        // Try to access the StateManager and force a transition
        if (window.stateManager) {
          window.stateManager.requestTransition('start_game');
        } else if (window.gameEngine && window.gameEngine.stateManager) {
          window.gameEngine.stateManager.requestTransition('start_game');
        }
      });
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('⚠️ Could not force state transition:', e.message);
    }
    
    // Take screenshots at each step
    console.log('📸 Taking current state screenshot...');
    await page.screenshot({
      path: path.join(screenshotsDir, 'current-state.png'),
      fullPage: false
    });
    
    // Enable debug UI regardless of state
    console.log('🔍 Enabling debug UI...');
    await page.keyboard.press('F3');
    await page.waitForTimeout(500);
    
    console.log('📸 Taking screenshot with debug UI...');
    await page.screenshot({
      path: path.join(screenshotsDir, 'with-debug-ui.png'),
      fullPage: false
    });
    
    // Try interacting with game elements
    console.log('🎮 Attempting game interactions...');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    
    // Try raising stack even if on title screen (might force blocks to appear)
    console.log('⬆️ Trying stack raise...');
    await page.keyboard.press('z');
    await page.waitForTimeout(1000);
    
    // Try garbage blocks
    console.log('🗿 Trying garbage blocks...');
    await page.keyboard.press('q');
    await page.waitForTimeout(1000);
    
    console.log('📸 Taking final screenshot...');
    await page.screenshot({
      path: path.join(screenshotsDir, 'after-interactions.png'),
      fullPage: false
    });
    
    // Try to access the canvas and inspect its contents
    try {
      const canvasInfo = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (canvas) {
          return {
            width: canvas.width,
            height: canvas.height,
            style: canvas.style.cssText,
            visible: canvas.offsetWidth > 0 && canvas.offsetHeight > 0
          };
        }
        return null;
      });
      
      console.log('🖼️ Canvas info:', canvasInfo);
      
      if (canvasInfo && canvasInfo.visible) {
        console.log('📸 Taking canvas-focused screenshot...');
        const canvas = await page.locator('canvas').first();
        const box = await canvas.boundingBox();
        
        if (box) {
          await page.screenshot({
            path: path.join(screenshotsDir, 'canvas-focused.png'),
            clip: {
              x: box.x,
              y: box.y,
              width: Math.min(box.width, 800),
              height: Math.min(box.height, 600)
            }
          });
        }
      }
    } catch (e) {
      console.log('⚠️ Could not get canvas info:', e.message);
    }
    
    // Save all console messages for analysis
    const logPath = path.join(screenshotsDir, 'all-console-messages.json');
    fs.writeFileSync(logPath, JSON.stringify({
      messages: allMessages,
      summary: {
        totalMessages: allMessages.length,
        pixelPerfectInitialized: allMessages.some(m => m.text.includes('Pixel-perfect sprite renderer initialized')),
        stateTransitions: allMessages.filter(m => m.text.includes('State transition')),
        spriteMessages: allMessages.filter(m => 
          m.text.includes('sprite') || 
          m.text.includes('texture') || 
          m.text.includes('renderer')
        )
      }
    }, null, 2));
    
    console.log(`\n📁 Screenshots saved to: ${screenshotsDir}`);
    console.log('📄 Console log saved to:', logPath);
    
    // Check for pixel-perfect renderer initialization
    const pixelPerfectFound = allMessages.some(m => m.text.includes('Pixel-perfect sprite renderer initialized'));
    console.log(`\n✅ Pixel-perfect sprite renderer initialized: ${pixelPerfectFound}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testDirectGameplay().then(() => {
  console.log('✅ Direct gameplay test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});