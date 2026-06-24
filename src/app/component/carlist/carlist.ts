import { Component, OnInit, ChangeDetectorRef, Input, OnChanges, SimpleChanges } from '@angular/core';
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
export class Carlist implements OnInit, OnChanges {
  @Input() cars: any[] = [];  // 👈 Input property
  list: any[] = [];
  loading = false;
  error = '';
  defaultImage = 'https://raw.githubusercontent.com/creativetimofficial/public-assets/master/ct-assets/mt-demo.jpg';
  private apiUrl = 'http://localhost:8080';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit(): void {
    // If no cars provided via Input, fetch all
    if (!this.cars || this.cars.length === 0) {
      this.fetchData();
    } else {
      this.list = this.cars;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Update list when input cars change
    if (changes['cars']) {
      this.list = changes['cars'].currentValue || [];
      this.cdr.detectChanges();
    }
  }

  fetchData(): void {
    this.loading = true;
    this.error = '';

    this.http.get(`${this.apiUrl}/product/`).subscribe({
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

  getImageUrl(imgpath: string): string {
    if (!imgpath) return this.defaultImage;
    if (imgpath.startsWith('http://') || imgpath.startsWith('https://')) {
      return imgpath;
    }
    if (imgpath.startsWith('/uploads/')) {
      return `${this.apiUrl}${imgpath}`;
    }
    return `${this.apiUrl}/uploads/cars/${imgpath}`;
  }

  getModelUrl(modelpath: string): string {
    if (!modelpath) return '';
    const filename = modelpath.split('/').pop();
    return `${this.apiUrl}/api/models/cars/${filename}`;
  }

  navigate(id: string): void {
    localStorage.setItem('car', id);
    this.router.navigate(['/car-details']);
  }

  formatPrice(price: number): string {
    if (!price) return 'LKR 0';
    return `LKR ${price.toLocaleString()}`;
  }
}