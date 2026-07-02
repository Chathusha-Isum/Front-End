import { Component, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero.html',
  styleUrls: ['./hero.css']
})
export class Hero implements AfterViewInit, OnDestroy {
  
  // Car data with category mapping
  cars = [
    { position: 0, category: 'Hatchback', badge: 'Compact', image: '3-2.png', color: 'purple' },
    { position: 1, category: 'Sports', badge: 'Luxury', image: '2-2.png', color: 'red' },
    { position: 2, category: 'SUV', badge: 'Most Popular', image: '1.png', color: 'orange' },
    { position: 3, category: 'Sedan', badge: 'Comfort', image: '2-1.png', color: 'green' },
    { position: 4, category: 'Truck', badge: 'Ride', image: '3-1.png', color: 'yellow' }
  ];

  private lightboxElement: HTMLElement | null = null;
  private lightboxImg: HTMLImageElement | null = null;

  constructor(
    private el: ElementRef,
    private router: Router
  ) {}

  ngAfterViewInit(): void {
    this.initLightbox();
    this.makeButtonsClickable();
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.handleEscKey.bind(this));
  }

  private initLightbox(): void {
    this.lightboxElement = document.getElementById('lightbox');
    this.lightboxImg = document.getElementById('lightbox-img') as HTMLImageElement;
    document.addEventListener('keydown', this.handleEscKey.bind(this));
  }

  private makeButtonsClickable(): void {
    const buttons = document.querySelectorAll('.depth-btn');
    
    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const category = btn.getAttribute('data-category');
        
        if (category) {
          this.navigateToCategory(category);
        }
      });
    });
  }

  private handleEscKey(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.lightboxElement?.classList.contains('active')) {
      this.closeLightbox();
    }
  }

  closeLightbox(): void {
    if (this.lightboxElement) {
      this.lightboxElement.classList.remove('active');
      setTimeout(() => {
        if (this.lightboxImg) {
          this.lightboxImg.src = '';
        }
      }, 300);
    }
  }

  /**
   * Navigate to cars page with category filter
   */
  navigateToCategory(category: string): void {
    // Store category in localStorage for the cars page to pick up
    localStorage.setItem('filterCategory', category);
    
    // Navigate to cars page
    this.router.navigate(['/cars']);
  }

  /**
   * Get category display name
   */
  getCategoryDisplay(category: string): string {
    const displayNames: { [key: string]: string } = {
      'Hatchback': 'Hatch Back',
      'Sports': 'Super Car',
      'SUV': 'SUV',
      'Sedan': 'Sedan',
      'Truck': 'Cab'
    };
    return displayNames[category] || category;
  }
}