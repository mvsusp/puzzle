/**
 * Options Menu Component - Phase 9 Implementation
 * 
 * Settings and options menu for configuring game preferences.
 * Will be expanded in later phases with more options.
 */

import { BaseUIComponent } from './BaseUIComponent';
import { UILayer } from '../UITypes';
import { StateManager } from '../../core/StateManager';
import { StateTransition } from '../../core/GameState';
import { AudioSystem } from '../../audio/AudioSystem';

interface OptionItem {
  label: string;
  type: 'boolean' | 'number' | 'select' | 'action';
  value?: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  action?: () => void;
}

export class OptionsMenu extends BaseUIComponent {
  private menuContainer!: HTMLElement;
  private selectedOption: number = 0;
  private options: OptionItem[] = [];
  private optionElements: HTMLElement[] = [];
  private audioSystem: AudioSystem | null = null;

  constructor(audioSystem?: AudioSystem) {
    // Defer auto init to ensure fields are set before element creation
    super(UILayer.MENU, false);
    this.audioSystem = audioSystem || null;
    this.setupOptions();
    // Ensure the element is created synchronously before usage
    this.init();
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
    const title = this.createTextElement('OPTIONS', {
      fontSize: '36px',
      fontWeight: 'bold',
      color: '#3498db',
      textAlign: 'center',
      marginBottom: '40px',
      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
    });
    container.appendChild(title);

    // Options container
    this.menuContainer = this.createStyledContainer({
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      border: '2px solid #34495e',
      borderRadius: '12px',
      padding: '30px',
      minWidth: '400px',
      maxHeight: '60vh',
      overflowY: 'auto'
    });
    container.appendChild(this.menuContainer);

    // Create option items
    this.createOptionItems();

    // Instructions
    const instructions = this.createTextElement('Arrow Keys to navigate • Left/Right to change • Enter to activate • Escape to go back', {
      position: 'absolute',
      bottom: '40px',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '12px',
      color: '#95a5a6',
      textAlign: 'center',
      maxWidth: '80%'
    });
    container.appendChild(instructions);

    return container;
  }

  private setupOptions(): void {
    this.options = [
      // Display options
      {
        label: 'Show Debug Info',
        type: 'boolean',
        value: false
      },
      {
        label: 'Show FPS',
        type: 'boolean',
        value: true
      },

      // Audio options (Phase 10 - now functional)
      {
        label: 'Master Volume',
        type: 'number',
        value: this.audioSystem ? Math.round(this.audioSystem.getVolume('master') * 100) : 0,
        min: 0,
        max: 100,
        step: 10
      },
      {
        label: 'Music Volume',
        type: 'number',
        value: this.audioSystem ? Math.round(this.audioSystem.getVolume('music') * 100) : 0,
        min: 0,
        max: 100,
        step: 10
      },
      {
        label: 'Sound Effects Volume',
        type: 'number',
        value: this.audioSystem ? Math.round(this.audioSystem.getVolume('sfx') * 100) : 0,
        min: 0,
        max: 100,
        step: 10
      },

      // Gameplay options
      {
        label: 'Auto-raise Speed',
        type: 'select',
        value: 'Normal',
        options: ['Slow', 'Normal', 'Fast', 'Fastest']
      },

      // Controls (placeholder for later implementation)
      {
        label: 'Configure Controls',
        type: 'action',
        action: (): void => {
          console.log('Control configuration not implemented yet');
          // TODO: Implement in Phase 13 (Configuration & Persistence)
        }
      },

      // Reset options
      {
        label: 'Reset to Defaults',
        type: 'action',
        action: () => this.resetToDefaults()
      },

      // Back option
      {
        label: 'Back to Title',
        type: 'action',
        action: () => StateManager.getInstance().requestTransition(StateTransition.BACK_TO_TITLE)
      }
    ];
  }

  private createOptionItems(): void {
    this.options.forEach((option, index): void => {
      const optionElement = this.createOptionElement(option, index);
      this.menuContainer.appendChild(optionElement);
      this.optionElements.push(optionElement);
    });

    this.updateSelection();
  }

