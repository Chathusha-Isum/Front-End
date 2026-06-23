import { Component, ViewChild, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ModelViewer } from '../model-viwer/model-viewer';

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
  
  // Car data
  carId: string = '';
  carData: any = null;
  modelPath: string = '';
  modelUrl: string = '';
  
  // API configuration
  private apiUrl = 'http://localhost:8080';
  
  // Colors from backend
  backendColors: ModelColor[] = [];
  isLoadingColors: boolean = false;
  
  constructor(private cdr: ChangeDetectorRef, private http: HttpClient) {}
  
  ngOnInit(): void {
    console.log('Upload ngOnInit');
    
    // Get car ID from localStorage
    this.carId = localStorage.getItem('car') || '';
    
    if (!this.carId) {
      this.errorMessage = 'No car selected. Please select a car first.';
      console.error('No car ID found in localStorage');
      this.cdr.detectChanges();
      return;
    }
    
    console.log('Car ID from localStorage:', this.carId);
    
    // Fetch car details from backend
    this.fetchCarDetails(this.carId);
  }
  
  ngAfterViewInit(): void {
    console.log('Upload ngAfterViewInit - ModelViewer:', this.modelViewer);
  }
  
  // ==================== FETCH CAR DETAILS ====================
  
  /**
   * Fetch car details from backend using car ID
   */
  fetchCarDetails(carId: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    console.log('Fetching car details for ID:', carId);
    
    this.http.get(`${this.apiUrl}/product/id?id=${carId}`).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.carData = res.data;
        
        console.log('Car data received:', this.carData);
        
        // Check if car has a model path
        if (this.carData && this.carData.modelpath) {
          this.modelPath = this.carData.modelpath;
          // Example: '/cars/1234567890-car.glb'
          
          // Extract filename from path
          const filename = this.modelPath.split('/').pop();
          
          if (filename) {
            // Build the full URL to access the model
            this.modelUrl = `${this.apiUrl}/api/models/cars/${filename}`;
            console.log('Model URL:', this.modelUrl);
            
            // Load the model after a short delay to ensure viewer is ready
            setTimeout(() => {
              this.loadModelFromUrl(this.modelUrl);
            }, 500);
            
            // Also load colors if available from the model endpoint
            this.loadColorsFromBackend(carId);
          } else {
            this.errorMessage = 'Invalid model path format';
          }
        } else {
          this.errorMessage = 'No 3D model available for this car';
          console.warn('No modelpath found for car:', this.carData);
        }
        
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Failed to load car details';
        console.error('Error fetching car details:', err);
        this.cdr.detectChanges();
      }
    });
  }
  
  // ==================== LOAD 3D MODEL ====================
  
  /**
   * Load model from URL
   */
  loadModelFromUrl(url: string): void {
    if (!this.modelViewer) {
      console.error('ModelViewer not available, retrying...');
      setTimeout(() => {
        if (this.modelViewer) {
          this.loadModelFromUrl(url);
        } else {
          this.errorMessage = '3D Viewer not initialized. Please refresh the page.';
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      }, 500);
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    
    console.log('Loading model from URL:', url);
    
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load model: ${response.status} ${response.statusText}`);
        }
        return response.blob();
      })
      .then(blob => {
        const fileName = url.split('/').pop() || 'model.glb';
        const file = new File([blob], fileName, {
          type: blob.type || 'application/octet-stream'
        });
        
        // Validate file type
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (!this.supportedFormats.includes(`.${extension}`)) {
          throw new Error(`Unsupported file format: ${extension}`);
        }
        
        this.selectedFile = file;
        
        // Load model into viewer
        if (this.modelViewer) {
          this.modelViewer.loadModel(file);
          console.log('Model loaded successfully');
        }
        
        this.isLoading = false;
        this.cdr.detectChanges();
      })
      .catch(error => {
        this.errorMessage = error.message || 'Failed to load model';
        this.isLoading = false;
        console.error('Error loading model:', error);
        this.cdr.detectChanges();
      });
  }
  
  /**
   * Load model from filename (alternative method)
   */
  loadModelFromFilename(filename: string): void {
    const url = `${this.apiUrl}/api/models/cars/${filename}`;
    this.loadModelFromUrl(url);
  }
  
  // ==================== LOAD COLORS ====================
  
  /**
   * Load available colors from backend
   */
  loadColorsFromBackend(carId: string): void {
    this.isLoadingColors = true;
    
    this.http.get(`${this.apiUrl}/product/model`, {
      params: { id: carId.toString() }
    }).subscribe({
      next: (response: any) => {
        if (response && response.colors && Array.isArray(response.colors)) {
          this.backendColors = response.colors.map((color: any) => ({
            id: color.id,
            name: color.name,
            colorCode: color.colorCode || color.code,
            type: color.type || 'standard'
          }));
          
          // Pass colors to model viewer if available
          if (this.modelViewer) {
            (this.modelViewer as any).setBackendColors(this.backendColors);
          }
          
          console.log('Colors loaded:', this.backendColors);
        }
        this.isLoadingColors = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading colors:', error);
        this.isLoadingColors = false;
      }
    });
  }
  
  // ==================== FILE UPLOAD (Manual) ====================
  
  /**
   * Handle file selection from input
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (!this.supportedFormats.includes(`.${extension}`)) {
        this.errorMessage = `Unsupported file format. Please use: ${this.supportedFormats.join(', ')}`;
        return;
      }
      
      this.selectedFile = file;
      this.loadModel();
    }
  }
  
  /**
   * Load selected model into viewer (manual upload)
   */
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
      this.isLoading = true;
      this.errorMessage = '';
      this.modelViewer.loadModel(this.selectedFile);
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
  
  // ==================== DRAG AND DROP ====================
  
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
      const file = files[0];
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (!this.supportedFormats.includes(`.${extension}`)) {
        this.errorMessage = `Unsupported file format. Please use: ${this.supportedFormats.join(', ')}`;
        return;
      }
      
      this.selectedFile = file;
      this.loadModel();
    }
  }
  
  // ==================== VIEWER CONTROLS ====================
  
  /**
   * Clear model from viewer
   */
  clearModel(): void {
    if (this.modelViewer) {
      this.modelViewer.clearModel();
      this.selectedFile = null;
      this.errorMessage = '';
      this.modelUrl = '';
    }
  }
  
  /**
   * Toggle wireframe mode
   */
  toggleWireframe(): void {
    if (this.modelViewer) {
      this.modelViewer.toggleWireframe();
    }
  }
  
  /**
   * Reset camera position
   */
  resetCamera(): void {
    if (this.modelViewer) {
      this.modelViewer.resetCamera();
    }
  }
  
  /**
   * Toggle auto-rotation
   */
  toggleAutoRotate(): void {
    this.autoRotate = !this.autoRotate;
    if (this.modelViewer) {
      this.modelViewer.setAutoRotate(this.autoRotate);
    }
  }
  
  /**
   * Toggle grid
   */
  toggleGrid(): void {
    this.showGrid = !this.showGrid;
    if (this.modelViewer) {
      this.modelViewer.setShowGrid(this.showGrid);
    }
  }
  
  /**
   * Toggle axes
   */
  toggleAxes(): void {
    this.showAxes = !this.showAxes;
    if (this.modelViewer) {
      this.modelViewer.setShowAxes(this.showAxes);
    }
  }
  
  /**
   * Retry loading model
   */
  retryLoad(): void {
    if (this.carId) {
      this.fetchCarDetails(this.carId);
    } else if (this.selectedFile) {
      this.loadModel();
    } else {
      this.errorMessage = 'No car or model to load';
    }
  }
  
  /**
   * Refresh car data from backend
   */
  refreshCarData(): void {
    if (this.carId) {
      this.fetchCarDetails(this.carId);
    }
  }
  
  /**
   * Get car info for display
   */
  getCarDisplayName(): string {
    if (this.carData) {
      return `${this.carData.brand} ${this.carData.name}`;
    }
    return 'Car';
  }
}