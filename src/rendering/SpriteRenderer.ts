import * as THREE from 'three';

export interface SpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class SpriteRenderer {
  private spriteAtlas: THREE.Texture | null = null;
  private spriteMaterial: THREE.ShaderMaterial | null = null;
  
  // Shader for sprite rendering with texture atlas support
  private readonly vertexShader = `
    attribute vec2 spriteOffset;
    attribute vec2 spriteScale;
    
    varying vec2 vUv;
    varying vec2 vSpriteOffset;
    varying vec2 vSpriteScale;
    
    void main() {
      vUv = uv;
      vSpriteOffset = spriteOffset;
      vSpriteScale = spriteScale;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  
  private readonly fragmentShader = `
    uniform sampler2D spriteAtlas;
    uniform float opacity;
    
    varying vec2 vUv;
    varying vec2 vSpriteOffset;
    varying vec2 vSpriteScale;
    
    void main() {
      vec2 atlasUv = vSpriteOffset + vUv * vSpriteScale;
      vec4 color = texture2D(spriteAtlas, atlasUv);
      
      if (color.a < 0.1) {
        discard;
      }
      
      gl_FragColor = vec4(color.rgb, color.a * opacity);
    }
  `;
  
  constructor() {}
  
  public initialize(atlas: THREE.Texture): void {
    this.spriteAtlas = atlas;
    
    // Create shader material for sprite rendering
    this.spriteMaterial = new THREE.ShaderMaterial({
      uniforms: {
        spriteAtlas: { value: atlas },
        opacity: { value: 1.0 },
      },
      vertexShader: this.vertexShader,
      fragmentShader: this.fragmentShader,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
    });
    
    console.log('SpriteRenderer initialized with atlas');
  }
  
  public createSprite(
    frame: SpriteFrame,
    atlasWidth: number = 256,
    atlasHeight: number = 256
  ): THREE.Mesh {
    if (!this.spriteMaterial) {
      throw new Error('SpriteRenderer not initialized');
    }
    
    const geometry = new THREE.PlaneGeometry(frame.width, frame.height);
    
    // Calculate UV coordinates for the sprite frame in the atlas
    const offsetX = frame.x / atlasWidth;
    const offsetY = 1.0 - (frame.y + frame.height) / atlasHeight; // Flip Y for texture
    const scaleX = frame.width / atlasWidth;
    const scaleY = frame.height / atlasHeight;
    
    // Clone material for this sprite instance
    const material = this.spriteMaterial.clone();
    
    // Set up geometry attributes for sprite frame
    const spriteOffsets = new Float32Array([
      offsetX, offsetY,
      offsetX, offsetY,
      offsetX, offsetY,
      offsetX, offsetY,
    ]);
    
    const spriteScales = new Float32Array([
      scaleX, scaleY,
      scaleX, scaleY,
      scaleX, scaleY,
      scaleX, scaleY,
    ]);
    
    geometry.setAttribute('spriteOffset', new THREE.BufferAttribute(spriteOffsets, 2));
    geometry.setAttribute('spriteScale', new THREE.BufferAttribute(spriteScales, 2));
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `Sprite_${frame.x}_${frame.y}`;
    
    return mesh;
  }
  
  public createSimpleSprite(texture: THREE.Texture, width: number, height: number): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'SimpleSprite';
    
    return mesh;
  }
  
  // Create instanced mesh for rendering many identical sprites efficiently
  public createInstancedSprites(
    frame: SpriteFrame,
    maxInstances: number,
    atlasWidth: number = 256,
    atlasHeight: number = 256
  ): THREE.InstancedMesh {
    if (!this.spriteMaterial) {
      throw new Error('SpriteRenderer not initialized');
    }
    
    const geometry = new THREE.PlaneGeometry(frame.width, frame.height);
    const material = this.spriteMaterial.clone();
    
    // Calculate UV coordinates
    const offsetX = frame.x / atlasWidth;
    const offsetY = 1.0 - (frame.y + frame.height) / atlasHeight;
    const scaleX = frame.width / atlasWidth;
    const scaleY = frame.height / atlasHeight;
    
    // Set up geometry attributes
    const spriteOffsets = new Float32Array(geometry.attributes.position.count * 2);
    const spriteScales = new Float32Array(geometry.attributes.position.count * 2);
    
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      spriteOffsets[i * 2] = offsetX;
      spriteOffsets[i * 2 + 1] = offsetY;
      spriteScales[i * 2] = scaleX;
      spriteScales[i * 2 + 1] = scaleY;
    }
    
    geometry.setAttribute('spriteOffset', new THREE.BufferAttribute(spriteOffsets, 2));
    geometry.setAttribute('spriteScale', new THREE.BufferAttribute(spriteScales, 2));
    
    const instancedMesh = new THREE.InstancedMesh(geometry, material, maxInstances);
    instancedMesh.name = `InstancedSprite_${frame.x}_${frame.y}`;
    
    // Set default instance matrices (all at origin, invisible)
    const matrix = new THREE.Matrix4();
    matrix.makeScale(0, 0, 0); // Start invisible
    
    for (let i = 0; i < maxInstances; i++) {
      instancedMesh.setMatrixAt(i, matrix);
    }
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    
    return instancedMesh;
  }
  
  // Update instance position and visibility
  public updateInstance(
    instancedMesh: THREE.InstancedMesh,
    instanceId: number,
    position: THREE.Vector3,
    scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1),
    rotation: number = 0
  ): void {
    const matrix = new THREE.Matrix4();
    matrix.compose(
      position,
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotation),
      scale
    );
    
    instancedMesh.setMatrixAt(instanceId, matrix);
    instancedMesh.instanceMatrix.needsUpdate = true;
  }
  
  // Hide an instance by scaling it to zero
  public hideInstance(instancedMesh: THREE.InstancedMesh, instanceId: number): void {
    const matrix = new THREE.Matrix4();
    matrix.makeScale(0, 0, 0);
    instancedMesh.setMatrixAt(instanceId, matrix);
    instancedMesh.instanceMatrix.needsUpdate = true;
  }
  
  // Get current atlas texture
  public getAtlas(): THREE.Texture | null {
    return this.spriteAtlas;
  }
  
  // Update atlas texture
  public updateAtlas(newAtlas: THREE.Texture): void {
    this.spriteAtlas = newAtlas;
    
    if (this.spriteMaterial) {
      this.spriteMaterial.uniforms.spriteAtlas.value = newAtlas;
    }
  }
  
  // Dispose of resources
  public dispose(): void {
    if (this.spriteMaterial) {
      this.spriteMaterial.dispose();
      this.spriteMaterial = null;
    }
    
    this.spriteAtlas = null;
    
    console.log('SpriteRenderer disposed');
  }
}