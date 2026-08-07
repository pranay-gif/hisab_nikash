'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, User, Phone, Wallet, Receipt, CreditCard, ChevronRight, AlertCircle, X } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Customer {
  _id: string;
  name: string;
  phone: string;
  outstandingDue: number;
}

interface SaleItem {
  name: string;
  quantity: number;
  price: number;
}

interface Sale {
  _id: string;
  date: string;
  items: SaleItem[];
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMode: string;
  isCredit: boolean;
  status: string;
}

interface DuePayment {
  _id: string;
  date: string;
  amount: number;
  paymentMode: string;
  remainingDue: number;
}

export default function CustomerProfilePage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [duePayments, setDuePayments] = useState<DuePayment[]>([]);
  const [pendingSales, setPendingSales] = useState<Sale[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'history' | 'due' | 'pending'>('history');

  // Receive Payment Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMode: 'Cash',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/customers/${customerId}`);
      const data = res.data;
      setCustomer(data.customer);
      setRecentSales(data.recentSales || []);
      setDuePayments(data.duePayments || []);
      setPendingSales(data.pendingSales || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load customer profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchCustomerData();
    }
  }, [customerId]);

  const handleOpenPaymentModal = (sale: Sale) => {
    setSelectedSale(sale);
    setPaymentForm({
      amount: sale.dueAmount.toString(),
      paymentMode: 'Cash',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsModalOpen(false);
    setSelectedSale(null);
  };

  const handleReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale || !customer) return;

    try {
      setIsSubmitting(true);
      await api.post('/due-payments', {
        customerId: customer._id,
        saleId: selectedSale._id,
        amount: Number(paymentForm.amount),
        paymentMode: paymentForm.paymentMode,
        notes: paymentForm.notes
      });
      
      handleClosePaymentModal();
      fetchCustomerData(); // Refresh data
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatItemsList = (items?: SaleItem[]) => {
    if (!items || items.length === 0) return '-';
    return items.map(item => `${item.name} x${item.quantity}`).join(', ');
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="h-8 w-32 bg-[var(--bg-surface)] animate-pulse rounded"></div>
        <div className="card animate-pulse h-32"></div>
        <div className="h-10 w-full bg-[var(--bg-surface)] animate-pulse rounded"></div>
        <div className="card animate-pulse h-64"></div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="card flex flex-col items-center justify-center p-8 text-center text-[var(--text-muted)]">
          <AlertCircle className="w-12 h-12 mb-4 text-[var(--accent)]" />
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p>{error || 'Customer not found'}</p>
          <button 
            className="btn-secondary mt-4"
            onClick={() => router.back()}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <button 
          onClick={() => router.back()}
          className="flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Customers
        </button>
        <h1 className="page-title">Customer Profile</h1>
      </div>

      {/* Customer Info Card */}
      <div className="card mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-base)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)]">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{customer.name}</h2>
              <div className="flex items-center text-[var(--text-muted)] mt-1">
                <Phone className="w-4 h-4 mr-2" />
                {customer.phone || 'No phone number'}
              </div>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg border flex items-center gap-3 ${
            customer.outstandingDue > 0 
              ? 'bg-red-500/10 border-red-500/20 text-red-500' 
              : 'bg-green-500/10 border-green-500/20 text-green-500'
          }`}>
            <Wallet className="w-8 h-8" />
            <div>
              <div className="text-sm opacity-80 uppercase tracking-wider font-semibold">Outstanding Due</div>
              <div className="text-2xl font-bold">{formatCurrency(customer.outstandingDue)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-[var(--border)] mb-6 no-scrollbar">
        <button
          className={`px-6 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'history' 
              ? 'border-[var(--accent)] text-[var(--accent)]' 
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          onClick={() => setActiveTab('history')}
        >
          Purchase History
        </button>
        <button
          className={`px-6 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'pending' 
              ? 'border-[var(--accent)] text-[var(--accent)]' 
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Dues ({pendingSales.length})
        </button>
        <button
          className={`px-6 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'due' 
              ? 'border-[var(--accent)] text-[var(--accent)]' 
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          onClick={() => setActiveTab('due')}
        >
          Payment History
        </button>
      </div>

      {/* Tab Content */}
      <div className="card">
        {activeTab === 'history' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Receipt className="w-5 h-5 mr-2 text-[var(--text-secondary)]" />
                Recent Purchases
              </h3>
            </div>
            
            {recentSales.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-muted)]">
                No purchase history found.
              </div>
            ) : (
              <div className="table-container">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="p-3 border-b border-[var(--border)] font-medium text-[var(--text-secondary)]">Date</th>
                      <th className="p-3 border-b border-[var(--border)] font-medium text-[var(--text-secondary)]">Items</th>
                      <th className="p-3 border-b border-[var(--border)] font-medium text-[var(--text-secondary)]">Total</th>
                      <th className="p-3 border-b border-[var(--border)] font-medium text-[var(--text-secondary)]">Paid</th>
                      <th className="p-3 border-b border-[var(--border)] font-medium text-[var(--text-secondary)]">Due</th>
                      <th className="p-3 border-b border-[var(--border)] font-medium text-[var(--text-secondary)]">Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.map((sale) => (
                      <tr key={sale._id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="p-3 whitespace-nowrap">{formatDate(sale.date)}</td>
                        <td className="p-3 text-sm text-[var(--text-secondary)]">
                          {formatItemsList(sale.items)}
                        </td>
                        <td className="p-3 font-medium">{formatCurrency(sale.totalAmount)}</td>
                        <td className="p-3 text-green-500">{formatCurrency(sale.paidAmount)}</td>
                        <td className={`p-3 font-medium ${sale.dueAmount > 0 ? 'text-red-500' : ''}`}>
                          {formatCurrency(sale.dueAmount)}
                        </td>
                        <td className="p-3">
                          <span className="badge bg-[var(--bg-base)] border border-[var(--border)]">
                            {sale.paymentMode || (sale.isCredit ? 'Credit' : '-')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'pending' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-[var(--text-secondary)]" />
                Pending Dues
              </h3>
            </div>
            
            {pendingSales.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-muted)]">
                No pending dues found.
              </div>
            ) : (
              <div className="table-container">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="p-3 border-b border-[var(--border)] font-medium text-[var(--text-secondary)]">Date</th>
                      <th className="p-3 border-b border-[var(--border)] font-medium text-[var(--text-secondary)]">Items</th>
                      <th className="p-3 border-b border-[var(--border)] font-medium text-[var(--text-secondary)]">Total Bill</th>
                      <th className="p-3 border-b border-[var(--border)] font-medium text-[var(--text-secondary)] text-red-500">Pending Due</th>
                      <th className="p-3 border-b border-[var(--border)] font-medium text-[var(--text-secondary)]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingSales.map((sale) => (
                      <tr key={sale._id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="p-3 whitespace-nowrap">{formatDate(sale.date)}</td>
                        <td className="p-3 text-sm text-[var(--text-secondary)]">
                          {formatItemsList(sale.items)}
                        </td>
                        <td className="p-3">{formatCurrency(sale.totalAmount)}</td>
                        <td className="p-3 font-bold text-red-500">{formatCurrency(sale.dueAmount)}</td>
                        <td className="p-3">
                          <button 
                            className="btn-primary text-sm py-1.5 px-3"
                            onClick={() => handleOpenPaymentModal(sale)}
                          >
                            Receive Payment
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'due' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-[var(--text-secondary)]" />
                Payment History
              </h3>
            </div>
            
            {duePayments.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-muted)]">
                No payment history found.
              </div>
            ) : (
              <div className="table-container">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="p-3 border-b border-[var(--border)] font-medium text-[var(--text-secondary)]">Date</th>
                      <th className="p-3 border-b border-[var(--border)] font-medium text-[var(--text-secondary)]">Amount Paid</th>
                      <th className="p-3 border-b border-[var(--border)] font-medium text-[var(--text-secondary)]">Mode</th>
                      <th className="p-3 border-b border-[var(--border)] font-medium text-[var(--text-secondary)]">Remaining Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duePayments.map((payment) => (
                      <tr key={payment._id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="p-3 whitespace-nowrap">{formatDate(payment.date)}</td>
                        <td className="p-3 font-medium text-green-500">{formatCurrency(payment.amount)}</td>
                        <td className="p-3">
                          <span className="badge bg-[var(--bg-base)] border border-[var(--border)]">
                            {payment.paymentMode}
                          </span>
                        </td>
                        <td className="p-3 font-medium">{formatCurrency(payment.remainingDue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Receive Payment Modal */}
      {isModalOpen && selectedSale && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="text-lg font-semibold">Receive Due Payment</h3>
              <button 
                onClick={handleClosePaymentModal}
                className="p-1 hover:bg-[var(--bg-hover)] rounded-md text-[var(--text-secondary)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReceivePayment}>
              <div className="modal-body space-y-4">
                <div className="p-3 bg-[var(--bg-base)] rounded-lg border border-[var(--border)] flex justify-between items-center">
                  <span className="text-[var(--text-secondary)] text-sm">Sale Date</span>
                  <span className="font-medium">{formatDate(selectedSale.date)}</span>
                </div>
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex justify-between items-center text-red-500">
                  <span className="text-sm font-medium">Pending Due</span>
                  <span className="font-bold text-lg">{formatCurrency(selectedSale.dueAmount)}</span>
                </div>

                <div className="form-group">
                  <label className="label">Amount Receiving (₹)</label>
                  <input 
                    type="number"
                    className="input"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                    min="1"
                    max={selectedSale.dueAmount}
                    required
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label className="label">Payment Mode</label>
                  <select 
                    className="select"
                    value={paymentForm.paymentMode}
                    onChange={(e) => setPaymentForm({...paymentForm, paymentMode: e.target.value})}
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Notes (Optional)</label>
                  <input 
                    type="text"
                    className="input"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                    placeholder="Enter any reference notes"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={handleClosePaymentModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={isSubmitting || Number(paymentForm.amount) <= 0 || Number(paymentForm.amount) > selectedSale.dueAmount}
                >
                  {isSubmitting ? 'Saving...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
