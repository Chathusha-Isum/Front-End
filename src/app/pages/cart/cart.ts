import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cart.html',
  styleUrls: ['./cart.css']
})
export class Cart implements OnInit {
  private apiUrl = 'http://localhost:8080';
  public userId: string = '';
  public cartItems: any[] = [];
  public isLoading: boolean = false;
  public total: number = 0;
  public error: string = '';
  public maxQty: number = 99;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserAndCart();
  }

  // Load user from localStorage and get cart
  loadUserAndCart(): void {
    const email = localStorage.getItem('email');
    
    if (!email) {
      this.error = 'Please login to view your cart';
      this.isLoading = false;
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading = true;
    
    // Get user by email
    this.http.get(`${this.apiUrl}/user/email?email=${email}`).subscribe({
      next: (res: any) => {
        if (res && res.bool && res.data) {
          this.userId = res.data.id;
          console.log('✅ User loaded:', this.userId);
          this.loadCart();
        } else {
          this.error = 'User not found';
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      },
      error: (error: any) => {
        console.error('Error loading user:', error);
        this.error = 'Failed to load user information';
        this.isLoading = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load user information. Please try again.',
          confirmButtonColor: '#6366f1'
        });
      }
    });
  }

  loadCart(): void {
    if (!this.userId) {
      console.error('No user ID available');
      return;
    }
    
    this.isLoading = true;
    this.http.get(`${this.apiUrl}/cart/user?userId=${this.userId}`).subscribe({
      next: (res: any) => {
        this.cartItems = res.data || [];
        console.log(`✅ Loaded ${this.cartItems.length} cart items for user ${this.userId}`);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading cart:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load cart. Please try again.',
          confirmButtonColor: '#6366f1'
        });
      }
    });
  }

  increaseItemQty(item: any): void {
    const stockQty = item.stock_qty || 0;
    if (item.qty < stockQty && item.qty < 99) {
      item.qty++;
      this.updateItemQty(item);
    } else if (item.qty >= stockQty) {
      Swal.fire({
        icon: 'warning',
        title: 'Stock Limit Reached',
        text: `Only ${stockQty} units available in stock!`,
        confirmButtonColor: '#f59e0b'
      });
    }
  }

  decreaseItemQty(item: any): void {
    if (item.qty > 1) {
      item.qty--;
      this.updateItemQty(item);
    }
  }

  validateQuantity(item: any): void {
    const stockQty = item.stock_qty || 0;
    
    if (item.qty < 1) {
      item.qty = 1;
    } else if (item.qty > stockQty) {
      item.qty = stockQty;
      Swal.fire({
        icon: 'warning',
        title: 'Stock Limit Reached',
        text: `Only ${stockQty} units available in stock!`,
        confirmButtonColor: '#f59e0b'
      });
      this.updateItemQty(item);
    } else {
      this.updateItemQty(item);
    }
  }

  updateItemQty(item: any): void {
    const stockQty = item.stock_qty || 0;
    
    if (item.qty < 1) {
      item.qty = 1;
    }
    
    if (item.qty > stockQty) {
      Swal.fire({
        icon: 'warning',
        title: 'Stock Limit Reached',
        text: `Only ${stockQty} units available in stock!`,
        confirmButtonColor: '#f59e0b'
      });
      item.qty = stockQty;
      this.cdr.detectChanges();
      return;
    }
    
    const total = item.part_price * item.qty;
    this.isLoading = true;
    
    const updateData = {
      userId: this.userId,
      part: item.part,
      qty: item.qty,
      total: total
    };

    this.http.put(`${this.apiUrl}/cart/update`, updateData).subscribe({
      next: (res: any) => {
        console.log('✅ Cart updated:', res);
        this.isLoading = false;
        if (res.availableStock !== undefined) {
          item.stock_qty = res.availableStock;
        }
        this.loadCart();
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: 'Cart updated successfully!',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      },
      error: (error: any) => {
        console.error('Error updating cart:', error);
        this.isLoading = false;
        const message = error.error?.message || 'Failed to update cart. Please try again.';
        Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: message,
          confirmButtonColor: '#6366f1'
        });
        this.loadCart();
        this.cdr.detectChanges();
      }
    });
  }

  removeItem(item: any): void {
    Swal.fire({
      title: 'Remove Item?',
      text: `Are you sure you want to remove "${item.part_name}" from your cart?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6366f1',
      confirmButtonText: 'Yes, Remove',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading = true;
        this.http.delete(`${this.apiUrl}/cart/remove`, {
          body: { userId: this.userId, part: item.part }
        }).subscribe({
          next: (res: any) => {
            console.log('✅ Item removed:', res);
            this.isLoading = false;
            this.loadCart();
            this.cdr.detectChanges();
            Swal.fire({
              icon: 'success',
              title: 'Removed!',
              text: `${item.part_name} removed from cart.`,
              timer: 1500,
              showConfirmButton: false,
              toast: true,
              position: 'top-end'
            });
          },
          error: (error: any) => {
            console.error('Error removing item:', error);
            this.isLoading = false;
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Failed to remove item. Please try again.',
              confirmButtonColor: '#6366f1'
            });
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  clearCart(): void {
    Swal.fire({
      title: 'Clear Cart?',
      text: 'Are you sure you want to remove all items from your cart?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6366f1',
      confirmButtonText: 'Yes, Clear All',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading = true;
        this.http.delete(`${this.apiUrl}/cart/clear?userId=${this.userId}`).subscribe({
          next: (res: any) => {
            console.log('✅ Cart cleared:', res);
            this.isLoading = false;
            this.loadCart();
            this.cdr.detectChanges();
            Swal.fire({
              icon: 'success',
              title: 'Cleared!',
              text: 'Your cart has been cleared.',
              timer: 1500,
              showConfirmButton: false,
              toast: true,
              position: 'top-end'
            });
          },
          error: (error: any) => {
            console.error('Error clearing cart:', error);
            this.isLoading = false;
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Failed to clear cart. Please try again.',
              confirmButtonColor: '#6366f1'
            });
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  getCartTotal(): number {
    let total = 0;
    this.cartItems.forEach((item: any) => {
      total += (item.total || item.part_price * item.qty);
    });
    return total;
  }

  getStockStatus(item: any): string {
    const stockQty = item.stock_qty || 0;
    if (stockQty === 0) return 'Out of Stock';
    if (stockQty < 5) return 'Low Stock';
    return 'In Stock';
  }

  getStockColor(item: any): string {
    const stockQty = item.stock_qty || 0;
    if (stockQty === 0) return 'text-red-400';
    if (stockQty < 5) return 'text-yellow-400';
    return 'text-emerald-400';
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

  goToParts(): void {
    this.router.navigate(['/parts']);
  }

  goBack(): void {
    this.router.navigate(['/parts']);
  }

  checkout(): void {
    if (this.cartItems.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Empty Cart',
        text: 'Your cart is empty! Add some items first.',
        confirmButtonColor: '#6366f1'
      });
      return;
    }
    
    const exceededItems = this.cartItems.filter(item => item.qty > (item.stock_qty || 0));
    if (exceededItems.length > 0) {
      const itemNames = exceededItems.map(item => item.part_name).join(', ');
      Swal.fire({
        icon: 'warning',
        title: 'Stock Issues',
        text: `Some items exceed available stock: ${itemNames}. Please update quantities.`,
        confirmButtonColor: '#f59e0b'
      });
      return;
    }
    
    Swal.fire({
      icon: 'info',
      title: 'Checkout',
      text: 'Checkout functionality coming soon!',
      confirmButtonColor: '#6366f1'
    });
  }
}