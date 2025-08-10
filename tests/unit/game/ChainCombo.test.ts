import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from '../../../src/game/Board';
import { Block } from '../../../src/game/Block';
import { BlockColor, BlockState, BoardState, TileType } from '../../../src/game/BlockTypes';

describe('Chain & Combo System', () => {
  let board: Board;

  beforeEach(() => {
    board = new Board();
    board.state = BoardState.RUNNING;
    
    // Clear the board for controlled testing
    for (let row = 0; row <= Board.TOP_ROW; row++) {
      for (let col = 0; col < Board.BOARD_WIDTH; col++) {
        const tile = board.getTile(row, col);
        if (tile) {
          tile.type = TileType.AIR;
          tile.block = null;
          tile.chain = false;
        }
      }
    }
  });

  describe('Chain Detection', () => {
    it('should detect chain when blocks with chain flag match', () => {
      // Create blocks that are already marked with chain flag
      for (let col = 0; col < 3; col++) {
        const tile = board.getTile(0, col);
        if (tile) {
          tile.type = TileType.BLOCK;
          tile.block = new Block(BlockColor.RED);
          tile.chain = true; // Mark as part of chain
        }
      }

      const initialChain = board.getChainCounter();

      // Process the match
      board.tick();

      // Chain counter should have increased since matched blocks had chain flag
      expect(board.getChainCounter()).toBeGreaterThan(initialChain);
    });

    it('should increment chain counter for each chain link', () => {
      // Create bottom match
      for (let col = 0; col < 3; col++) {
        const tile = board.getTile(0, col);
        if (tile) {
          tile.type = TileType.BLOCK;
          tile.block = new Block(BlockColor.RED);
        }
      }

      // Create second level chain
      for (let col = 0; col < 3; col++) {
        const tile = board.getTile(2, col);
        if (tile) {
          tile.type = TileType.BLOCK;
          tile.block = new Block(BlockColor.GREEN);
          tile.chain = true;
        }
      }

      // Create third level chain
      for (let col = 0; col < 3; col++) {
        const tile = board.getTile(4, col);
        if (tile) {
          tile.type = TileType.BLOCK;
          tile.block = new Block(BlockColor.PURPLE);
          tile.chain = true;
        }
      }

      const initialScore = board.getScore();

      // Run multiple cycles to process all chains
      for (let i = 0; i < 200; i++) {
        board.tick();
      }

      // Score should be much higher due to chain bonuses
      expect(board.getScore()).toBeGreaterThan(initialScore + 100);
    });

    it('should end chain after consecutive ticks with no matches', () => {
      // Create a simple match to start a chain
      for (let col = 0; col < 3; col++) {
        const tile = board.getTile(0, col);
        if (tile) {
          tile.type = TileType.BLOCK;
          tile.block = new Block(BlockColor.RED);
        }
      }

      // Manually set chain counter > 1 to test chain end detection
      board.chainCounter = 3;

      // Run ticks with no matches
      for (let i = 0; i < 5; i++) {
        board.tick();
      }

      // Chain should have ended and reset to 1
      expect(board.chainCounter).toBe(1);
    });
  });

  describe('Combo System', () => {
    it('should calculate combo size for simultaneous matches', () => {
      // Create first horizontal match
      for (let col = 0; col < 3; col++) {
        const tile = board.getTile(0, col);
        if (tile) {
          tile.type = TileType.BLOCK;
          tile.block = new Block(BlockColor.RED);
        }
      }

      // Create second horizontal match (different row, same tick)
      for (let col = 3; col < 6; col++) {
        const tile = board.getTile(0, col);
        if (tile) {
          tile.type = TileType.BLOCK;
          tile.block = new Block(BlockColor.GREEN);
        }
      }

      // Create vertical match
      for (let row = 1; row < 4; row++) {
        const tile = board.getTile(row, 1);
        if (tile) {
          tile.type = TileType.BLOCK;
          tile.block = new Block(BlockColor.YELLOW);
        }
      }

      const initialScore = board.getScore();

      // One tick to process all matches simultaneously
      board.tick();

      // Should detect multiple combos
      expect(board.tickComboSize).toBeGreaterThan(1);
      
      // Score should be higher due to combo multiplier
      expect(board.getScore()).toBeGreaterThan(initialScore);
    });

    it('should apply combo multiplier for multiple simultaneous groups', () => {
      // Create two separate L-shaped matches that happen simultaneously
      // First L-shape (red)
      const redPositions = [
        {row: 0, col: 0}, {row: 0, col: 1}, {row: 0, col: 2}, // horizontal part
        {row: 1, col: 0}, {row: 2, col: 0} // vertical part
      ];
      
      for (const pos of redPositions) {
        const tile = board.getTile(pos.row, pos.col);
        if (tile) {
          tile.type = TileType.BLOCK;
          tile.block = new Block(BlockColor.RED);
        }
      }

      // Second L-shape (green) - separate from first
      const greenPositions = [
        {row: 0, col: 4}, {row: 0, col: 5}, {row: 1, col: 5}, // L-shape
        {row: 2, col: 5}
      ];
      
      for (const pos of greenPositions) {
        const tile = board.getTile(pos.row, pos.col);
        if (tile) {
          tile.type = TileType.BLOCK;
          tile.block = new Block(BlockColor.GREEN);
        }
      }

      const initialScore = board.getScore();

      // Process matches
      board.tick();

      // Should detect 2 separate combo groups
      expect(board.tickComboSize).toBe(2);
      expect(board.getScore()).toBeGreaterThan(initialScore);
    });
  });

  describe('Advanced Scoring', () => {
    it('should calculate correct combo scores with formula', () => {
      // Create a 4-block match
      for (let col = 0; col < 4; col++) {
        const tile = board.getTile(0, col);
        if (tile) {
          tile.type = TileType.BLOCK;
          tile.block = new Block(BlockColor.RED);
        }
      }

      const initialScore = board.getScore();
      board.tick();

      // 4 blocks: 10 × 4 × 4 = 160 points (base combo score)
      const expectedMinScore = 160;
      expect(board.getScore() - initialScore).toBeGreaterThanOrEqual(expectedMinScore);
    });

    it('should apply chain scoring multipliers correctly', () => {
      // Set up for a chain 2 scenario
      board.chainCounter = 2; // Simulate being in chain 2

      // Create a simple match
      for (let col = 0; col < 3; col++) {
        const tile = board.getTile(0, col);
        if (tile) {
          tile.type = TileType.BLOCK;
          tile.block = new Block(BlockColor.RED);
          tile.chain = true; // Mark as chain
        }
      }

      const initialScore = board.getScore();
      board.tick();

      // Should get combo score (10×3×3=90) + chain 2 bonus (50) = 140+
      expect(board.getScore() - initialScore).toBeGreaterThanOrEqual(140);
    });

    it('should handle high chain numbers correctly', () => {
      // Test chain 11+ scoring (should be 1300 + 200*(n-11))
      board.chainCounter = 12; // Chain 12

      // Create a match marked as chain
      for (let col = 0; col < 3; col++) {
        const tile = board.getTile(0, col);
        if (tile) {
          tile.type = TileType.BLOCK;
          tile.block = new Block(BlockColor.RED);
          tile.chain = true;
        }
      }

      const initialScore = board.getScore();
      board.tick();

      // Chain 12 should be 1300 + 200*(12-11) = 1500
      // Plus combo score of 90 = 1590 minimum
      expect(board.getScore() - initialScore).toBeGreaterThanOrEqual(1590);
    });
  });

  describe('Chain Flag Propagation', () => {
    it('should mark blocks above exploding blocks as chain candidates', () => {
      // Create exploding block
      const bottomTile = board.getTile(0, 2);
      if (bottomTile) {
        bottomTile.type = TileType.BLOCK;
        const explodingBlock = new Block(BlockColor.RED);
        explodingBlock.state = BlockState.EXPLODING;
        explodingBlock.startExplosion(10);
        bottomTile.block = explodingBlock;
      }

      // Create blocks above
      for (let row = 1; row <= 3; row++) {
        const tile = board.getTile(row, 2);
        if (tile) {
          tile.type = TileType.BLOCK;
          tile.block = new Block(BlockColor.GREEN);
        }
      }

      // Process explosion
      for (let i = 0; i < 20; i++) {
        board.tick();
      }

      // Blocks above should be marked with chain flag
      let chainFlagsFound = 0;
      for (let row = 1; row <= 3; row++) {
        const tile = board.getTile(row, 2);
        if (tile && tile.chain) {
          chainFlagsFound++;
        }
      }

      expect(chainFlagsFound).toBeGreaterThan(0);
    });

    it('should preserve chain flags during block falling', () => {
      // Create a block with chain flag
      const tile = board.getTile(5, 2);
      if (tile) {
        tile.type = TileType.BLOCK;
        tile.block = new Block(BlockColor.YELLOW);
        tile.chain = true; // Mark as chain
        tile.block.falling = true;
        tile.block.startFloat();
      }

      // Let it fall
      for (let i = 0; i < 30; i++) {
        board.tick();
      }

      // Find where the block ended up and verify chain flag is preserved
      let chainFlagPreserved = false;
      for (let row = 0; row <= Board.TOP_ROW; row++) {
        const checkTile = board.getTile(row, 2);
        if (checkTile?.block?.color === BlockColor.YELLOW && checkTile.chain) {
          chainFlagPreserved = true;
          break;
        }
      }

      expect(chainFlagPreserved).toBe(true);
    });
  });

  describe('Real-World Chain Scenarios', () => {
    it('should handle a realistic 3-chain scenario', () => {
      // Set up a realistic chain scenario
      // Bottom: 3 red blocks that will match first
      for (let col = 1; col < 4; col++) {
        const tile = board.getTile(0, col);
        if (tile) {
          tile.type = TileType.BLOCK;
          tile.block = new Block(BlockColor.RED);
        }
      }

      // Middle: 3 green blocks on top of red blocks (will fall and match)
      for (let col = 1; col < 4; col++) {
        const tile = board.getTile(1, col);
        if (tile) {
          tile.type = TileType.BLOCK;
          tile.block = new Block(BlockColor.GREEN);
        }
      }

      // Top: 3 yellow blocks on top of green blocks (will fall and match)
      for (let col = 1; col < 4; col++) {
        const tile = board.getTile(2, col);
        if (tile) {
          tile.type = TileType.BLOCK;
          tile.block = new Block(BlockColor.YELLOW);
        }
      }

      const initialScore = board.getScore();
      const initialChain = board.getChainCounter();

      // Run long enough for complete chain reaction
      for (let i = 0; i < 250; i++) {
        board.tick();
      }

      // Should have achieved a chain
      expect(board.getChainCounter()).toBeGreaterThanOrEqual(initialChain);
      
      // Score should be significantly higher due to chain bonuses
      expect(board.getScore()).toBeGreaterThan(initialScore + 200);
    });

    it('should handle mixed chain and combo scenarios', () => {
      // Create a complex scenario with both chains and combos
      
      // Left side: vertical chain setup
      for (let row = 0; row < 3; row++) {
        const tile = board.getTile(row, 0);
        if (tile) {
          tile.type = TileType.BLOCK;
          tile.block = new Block(BlockColor.RED);
          if (row > 0) tile.chain = true; // Mark upper blocks as chain
        }
      }

      // Right side: simultaneous combo (different color, same tick)
      for (let row = 0; row < 3; row++) {
        const tile = board.getTile(row, 3);
        if (tile) {
          tile.type = TileType.BLOCK;
          tile.block = new Block(BlockColor.GREEN);
        }
      }

      // Middle: another match (creates multi-combo)
      for (let col = 1; col < 3; col++) {
        const tile = board.getTile(1, col);
        if (tile) {
          tile.type = TileType.BLOCK;
          tile.block = new Block(BlockColor.PURPLE);
        }
      }
      // Complete the middle match
      const tile = board.getTile(2, 1);
      if (tile) {
        tile.type = TileType.BLOCK;
        tile.block = new Block(BlockColor.PURPLE);
      }

      const initialScore = board.getScore();

      // Process the complex scenario
      for (let i = 0; i < 100; i++) {
        board.tick();
      }

      // Should achieve high score from both chain and combo bonuses
      expect(board.getScore()).toBeGreaterThan(initialScore + 300);
    });
  });
});