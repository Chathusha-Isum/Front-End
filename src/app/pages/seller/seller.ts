import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-seller',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './seller.html',
  styleUrl: './seller.css',
})
export class Seller implements OnInit {
  public data: any = {
    car_count: 0,
    parts_count: 0,
    name: "",
    address: "",
    contact: "",
    email: "",
    revenue: 0,
    total_sales: 0
  };
  public carlist: any = [];
  public partlist: any = [];

  constructor(
    private http: HttpClient, 
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    this.data.email = localStorage.getItem("email") || "";
  }

  ngOnInit(): void {
    this.fetchData();
    this.fetchCarData();
    this.fetchPartData();
  }

  fetchData(): void {
    this.http.get(`http://localhost:8080/user/email?email=${this.data.email}`).subscribe({
      next: (res: any) => {
        this.data.name = res.data.fname + " " + res.data.lname;
        this.data.address = res.data.address;
        this.data.contact = res.data.contact;
        this.data.email = res.data.email;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching user data:', err);
      }
    });
  }

  fetchCarData(): void {
    this.http.get(`http://localhost:8080/seller/cars?email=${this.data.email}`).subscribe({
      next: (res: any) => {
        this.carlist = res.data || [];
        this.data.car_count = this.carlist.length;
        this.data.revenue = this.carlist.reduce((sum: number, car: any) => sum + (car.price || 0), 0);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching cars:', err);
        this.carlist = [];
      }
    });
  }

  fetchPartData(): void {
    this.http.get(`http://localhost:8080/seller/parts?email=${this.data.email}`).subscribe({
      next: (res: any) => {
        this.partlist = res.data || [];
        this.data.parts_count = this.partlist.length;
        const partsRevenue = this.partlist.reduce((sum: number, part: any) => sum + (part.price || 0), 0);
        this.data.revenue += partsRevenue;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching parts:', err);
        this.partlist = [];
      }
    });
  }

  addCar(): void {
    this.router.navigate(['/add-car']);
  }

  addPart(): void {
    this.router.navigate(['/add-part']);
  }

  deleteCar(carId: string): void {
    if (confirm('Are you sure you want to delete this car?')) {
      this.http.delete(`http://localhost:8080/product/${carId}`).subscribe({
        next: () => {
          this.carlist = this.carlist.filter((car: any) => car.id !== carId);
          this.data.car_count = this.carlist.length;
          this.data.revenue = this.carlist.reduce((sum: number, car: any) => sum + (car.price || 0), 0);
          const partsRevenue = this.partlist.reduce((sum: number, part: any) => sum + (part.price || 0), 0);
          this.data.revenue += partsRevenue;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error deleting car:', err);
          alert('Failed to delete car. Please try again.');
        }
      });
    }
  }

  deletePart(partId: string): void {
    if (confirm('Are you sure you want to delete this part?')) {
      this.http.delete(`http://localhost:8080/carpart/${partId}`).subscribe({
        next: () => {
          this.partlist = this.partlist.filter((part: any) => part.id !== partId);
          this.data.parts_count = this.partlist.length;
          const partsRevenue = this.partlist.reduce((sum: number, part: any) => sum + (part.price || 0), 0);
          const carsRevenue = this.carlist.reduce((sum: number, car: any) => sum + (car.price || 0), 0);
          this.data.revenue = carsRevenue + partsRevenue;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error deleting part:', err);
          alert('Failed to delete part. Please try again.');
        }
      });
    }
  }
}