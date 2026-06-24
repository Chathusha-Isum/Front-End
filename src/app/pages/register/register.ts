import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import swal from 'sweetalert2';

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
  private apiUrl = 'http://localhost:8080';

  constructor(private http: HttpClient, private router: Router) {
    this.http.get(`${this.apiUrl}/user/`).subscribe({
      next: (res: any) => {
        this.user.id = "USER" + ((res.data["length"]) + 1);
      }
    });
  }

  onProfilePicSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const validTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        swal.fire({
          title: 'Invalid file type',
          text: 'Please upload PNG, JPG, JPEG, or WEBP images only',
          icon: 'error',
          confirmButtonText: 'OK'
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        swal.fire({
          title: 'File too large',
          text: 'Profile picture must be less than 5MB',
          icon: 'error',
          confirmButtonText: 'OK'
        });
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

  register() {
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
        this.showMessage(response.message);
        localStorage.setItem("email", this.user.email);

        // Fetch user data to store in localStorage
        this.http.get(`${this.apiUrl}/user/email?email=${this.user.email}`).subscribe({
          next: (res: any) => {
            localStorage.setItem('userData', JSON.stringify(res.data));
            this.router.navigate(['/buyer-dashboard']);
          },
          error: () => {
            this.router.navigate(['/dashboard']);
          }
        });
      },
      error: (error) => {
        this.showError(error.error.message);
      }
    });
  }

  private showMessage(message: string) {
    swal.fire({
      title: message,
      icon: 'success',
      confirmButtonText: 'OK'
    });
  }

  private showError(message: string) {
    swal.fire({
      title: message,
      icon: 'error',
      confirmButtonText: 'OK'
    });
  }
}