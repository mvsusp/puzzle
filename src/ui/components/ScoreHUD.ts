/**
 * Score HUD Component - Phase 9 Implementation
 * 
 * Displays real-time score, chain counter, and other game statistics
 * during gameplay. Updates automatically with board state.
 */

import { BaseUIComponent } from './BaseUIComponent';
import { UILayer } from '../UITypes';
import { StateManager } from '../../core/StateManager';

export class ScoreHUD extends BaseUIComponent {
  private scoreElement!: HTMLElement;
  private chainElement!: HTMLElement;
  private comboElement!: HTMLElement;
  private timeElement!: HTMLElement;
  
  // Data tracking
  private currentScore: number = 0;
  private currentChain: number = 1;
  private currentCombo: number = 0;
  private gameTime: number = 0;
  
  constructor() {
    super(UILayer.HUD);
  }
  
  protected createElement(): HTMLElement {
    const container = this.createStyledContainer({
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '200px',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      border: '2px solid #333',
      borderRadius: '8px',
      padding: '15px',
      fontFamily: 'monospace',
      fontSize: '12px'
    });
    
    // Title
    const title = this.createTextElement('SCORE', {
      fontSize: '16px',
      fontWeight: 'bold',
      marginBottom: '10px',
      textAlign: 'center',
      borderBottom: '1px solid #555',
      paddingBottom: '5px'
    });
    container.appendChild(title);
    
    // Score display
    this.scoreElement = this.createTextElement('0', {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#f1c40f',
      textAlign: 'center',
      marginBottom: '8px'
    });
    container.appendChild(this.scoreElement);
    
    // Chain display
    const chainContainer = this.createStyledContainer({
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '5px'
    });
    chainContainer.appendChild(this.createTextElement('Chain:', { fontSize: '11px' }));
    this.chainElement = this.createTextElement('1', { 
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#3498db'
    });
    chainContainer.appendChild(this.chainElement);
    container.appendChild(chainContainer);
    
    // Combo display
    const comboContainer = this.createStyledContainer({
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '5px'
    });
    comboContainer.appendChild(this.createTextElement('Combo:', { fontSize: '11px' }));
    this.comboElement = this.createTextElement('0', { 
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#e74c3c'
    });
    comboContainer.appendChild(this.comboElement);
    container.appendChild(comboContainer);
    
    // Time display
    const timeContainer = this.createStyledContainer({
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '8px',
      paddingTop: '8px',
      borderTop: '1px solid #555'
    });
    timeContainer.appendChild(this.createTextElement('Time:', { fontSize: '11px' }));
    this.timeElement = this.createTextElement('00:00', { 
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#27ae60'
    });
    timeContainer.appendChild(this.timeElement);
    container.appendChild(timeContainer);
    
    return container;
  }
  
  public update(data?: Record<string, unknown>): void {
    if (!this.isVisible) return;
    
    const stateManager = StateManager.getInstance();
    
    // Get data from state manager or passed data
    const score = (data?.score as number) ?? stateManager.getStateData().score ?? 0;
    const chain = (data?.chain as number) ?? 1;
    const combo = (data?.combo as number) ?? 0;
    const time = (data?.time as number) ?? this.gameTime;
    
    // Update score with animation if it changed significantly
    if (score !== this.currentScore) {
      this.updateScore(score);
    }
    
    // Update chain with color coding
    if (chain !== this.currentChain) {
      this.updateChain(chain);
    }
    
    // Update combo
    if (combo !== this.currentCombo) {
      this.updateCombo(combo);
    }
    
    // Update time
    this.updateTime(time);
    
    // Increment game time
    this.gameTime++;
  }
  
  private updateScore(newScore: number): void {
    const difference = newScore - this.currentScore;
    this.currentScore = newScore;
    
    // Format score with commas
    const formattedScore = newScore.toLocaleString();
    this.scoreElement.textContent = formattedScore;
    
    // Show score increase animation if significant
    if (difference > 0 && difference >= 100) {
      this.animateScoreIncrease(difference);
    }
  }
  
  private updateChain(newChain: number): void {
    this.currentChain = newChain;
    this.chainElement.textContent = newChain.toString();
    
    // Color code chain based on length
    if (newChain >= 4) {
      this.chainElement.style.color = '#e74c3c'; // Red for high chains
    } else if (newChain >= 2) {
      this.chainElement.style.color = '#f39c12'; // Orange for medium chains
    } else {
      this.chainElement.style.color = '#3498db'; // Blue for no chain
    }
    
    // Animate chain increases
    if (newChain > 1) {
      this.animateChainIncrease();
    }
  }
  
  private updateCombo(newCombo: number): void {
    this.currentCombo = newCombo;
    this.comboElement.textContent = newCombo.toString();
    
    // Animate combo if > 1
    if (newCombo > 1) {
      this.animateCombo();
    }
  }
  
  private updateTime(ticks: number): void {
    const seconds = Math.floor(ticks / 60);
    const minutes = Math.floor(seconds / 60);
    const displaySeconds = seconds % 60;
    
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`;
    this.timeElement.textContent = formattedTime;
  }
  
  private animateScoreIncrease(increase: number): void {
    // Create floating score increase indicator
    const scorePopup = this.createTextElement(`+${increase.toLocaleString()}`, {
      position: 'absolute',
      top: '0px',
      right: '-50px',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#f1c40f',
      pointerEvents: 'none',
      zIndex: '1000'
    });
    
    this.element.appendChild(scorePopup);
    
    // Animate upward and fade out
    let y = 0;
    let opacity = 1;
    const animate = (): void => {
      y -= 2;
      opacity -= 0.05;
      scorePopup.style.top = `${y}px`;
      scorePopup.style.opacity = opacity.toString();
      
      if (opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        scorePopup.remove();
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  private animateChainIncrease(): void {
    // Pulse animation for chain element
    this.chainElement.style.transform = 'scale(1.2)';
    this.chainElement.style.transition = 'transform 0.2s ease';
    
    setTimeout(() => {
      this.chainElement.style.transform = 'scale(1)';
    }, 200);
  }
  
  private animateCombo(): void {
    // Brief flash animation for combo
    const originalColor = this.comboElement.style.color;
    this.comboElement.style.color = '#ffffff';
    this.comboElement.style.transition = 'color 0.1s ease';
    
    setTimeout(() => {
      this.comboElement.style.color = originalColor;
    }, 100);
  }
  
  protected onShow(): void {
    // Reset time when shown
    this.gameTime = 0;
    console.log('ScoreHUD shown');
  }
  
  protected onHide(): void {
    console.log('ScoreHUD hidden');
  }
  
  /**
   * Reset the HUD for a new game
   */
  public reset(): void {
    this.currentScore = 0;
    this.currentChain = 1;
    this.currentCombo = 0;
    this.gameTime = 0;
    
    this.scoreElement.textContent = '0';
    this.chainElement.textContent = '1';
    this.comboElement.textContent = '0';
    this.timeElement.textContent = '00:00';
    
    // Reset colors
    this.chainElement.style.color = '#3498db';
  }
}