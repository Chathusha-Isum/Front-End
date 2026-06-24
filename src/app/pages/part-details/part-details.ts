import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-part-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './part-details.html',
  styleUrls: ['./part-details.css']
})
export class PartDetails implements OnInit{
  partData: any = null;
  loading = false;
  error = '';
  partId: string = '';
  apiUrl = 'http://localhost:8080';
  defaultImage = 'https://raw.githubusercontent.com/creativetimofficial/public-assets/master/ct-assets/mt-demo.jpg';

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
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.partId = localStorage.getItem('part') || '';
    
    // Also check route params
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.partId = params['id'];
        localStorage.setItem('part', this.partId);
      }
    });

    if (this.partId) {
      this.fetchPartDetails();
    } else {
      this.error = 'No part selected';
    }
  }

  fetchPartDetails(): void {
    this.loading = true;
    this.error = '';
    
    this.http.get(`${this.apiUrl}/carpart/id?id=${this.partId}`).subscribe({
      next: (res: any) => {
        this.partData = res.data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load part details';
        this.loading = false;
        console.error('Error fetching part:', err);
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
    return `${this.apiUrl}/uploads/parts/${imgpath}`;
  }

  getConditionColor(condition: string): string {
    return this.conditionColors[condition] || 'bg-gray-500/20 text-gray-200 border-gray-500/20';
  }

  formatPrice(price: number): string {
    if (!price) return 'LKR 0';
    return `LKR ${price.toLocaleString()}`;
  }

  goBack(): void {
    this.router.navigate(['/parts']);
  }

  addToCart(): void {
    // Add to cart functionality
    // console.log('Adding to cart:', this.partData);
    // You can implement cart logic here
  }

  getStockStatus(qty: number): string {
    if (qty == 0) return 'Out of Stock';
    if (qty < 5) return 'Low Stock';
    return 'In Stock';
  }

  getStockColor(qty: number): string {
    if (qty == 0) return 'text-red-400 bg-red-500/20 border-red-500/30';
    if (qty < 5) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
  }
}