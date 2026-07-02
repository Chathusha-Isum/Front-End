import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})

export class Login {
  public user: any = {
    email: "",
    password: ""
  }
  public isLoading: boolean = false;

  constructor(private http: HttpClient, private router: Router) { }

  login() {
    // Validate email
    if (!this.user.email || this.user.email.trim() === '') {
      Swal.fire({
        icon: 'warning',
        title: 'Email Required',
        text: 'Please enter your email address.',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Validate password
    if (!this.user.password || this.user.password.trim() === '') {
      Swal.fire({
        icon: 'warning',
        title: 'Password Required',
        text: 'Please enter your password.',
        confirmButtonText: 'OK'
      });
      return;
    }

    this.isLoading = true;

    this.http.post("http://localhost:8080/user/login", this.user)
      .pipe(
        switchMap((response: any) => {
          this.isLoading = false;
          
          // Show success message
          Swal.fire({
            icon: 'success',
            title: 'Login Successful',
            text: response.message || 'Welcome back!',
            timer: 1500,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
          });
          
          localStorage.setItem("email", this.user.email);
          return this.http.get(`http://localhost:8080/user/email?email=${this.user.email}`);
        })
      )
      .subscribe({
        next: (data: any) => {
          const role = data.data.role.replace(/\s/g, '').trim();
          // Store user data in localStorage
          localStorage.setItem('userData', JSON.stringify(data.data));
          
          if (role === "user") {
            this.router.navigate(["/buyer-dashboard"]);
          } else {
            this.router.navigate(["/admin-dashboard"]);
          }
        },
        error: (err) => {
          this.isLoading = false;
          console.error("Error:", err);
          Swal.fire({
            icon: 'error',
            title: 'Login Failed',
            text: err.error?.message || 'Invalid email or password. Please try again.',
            confirmButtonText: 'OK'
          });
        }
      });
  }

  forgotPassword() {
    if (!this.user.email || this.user.email.trim() === '') {
      Swal.fire({
        icon: 'warning',
        title: 'Email Required',
        text: 'Please enter your email address to reset password.',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.user.email)) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Email',
        text: 'Please enter a valid email address.',
        confirmButtonText: 'OK'
      });
      return;
    }

    this.isLoading = true;

    this.http.get(`http://localhost:8080/user/forgot-password?email=${this.user.email}`).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        Swal.fire({
          icon: 'success',
          title: 'Password Reset Email Sent',
          text: res.message || 'Check your email for password reset instructions.',
          confirmButtonText: 'OK'
        });
      },
      error: (err) => {
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'Failed to Send Reset Email',
          text: err.error?.message || 'Email not found. Please check your email address.',
          confirmButtonText: 'OK'
        });
      }
    });
  }
}