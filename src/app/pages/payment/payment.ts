import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';

declare var Stripe: any;
declare var StripeElements: any;

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment.html',
  styleUrls: ['./payment.css']
})
export class Payment implements OnInit, AfterViewInit, OnDestroy {
  private apiUrl = 'http://localhost:8080';
  
  // Payment configuration
  public isTesting: boolean = true;
  public stripePublicKey: string = '';
  public paymentData: any = null;
  public paymentStatus: 'success' | 'failed' | null = null;
  public paymentError: string = '';
  public transactionId: string = '';
  
  // UI States
  public isLoading: boolean = true;
  public isProcessing: boolean = false;
  public isStripeLoaded: boolean = false;
  
  // Stripe Elements
  private stripe: any;
  private elements: any;
  private cardElement: any;
  private cardErrors: any;
  
  // Payment History
  public paymentHistory: any[] = [];
  public userId: string = '';

  @ViewChild('cardElement') cardElementRef!: ElementRef;
  @ViewChild('cardErrors') cardErrorsRef!: ElementRef;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get user ID from localStorage
    const email = localStorage.getItem('email');
    if (email) {
      this.http.get(`${this.apiUrl}/user/email?email=${email}`).subscribe({
        next: (res: any) => {
          if (res && res.bool && res.data) {
            this.userId = res.data.id;
            this.loadPaymentHistory();
          }
        },
        error: () => {
          Swal.fire('Error', 'Please login to continue', 'error');
          this.router.navigate(['/login']);
        }
      });
    } else {
      Swal.fire('Error', 'Please login to continue', 'error');
      this.router.navigate(['/login']);
    }

    // Get payment data from route params or localStorage
    this.loadPaymentData();
    
