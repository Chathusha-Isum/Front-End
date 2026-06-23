import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-partlist',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './partlist.html',
  styleUrls: ['./partlist.css']
})
export class Partlist implements OnInit {
  list: any[] = [];
  loading = false;
  error = '';
  defaultImage = 'https://raw.githubusercontent.com/creativetimofficial/public-assets/master/ct-assets/mt-demo.jpg';
  private apiUrl = 'http://localhost:8080';

  // Condition color mapping
  conditionColors: { [key: string]: string } = {
    'New': 'bg-emerald-500/20 text-emerald-200 border-emerald-500/20',
    'Like New': 'bg-blue-500/20 text-blue-200 border-blue-500/20',
    'Excellent': 'bg-cyan-500/20 text-cyan-200 border-cyan-500/20',
    'Good': 'bg-green-500/20 text-green-200 border-green-500/20',
    'Fair': 'bg-yellow-500/20 text-yellow-200 border-yellow-500/20',
    'Used': 'bg-orange-500/20 text-orange-200 border-orange-500/20',
    'Refurbished': 'bg-purple-500/20 text-purple-200 border-purple-500/20'
  };

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
    
    this.http.get(`${this.apiUrl}/carpart/`)
      .subscribe({
        next: (data: any) => {       
          this.list = data.data || [];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error fetching parts:', error);
          this.error = error.error?.message || 'Failed to load parts. Please try again.';
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
    // If it's just a filename, assume it's in uploads/parts
    return `${this.apiUrl}/uploads/parts/${imgpath}`;
  }

  /**
   * Get condition badge color class
   */
  getConditionColor(condition: string): string {
    return this.conditionColors[condition] || 'bg-gray-500/20 text-gray-200 border-gray-500/20';
  }

  /**
   * Format price with LKR
   */
  formatPrice(price: number): string {
    if (!price) return 'LKR 0';
    return `LKR ${price.toLocaleString()}`;
  }

  /**
   * Navigate to part details page
   */
  navigate(id: string): void {
    localStorage.setItem('part', id);
    this.router.navigate(['/part-details']);
  }
}