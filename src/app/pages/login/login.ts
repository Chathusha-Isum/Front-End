import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import swal from 'sweetalert2';
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

  constructor(private http: HttpClient, private router: Router) { }

  login() {
    this.http.post("http://localhost:8080/user/login", this.user)
      .pipe(
        switchMap((response: any) => {
          this.showMessage(response.message);
          localStorage.setItem("email", this.user.email);
          return this.http.get(`http://localhost:8080/user/email?email=${this.user.email}`);
        })
      )
      .subscribe({
        next: (data: any) => {
          const role = data.data.role.replace(/\s/g, '').trim();
          if (role === "user") {
            this.router.navigate(["/buyer-dashboard"]);
          } else {
            this.router.navigate(["/both-dashboard"]);
          }
        },
        error: (err) => {
          console.error("Error:", err);
          this.showError(err.error?.message || "Login failed");
        }
      });
  }
  forgotPassword(){
    if(this.user.email === ""){
      this.showError("Enter Email First");
    }
    else{
      this.http.get(`http://localhost:8080/user/forgot-password?email=${this.user.email}`).subscribe({
        next : (res: any)=>{            
            this.showMessage(res.message);
        }
      })
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