import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {  Router } from '@angular/router';

@Component({
  selector: 'app-carlist',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carlist.html',
  styleUrls: ['./carlist.css']
})
export class Carlist implements OnInit {
  list: any[] = [];
  loading = false;
  error = '';
  defaultImage = 'https://raw.githubusercontent.com/creativetimofficial/public-assets/master/ct-assets/mt-demo.jpg';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.loading = true;
    this.error = '';
    
    
    this.http.get('http://localhost:8080/product/details')
      .subscribe({
        next: (data: any) => {          
          this.list = data;
          this.loading = false;
          
          this.cdr.detectChanges();
          
        },
        error: (error) => {
          this.error = 'Failed to load cars. Please try again.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }
  navigate(id: any):void{
    this.router.navigate(["/upload"]);
  }
}