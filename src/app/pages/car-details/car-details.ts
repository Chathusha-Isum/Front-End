import { ChangeDetectorRef, Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Upload } from '../../component/upload/upload';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-car-details',
  standalone: true,
  imports: [CommonModule, Upload],
  templateUrl: './car-details.html',
  styleUrl: './car-details.css',
})
export class CarDetails implements OnInit, AfterViewInit {
  public data: any = null;
  private id: any = "";
  public loading: boolean = false;
  public showImageModal: boolean = false;
  public images: string[] = [];
  public currentImageIndex: number = 0;
  public isLoadingImages: boolean = false;
  public error: string = '';
  private apiUrl = 'http://localhost:8080';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.id = localStorage.getItem("car");
    if (this.id) {
      this.fetchData();
    } else {
      this.error = 'No car selected';
    }
  }

  ngAfterViewInit(): void {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }

  fetchData(): void {
    this.loading = true;
    this.error = '';

    this.http.get(`${this.apiUrl}/product/id?id=${this.id}`).subscribe({
      next: (data: any) => {
        this.data = data.data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching car:', err);
        this.error = err.error?.message || 'Failed to load car details';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ==================== IMAGE CAROUSEL ====================

  openImageModal(): void {
    this.showImageModal = true;
    this.currentImageIndex = 0;
    this.fetchCarImages();
  }

  closeImageModal(): void {
    this.showImageModal = false;
    this.images = [];
    this.currentImageIndex = 0;
    this.isLoadingImages = false;
    this.cdr.detectChanges();
  }

  fetchCarImages(): void {
    if (!this.id) return;

    this.isLoadingImages = true;
    this.images = [];

    // Fetch all images for this car
    this.http.get(`${this.apiUrl}/product/getimages?id=${this.id}`).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          this.images = Array.isArray(response.data) ? response.data : [response.data];
        } else if (Array.isArray(response)) {
          this.images = response;
        } else {
          this.images = [];
        }

        // If no images found, try to get the main image
        if (this.images.length === 0 && this.data?.imgpath) {
          this.images = [this.data.imgpath];
        }

        this.isLoadingImages = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching car images:', err);
        // Try to use the main image from car data as fallback
        if (this.data?.imgpath) {
          this.images = [this.data.imgpath];
        } else {
          this.images = [];
        }
        this.isLoadingImages = false;
        this.cdr.detectChanges();
      }
    });
  }

  nextImage(): void {
    if (this.images.length > 0) {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
    }
  }

  prevImage(): void {
    if (this.images.length > 0) {
      this.currentImageIndex = (this.currentImageIndex - 1 + this.images.length) % this.images.length;
    }
  }

  getImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('data:')) return imagePath;
    return `${this.apiUrl}${imagePath}`;
  }

  handleImageError(event: any): void {
    event.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 24 24" fill="none" stroke="%23475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';
  }

  handleThumbnailError(event: any): void {
    event.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="%23475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';
  }

  formatPrice(price: number): string {
    if (!price) return 'LKR 0';
    return `LKR ${price.toLocaleString()}`;
  }

  goBack(): void {
    this.router.navigate(['/cars']);
  }

  // ==================== NAVIGATE TO PAYMENT ====================
  goToPayment(): void {
    if (!this.data) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Car data not available',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Prepare payment data
    const paymentData = {
      amount: this.data.price,
      currency: 'LKR',
      paymentType: 'car',
      itemId: this.data.id,
      itemName: this.data.name,
      quantity: 1,
      unitPrice: this.data.price,
      metadata: {
        carBrand: this.data.brand,
        carYear: this.data.productionyear,
        carCategory: this.data.category
      }
    };

    // Store payment data in localStorage
    localStorage.setItem('paymentData', JSON.stringify(paymentData));

    // Navigate to payment page
    this.router.navigate(['/payment']);
  }
}