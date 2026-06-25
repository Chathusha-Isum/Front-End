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
  image: string = "uploads/profiles/"+this.selectedProfilePic;

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.userEmail = localStorage.getItem('email') || '';
    if (!this.userEmail) {
      this.router.navigate(['/login']);
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
        this.cdr.detectChanges();
      }
    });
  }

  getProfileImage(): string {
    if (this.profilePicPreview) {
      return this.profilePicPreview;
    }
    if (this.userData?.profile_pic) {
      // Check if it's already a full URL
      if (this.userData.profile_pic.startsWith('http')) {
        return this.userData.profile_pic;
      }
      // Use the images API endpoint for profiles
      return `${this.apiUrl}/api/images/profiles/${this.userData.profile_pic}`;
    }
    // Generate avatar from name
    const name = `${this.userData?.fname || 'U'} ${this.userData?.lname || 'ser'}`;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=128&background=6366f1&color=fff&bold=true&font-size=0.5`;
  }

  onProfilePicSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const validTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        Swal.fire({
          title: 'Invalid file type',
          text: 'Please upload PNG, JPG, JPEG, WEBP, or GIF images only',
          icon: 'error',
          confirmButtonText: 'OK',
          background: '#1e293b',
          color: '#e2e8f0'
        });
        event.target.value = '';
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        Swal.fire({
          title: 'File too large',
          text: 'Profile picture must be less than 10MB',
          icon: 'error',
          confirmButtonText: 'OK',
          background: '#1e293b',
          color: '#e2e8f0'
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

  // Upload profile image to server
  uploadProfileImage(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.selectedProfilePic) {
        resolve('');
        return;
      }

      this.isUploadingImage = true;
      const formData = new FormData();
      formData.append('imageFile', this.selectedProfilePic);

      // Upload using the profile upload endpoint
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

    // Validate form
    if (!this.userData.fname || !this.userData.lname || !this.userData.contact) {
      this.errorMessage = 'Please fill in all required fields';
      Swal.fire({
        title: 'Validation Error',
        text: 'Please fill in all required fields',
        icon: 'error',
        confirmButtonText: 'OK',
        background: '#1e293b',
        color: '#e2e8f0'
      });
      return;
    }

    // Validate password match if changing password
    if (this.newPassword || this.confirmPassword) {
      if (this.newPassword !== this.confirmPassword) {
        this.errorMessage = 'Passwords do not match';
        Swal.fire({
          title: 'Error',
          text: 'Passwords do not match',
          icon: 'error',
          confirmButtonText: 'OK',
          background: '#1e293b',
          color: '#e2e8f0'
        });
        return;
      }
      if (this.newPassword.length < 6) {
        this.errorMessage = 'Password must be at least 6 characters';
        Swal.fire({
          title: 'Error',
          text: 'Password must be at least 6 characters',
          icon: 'error',
          confirmButtonText: 'OK',
          background: '#1e293b',
          color: '#e2e8f0'
        });
        return;
      }
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    // First upload the profile image if selected
    this.uploadProfileImage().then((filename) => {
      // If image uploaded successfully, update the user data
      if (filename) {
        this.userData.profile_pic = filename;
      }
      this.updateUserProfile();
    }).catch((error) => {
      this.isSubmitting = false;
      this.errorMessage = error;
      Swal.fire({
        title: 'Error',
        text: error,
        icon: 'error',
        confirmButtonText: 'OK',
        background: '#1e293b',
        color: '#e2e8f0'
      });
    });
  }

  updateUserProfile(): void {

    this.http.put(`${this.apiUrl}/user/id?id=${this.userData.id}`, this.userData).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.successMessage = res.message || 'Profile updated successfully!';

        // Update local storage user data
        localStorage.setItem('email', this.userData.email);

        // Reset password fields
        this.newPassword = '';
        this.confirmPassword = '';
        this.selectedProfilePic = null;
        this.profilePicPreview = null;

        Swal.fire({
          title: 'Success!',
          text: 'Your profile has been updated successfully.',
          icon: 'success',
          confirmButtonText: 'OK',
          background: '#1e293b',
          color: '#e2e8f0'
        });

        // Refresh user data to show updated profile
        this.fetchUserData();

        setTimeout(() => {
          this.router.navigate(['/']);
        }, 2000);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'Failed to update profile. Please try again.';
        Swal.fire({
          title: 'Error',
          text: this.errorMessage,
          icon: 'error',
          confirmButtonText: 'OK',
          background: '#1e293b',
          color: '#e2e8f0'
        });
        this.cdr.detectChanges();
      }
    });
  }

  // Remove profile picture
  removeProfilePicture(): void {
    if (!this.userData.profile_pic) {
      return;
    }

    Swal.fire({
      title: 'Remove Profile Picture?',
      text: 'Are you sure you want to remove your profile picture?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, remove it',
      cancelButtonText: 'Cancel',
      background: '#1e293b',
      color: '#e2e8f0',
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#ef4444'
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
              title: 'Removed!',
              text: 'Profile picture has been removed.',
              icon: 'success',
              confirmButtonText: 'OK',
              background: '#1e293b',
              color: '#e2e8f0'
            });
          },
          error: (err) => {
            this.isSubmitting = false;
            Swal.fire({
              title: 'Error',
              text: err.error?.error || 'Failed to remove profile picture',
              icon: 'error',
              confirmButtonText: 'OK',
              background: '#1e293b',
              color: '#e2e8f0'
            });
          }
        });
      }
    });
  }

  goBack(): void {
    if (this.isSubmitting) {
      Swal.fire({
        title: 'Changes in progress',
        text: 'Please wait for the current operation to complete',
        icon: 'warning',
        confirmButtonText: 'OK',
        background: '#1e293b',
        color: '#e2e8f0'
      });
      return;
    }
    this.router.navigate(['/']);
  }
}