import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  public result: any = [];
  public data: any = {
    count: 0,
    name: "",
    address: "",
    contact: "",
    email: "",
    product_count: 0,
    parts_count: 0,
    total: 0
  };
  public carlist: any = []
  ngOnInit(): void {
    this.fetchData();
    this.fetchCarData();
    this.fetchPartData();
  }
  public partlist: any =[]
  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {
    this.data.email = localStorage.getItem("email");
  }

  fetchData(): void {
    this.http.get(`http://localhost:8080/user/email?email=${this.data.email}`).subscribe({
      next: (res: any) => {
        this.data.name = res.data.fname + " " + res.data.lname;
        this.data.address = res.data.address;
        this.data.contact = res.data.contact;
        this.data.email = res.data.email;
        this.cdr.detectChanges();
      }
    })
  }

  fetchCarData(): void {
    this.http.get(`http://localhost:8080/user/car/email?email=${this.data.email}`).subscribe({
      next: (res: any) => {
        this.result = res.data;
        this.data.product_count = this.result.length;
        this.data.count += this.result.length;
        for (let i = 0; i < this.result.length; i++) {
          this.http.get(`http://localhost:8080/product/id?id=${this.result[i].product}`).subscribe({
            next: (res: any) => {
              this.carlist[i] = res.data;
              this.data.total += res.data.price;
              this.cdr.detectChanges();
            }
          });
        }
      }
    });    
  }

  fetchPartData(): void {
    this.http.get(`http://localhost:8080/user/part/email?email=${this.data.email}`).subscribe({
      next: (res: any) => {
        this.result = res.data;
        this.data.parts_count = this.result.length;
        this.data.count += this.result.length;
        for (let i = 0; i < this.result.length; i++) {
          this.http.get(`http://localhost:8080/carpart/id?id=${this.result[i].part}`).subscribe({
            next: (res: any) => {
              this.partlist[i] = res.data;
              this.data.total += res.data.price;
              this.cdr.detectChanges();
            }
          });
        }
      }
    });    
  }
}
