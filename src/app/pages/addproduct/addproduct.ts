import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-addproduct',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './addproduct.html',
  styleUrl: './addproduct.css',
})
export class Addproduct implements OnInit {
  public carData: any = {
    name: '',
    productionyear: null,
    brand: '',
    description: '',
    price: null,
    mileage: null,
    color: '',
    fueltype: '',
    horsepower: null,
    enginecapacity: null,
    transmission: '',
    category: '',
    modelpath: '',
    imgpath: '',
    link: ''
  };

  public selectedImageFile: File | null = null;
  public selectedModelFile: File | null = null;
  public imagePreview: string | null = null;
  public imageFileName: string = '';
  public modelFileName: string = '';
  public isSubmitting: boolean = false;
  public errorMessage: string = '';
  public successMessage: string = '';
  public sellerEmail: string = '';

  private apiUrl = 'http://localhost:8080';

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.sellerEmail = localStorage.getItem('email') || '';
  }

  ngOnInit(): void {
    if (!this.sellerEmail) {
      this.router.navigate(['/login']);
    }
  }

  // ==================== IMAGE HANDLING ====================

  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const validTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        this.errorMessage = 'Please upload a valid image (PNG, JPG, JPEG, WEBP)';
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'Image size must be less than 5MB';
        return;
      }

      this.selectedImageFile = file;
      this.imageFileName = file.name;

      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
      this.errorMessage = '';
    }
  }

  // ==================== 3D MODEL HANDLING ====================

  onModelSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const validExtensions = ['.glb', '.gltf', '.fbx', '.obj'];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!validExtensions.includes(ext)) {
        this.errorMessage = 'Please upload a valid 3D model (GLB, GLTF, FBX, OBJ)';
        return;
      }

      if (file.size > 200 * 1024 * 1024) {
        this.errorMessage = 'Model file size must be less than 200MB';
        return;
      }

      this.selectedModelFile = file;
      this.modelFileName = file.name;
      this.errorMessage = '';
    }
  }

  // ==================== FORM SUBMISSION ====================

  onSubmit(): void {
    if (this.isSubmitting) return;

    if (!this.carData.name || !this.carData.brand || !this.carData.productionyear ||
      !this.carData.category || !this.carData.price || !this.carData.color ||
      !this.carData.fueltype || !this.carData.transmission) {
      this.errorMessage = 'Please fill in all required fields marked with *';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Step 1: Upload 3D Model if selected
    if (this.selectedModelFile) {
      this.uploadModelAndCar();
    } else {
      this.saveCar();
    }
  }

  // ==================== UPLOAD 3D MODEL ====================

  uploadModelAndCar(): void {
    const formData = new FormData();
    formData.append('modelFile', this.selectedModelFile!);

    this.http.post(`${this.apiUrl}/api/models/cars/upload`, formData).subscribe({
      next: (res: any) => {
        const modelPath = res.modelPath;
        this.carData.modelpath = modelPath;
        this.saveCar();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.error || 'Failed to upload 3D model. Please try again.';
        console.error('Error uploading model:', err);
      }
    });
  }

  // ==================== SAVE CAR ====================

  saveCar(): void {
    const formData = new FormData();

    formData.append('name', this.carData.name);
    formData.append('brand', this.carData.brand);
    formData.append('productionyear', this.carData.productionyear?.toString() || '');
    formData.append('category', this.carData.category);
    formData.append('price', this.carData.price?.toString() || '');
    formData.append('color', this.carData.color);
    formData.append('fueltype', this.carData.fueltype);
    formData.append('transmission', this.carData.transmission);
    formData.append('sellerEmail', this.sellerEmail);
    
    if (this.carData.mileage) formData.append('mileage', this.carData.mileage.toString());
    if (this.carData.horsepower) formData.append('horsepower', this.carData.horsepower.toString());
    if (this.carData.enginecapacity) formData.append('enginecapacity', this.carData.enginecapacity.toString());
    if (this.carData.description) formData.append('description', this.carData.description);
    if (this.carData.link) formData.append('link', this.carData.link);
    if (this.carData.modelpath) formData.append('modelpath', this.carData.modelpath);

    if (this.selectedImageFile) {
      formData.append('imgpath', this.selectedImageFile, this.selectedImageFile.name);
    }

    this.http.post(`${this.apiUrl}/product/add`, formData).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.successMessage = 'Car added successfully! Redirecting...';
        setTimeout(() => {
          this.router.navigate(['/seller-dashboard']);
        }, 1500);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'Failed to add car. Please try again.';
        console.error('Error adding car:', err);
      }
    });
  }

  // ==================== NAVIGATION ====================

  goBack(): void {
    this.router.navigate(['/seller-dashboard']);
  }
}