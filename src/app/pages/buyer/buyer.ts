import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';

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
    
    // First get user ID from email
    this.http.get(`${this.apiUrl}/user/email?email=${this.data.email}`).subscribe({
      next: (userRes: any) => {
        if (userRes && userRes.bool && userRes.data) {
          const userId = userRes.data.id;
          console.log(`✅ User ID: ${userId}`);
          
          // Now fetch purchases using user ID
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
    // Reset lists
    this.carlist = [];
    this.partlist = [];
    this.data.total = 0;
    this.data.product_count = 0;
    this.data.parts_count = 0;
    this.data.count = 0;

    // Filter only completed payments
    const completedPurchases = this.purchases.filter((p: any) => p.status === 'completed');

    if (completedPurchases.length === 0) {
      console.log('No completed purchases found');
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    console.log(`Processing ${completedPurchases.length} completed purchases`);

    let completedRequests = 0;
    const totalRequests = completedPurchases.length;

    completedPurchases.forEach((purchase: any, index: number) => {
      if (purchase.payment_type === 'car') {
        // Car purchase
        if (purchase.item_id) {
          this.http.get(`${this.apiUrl}/product/id?id=${purchase.item_id}`).subscribe({
            next: (res: any) => {
              if (res && res.data) {
                this.carlist.push(res.data);
                this.data.total += parseFloat(res.data.price) || 0;
                this.data.product_count = this.carlist.length;
                this.data.count = this.carlist.length + this.partlist.length;
              }
              completedRequests++;
              this.checkAllRequestsCompleted(completedRequests, totalRequests);
              this.cdr.detectChanges();
            },
            error: (err) => {
              console.error('Error fetching car:', err);
              completedRequests++;
              this.checkAllRequestsCompleted(completedRequests, totalRequests);
              this.cdr.detectChanges();
            }
          });
        } else {
          completedRequests++;
          this.checkAllRequestsCompleted(completedRequests, totalRequests);
        }
      } else if (purchase.payment_type === 'part') {
        // Part purchase
        if (purchase.cart_items) {
          // Multiple parts from cart
          try {
            const cartItems = JSON.parse(purchase.cart_items);
            cartItems.forEach((item: any) => {
              this.http.get(`${this.apiUrl}/carpart/id?id=${item.part_id}`).subscribe({
                next: (res: any) => {
                  if (res && res.data) {
                    const partData = res.data;
                    const qty = item.qty || 1;
                    const unitPrice = parseFloat(partData.price) || 0;
                    
                    this.partlist.push({
                      ...partData,
                      qty: qty,
                      originalPrice: unitPrice,
                      price: unitPrice * qty
                    });
                    this.data.total += (unitPrice * qty);
                    this.data.parts_count = this.partlist.length;
                    this.data.count = this.carlist.length + this.partlist.length;
                  }
                  completedRequests++;
                  this.checkAllRequestsCompleted(completedRequests, totalRequests);
                  this.cdr.detectChanges();
                },
                error: (err) => {
                  console.error('Error fetching part:', err);
                  completedRequests++;
                  this.checkAllRequestsCompleted(completedRequests, totalRequests);
                  this.cdr.detectChanges();
                }
              });
            });
          } catch (e) {
            console.error('Error parsing cart_items:', e);
            completedRequests++;
            this.checkAllRequestsCompleted(completedRequests, totalRequests);
          }
        } else if (purchase.item_id) {
          // Single part purchase
          this.http.get(`${this.apiUrl}/carpart/id?id=${purchase.item_id}`).subscribe({
            next: (res: any) => {
              if (res && res.data) {
                const partData = res.data;
                const qty = purchase.quantity || 1;
                const unitPrice = parseFloat(partData.price) || 0;
                
                this.partlist.push({
                  ...partData,
                  qty: qty,
                  originalPrice: unitPrice,
                  price: unitPrice * qty
                });
                this.data.total += (unitPrice * qty);
                this.data.parts_count = this.partlist.length;
                this.data.count = this.carlist.length + this.partlist.length;
              }
              completedRequests++;
              this.checkAllRequestsCompleted(completedRequests, totalRequests);
              this.cdr.detectChanges();
            },
            error: (err) => {
              console.error('Error fetching part:', err);
              completedRequests++;
              this.checkAllRequestsCompleted(completedRequests, totalRequests);
              this.cdr.detectChanges();
            }
          });
        } else {
          completedRequests++;
          this.checkAllRequestsCompleted(completedRequests, totalRequests);
        }
      } else {
        completedRequests++;
        this.checkAllRequestsCompleted(completedRequests, totalRequests);
      }
    });
  }

  checkAllRequestsCompleted(completed: number, total: number): void {
    if (completed >= total) {
      this.isLoading = false;
      // Sort the lists
      this.carlist.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
      this.partlist.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
      console.log(`✅ Completed processing ${this.carlist.length} cars and ${this.partlist.length} parts`);
      console.log(`💰 Total spent: LKR ${this.data.total.toLocaleString()}`);
      this.cdr.detectChanges();
    }
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