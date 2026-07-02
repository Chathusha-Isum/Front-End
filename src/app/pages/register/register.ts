import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component } from '@angular/core';
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
  public isUploadingImage: boolean = false;
  public errorMessage: string = '';
  public successMessage: string = '';
  public error: string = '';
  public termsAccepted: boolean = false;
  private apiUrl = 'http://localhost:8080';

  // Password strength indicators
  public passwordStrength: number = 0;
  public passwordChecks = {
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  };

  constructor(private http: HttpClient, private router: Router, private cdr: ChangeDetectorRef) { 
    this.generateUserId();
  }

  generateUserId(): void {
    this.http.get(`${this.apiUrl}/user/`).subscribe({
      next: (res: any) => {
        const count = res.data ? res.data.length : 0;
        this.user.id = "usr_" + (count + 1);
      },
      error: () => {
        this.user.id = "usr_" + Date.now();
      }
    });
  }

  // Add this method
  getRoundedStrength(): number {
    return Math.round(this.passwordStrength);
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
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  // Password strength checker
  checkPasswordStrength(password: string): void {
    this.passwordChecks = {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false
    };

    if (!password) {
      this.passwordStrength = 0;
      return;
    }

    this.passwordChecks.length = password.length >= 8;
    this.passwordChecks.uppercase = /[A-Z]/.test(password);
    this.passwordChecks.lowercase = /[a-z]/.test(password);
    this.passwordChecks.number = /[0-9]/.test(password);
    this.passwordChecks.special = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const totalChecks = 5;
    const passedChecks = Object.values(this.passwordChecks).filter(Boolean).length;
    this.passwordStrength = (passedChecks / totalChecks) * 100;

    this.cdr.detectChanges();
  }

  getPasswordStrengthLabel(): string {
    if (this.passwordStrength === 0) return '';
    if (this.passwordStrength < 40) return 'Weak';
    if (this.passwordStrength < 60) return 'Fair';
    if (this.passwordStrength < 80) return 'Good';
    return 'Strong';
  }

  getPasswordStrengthColor(): string {
    if (this.passwordStrength === 0) return 'bg-gray-600';
    if (this.passwordStrength < 40) return 'bg-red-500';
    if (this.passwordStrength < 60) return 'bg-yellow-500';
    if (this.passwordStrength < 80) return 'bg-blue-500';
    return 'bg-green-500';
  }

  validateForm(): boolean {
    const errors: string[] = [];

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
    } else {
      const passwordErrors: string[] = [];
      
      if (this.user.password.length < 8) {
        passwordErrors.push('at least 8 characters');
      }
      if (!/[A-Z]/.test(this.user.password)) {
        passwordErrors.push('at least one uppercase letter');
      }
      if (!/[a-z]/.test(this.user.password)) {
        passwordErrors.push('at least one lowercase letter');
      }
      if (!/[0-9]/.test(this.user.password)) {
        passwordErrors.push('at least one number');
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(this.user.password)) {
        passwordErrors.push('at least one special character (!@#$%^&*(),.?":{}|<>)');
      }

      if (passwordErrors.length > 0) {
        errors.push(`Password must contain: ${passwordErrors.join(', ')}`);
      }

      if (this.passwordStrength < 40) {
        errors.push('Password is too weak. Please choose a stronger password.');
      }
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

    // Terms and Conditions validation
    if (!this.termsAccepted) {
      errors.push('You must agree to the Terms & Conditions.');
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

  uploadProfileImage(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.selectedProfilePic) {
        resolve('');
        return;
      }

      this.isUploadingImage = true;
      const formData = new FormData();
      formData.append('imageFile', this.selectedProfilePic);

      this.http.post(`${this.apiUrl}/api/images/profiles/upload`, formData).subscribe({
        next: (res: any) => {
          this.isUploadingImage = false;
          if (res.success) {
            resolve(res.filename);
          } else {
            reject(res.error || 'Failed to upload image');
          }
        },
        error: (err) => {
          this.isUploadingImage = false;
          reject(err.error?.error || 'Failed to upload image');
        }
      });
    });
  }

  register() {
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;
    this.isLoading = true;

    this.uploadProfileImage().then((filename) => {
      if (filename) {
        this.user.profile_pic = filename;
      }

      const userData = {
        id: this.user.id,
        fname: this.user.fname,
        lname: this.user.lname,
        email: this.user.email,
        password: this.user.password,
        confirm_password: this.user.confirm_password,
        address: this.user.address,
        contact: this.user.contact,
        profile_pic: this.user.profile_pic,
        status: this.user.status,
        role: this.user.role
      };

      this.http.post(`${this.apiUrl}/user/`, userData).subscribe({
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
          
          if (this.user.profile_pic) {
            this.http.delete(`${this.apiUrl}/api/images/profiles/${this.user.profile_pic}`).subscribe({
              next: () => console.log('Cleanup: Profile image deleted'),
              error: () => console.log('Cleanup: Failed to delete profile image')
            });
          }
          
          Swal.fire({
            icon: 'error',
            title: 'Registration Failed',
            text: error.error?.message || 'Failed to create account. Please try again.',
            confirmButtonText: 'OK'
          });
        }
      });
    }).catch((error) => {
      this.isSubmitting = false;
      this.isLoading = false;
      Swal.fire({
        icon: 'error',
        title: 'Image Upload Failed',
        text: error,
        confirmButtonText: 'OK'
      });
    });
  }
}