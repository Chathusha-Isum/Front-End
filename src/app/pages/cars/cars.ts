import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Carlist } from '../../component/carlist/carlist';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-cars',
  standalone: true,
  imports: [CommonModule, FormsModule, Carlist],
  templateUrl: './cars.html',
  styleUrls: ['./cars.css']
})
export class Cars implements OnInit {
  list: any[] = [];
  filteredList: any[] = [];
  loading = false;
  error = '';

  // Filter properties
  searchTerm: string = '';
  selectedBrand: string = '';
  selectedCategory: string = '';
  selectedFuelType: string = '';
  minPrice: number | null = null;
  maxPrice: number | null = null;
  sortBy: string = 'name';

  // Filter options
  brands: string[] = [];
  categories: string[] = [];
  fuelTypes: string[] = [];

  private apiUrl = 'http://localhost:8080';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check if there's a category filter from hero
    const categoryFromStorage = localStorage.getItem('filterCategory');
    if (categoryFromStorage) {
      this.selectedCategory = categoryFromStorage;
      localStorage.removeItem('filterCategory');
    }
    
    this.fetchData();
  }

  fetchData(): void {
    this.loading = true;
    this.error = '';
    
    this.http.get(`${this.apiUrl}/product/`).subscribe({
      next: (data: any) => {
        this.list = data.data || [];
        // Extract filter options first
        this.extractFilterOptions();
        // Then apply filters
        this.applyFilters();
        this.loading = false;
        // Manually trigger change detection
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching cars:', error);
        this.error = error.error?.message || 'Failed to load cars. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  extractFilterOptions(): void {
    const brandSet = new Set<string>();
    const categorySet = new Set<string>();
    const fuelSet = new Set<string>();

    this.list.forEach(car => {
      if (car.brand) brandSet.add(car.brand);
      if (car.category) categorySet.add(car.category);
      if (car.fueltype) fuelSet.add(car.fueltype);
    });

    this.brands = Array.from(brandSet).sort();
    this.categories = Array.from(categorySet).sort();
    this.fuelTypes = Array.from(fuelSet).sort();
  }

  applyFilters(): void {
    let result = [...this.list];

    // Search filter
    if (this.searchTerm && this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase().trim();
      result = result.filter(car => 
        car.name?.toLowerCase().includes(search) ||
        car.brand?.toLowerCase().includes(search) ||
        car.category?.toLowerCase().includes(search) ||
        car.description?.toLowerCase().includes(search)
      );
    }

    // Brand filter
    if (this.selectedBrand) {
      result = result.filter(car => car.brand === this.selectedBrand);
    }

    // Category filter
    if (this.selectedCategory) {
      result = result.filter(car => car.category === this.selectedCategory);
    }

    // Fuel type filter
    if (this.selectedFuelType) {
      result = result.filter(car => car.fueltype === this.selectedFuelType);
    }

    // Price range filter
    const minPrice = this.minPrice ?? 0;
    const maxPrice = this.maxPrice ?? Infinity;

    if (minPrice > 0) {
      result = result.filter(car => (car.price ?? 0) >= minPrice);
    }
    if (maxPrice !== Infinity && maxPrice > 0) {
      result = result.filter(car => (car.price ?? 0) <= maxPrice);
    }

    // Sorting
    switch (this.sortBy) {
      case 'name':
        result.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
        break;
      case 'price_asc':
        result.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case 'price_desc':
        result.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
      case 'year_desc':
        result.sort((a, b) => (b.productionyear ?? 0) - (a.productionyear ?? 0));
        break;
      case 'year_asc':
        result.sort((a, b) => (a.productionyear ?? 0) - (b.productionyear ?? 0));
        break;
      default:
        break;
    }

    this.filteredList = result;
    this.cdr.detectChanges();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedBrand = '';
    this.selectedCategory = '';
    this.selectedFuelType = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.sortBy = 'name';
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchTerm ||
      this.selectedBrand ||
      this.selectedCategory ||
      this.selectedFuelType ||
      this.minPrice ||
      this.maxPrice
    );
  }

  getFilteredCount(): number {
    return this.filteredList.length;
  }

  getTotalCount(): number {
    return this.list.length;
  }

  goBack(): void{
    this.router.navigate(['']);
  }
}