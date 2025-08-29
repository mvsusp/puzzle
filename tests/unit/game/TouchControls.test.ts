import { describe, it, expect, vi } from 'vitest';
import { Board } from '../../../src/game/Board';
import { Cursor } from '../../../src/game/Cursor';
import { GameController } from '../../../src/game/GameController';
import { BlockDimensions, BoardDimensions } from '../../../src/rendering/BlockConstants';

// Helper to create bounding rect
function createRect(width: number, height: number) {
  return {
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    width,
    height,
    x: 0,
    y: 0,
    toJSON() { return {}; }
  } as DOMRect;
}

describe('Touch controls', () => {
  it('moves cursor on pointerdown and swaps on click', () => {
    const board = new Board();
    const cursor = new Cursor(board, BlockDimensions.TILE_SIZE_Y); // same as main
    const canvas = document.createElement('canvas');
    canvas.width = BoardDimensions.BOARD_PIXEL_WIDTH + 200;
    canvas.height = BoardDimensions.BOARD_PIXEL_HEIGHT + 100;
    canvas.getBoundingClientRect = () => createRect(canvas.width, canvas.height);

    const controller = new GameController(board, cursor, undefined, canvas);

    // Target tile
    const tileX = 1;
    const tileY = 2;
    const worldWidth = BoardDimensions.BOARD_PIXEL_WIDTH + 200;
    const worldHeight = BoardDimensions.BOARD_PIXEL_HEIGHT + 100;
    const boardLeft = -100 - BoardDimensions.BOARD_PIXEL_WIDTH / 2;
    const boardBottom = -BoardDimensions.BOARD_PIXEL_HEIGHT / 2;
    const worldX = boardLeft + tileX * BlockDimensions.TILE_SIZE_X + 1;
    const worldY = boardBottom + tileY * BlockDimensions.TILE_SIZE_Y + 1;
    const ndcX = worldX / (worldWidth / 2);
    const ndcY = worldY / (worldHeight / 2);
    const clientX = ((ndcX + 1) / 2) * canvas.width;
    const clientY = ((1 - ndcY) / 2) * canvas.height;

    (controller as unknown as { handlePointerDown: (e: PointerEvent) => void }).handlePointerDown(
      new PointerEvent('pointerdown', { clientX, clientY })
    );
    expect(cursor.getTargetPosition()).toEqual({ x: tileX, y: tileY });

    // Click should not throw
    expect(() => {
      (controller as unknown as { handleClick: (e: MouseEvent) => void }).handleClick(
        new MouseEvent('click', { clientX, clientY })
      );
    }).not.toThrow();

    controller.dispose();
  });
});
