import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-success.html',
  styleUrls: ['./payment-success.css']
})
export class PaymentSuccess implements OnInit {
  public transactionId: string = '';
  public amount: number = 0;
  public isTesting: boolean = false;
  public paymentData: any = null;
  private apiUrl = 'http://localhost:8080';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.transactionId = params['transactionId'] || '';
      if (this.transactionId) {
        this.fetchPaymentDetails();
      }
    });
  }

  fetchPaymentDetails(): void {
    this.http.get(`${this.apiUrl}/payment/transaction/${this.transactionId}`).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.amount = res.data.amount;
          this.isTesting = res.data.is_test === 1;
          this.paymentData = {
            itemName: JSON.parse(res.data.metadata || '{}').itemName || 'Payment'
          };
        }
      },
      error: (error) => {
        console.error('Error fetching payment details:', error);
      }
    });
  }

  formatPrice(price: number): string {
    if (!price) return 'LKR 0';
    return `LKR ${price.toLocaleString()}`;
  }

  goToDashboard(): void {
    this.router.navigate(['/']);
  }

  viewInvoice(): void {
    Swal.fire({
      icon: 'info',
      title: 'Invoice',
      text: 'Invoice download functionality coming soon!',
      confirmButtonText: 'OK'
    });
  }
}