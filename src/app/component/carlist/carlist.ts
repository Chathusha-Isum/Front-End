import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-carlist',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carlist.html',
  styleUrls: ['./carlist.css']
})
export class Carlist implements OnInit {
  list: any[] = [];
  loading = false;
  error = '';
  defaultImage = 'https://raw.githubusercontent.com/creativetimofficial/public-assets/master/ct-assets/mt-demo.jpg';
  private apiUrl = 'http://localhost:8080';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.loading = true;
    this.error = '';
    
    this.http.get(`${this.apiUrl}/product/`)
      .subscribe({
        next: (data: any) => {       
          this.list = data.data || [];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error fetching cars:', error);
          this.error = error.error?.message || 'Failed to load cars. Please try again.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Get full image URL
   */
  getImageUrl(imgpath: string): string {
    if (!imgpath) return this.defaultImage;
    // If it's already a full URL (starts with http)
    if (imgpath.startsWith('http://') || imgpath.startsWith('https://')) {
      return imgpath;
    }
    // If it's a relative path from uploads
    if (imgpath.startsWith('/uploads/')) {
      return `${this.apiUrl}${imgpath}`;
    }
    // If it's just a filename, assume it's in uploads/cars
    return `${this.apiUrl}/uploads/cars/${imgpath}`;
  }

  /**
   * Get model URL for 3D viewer
   */
  getModelUrl(modelpath: string): string {
    if (!modelpath) return '';
    const filename = modelpath.split('/').pop();
    return `${this.apiUrl}/api/models/cars/${filename}`;
  }

  /**
   * Navigate to car details page
   */
  navigate(id: string): void {
    localStorage.setItem('car', id);
    this.router.navigate(['/car-details']);
  }

  /**
   * Format price with LKR
   */
  formatPrice(price: number): string {
    if (!price) return 'LKR 0';
    return `LKR ${price.toLocaleString()}`;
  }
}