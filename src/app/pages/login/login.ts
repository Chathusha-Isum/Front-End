import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  public user:any ={
    email: "",
    password: ""
  }
  constructor(private http:HttpClient, private router:Router){}

  login(){
    this.http.post("http://localhost:8080/user/login",this.user).subscribe({
      next: (response: any)=>{
        this.showMessage(response.message);
        localStorage.setItem("email",this.user.email);
        this.router.navigate(["/dashboard"]);
      },
      error: (err)=>{
        this.showError(err.error.message);
      }
    })
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
