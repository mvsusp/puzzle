/**
 * Centralized block dimension constants for the new 108x103 pixel blocks
 */

export const BlockDimensions = {
  // Individual block dimensions
  BLOCK_WIDTH: 108,
  BLOCK_HEIGHT: 103,
  
  // Gap between blocks
  BLOCK_GAP: 10,
  
  // Total tile size including gap
  TILE_SIZE_X: 118, // 108 + 10
  TILE_SIZE_Y: 113, // 103 + 10
  
  // Legacy tile size for backward compatibility
  LEGACY_TILE_SIZE: 32,
} as const;

// Calculate board pixel dimensions based on block dimensions
export const BoardDimensions = {
  // Board dimensions in tiles
  BOARD_WIDTH: 6,
  BOARD_HEIGHT: 24,
  TOP_ROW: 11,
  
  // Calculate pixel dimensions with gaps
  // Width: (108 * 6) + (10 * 5) = 648 + 50 = 698
  BOARD_PIXEL_WIDTH: (BlockDimensions.BLOCK_WIDTH * 6) + (BlockDimensions.BLOCK_GAP * 5),
  
  // Height for visible area: (103 * 12) + (10 * 11) = 1236 + 110 = 1346
  BOARD_PIXEL_HEIGHT: (BlockDimensions.BLOCK_HEIGHT * 12) + (BlockDimensions.BLOCK_GAP * 11),
  
  // Full board height including buffer
  FULL_BOARD_PIXEL_HEIGHT: (BlockDimensions.BLOCK_HEIGHT * 24) + (BlockDimensions.BLOCK_GAP * 23),
} as const;

// Helper function to calculate block position with gaps
export function getBlockPosition(row: number, col: number): { x: number; y: number } {
  // Calculate position including gaps
  const x = col * BlockDimensions.TILE_SIZE_X - (BoardDimensions.BOARD_PIXEL_WIDTH / 2) + (BlockDimensions.BLOCK_WIDTH / 2);
  const y = row * BlockDimensions.TILE_SIZE_Y - (BoardDimensions.BOARD_PIXEL_HEIGHT / 2) + (BlockDimensions.BLOCK_HEIGHT / 2);
  
  return { x, y };
}

// Helper function to get cursor dimensions (2 blocks wide)
export function getCursorDimensions(): { width: number; height: number } {
  // Cursor spans 2 blocks plus the gap between them
  const width = (BlockDimensions.BLOCK_WIDTH * 2) + BlockDimensions.BLOCK_GAP;
  const height = BlockDimensions.BLOCK_HEIGHT;
  
  return { width, height };
}

// Animation scaling factors based on new dimensions vs old
export const AnimationScaling = {
  // Horizontal scaling: 118 / 32 = 3.6875
  HORIZONTAL_SCALE: BlockDimensions.TILE_SIZE_X / BlockDimensions.LEGACY_TILE_SIZE,
  
  // Vertical scaling: 113 / 32 = 3.53125
  VERTICAL_SCALE: BlockDimensions.TILE_SIZE_Y / BlockDimensions.LEGACY_TILE_SIZE,
  
  // Average scale for effects: ~3.6
  EFFECT_SCALE: 3.6,
} as const;