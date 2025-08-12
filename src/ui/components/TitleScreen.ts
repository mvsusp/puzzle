/**
 * Title Screen Component - Phase 9 Implementation
 * 
 * Main title screen with game logo and navigation options.
 * Entry point for the game UI system.
 */

import { BaseUIComponent } from './BaseUIComponent';
import { UILayer } from '../UITypes';
import { StateManager } from '../../core/StateManager';
import { StateTransition } from '../../core/GameState';

export class TitleScreen extends BaseUIComponent {
  private titleElement!: HTMLElement;
  private menuContainer!: HTMLElement;
  private demoTimeoutWarning!: HTMLElement;
  
  private selectedOption: number = 0;
  private menuOptions: string[] = ['Start Game', 'Options', 'Demo'];
  private demoTimeoutTicks: number = 0;
  
  constructor() {
    // Don't auto-init from base; do it after our fields are set
    super(UILayer.MENU, false);
    this.init();
  }
  
  protected createElement(): HTMLElement {
    const container = this.createStyledContainer({
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: '1500',
      pointerEvents: 'auto'
    });
    
    // Title logo
    this.titleElement = this.createTextElement('PANEL POP', {
      fontSize: '64px',
      fontWeight: 'bold',
      color: '#f1c40f',
      textAlign: 'center',
      marginBottom: '20px',
      textShadow: '4px 4px 8px rgba(0, 0, 0, 0.5)',
      letterSpacing: '4px'
    });
    container.appendChild(this.titleElement);
    
    // Subtitle
    const subtitle = this.createTextElement('Three.js Edition', {
      fontSize: '18px',
      color: '#ecf0f1',
      textAlign: 'center',
      marginBottom: '60px',
      opacity: '0.8'
    });
    container.appendChild(subtitle);
    
    // Menu container
    this.menuContainer = this.createStyledContainer({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '15px'
    });
    container.appendChild(this.menuContainer);
    
    // Create menu options
    this.createMenuOptions();
    
    // Demo timeout warning (initially hidden)
    this.demoTimeoutWarning = this.createTextElement('Demo starts in 10 seconds...', {
      position: 'absolute',
      bottom: '60px',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '14px',
      color: '#e74c3c',
      opacity: '0',
      transition: 'opacity 0.3s ease'
    });
    container.appendChild(this.demoTimeoutWarning);
    
    // Credits
    const credits = this.createTextElement('Press Enter to select • Arrow keys to navigate', {
      position: 'absolute',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '12px',
      color: '#95a5a6',
      opacity: '0.7'
    });
    container.appendChild(credits);
    
    return container;
  }
  
  private createMenuOptions(): void {
    this.menuOptions.forEach((option, index) => {
      const optionElement = this.createTextElement(option, {
        fontSize: '24px',
        fontWeight: 'bold',
        color: index === this.selectedOption ? '#f1c40f' : '#ecf0f1',
        textAlign: 'center',
        padding: '10px 30px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        border: index === this.selectedOption ? '2px solid #f1c40f' : '2px solid transparent',
        borderRadius: '8px',
        backgroundColor: index === this.selectedOption ? 'rgba(241, 196, 15, 0.1)' : 'transparent'
      });
      
      // Click handler
      optionElement.onclick = (): void => {
        this.selectedOption = index;
        this.updateMenuSelection();
        this.selectCurrentOption();
      };
      
      // Hover effects
      optionElement.onmouseenter = (): void => {
        if (index !== this.selectedOption) {
          optionElement.style.color = '#f39c12';
        }
      };
      
      optionElement.onmouseleave = (): void => {
        if (index !== this.selectedOption) {
          optionElement.style.color = '#ecf0f1';
        }
      };
      
      this.menuContainer.appendChild(optionElement);
    });
  }
  
  protected setupEventListeners(): void {
    // Keyboard navigation
    document.addEventListener('keydown', (event) => {
      if (!this.isVisible) return;
      
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          event.preventDefault();
          this.selectedOption = (this.selectedOption - 1 + this.menuOptions.length) % this.menuOptions.length;
          this.updateMenuSelection();
          break;
        case 'ArrowDown':
        case 'KeyS':
          event.preventDefault();
          this.selectedOption = (this.selectedOption + 1) % this.menuOptions.length;
          this.updateMenuSelection();
          break;
        case 'Enter':
        case 'Space':
          event.preventDefault();
          this.selectCurrentOption();
          break;
      }
    });
  }
  
  private updateMenuSelection(): void {
    const options = this.menuContainer.children;
    
    for (let i = 0; i < options.length; i++) {
      const option = options[i] as HTMLElement;
      const isSelected = i === this.selectedOption;
      
      option.style.color = isSelected ? '#f1c40f' : '#ecf0f1';
      option.style.border = isSelected ? '2px solid #f1c40f' : '2px solid transparent';
      option.style.backgroundColor = isSelected ? 'rgba(241, 196, 15, 0.1)' : 'transparent';
    }
  }
  
  private selectCurrentOption(): void {
    const stateManager = StateManager.getInstance();
    
    switch (this.selectedOption) {
      case 0: // Start Game
        stateManager.requestTransition(StateTransition.SHOW_MAIN_MENU);
        break;
      case 1: // Options
        stateManager.requestTransition(StateTransition.SHOW_OPTIONS);
        break;
      case 2: // Demo
        stateManager.requestTransition(StateTransition.SHOW_DEMO);
        break;
    }
  }
  
  public update(_data?: Record<string, unknown>): void {
    if (!this.isVisible) return;
    
    this.demoTimeoutTicks++;
    
    // Show demo timeout warning at 540 ticks (9 seconds, with 1 second warning)
    if (this.demoTimeoutTicks >= 540) {
      const secondsLeft = Math.ceil((600 - this.demoTimeoutTicks) / 60);
      if (secondsLeft > 0) {
        this.demoTimeoutWarning.textContent = `Demo starts in ${secondsLeft} seconds...`;
        this.demoTimeoutWarning.style.opacity = '1';
      } else {
        this.demoTimeoutWarning.style.opacity = '0';
      }
    }
  }
  
  protected onShow(): void {
    this.selectedOption = 0;
    this.demoTimeoutTicks = 0;
    this.updateMenuSelection();
    this.demoTimeoutWarning.style.opacity = '0';
    
    // Add title animation
    this.animateTitle();
  }
  
  protected onHide(): void {
    // Override in subclasses if needed
  }
  
  private animateTitle(): void {
    // Animate title with a subtle pulse
    const pulseKeyframes = [
      { transform: 'scale(1)', textShadow: '4px 4px 8px rgba(0, 0, 0, 0.5)' },
      { transform: 'scale(1.05)', textShadow: '6px 6px 12px rgba(0, 0, 0, 0.8)' },
      { transform: 'scale(1)', textShadow: '4px 4px 8px rgba(0, 0, 0, 0.5)' }
    ];
    
    this.titleElement.animate(pulseKeyframes, {
      duration: 3000,
      iterations: Infinity,
      easing: 'ease-in-out'
    });
  }
  
  /**
   * Reset demo timeout
   */
  public resetDemoTimeout(): void {
    this.demoTimeoutTicks = 0;
    this.demoTimeoutWarning.style.opacity = '0';
  }
}