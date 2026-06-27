import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-profile.html',
  styleUrls: ['./edit-profile.css']
})
export class EditProfile implements OnInit {
  userData: any = {
    id: '',
    fname: '',
    lname: '',
    email: '',
    address: '',
    contact: '',
    role: '',
    status: '',
    profile_pic: ''
  };

  newPassword: string = '';
  confirmPassword: string = '';
  selectedProfilePic: File | null = null;
  profilePicPreview: string | null = null;

  loading: boolean = false;
  isSubmitting: boolean = false;
  isUploadingImage: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  error: string = '';

  private apiUrl = 'http://localhost:8080';
  private userEmail: string = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.userEmail = localStorage.getItem('email') || '';
    if (!this.userEmail) {
      Swal.fire({
        icon: 'warning',
        title: 'Login Required',
        text: 'Please login to access your profile.',
        confirmButtonText: 'OK'
      }).then(() => {
        this.router.navigate(['/login']);
      });
      return;
    }
    this.fetchUserData();
  }

  fetchUserData(): void {
    this.loading = true;
    this.error = '';

    this.http.get(`${this.apiUrl}/user/email?email=${this.userEmail}`).subscribe({
      next: (res: any) => {
        this.userData = res.data || res;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load user data';
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: this.error,
          confirmButtonText: 'OK'
        });
        this.cdr.detectChanges();
      }
    });
  }

  getProfileImage(): string {
    if (this.profilePicPreview) {
      return this.profilePicPreview;
    }
    if (this.userData?.profile_pic) {
      if (this.userData.profile_pic.startsWith('http')) {
        return this.userData.profile_pic;
      }
      return `${this.apiUrl}/api/images/profiles/${this.userData.profile_pic}`;
    }
    const name = `${this.userData?.fname || 'U'} ${this.userData?.lname || 'ser'}`;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=128&background=6366f1&color=fff&bold=true&font-size=0.5`;
  }

  onProfilePicSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const validTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid File Type',
          text: 'Please upload PNG, JPG, JPEG, WEBP, or GIF images only',
          confirmButtonText: 'OK'
        });
        event.target.value = '';
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        Swal.fire({
          icon: 'error',
          title: 'File Too Large',
          text: 'Profile picture must be less than 10MB',
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

  validateForm(): boolean {
    const errors: string[] = [];

    if (!this.userData.fname || this.userData.fname.trim() === '') {
      errors.push('First Name is required.');
    }
    if (!this.userData.lname || this.userData.lname.trim() === '') {
      errors.push('Last Name is required.');
    }
    if (!this.userData.contact || this.userData.contact.trim() === '') {
      errors.push('Contact number is required.');
    } else if (!/^[0-9+\-\s()]+$/.test(this.userData.contact)) {
      errors.push('Please enter a valid contact number.');
    }

    // Password validation
    if (this.newPassword || this.confirmPassword) {
      if (this.newPassword !== this.confirmPassword) {
        errors.push('Passwords do not match.');
      }
      if (this.newPassword.length < 6) {
        errors.push('New password must be at least 6 characters.');
      }
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

  onSubmit(): void {
    if (this.isSubmitting) return;

    if (!this.validateForm()) {
      return;
    }

    // Confirm update
    Swal.fire({
      icon: 'question',
      title: 'Update Profile?',
      text: 'Are you sure you want to update your profile?',
      showCancelButton: true,
      confirmButtonText: 'Yes, Update',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (!result.isConfirmed) {
        return;
      }

      this.isSubmitting = true;
      this.errorMessage = '';
      this.successMessage = '';

      // First upload the profile image if selected
      this.uploadProfileImage().then((filename) => {
        if (filename) {
          this.userData.profile_pic = filename;
        }
        this.updateUserProfile();
      }).catch((error) => {
        this.isSubmitting = false;
        this.errorMessage = error;
        Swal.fire({
          icon: 'error',
          title: 'Upload Failed',
          text: error,
          confirmButtonText: 'OK'
        });
      });
    });
  }

  updateUserProfile(): void {
    this.http.put(`${this.apiUrl}/user/id?id=${this.userData.id}`, this.userData).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.successMessage = res.message || 'Profile updated successfully!';

        // Update local storage
        localStorage.setItem('email', this.userData.email);
        localStorage.setItem('userData', JSON.stringify(this.userData));

        // Reset password fields
        this.newPassword = '';
        this.confirmPassword = '';
        this.selectedProfilePic = null;
        this.profilePicPreview = null;

        Swal.fire({
          icon: 'success',
          title: 'Profile Updated!',
          text: 'Your profile has been updated successfully.',
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });

        // Refresh user data
        this.fetchUserData();

        setTimeout(() => {
          this.router.navigate(['/']);
        }, 2000);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'Failed to update profile. Please try again.';
        Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: this.errorMessage,
          confirmButtonText: 'OK'
        });
        this.cdr.detectChanges();
      }
    });
  }

  removeProfilePicture(): void {
    if (!this.userData.profile_pic) {
      return;
    }

    Swal.fire({
      icon: 'warning',
      title: 'Remove Profile Picture?',
      text: 'Are you sure you want to remove your profile picture?',
      showCancelButton: true,
      confirmButtonText: 'Yes, remove it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isSubmitting = true;
        this.http.delete(`${this.apiUrl}/api/images/profiles/user/${this.userData.email}`).subscribe({
          next: () => {
            this.userData.profile_pic = '';
            this.profilePicPreview = null;
            this.selectedProfilePic = null;
            this.isSubmitting = false;
            this.fetchUserData();

            Swal.fire({
              icon: 'success',
              title: 'Removed!',
              text: 'Profile picture has been removed.',
              timer: 1500,
              showConfirmButton: false,
              toast: true,
              position: 'top-end'
            });
          },
          error: (err) => {
            this.isSubmitting = false;
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: err.error?.error || 'Failed to remove profile picture',
              confirmButtonText: 'OK'
            });
          }
        });
      }
    });
  }

  goBack(): void {
    if (this.isSubmitting) {
      Swal.fire({
        icon: 'warning',
        title: 'Changes in Progress',
        text: 'Please wait for the current operation to complete',
        confirmButtonText: 'OK'
      });
      return;
    }
    this.router.navigate(['/']);
  }
}