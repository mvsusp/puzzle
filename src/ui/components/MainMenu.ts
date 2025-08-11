/**
 * Main Menu Component - Phase 9 Implementation
 * 
 * Main game menu with options for different game modes and settings.
 * Provides navigation to various game states.
 */

import { BaseUIComponent } from './BaseUIComponent';
import { UILayer } from '../UIManager';
import { StateManager } from '../../core/StateManager';
import { StateTransition } from '../../core/GameState';

export class MainMenu extends BaseUIComponent {
  private menuContainer!: HTMLElement;
  private selectedOption: number = 0;
  private menuOptions: Array<{text: string, action: () => void}> = [];
  
  constructor() {
    super(UILayer.MENU);
    this.setupMenuOptions();
  }
  
  protected createElement(): HTMLElement {
    const container = this.createStyledContainer({
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    });
    
    // Title
    const title = this.createTextElement('MAIN MENU', {
      fontSize: '36px',
      fontWeight: 'bold',
      color: '#f1c40f',
      textAlign: 'center',
      marginBottom: '40px',
      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
    });
    container.appendChild(title);
    
    // Menu container
    this.menuContainer = this.createStyledContainer({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px'
    });
    container.appendChild(this.menuContainer);
    
    // Create menu items
    this.createMenuItems();
    
    // Instructions
    const instructions = this.createTextElement('Use Arrow Keys / WASD to navigate • Enter to select • Escape to go back', {
      position: 'absolute',
      bottom: '40px',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '12px',
      color: '#95a5a6',
      textAlign: 'center'
    });
    container.appendChild(instructions);
    
    return container;
  }
  
  private setupMenuOptions(): void {
    const stateManager = StateManager.getInstance();
    
    this.menuOptions = [
      {
        text: 'Endless Mode',
        action: () => stateManager.requestTransition(StateTransition.START_GAME)
      },
      {
        text: 'VS Computer',
        action: () => {
          console.log('VS Computer mode not implemented yet');
          // TODO: Implement in Phase 11 (Game Modes)
        }
      },
      {
        text: 'Options',
        action: () => stateManager.requestTransition(StateTransition.SHOW_OPTIONS)
      },
      {
        text: 'Demo',
        action: () => stateManager.requestTransition(StateTransition.SHOW_DEMO)
      },
      {
        text: 'Back to Title',
        action: () => stateManager.requestTransition(StateTransition.BACK_TO_TITLE)
      }
    ];
  }
  
  private createMenuItems(): void {
    this.menuOptions.forEach((option, index) => {
      const menuItem = this.createMenuButton(option.text, option.action, index);
      this.menuContainer.appendChild(menuItem);
    });
    
    this.updateSelection();
  }
  
  private createMenuButton(text: string, action: () => void, index: number): HTMLElement {
    const button = this.createStyledContainer({
      padding: '15px 40px',
      backgroundColor: 'transparent',
      border: '2px solid transparent',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      minWidth: '200px'
    });
    
    const buttonText = this.createTextElement(text, {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#ecf0f1',
      textAlign: 'center',
      pointerEvents: 'none'
    });
    
    button.appendChild(buttonText);
    
    // Click handler
    button.onclick = () => {
      this.selectedOption = index;
      this.updateSelection();
      action();
    };
    
    // Mouse enter/leave for visual feedback
    button.onmouseenter = () => {
      if (index !== this.selectedOption) {
        button.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      }
    };
    
    button.onmouseleave = () => {
      if (index !== this.selectedOption) {
        button.style.backgroundColor = 'transparent';
      }
    };
    
    return button;
  }
  
  protected setupEventListeners(): void {
    document.addEventListener('keydown', (event) => {
      if (!this.isVisible) return;
      
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          event.preventDefault();
          this.selectedOption = (this.selectedOption - 1 + this.menuOptions.length) % this.menuOptions.length;
          this.updateSelection();
          break;
          
        case 'ArrowDown':
        case 'KeyS':
          event.preventDefault();
          this.selectedOption = (this.selectedOption + 1) % this.menuOptions.length;
          this.updateSelection();
          break;
          
        case 'Enter':
        case 'Space':
          event.preventDefault();
          this.selectCurrentOption();
          break;
          
        case 'Escape':
          event.preventDefault();
          StateManager.getInstance().requestTransition(StateTransition.BACK_TO_TITLE);
          break;
      }
    });
  }
  
  private updateSelection(): void {
    const menuItems = this.menuContainer.children;
    
    for (let i = 0; i < menuItems.length; i++) {
      const item = menuItems[i] as HTMLElement;
      const textElement = item.firstChild as HTMLElement;
      const isSelected = i === this.selectedOption;
      
      if (isSelected) {
        item.style.backgroundColor = 'rgba(241, 196, 15, 0.2)';
        item.style.borderColor = '#f1c40f';
        item.style.transform = 'scale(1.05)';
        textElement.style.color = '#f1c40f';
      } else {
        item.style.backgroundColor = 'transparent';
        item.style.borderColor = 'transparent';
        item.style.transform = 'scale(1)';
        textElement.style.color = '#ecf0f1';
      }
    }
  }
  
  private selectCurrentOption(): void {
    if (this.selectedOption >= 0 && this.selectedOption < this.menuOptions.length) {
      this.menuOptions[this.selectedOption].action();
    }
  }
  
  public update(_data?: Record<string, unknown>): void {
    // Main menu doesn't need real-time updates
  }
  
  protected onShow(): void {
    this.selectedOption = 0;
    this.updateSelection();
    console.log('MainMenu shown');
  }
  
  protected onHide(): void {
    console.log('MainMenu hidden');
  }
  
  /**
   * Set the selected option
   */
  public setSelectedOption(index: number): void {
    if (index >= 0 && index < this.menuOptions.length) {
      this.selectedOption = index;
      this.updateSelection();
    }
  }
  
  /**
   * Get the currently selected option
   */
  public getSelectedOption(): number {
    return this.selectedOption;
  }
}