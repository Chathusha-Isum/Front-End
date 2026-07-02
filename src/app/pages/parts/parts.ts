import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Partlist } from '../../component/partlist/partlist';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-parts',
  standalone: true,
  imports: [CommonModule, FormsModule, Partlist],
  templateUrl: './parts.html',
  styleUrl: './parts.css'
})
export class Parts implements OnInit {
  list: any[] = [];
  filteredList: any[] = [];
  loading = false;
  error = '';

  // Filter properties
  searchTerm: string = '';
  selectedCondition: string = '';
  selectedCar: string = '';
  minPrice: number | null = null;
  maxPrice: number | null = null;
  stockFilter: string = 'all';
  sortBy: string = 'name';

  // Filter options
  conditions: string[] = [];
  cars: string[] = [];

  private apiUrl = 'http://localhost:8080';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.loading = true;
    this.error = '';
    
    this.http.get(`${this.apiUrl}/carpart/`).subscribe({
      next: (data: any) => {
        this.list = data.data || [];
        this.extractFilterOptions();
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error fetching parts:', error);
        this.error = error.error?.message || 'Failed to load parts. Please try again.';
        this.loading = false;
      }
    });
  }

  extractFilterOptions(): void {
    const conditionSet = new Set<string>();
    const carSet = new Set<string>();

    this.list.forEach(part => {
      if (part.condition) conditionSet.add(part.condition);
      if (part.car) carSet.add(part.car);
    });

    this.conditions = Array.from(conditionSet).sort();
    this.cars = Array.from(carSet).sort();
  }

  applyFilters(): void {
    let result = [...this.list];

    // Search filter
    if (this.searchTerm && this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase().trim();
      result = result.filter(part => 
        part.name?.toLowerCase().includes(search) ||
        part.car?.toLowerCase().includes(search) ||
        part.condition?.toLowerCase().includes(search) ||
        part.description?.toLowerCase().includes(search)
      );
    }

    // Condition filter
    if (this.selectedCondition) {
      result = result.filter(part => part.condition === this.selectedCondition);
    }

    // Car filter
    if (this.selectedCar) {
      result = result.filter(part => part.car === this.selectedCar);
    }

    // Price range filter
    const minPrice = this.minPrice ?? 0;
    const maxPrice = this.maxPrice ?? Infinity;

    if (minPrice > 0) {
      result = result.filter(part => (part.price ?? 0) >= minPrice);
    }
    if (maxPrice !== Infinity && maxPrice > 0) {
      result = result.filter(part => (part.price ?? 0) <= maxPrice);
    }

    // Stock filter
    switch (this.stockFilter) {
      case 'in_stock':
        result = result.filter(part => (part.qty ?? 0) > 10);
        break;
      case 'low_stock':
        result = result.filter(part => (part.qty ?? 0) > 0 && (part.qty ?? 0) <= 10);
        break;
      case 'out_of_stock':
        result = result.filter(part => (part.qty ?? 0) === 0);
        break;
      default:
        break;
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
      case 'stock_asc':
        result.sort((a, b) => (a.qty ?? 0) - (b.qty ?? 0));
        break;
      case 'stock_desc':
        result.sort((a, b) => (b.qty ?? 0) - (a.qty ?? 0));
        break;
      default:
        break;
    }

    this.filteredList = result;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCondition = '';
    this.selectedCar = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.stockFilter = 'all';
    this.sortBy = 'name';
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchTerm ||
      this.selectedCondition ||
      this.selectedCar ||
      this.minPrice ||
      this.maxPrice ||
      this.stockFilter !== 'all'
    );
  }

  getFilteredCount(): number {
    return this.filteredList.length;
  }

  getTotalCount(): number {
    return this.list.length;
  }
}