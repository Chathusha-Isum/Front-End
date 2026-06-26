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

  // File upload
  public selectedImageFile: File | null = null;
  public selectedModelFile: File | null = null;
  public imagePreview: string | null = null;
  public imageUploading: boolean = false;
  public modelUploading: boolean = false;
  public uploadedImagePath: string = '';
  public uploadedModelPath: string = '';

  // Color management
  public colorInput: string = '#ffffff';
  public colors: string[] = [];

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadCars();
  }

  ngOnDestroy(): void {
    if (this.imagePreview) {
      URL.revokeObjectURL(this.imagePreview);
    }
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
      error: (error) => {
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
      error: (error) => {
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
    this.selectedImageFile = null;
    this.selectedModelFile = null;
    this.imagePreview = null;
    this.uploadedImagePath = '';
    this.uploadedModelPath = '';
    this.showAddModal = true;
    this.cdr.detectChanges();
  }

  openEditModal(car: any): void {
    this.selectedCar = car;
    this.carForm = { ...car };
    this.loadColorsFromCar(car);
    this.imagePreview = car.imgpath ? `${this.apiUrl}${car.imgpath}` : null;
    this.selectedImageFile = null;
    this.selectedModelFile = null;
    this.uploadedImagePath = car.imgpath || '';
    this.uploadedModelPath = car.modelpath || '';
    this.showEditModal = true;
    this.cdr.detectChanges();
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
    this.selectedImageFile = null;
    this.selectedModelFile = null;
    this.uploadedImagePath = '';
    this.uploadedModelPath = '';
    this.cdr.detectChanges();
  }

  // ==================== FILE HANDLING ====================

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedImageFile = file;

      if (this.imagePreview) {
        URL.revokeObjectURL(this.imagePreview);
      }
      this.imagePreview = URL.createObjectURL(file);
      this.cdr.detectChanges();
    }
  }

  onModelSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedModelFile = input.files[0];
      this.cdr.detectChanges();
    }
  }

  // ==================== UPLOAD FUNCTIONS ====================

  uploadImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('imageFile', file);

      // FIXED: Added missing slash
      this.http.post(`${this.apiUrl}/api/images/cars/upload`, formData).subscribe({
        next: (res: any) => {
          console.log('✅ Image uploaded successfully:', res);
          resolve(res.imagePath);
        },
        error: (err) => {
          console.error('Error uploading image:', err);
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
        error: (err) => {
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
      let imagePath = '';
      let modelPath = '';

      // Upload image if selected
      if (this.selectedImageFile) {
        imagePath = await this.uploadImage(this.selectedImageFile);
        console.log('Image uploaded to:', imagePath);
      }

      // Upload model if selected
      if (this.selectedModelFile) {
        modelPath = await this.uploadModel(this.selectedModelFile);
        console.log('Model uploaded to:', modelPath);
      }

      // Now save the car with the uploaded paths
      const formData = new FormData();
      Object.keys(this.carForm).forEach(key => {
        if (this.carForm[key] !== null && this.carForm[key] !== undefined) {
          formData.append(key, this.carForm[key].toString());
        }
      });

      // Use the uploaded paths
      if (imagePath) {
        formData.set('imgpath', imagePath);
      }
      if (modelPath) {
        formData.set('modelpath', modelPath);
      }

      this.http.post(`${this.apiUrl}/product/add`, formData).subscribe({
        next: (res: any) => {
          console.log('✅ Car added successfully:', res);
          this.imageUploading = false;
          this.modelUploading = false;
          this.isLoading = false;
          this.closeAllModals();
          this.loadCars();
          this.cdr.detectChanges();
        },
        error: (error) => {
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

    try {
      let imagePath = this.uploadedImagePath || this.carForm.imgpath || '';
      let modelPath = this.uploadedModelPath || this.carForm.modelpath || '';

      // Upload new image if selected
      if (this.selectedImageFile) {
        imagePath = await this.uploadImage(this.selectedImageFile);
        console.log('New image uploaded to:', imagePath);
      }

      // Upload new model if selected
      if (this.selectedModelFile) {
        modelPath = await this.uploadModel(this.selectedModelFile);
        console.log('New model uploaded to:', modelPath);
      }

      // Now update the car with the uploaded paths
      const formData = new FormData();
      Object.keys(this.carForm).forEach(key => {
        if (this.carForm[key] !== null && this.carForm[key] !== undefined) {
          formData.append(key, this.carForm[key].toString());
        }
      });

      if (imagePath) {
        formData.set('imgpath', imagePath);
      }
      if (modelPath) {
        formData.set('modelpath', modelPath);
      }

      this.http.put(`${this.apiUrl}/product/update?id=${this.carForm.id}`, formData).subscribe({
        next: (res: any) => {
          console.log('✅ Car updated successfully:', res);
          this.imageUploading = false;
          this.isLoading = false;
          this.closeAllModals();
          this.loadCars();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error updating car:', error);
          alert('Failed to update car. Please try again.');
          this.imageUploading = false;
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });

    } catch (error) {
      console.error('Error in upload process:', error);
      alert('Failed to upload files. Please try again.');
      this.imageUploading = false;
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  deleteCar(): void {
    if (!this.selectedCar) return;

    this.isLoading = true;

    // Extract filenames from paths
    const modelFilename = this.selectedCar.modelpath ? this.selectedCar.modelpath.split('/').pop() : '';
    const imageFilename = this.selectedCar.imgpath ? this.selectedCar.imgpath.split('/').pop() : '';

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
        next: (results) => {
          console.log('✅ Files deleted successfully');
          // Now delete the car from database
          this.deleteCarFromDatabase();
        },
        error: (error) => {
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
      error: (error) => {
        console.error('Error deleting car:', error);
        alert('Failed to delete car. Please try again.');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ==================== VALIDATION ====================

  validateForm(): boolean {
    const required = ['name', 'brand', 'price', 'productionyear'];
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
    this.selectedImageFile = null;
    this.selectedModelFile = null;
    this.uploadedImagePath = '';
    this.uploadedModelPath = '';
    if (this.imagePreview) {
      URL.revokeObjectURL(this.imagePreview);
      this.imagePreview = null;
    }
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