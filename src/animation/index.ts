// Phase 6: Animation System
// Export all animation components for easy importing

export { TweenSystem, AnimationHelpers, EasingType } from './TweenSystem';
export type { AnimationTarget, TweenConfig, Tween } from './TweenSystem';

export { BlockAnimator } from './BlockAnimator';
export type { BlockAnimationState } from './BlockAnimator';

export { StackAnimator, StackRiseEffects } from './StackAnimator';
export type { StackRiseState } from './StackAnimator';

export { CursorAnimator } from './CursorAnimator';
export type { CursorAnimationState } from './CursorAnimator';

export { AnimationManager } from './AnimationManager';
export type { AnimationConfig } from './AnimationManager';

// Enhanced renderer with animation support
export { EnhancedBoardRenderer } from '../rendering/EnhancedBoardRenderer';