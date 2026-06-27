import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import Chart from 'chart.js/auto';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('revenueChart') revenueChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ordersChart') ordersChartRef!: ElementRef<HTMLCanvasElement>;

  private revenueChart: Chart | null = null;
  private ordersChart: Chart | null = null;
  private chartsCreated: boolean = false;
  private dataLoaded: boolean = false;
  private initAttempts: number = 0;
  private resizeObserver: ResizeObserver | null = null;

  public apiUrl = 'http://localhost:8080';
  public chartPeriod: string = 'monthly';

  // Dashboard stats
  public totalRevenue: number = 0;
  public totalOrders: number = 0;
  public activeUsers: number = 0;
  public totalProducts: number = 0;
  public totalParts: number = 0;

  // Chart data
  public revenueData: number[] = [];
  public ordersData: { labels: string[], data: number[] } = { labels: ['Cars', 'Parts'], data: [0, 0] };

  // Purchases data
  public allPurchases: any[] = [];
  public recentPurchases: any[] = [];
  public showAllPurchases: boolean = false;
  public isLoading: boolean = true;

  // All data for calculations
  private allUsers: any[] = [];
  private allProducts: any[] = [];
  private allParts: any[] = [];
  private allPayments: any[] = [];

  // Cache for product/part names
  private productCache: Map<string, any> = new Map();
  private partCache: Map<string, any> = new Map();

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    this.setupResizeObserver();
    setTimeout(() => {
      if (!this.chartsCreated && this.dataLoaded) {
        this.createCharts();
      }
    }, 500);
  }

  setupResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.revenueChart) {
          this.revenueChart.resize();
        }
        if (this.ordersChart) {
          this.ordersChart.resize();
        }
      });

      const containers = document.querySelectorAll('.chart-container');
      containers.forEach((container: Element) => {
        this.resizeObserver?.observe(container);
      });
    }
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.chartsCreated = false;
    this.dataLoaded = false;
    this.showAllPurchases = false;
    this.fetchAllData();
  }

  fetchAllData(): void {
    // Fetch users, products, parts, and payments
    forkJoin({
      users: this.http.get(`${this.apiUrl}/user`),
      products: this.http.get(`${this.apiUrl}/product`),
      parts: this.http.get(`${this.apiUrl}/carpart`),
      payments: this.http.get(`${this.apiUrl}/payment/all`)
    }).subscribe({
      next: (results: any) => {
        // Store users
        this.allUsers = results.users.data || [];
        this.activeUsers = this.allUsers.filter((u: any) => u.status === 'active').length;
        console.log(`✅ Loaded ${this.allUsers.length} users`);

        // Store products with caching
        this.allProducts = results.products.data || [];
        this.totalProducts = this.allProducts.length;
        this.allProducts.forEach((p: any) => {
          this.productCache.set(p.id, p);
        });
        console.log(`✅ Loaded ${this.allProducts.length} products`);

        // Store parts with caching
        this.allParts = results.parts.data || [];
        this.totalParts = this.allParts.length;
        this.allParts.forEach((p: any) => {
          this.partCache.set(p.id, p);
        });
        console.log(`✅ Loaded ${this.allParts.length} parts`);

        // Store payments
        this.allPayments = results.payments.data || [];
        console.log(`✅ Loaded ${this.allPayments.length} payments`);

        this.processLoadedData();
      },
      error: (error) => {
        console.warn('Error fetching data:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  processLoadedData(): void {
    this.dataLoaded = true;
    this.isLoading = false;
    this.calculateRevenue();
    this.generateAllPurchases();
    this.generateOrdersData();
    this.cdr.detectChanges();

    setTimeout(() => {
      if (!this.chartsCreated) {
        this.createCharts();
      }
    }, 300);
  }

  calculateRevenue(): void {
    let total = 0;
    let orderCount = 0;

    // Filter only completed payments
    const completedPayments = this.allPayments.filter((p: any) => p.status === 'completed');

    completedPayments.forEach((payment: any) => {
      total += parseFloat(payment.amount) || 0;
      orderCount++;
    });

    this.totalRevenue = total;
    this.totalOrders = orderCount;
    console.log(`✅ Total Revenue: LKR ${this.totalRevenue.toLocaleString()} from ${this.totalOrders} orders`);
    this.cdr.detectChanges();
  }

  generateAllPurchases(): void {
    const purchases: any[] = [];

    // Filter only completed payments
    const completedPayments = this.allPayments.filter((p: any) => p.status === 'completed');

    completedPayments.forEach((payment: any, index: number) => {
      // Find user details
      const user = this.allUsers.find((u: any) => u.id === payment.user_id);
      
      let itemDetails: any = {};
      let type = payment.payment_type === 'car' ? 'Car' : 'Part';

      if (payment.payment_type === 'car') {
        // Car purchase
        const product = this.productCache.get(payment.item_id);
        itemDetails = {
          itemName: product?.name || payment.item_name || 'Unknown Car',
          itemBrand: product?.brand || 'Unknown Brand',
          itemCategory: product?.category || 'Uncategorized',
          itemYear: product?.productionyear || 'N/A',
          unitPrice: parseFloat(payment.unit_price) || parseFloat(payment.amount) || 0
        };
      } else if (payment.payment_type === 'part') {
        // Part purchase
        if (payment.cart_items) {
          // Multiple parts from cart
          try {
            const cartItems = JSON.parse(payment.cart_items);
            itemDetails = {
              itemName: `${cartItems.length} parts`,
              itemCar: 'Multiple',
              itemCondition: 'Various',
              unitPrice: parseFloat(payment.unit_price) || parseFloat(payment.amount) / (payment.quantity || 1) || 0,
              isCart: true,
              cartItems: cartItems
            };
          } catch (e) {
            // Single part
            const part = this.partCache.get(payment.item_id);
            itemDetails = {
              itemName: part?.name || payment.item_name || 'Unknown Part',
              itemCar: part?.car || 'Generic',
              itemCondition: part?.condition || 'Unknown',
              unitPrice: parseFloat(payment.unit_price) || parseFloat(payment.amount) / (payment.quantity || 1) || 0
            };
          }
        } else {
          // Single part
          const part = this.partCache.get(payment.item_id);
          itemDetails = {
            itemName: part?.name || payment.item_name || 'Unknown Part',
            itemCar: part?.car || 'Generic',
            itemCondition: part?.condition || 'Unknown',
            unitPrice: parseFloat(payment.unit_price) || parseFloat(payment.amount) / (payment.quantity || 1) || 0
          };
        }
      }

      purchases.push({
        id: `PUR-${String(index + 1).padStart(4, '0')}`,
        transactionId: payment.transaction_id,
        userId: payment.user_id,
        customer: user ? `${user.fname || ''} ${user.lname || ''}`.trim() : 'Unknown User',
        email: user?.email || 'N/A',
        contact: user?.contact || 'N/A',
        address: user?.address || 'N/A',
        type: type,
        itemName: itemDetails.itemName,
        itemBrand: itemDetails.itemBrand,
        itemCategory: itemDetails.itemCategory,
        itemYear: itemDetails.itemYear,
        itemCar: itemDetails.itemCar,
        itemCondition: itemDetails.itemCondition,
        quantity: payment.quantity || 1,
        unitPrice: itemDetails.unitPrice,
        total: parseFloat(payment.amount) || 0,
        date: new Date(payment.created_at),
        paymentMethod: payment.payment_method,
        isTest: payment.is_test === 1
      });
    });

    // Sort by date (newest first)
    this.allPurchases = purchases.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Set recent purchases to first 10
    this.recentPurchases = this.allPurchases.slice(0, 10);

    console.log(`✅ Generated ${this.allPurchases.length} total purchases`);
    this.cdr.detectChanges();
  }

  toggleViewAllPurchases(): void {
    this.showAllPurchases = !this.showAllPurchases;
    this.cdr.detectChanges();
  }

  generateOrdersData(): void {
    const completedPayments = this.allPayments.filter((p: any) => p.status === 'completed');
    const carCount = completedPayments.filter((p: any) => p.payment_type === 'car').length;
    const partCount = completedPayments.filter((p: any) => p.payment_type === 'part').length;

    this.ordersData = {
      labels: ['Cars', 'Parts'],
      data: [carCount, partCount]
    };

    console.log(`✅ Orders Distribution: ${carCount} Cars, ${partCount} Parts`);
    this.cdr.detectChanges();
  }

  createCharts(): void {
    if (this.chartsCreated) {
      return;
    }

    if (!this.revenueChartRef || !this.ordersChartRef) {
      this.initAttempts++;
      if (this.initAttempts < 5) {
        setTimeout(() => this.createCharts(), 200);
      }
      return;
    }

    try {
      this.createRevenueChart();
      this.createOrdersChart();
      this.chartsCreated = true;
      this.initAttempts = 0;
      console.log('✅ Charts created successfully');
    } catch (error) {
      console.error('Error creating charts:', error);
    }
  }

  getChartLabels(): string[] {
    switch (this.chartPeriod) {
      case 'weekly':
        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      case 'monthly':
        return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      case 'yearly':
        return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      default:
        return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    }
  }

  getRevenueDataForPeriod(): number[] {
    const hasActualData = this.totalRevenue > 0;
    const baseRevenue = hasActualData ? this.totalRevenue / 30 : 50000;
    const data: number[] = [];

    const length = this.chartPeriod === 'weekly' ? 7 : this.chartPeriod === 'monthly' ? 4 : 12;

    if (hasActualData) {
      for (let i = 0; i < length; i++) {
        const variation = 0.7 + (Math.random() * 0.6);
        const value = Math.round(baseRevenue * variation * (i + 1) / length * 1.5);
        data.push(Math.max(0, value));
      }
    } else {
      for (let i = 0; i < length; i++) {
        const variation = 0.6 + (Math.random() * 0.8);
        const value = Math.round(baseRevenue * variation);
        data.push(Math.max(0, value));
      }
    }

    return data;
  }

  createRevenueChart(): void {
    if (this.revenueChart) {
      this.revenueChart.destroy();
      this.revenueChart = null;
    }

    const canvas = this.revenueChartRef?.nativeElement;
    if (!canvas) {
      console.error('Revenue canvas not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Revenue canvas context not found');
      return;
    }

    const labels = this.getChartLabels();
    this.revenueData = this.getRevenueDataForPeriod();

    this.revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Revenue (LKR)',
          data: this.revenueData,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#4f46e5',
          pointBorderWidth: 2,
          pointRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#94a3b8',
              font: { size: 12 }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#94a3b8',
              callback: (value) => 'LKR ' + value.toLocaleString()
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            }
          },
          x: {
            ticks: {
              color: '#94a3b8'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });

    setTimeout(() => {
      if (this.revenueChart) {
        this.revenueChart.update();
      }
    }, 100);
  }

  createOrdersChart(): void {
    if (this.ordersChart) {
      this.ordersChart.destroy();
      this.ordersChart = null;
    }

    const canvas = this.ordersChartRef?.nativeElement;
    if (!canvas) {
      console.error('Orders canvas not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Orders canvas context not found');
      return;
    }

    const colors = ['#6366f1', '#10b981'];
    const backgroundColors = colors.map(c => c + '40');

    this.ordersChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.ordersData.labels,
        datasets: [{
          data: this.ordersData.data,
          backgroundColor: backgroundColors,
          borderColor: colors,
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              font: { size: 12 },
              padding: 20
            }
          }
        }
      }
    });

    setTimeout(() => {
      if (this.ordersChart) {
        this.ordersChart.update();
      }
    }, 100);
  }

  updateRevenueChart(): void {
    if (!this.revenueChart) {
      this.createRevenueChart();
      return;
    }

    const labels = this.getChartLabels();
    this.revenueData = this.getRevenueDataForPeriod();
    this.revenueChart.data.labels = labels;
    this.revenueChart.data.datasets[0].data = this.revenueData;
    this.revenueChart.update();
  }

  setChartPeriod(period: string): void {
    if (this.chartPeriod === period) return;
    this.chartPeriod = period;
    this.updateRevenueChart();
  }

  refreshData(): void {
    this.chartsCreated = false;
    this.dataLoaded = false;
    this.initAttempts = 0;
    this.showAllPurchases = false;
    this.loadDashboardData();
  }

  getRevenueGrowth(): number {
    if (this.totalRevenue === 0) return 0;
    return Math.round((this.totalRevenue / 1000000) * 10) / 10;
  }

  getOrderGrowth(): number {
    if (this.totalOrders === 0) return 0;
    return Math.round((this.totalOrders / 10) * 10) / 10;
  }

  getUserGrowth(): number {
    if (this.activeUsers === 0) return 0;
    return Math.round((this.activeUsers / 5) * 10) / 10;
  }

  getProductGrowth(): number {
    const total = this.totalProducts + this.totalParts;
    if (total === 0) return 0;
    return Math.round((total / 10) * 10) / 10;
  }

  formatPrice(price: number): string {
    if (!price || price === 0) return 'LKR 0';
    return `LKR ${price.toLocaleString()}`;
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  downloadReport(): void {
    const reportData = {
      period: this.chartPeriod,
      stats: {
        totalRevenue: this.totalRevenue,
        totalOrders: this.totalOrders,
        activeUsers: this.activeUsers,
        totalProducts: this.totalProducts,
        totalParts: this.totalParts
      },
      revenueData: this.revenueData,
      ordersData: this.ordersData,
      recentPurchases: this.recentPurchases,
      allPurchases: this.allPurchases
    };

    this.createFallbackReport(reportData);
  }

  createFallbackReport(data: any): void {
    const reportContent = `
===========================================
  ADMIN DASHBOARD REPORT
===========================================
Generated: ${new Date().toLocaleString()}

===========================================
  SUMMARY STATISTICS
===========================================
Total Revenue:  ${this.formatPrice(data.stats.totalRevenue)}
Total Orders:  ${data.stats.totalOrders}
Active Users:  ${data.stats.activeUsers}
Total Cars:    ${data.stats.totalProducts}
Total Parts:   ${data.stats.totalParts}

===========================================
  REVENUE DATA (${data.period})
===========================================
${data.revenueData.map((d: number, i: number) =>
      `  ${this.getChartLabels()[i] || `Day ${i + 1}`}: ${this.formatPrice(d)}`
    ).join('\n')}

===========================================
  ORDER DISTRIBUTION
===========================================
${data.ordersData.labels.map((label: string, i: number) =>
      `  ${label}: ${data.ordersData.data[i]} orders`
    ).join('\n')}

===========================================
  ALL PURCHASES
===========================================
${data.allPurchases.map((purchase: any) =>
      `  #${purchase.id} | ${purchase.customer} | ${purchase.type} | ${purchase.itemName} | ${this.formatPrice(purchase.total)}`
    ).join('\n')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  getProfilePic(userId: string): string {
    const user = this.allUsers.find((u: any) => u.id === userId);
    if (user) {
      if (user.profile_pic) {
        if (user.profile_pic.startsWith('http')) {
          return user.profile_pic;
        }
        return `${this.apiUrl}/api/images/profiles/${user.profile_pic}`;
      }
      const name = `${user.fname || ''} ${user.lname || ''}`.trim() || 'User';
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=80&background=6366f1&color=fff&bold=true`;
    }
    return `https://ui-avatars.com/api/?name=User&size=80&background=6366f1&color=fff&bold=true`;
  }

  ngOnDestroy(): void {
    if (this.revenueChart) {
      this.revenueChart.destroy();
      this.revenueChart = null;
    }
    if (this.ordersChart) {
      this.ordersChart.destroy();
      this.ordersChart = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }
}