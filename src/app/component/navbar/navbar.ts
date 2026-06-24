import { Component, OnInit, HostListener, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit, OnDestroy {
  isLoggedIn: boolean = false;
  userData: any = null;
  userEmail: string = '';
  showDropdown: boolean = false;
  mobileMenuOpen: boolean = false;
  private apiUrl = 'http://localhost:8080';
  private storageListener: any;

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.checkLoginStatus();
    
    // Listen for route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.checkLoginStatus();
    });

    // Listen for storage changes (for multi-tab support)
    this.storageListener = (event: StorageEvent) => {
      if (event.key === 'email') {
        this.checkLoginStatus();
        this.cdr.detectChanges();
      }
    };
    window.addEventListener('storage', this.storageListener);
  }

  ngOnDestroy(): void {
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
    }
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-container')) {
      this.showDropdown = false;
    }
  }

  checkLoginStatus(): void {
    const email = localStorage.getItem('email') || '';
    
    if (email) {
      if (!this.isLoggedIn || this.userEmail !== email) {
        this.userEmail = email;
        this.isLoggedIn = true;
        this.fetchUserData();
      }
    } else {
      this.isLoggedIn = false;
      this.userData = null;
      this.userEmail = '';
      this.cdr.detectChanges();
    }
  }

  fetchUserData(): void {
    if (!this.userEmail) return;
    
    this.http.get(`${this.apiUrl}/user/email?email=${this.userEmail}`).subscribe({
      next: (res: any) => {
        this.userData = res.data;
        this.isLoggedIn = true;
        this.cdr.detectChanges();
        console.log('User data loaded:', this.userData);
      },
      error: (err) => {
        console.error('Error fetching user data:', err);
        this.logout();
      }
    });
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  closeDropdown(): void {
    this.showDropdown = false;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  getFullName(): string {
    if (this.userData) {
      return `${this.userData.fname} ${this.userData.lname}`;
    }
    return 'User';
  }

  getInitials(): string {
    if (this.userData) {
      return `${this.userData.fname?.charAt(0) || ''}${this.userData.lname?.charAt(0) || ''}`;
    }
    return 'U';
  }

  getDashboardRoute(): string {
    if (!this.userData) return '/';
    const role = this.userData.role?.toLowerCase() || '';
    if (role === 'buyer') return '/buyer-dashboard';
    if (role === 'seller') return '/seller-dashboard';
    if (role === 'both') return '/both-dashboard';
    return '/';
  }

  navigateTo(route: string): void {
    this.closeDropdown();
    this.closeMobileMenu();
    this.router.navigate([route]);
  }

  logout(): void {
    this.closeDropdown();
    this.closeMobileMenu();
    localStorage.removeItem('email');
    localStorage.removeItem('userData');
    this.isLoggedIn = false;
    this.userData = null;
    this.userEmail = '';
    this.cdr.detectChanges();
    this.router.navigate(['/login']);
  }

  refreshUser(): void {
    this.checkLoginStatus();
    this.cdr.detectChanges();
  }
}