    // Load Stripe configuration
    this.loadStripeConfig();
  }

  ngAfterViewInit(): void {
    // Initialize Stripe after view is ready
    setTimeout(() => {
      if (this.stripePublicKey) {
        this.initStripe();
      }
    }, 500);
  }

  ngOnDestroy(): void {
    // Clean up Stripe elements
    if (this.cardElement) {
      this.cardElement.destroy();
    }
    if (this.elements) {
      this.elements = null;
    }
  }

  // ==================== LOAD DATA ====================

  loadPaymentData(): void {
    // Get from route params
    this.route.queryParams.subscribe(params => {
      if (params['data']) {
        try {
          this.paymentData = JSON.parse(decodeURIComponent(params['data']));
          this.isLoading = false;
        } catch (e) {
          console.error('Error parsing payment data:', e);
          this.paymentData = null;
        }
      }
    });

    // If no data from params, check localStorage
    if (!this.paymentData) {
      const storedData = localStorage.getItem('paymentData');
      if (storedData) {
        try {
          this.paymentData = JSON.parse(storedData);
          localStorage.removeItem('paymentData');
        } catch (e) {
          console.error('Error parsing stored payment data:', e);
        }
      }
    }

    // If still no data, show error
    if (!this.paymentData) {
      this.isLoading = false;
      Swal.fire('Error', 'No payment data found. Please try again.', 'error');
      this.router.navigate(['/']);
    }
  }

  loadStripeConfig(): void {
    this.http.get(`${this.apiUrl}/payment/config`).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.isTesting = res.data.isTesting;
          this.stripePublicKey = res.data.stripePublicKey;
          
          // Load Stripe script
          this.loadStripeScript();
        } else {
          console.error('Failed to load Stripe config');
        }
      },
      error: (error) => {
        console.error('Error loading Stripe config:', error);
      }
    });
  }

  loadStripeScript(): void {
    // Check if Stripe is already loaded
    if (typeof Stripe !== 'undefined') {
      this.initStripe();
      return;
    }

    // Load Stripe script
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => {
      this.initStripe();
    };
    script.onerror = () => {
      console.error('Failed to load Stripe script');
      Swal.fire('Error', 'Failed to load payment system. Please try again.', 'error');
    };
    document.head.appendChild(script);
  }

  initStripe(): void {
    if (typeof Stripe === 'undefined' || !this.stripePublicKey) {
      console.warn('Stripe not available');
      return;
    }

    try {
      this.stripe = new Stripe(this.stripePublicKey);
      this.elements = this.stripe.elements();

      // Create card element
      const style = {
        base: {
          color: '#e2e8f0',
          fontFamily: '"Inter", sans-serif',
          fontSize: '16px',
          '::placeholder': {
            color: '#64748b'
          }
        },
        invalid: {
          color: '#f87171',
          iconColor: '#f87171'
        }
      };

      this.cardElement = this.elements.create('card', { style });
      
      // Mount card element
      const mountElement = document.querySelector('#card-element');
      if (mountElement) {
        this.cardElement.mount('#card-element');
        this.isStripeLoaded = true;
      }

      // Handle card errors
      this.cardElement.on('change', (event: any) => {
        const displayError = document.querySelector('#card-errors');
        if (displayError) {
          if (event.error) {
            displayError.textContent = event.error.message;
          } else {
            displayError.textContent = '';
          }
        }
      });

      this.isStripeLoaded = true;
      this.isLoading = false;

    } catch (error) {
      console.error('Error initializing Stripe:', error);
      this.isLoading = false;
      Swal.fire('Error', 'Failed to initialize payment system', 'error');
    }
  }

  // ==================== PAYMENT HISTORY ====================

  loadPaymentHistory(): void {
    if (!this.userId) return;
    
    this.http.get(`${this.apiUrl}/payment/user/${this.userId}`).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.paymentHistory = res.data || [];
        }
      },
      error: (error) => {
        console.error('Error loading payment history:', error);
      }
    });
  }

  // ==================== PAYMENT PROCESSING ====================

  async processPayment(): Promise<void> {
    if (this.isProcessing) return;

    if (!this.paymentData) {
      Swal.fire('Error', 'No payment data available', 'error');
      return;
    }

    this.isProcessing = true;
    this.paymentStatus = null;
    this.paymentError = '';

    try {
      if (this.isTesting) {
        // Use test payment
        await this.processTestPayment();
      } else {
        // Use Stripe live payment
        await this.processLivePayment();
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      this.paymentStatus = 'failed';
      this.paymentError = error.message || 'Payment failed. Please try again.';
      this.isProcessing = false;
      
      Swal.fire({
        icon: 'error',
        title: 'Payment Failed',
        text: this.paymentError,
        confirmButtonText: 'Try Again'
      });
    }
  }

  async processTestPayment(): Promise<void> {
    const paymentData = {
      userId: this.userId,
      amount: this.paymentData.amount,
      currency: 'LKR',
      paymentType: this.paymentData.paymentType,
      itemId: this.paymentData.itemId || 'test',
      metadata: {
        itemName: this.paymentData.itemName,
        ...this.paymentData.metadata
      }
    };

    this.http.post(`${this.apiUrl}/payment/test-payment`, paymentData).subscribe({
      next: (res: any) => {
        this.isProcessing = false;
        
        if (res.success) {
          this.paymentStatus = 'success';
          this.transactionId = res.transactionId;
          
          // Save transaction data
          this.savePaymentRecord(res);
          
          Swal.fire({
            icon: 'success',
            title: 'Payment Successful!',
            text: `Transaction ID: ${res.transactionId}`,
            confirmButtonText: 'OK'
          }).then(() => {
            this.router.navigate(['/payment-success'], {
              queryParams: { transactionId: res.transactionId }
            });
          });
        } else {
          this.paymentStatus = 'failed';
          this.paymentError = res.message || 'Payment failed';
          
          Swal.fire({
            icon: 'error',
            title: 'Payment Failed',
            text: this.paymentError,
            confirmButtonText: 'Try Again'
          });
        }
      },
      error: (error) => {
        this.isProcessing = false;
        this.paymentStatus = 'failed';
        this.paymentError = error.error?.message || 'Payment failed. Please try again.';
        
        Swal.fire({
          icon: 'error',
          title: 'Payment Failed',
          text: this.paymentError,
          confirmButtonText: 'Try Again'
        });
      }
    });
  }

  async processLivePayment(): Promise<void> {
    if (!this.cardElement || !this.stripe) {
      Swal.fire('Error', 'Payment system not initialized', 'error');
      return;
    }

    // Create payment intent
    const intentData = {
      amount: this.paymentData.amount,
      currency: 'LKR',
      metadata: {
        userId: this.userId,
        paymentType: this.paymentData.paymentType,
        itemId: this.paymentData.itemId || '',
        itemName: this.paymentData.itemName
      }
    };

    try {
      const intentResponse = await this.http.post(`${this.apiUrl}/payment/create-intent`, intentData).toPromise() as any;
      
      if (!intentResponse.success) {
        throw new Error(intentResponse.error || 'Failed to create payment intent');
      }

      const clientSecret = intentResponse.data.clientSecret;

      // Confirm payment with Stripe
      const { error, paymentIntent } = await this.stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: this.cardElement,
        }
      });

      this.isProcessing = false;

      if (error) {
        this.paymentStatus = 'failed';
        this.paymentError = error.message || 'Payment failed';
        
        Swal.fire({
          icon: 'error',
          title: 'Payment Failed',
          text: this.paymentError,
          confirmButtonText: 'Try Again'
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        this.paymentStatus = 'success';
        this.transactionId = paymentIntent.id;
        
        // Save payment record
        this.savePaymentRecord({
          transactionId: paymentIntent.id,
          amount: this.paymentData.amount,
          status: 'completed'
        });
        
        Swal.fire({
          icon: 'success',
          title: 'Payment Successful!',
          text: `Transaction ID: ${paymentIntent.id}`,
          confirmButtonText: 'OK'
        }).then(() => {
          this.router.navigate(['/payment-success'], {
            queryParams: { transactionId: paymentIntent.id }
          });
        });
      }
    } catch (error: any) {
      this.isProcessing = false;
      this.paymentStatus = 'failed';
      this.paymentError = error.message || 'Payment failed';
      
      Swal.fire({
        icon: 'error',
        title: 'Payment Failed',
        text: this.paymentError,
        confirmButtonText: 'Try Again'
      });
    }
  }

  // ==================== SAVE PAYMENT RECORD ====================

  savePaymentRecord(paymentResult: any): void {
    const paymentRecord = {
      transactionId: paymentResult.transactionId || `txn_${Date.now()}`,
      userId: this.userId,
      paymentType: this.paymentData.paymentType,
      itemId: this.paymentData.itemId || '',
      amount: this.paymentData.amount,
      currency: 'LKR',
      status: paymentResult.status || 'completed',
      paymentMethod: this.isTesting ? 'test' : 'stripe',
      isTesting: this.isTesting,
      metadata: {
        itemName: this.paymentData.itemName,
        ...this.paymentData.metadata
      }
    };

    this.http.post(`${this.apiUrl}/payment/save`, paymentRecord).subscribe({
      next: (res: any) => {
        console.log('Payment record saved:', res);
        this.loadPaymentHistory(); // Refresh history
      },
      error: (error) => {
        console.error('Error saving payment record:', error);
      }
    });
  }

  // ==================== UTILITY ====================

  formatPrice(price: number): string {
    if (!price) return 'LKR 0';
    return `LKR ${price.toLocaleString()}`;
  }

  goBack(): void {
    // Navigate back to the appropriate page
    if (this.paymentData?.paymentType === 'car') {
      this.router.navigate(['/car-details']);
    } else if (this.paymentData?.paymentType === 'part') {
      this.router.navigate(['/part-details']);
    } else {
      this.router.navigate(['/cart']);
    }
  }
}