import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import swal from 'sweetalert2';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  private email: string;
  public newPassword: string = "";
  public confirmPassword: string = "";

  constructor(private http: HttpClient, private router:Router) {
    const urlParams = new URLSearchParams(window.location.search);
    const parts = urlParams.get('email')?.split('/') || [];
    this.email = parts[0];
  }

  public reset() {
    if (this.newPassword === this.confirmPassword) {
      this.http.put('http://localhost:8080/user/reset-password', { "email": this.email, "password": this.newPassword }).subscribe((res: any) => {
        this.showMessage(res.message);
        this.router.navigate(['login']);
      });
    }

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
