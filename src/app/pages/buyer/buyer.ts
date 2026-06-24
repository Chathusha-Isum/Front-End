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
  public result: any = [];
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
  public carlist: any = []
  public partlist: any = []
  public apiUrl = 'http://localhost:8080';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {
    this.data.email = localStorage.getItem("email");
  }

  ngOnInit(): void {
    this.fetchData();
    this.fetchCarData();
    this.fetchPartData();
  }

  fetchData(): void {
    this.http.get(`${this.apiUrl}/user/email?email=${this.data.email}`).subscribe({
      next: (res: any) => {
        this.data.name = res.data.fname + " " + res.data.lname;
        this.data.address = res.data.address;
        this.data.contact = res.data.contact;
        this.data.email = res.data.email;
        this.data.profile_pic = res.data.profile_pic;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching user data:', err);
      }
    });
  }

  fetchCarData(): void {
    this.http.get(`${this.apiUrl}/user/car/email?email=${this.data.email}`).subscribe({
      next: (res: any) => {
        this.result = res.data;
        this.data.product_count = this.result.length;
        this.data.count += this.result.length;
        for (let i = 0; i < this.result.length; i++) {
          this.http.get(`${this.apiUrl}/product/id?id=${this.result[i].product}`).subscribe({
            next: (res: any) => {
              this.carlist[i] = res.data;
              this.data.total += res.data.price;
              this.cdr.detectChanges();
            },
            error: (err) => {
              console.error('Error fetching car:', err);
            }
          });
        }
      },
      error: (err) => {
        console.error('Error fetching cars:', err);
      }
    });    
  }

  fetchPartData(): void {
    this.http.get(`${this.apiUrl}/user/part/email?email=${this.data.email}`).subscribe({
      next: (res: any) => {
        this.result = res.data;
        this.data.parts_count = this.result.length;
        this.data.count += this.result.length;
        for (let i = 0; i < this.result.length; i++) {
          this.http.get(`${this.apiUrl}/carpart/id?id=${this.result[i].part}`).subscribe({
            next: (res: any) => {
              this.partlist[i] = res.data;
              this.data.total += res.data.price;
              this.cdr.detectChanges();
            },
            error: (err) => {
              console.error('Error fetching part:', err);
            }
          });
        }
      },
      error: (err) => {
        console.error('Error fetching parts:', err);
      }
    });    
  }

  getProfilePic(): string {
    if (this.data.profile_pic) {
      if (this.data.profile_pic.startsWith('http')) {
        return this.data.profile_pic;
      }
      return `${this.apiUrl}${this.data.profile_pic}`;
    }
    return `https://ui-avatars.com/api/?name=${this.data.name}&size=110&background=2b5f7a&color=fff&bold=true&font-size=0.5`;
  }

  formatPrice(price: number): string {
    if (!price) return 'LKR 0';
    return `LKR ${price.toLocaleString()}`;
  }
}