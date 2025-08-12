/**
 * Main Menu Tests - Phase 11
 * 
 * Tests for the Main Menu with game mode selection
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateTransition, GameMode } from '../../../src/core/GameState';

// Mock StateManager BEFORE importing MainMenu
const mockStateManagerInstance = {
  setGameMode: vi.fn(),
  requestTransition: vi.fn()
};

vi.mock('../../../src/core/StateManager', () => ({
  StateManager: {
    getInstance: vi.fn(() => mockStateManagerInstance)
  }
}));

// Import after mocking
import { MainMenu } from '../../../src/ui/components/MainMenu';

describe('MainMenu', () => {
  let mainMenu: MainMenu;
  let mockStateManager: any;

  beforeEach(async () => {
    // Clear previous calls first
    vi.clearAllMocks();
    
    // Use the global mock instance
    mockStateManager = mockStateManagerInstance;
    
    // Create main menu
    mainMenu = new MainMenu();
    
    // Wait for async initialization to complete
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  describe('Menu Options', () => {
    it('should have all game mode options', () => {
      // Test that main menu has expected options
      expect(mainMenu.getSelectedOption()).toBe(0);
      
      // The menu should have options for all game modes
      const menuElement = mainMenu.element;
      expect(menuElement).toBeDefined();
    });

    it('should have endless mode option', () => {
      const menuElement = mainMenu.element;
      const endlessModeButton = Array.from(menuElement?.querySelectorAll('div') || []).find((el) => 
        (el as HTMLElement).textContent?.includes('Endless Mode'));
      
      expect(endlessModeButton).toBeDefined();
    });

    it('should have VS computer option', () => {
      const menuElement = mainMenu.element;
      const vsComputerButton = Array.from(menuElement?.querySelectorAll('div') || []).find((el) => 
        (el as HTMLElement).textContent?.includes('VS Computer'));
      
      expect(vsComputerButton).toBeDefined();
    });

    it('should have VS human option', () => {
      const menuElement = mainMenu.element;
      const vsHumanButton = Array.from(menuElement?.querySelectorAll('div') || []).find((el) => 
        (el as HTMLElement).textContent?.includes('VS Human'));
      
      expect(vsHumanButton).toBeDefined();
    });

    it('should have demo mode option', () => {
      const menuElement = mainMenu.element;
      const demoButton = Array.from(menuElement?.querySelectorAll('div') || []).find((el) => 
        (el as HTMLElement).textContent?.includes('Demo'));
      
      expect(demoButton).toBeDefined();
    });
  });

  describe('Navigation', () => {
    it('should start with first option selected', () => {
      expect(mainMenu.getSelectedOption()).toBe(0);
    });

    it('should allow setting selected option', () => {
      mainMenu.setSelectedOption(2);
      expect(mainMenu.getSelectedOption()).toBe(2);
    });

    it('should handle invalid option index', () => {
      mainMenu.setSelectedOption(999);
      // Should not change from valid range
      expect(mainMenu.getSelectedOption()).toBe(0);
    });
  });

  describe('UI State', () => {
    it('should be hideable', () => {
      mainMenu.show();
      expect(mainMenu.isVisible).toBe(true);
      
      mainMenu.hide();
      expect(mainMenu.isVisible).toBe(false);
    });

    it('should reset selection when shown', () => {
      mainMenu.setSelectedOption(3);
      mainMenu.hide();
      mainMenu.show();
      
      expect(mainMenu.getSelectedOption()).toBe(0);
    });
  });
});