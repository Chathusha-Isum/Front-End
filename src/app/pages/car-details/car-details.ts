import { ChangeDetectorRef, Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Upload } from '../../component/upload/upload';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-car-details',
  standalone: true,
  imports: [CommonModule, Upload],
  templateUrl: './car-details.html',
  styleUrl: './car-details.css',
})
export class CarDetails implements OnInit, AfterViewInit {
  public data: any = null;
  private id: any = "";
  public loading: boolean = false;
  public error: string = '';
  private apiUrl = 'http://localhost:8080';

  constructor(
    private http: HttpClient, 
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.id = localStorage.getItem("car");
    if (this.id) {
      this.fetchData();
    } else {
      this.error = 'No car selected';
    }
  }

  ngAfterViewInit(): void {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }

  fetchData(): void {
    this.loading = true;
    this.error = '';
    
    this.http.get(`${this.apiUrl}/product/id?id=${this.id}`).subscribe({
      next: (data: any) => {
        this.data = data.data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching car:', err);
        this.error = err.error?.message || 'Failed to load car details';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  formatPrice(price: number): string {
    if (!price) return 'LKR 0';
    return `LKR ${price.toLocaleString()}`;
  }

  goBack(): void {
    this.router.navigate(['/cars']);
  }
}