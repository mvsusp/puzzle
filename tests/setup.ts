// Test setup file for Vitest
import { vi } from 'vitest';

// Mock Three.js WebGL context for testing
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  writable: true,
  value: vi.fn().mockImplementation((contextId: string) => {
    if (contextId === 'webgl' || contextId === 'webgl2') {
      return {
        // WebGL constants
        MAX_TEXTURE_IMAGE_UNITS: 0x8872,
        MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x8B4C,
        MAX_TEXTURE_SIZE: 0x0D33,
        MAX_CUBE_MAP_TEXTURE_SIZE: 0x851C,
        MAX_RENDERBUFFER_SIZE: 0x84E8,
        MAX_VIEWPORT_DIMS: 0x0D3A,
        VERSION: 0x1F02,
        
        // Mock methods
        getExtension: vi.fn(),
        getParameter: vi.fn().mockImplementation((param: number) => {
          switch (param) {
            case 0x1F02: return 'WebGL 2.0'; // VERSION
            case 0x8872: return 16; // MAX_TEXTURE_IMAGE_UNITS
            case 0x8B4C: return 16; // MAX_VERTEX_TEXTURE_IMAGE_UNITS
            case 0x0D33: return 4096; // MAX_TEXTURE_SIZE
            case 0x851C: return 4096; // MAX_CUBE_MAP_TEXTURE_SIZE
            case 0x84E8: return 4096; // MAX_RENDERBUFFER_SIZE
            case 0x0D3A: return [4096, 4096]; // MAX_VIEWPORT_DIMS
            default: return 0;
          }
        }),
        createShader: vi.fn(),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        createProgram: vi.fn(),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        useProgram: vi.fn(),
        createBuffer: vi.fn(),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        enableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),
        drawArrays: vi.fn(),
        clear: vi.fn(),
        clearColor: vi.fn(),
        viewport: vi.fn(),
      };
    }
    
    if (contextId === '2d') {
      return {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: '',
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        createLinearGradient: vi.fn().mockReturnValue({
          addColorStop: vi.fn(),
        }),
      };
    }
    
    return null;
  }),
});

// Mock requestAnimationFrame
(globalThis as any).requestAnimationFrame = vi.fn().mockImplementation((cb) => {
  return setTimeout(cb, 16); // 60fps
});

(globalThis as any).cancelAnimationFrame = vi.fn().mockImplementation((id) => {
  clearTimeout(id);
});

// Mock performance.now
(globalThis as any).performance = {
  now: vi.fn(() => Date.now()),
};

// Mock Audio context
(globalThis as any).AudioContext = vi.fn().mockImplementation(() => ({
  createBuffer: vi.fn(),
  createBufferSource: vi.fn(),
  destination: {},
}));

// Mock console methods to reduce noise in tests
(globalThis as any).console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};