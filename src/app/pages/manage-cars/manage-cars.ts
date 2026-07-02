import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';

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
        Swal.fire('Error', 'Failed to load cars. Please try again.', 'error');
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
        Swal.fire('Error', 'Failed to search cars. Please try again.', 'error');
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
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        Swal.fire('File Too Large', 'Image size exceeds 10MB limit. Please choose a smaller image.', 'warning');
        input.value = '';
        return;
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        Swal.fire('Invalid File Type', 'Please upload JPEG, PNG, WEBP images only.', 'warning');
        input.value = '';
        return;
      }
      
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
      // Check total files limit (max 10 additional images)
      const totalFiles = this.selectedAdditionalImageFiles.length + input.files.length;
      if (totalFiles > 10) {
        Swal.fire('Too Many Files', 'You can upload a maximum of 10 additional images.', 'warning');
        input.value = '';
        return;
      }
      
      for (let i = 0; i < input.files.length; i++) {
        const file: File = input.files[i];
        
        // Validate file size
        if (file.size > 10 * 1024 * 1024) {
          Swal.fire('File Too Large', `Image "${file.name}" exceeds 10MB limit.`, 'warning');
          continue;
        }
        
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          Swal.fire('Invalid File Type', `Invalid file type for "${file.name}". Please upload JPEG, PNG, WEBP images only.`, 'warning');
          continue;
        }
        
        // Check if file already exists in the list
        const exists: boolean = this.selectedAdditionalImageFiles.some((f: File) => f.name === file.name && f.size === file.size);
        if (!exists) {
          this.selectedAdditionalImageFiles.push(file);
          const preview: string = URL.createObjectURL(file);
          this.additionalImagePreviews.push(preview);
        }
      }
      this.cdr.detectChanges();
    }
  }

  removeAdditionalImage(index: number): void {
    if (typeof this.additionalImages[index] === 'string' && this.additionalImages[index].startsWith('/uploads/')) {
      this.additionalImages.splice(index, 1);
      if (this.additionalImagePreviews[index]) {
        URL.revokeObjectURL(this.additionalImagePreviews[index]);
        this.additionalImagePreviews.splice(index, 1);
      }
    } else if (this.selectedAdditionalImageFiles[index]) {
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
      const file: File = input.files[0];
      
      // Validate file size (max 50MB for 3D models)
      if (file.size > 250 * 1024 * 1024) {
        Swal.fire('File Too Large', 'Model file exceeds 250MB limit. Please choose a smaller file.', 'warning');
        input.value = '';
        return;
      }
      
      // Validate file type
      const allowedTypes = ['.glb', '.gltf', '.fbx', '.obj'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedTypes.includes(fileExtension)) {
        Swal.fire('Invalid File Type', 'Please upload GLB, GLTF, FBX, or OBJ files only.', 'warning');
        input.value = '';
        return;
      }
      
      this.selectedModelFile = file;
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

  // ==================== VALIDATION ====================

  validateForm(): boolean {
    const errors: string[] = [];

    // Required fields validation
    const requiredFields = [
      { field: 'name', label: 'Car Name' },
      { field: 'brand', label: 'Brand' },
      { field: 'price', label: 'Price' },
      { field: 'productionyear', label: 'Production Year' }
    ];

    for (const req of requiredFields) {
      if (!this.carForm[req.field] || this.carForm[req.field].toString().trim() === '') {
        errors.push(`${req.label} is required.`);
      }
    }

    // Price validation
    if (this.carForm.price) {
      const price = parseFloat(this.carForm.price);
      if (isNaN(price) || price <= 0) {
        errors.push('Price must be a valid positive number.');
      }
      if (price > 999999999) {
        errors.push('Price cannot exceed 999,999,999.');
      }
    }

    // Production year validation
    if (this.carForm.productionyear) {
      const year = parseInt(this.carForm.productionyear);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1900 || year > currentYear + 1) {
        errors.push(`Production year must be between 1900 and ${currentYear + 1}.`);
      }
    }

    // Mileage validation
    if (this.carForm.mileage) {
      const mileage = parseInt(this.carForm.mileage);
      if (isNaN(mileage) || mileage < 0) {
        errors.push('Mileage must be a valid non-negative number.');
      }
      if (mileage > 9999999) {
        errors.push('Mileage cannot exceed 9,999,999.');
      }
    }

    // Horsepower validation
    if (this.carForm.horsepower) {
      const hp = parseInt(this.carForm.horsepower);
      if (isNaN(hp) || hp < 0) {
        errors.push('Horsepower must be a valid non-negative number.');
      }
      if (hp > 5000) {
        errors.push('Horsepower cannot exceed 5000.');
      }
    }

    // Engine capacity validation
    if (this.carForm.enginecapacity) {
      const engine = parseFloat(this.carForm.enginecapacity);
      if (isNaN(engine) || engine < 0) {
        errors.push('Engine capacity must be a valid non-negative number.');
      }
      if (engine > 20) {
        errors.push('Engine capacity cannot exceed 20.0L.');
      }
    }

    // Colors validation
    if (this.colors.length === 0) {
      errors.push('Please add at least one color.');
    }

    // If there are errors, show them in SweetAlert
    if (errors.length > 0) {
      const errorMessage = errors.map(err => `• ${err}`).join('\n');
      Swal.fire({
        icon: 'warning',
        title: 'Validation Errors',
        text: errorMessage,
        confirmButtonText: 'OK, Fix Issues'
      });
      return false;
    }

    return true;
  }

  // ==================== CRUD OPERATIONS ====================

  async addCar(): Promise<void> {
    // Validate form before proceeding
    if (!this.validateForm()) {
      return;
    }

    // Confirm before adding
    const confirmResult = await Swal.fire({
      icon: 'question',
      title: 'Add New Car',
      text: `Are you sure you want to add "${this.carForm.name}"?`,
      showCancelButton: true,
      confirmButtonText: 'Yes, Add Car',
      cancelButtonText: 'Cancel'
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

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
          
          Swal.fire({
            icon: 'success',
            title: 'Car Added!',
            text: `${this.carForm.name} has been added successfully.`,
            timer: 2000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
          });
        },
        error: (error: any) => {
          console.error('Error adding car:', error);
          this.imageUploading = false;
          this.modelUploading = false;
          this.isLoading = false;
          this.cdr.detectChanges();
          Swal.fire('Error', error.error?.message || 'Failed to add car. Please try again.', 'error');
        }
      });

    } catch (error) {
      console.error('Error in upload process:', error);
      this.imageUploading = false;
      this.modelUploading = false;
      this.isLoading = false;
      this.cdr.detectChanges();
      Swal.fire('Error', 'Failed to upload files. Please try again.', 'error');
    }
  }

  async updateCar(): Promise<void> {
    // Validate form before proceeding
    if (!this.validateForm()) {
      return;
    }

    // Confirm before updating
    const confirmResult = await Swal.fire({
      icon: 'question',
      title: 'Update Car',
      text: `Are you sure you want to update "${this.carForm.name}"?`,
      showCancelButton: true,
      confirmButtonText: 'Yes, Update Car',
      cancelButtonText: 'Cancel'
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

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
          
          Swal.fire({
            icon: 'success',
            title: 'Car Updated!',
            text: `${this.carForm.name} has been updated successfully.`,
            timer: 2000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
          });
        },
        error: (error: any) => {
          console.error('Error updating car:', error);
          this.imageUploading = false;
          this.modelUploading = false;
          this.isLoading = false;
          this.cdr.detectChanges();
          Swal.fire('Error', error.error?.message || 'Failed to update car. Please try again.', 'error');
        }
      });

    } catch (error) {
      console.error('Error in upload process:', error);
      this.imageUploading = false;
      this.modelUploading = false;
      this.isLoading = false;
      this.cdr.detectChanges();
      Swal.fire('Error', 'Failed to upload files. Please try again.', 'error');
    }
  }

  deleteCar(): void {
    if (!this.selectedCar) return;

    Swal.fire({
      icon: 'warning',
      title: 'Delete Car',
      text: `Are you sure you want to delete "${this.selectedCar.name}"? This action cannot be undone!`,
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed) {
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
              this.deleteCarFromDatabase();
            },
            error: (error: any) => {
              console.error('Error deleting files:', error);
              this.deleteCarFromDatabase();
            }
          });
        } else {
          this.deleteCarFromDatabase();
        }
      }
    });
  }

  private deleteCarFromDatabase(): void {
    this.http.delete(`${this.apiUrl}/product/delete?id=${this.selectedCar.id}`).subscribe({
      next: (res: any) => {
        console.log('✅ Car deleted successfully:', res);
        this.isLoading = false;
        this.closeAllModals();
        this.loadCars();
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'success',
          title: 'Car Deleted!',
          text: `${this.selectedCar.name} has been deleted successfully.`,
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      },
      error: (error: any) => {
        console.error('Error deleting car:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
        Swal.fire('Error', 'Failed to delete car. Please try again.', 'error');
      }
    });
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