import { ChangeDetectorRef, Component, OnInit } from '@angular/core';

import { Upload } from '../../component/upload/upload';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-car-details',
  standalone: true,
  imports: [Upload],
  templateUrl: './car-details.html',
  styleUrl: './car-details.css',
})
export class CarDetails implements OnInit {
  public data: any = [];
  private id: any = "";

  ngOnInit(): void {
    this.fetchData();
  }
  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) { }
  fetchData(): void {
    this.id = localStorage.getItem("car");
    this.http.get(`http://localhost:8080/product/id?id=${this.id}`).subscribe((data: any) => {
      this.data = data.data;
      console.log(this.data);

      this.cdr.detectChanges();
    });
  }

  formatPrice(price: number): string {
    if (!price) return 'LKR 0';
    return `LKR ${price.toLocaleString()}`;
  }
}
