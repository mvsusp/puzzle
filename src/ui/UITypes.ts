/**
 * UI Types - Phase 9 Implementation
 * 
 * Shared types and enums for UI components to avoid circular imports
 */

/**
 * UI Component interface - all UI components must implement this
 */
export interface UIComponent {
  element: HTMLElement;
  isVisible: boolean;
  show(): void;
  hide(): void;
  update(data?: Record<string, unknown>): void;
  destroy(): void;
}

/**
 * UI layer z-index management
 */
export enum UILayer {
  BACKGROUND = 100,
  HUD = 200,
  MENU = 300,
  OVERLAY = 400,
  MODAL = 500
}