import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-part-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './part-details.html',
  styleUrls: ['./part-details.css']
})
export class PartDetails implements OnInit {
  partData: any = null;
  loading = false;
  error = '';
  partId: string = '';
  apiUrl = 'http://localhost:8080';
  defaultImage = 'https://raw.githubusercontent.com/creativetimofficial/public-assets/master/ct-assets/mt-demo.jpg';
  
  // Cart related
  public userId: string = '';
  public quantity: number = 1;
  public isAddingToCart: boolean = false;

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
    // Get user ID from email
    const email = localStorage.getItem('email');
    if (email) {
      this.http.get(`${this.apiUrl}/user/email?email=${email}`).subscribe({
        next: (res: any) => {
          if (res && res.bool && res.data) {
            this.userId = res.data.id;
            console.log('✅ User loaded:', this.userId);
          }
        },
        error: (error: any) => {
          console.error('Error loading user:', error);
        }
      });
    }

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
      error: (err: any) => {
        this.error = err.error?.message || 'Failed to load part details';
        this.loading = false;
        console.error('Error fetching part:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: this.error,
          confirmButtonColor: '#ec4899'
        });
      }
    });
  }

  // ==================== CART FUNCTIONS ====================

  increaseQuantity(): void {
    if (this.quantity < (this.partData?.qty || 99)) {
      this.quantity++;
    }
  }

  decreaseQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  validateQuantity(): void {
    if (this.quantity < 1) {
      this.quantity = 1;
    } else if (this.quantity > (this.partData?.qty || 99)) {
      this.quantity = this.partData?.qty || 1;
      Swal.fire({
        icon: 'warning',
        title: 'Stock Limit Reached',
        text: `Only ${this.partData?.qty} units available in stock!`,
        confirmButtonColor: '#f59e0b'
      });
    }
  }

  addToCart(): void {
    if (!this.partData) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Part data not available!',
        confirmButtonColor: '#ec4899'
      });
      return;
    }

    if (!this.userId) {
      Swal.fire({
        icon: 'warning',
        title: 'Login Required',
        text: 'Please login to add items to cart.',
        confirmButtonColor: '#f59e0b'
      }).then(() => {
        this.router.navigate(['/login']);
      });
      return;
    }

    if (this.partData.qty <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Out of Stock',
        text: 'This part is currently out of stock!',
        confirmButtonColor: '#ef4444'
      });
      return;
    }

    if (this.quantity > this.partData.qty) {
      Swal.fire({
        icon: 'warning',
        title: 'Stock Limit Reached',
        text: `Only ${this.partData.qty} units available in stock!`,
        confirmButtonColor: '#f59e0b'
      });
      return;
    }

    const total = this.partData.price * this.quantity;
    this.isAddingToCart = true;

    const cartData = {
      userId: this.userId,
      part: this.partData.id,
      qty: this.quantity,
      total: total
    };

    this.http.post(`${this.apiUrl}/cart/add`, cartData).subscribe({
      next: (res: any) => {
        console.log('✅ Added to cart:', res);
        this.isAddingToCart = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'success',
          title: 'Added to Cart!',
          text: `${this.quantity} x ${this.partData.name} added to your cart.`,
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      },
      error: (error: any) => {
        console.error('Error adding to cart:', error);
        this.isAddingToCart = false;
        this.cdr.detectChanges();
        const message = error.error?.message || 'Failed to add item to cart. Please try again.';
        Swal.fire({
          icon: 'error',
          title: 'Failed to Add',
          text: message,
          confirmButtonColor: '#ec4899'
        });
      }
    });
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }

  // ==================== UTILITY FUNCTIONS ====================

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