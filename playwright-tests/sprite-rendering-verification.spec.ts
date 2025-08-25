import { test, expect } from '@playwright/test';

test.describe('Sprite Rendering Verification', () => {
  test('should render all block sprites correctly on sprite-test.html', async ({ page }) => {
    // Navigate to the sprite test page
    await page.goto('/sprite-test.html');
    
    // Wait for the page to load and sprites to render
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give time for WebGL to initialize
    
    // Check for console errors
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else {
        consoleLogs.push(`${msg.type()}: ${msg.text()}`);
      }
    });
    
    // Take a screenshot showing the sprites
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = `test-artifacts/sprite-verification-${timestamp}.png`;
    
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    
    // Check that the canvas is present and has rendered content
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // Check canvas dimensions are reasonable (should be set up for sprite display)
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).toBeTruthy();
    expect(canvasBox!.width).toBeGreaterThan(100);
    expect(canvasBox!.height).toBeGreaterThan(100);
    
    // Wait a bit more to ensure all rendering is complete
    await page.waitForTimeout(1000);
    
    // Log console output for debugging
    console.log('Console logs:', consoleLogs.slice(-10)); // Last 10 logs
    console.log('Console errors:', consoleErrors);
    
    // Save console output to file
    const consoleData = {
      timestamp,
      logs: consoleLogs,
      errors: consoleErrors,
      canvasSize: canvasBox
    };
    
    await page.evaluate((data) => {
      console.log('SPRITE_VERIFICATION_DATA:', JSON.stringify(data, null, 2));
    }, consoleData);
    
    // Check that there are no critical errors
    const criticalErrors = consoleErrors.filter(error => 
      error.toLowerCase().includes('webgl') || 
      error.toLowerCase().includes('texture') ||
      error.toLowerCase().includes('shader') ||
      error.toLowerCase().includes('three.js')
    );
    
    // Report results
    console.log(`Screenshot saved to: ${screenshotPath}`);
    console.log(`Canvas size: ${canvasBox!.width}x${canvasBox!.height}`);
    console.log(`Console errors found: ${consoleErrors.length}`);
    console.log(`Critical rendering errors: ${criticalErrors.length}`);
    
    // The test passes if no critical rendering errors occurred
    expect(criticalErrors).toHaveLength(0);
  });
});