  private createOptionElement(option: OptionItem, _index: number): HTMLElement {
    const container = this.createStyledContainer({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 16px',
      marginBottom: '8px',
      backgroundColor: 'transparent',
      border: '2px solid transparent',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    });

    // Label
    const label = this.createTextElement(option.label, {
      fontSize: '16px',
      color: '#ecf0f1',
      flexGrow: '1'
    });
    container.appendChild(label);

    // Value display
    const valueContainer = this.createStyledContainer({
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    });

    switch (option.type) {
      case 'boolean': {
        const toggle = this.createToggle(option.value as boolean);
        valueContainer.appendChild(toggle);
        break;
      }

      case 'number': {
        const numberDisplay = this.createNumberDisplay(option);
        valueContainer.appendChild(numberDisplay);
        break;
      }

      case 'select': {
        const selectDisplay = this.createSelectDisplay(option);
        valueContainer.appendChild(selectDisplay);
        break;
      }

      case 'action': {
        const actionButton = this.createTextElement('►', {
          fontSize: '16px',
          color: '#3498db',
          fontWeight: 'bold'
        });
        valueContainer.appendChild(actionButton);
        break;
      }
    }

    container.appendChild(valueContainer);

    return container;
  }

  private createToggle(value: boolean): HTMLElement {
    const toggle = this.createStyledContainer({
      width: '40px',
      height: '20px',
      backgroundColor: value ? '#27ae60' : '#7f8c8d',
      borderRadius: '10px',
      position: 'relative',
      transition: 'background-color 0.3s ease'
    });

    const knob = this.createStyledContainer({
      width: '16px',
      height: '16px',
      backgroundColor: 'white',
      borderRadius: '50%',
      position: 'absolute',
      top: '2px',
      left: value ? '22px' : '2px',
      transition: 'left 0.3s ease'
    });

    toggle.appendChild(knob);
    return toggle;
  }

  private createNumberDisplay(option: OptionItem): HTMLElement {
    const container = this.createStyledContainer({
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    });

    const leftArrow = this.createTextElement('◄', {
      fontSize: '12px',
      color: '#95a5a6',
      cursor: 'pointer'
    });

    const value = this.createTextElement(option.value?.toString() || '0', {
      fontSize: '16px',
      color: '#3498db',
      fontWeight: 'bold',
      minWidth: '40px',
      textAlign: 'center'
    });

    const rightArrow = this.createTextElement('►', {
      fontSize: '12px',
      color: '#95a5a6',
      cursor: 'pointer'
    });

    container.appendChild(leftArrow);
    container.appendChild(value);
    container.appendChild(rightArrow);

    return container;
  }

  private createSelectDisplay(option: OptionItem): HTMLElement {
    const container = this.createStyledContainer({
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    });

    const leftArrow = this.createTextElement('◄', {
      fontSize: '12px',
      color: '#95a5a6'
    });

    const value = this.createTextElement(option.value?.toString() || '', {
      fontSize: '16px',
      color: '#3498db',
      fontWeight: 'bold',
      minWidth: '80px',
      textAlign: 'center'
    });

    const rightArrow = this.createTextElement('►', {
      fontSize: '12px',
      color: '#95a5a6'
    });

    container.appendChild(leftArrow);
    container.appendChild(value);
    container.appendChild(rightArrow);

    return container;
  }

