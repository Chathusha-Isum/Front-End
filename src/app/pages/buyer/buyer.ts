import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-buyer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './buyer.html',
  styleUrl: './buyer.css',
})
export class Buyer implements OnInit {
  public data: any = {
    count: 0,
    name: "",
    address: "",
    contact: "",
    email: "",
    profile_pic: "",
    product_count: 0,
    parts_count: 0,
    total: 0
  };
  public carlist: any = [];
  public partlist: any = [];
  public purchases: any = [];
  public apiUrl = 'http://localhost:8080';
  public showAllCars: boolean = false;
  public showAllParts: boolean = false;
  public isLoading: boolean = false;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {
    this.data.email = localStorage.getItem("email");
  }

  ngOnInit(): void {
    if (this.data.email) {
      this.fetchData();
      this.fetchUserPurchases();
    } else {
      console.error('No email found in localStorage');
    }
  }

  fetchData(): void {
    this.http.get(`${this.apiUrl}/user/email?email=${this.data.email}`).subscribe({
      next: (res: any) => {
        if (res && res.bool && res.data) {
          this.data.name = res.data.fname + " " + res.data.lname;
          this.data.address = res.data.address || 'N/A';
          this.data.contact = res.data.contact || 'N/A';
          this.data.email = res.data.email;
          this.data.profile_pic = res.data.profile_pic;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error fetching user data:', err);
      }
    });
  }

  fetchUserPurchases(): void {
    this.isLoading = true;
    
    this.http.get(`${this.apiUrl}/user/email?email=${this.data.email}`).subscribe({
      next: (userRes: any) => {
        if (userRes && userRes.bool && userRes.data) {
          const userId = userRes.data.id;
          console.log(`✅ User ID: ${userId}`);
          
          this.http.get(`${this.apiUrl}/payment/user/${userId}`).subscribe({
            next: (res: any) => {
              if (res.success && res.data) {
                this.purchases = res.data;
                console.log(`✅ Found ${this.purchases.length} purchases`);
                this.processPurchases();
              } else {
                console.log('No purchases found');
                this.isLoading = false;
                this.cdr.detectChanges();
              }
            },
            error: (err) => {
              console.error('Error fetching purchases:', err);
              this.isLoading = false;
              this.cdr.detectChanges();
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load purchase history',
                confirmButtonText: 'OK'
              });
            }
          });
        } else {
          console.error('User not found');
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error fetching user:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  processPurchases(): void {
    this.carlist = [];
    this.partlist = [];
    this.data.total = 0;
    this.data.product_count = 0;
    this.data.parts_count = 0;
    this.data.count = 0;

    const completedPurchases = this.purchases.filter((p: any) => p.status === 'completed');

    if (completedPurchases.length === 0) {
      console.log('No completed purchases found');
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    console.log(`Processing ${completedPurchases.length} completed purchases`);

    completedPurchases.forEach((purchase: any) => {
      if (purchase.payment_type === 'car') {
        // ===== CAR PURCHASE =====
        if (purchase.item_id) {
          this.fetchCarDetails(purchase.item_id);
        }
      } else if (purchase.payment_type === 'part') {
        // ===== PART PURCHASE =====
        // IMPORTANT: Check cart_items FIRST for actual part IDs
        if (purchase.cart_items && purchase.cart_items !== 'null' && purchase.cart_items !== '[]') {
          try {
            const cartItems = JSON.parse(purchase.cart_items);
            console.log(`📦 Processing ${cartItems.length} cart items for purchase:`, cartItems);
            
            if (Array.isArray(cartItems) && cartItems.length > 0) {
              cartItems.forEach((item: any) => {
                // Use the part_id from cart_items - this has the actual part ID
                if (item.part_id) {
                  this.fetchPartDetails(item.part_id, item.qty || 1);
                }
              });
            }
          } catch (e) {
            console.error('Error parsing cart_items:', e);
          }
        } else if (purchase.item_id && !purchase.item_id.startsWith('cart_')) {
          // Single part purchase with valid ID
          this.fetchPartDetails(purchase.item_id, purchase.quantity || 1);
        } else {
          console.log(`⚠️ Skipping part purchase with cart_ placeholder: ${purchase.item_id}`);
        }
      }
    });

    // Mark loading as complete after a timeout
    setTimeout(() => {
      this.isLoading = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  fetchCarDetails(carId: string): void {
    if (!carId) return;

    this.http.get(`${this.apiUrl}/product/id?id=${carId}`).subscribe({
      next: (res: any) => {
        if (res && res.data) {
          const exists = this.carlist.some((car: any) => car.id === carId);
          if (!exists) {
            this.carlist.push(res.data);
            this.data.total += parseFloat(res.data.price) || 0;
            this.data.product_count = this.carlist.length;
            this.data.count = this.carlist.length + this.partlist.length;
            console.log(`✅ Added car: ${res.data.name}`);
            this.cdr.detectChanges();
          }
        }
      },
      error: (err) => {
        console.error(`Error fetching car ${carId}:`, err);
      }
    });
  }

  fetchPartDetails(partId: string, qty: number): void {
    if (!partId || partId.startsWith('cart_')) {
      console.log(`⚠️ Skipping invalid part ID: ${partId}`);
      return;
    }

    this.http.get(`${this.apiUrl}/carpart/id?id=${partId}`).subscribe({
      next: (res: any) => {
        if (res && res.data) {
          const partData = res.data;
          const unitPrice = parseFloat(partData.price) || 0;
          
          const existingPart = this.partlist.find((p: any) => p.id === partId);
          
          if (existingPart) {
            existingPart.qty += qty;
            existingPart.price = existingPart.originalPrice * existingPart.qty;
            this.data.total += (unitPrice * qty);
            console.log(`✅ Updated part: ${partData.name} (new qty: ${existingPart.qty})`);
          } else {
            this.partlist.push({
              ...partData,
              qty: qty,
              originalPrice: unitPrice,
              price: unitPrice * qty
            });
            this.data.total += (unitPrice * qty);
            console.log(`✅ Added part: ${partData.name} (qty: ${qty})`);
          }
          
          this.data.parts_count = this.partlist.length;
          this.data.count = this.carlist.length + this.partlist.length;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error(`Error fetching part ${partId}:`, err);
      }
    });
  }

  getProfilePic(): string {
    if (this.data.profile_pic) {
      if (this.data.profile_pic.startsWith('http')) {
        return this.data.profile_pic;
      }
      return `${this.apiUrl}/api/images/profiles/${this.data.profile_pic}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.data.name)}&size=110&background=6366f1&color=fff&bold=true&font-size=0.5`;
  }

  formatPrice(price: number): string {
    if (!price) return 'LKR 0';
    return `LKR ${price.toLocaleString()}`;
  }

  toggleCarsView(): void {
    this.showAllCars = !this.showAllCars;
    this.cdr.detectChanges();
  }

  togglePartsView(): void {
    this.showAllParts = !this.showAllParts;
    this.cdr.detectChanges();
  }
}