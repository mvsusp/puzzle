export enum BlockState {
  NORMAL = 'normal',
  FLOATING = 'floating',
  MATCHED = 'matched',
  EXPLODING = 'exploding',
  SWAPPING_LEFT = 'swapping_left',
  SWAPPING_RIGHT = 'swapping_right'
}

export enum BlockColor {
  PURPLE = 0,
  YELLOW = 1,
  RED = 2,
  CYAN = 3,
  GREEN = 4
}

export enum BoardState {
  COUNTDOWN = 'countdown',
  RUNNING = 'running',
  WON = 'won',
  GAME_OVER = 'game_over'
}

export enum TileType {
  AIR = 'air',
  BLOCK = 'block',
  GARBAGE = 'garbage'
}

// Color mapping for rendering
export const BLOCK_COLORS = {
  [BlockColor.PURPLE]: 0x8e44ad,
  [BlockColor.YELLOW]: 0xf1c40f,
  [BlockColor.RED]: 0xe74c3c,
  [BlockColor.CYAN]: 0x3498db,
  [BlockColor.GREEN]: 0x27ae60,
} as const;

// Color names for debugging
export const BLOCK_COLOR_NAMES = {
  [BlockColor.PURPLE]: 'Purple',
  [BlockColor.YELLOW]: 'Yellow',
  [BlockColor.RED]: 'Red',
  [BlockColor.CYAN]: 'Cyan',
  [BlockColor.GREEN]: 'Green',
} as const;