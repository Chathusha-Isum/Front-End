import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';

// Declare Stripe globally
declare const Stripe: any;

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
  public userId: string = '';
  public showTestCardInfo: boolean = true;
  public cardType: string = '';
  
  // Card Details
  public cardDetails = {
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  };

  // Card Errors
  public cardErrors = {
    number: '',
    expiry: '',
    cvv: '',
    name: '',
    general: ''
  };

  // Test Card Info
  public testCard = {
    number: '4242 4242 4242 4242',
    expiry: '12/25',
    cvv: '123'
  };

  // Stripe Elements
  private stripe: any;
  private elements: any;
  private cardElement: any;

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
            console.log('✅ User ID loaded:', this.userId);
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

    // Get payment data
    this.loadPaymentData();
    
    // Load Stripe configuration
    this.loadStripeConfig();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.stripePublicKey && !this.isTesting) {
        this.initStripe();
      } else if (this.isTesting) {
        this.isLoading = false;
        this.isStripeLoaded = true;
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.cardElement) {
      try {
        this.cardElement.destroy();
      } catch (e) {}
    }
    if (this.elements) {
      this.elements = null;
    }
  }

  // ==================== LOAD DATA ====================

  loadPaymentData(): void {
    // Check localStorage first
    const storedData = localStorage.getItem('paymentData');
    if (storedData) {
      try {
        this.paymentData = JSON.parse(storedData);
        console.log('📦 Payment data loaded from localStorage:', this.paymentData);
        console.log('📦 Cart items:', this.paymentData.cartItems);
        localStorage.removeItem('paymentData');
        this.isLoading = false;
        return;
      } catch (e) {
        console.error('Error parsing stored payment data:', e);
        this.paymentData = null;
      }
    }

    // If no data, show error
    if (!this.paymentData) {
      this.isLoading = false;
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No payment data found. Please try again.',
        confirmButtonText: 'OK'
      }).then(() => {
        this.router.navigate(['/']);
      });
    }
  }

  loadStripeConfig(): void {
    this.http.get(`${this.apiUrl}/payment/config`).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.isTesting = res.data.isTesting;
          this.stripePublicKey = res.data.stripePublicKey;
          
          if (!this.isTesting) {
            this.loadStripeScript();
          } else {
            this.showTestCardInfo = true;
            this.isLoading = false;
            this.isStripeLoaded = true;
          }
        } else {
          console.error('Failed to load Stripe config');
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error loading Stripe config:', error);
        this.isTesting = true;
        this.isLoading = false;
        this.isStripeLoaded = true;
      }
    });
  }

  loadStripeScript(): void {
    if (typeof Stripe !== 'undefined') {
      this.initStripe();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => {
      this.initStripe();
    };
    script.onerror = () => {
      console.error('Failed to load Stripe script');
      this.isLoading = false;
      this.isStripeLoaded = true;
      Swal.fire({
        icon: 'warning',
        title: 'Payment System',
        text: 'Stripe failed to load. Please use test mode or try again.',
        confirmButtonText: 'OK'
      });
    };
    document.head.appendChild(script);
  }

  initStripe(): void {
    try {
      if (typeof Stripe === 'undefined' || !this.stripePublicKey) {
        console.warn('Stripe not available');
        this.isLoading = false;
        this.isStripeLoaded = true;
        return;
      }

      this.stripe = new Stripe(this.stripePublicKey);
      this.elements = this.stripe.elements();

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
      
      const mountElement = document.querySelector('#card-element');
      if (mountElement) {
        this.cardElement.mount('#card-element');
        this.isStripeLoaded = true;
        this.isLoading = false;
      }

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

    } catch (error) {
      console.error('Error initializing Stripe:', error);
      this.isLoading = false;
      this.isStripeLoaded = true;
    }
  }

  // ==================== CARD FORMATTING ====================

  detectCardType(number: string): string {
    const cleaned = number.replace(/\s/g, '');
    if (/^4/.test(cleaned)) return 'visa';
    if (/^5[1-5]/.test(cleaned)) return 'mastercard';
    if (/^3[47]/.test(cleaned)) return 'amex';
    if (/^6(?:011|5)/.test(cleaned)) return 'discover';
    return '';
  }

  formatCardNumber(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    
    this.cardType = this.detectCardType(value);
    
    let formatted = '';
    for (let i = 0; i < value.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += ' ';
      }
      formatted += value[i];
    }
    this.cardDetails.number = formatted;
    this.cardErrors.number = '';
  }

  formatExpiry(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    
    let formatted = '';
    for (let i = 0; i < value.length; i++) {
      if (i === 2) {
        formatted += '/';
      }
      formatted += value[i];
    }
    this.cardDetails.expiry = formatted;
    this.cardErrors.expiry = '';
  }

  formatCvv(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    this.cardDetails.cvv = value;
    this.cardErrors.cvv = '';
  }

  // ==================== AUTO-FILL TEST CARD ====================

  fillTestCardDetails(): void {
    this.cardDetails = {
      number: this.testCard.number,
      expiry: this.testCard.expiry,
      cvv: this.testCard.cvv,
      name: 'Test User'
    };
    this.cardType = 'visa';
    this.cardErrors = {
      number: '',
      expiry: '',
      cvv: '',
      name: '',
      general: ''
    };
    
    Swal.fire({
      icon: 'success',
      title: 'Test Card Filled!',
      text: 'Test card details have been auto-filled.',
      timer: 1500,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  }

  // ==================== VALIDATION ====================

  validateCard(): boolean {
    this.cardErrors = {
      number: '',
      expiry: '',
      cvv: '',
      name: '',
      general: ''
    };

    let isValid = true;

    const cardNumber = this.cardDetails.number.replace(/\s/g, '');
    if (!cardNumber || cardNumber.length < 16) {
      this.cardErrors.number = 'Please enter a valid 16-digit card number';
      isValid = false;
    }

    const expiryParts = this.cardDetails.expiry.split('/');
    if (expiryParts.length !== 2) {
      this.cardErrors.expiry = 'Please enter a valid expiry date (MM/YY)';
      isValid = false;
    } else {
      const month = parseInt(expiryParts[0]);
      const year = parseInt(expiryParts[1]);
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      
      if (isNaN(month) || isNaN(year) || month < 1 || month > 12 || year < currentYear || (year === currentYear && month < currentMonth)) {
        this.cardErrors.expiry = 'Please enter a valid expiry date (MM/YY)';
        isValid = false;
      }
    }

    if (!this.cardDetails.cvv || this.cardDetails.cvv.length < 3) {
      this.cardErrors.cvv = 'Please enter a valid CVV';
      isValid = false;
    }

    if (!this.cardDetails.name || this.cardDetails.name.trim().length < 2) {
      this.cardErrors.name = 'Please enter the cardholder name';
      isValid = false;
    }

    return isValid;
  }

  // ==================== PAYMENT PROCESSING ====================

  async processPayment(): Promise<void> {
    if (this.isProcessing) return;

    if (!this.paymentData) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No payment data available',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (!this.paymentData.amount || this.paymentData.amount <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Amount',
        text: 'Please check the payment amount.',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (!this.isTesting && !this.validateCard()) {
      return;
    }

    this.isProcessing = true;
    this.paymentStatus = null;
    this.paymentError = '';

    try {
      if (this.isTesting) {
        await this.processTestPayment();
      } else {
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
    // Ensure cartItems is preserved
    const paymentData = {
      userId: this.userId,
      amount: this.paymentData.amount,
      currency: this.paymentData.currency || 'LKR',
      paymentType: this.paymentData.paymentType || 'part',
      itemId: this.paymentData.itemId || 'test',
      itemName: this.paymentData.itemName || 'Test Purchase',
      quantity: this.paymentData.quantity || 1,
      unitPrice: this.paymentData.amount,
      clearCart: this.paymentData.clearCart || false,
      cartItems: this.paymentData.cartItems || [], // <-- IMPORTANT: Preserve cartItems
      metadata: {
        itemName: this.paymentData.itemName,
        ...this.paymentData.metadata
      }
    };

    console.log('📤 Sending payment data to server:', paymentData);
    console.log('📦 Cart items being sent:', paymentData.cartItems);

    this.http.post(`${this.apiUrl}/payment/process`, paymentData).subscribe({
      next: (res: any) => {
        this.isProcessing = false;
        
        if (res.success) {
          this.paymentStatus = 'success';
          this.transactionId = res.transactionId;
          
          Swal.fire({
            icon: 'success',
            title: 'Payment Successful!',
            text: `Transaction ID: ${res.transactionId}`,
            confirmButtonText: 'OK'
          }).then(() => {
            this.router.navigate(['/payment-success'], {
              queryParams: { 
                transactionId: res.transactionId,
                amount: this.paymentData.amount
              }
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
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Payment system not initialized',
        confirmButtonText: 'OK'
      });
      this.isProcessing = false;
      return;
    }

    const intentData = {
      userId: this.userId,
      amount: this.paymentData.amount,
      currency: this.paymentData.currency || 'LKR',
      paymentType: this.paymentData.paymentType || 'part',
      itemId: this.paymentData.itemId || '',
      itemName: this.paymentData.itemName || '',
      quantity: this.paymentData.quantity || 1,
      unitPrice: this.paymentData.amount,
      clearCart: this.paymentData.clearCart || false,
      cartItems: this.paymentData.cartItems || [],
      metadata: {
        itemName: this.paymentData.itemName,
        ...this.paymentData.metadata
      }
    };

    try {
      const intentResponse = await this.http.post(`${this.apiUrl}/payment/process`, intentData).toPromise() as any;
      
      if (!intentResponse.success) {
        throw new Error(intentResponse.error || 'Failed to create payment intent');
      }

      const clientSecret = intentResponse.clientSecret;

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
        
        Swal.fire({
          icon: 'success',
          title: 'Payment Successful!',
          text: `Transaction ID: ${paymentIntent.id}`,
          confirmButtonText: 'OK'
        }).then(() => {
          this.router.navigate(['/payment-success'], {
            queryParams: { 
              transactionId: paymentIntent.id,
              amount: this.paymentData.amount
            }
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

  // ==================== UTILITY ====================

  formatPrice(price: number): string {
    if (!price) return 'LKR 0';
    return `LKR ${price.toLocaleString()}`;
  }

  goBack(): void {
    if (this.paymentData?.paymentType === 'car') {
      this.router.navigate(['/car-details']);
    } else if (this.paymentData?.paymentType === 'part') {
      this.router.navigate(['/part-details']);
    } else if (this.paymentData?.paymentType === 'cart') {
      this.router.navigate(['/cart']);
    } else {
      this.router.navigate(['/manage-parts']);
    }
  }

  copyTestCardInfo(): void {
    const cardInfo = `${this.testCard.number} | Exp: ${this.testCard.expiry} | CVV: ${this.testCard.cvv}`;
    navigator.clipboard.writeText(cardInfo).then(() => {
      Swal.fire({
        icon: 'success',
        title: 'Copied!',
        text: 'Test card info copied to clipboard',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    }).catch(() => {
      alert('Test Card: 4242 4242 4242 4242 | Exp: 12/25 | CVV: 123');
    });
  }
}