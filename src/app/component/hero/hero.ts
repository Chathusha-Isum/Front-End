import { Component, ElementRef, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero.html',
  styleUrls: ['./hero.css']
})
export class Hero implements AfterViewInit, OnDestroy {
  
  // Car data
  cars = [
    { position: 0, category: 'Hatch Back', badge: 'Compact', image: '3-2.png', color: 'purple' },
    { position: 1, category: 'Super Car', badge: 'Luxury', image: '2-2.png', color: 'red' },
    { position: 2, category: 'SUV', badge: 'Most Popular', image: '1.png', color: 'orange' },
    { position: 3, category: 'Sedan', badge: 'Comfort', image: '2-1.png', color: 'green' },
    { position: 4, category: 'Cab', badge: 'Ride', image: '3-1.png', color: 'yellow' }
  ];

  private lightboxElement: HTMLElement | null = null;
  private lightboxImg: HTMLImageElement | null = null;

  constructor(private el: ElementRef) {}

  ngAfterViewInit(): void {
    this.initLightbox();
    this.makeButtonsClickable();
  }

  ngOnDestroy(): void {
    // Clean up lightbox event listeners
    document.removeEventListener('keydown', this.handleEscKey.bind(this));
  }

  private initLightbox(): void {
    this.lightboxElement = document.getElementById('lightbox');
    this.lightboxImg = document.getElementById('lightbox-img') as HTMLImageElement;
    
    // Add escape key listener
    document.addEventListener('keydown', this.handleEscKey.bind(this));
  }

  private makeButtonsClickable(): void {
    const buttons = document.querySelectorAll('.depth-btn');
    
    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const imageSrc = btn.getAttribute('data-image');
        const category = btn.getAttribute('data-category');
        
        if (imageSrc && this.lightboxImg && this.lightboxElement) {
          this.lightboxImg.src = imageSrc;
          this.lightboxElement.classList.add('active');
        }
        
        // console.log(`Clicked: ${category}`);
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

  // Optional: Add method to navigate to category page
  navigateToCategory(category: string): void {
    // Navigate to category page
    // this.router.navigate([`/category/${category.toLowerCase().replace(' ', '-')}`]);
    // console.log(`Navigate to: ${category}`);
  }
}