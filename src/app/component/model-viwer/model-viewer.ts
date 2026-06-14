import { Component, ElementRef, OnInit, ViewChild, OnDestroy, Input, Output, EventEmitter, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

interface MaterialInfo {
  id: string;
  name: string;
  color: string;
  selected: boolean;
  material: THREE.MeshStandardMaterial;
  meshCount: number;
  isBodyCandidate: boolean;
}

@Component({
  selector: 'app-model-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './model-viewer.html',
  styleUrls: ['./model-viewer.css']
})
export class ModelViewer implements OnInit, OnDestroy {
  @ViewChild('canvasContainer', { static: true }) canvasContainer!: ElementRef;
  
  @Input() backgroundColor: string = '#e8e8e8';
  @Input() enableControls: boolean = true;
  @Input() autoRotate: boolean = false;
  @Input() showGrid: boolean = false;
  @Input() showAxes: boolean = false;
  
  @Output() modelLoaded = new EventEmitter<any>();
  @Output() modelError = new EventEmitter<string>();

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  public currentModel: THREE.Group | THREE.Mesh | null = null;
  private rafId: number = 0;
  private gltfLoader!: GLTFLoader;
  private dracoLoader!: DRACOLoader;
  
  public isLoading: boolean = false;
  public loadingProgress: number = 0;
  public errorMessage: string = '';
  public modelInfo: any = null;
  
  public showMaterialEditor: boolean = false;
  public selectedColor: string = '#ff3333';
  public selectedTexture: string = 'metallic_paint';
  public materialRoughness: number = 0.25;
  public materialMetalness: number = 0.95;
  public materialEmissive: string = '#000000';
  public emissiveIntensity: number = 0;
  
  public smartColorMode: boolean = true;
  public availableMaterials: MaterialInfo[] = [];
  public selectedMaterials: MaterialInfo[] = [];
  
  private originalMaterials: Map<THREE.Mesh, THREE.Material[]> = new Map();
  
  public colorPalette: string[] = [
    '#ff3333', '#3333ff', '#33ff33', '#ffff33', '#ff33ff', '#33ffff',
    '#ff6633', '#ffffff', '#000000', '#c0c0c0', '#ffd700', '#8b4513'
  ];
  
  public carTextures = [
    { id: 'metallic_paint', name: '🎨 Metallic Paint', type: 'procedural' },
    { id: 'pearl_paint', name: '✨ Pearl Paint', type: 'procedural' },
    { id: 'matte_paint', name: '🖤 Matte Finish', type: 'procedural' },
    { id: 'carbon_fiber', name: '🔲 Carbon Fiber', type: 'texture' },
    { id: 'chrome', name: '⭐ Chrome', type: 'procedural' },
    { id: 'racing_stripe', name: '🏁 Racing Stripe', type: 'pattern' }
  ];

  // Backend colors
  public backendColors: any[] = [];

  constructor(private cdr: ChangeDetectorRef, private ngZone: NgZone) {}

  ngOnInit(): void {
    this.initThree();
    this.initLoaders();
    this.setupReducedBrightLighting();
    this.animate();
    
    window.addEventListener('resize', () => this.handleResize());
    setTimeout(() => this.handleResize(), 100);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', () => this.handleResize());
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.renderer) this.renderer.dispose();
    if (this.dracoLoader) this.dracoLoader.dispose();
  }

  private handleResize(): void {
    if (!this.canvasContainer?.nativeElement || !this.renderer || !this.camera) return;
    
    const width = this.canvasContainer.nativeElement.clientWidth;
    const height = this.canvasContainer.nativeElement.clientHeight;
    
    if (width === 0 || height === 0) return;
    
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private initThree(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.backgroundColor);

    const width = this.canvasContainer.nativeElement.clientWidth || window.innerWidth;
    const height = this.canvasContainer.nativeElement.clientHeight || window.innerHeight;
    
    this.camera = new THREE.PerspectiveCamera(20, width / height, 0.1, 1000);
    this.camera.position.set(4, 2.5, 6);
    this.camera.lookAt(0, 0, 0);

    // ORIGINAL RENDERER SETTINGS - Keep texture quality
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(new THREE.Color(this.backgroundColor));
    this.canvasContainer.nativeElement.appendChild(this.renderer.domElement);

    if (this.enableControls) {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.autoRotate = this.autoRotate;
      this.controls.autoRotateSpeed = 1.0;
      this.controls.enableZoom = true;
      this.controls.enablePan = true;
      this.controls.zoomSpeed = 1.0;
      this.controls.panSpeed = 0.8;
      this.controls.rotateSpeed = 1.0;
      this.controls.target.set(0, 0.5, 0);
    }
  }

  private setupReducedBrightLighting(): void {
    // Reduced from 20+ lights to just 8 essential lights, but made them MUCH BRIGHTER
    
    // ========== AMBIENT LIGHTS ==========
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    this.scene.add(ambientLight);
    
    const warmAmbient = new THREE.AmbientLight(0xffcc88, 0.8);
    this.scene.add(warmAmbient);

    // ========== DIRECTIONAL LIGHTS (Key Lights) ==========
    const keyLight = new THREE.DirectionalLight(0xfff5e6, 3.0);
    keyLight.position.set(4, 6, 5);
    keyLight.castShadow = true;
    keyLight.receiveShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0001;
    this.scene.add(keyLight);

    const keyLightLeft = new THREE.DirectionalLight(0xffeebb, 2.5);
    keyLightLeft.position.set(-3, 5, 5);
    keyLightLeft.castShadow = false;
    this.scene.add(keyLightLeft);
    
    const backKeyLight = new THREE.DirectionalLight(0xffccaa, 2.0);
    backKeyLight.position.set(0, 5, -5);
    backKeyLight.castShadow = false;
    this.scene.add(backKeyLight);

    // ========== FILL LIGHTS ==========
    const fillRight = new THREE.DirectionalLight(0xaaccff, 1.5);
    fillRight.position.set(5, 3, 3);
    fillRight.castShadow = false;
    this.scene.add(fillRight);
    
    const fillLeft = new THREE.DirectionalLight(0xffccaa, 1.5);
    fillLeft.position.set(-5, 3, 3);
    fillLeft.castShadow = false;
    this.scene.add(fillLeft);

    // ========== RIM LIGHTS ==========
    const rimRight = new THREE.DirectionalLight(0xffaa77, 1.5);
    rimRight.position.set(3, 3, -5);
    rimRight.castShadow = false;
    this.scene.add(rimRight);
    
    const rimLeft = new THREE.DirectionalLight(0x88aaff, 1.3);
    rimLeft.position.set(-3, 3, -5);
    rimLeft.castShadow = false;
    this.scene.add(rimLeft);

    // Grid and Axes Helpers
    const gridHelper = new THREE.GridHelper(10, 20, 0x888888, 0x444444);
    gridHelper.position.y = -0.8;
    gridHelper.visible = this.showGrid;
    this.scene.add(gridHelper);
    
    const axesHelper = new THREE.AxesHelper(3);
    axesHelper.visible = this.showAxes;
    this.scene.add(axesHelper);

    console.log('💡 Reduced lighting setup (8 lights) with significantly increased brightness - textures preserved');
  }

  private initLoaders(): void {
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/');
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
  }

  private animate(): void {
    const animateLoop = () => {
      this.rafId = requestAnimationFrame(animateLoop);
      if (this.controls) this.controls.update();
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    animateLoop();
  }

  public loadModel(file: File): void {
    this.isLoading = true;
    this.loadingProgress = 0;
    this.errorMessage = '';
    this.modelInfo = null;
    this.originalMaterials.clear();
    this.availableMaterials = [];
    this.showMaterialEditor = false;
    this.cdr.detectChanges();
    
    console.log('Starting to load model:', file.name);
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const url = URL.createObjectURL(file);
    
    if (fileExtension === 'gltf' || fileExtension === 'glb') {
      this.gltfLoader.load(url,
        (gltf) => {
          this.ngZone.run(() => {
            console.log('GLTF loaded successfully');
            this.displayModel(gltf.scene);
            this.saveOriginalMaterials();
            this.extractMaterials();
            this.autoDetectBodyMaterials();
            
            this.modelInfo = {
              name: file.name,
              type: fileExtension.toUpperCase(),
              size: (file.size / 1024).toFixed(2) + ' KB',
              vertices: this.countVertices(gltf.scene),
              triangles: this.countTriangles(gltf.scene),
              materialCount: this.availableMaterials.length
            };
            this.modelLoaded.emit(this.modelInfo);
            this.isLoading = false;
            this.loadingProgress = 100;
            this.cdr.detectChanges();
            URL.revokeObjectURL(url);
          });
        },
        (progress) => {
          if (progress.total) {
            this.ngZone.run(() => {
              this.loadingProgress = (progress.loaded / progress.total) * 100;
              this.cdr.detectChanges();
            });
          }
        },
        (error: any) => {
          this.ngZone.run(() => {
            console.error('Load error:', error);
            this.errorMessage = 'Failed to load model: ' + (error?.message || 'Unknown error');
            this.modelError.emit(this.errorMessage);
            this.isLoading = false;
            this.cdr.detectChanges();
            URL.revokeObjectURL(url);
          });
        }
      );
    } else if (fileExtension === 'obj') {
      const objLoader = new OBJLoader();
      objLoader.load(url,
        (obj) => {
          this.ngZone.run(() => {
            console.log('OBJ loaded successfully');
            obj.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                if (child.material) {
                  const materials = Array.isArray(child.material) ? child.material : [child.material];
                  materials.forEach((mat: any) => {
                    if (mat.isMaterial) {
                      const standardMat = new THREE.MeshStandardMaterial({
                        color: mat.color || 0xcccccc,
                        roughness: 0.4,
                        metalness: 0.6
                      });
                      child.material = standardMat;
                    }
                  });
                } else {
                  child.material = new THREE.MeshStandardMaterial({
                    color: 0xcccccc,
                    roughness: 0.4,
                    metalness: 0.6
                  });
                }
              }
            });
            this.displayModel(obj);
            this.saveOriginalMaterials();
            this.extractMaterials();
            this.autoDetectBodyMaterials();
            
            this.modelInfo = {
              name: file.name,
              type: fileExtension.toUpperCase(),
              size: (file.size / 1024).toFixed(2) + ' KB',
              vertices: this.countVertices(obj),
              triangles: this.countTriangles(obj),
              materialCount: this.availableMaterials.length
            };
            this.modelLoaded.emit(this.modelInfo);
            this.isLoading = false;
            this.loadingProgress = 100;
            this.cdr.detectChanges();
            URL.revokeObjectURL(url);
          });
        },
        (progress) => {
          if (progress.total) {
            this.ngZone.run(() => {
              this.loadingProgress = (progress.loaded / progress.total) * 100;
              this.cdr.detectChanges();
            });
          }
        },
        (error: any) => {
          this.ngZone.run(() => {
            console.error('Load error:', error);
            this.errorMessage = 'Failed to load OBJ model: ' + (error?.message || 'Unknown error');
            this.modelError.emit(this.errorMessage);
            this.isLoading = false;
            this.cdr.detectChanges();
            URL.revokeObjectURL(url);
          });
        }
      );
    } else if (fileExtension === 'stl') {
      const stlLoader = new STLLoader();
      stlLoader.load(url,
        (geometry) => {
          this.ngZone.run(() => {
            console.log('STL loaded successfully');
            const material = new THREE.MeshStandardMaterial({
              color: 0xcccccc,
              roughness: 0.4,
              metalness: 0.6,
              flatShading: true
            });
            const mesh = new THREE.Mesh(geometry, material);
            this.displayModel(mesh);
            this.saveOriginalMaterials();
            this.extractMaterials();
            this.autoDetectBodyMaterials();
            
            const positionAttribute = geometry.attributes['position'];
            const vertexCount = positionAttribute ? positionAttribute.count : 0;
            
            this.modelInfo = {
              name: file.name,
              type: fileExtension.toUpperCase(),
              size: (file.size / 1024).toFixed(2) + ' KB',
              vertices: vertexCount,
              triangles: vertexCount / 3,
              materialCount: this.availableMaterials.length
            };
            this.modelLoaded.emit(this.modelInfo);
            this.isLoading = false;
            this.loadingProgress = 100;
            this.cdr.detectChanges();
            URL.revokeObjectURL(url);
          });
        },
        (progress) => {
          if (progress.total) {
            this.ngZone.run(() => {
              this.loadingProgress = (progress.loaded / progress.total) * 100;
              this.cdr.detectChanges();
            });
          }
        },
        (error: any) => {
          this.ngZone.run(() => {
            console.error('Load error:', error);
            this.errorMessage = 'Failed to load STL model: ' + (error?.message || 'Unknown error');
            this.modelError.emit(this.errorMessage);
            this.isLoading = false;
            this.cdr.detectChanges();
            URL.revokeObjectURL(url);
          });
        }
      );
    } else {
      this.errorMessage = `Unsupported file format: ${fileExtension}. Supported formats: .gltf, .glb, .obj, .stl`;
      this.isLoading = false;
      URL.revokeObjectURL(url);
    }
  }

  private displayModel(model: THREE.Group | THREE.Mesh): void {
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
    }
    
    this.currentModel = model;
    
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    model.position.sub(center);
    model.position.y = -center.y + (size.y / 2);
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 2.0;
    const scale = targetSize / maxDim;
    model.scale.set(scale, scale, scale);
    
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material: any) => {
            if (material.isMeshStandardMaterial) {
              material.roughness = Math.min(material.roughness || 0.3, 0.4);
              material.metalness = Math.max(material.metalness || 0.5, 0.7);
              material.needsUpdate = true;
            }
          });
        }
      }
    });
    
    this.scene.add(model);
    this.updateGridAndAxes();
    
    setTimeout(() => {
      this.handleResize();
      this.resetCameraToFit();
      this.renderer.render(this.scene, this.camera);
    }, 100);
  }

  private updateGridAndAxes(): void {
    this.scene.children.forEach(child => {
      if (child instanceof THREE.GridHelper) {
        child.visible = this.showGrid;
      }
      if (child instanceof THREE.AxesHelper) {
        child.visible = this.showAxes;
      }
    });
  }

  private saveOriginalMaterials(): void {
    if (this.currentModel) {
      this.currentModel.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          const clonedMaterials = materials.map((material: THREE.Material) => material.clone());
          this.originalMaterials.set(child, clonedMaterials);
        }
      });
    }
  }

  private extractMaterials(): void {
    if (!this.currentModel) return;
    
    const materialMap = new Map<string, MaterialInfo>();
    
    this.currentModel.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material: any) => {
          if (material.isMeshStandardMaterial && !materialMap.has(material.uuid)) {
            const materialName = material.name || this.generateMaterialName(material);
            const isBodyCandidate = this.isLikelyBodyMaterial(material, child);
            
            materialMap.set(material.uuid, {
              id: material.uuid,
              name: materialName,
              color: '#' + material.color.getHexString(),
              selected: isBodyCandidate,
              material: material,
              meshCount: 1,
              isBodyCandidate: isBodyCandidate
            });
          } else if (material.isMeshStandardMaterial && materialMap.has(material.uuid)) {
            const existing = materialMap.get(material.uuid);
            if (existing) existing.meshCount++;
          }
        });
      }
    });
    
    this.availableMaterials = Array.from(materialMap.values());
    this.updateSelectedMaterials();
    console.log('Extracted materials:', this.availableMaterials.length);
  }

  private generateMaterialName(material: THREE.MeshStandardMaterial): string {
    const brightness = (material.color.r + material.color.g + material.color.b) / 3;
    if (brightness < 0.2) return 'Dark Material';
    if (brightness > 0.8) return 'Light Material';
    if (material.metalness > 0.7) return 'Metallic';
    if (material.roughness > 0.7) return 'Rough';
    return 'Paint';
  }

  private isLikelyBodyMaterial(material: THREE.MeshStandardMaterial, mesh: THREE.Mesh): boolean {
    const materialName = (material.name || '').toLowerCase();
    const meshName = (mesh.name || '').toLowerCase();
    const brightness = (material.color.r + material.color.g + material.color.b) / 3;
    
    const bodyKeywords = ['body', 'paint', 'car', 'coat', 'kuzov', 'chassis', 'hood', 'roof', 'door', 'fender'];
    const nonBodyKeywords = ['glass', 'window', 'tire', 'wheel', 'rubber', 'chrome', 'light', 'lamp', 'emblem', 'mirror'];
    
    for (const kw of bodyKeywords) if (materialName.includes(kw)) return true;
    for (const kw of nonBodyKeywords) if (materialName.includes(kw)) return false;
    for (const kw of bodyKeywords) if (meshName.includes(kw)) return true;
    for (const kw of nonBodyKeywords) if (meshName.includes(kw)) return false;
    
    const boundingSphere = mesh.geometry.boundingSphere;
    const radius = boundingSphere ? boundingSphere.radius : 0;
    
    return material.metalness > 0.5 && brightness > 0.3 && radius > 0.3;
  }

  private autoDetectBodyMaterials(): void {
    this.availableMaterials.forEach(m => m.selected = m.isBodyCandidate);
    this.updateSelectedMaterials();
  }

  public updateSelectedMaterials(): void {
    this.selectedMaterials = this.availableMaterials.filter(m => m.selected);
  }

  public smartColorChange(color: string): void {
    this.selectedColor = color;
    const colorHex = parseInt(color.substring(1), 16);
    
    if (this.smartColorMode) {
      this.selectedMaterials.forEach(materialInfo => {
        materialInfo.material.color.setHex(colorHex);
        materialInfo.color = color;
      });
      if (this.selectedMaterials.length === 0) this.applyMaterialChanges();
    } else {
      this.applyMaterialChanges();
    }
  }

  private applyMaterialChanges(): void {
    if (!this.currentModel) return;
    const colorHex = parseInt(this.selectedColor.substring(1), 16);
    this.currentModel.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material: any) => {
          if (material.isMeshStandardMaterial) {
            material.color.setHex(colorHex);
            material.roughness = this.materialRoughness;
            material.metalness = this.materialMetalness;
            material.needsUpdate = true;
          }
        });
      }
    });
  }

  public updateSelectedMaterialProperties(): void {
    if (!this.smartColorMode) { this.applyMaterialChanges(); return; }
    this.selectedMaterials.forEach(materialInfo => {
      materialInfo.material.roughness = this.materialRoughness;
      materialInfo.material.metalness = this.materialMetalness;
      materialInfo.material.needsUpdate = true;
    });
  }

  public applyColorPreset(color: string): void { this.smartColorChange(color); }
  public applyTexturePreset(textureId: string): void { this.selectedTexture = textureId; this.applyMaterialPreset(textureId); }

  public applyMaterialPreset(preset: string): void {
    if (!this.currentModel) return;
    switch(preset) {
      case 'metallic_paint': this.materialMetalness = 0.95; this.materialRoughness = 0.25; break;
      case 'pearl_paint': this.materialMetalness = 0.85; this.materialRoughness = 0.2; break;
      case 'matte_paint': this.materialMetalness = 0.2; this.materialRoughness = 0.8; break;
      case 'carbon_fiber': this.materialMetalness = 0.6; this.materialRoughness = 0.4; this.applyCarbonFiberTexture(); return;
      case 'chrome': this.materialMetalness = 1.0; this.materialRoughness = 0.1; break;
      case 'racing_stripe': this.applyRacingStripePattern(); return;
    }
    if (this.smartColorMode) { this.updateSelectedMaterialProperties(); this.smartColorChange(this.selectedColor); }
    else { this.applyMaterialChanges(); }
  }

  private applyCarbonFiberTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 4;
    for (let i = 0; i < 50; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 20, 0);
      ctx.lineTo(i * 20, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * 20);
      ctx.lineTo(512, i * 20);
      ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    const applyTo = this.smartColorMode ? this.selectedMaterials : this.availableMaterials;
    applyTo.forEach(m => { m.material.map = texture; m.material.needsUpdate = true; });
  }

  private applyRacingStripePattern(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(200, 0, 40, 512);
    ctx.fillRect(270, 0, 40, 512);
    const texture = new THREE.CanvasTexture(canvas);
    const applyTo = this.smartColorMode ? this.selectedMaterials : this.availableMaterials;
    applyTo.forEach(m => { m.material.map = texture; m.material.color.setHex(0xff0000); m.material.needsUpdate = true; });
  }

  public selectAllMaterials(): void { this.availableMaterials.forEach(m => m.selected = true); this.updateSelectedMaterials(); }
  public selectBodyMaterialsOnly(): void { this.availableMaterials.forEach(m => m.selected = m.isBodyCandidate); this.updateSelectedMaterials(); }

  public resetToOriginalMaterials(): void {
    if (this.currentModel) {
      this.currentModel.traverse((child) => {
        if (child instanceof THREE.Mesh && this.originalMaterials.has(child)) {
          const originalMats = this.originalMaterials.get(child);
          if (originalMats && originalMats.length > 0) {
            if (Array.isArray(child.material)) {
              originalMats.forEach((mat: THREE.Material, idx: number) => {
                if (child.material[idx]) child.material[idx].copy(mat);
              });
            } else {
              (child.material as THREE.Material).copy(originalMats[0]);
            }
          }
        }
      });
      
      setTimeout(() => { 
        this.extractMaterials(); 
        this.autoDetectBodyMaterials();
        if (this.selectedMaterials.length > 0) {
          this.selectedColor = this.selectedMaterials[0].color;
        }
        this.cdr.detectChanges();
      }, 100);
    }
  }

  public clearModel(): void {
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      this.currentModel = null;
      this.modelInfo = null;
      this.availableMaterials = [];
      this.selectedMaterials = [];
      this.showMaterialEditor = false;
      this.originalMaterials.clear();
      this.cdr.detectChanges();
    }
  }

  private resetCameraToFit(): void {
    if (this.camera && this.controls && this.currentModel) {
      const box = new THREE.Box3().setFromObject(this.currentModel);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const distance = maxDim * 2.2;
      
      this.camera.position.set(distance * 0.8, distance * 0.6, distance);
      this.controls.target.copy(center);
      this.controls.update();
    } else if (this.camera && this.controls) {
      this.camera.position.set(4, 2.5, 6);
      this.controls.target.set(0, 0.5, 0);
      this.controls.update();
    }
  }

  private countVertices(model: THREE.Group | THREE.Mesh): number {
    let count = 0;
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry.isBufferGeometry && child.geometry.attributes['position']) {
        count += child.geometry.attributes['position'].count;
      }
    });
    return count;
  }

  private countTriangles(model: THREE.Group | THREE.Mesh): number {
    let count = 0;
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry.isBufferGeometry && child.geometry.attributes['position']) {
        count += child.geometry.attributes['position'].count / 3;
      }
    });
    return count;
  }

  public resetCamera(): void { this.resetCameraToFit(); }
  
  public setAutoRotate(enabled: boolean): void { 
    if (this.controls) {
      this.controls.autoRotate = enabled;
    }
  }

  public toggleWireframe(): void {
    const materials = this.smartColorMode ? this.selectedMaterials : this.availableMaterials;
    materials.forEach(m => m.material.wireframe = !m.material.wireframe);
  }

  public toggleMaterialEditor(): void { 
    this.showMaterialEditor = !this.showMaterialEditor;
    if (this.showMaterialEditor) {
      this.handleResize();
    }
  }
  
  public toggleSmartMode(): void { 
    this.smartColorMode = !this.smartColorMode; 
    if (this.smartColorMode) this.selectBodyMaterialsOnly(); 
  }
  
  public setShowGrid(show: boolean): void {
    this.showGrid = show;
    this.updateGridAndAxes();
  }
  
  public setShowAxes(show: boolean): void {
    this.showAxes = show;
    this.updateGridAndAxes();
  }

  public setBackendColors(colors: any[]): void {
    this.backendColors = colors;
    console.log('Received backend colors in ModelViewer:', this.backendColors);
    this.cdr.detectChanges();
  }

  public getFullColorPalette(): any[] {
    const backendColorItems = this.backendColors.map(color => ({
      name: color.name,
      colorCode: color.colorCode,
      type: color.type || 'standard',
      isBackend: true
    }));
    
    const defaultColors = this.colorPalette.map(colorCode => ({
      name: 'Custom Color',
      colorCode: colorCode,
      type: 'custom',
      isBackend: false
    }));
    
    return [...backendColorItems, ...defaultColors];
  }
}