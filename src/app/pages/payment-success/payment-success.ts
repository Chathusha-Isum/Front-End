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

  // Watermark image
  private watermarkImage: string = '';
  private watermarkImagePath: string = '';
  
  // Logo image
  private logoImage: string = '';
  private logoImagePath: string = 'img/logopdf.png';

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
    
    // Load images
    this.loadImages();
  }

  /**
   * Load all images (watermark and logo)
   */
  loadImages(): void {
    this.loadWatermarkImage();
    this.loadLogoImage();
  }

  /**
   * Load watermark image and convert to base64
   */
  loadWatermarkImage(): void {
    this.http.get(this.watermarkImagePath, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.watermarkImage = e.target.result;
          console.log('✅ Watermark image loaded successfully');
        };
        reader.onerror = (error) => {
          console.error('❌ Error reading watermark image:', error);
        };
        reader.readAsDataURL(blob);
      },
      error: (error) => {
        console.error('❌ Error loading watermark image:', error);
        // Try alternative method using fetch
        this.loadWatermarkWithFetch();
      }
    });
  }

  /**
   * Alternative method to load watermark using fetch API
   */
  loadWatermarkWithFetch(): void {
    fetch(this.watermarkImagePath)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.watermarkImage = e.target.result;
          console.log('✅ Watermark image loaded successfully (fetch)');
        };
        reader.onerror = (error) => {
          console.error('❌ Error reading watermark image:', error);
        };
        reader.readAsDataURL(blob);
      })
      .catch(error => {
        console.error('❌ Error loading watermark image with fetch:', error);
        this.watermarkImage = '';
      });
  }

  /**
   * Load logo image and convert to base64
   */
  loadLogoImage(): void {
    this.http.get(this.logoImagePath, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.logoImage = e.target.result;
          console.log('✅ Logo image loaded successfully');
        };
        reader.onerror = (error) => {
          console.error('❌ Error reading logo image:', error);
        };
        reader.readAsDataURL(blob);
      },
      error: (error) => {
        console.error('❌ Error loading logo image:', error);
        // Try alternative method using fetch
        this.loadLogoWithFetch();
      }
    });
  }

  /**
   * Alternative method to load logo using fetch API
   */
  loadLogoWithFetch(): void {
    fetch(this.logoImagePath)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.logoImage = e.target.result;
          console.log('✅ Logo image loaded successfully (fetch)');
        };
        reader.onerror = (error) => {
          console.error('❌ Error reading logo image:', error);
        };
        reader.readAsDataURL(blob);
      })
      .catch(error => {
        console.error('❌ Error loading logo image with fetch:', error);
        this.logoImage = '';
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
      
      // ===== ADD WATERMARK =====
      try {
        if (this.watermarkImage) {
          const watermarkWidth = 140;
          const watermarkHeight = 100;
          const x = (pageWidth - watermarkWidth) / 2;
          const y = (pageHeight - watermarkHeight) / 2;
          doc.addImage(this.watermarkImage, 'PNG', x, y, watermarkWidth, watermarkHeight);
        } else {
          // Fallback: Add text watermark
          doc.setFontSize(60);
          doc.setTextColor(200, 200, 200);
          doc.setFont('helvetica', 'bold');
          doc.text('CruserPremium', pageWidth / 2, pageHeight / 2, { 
            align: 'center', 
            angle: -30 
          });
        }
      } catch (watermarkError) {
        console.warn('Could not add watermark image, using text fallback:', watermarkError);
        doc.setFontSize(60);
        doc.setTextColor(200, 200, 200);
        doc.setFont('helvetica', 'bold');
        doc.text('CruserPremium', pageWidth / 2, pageHeight / 2, { 
          align: 'center', 
          angle: -30 
        });
      }
      
      // ===== COLORS =====
      const primaryColor = [99, 102, 241];
      const textDark = [30, 41, 59];
      const textMedium = [71, 85, 105];
      const textLight = [148, 163, 184];
      
      let yPos = 20;
      
      // ===== HEADER WITH LOGO BELOW TITLE =====
      // Draw title
      doc.setFontSize(28);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('CruserPremium', 20, yPos);
      
      // Draw subtitle
      doc.setFontSize(10);
      doc.setTextColor(textLight[0], textLight[1], textLight[2]);
      doc.setFont('helvetica', 'normal');
      doc.text('Auto Marketplace', 20, yPos + 6);
      
      // Add logo below the title (centered)
      if (this.logoImage) {
        try {
          // Logo size - adjust as needed
          const logoWidth = 40;
          const logoHeight = 40;
          
          // Position logo below the title - centered
          const logoX = 15;
          const logoY = yPos + 10;
          
          // Add logo image
          doc.addImage(this.logoImage, 'PNG', logoX, logoY, logoWidth, logoHeight);
          
          // Update yPos to account for logo space
          yPos += 20 + logoHeight;
        } catch (logoError) {
          console.warn('Could not add logo image:', logoError);
          // If logo fails, just add some spacing
          yPos += 15;
        }
      } else {
        // No logo, add some spacing
        yPos += 15;
      }
      
      // Draw INVOICE title on the right (adjust position to align with header)
      doc.setFontSize(24);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', pageWidth - 40, 20 + 4, { align: 'right' });
      
      // ===== INVOICE INFO =====
      doc.setFontSize(9);
      doc.setTextColor(textMedium[0], textMedium[1], textMedium[2]);
      doc.setFont('helvetica', 'normal');
      
      const dateStr = this.createdAt ? new Date(this.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
      const timeStr = this.createdAt ? new Date(this.createdAt).toLocaleTimeString() : new Date().toLocaleTimeString();
      
      doc.text(`Invoice #: ${this.transactionId}`, pageWidth - 40, yPos, { align: 'right' });
      doc.text(`Date: ${dateStr}`, pageWidth - 40, yPos + 6, { align: 'right' });
      doc.text(`Time: ${timeStr}`, pageWidth - 40, yPos + 12, { align: 'right' });
      
      yPos += 20;
      
      // ===== DIVIDER =====
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 10;
      
      // ===== BILL TO =====
      doc.setFontSize(12);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('Bill To:', 20, yPos);
      
      yPos += 8;
      doc.setFontSize(9);
      doc.setTextColor(textMedium[0], textMedium[1], textMedium[2]);
      doc.setFont('helvetica', 'normal');
      
      const firstName = this.userData?.fname || '';
      const lastName = this.userData?.lname || '';
      const fullName = `${firstName} ${lastName}`.trim() || 'Customer';
      
      doc.text(`Name: ${fullName}`, 20, yPos);
      yPos += 6;
      doc.text(`Email: ${this.userData?.email || 'N/A'}`, 20, yPos);
      yPos += 6;
      doc.text(`Contact: ${this.userData?.contact || 'N/A'}`, 20, yPos);
      yPos += 6;
      
      const address = this.userData?.address || 'N/A';
      if (address.length > 40) {
        const addressLines = this.wrapText(address, 40);
        addressLines.forEach((line: string) => {
          doc.text(`Address: ${line}`, 20, yPos);
          yPos += 6;
        });
      } else {
        doc.text(`Address: ${address}`, 20, yPos);
        yPos += 6;
      }
      
      yPos += 10;
      
      // ===== TABLE =====
      const tableTop = yPos;
      const col1X = 20;
      const col2X = 100;
      const col3X = 135;
      const col4X = 175;
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
      
      doc.text(displayName, col1X + 5, tableTop + 17);
      doc.text(qty.toString(), col2X + 5, tableTop + 17);
      doc.text(this.formatPrice(unitPrice), col3X + 2, tableTop + 17, { align: 'right' });
      doc.text(this.formatPrice(totalPrice), col4X + 2, tableTop + 17, { align: 'right' });
      
      yPos = tableTop + 30;
      
      // ===== TOTAL SECTION =====
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(col2X - 10, yPos, pageWidth - 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setTextColor(textMedium[0], textMedium[1], textMedium[2]);
      doc.setFont('helvetica', 'normal');
      doc.text('Subtotal:', col3X, yPos);
      doc.text(this.formatPrice(this.amount), pageWidth - 20, yPos, { align: 'right' });
      yPos += 8;
      
      doc.text('Tax (0%):', col3X, yPos);
      doc.text('LKR 0', pageWidth - 20, yPos, { align: 'right' });
      yPos += 8;
      
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(col2X - 10, yPos, pageWidth - 20, yPos);
      yPos += 8;
      
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('Total:', col3X, yPos);
      doc.text(this.formatPrice(this.amount), pageWidth - 20, yPos, { align: 'right' });
      
      yPos += 20;
      
      // ===== PAYMENT STATUS =====
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 10;
      
      doc.setFontSize(9);
      doc.setTextColor(textMedium[0], textMedium[1], textMedium[2]);
      doc.setFont('helvetica', 'normal');
      doc.text(`Payment Status: ${this.paymentData?.status || 'Completed'}`, 20, yPos);
      yPos += 6;
      doc.text(`Payment Method: ${this.paymentData?.paymentMethod || 'Stripe'}`, 20, yPos);
      yPos += 6;
      doc.text(`Transaction ID: ${this.transactionId}`, 20, yPos);
      
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