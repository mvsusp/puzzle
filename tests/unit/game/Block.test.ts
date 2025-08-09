import { describe, it, expect, beforeEach } from 'vitest';
import { Block } from '../../../src/game/Block';
import { BlockState, BlockColor } from '../../../src/game/BlockTypes';

describe('Block', () => {
  let block: Block;

  beforeEach(() => {
    block = new Block(BlockColor.PURPLE);
  });

  describe('Initialization', () => {
    it('should create block with specified color', () => {
      expect(block.color).toBe(BlockColor.PURPLE);
      expect(block.state).toBe(BlockState.NORMAL);
    });

    it('should initialize with default properties', () => {
      expect(block.falling).toBe(false);
      expect(block.floatTimer).toBe(0);
      expect(block.swapTimer).toBe(0);
      expect(block.garbageFallChain).toBe(false);
      expect(block.explosionOrder).toBe(0);
      expect(block.explosionTicks).toBe(0);
      expect(block.explosionTimer).toBe(0);
      expect(block.mesh).toBeNull();
    });
  });

  describe('Static Methods', () => {
    it('should generate random colors', () => {
      const color = Block.getRandomColor();
      expect(color).toBeGreaterThanOrEqual(0);
      expect(color).toBeLessThan(5);
    });

    it('should exclude specified colors when generating random', () => {
      const excludeColors = [BlockColor.PURPLE, BlockColor.YELLOW];
      
      // Generate many colors to test exclusion
      for (let i = 0; i < 50; i++) {
        const color = Block.getRandomColor(excludeColors);
        expect(excludeColors).not.toContain(color);
      }
    });

    it('should fallback to any color if all colors excluded', () => {
      const allColors = [BlockColor.PURPLE, BlockColor.YELLOW, BlockColor.RED, BlockColor.CYAN, BlockColor.GREEN];
      const color = Block.getRandomColor(allColors);
      expect(color).toBeGreaterThanOrEqual(0);
      expect(color).toBeLessThan(5);
    });
  });

  describe('State Management', () => {
    it('should start float state correctly', () => {
      block.startFloat();
      expect(block.state).toBe(BlockState.FLOATING);
      expect(block.floatTimer).toBe(12);
    });

    it('should start swap animation correctly', () => {
      block.startSwap('left');
      expect(block.state).toBe(BlockState.SWAPPING_LEFT);
      expect(block.swapTimer).toBe(3);

      const rightBlock = new Block(BlockColor.RED);
      rightBlock.startSwap('right');
      expect(rightBlock.state).toBe(BlockState.SWAPPING_RIGHT);
      expect(rightBlock.swapTimer).toBe(3);
    });

    it('should mark for matching correctly', () => {
      block.markMatched();
      expect(block.state).toBe(BlockState.MATCHED);
    });

    it('should start explosion correctly', () => {
      block.startExplosion(100);
      expect(block.state).toBe(BlockState.EXPLODING);
      expect(block.explosionTicks).toBe(100);
      expect(block.explosionAnimationTicks).toBe(100);
      expect(block.explosionTimer).toBe(0);
    });

    it('should use default explosion ticks if not specified', () => {
      block.startExplosion();
      expect(block.explosionTicks).toBe(61);
    });
  });

  describe('State Queries', () => {
    it('should correctly identify matchable blocks', () => {
      expect(block.canMatch()).toBe(true);
      
      block.state = BlockState.FLOATING;
      expect(block.canMatch()).toBe(false);
      
      block.state = BlockState.NORMAL;
      block.falling = true;
      expect(block.canMatch()).toBe(false);
    });

    it('should correctly identify stable blocks', () => {
      expect(block.isStable()).toBe(true);
      
      block.state = BlockState.FLOATING;
      expect(block.isStable()).toBe(false);
      
      block.state = BlockState.NORMAL;
      block.falling = true;
      expect(block.isStable()).toBe(false);
    });

    it('should correctly identify animating blocks', () => {
      expect(block.isAnimating()).toBe(false);
      
      block.state = BlockState.SWAPPING_LEFT;
      expect(block.isAnimating()).toBe(true);
      
      block.state = BlockState.SWAPPING_RIGHT;
      expect(block.isAnimating()).toBe(true);
      
      block.state = BlockState.FLOATING;
      expect(block.isAnimating()).toBe(true);
      
      block.state = BlockState.EXPLODING;
      expect(block.isAnimating()).toBe(true);
    });
  });

  describe('Tick Behavior', () => {
    it('should handle float timer countdown', () => {
      block.startFloat();
      expect(block.floatTimer).toBe(12);
      expect(block.state).toBe(BlockState.FLOATING);
      
      // Tick until float timer expires
      for (let i = 0; i < 12; i++) {
        block.tick();
        if (i < 11) {
          expect(block.state).toBe(BlockState.FLOATING);
        }
      }
      
      expect(block.state).toBe(BlockState.NORMAL);
      expect(block.floatTimer).toBe(0);
    });

    it('should handle swap timer countdown and transition to float', () => {
      block.startSwap('left');
      expect(block.swapTimer).toBe(3);
      expect(block.state).toBe(BlockState.SWAPPING_LEFT);
      
      // Tick until swap timer expires
      for (let i = 0; i < 3; i++) {
        block.tick();
        if (i < 2) {
          expect(block.state).toBe(BlockState.SWAPPING_LEFT);
        }
      }
      
      expect(block.state).toBe(BlockState.FLOATING);
      expect(block.floatTimer).toBe(12);
      expect(block.swapTimer).toBe(0);
    });

    it('should handle explosion timer increment', () => {
      block.startExplosion(100);
      expect(block.explosionTimer).toBe(0);
      
      block.tick();
      expect(block.explosionTimer).toBe(1);
      
      block.tick();
      block.tick();
      expect(block.explosionTimer).toBe(3);
    });

    it('should not increment explosion timer beyond explosion ticks', () => {
      block.startExplosion(5);
      
      // Tick more than explosion duration
      for (let i = 0; i < 10; i++) {
        block.tick();
      }
      
      expect(block.explosionTimer).toBe(5); // Should not exceed explosionTicks
    });
  });

  describe('Reset and Cleanup', () => {
    it('should reset all properties correctly', () => {
      // Modify block state
      block.state = BlockState.EXPLODING;
      block.falling = true;
      block.floatTimer = 5;
      block.swapTimer = 2;
      block.garbageFallChain = true;
      block.explosionOrder = 3;
      block.explosionTicks = 100;
      block.explosionTimer = 50;
      
      block.reset();
      
      expect(block.state).toBe(BlockState.NORMAL);
      expect(block.falling).toBe(false);
      expect(block.floatTimer).toBe(0);
      expect(block.swapTimer).toBe(0);
      expect(block.garbageFallChain).toBe(false);
      expect(block.explosionOrder).toBe(0);
      expect(block.explosionTicks).toBe(0);
      expect(block.explosionTimer).toBe(0);
    });

    it('should dispose resources without error', () => {
      expect(() => block.dispose()).not.toThrow();
    });
  });

  describe('String Representation', () => {
    it('should provide meaningful toString output', () => {
      const str = block.toString();
      expect(str).toContain('Block');
      expect(str).toContain('PURPLE');
      expect(str).toContain('normal');
    });
  });
});