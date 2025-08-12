/**
 * Pause Menu Component - Phase 9 Implementation
 * 
 * In-game pause menu that appears when the player pauses during gameplay.
 * Provides options to resume, restart, or quit to the main menu.
 */

import { BaseUIComponent } from './BaseUIComponent';
import { UILayer } from '../UITypes';
import { StateManager } from '../../core/StateManager';
import { StateTransition } from '../../core/GameState';

export class PauseMenu extends BaseUIComponent {
  private menuContainer!: HTMLElement;
  private selectedOption: number = 0;
  private menuOptions: Array<{text: string, action: () => void}> = [];
  
  constructor() {
    super(UILayer.OVERLAY);
    this.setupMenuOptions();
  }
  
  protected createElement(): HTMLElement {
    const container = this.createStyledContainer({
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    });
    
    // Pause title
    const title = this.createTextElement('GAME PAUSED', {
      fontSize: '48px',
      fontWeight: 'bold',
      color: '#e74c3c',
      textAlign: 'center',
      marginBottom: '40px',
      textShadow: '3px 3px 6px rgba(0, 0, 0, 0.8)',
      letterSpacing: '2px'
    });
    container.appendChild(title);
    
    // Menu container
    this.menuContainer = this.createStyledContainer({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '15px',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: '30px',
      borderRadius: '12px',
      border: '2px solid #34495e'
    });
    container.appendChild(this.menuContainer);
    
    // Create menu items
    this.createMenuItems();
    
    // Instructions
    const instructions = this.createTextElement('Arrow Keys to navigate • Enter to select • Escape to resume', {
      position: 'absolute',
      bottom: '40px',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '14px',
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
        text: 'Resume Game',
        action: () => stateManager.requestTransition(StateTransition.RESUME_GAME)
      },
      {
        text: 'Restart Game',
        action: () => stateManager.requestTransition(StateTransition.RESTART_GAME)
      },
      {
        text: 'Main Menu',
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
      padding: '12px 30px',
      backgroundColor: 'transparent',
      border: '2px solid transparent',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      minWidth: '180px'
    });
    
    const buttonText = this.createTextElement(text, {
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#ecf0f1',
      textAlign: 'center',
      pointerEvents: 'none'
    });
    
    button.appendChild(buttonText);
    
    // Click handler
    button.onclick = (): void => {
      this.selectedOption = index;
      this.updateSelection();
      action();
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
          // Resume game on escape
          StateManager.getInstance().requestTransition(StateTransition.RESUME_GAME);
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
        item.style.backgroundColor = 'rgba(52, 152, 219, 0.3)';
        item.style.borderColor = '#3498db';
        item.style.transform = 'scale(1.05)';
        textElement.style.color = '#3498db';
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
    // Pause menu doesn't need real-time updates
  }
  
  protected onShow(): void {
    this.selectedOption = 0; // Default to "Resume Game"
    this.updateSelection();
    
    // Add show animation
    this.menuContainer.style.transform = 'scale(0.8)';
    this.menuContainer.style.opacity = '0';
    this.menuContainer.style.transition = 'all 0.3s ease';
    
    requestAnimationFrame(() => {
      this.menuContainer.style.transform = 'scale(1)';
      this.menuContainer.style.opacity = '1';
    });
    
    console.log('PauseMenu shown');
  }
  
  protected onHide(): void {
    console.log('PauseMenu hidden');
  }
  
  /**
   * Show with a specific option selected
   */
  public showWithOption(optionIndex: number): void {
    this.selectedOption = Math.max(0, Math.min(optionIndex, this.menuOptions.length - 1));
    this.show();
  }
}