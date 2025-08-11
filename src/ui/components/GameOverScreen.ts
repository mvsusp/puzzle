/**
 * Game Over Screen Component - Phase 9 Implementation
 * 
 * Displays game over screen with final score, win/lose status,
 * and options to restart or return to menu.
 */

import { BaseUIComponent } from './BaseUIComponent';
import { UILayer } from '../UIManager';
import { StateManager } from '../../core/StateManager';
import { StateTransition } from '../../core/GameState';

export class GameOverScreen extends BaseUIComponent {
  private titleElement!: HTMLElement;
  private scoreElement!: HTMLElement;
  private statsContainer!: HTMLElement;
  private menuContainer!: HTMLElement;
  
  private selectedOption: number = 0;
  private menuOptions: Array<{text: string, action: () => void}> = [];
  private isWin: boolean = false;
  
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
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    });
    
    // Game Over title (will be updated based on win/lose)
    this.titleElement = this.createTextElement('GAME OVER', {
      fontSize: '48px',
      fontWeight: 'bold',
      color: '#e74c3c',
      textAlign: 'center',
      marginBottom: '20px',
      textShadow: '3px 3px 6px rgba(0, 0, 0, 0.8)'
    });
    container.appendChild(this.titleElement);
    
    // Final score display
    this.scoreElement = this.createTextElement('Final Score: 0', {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#f1c40f',
      textAlign: 'center',
      marginBottom: '30px',
      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
    });
    container.appendChild(this.scoreElement);
    
    // Stats container
    this.statsContainer = this.createStyledContainer({
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      border: '2px solid #34495e',
      borderRadius: '10px',
      padding: '20px',
      marginBottom: '30px',
      minWidth: '300px'
    });
    container.appendChild(this.statsContainer);
    
    // Menu container
    this.menuContainer = this.createStyledContainer({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '15px'
    });
    container.appendChild(this.menuContainer);
    
    // Create menu items
    this.createMenuItems();
    
    // Instructions
    const instructions = this.createTextElement('Arrow Keys to navigate • Enter to select', {
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
        text: 'Play Again',
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
      minWidth: '150px'
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
    
    return button;
  }
  
  private updateStatsDisplay(data: Record<string, unknown>): void {
    // Clear existing stats
    this.statsContainer.innerHTML = '';
    
    // Create stats title
    const statsTitle = this.createTextElement('Game Statistics', {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#3498db',
      textAlign: 'center',
      marginBottom: '15px',
      borderBottom: '1px solid #34495e',
      paddingBottom: '8px'
    });
    this.statsContainer.appendChild(statsTitle);
    
    // Game time
    const gameTime = (data.gameTime as number) || 0;
    const minutes = Math.floor(gameTime / 3600); // 60 ticks per second * 60 seconds
    const seconds = Math.floor((gameTime % 3600) / 60);
    const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    this.addStatLine('Time Played:', timeText);
    
    // Highest chain
    const highestChain = (data.highestChain as number) || 1;
    this.addStatLine('Highest Chain:', highestChain.toString());
    
    // Total matches/combos (if available)
    const totalMatches = (data.totalMatches as number) || 0;
    if (totalMatches > 0) {
      this.addStatLine('Total Matches:', totalMatches.toString());
    }
    
    // Blocks cleared (if available)
    const blocksCleared = (data.blocksCleared as number) || 0;
    if (blocksCleared > 0) {
      this.addStatLine('Blocks Cleared:', blocksCleared.toString());
    }
  }
  
  private addStatLine(label: string, value: string): void {
    const statLine = this.createStyledContainer({
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '8px'
    });
    
    const labelElement = this.createTextElement(label, {
      fontSize: '14px',
      color: '#95a5a6'
    });
    
    const valueElement = this.createTextElement(value, {
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#ecf0f1'
    });
    
    statLine.appendChild(labelElement);
    statLine.appendChild(valueElement);
    this.statsContainer.appendChild(statLine);
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
        item.style.backgroundColor = this.isWin ? 'rgba(39, 174, 96, 0.3)' : 'rgba(231, 76, 60, 0.3)';
        item.style.borderColor = this.isWin ? '#27ae60' : '#e74c3c';
        item.style.transform = 'scale(1.05)';
        textElement.style.color = this.isWin ? '#27ae60' : '#e74c3c';
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
  
  public update(data?: Record<string, unknown>): void {
    if (!this.isVisible || !data) return;
    
    // Update score
    const score = (data.score as number) || 0;
    this.scoreElement.textContent = `Final Score: ${score.toLocaleString()}`;
    
    // Update win/lose status
    const playerWon = data.playerWon as boolean;
    if (playerWon !== undefined && playerWon !== this.isWin) {
      this.isWin = playerWon;
      this.updateWinLoseDisplay();
    }
    
    // Update stats
    this.updateStatsDisplay(data);
  }
  
  private updateWinLoseDisplay(): void {
    if (this.isWin) {
      this.titleElement.textContent = 'VICTORY!';
      this.titleElement.style.color = '#27ae60';
      this.element.style.background = 'linear-gradient(135deg, rgba(39, 174, 96, 0.3) 0%, rgba(0, 0, 0, 0.8) 100%)';
    } else {
      this.titleElement.textContent = 'GAME OVER';
      this.titleElement.style.color = '#e74c3c';
      this.element.style.background = 'linear-gradient(135deg, rgba(231, 76, 60, 0.3) 0%, rgba(0, 0, 0, 0.8) 100%)';
    }
    
    // Update menu selection colors
    this.updateSelection();
  }
  
  protected onShow(): void {
    this.selectedOption = 0; // Default to "Play Again"
    this.updateSelection();
    
    // Add entrance animation
    this.element.style.opacity = '0';
    this.element.style.transform = 'scale(0.9)';
    this.element.style.transition = 'all 0.4s ease';
    
    requestAnimationFrame(() => {
      this.element.style.opacity = '1';
      this.element.style.transform = 'scale(1)';
    });
    
    console.log('GameOverScreen shown');
  }
  
  protected onHide(): void {
    console.log('GameOverScreen hidden');
  }
  
  /**
   * Set whether the player won or lost
   */
  public setWinStatus(won: boolean): void {
    this.isWin = won;
    this.updateWinLoseDisplay();
  }
}