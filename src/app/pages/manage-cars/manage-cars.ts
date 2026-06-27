import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-manage-cars',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-cars.html',
  styleUrls: ['./manage-cars.css']
})
export class ManageCars implements OnInit, OnDestroy {
  private apiUrl = 'http://localhost:8080';

  // State
  public isLoading: boolean = false;
  public showAddModal: boolean = false;
  public showEditModal: boolean = false;
  public showDeleteModal: boolean = false;
  public selectedCar: any = null;
  public cars: any[] = [];
  public searchTerm: string = '';

  // Car form model
  public carForm: any = {
    id: '',
    name: '',
    productionyear: '',
    brand: '',
    description: '',
    price: '',
    mileage: '',
    color: '',
    fueltype: '',
    horsepower: '',
    enginecapacity: '',
    transmission: '',
    category: '',
    modelpath: '',
    link: ''
  };

  // Main Image (products table)
  public selectedMainImageFile: File | null = null;
  public mainImagePreview: string | null = null;
  public uploadedMainImagePath: string = '';

  // Additional Images (car_images table)
  public selectedAdditionalImageFiles: File[] = [];
  public additionalImages: string[] = [];
  public additionalImagePreviews: string[] = [];

  // Model file
  public selectedModelFile: File | null = null;
  public uploadedModelPath: string = '';

  // Color management
  public colorInput: string = '#ffffff';
  public colors: string[] = [];

