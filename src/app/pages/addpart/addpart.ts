import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-addpart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './addpart.html',
  styleUrl: './addpart.css',
})
export class Addpart implements OnInit {
  public partData: any = {
    car: '',
    name: '',
    condition: '',
    qty: null,
    price: null,
    imgpath: '',
    description: ''
  };

  public selectedImageFile: File | null = null;
  public imagePreview: string | null = null;
  public imageFileName: string = '';
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
      // Validate file type
      const validTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        this.errorMessage = 'Please upload a valid image (PNG, JPG, JPEG, WEBP)';
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'Image size must be less than 5MB';
        return;
      }

      this.selectedImageFile = file;
      this.imageFileName = file.name;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
      this.errorMessage = '';
    }
  }

  // ==================== FORM SUBMISSION ====================

  onSubmit(): void {
    if (this.isSubmitting) return;

    // Validate required fields
    if (!this.partData.car || !this.partData.name || !this.partData.condition ||
      !this.partData.qty || !this.partData.price) {
      this.errorMessage = 'Please fill in all required fields marked with *';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Upload image first if selected
    if (this.selectedImageFile) {
      this.uploadImageAndPart();
    } else {
      this.savePart();
    }
  }

  // ==================== UPLOAD IMAGE ====================

  uploadImageAndPart(): void {
    const formData = new FormData();
    formData.append('imageFile', this.selectedImageFile!);

    this.http.post(`${this.apiUrl}/api/images/parts/upload`, formData).subscribe({
      next: (res: any) => {
        // Image uploaded successfully, get the image path
        const imagePath = res.imagePath; // '/uploads/parts/part-123.jpg'
        this.partData.imgpath = imagePath;
        // Save part with image path
        this.savePart();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.error || 'Failed to upload image. Please try again.';
        console.error('Error uploading image:', err);
      }
    });
  }

  // ==================== SAVE PART ====================

  savePart(): void {
    const formData = new FormData();

    // Append all part data fields
    formData.append('car', this.partData.car);
    formData.append('name', this.partData.name);
    formData.append('condition', this.partData.condition);
    formData.append('qty', this.partData.qty?.toString() || '0');
    formData.append('price', this.partData.price?.toString() || '0');
    formData.append('sellerEmail', this.sellerEmail);

    // Optional fields
    if (this.partData.description) formData.append('description', this.partData.description);
    if (this.partData.imgpath) formData.append('imgpath', this.partData.imgpath);

    // Save part to database
    this.http.post(`${this.apiUrl}/carpart/add`, formData).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.successMessage = 'Part added successfully! Redirecting...';
        setTimeout(() => {
          this.router.navigate(['/seller-dashboard']);
        }, 1500);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'Failed to add part. Please try again.';
        console.error('Error adding part:', err);
      }
    });
  }

  // ==================== NAVIGATION ====================

  goBack(): void {
    this.router.navigate(['/seller-dashboard']);
  }
}