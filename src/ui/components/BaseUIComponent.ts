/**
 * Base UI Component - Phase 9 Implementation
 * 
 * Base class for all UI components providing common functionality
 * for visibility, styling, event handling, and lifecycle management.
 */

import { UIComponent, UILayer } from '../UITypes';

export abstract class BaseUIComponent implements UIComponent {
  public element!: HTMLElement;
  public isVisible: boolean = false;
  
  protected container!: HTMLElement;
  protected layer: UILayer;
  
  constructor(layer: UILayer = UILayer.HUD, autoInit: boolean = true) {
    this.layer = layer;
    if (autoInit) {
      this.init();
    }
  }
  
  /**
   * Initialize the component after construction
   */
  public init(): void {
    if (this.element) return; // Already initialized
    
    this.element = this.createElement();
    this.container = this.element;
    this.setupStyles();
    this.setupEventListeners();
  }
  
  /**
   * Create the container element
   */
  protected createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      pointer-events: auto;
      z-index: ${this.layer + 1000};
    `;
    return container;
  }
  
  /**
   * Create the main element - must be implemented by subclasses
   */
  protected abstract createElement(): HTMLElement;
  
  /**
   * Setup component styles - can be overridden by subclasses
   */
  protected setupStyles(): void {
    // Default styles - can be overridden
  }
  
  /**
   * Setup event listeners - can be overridden by subclasses
   */
  protected setupEventListeners(): void {
    // Default event listeners - can be overridden
  }
  
  /**
   * Show the component
   */
  public show(): void {
    this.element.style.display = 'block';
    this.isVisible = true;
    this.onShow();
  }
  
  /**
   * Hide the component
   */
  public hide(): void {
    this.element.style.display = 'none';
    this.isVisible = false;
    this.onHide();
  }
  
  /**
   * Update component - must be implemented by subclasses
   */
  public abstract update(data?: Record<string, unknown>): void;
  
  /**
   * Called when component is shown - can be overridden
   */
  protected onShow(): void {
    // Override in subclasses
  }
  
  /**
   * Called when component is hidden - can be overridden
   */
  protected onHide(): void {
    // Override in subclasses
  }
  
  /**
   * Set position of the component
   */
  protected setPosition(x: number, y: number): void {
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
  }
  
  /**
   * Set size of the component
   */
  protected setSize(width: number, height: number): void {
    this.element.style.width = `${width}px`;
    this.element.style.height = `${height}px`;
  }
  
  /**
   * Center the component horizontally
   */
  protected centerHorizontally(): void {
    this.element.style.left = '50%';
    this.element.style.transform = 'translateX(-50%)';
  }
  
  /**
   * Center the component vertically
   */
  protected centerVertically(): void {
    this.element.style.top = '50%';
    this.element.style.transform = 'translateY(-50%)';
  }
  
  /**
   * Center the component both horizontally and vertically
   */
  protected center(): void {
    this.element.style.left = '50%';
    this.element.style.top = '50%';
    this.element.style.transform = 'translate(-50%, -50%)';
  }
  
  /**
   * Add a CSS class to the element
   */
  protected addClass(className: string): void {
    this.element.classList.add(className);
  }
  
  /**
   * Remove a CSS class from the element
   */
  protected removeClass(className: string): void {
    this.element.classList.remove(className);
  }
  
  /**
   * Toggle a CSS class on the element
   */
  protected toggleClass(className: string): void {
    this.element.classList.toggle(className);
  }
  
  /**
   * Set opacity of the component
   */
  protected setOpacity(opacity: number): void {
    this.element.style.opacity = opacity.toString();
  }
  
  /**
   * Animate opacity
   */
  protected fadeIn(duration: number = 300): Promise<void> {
    return new Promise((resolve) => {
      this.element.style.transition = `opacity ${duration}ms ease`;
      this.element.style.opacity = '1';
      setTimeout(resolve, duration);
    });
  }
  
  /**
   * Animate opacity out
   */
  protected fadeOut(duration: number = 300): Promise<void> {
    return new Promise((resolve) => {
      this.element.style.transition = `opacity ${duration}ms ease`;
      this.element.style.opacity = '0';
      setTimeout(resolve, duration);
    });
  }
  
  /**
   * Create a text element with styling
   */
  protected createTextElement(text: string, styles?: Partial<CSSStyleDeclaration>): HTMLElement {
    const element = document.createElement('div');
    element.textContent = text;
    
    // Default text styles
    element.style.fontFamily = 'monospace';
    element.style.color = 'white';
    element.style.textAlign = 'center';
    element.style.userSelect = 'none';
    
    // Apply custom styles
    if (styles) {
      Object.assign(element.style, styles);
    }
    
    return element;
  }
  
  /**
   * Create a button element with styling
   */
  protected createButton(text: string, onClick: () => void, styles?: Partial<CSSStyleDeclaration>): HTMLElement {
    const button = document.createElement('button');
    button.textContent = text;
    button.onclick = onClick;
    
    // Default button styles
    button.style.fontFamily = 'monospace';
    button.style.backgroundColor = '#333';
    button.style.color = 'white';
    button.style.border = '2px solid #555';
    button.style.padding = '10px 20px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '14px';
    button.style.transition = 'all 0.2s ease';
    
    // Hover effects
    button.onmouseenter = (): void => {
      button.style.backgroundColor = '#555';
      button.style.borderColor = '#777';
    };
    
    button.onmouseleave = (): void => {
      button.style.backgroundColor = '#333';
      button.style.borderColor = '#555';
    };
    
    // Apply custom styles
    if (styles) {
      Object.assign(button.style, styles);
    }
    
    return button;
  }
  
  /**
   * Create a styled container div
   */
  protected createStyledContainer(styles?: Partial<CSSStyleDeclaration>): HTMLElement {
    const container = document.createElement('div');
    
    // Default container styles
    container.style.position = 'relative';
    container.style.boxSizing = 'border-box';
    
    // Apply custom styles safely
    if (styles) {
      for (const [key, value] of Object.entries(styles)) {
        if (value !== undefined && value !== null) {
          (container.style as unknown as Record<string, string>)[key] = String(value);
        }
      }
    }
    
    return container;
  }
  
  /**
   * Cleanup and destroy the component
   */
  public destroy(): void {
    this.element.remove();
    this.isVisible = false;
  }
}