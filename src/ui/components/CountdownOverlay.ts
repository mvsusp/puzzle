/**
 * Countdown Overlay Component - Phase 9 Implementation
 * 
 * Displays the 3-2-1-GO countdown sequence when starting a game.
 * Shows large, animated numbers in the center of the screen.
 */

import { BaseUIComponent } from './BaseUIComponent';
import { UILayer } from '../UITypes';
import { StateManager } from '../../core/StateManager';
import { CountdownState } from '../../core/GameState';

export class CountdownOverlay extends BaseUIComponent {
  private countdownElement!: HTMLElement;
  private currentCountdownState: CountdownState = CountdownState.THREE;
  
  constructor() {
    super(UILayer.OVERLAY);
  }
  
  protected createElement(): HTMLElement {
    const container = this.createStyledContainer({
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: UILayer.OVERLAY.toString()
    });
    
    // Main countdown display
    this.countdownElement = this.createTextElement('3', {
      fontSize: '120px',
      fontWeight: 'bold',
      color: '#f1c40f',
      textAlign: 'center',
      textShadow: '4px 4px 8px rgba(0, 0, 0, 0.8)',
      userSelect: 'none',
      fontFamily: 'monospace'
    });
    
    container.appendChild(this.countdownElement);
    
    return container;
  }
  
  protected setupStyles(): void {
    // Add CSS animation keyframes for countdown effects
    const style = document.createElement('style');
    style.textContent = `
      @keyframes countdownPulse {
        0% { transform: scale(0.5); opacity: 0; }
        50% { transform: scale(1.2); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      
      @keyframes countdownExit {
        0% { transform: scale(1); opacity: 1; }
        100% { transform: scale(1.5); opacity: 0; }
      }
      
      @keyframes goAnimation {
        0% { 
          transform: scale(0.5); 
          opacity: 0; 
          color: #f1c40f;
        }
        30% { 
          transform: scale(1.3); 
          opacity: 1; 
          color: #e74c3c;
        }
        70% { 
          transform: scale(1.1); 
          opacity: 1; 
          color: #27ae60;
        }
        100% { 
          transform: scale(1.5); 
          opacity: 0; 
          color: #27ae60;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  public update(_data?: Record<string, unknown>): void {
    if (!this.isVisible) return;
    
    const stateManager = StateManager.getInstance();
    const countdownState = stateManager.getCountdownState();
    
    if (countdownState !== this.currentCountdownState) {
      this.updateCountdown(countdownState);
      this.currentCountdownState = countdownState;
    }
  }
  
  private updateCountdown(newState: CountdownState): void {
    let displayText: string;
    let color: string;
    let animation: string;
    
    switch (newState) {
      case CountdownState.THREE:
        displayText = '3';
        color = '#e74c3c';
        animation = 'countdownPulse 0.5s ease-in-out';
        break;
      case CountdownState.TWO:
        displayText = '2';
        color = '#f39c12';
        animation = 'countdownPulse 0.5s ease-in-out';
        break;
      case CountdownState.ONE:
        displayText = '1';
        color = '#f1c40f';
        animation = 'countdownPulse 0.5s ease-in-out';
        break;
      case CountdownState.GO:
        displayText = 'GO!';
        color = '#27ae60';
        animation = 'goAnimation 1s ease-in-out';
        
        // Hide after GO animation completes
        setTimeout(() => {
          this.hide();
        }, 1000);
        break;
    }
    
    // Update display
    this.countdownElement.textContent = displayText;
    this.countdownElement.style.color = color;
    this.countdownElement.style.animation = animation;
    
    // Play sound effect (if audio system is available)
    this.playCountdownSound(newState);
    
    console.log('Countdown:', displayText);
  }
  
  private playCountdownSound(state: CountdownState): void {
    // Placeholder for audio system integration
    // Will be implemented in Phase 10 (Audio System)
    
    // For now, just log the sound that should be played
    if (state === CountdownState.GO) {
      console.log('Should play: go.wav');
    } else {
      console.log('Should play: countdown.wav');
    }
  }
  
  protected onShow(): void {
    // Reset to initial state when shown
    this.currentCountdownState = CountdownState.THREE;
    this.countdownElement.textContent = '3';
    this.countdownElement.style.color = '#e74c3c';
    this.countdownElement.style.animation = 'countdownPulse 0.5s ease-in-out';
    
    console.log('CountdownOverlay shown');
  }
  
  protected onHide(): void {
    console.log('CountdownOverlay hidden');
  }
  
  /**
   * Skip countdown and immediately show GO
   */
  public skipToGO(): void {
    this.updateCountdown(CountdownState.GO);
  }
  
  /**
   * Reset countdown to initial state
   */
  public reset(): void {
    this.currentCountdownState = CountdownState.THREE;
    this.countdownElement.textContent = '3';
    this.countdownElement.style.color = '#e74c3c';
    this.countdownElement.style.animation = 'none';
  }
}