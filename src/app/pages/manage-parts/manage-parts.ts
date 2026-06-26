import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-manage-parts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-parts.html',
  styleUrls: ['./manage-parts.css']
})
export class ManageParts implements OnInit, OnDestroy {
  private apiUrl = 'http://localhost:8080';
  
  // State
  public isLoading: boolean = false;
  public showAddModal: boolean = false;
  public showEditModal: boolean = false;
  public showDeleteModal: boolean = false;
  public selectedPart: any = null;
  public parts: any[] = [];
  public searchTerm: string = '';
  public conditionFilter: string = '';

  // Part form model
  public partForm: any = {
    id: '',
    car: '',
    name: '',
    condition: '',
    qty: '',
    price: '',
    description: ''
  };

  // File upload
  public selectedImageFile: File | null = null;
  public imagePreview: string | null = null;
  public imageUploading: boolean = false;
  public uploadedImagePath: string = '';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadParts();
  }

  ngOnDestroy(): void {
    if (this.imagePreview) {
      URL.revokeObjectURL(this.imagePreview);
    }
  }

  // ==================== LOAD PARTS ====================

  loadParts(): void {
    this.isLoading = true;
    this.http.get(`${this.apiUrl}/carpart`).subscribe({
      next: (res: any) => {
        this.parts = res.data || [];
        console.log(`✅ Loaded ${this.parts.length} parts`);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading parts:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ==================== SEARCH ====================

  searchParts(): void {
    if (!this.searchTerm.trim()) {
      this.loadParts();
      return;
    }
    
    this.isLoading = true;
    this.http.get(`${this.apiUrl}/carpart/search?car=${this.searchTerm}`).subscribe({
      next: (res: any) => {
        this.parts = res.data || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error searching parts:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  filterByCondition(condition: string): void {
    if (!condition) {
      this.loadParts();
      return;
    }
    
    this.isLoading = true;
    this.http.get(`${this.apiUrl}/carpart/condition?condition=${condition}`).subscribe({
      next: (res: any) => {
        this.parts = res.data || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error filtering parts:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.conditionFilter = '';
    this.loadParts();
  }

  // ==================== MODAL CONTROLS ====================

  openAddModal(): void {
    this.resetForm();
    this.partForm = {
      id: `prt_${Date.now()}`,
      car: '',
      name: '',
      condition: 'New',
      qty: 1,
      price: '',
      description: ''
    };
    this.selectedImageFile = null;
    this.imagePreview = null;
    this.uploadedImagePath = '';
    this.showAddModal = true;
    this.cdr.detectChanges();
  }

  openEditModal(part: any): void {
    this.selectedPart = part;
    this.partForm = { ...part };
    this.imagePreview = part.imgpath ? `${this.apiUrl}${part.imgpath}` : null;
    this.selectedImageFile = null;
    this.uploadedImagePath = part.imgpath || '';
    this.showEditModal = true;
    this.cdr.detectChanges();
  }

  openDeleteModal(part: any): void {
    this.selectedPart = part;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  closeAllModals(): void {
    this.showAddModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.selectedPart = null;
    this.selectedImageFile = null;
    this.uploadedImagePath = '';
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

  // ==================== UPLOAD FUNCTIONS ====================

  uploadImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('imageFile', file);

      this.http.post(`${this.apiUrl}/api/images/parts/upload`, formData).subscribe({
        next: (res: any) => {
          console.log('✅ Part image uploaded successfully:', res);
          resolve(res.imagePath);
        },
        error: (err) => {
          console.error('Error uploading part image:', err);
          reject(err);
        }
      });
    });
  }

  parsePrice(price: string | number): number {
    return typeof price === 'string' ? parseFloat(price) : price;
  }

  // ==================== CRUD OPERATIONS ====================

  async addPart(): Promise<void> {
    if (!this.validateForm()) return;

    this.isLoading = true;
    this.imageUploading = true;

    try {
      let imagePath = '';

      // Upload image if selected
      if (this.selectedImageFile) {
        imagePath = await this.uploadImage(this.selectedImageFile);
        console.log('Image uploaded to:', imagePath);
      }

      // Now save the part with the uploaded path
      const formData = new FormData();
      Object.keys(this.partForm).forEach(key => {
        if (this.partForm[key] !== null && this.partForm[key] !== undefined) {
          formData.append(key, this.partForm[key].toString());
        }
      });

      if (imagePath) {
        console.log(imagePath);
        
        formData.set('imgpath', imagePath);
      }

      this.http.post(`${this.apiUrl}/carpart/add`, formData).subscribe({
        next: (res: any) => {
          console.log('✅ Part added successfully:', res);
          this.imageUploading = false;
          this.isLoading = false;
          this.closeAllModals();
          this.loadParts();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error adding part:', error);
          alert('Failed to add part. Please try again.');
          this.imageUploading = false;
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });

    } catch (error) {
      console.error('Error in upload process:', error);
      alert('Failed to upload image. Please try again.');
      this.imageUploading = false;
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async updatePart(): Promise<void> {
    if (!this.validateForm()) return;

    this.isLoading = true;
    this.imageUploading = true;

    try {
      let imagePath = this.uploadedImagePath || this.partForm.imgpath || '';

      // Upload new image if selected
      if (this.selectedImageFile) {
        imagePath = await this.uploadImage(this.selectedImageFile);
        console.log('New image uploaded to:', imagePath);
      }

      // Now update the part with the uploaded path
      const formData = new FormData();
      Object.keys(this.partForm).forEach(key => {
        if (this.partForm[key] !== null && this.partForm[key] !== undefined) {
          formData.append(key, this.partForm[key].toString());
        }
      });

      if (imagePath) {
        formData.set('imgpath', imagePath);
      }

      this.http.put(`${this.apiUrl}/carpart/update?id=${this.partForm.id}`, formData).subscribe({
        next: (res: any) => {
          console.log('✅ Part updated successfully:', res);
          this.imageUploading = false;
          this.isLoading = false;
          this.closeAllModals();
          this.loadParts();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error updating part:', error);
          alert('Failed to update part. Please try again.');
          this.imageUploading = false;
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });

    } catch (error) {
      console.error('Error in upload process:', error);
      alert('Failed to upload image. Please try again.');
      this.imageUploading = false;
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  deletePart(): void {
    if (!this.selectedPart) return;

    this.isLoading = true;

    // Extract filename from path
    const imageFilename = this.selectedPart.imgpath ? this.selectedPart.imgpath.split('/').pop() : '';

    // Delete image file if exists
    if (imageFilename) {
      this.http.delete(`${this.apiUrl}/api/images/parts/${imageFilename}`).subscribe({
        next: (res: any) => {
          console.log('✅ Part image deleted successfully:', res);
          this.deletePartFromDatabase();
        },
        error: (error) => {
          console.error('Error deleting part image:', error);
          // Still try to delete the part from database
          this.deletePartFromDatabase();
        }
      });
    } else {
      this.deletePartFromDatabase();
    }
  }

  private deletePartFromDatabase(): void {
    this.http.delete(`${this.apiUrl}/carpart/delete?id=${this.selectedPart.id}`).subscribe({
      next: (res: any) => {
        console.log('✅ Part deleted successfully:', res);
        this.isLoading = false;
        this.closeAllModals();
        this.loadParts();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error deleting part:', error);
        alert('Failed to delete part. Please try again.');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ==================== VALIDATION ====================

  validateForm(): boolean {
    const required = ['name', 'car', 'price', 'qty', 'condition'];
    for (const field of required) {
      if (!this.partForm[field]) {
        alert(`Please fill in the ${field} field.`);
        return false;
      }
    }
    if (isNaN(this.partForm.price) || parseFloat(this.partForm.price) <= 0) {
      alert('Please enter a valid price.');
      return false;
    }
    if (isNaN(this.partForm.qty) || parseInt(this.partForm.qty) < 0) {
      alert('Please enter a valid quantity.');
      return false;
    }
    return true;
  }

  // ==================== UTILITY ====================

  resetForm(): void {
    this.partForm = {
      id: '',
      car: '',
      name: '',
      condition: 'New',
      qty: '',
      price: '',
      description: ''
    };
    this.selectedImageFile = null;
    this.uploadedImagePath = '';
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

  getConditionClass(condition: string): string {
    const classes: { [key: string]: string } = {
      'New': 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20',
      'Used': 'bg-blue-500/20 text-blue-300 border border-blue-500/20',
      'Refurbished': 'bg-amber-500/20 text-amber-300 border border-amber-500/20'
    };
    return classes[condition] || 'bg-slate-500/20 text-slate-300 border border-slate-500/20';
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  goBack(): void {
    this.router.navigate(['/admin-dashboard']);
  }
}