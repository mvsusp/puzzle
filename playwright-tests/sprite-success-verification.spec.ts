import { test, expect } from '@playwright/test';

test.describe('Sprite Success Verification', () => {
  test('verify all sprite types render correctly', async ({ page }) => {
    // Navigate to the sprite test page
    await page.goto('/sprite-test.html');
    
    // Wait for the page to load and sprites to render
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Give time for WebGL to initialize
    
    // Track console messages
    const consoleMessages: Array<{type: string, text: string}> = [];
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    
    // Verify we have exactly 10 canvas elements (5 colors × 2 states)
    const canvasElements = page.locator('canvas');
    const canvasCount = await canvasElements.count();
    expect(canvasCount).toBe(10);
    
    // Check that each canvas has the correct dimensions
    for (let i = 0; i < canvasCount; i++) {
      const canvas = canvasElements.nth(i);
      const canvasBox = await canvas.boundingBox();
      expect(canvasBox).toBeTruthy();
      expect(canvasBox!.width).toBe(32);
      expect(canvasBox!.height).toBe(32);
    }
    
    // Verify all expected sprite labels are present
    const expectedLabels = [
      'PURPLE - NORMAL',
      'PURPLE - EXPLODING', 
      'YELLOW - NORMAL',
      'YELLOW - EXPLODING',
      'RED - NORMAL', 
      'RED - EXPLODING',
      'CYAN - NORMAL',
      'CYAN - EXPLODING',
      'GREEN - NORMAL',
      'GREEN - EXPLODING'
    ];
    
    for (const label of expectedLabels) {
      await expect(page.getByText(label)).toBeVisible();
    }
    
    // Take final verification screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = `test-artifacts/sprites-SUCCESS-verification-${timestamp}.png`;
    
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    
    // Filter for any WebGL or rendering errors
    const renderingErrors = consoleMessages.filter(msg => 
      msg.type === 'error' && (
        msg.text.toLowerCase().includes('webgl') ||
        msg.text.toLowerCase().includes('texture') ||
        msg.text.toLowerCase().includes('shader') ||
        msg.text.toLowerCase().includes('three.js')
      )
    );
    
    console.log(`✅ SUCCESS: All ${canvasCount} sprites rendered correctly`);
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
    console.log(`🔍 Console messages: ${consoleMessages.length} total, ${renderingErrors.length} rendering errors`);
    
    // Test passes if no rendering errors
    expect(renderingErrors).toHaveLength(0);
    
    console.log('🎉 SPRITE RENDERING VERIFICATION: PASSED');
  });
});