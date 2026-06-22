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
    status: "active",
    role: ""
  }
  constructor(private http: HttpClient, private router: Router) {
    this.http.get("http://localhost:8080/user/").subscribe({
      next: (res: any) => {
        this.user.id = "USER"+((res.data["length"]) + 1);
      }
    });
  }

  register() {
    this.http.post("http://localhost:8080/user/", this.user).subscribe({
      next: (response: any) => {
        this.showMessage(response.message);
        localStorage.setItem("email", this.user.email);
        this.router.navigate(["/dashboard"]);
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