  // Upload states
  public imageUploading: boolean = false;
  public modelUploading: boolean = false;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadCars();
  }

  ngOnDestroy(): void {
    // Clean up main image preview
    if (this.mainImagePreview) {
      URL.revokeObjectURL(this.mainImagePreview);
    }
    // Clean up additional image previews
    this.additionalImagePreviews.forEach((preview: string) => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    });
  }

  // ==================== LOAD CARS ====================

  loadCars(): void {
    this.isLoading = true;
    this.http.get(`${this.apiUrl}/product`).subscribe({
      next: (res: any) => {
        this.cars = res.data || [];
        console.log(`✅ Loaded ${this.cars.length} cars`);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading cars:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ==================== SEARCH ====================

  searchCars(): void {
    if (!this.searchTerm.trim()) {
      this.loadCars();
      return;
    }

    this.isLoading = true;
    this.http.get(`${this.apiUrl}/product/search?name=${this.searchTerm}`).subscribe({
      next: (res: any) => {
        this.cars = res.data || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error searching cars:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.loadCars();
  }

  // ==================== COLOR MANAGEMENT ====================

  addColor(): void {
    if (this.colorInput && !this.colors.includes(this.colorInput)) {
      this.colors.push(this.colorInput);
      this.carForm.color = this.colors.join(',');
      this.cdr.detectChanges();
    }
  }

  removeColor(index: number): void {
    this.colors.splice(index, 1);
    this.carForm.color = this.colors.join(',');
    this.cdr.detectChanges();
  }

  loadColorsFromCar(car: any): void {
    if (car.color) {
      this.colors = car.color.split(',').map((c: string) => c.trim()).filter((c: string) => c.length > 0);
      this.carForm.color = car.color;
    } else {
      this.colors = [];
      this.carForm.color = '';
    }
    this.cdr.detectChanges();
  }

  // ==================== MODAL CONTROLS ====================

  openAddModal(): void {
    this.resetForm();
    this.colors = [];
    this.carForm = {
      id: `car_${Date.now()}`,
      name: '',
      productionyear: '',
      brand: '',
      description: '',
      price: '',
      mileage: '',
      color: '',
      fueltype: '',
      horsepower: '',
      enginecapacity: '',
      transmission: '',
      category: '',
      modelpath: '',
      link: ''
    };
    this.selectedMainImageFile = null;
    this.mainImagePreview = null;
    this.selectedAdditionalImageFiles = [];
    this.additionalImages = [];
    this.additionalImagePreviews = [];
    this.selectedModelFile = null;
    this.uploadedMainImagePath = '';
    this.uploadedModelPath = '';
    this.showAddModal = true;
    this.cdr.detectChanges();
  }

  openEditModal(car: any): void {
    this.selectedCar = car;
    this.carForm = { ...car };
    this.loadColorsFromCar(car);
    
    // Load main image
    this.mainImagePreview = car.imgpath ? `${this.apiUrl}${car.imgpath}` : null;
    this.uploadedMainImagePath = car.imgpath || '';
    
    // Load additional images
    this.loadAdditionalImages(car.id);
    
    this.selectedMainImageFile = null;
    this.selectedAdditionalImageFiles = [];
    this.selectedModelFile = null;
    this.uploadedModelPath = car.modelpath || '';
    this.showEditModal = true;
    this.cdr.detectChanges();
  }

  loadAdditionalImages(carId: string): void {
    this.http.get(`${this.apiUrl}/product/getimages?id=${carId}`).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          // Filter out the main image from additional images
          const allImages: string[] = Array.isArray(response.data) ? response.data : [response.data];
          const mainImage: string = this.carForm.imgpath || this.uploadedMainImagePath;
          this.additionalImages = allImages.filter((img: string) => img !== mainImage);
        } else {
          this.additionalImages = [];
        }
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading additional images:', error);
        this.additionalImages = [];
        this.cdr.detectChanges();
      }
    });
  }

  openDeleteModal(car: any): void {
    this.selectedCar = car;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  closeAllModals(): void {
    this.showAddModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.selectedCar = null;
    this.selectedMainImageFile = null;
    this.selectedAdditionalImageFiles = [];
    this.selectedModelFile = null;
    this.uploadedMainImagePath = '';
    this.uploadedModelPath = '';
    this.cdr.detectChanges();
  }

  // ==================== FILE HANDLING ====================

  onMainImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file: File = input.files[0];
      this.selectedMainImageFile = file;

      if (this.mainImagePreview) {
        URL.revokeObjectURL(this.mainImagePreview);
      }
      this.mainImagePreview = URL.createObjectURL(file);
      this.cdr.detectChanges();
    }
  }

  onAdditionalImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      // Add new files to the existing list
      for (let i = 0; i < input.files.length; i++) {
        const file: File = input.files[i];
        // Check if file already exists in the list
        const exists: boolean = this.selectedAdditionalImageFiles.some((f: File) => f.name === file.name && f.size === file.size);
        if (!exists) {
          this.selectedAdditionalImageFiles.push(file);
          // Create preview
          const preview: string = URL.createObjectURL(file);
          this.additionalImagePreviews.push(preview);
        }
      }
      this.cdr.detectChanges();
    }
  }

  removeAdditionalImage(index: number): void {
    // If it's an existing image (from backend)
    if (typeof this.additionalImages[index] === 'string' && this.additionalImages[index].startsWith('/uploads/')) {
      const imagePath: string = this.additionalImages[index];
      // Remove from additional images array
      this.additionalImages.splice(index, 1);
      // Also remove from previews if it exists
      if (this.additionalImagePreviews[index]) {
        URL.revokeObjectURL(this.additionalImagePreviews[index]);
        this.additionalImagePreviews.splice(index, 1);
      }
    } 
    // If it's a newly uploaded file
    else if (this.selectedAdditionalImageFiles[index]) {
      // Revoke the object URL
      if (this.additionalImagePreviews[index]) {
        URL.revokeObjectURL(this.additionalImagePreviews[index]);
      }
      this.selectedAdditionalImageFiles.splice(index, 1);
      this.additionalImagePreviews.splice(index, 1);
    }
    this.cdr.detectChanges();
  }

  onModelSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedModelFile = input.files[0];
      this.cdr.detectChanges();
    }
  }

  // ==================== UPLOAD FUNCTIONS ====================

  uploadMainImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('imageFile', file);

      this.http.post(`${this.apiUrl}/api/images/cars/upload`, formData).subscribe({
        next: (res: any) => {
          console.log('✅ Main image uploaded successfully:', res);
          resolve(res.imagePath);
        },
        error: (err: any) => {
          console.error('Error uploading main image:', err);
          reject(err);
        }
      });
    });
  }

  uploadAdditionalImages(files: File[], carId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('carId', carId);
      
      files.forEach((file: File) => {
        formData.append('images', file);
      });

      this.http.post(`${this.apiUrl}/product/images/add`, formData).subscribe({
        next: (res: any) => {
          console.log('✅ Additional images uploaded successfully:', res);
          resolve(res);
        },
        error: (err: any) => {
          console.error('Error uploading additional images:', err);
          reject(err);
        }
      });
    });
  }

  uploadModel(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('modelFile', file);

      this.http.post(`${this.apiUrl}/api/models/cars/upload`, formData).subscribe({
        next: (res: any) => {
          console.log('✅ Model uploaded successfully:', res);
          resolve(res.modelPath);
        },
        error: (err: any) => {
          console.error('Error uploading model:', err);
          reject(err);
        }
      });
    });
  }

  parsePrice(price: string | number): number {
    return typeof price === 'string' ? parseFloat(price) : price;
  }

  // ==================== CRUD OPERATIONS ====================

  async addCar(): Promise<void> {
    if (!this.validateForm()) return;

    this.isLoading = true;
    this.imageUploading = true;
    this.modelUploading = true;

    try {
      let mainImagePath: string = '';

      // Upload main image if selected
      if (this.selectedMainImageFile) {
        mainImagePath = await this.uploadMainImage(this.selectedMainImageFile);
        console.log('Main image uploaded to:', mainImagePath);
      }

      // Upload model if selected
      let modelPath: string = this.uploadedModelPath || '';
      if (this.selectedModelFile) {
        modelPath = await this.uploadModel(this.selectedModelFile);
        console.log('Model uploaded to:', modelPath);
      }

      // Now save the car with the uploaded main image
      const formData = new FormData();
      Object.keys(this.carForm).forEach((key: string) => {
        if (this.carForm[key] !== null && this.carForm[key] !== undefined) {
          formData.append(key, this.carForm[key].toString());
        }
      });

      if (mainImagePath) {
        formData.set('imgpath', mainImagePath);
      }
      if (modelPath) {
        formData.set('modelpath', modelPath);
      }

      // Add car first
      this.http.post(`${this.apiUrl}/product/add`, formData).subscribe({
        next: async (res: any) => {
          console.log('✅ Car added successfully:', res);
          
          // Upload additional images if any
          if (this.selectedAdditionalImageFiles.length > 0) {
            try {
              await this.uploadAdditionalImages(this.selectedAdditionalImageFiles, this.carForm.id);
              console.log('✅ Additional images uploaded successfully');
            } catch (uploadError) {
              console.error('Error uploading additional images:', uploadError);
              // Don't fail the whole operation, additional images can be added later
            }
          }

          this.imageUploading = false;
          this.modelUploading = false;
          this.isLoading = false;
          this.closeAllModals();
          this.loadCars();
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          console.error('Error adding car:', error);
          alert('Failed to add car. Please try again.');
          this.imageUploading = false;
          this.modelUploading = false;
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });

    } catch (error) {
      console.error('Error in upload process:', error);
      alert('Failed to upload files. Please try again.');
      this.imageUploading = false;
      this.modelUploading = false;
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async updateCar(): Promise<void> {
    if (!this.validateForm()) return;

    this.isLoading = true;
    this.imageUploading = true;
    this.modelUploading = true;

    try {
      let mainImagePath: string = this.uploadedMainImagePath || this.carForm.imgpath || '';
      let modelPath: string = this.uploadedModelPath || this.carForm.modelpath || '';

      // Upload new main image if selected
      if (this.selectedMainImageFile) {
        mainImagePath = await this.uploadMainImage(this.selectedMainImageFile);
        console.log('New main image uploaded to:', mainImagePath);
      }

      // Upload new model if selected
      if (this.selectedModelFile) {
        modelPath = await this.uploadModel(this.selectedModelFile);
        console.log('New model uploaded to:', modelPath);
      }

      // Now update the car with the uploaded paths
      const formData = new FormData();
      Object.keys(this.carForm).forEach((key: string) => {
        if (this.carForm[key] !== null && this.carForm[key] !== undefined) {
          formData.append(key, this.carForm[key].toString());
        }
      });

      if (mainImagePath) {
        formData.set('imgpath', mainImagePath);
      }
      if (modelPath) {
        formData.set('modelpath', modelPath);
      }

      // Update car
      this.http.put(`${this.apiUrl}/product/update?id=${this.carForm.id}`, formData).subscribe({
        next: async (res: any) => {
          console.log('✅ Car updated successfully:', res);
          
          // Upload additional images if any
          if (this.selectedAdditionalImageFiles.length > 0) {
            try {
              await this.uploadAdditionalImages(this.selectedAdditionalImageFiles, this.carForm.id);
              console.log('✅ Additional images uploaded successfully');
            } catch (uploadError) {
              console.error('Error uploading additional images:', uploadError);
            }
          }

          this.imageUploading = false;
          this.modelUploading = false;
          this.isLoading = false;
          this.closeAllModals();
          this.loadCars();
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          console.error('Error updating car:', error);
          alert('Failed to update car. Please try again.');
          this.imageUploading = false;
          this.modelUploading = false;
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });

    } catch (error) {
      console.error('Error in upload process:', error);
      alert('Failed to upload files. Please try again.');
      this.imageUploading = false;
      this.modelUploading = false;
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  deleteCar(): void {
    if (!this.selectedCar) return;

    this.isLoading = true;

    // Extract filenames from paths
    const modelFilename: string = this.selectedCar.modelpath ? this.selectedCar.modelpath.split('/').pop() : '';
    const imageFilename: string = this.selectedCar.imgpath ? this.selectedCar.imgpath.split('/').pop() : '';

    // Delete model and image files
    const deleteRequests = [];

    if (modelFilename) {
      deleteRequests.push(
        this.http.delete(`${this.apiUrl}/api/models/cars/${modelFilename}`)
      );
    }

    if (imageFilename) {
      deleteRequests.push(
        this.http.delete(`${this.apiUrl}/api/images/cars/${imageFilename}`)
      );
    }

    // Execute all delete requests in parallel
    if (deleteRequests.length > 0) {
      forkJoin(deleteRequests).subscribe({
        next: (results: any[]) => {
          console.log('✅ Files deleted successfully');
          // Now delete the car from database
          this.deleteCarFromDatabase();
        },
        error: (error: any) => {
          console.error('Error deleting files:', error);
          // Still try to delete the car from database
          this.deleteCarFromDatabase();
        }
      });
    } else {
      this.deleteCarFromDatabase();
    }
  }

  private deleteCarFromDatabase(): void {
    this.http.delete(`${this.apiUrl}/product/delete?id=${this.selectedCar.id}`).subscribe({
      next: (res: any) => {
        console.log('✅ Car deleted successfully:', res);
        this.isLoading = false;
        this.closeAllModals();
        this.loadCars();
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error deleting car:', error);
        alert('Failed to delete car. Please try again.');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ==================== VALIDATION ====================

  validateForm(): boolean {
    const required: string[] = ['name', 'brand', 'price', 'productionyear'];
    for (const field of required) {
      if (!this.carForm[field]) {
        alert(`Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} field.`);
        return false;
      }
    }
    return true;
  }

  // ==================== UTILITY ====================

  resetForm(): void {
    this.carForm = {
      id: '',
      name: '',
      productionyear: '',
      brand: '',
      description: '',
      price: '',
      mileage: '',
      color: '',
      fueltype: '',
      horsepower: '',
      enginecapacity: '',
      transmission: '',
      category: '',
      modelpath: '',
      link: ''
    };
    this.colors = [];
    this.selectedMainImageFile = null;
    this.selectedAdditionalImageFiles = [];
    this.additionalImages = [];
    this.additionalImagePreviews = [];
    this.selectedModelFile = null;
    this.uploadedMainImagePath = '';
    this.uploadedModelPath = '';
    if (this.mainImagePreview) {
      URL.revokeObjectURL(this.mainImagePreview);
      this.mainImagePreview = null;
    }
    this.additionalImagePreviews.forEach((preview: string) => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    });
  }

  formatPrice(price: number): string {
    if (!price) return 'LKR 0';
    return `LKR ${price.toLocaleString()}`;
  }

  getImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    return `${this.apiUrl}${imagePath}`;
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  goBack(): void {
    this.router.navigate(['/admin-dashboard']);
  }
}