  protected setupEventListeners(): void {
    document.addEventListener('keydown', (event) => {
      if (!this.isVisible) return;

      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          event.preventDefault();
          this.selectedOption = (this.selectedOption - 1 + this.options.length) % this.options.length;
          this.updateSelection();
          break;

        case 'ArrowDown':
        case 'KeyS':
          event.preventDefault();
          this.selectedOption = (this.selectedOption + 1) % this.options.length;
          this.updateSelection();
          break;

        case 'ArrowLeft':
        case 'KeyA':
          event.preventDefault();
          this.changeOptionValue(-1);
          break;

        case 'ArrowRight':
        case 'KeyD':
          event.preventDefault();
          this.changeOptionValue(1);
          break;

        case 'Enter':
        case 'Space':
          event.preventDefault();
          this.activateOption();
          break;

        case 'Escape':
          event.preventDefault();
          StateManager.getInstance().requestTransition(StateTransition.BACK_TO_TITLE);
          break;
      }
    });
  }

  private updateSelection(): void {
    this.optionElements.forEach((element, index) => {
      const isSelected = index === this.selectedOption;

      if (isSelected) {
        element.style.backgroundColor = 'rgba(52, 152, 219, 0.3)';
        element.style.borderColor = '#3498db';
        element.style.transform = 'translateX(5px)';
      } else {
        element.style.backgroundColor = 'transparent';
        element.style.borderColor = 'transparent';
        element.style.transform = 'translateX(0)';
      }
    });
  }

  private changeOptionValue(direction: number): void {
    const option = this.options[this.selectedOption];

    switch (option.type) {
      case 'boolean': {
        option.value = !option.value;
        this.updateOptionDisplay();
        break;
      }

      case 'number': {
        const currentNum = option.value as number;
        const step = option.step || 1;
        const min = option.min || 0;
        const max = option.max || 100;

        let newValue = currentNum + (direction * step);
        newValue = Math.max(min, Math.min(max, newValue));
        option.value = newValue;
        this.updateOptionDisplay();

        // Apply audio settings immediately
        this.applyAudioSetting(option.label, newValue);
        break;
      }

      case 'select': {
        const options = option.options || [];
        const currentIndex = options.indexOf(option.value as string);
        const newIndex = (currentIndex + direction + options.length) % options.length;
        option.value = options[newIndex];
        this.updateOptionDisplay();
        break;
      }
    }
  }

  private activateOption(): void {
    const option = this.options[this.selectedOption];

    if (option.type === 'action' && option.action) {
      option.action();
    } else if (option.type === 'boolean') {
      this.changeOptionValue(1);
    }
  }

  private updateOptionDisplay(): void {
    // Remove and recreate all option elements
    this.menuContainer.innerHTML = '';
    this.optionElements = [];
    this.createOptionItems();
  }

  /**
   * Apply audio setting changes immediately
   */
  private applyAudioSetting(label: string, value: number): void {
    if (!this.audioSystem) return;

    const normalizedValue = value / 100; // Convert from 0-100 to 0-1

    switch (label) {
      case 'Master Volume':
        this.audioSystem.setVolume('master', normalizedValue);
        break;
      case 'Music Volume':
        this.audioSystem.setVolume('music', normalizedValue);
        break;
      case 'Sound Effects Volume':
        this.audioSystem.setVolume('sfx', normalizedValue);
        // Play a test sound effect to preview the new volume
        this.audioSystem.playSfx('cursor');
        break;
    }
  }

  private resetToDefaults(): void {
    // Reset all options to default values
    this.options[0].value = false; // Show Debug Info
    this.options[1].value = true;  // Show FPS
    this.options[2].value = 0;    // Master Volume
    this.options[3].value = 0;    // Music Volume
    this.options[4].value = 0;    // Sound Effects Volume
    this.options[5].value = 'Normal'; // Auto-raise Speed

    // Apply default audio settings
    if (this.audioSystem) {
      this.audioSystem.setVolume('master', 0);
      this.audioSystem.setVolume('music', 0);
      this.audioSystem.setVolume('sfx', 0);
    }

    this.updateOptionDisplay();
    console.log('Options reset to defaults');
  }

  public update(_data?: Record<string, unknown>): void {
    // Options menu doesn't need real-time updates
  }

  protected onShow(): void {
    this.selectedOption = 0;
    this.updateSelection();
    console.log('OptionsMenu shown');
  }

  protected onHide(): void {
    console.log('OptionsMenu hidden');
  }

  /**
   * Get option value by label
   */
  public getOptionValue(label: string): unknown {
    const option = this.options.find(opt => opt.label === label);
    return option?.value;
  }

  /**
   * Set option value by label
   */
  public setOptionValue(label: string, value: unknown): void {
    const option = this.options.find(opt => opt.label === label);
    if (option) {
      option.value = value;
      this.updateOptionDisplay();
    }
  }
}