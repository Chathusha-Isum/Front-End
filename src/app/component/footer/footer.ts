import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer implements OnInit {
  isLoggedIn: boolean = false;
  userEmail: string = '';

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.checkLoginStatus();
    
    // Listen for route changes to refresh login status
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.checkLoginStatus();
    });

    // Listen for storage changes (for multi-tab support)
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key === 'email') {
        this.checkLoginStatus();
        this.cdr.detectChanges();
      }
    });
  }

  checkLoginStatus(): void {
    this.userEmail = localStorage.getItem('email') || '';
    this.isLoggedIn = !!this.userEmail;
    this.cdr.detectChanges();
  }

  getDashboardRoute(): string {
    // Try to get user data from localStorage
    const userDataStr = localStorage.getItem('userData');
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        const role = userData.role?.toLowerCase() || '';
        if (role === 'buyer') return '/buyer-dashboard';
        if (role === 'seller') return '/seller-dashboard';
        if (role === 'both') return '/both-dashboard';
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    return '/';
  }

  getFullName(): string {
    const userDataStr = localStorage.getItem('userData');
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        return `${userData.fname || ''} ${userData.lname || ''}`.trim() || 'User';
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    return 'User';
  }

  getInitials(): string {
    const userDataStr = localStorage.getItem('userData');
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        return `${userData.fname?.charAt(0) || ''}${userData.lname?.charAt(0) || ''}` || 'U';
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    return 'U';
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  logout(): void {
    localStorage.removeItem('email');
    localStorage.removeItem('userData');
    this.isLoggedIn = false;
    this.userEmail = '';
    this.cdr.detectChanges();
    this.router.navigate(['/login']);
  }
}