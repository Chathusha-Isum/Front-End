import { Component, ViewChild, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ModelViewer } from '../../component/model-viwer/model-viewer';

export interface ModelColor {
  id?: number;
  name: string;
  colorCode: string;
  type?: string;
  isCustom?: boolean;
}

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, ModelViewer, HttpClientModule],
  templateUrl: './upload.html',
  styleUrls: ['./upload.css']
})
export class Upload implements OnInit, AfterViewInit {
  @ViewChild(ModelViewer) modelViewer!: ModelViewer;
  
  selectedFile: File | null = null;
  supportedFormats = ['.gltf', '.glb', '.obj', '.stl'];
  autoRotate: boolean = true;
  showGrid: boolean = false;
  showAxes: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';
  
  // API configuration
  private apiUrl = 'http://localhost:8080/product/model';
  productId: number = 1;
  
  // Colors from backend
  backendColors: ModelColor[] = [];
  isLoadingColors: boolean = false;
  
  constructor(private cdr: ChangeDetectorRef, private http: HttpClient) {}
  
  ngOnInit(): void {
    console.log('Upload ngOnInit');
    this.loadColorsFromBackend();
  }
  
  ngAfterViewInit(): void {
    console.log('Upload ngAfterViewInit - ModelViewer:', this.modelViewer);
    setTimeout(() => {
      this.loadModelFromBackendWithId(this.productId);
    }, 100);
  }
  
  // Load available colors from backend
  async loadColorsFromBackend(): Promise<void> {
    this.isLoadingColors = true;
    try {
      const colorsUrl = 'http://localhost:8080/product/colors';
      const response: any = await this.http.get(colorsUrl, {
        params: { id: this.productId.toString() }
      }).toPromise();
      
      if (response && Array.isArray(response)) {
        this.backendColors = response.map((color: any) => ({
          id: color.id,
          name: color.name || color.colorName,
          colorCode: color.colorCode || color.code || color.value,
          type: color.type || 'standard'
        }));
      } else if (response && response.colors && Array.isArray(response.colors)) {
        this.backendColors = response.colors.map((color: any) => ({
          id: color.id,
          name: color.name,
          colorCode: color.colorCode,
          type: color.type
        }));
      }
      
      console.log('Loaded colors from backend:', this.backendColors);
      
      // Pass colors to model viewer if already loaded and modelViewer exists
      if (this.modelViewer && this.backendColors.length > 0) {
        (this.modelViewer as any).setBackendColors(this.backendColors);
      }
    } catch (error) {
      console.error('Error loading colors from backend:', error);
      this.backendColors = [];
    } finally {
      this.isLoadingColors = false;
      this.cdr.detectChanges();
    }
  }
  
