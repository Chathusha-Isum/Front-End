import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  public user: any = {
    id: "",
    fname: "",
    lname: "",
    email: "",
    password: "",
    confirm_password: "",
    address: "",
    contact: "",
    profile_pic: null,
    status: "active",
    role: "user"
  }

  public selectedProfilePic: File | null = null;
  public profilePicPreview: string | null = null;
  public isLoading: boolean = false;
  public isSubmitting: boolean = false;
  private apiUrl = 'http://localhost:8080';

  constructor(private http: HttpClient, private router: Router) {
    this.generateUserId();
  }

  generateUserId(): void {
    this.http.get(`${this.apiUrl}/user/`).subscribe({
      next: (res: any) => {
        const count = res.data ? res.data.length : 0;
        this.user.id = "USER" + (count + 1);
      },
      error: () => {
        this.user.id = "USER" + Date.now();
      }
    });
  }

  onProfilePicSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const validTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid File Type',
          text: 'Please upload PNG, JPG, JPEG, or WEBP images only',
          confirmButtonText: 'OK'
        });
        event.target.value = '';
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          icon: 'error',
          title: 'File Too Large',
          text: 'Profile picture must be less than 5MB',
          confirmButtonText: 'OK'
        });
        event.target.value = '';
        return;
      }

      this.selectedProfilePic = file;

      const reader = new FileReader();
      reader.onload = (e) => {
        this.profilePicPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  validateForm(): boolean {
    const errors: string[] = [];

    // Required fields validation
    if (!this.user.fname || this.user.fname.trim() === '') {
      errors.push('First Name is required.');
    }
    if (!this.user.lname || this.user.lname.trim() === '') {
      errors.push('Last Name is required.');
    }
    if (!this.user.email || this.user.email.trim() === '') {
      errors.push('Email is required.');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.user.email)) {
        errors.push('Please enter a valid email address.');
      }
    }
    if (!this.user.password || this.user.password.trim() === '') {
      errors.push('Password is required.');
    } else if (this.user.password.length < 6) {
      errors.push('Password must be at least 6 characters.');
    }
    if (!this.user.confirm_password || this.user.confirm_password.trim() === '') {
      errors.push('Confirm Password is required.');
    } else if (this.user.password !== this.user.confirm_password) {
      errors.push('Passwords do not match.');
    }
    if (!this.user.address || this.user.address.trim() === '') {
      errors.push('Address is required.');
    }
    if (!this.user.contact || this.user.contact.trim() === '') {
      errors.push('Contact number is required.');
    } else if (!/^[0-9+\-\s()]+$/.test(this.user.contact)) {
      errors.push('Please enter a valid contact number.');
    }

    if (errors.length > 0) {
      const errorMessage = errors.map(err => `• ${err}`).join('\n');
      Swal.fire({
        icon: 'warning',
        title: 'Validation Errors',
        text: errorMessage,
        confirmButtonText: 'OK, Fix Issues'
      });
      return false;
    }

    return true;
  }

  register() {
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;
    this.isLoading = true;

    const formData = new FormData();
    formData.append('id', this.user.id);
    formData.append('fname', this.user.fname);
    formData.append('lname', this.user.lname);
    formData.append('email', this.user.email);
    formData.append('password', this.user.password);
    formData.append('confirm_password', this.user.confirm_password);
    formData.append('address', this.user.address);
    formData.append('contact', this.user.contact);
    formData.append('status', this.user.status);
    formData.append('role', this.user.role);

    if (this.selectedProfilePic) {
      formData.append('profile_pic', this.selectedProfilePic, this.selectedProfilePic.name);
    }

    this.http.post(`${this.apiUrl}/user/`, formData).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        this.isLoading = false;
        
        Swal.fire({
          icon: 'success',
          title: 'Registration Successful!',
          text: response.message || 'Your account has been created.',
          confirmButtonText: 'Continue'
        }).then(() => {
          localStorage.setItem("email", this.user.email);

          // Fetch user data to store in localStorage
          this.http.get(`${this.apiUrl}/user/email?email=${this.user.email}`).subscribe({
            next: (res: any) => {
              localStorage.setItem('userData', JSON.stringify(res.data));
              this.router.navigate(['/buyer-dashboard']);
            },
            error: () => {
              this.router.navigate(['/login']);
            }
          });
        });
      },
      error: (error) => {
        this.isSubmitting = false;
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'Registration Failed',
          text: error.error?.message || 'Failed to create account. Please try again.',
          confirmButtonText: 'OK'
        });
      }
    });
  }
}