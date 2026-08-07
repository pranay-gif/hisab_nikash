'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Search, Plus, Eye, Phone, TrendingUp, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Customer {
  _id: string;
  name: string;
  phone?: string;
  outstandingDue: number;
  totalPurchases: number;
  address?: string;
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => fetchCustomers(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      const res = await api.get('/customers', { params });
      let data: Customer[] = res.data?.customers || res.data || [];
      data = data.sort((a, b) => b.outstandingDue - a.outstandingDue);
      setCustomers(data);
    } catch {
      showToast('Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name.trim()) return;
    try {
      setSubmitting(true);
      await api.post('/customers', newCustomer);
      setIsModalOpen(false);
      setNewCustomer({ name: '', phone: '', address: '', notes: '' });
      showToast('Customer added successfully');
      fetchCustomers();
    } catch {
      showToast('Failed to add customer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  const totalDue = customers.reduce((s, c) => s + (c.outstandingDue || 0), 0);
  const totalPurchases = customers.reduce((s, c) => s + (c.totalPurchases || 0), 0);

  return (
    <div>
      {/* Toast */}
      {toast.show && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : '✓'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title"><Users size={22} /> Customers</h1>
          <p className="page-subtitle">Manage customer directory and due balances</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid-3" style={{ marginBottom: '20px' }}>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--blue)' } as any}>
          <div className="kpi-label">Total Customers</div>
          <div className="kpi-value">{customers.length}</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--red)' } as any}>
          <div className="kpi-label">Total Outstanding Due</div>
          <div className="kpi-value" style={{ color: totalDue > 0 ? 'var(--red)' : 'var(--emerald)' }}>
            {formatCurrency(totalDue)}
          </div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--emerald)' } as any}>
          <div className="kpi-label">Total Purchases</div>
          <div className="kpi-value">{formatCurrency(totalPurchases)}</div>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', maxWidth: '420px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th style={{ textAlign: 'right' }}>Total Purchases</th>
                  <th style={{ textAlign: 'right' }}>Outstanding Due</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                      {search ? `No customers found for "${search}"` : 'No customers yet. Add one!'}
                    </td>
                  </tr>
                ) : (
                  customers.map(c => (
                    <tr key={c._id}>
                      <td>
                        <button
                          onClick={() => router.push(`/customers/${c._id}`)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 600, fontSize: '14px', fontFamily: 'inherit', padding: 0, textAlign: 'left' }}
                        >
                          {c.name}
                        </button>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {c.phone ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={12} /> {c.phone}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {formatCurrency(c.totalPurchases || 0)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{
                          fontWeight: 700,
                          color: c.outstandingDue > 0 ? 'var(--red)' : 'var(--emerald)',
                        }}>
                          {formatCurrency(c.outstandingDue || 0)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn-icon btn-icon-green"
                          onClick={() => router.push(`/customers/${c._id}`)}
                          title="View Profile"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2>Add New Customer</h2>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleAddCustomer}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="label">Name *</label>
                  <input
                    type="text" required className="input"
                    placeholder="Customer name"
                    value={newCustomer.name}
                    onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Phone</label>
                  <input
                    type="tel" className="input"
                    placeholder="Phone number"
                    value={newCustomer.phone}
                    onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Address</label>
                  <input
                    type="text" className="input"
                    placeholder="Address (optional)"
                    value={newCustomer.address}
                    onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Notes</label>
                  <input
                    type="text" className="input"
                    placeholder="Notes (optional)"
                    value={newCustomer.notes}
                    onChange={e => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