  async loadModelFromBackendWithId(productId: number): Promise<void> {
    if (!this.modelViewer) {
      console.error('ModelViewer not available yet');
      setTimeout(() => {
        if (this.modelViewer) {
          this.loadModelFromBackendWithId(productId);
        } else {
          console.error('ModelViewer still not available');
          this.errorMessage = '3D Viewer not initialized. Please refresh the page.';
        }
      }, 500);
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      const response: any = await this.http.get(`${this.apiUrl}`, {
        params: { id: productId.toString() }
      }).toPromise();
      
      console.log('Backend response:', response);
      
      let modelPath: string | null = null;
      let modelColors: ModelColor[] = [];
      
      if (response) {
        // Handle model path
        if (typeof response === 'string') {
          modelPath = response;
        } else if (response.modelPath) {
          modelPath = response.modelPath;
        } else if (response.path) {
          modelPath = response.path;
        } else if (response.url) {
          modelPath = response.url;
        } else if (response.filePath) {
          modelPath = response.filePath;
        } else if (response.data && response.data.modelPath) {
          modelPath = response.data.modelPath;
        }
        
        // Extract colors from response
        if (response.colors && Array.isArray(response.colors)) {
          modelColors = response.colors;
        } else if (response.availableColors && Array.isArray(response.availableColors)) {
          modelColors = response.availableColors;
        } else if (response.data && response.data.colors && Array.isArray(response.data.colors)) {
          modelColors = response.data.colors;
        }
      }
      
      // Update backend colors
      if (modelColors.length > 0) {
        this.backendColors = modelColors.map((color: any) => ({
          id: color.id,
          name: color.name,
          colorCode: color.colorCode || color.code,
          type: color.type || 'standard'
        }));
        
        // Pass colors to model viewer
        if (this.modelViewer) {
          (this.modelViewer as any).setBackendColors(this.backendColors);
        }
      }
      
      if (!modelPath) {
        throw new Error('No model path received from backend');
      }
      
      await this.loadModelFromFilePath(modelPath);
      
    } catch (error: any) {
      console.error('Error loading from backend:', error);
      this.errorMessage = `Failed to load model: ${error.message || 'Unknown error'}`;
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
  
  async loadModelFromFilePath(filePath: string): Promise<void> {
    if (!this.modelViewer) {
      console.error('ModelViewer not available yet');
      setTimeout(() => {
        if (this.modelViewer) {
          this.loadModelFromFilePath(filePath);
        } else {
          console.error('ModelViewer still not available');
          this.errorMessage = '3D Viewer not initialized. Please refresh the page.';
        }
      }, 500);
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      const response = await fetch(filePath);
      
      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const fileName = filePath.split('/').pop() || 'model.glb';
      
      this.selectedFile = new File([blob], fileName, {
        type: blob.type || 'application/octet-stream'
      });
      
      const extension = this.selectedFile.name.split('.').pop()?.toLowerCase();
      if (!this.supportedFormats.includes(`.${extension}`)) {
        throw new Error(`Unsupported file format: ${extension}`);
      }
      
      this.modelViewer.loadModel(this.selectedFile);
      
    } catch (error: any) {
      console.error('Error loading model from path:', error);
      this.errorMessage = error.message || 'Failed to load model from path';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
  
  loadProductModel(productId: number): void {
    this.productId = productId;
    this.loadModelFromBackendWithId(productId);
    this.loadColorsFromBackend();
  }
  
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.loadModel();
    }
  }
  
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const dropZone = event.target as HTMLElement;
    dropZone.classList.add('drag-over');
  }
  
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const dropZone = event.target as HTMLElement;
    dropZone.classList.remove('drag-over');
  }
  
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const dropZone = event.target as HTMLElement;
    dropZone.classList.remove('drag-over');
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.selectedFile = files[0];
      this.loadModel();
    }
  }
  
  loadModel(): void {
    if (!this.modelViewer) {
      console.error('ModelViewer not available');
      setTimeout(() => {
        if (this.modelViewer && this.selectedFile) {
          this.loadModel();
        }
      }, 500);
      return;
    }
    
    if (this.selectedFile) {
      const extension = this.selectedFile.name.split('.').pop()?.toLowerCase();
      if (!this.supportedFormats.includes(`.${extension}`)) {
        alert(`Unsupported file format. Please use: ${this.supportedFormats.join(', ')}`);
        return;
      }
      
      this.modelViewer.loadModel(this.selectedFile);
    }
  }
  
  clearModel(): void {
    if (this.modelViewer) {
      this.modelViewer.clearModel();
      this.selectedFile = null;
      this.errorMessage = '';
    }
  }
  
  toggleWireframe(): void {
    if (this.modelViewer) {
      this.modelViewer.toggleWireframe();
    }
  }
  
  resetCamera(): void {
    if (this.modelViewer) {
      this.modelViewer.resetCamera();
    }
  }
  
  toggleAutoRotate(): void {
    this.autoRotate = !this.autoRotate;
    if (this.modelViewer) {
      this.modelViewer.setAutoRotate(this.autoRotate);
    }
  }
  
  toggleGrid(): void {
    this.showGrid = !this.showGrid;
    if (this.modelViewer) {
      // this.modelViewer.setShowGrid(this.showGrid);
    }
  }
  
  toggleAxes(): void {
    this.showAxes = !this.showAxes;
    if (this.modelViewer) {
      // this.modelViewer.setShowAxes(this.showAxes);
    }
  }
  
  retryLoad(): void {
    this.loadModelFromBackendWithId(this.productId);
  }
}