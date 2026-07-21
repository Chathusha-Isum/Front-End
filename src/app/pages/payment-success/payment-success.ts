import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';

interface PaymentMetadata {
  itemName?: string;
  carBrand?: string;
  carYear?: string;
  carCategory?: string;
  cartItems?: any[];
  totalItems?: number;
  [key: string]: any;
}

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
  public userData: any = null;
  public createdAt: string = '';
  public isLoading: boolean = true;
  private apiUrl = 'http://localhost:8080';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.transactionId = params['transactionId'] || '';
      this.amount = parseFloat(params['amount']) || 0;
      if (this.transactionId) {
        this.fetchPaymentDetails();
      } else {
        this.isLoading = false;
      }
    });
  }

  fetchPaymentDetails(): void {
    this.http.get(`${this.apiUrl}/payment/transaction/${this.transactionId}`).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.amount = res.data.amount;
          this.isTesting = res.data.is_test === 1;
          this.createdAt = res.data.created_at;
          
          let metadata: PaymentMetadata = {};
          try {
            metadata = JSON.parse(res.data.metadata || '{}');
          } catch (e) {
            metadata = {};
          }
          
          this.paymentData = {
            itemName: res.data.item_name || metadata.itemName || 'Payment',
            paymentType: res.data.payment_type || 'part',
            quantity: res.data.quantity || 1,
            currency: res.data.currency || 'LKR',
            status: res.data.status,
            paymentMethod: res.data.payment_method
          };

          // Fetch user data
          this.fetchUserData(res.data.user_id);
        } else {
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error fetching payment details:', error);
        this.isLoading = false;
      }
    });
  }

  fetchUserData(userId: string): void {
    this.http.get(`${this.apiUrl}/user/id?id=${userId}`).subscribe({
      next: (res: any) => {
        if (res && res.bool && res.data) {
          this.userData = res.data;
          console.log('✅ User data loaded:', this.userData);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching user data:', error);
        this.isLoading = false;
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
    if (!this.transactionId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No transaction found to generate invoice.',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Check if user data is loaded, if not fetch it first
    if (!this.userData) {
      Swal.fire({
        icon: 'info',
        title: 'Loading...',
        text: 'Please wait while we prepare your invoice.',
        showConfirmButton: false,
        timer: 1500
      });
      
      // Wait a moment then try again
      setTimeout(() => {
        if (this.userData) {
          this.generateInvoicePDF();
        } else {
          Swal.fire({
            icon: 'warning',
            title: 'Incomplete Data',
            text: 'User information is not fully loaded. Generating invoice with available data.',
            confirmButtonText: 'Continue'
          }).then(() => {
            this.generateInvoicePDF();
          });
        }
      }, 1000);
      return;
    }

    this.generateInvoicePDF();
  }

generateInvoicePDF(): void {
    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // ===== COLORS =====
        const primaryColor = [99, 102, 241];
        const textDark = [30, 41, 59];
        const textMedium = [71, 85, 105];
        const textLight = [148, 163, 184];
        
        let y = 20;
        
        // ===== HEADER =====
        doc.setFontSize(28);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont('helvetica', 'bold');
        doc.text('CruserPremium', 20, y);
        
        doc.setFontSize(10);
        doc.setTextColor(textLight[0], textLight[1], textLight[2]);
        doc.setFont('helvetica', 'normal');
        doc.text('Auto Marketplace', 20, y + 6);
        
        doc.setFontSize(24);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE', pageWidth - 40, y + 4, { align: 'right' });
        
        y += 20;
        
        // ===== INVOICE INFO =====
        doc.setFontSize(9);
        doc.setTextColor(textMedium[0], textMedium[1], textMedium[2]);
        doc.setFont('helvetica', 'normal');
        
        const dateStr = this.createdAt ? new Date(this.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
        const timeStr = this.createdAt ? new Date(this.createdAt).toLocaleTimeString() : new Date().toLocaleTimeString();
        
        doc.text(`Invoice #: ${this.transactionId}`, pageWidth - 40, y, { align: 'right' });
        doc.text(`Date: ${dateStr}`, pageWidth - 40, y + 6, { align: 'right' });
        doc.text(`Time: ${timeStr}`, pageWidth - 40, y + 12, { align: 'right' });
        
        y += 20;
        
        // ===== DIVIDER =====
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.5);
        doc.line(20, y, pageWidth - 20, y);
        y += 10;
        
        // ===== BILL TO =====
        doc.setFontSize(12);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.setFont('helvetica', 'bold');
        doc.text('Bill To:', 20, y);
        
        y += 8;
        doc.setFontSize(9);
        doc.setTextColor(textMedium[0], textMedium[1], textMedium[2]);
        doc.setFont('helvetica', 'normal');
        
        const firstName = this.userData?.fname || '';
        const lastName = this.userData?.lname || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'Customer';
        
        doc.text(`Name: ${fullName}`, 20, y);
        y += 6;
        doc.text(`Email: ${this.userData?.email || 'N/A'}`, 20, y);
        y += 6;
        doc.text(`Contact: ${this.userData?.contact || 'N/A'}`, 20, y);
        y += 6;
        
        const address = this.userData?.address || 'N/A';
        if (address.length > 40) {
            const addressLines = this.wrapText(address, 40);
            addressLines.forEach((line: string) => {
                doc.text(`Address: ${line}`, 20, y);
                y += 6;
            });
        } else {
            doc.text(`Address: ${address}`, 20, y);
            y += 6;
        }
        
        y += 10;
        
        // ===== TABLE =====
        const tableTop = y;
        // Fixed column positions with proper spacing
        const col1X = 20;      // Item
        const col2X = 100;     // Qty
        const col3X = 135;     // Unit Price
        const col4X = 175;     // Total (right aligned)
        const tableWidth = pageWidth - 40;
        
        // Table Header Background
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(col1X, tableTop, tableWidth, 10, 'F');
        
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('Item', col1X + 5, tableTop + 7);
        doc.text('Qty', col2X + 5, tableTop + 7);
        doc.text('Unit Price', col3X + 2, tableTop + 7);
        doc.text('Total', col4X + 2, tableTop + 7, { align: 'right' });
        
        // Table Row Background
        doc.setFillColor(248, 250, 252);
        doc.rect(col1X, tableTop + 10, tableWidth, 10, 'F');
        
        doc.setFontSize(9);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.setFont('helvetica', 'normal');
        
        const itemName = this.paymentData?.itemName || 'Purchase';
        const qty = this.paymentData?.quantity || 1;
        const unitPrice = this.amount / qty;
        const totalPrice = this.amount;
        
        const displayName = itemName.length > 25 ? itemName.substring(0, 22) + '...' : itemName;
        
        // Left align item name
        doc.text(displayName, col1X + 5, tableTop + 17);
        // Center align quantity
        doc.text(qty.toString(), col2X + 5, tableTop + 17);
        // Right align unit price
        doc.text(this.formatPrice(unitPrice), col3X + 2, tableTop + 17, { align: 'right' });
        // Right align total
        doc.text(this.formatPrice(totalPrice), col4X + 2, tableTop + 17, { align: 'right' });
        
        y = tableTop + 30;
        
        // ===== TOTAL SECTION =====
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(col2X - 10, y, pageWidth - 20, y);
        y += 8;
        
        doc.setFontSize(10);
        doc.setTextColor(textMedium[0], textMedium[1], textMedium[2]);
        doc.setFont('helvetica', 'normal');
        doc.text('Subtotal:', col3X, y);
        doc.text(this.formatPrice(this.amount), pageWidth - 20, y, { align: 'right' });
        y += 8;
        
        doc.text('Tax (0%):', col3X, y);
        doc.text('LKR 0', pageWidth - 20, y, { align: 'right' });
        y += 8;
        
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.5);
        doc.line(col2X - 10, y, pageWidth - 20, y);
        y += 8;
        
        doc.setFontSize(14);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont('helvetica', 'bold');
        doc.text('Total:', col3X, y);
        doc.text(this.formatPrice(this.amount), pageWidth - 20, y, { align: 'right' });
        
        y += 20;
        
        // ===== PAYMENT STATUS =====
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(20, y, pageWidth - 20, y);
        y += 10;
        
        doc.setFontSize(9);
        doc.setTextColor(textMedium[0], textMedium[1], textMedium[2]);
        doc.setFont('helvetica', 'normal');
        doc.text(`Payment Status: ${this.paymentData?.status || 'Completed'}`, 20, y);
        y += 6;
        doc.text(`Payment Method: ${this.paymentData?.paymentMethod || 'Stripe'}`, 20, y);
        y += 6;
        doc.text(`Transaction ID: ${this.transactionId}`, 20, y);
        
        // ===== FOOTER =====
        const footerY = pageHeight - 25;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);
        
        doc.setFontSize(8);
        doc.setTextColor(textLight[0], textLight[1], textLight[2]);
        doc.setFont('helvetica', 'normal');
        doc.text('Thank you for your purchase!', pageWidth / 2, footerY + 2, { align: 'center' });
        doc.text('For any queries, please contact support@cruserpremium.com', pageWidth / 2, footerY + 8, { align: 'center' });
        
        // ===== SAVE PDF =====
        const filename = `Invoice_${this.transactionId}.pdf`;
        doc.save(filename);
        
        Swal.fire({
            icon: 'success',
            title: 'Invoice Downloaded!',
            text: `Invoice has been saved as ${filename}`,
            timer: 2000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
        
    } catch (error) {
        console.error('Error generating invoice:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to generate invoice. Please try again.',
            confirmButtonText: 'OK'
        });
    }
}

  // Helper method to wrap text
  wrapText(text: string, maxLength: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).length <= maxLength) {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  }
}