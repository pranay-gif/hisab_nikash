'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Trash2, Search, CheckCircle, AlertCircle, X, ChevronDown
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface SaleItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

export default function NewSalePage() {
  const router = useRouter();

  // Ledger
  const [ledger, setLedger] = useState<any>(null);

  // Customer
  const [customerType, setCustomerType] = useState<'walkin' | 'existing' | 'new'>('walkin');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Items
  const [items, setItems] = useState<SaleItem[]>([
    { productName: '', quantity: 1, unitPrice: 0, discount: 0, totalPrice: 0 },
  ]);
  const [productSearches, setProductSearches] = useState<string[]>(['']);
  const [productResults, setProductResults] = useState<any[][]>([[]]);
  const [showProductDropdowns, setShowProductDropdowns] = useState<boolean[]>([false]);
  const [priceHistories, setPriceHistories] = useState<any[]>([null]);

  // Payment
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Mixed'>('Cash');
  const [paidAmount, setPaidAmount] = useState(0);
  const [remarks, setRemarks] = useState('');

  // UI
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const customerRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load today's ledger
  useEffect(() => {
    api.get('/daily-ledger/today').then(({ data }) => {
      setLedger(data.ledger);
      if (data.ledger.status === 'Closed') {
        showToast("Today's day is closed. Cannot add sales.", 'error');
        setTimeout(() => router.push('/daily-sheet'), 2000);
      }
    }).catch(() => router.push('/login'));
  }, [router]);

  // Customer search
  const searchCustomers = useCallback(async (q: string) => {
    if (q.length < 2) { setCustomerResults([]); return; }
    try {
      const { data } = await api.get(`/customers?search=${encodeURIComponent(q)}&limit=8`);
      setCustomerResults(data.customers);
    } catch { }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchCustomers(customerSearch), 300);
    return () => clearTimeout(t);
  }, [customerSearch, searchCustomers]);

  // Product search for a specific item index
  const searchProducts = useCallback(async (q: string, idx: number) => {
    if (q.length < 1) {
      setProductResults((prev) => { const n = [...prev]; n[idx] = []; return n; });
      return;
    }
    try {
      const { data } = await api.get(`/products?search=${encodeURIComponent(q)}&limit=8`);
      setProductResults((prev) => { const n = [...prev]; n[idx] = data.products; return n; });
    } catch { }
  }, []);

  const loadPriceHistory = useCallback(async (productName: string, idx: number) => {
    if (!selectedCustomer || selectedCustomer.isWalkIn || !productName) return;
    try {
      const { data } = await api.get(`/sales/customer/${selectedCustomer._id}/product/${encodeURIComponent(productName)}`);
      setPriceHistories((prev) => { const n = [...prev]; n[idx] = data; return n; });
    } catch { }
  }, [selectedCustomer]);

  // Item helpers
  const recalcItem = (item: SaleItem): SaleItem => ({
    ...item,
    totalPrice: Math.max(0, item.quantity * item.unitPrice - item.discount),
  });

  const updateItem = (idx: number, field: keyof SaleItem, value: any) => {
    setItems((prev) => {
      const n = [...prev];
      const updated = recalcItem({ ...n[idx], [field]: value });
      n[idx] = updated;
      return n;
    });
  };

  const addItem = () => {
    setItems((prev) => [...prev, { productName: '', quantity: 1, unitPrice: 0, discount: 0, totalPrice: 0 }]);
    setProductSearches((prev) => [...prev, '']);
    setProductResults((prev) => [...prev, []]);
    setShowProductDropdowns((prev) => [...prev, false]);
    setPriceHistories((prev) => [...prev, null]);
  };

  const removeItem = (idx: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setProductSearches((prev) => prev.filter((_, i) => i !== idx));
    setProductResults((prev) => prev.filter((_, i) => i !== idx));
    setShowProductDropdowns((prev) => prev.filter((_, i) => i !== idx));
    setPriceHistories((prev) => prev.filter((_, i) => i !== idx));
  };

  const setItemProduct = (idx: number, productName: string, defaultPrice?: number) => {
    setProductSearches((prev) => { const n = [...prev]; n[idx] = productName; return n; });
    setShowProductDropdowns((prev) => { const n = [...prev]; n[idx] = false; return n; });
    setItems((prev) => {
      const n = [...prev];
      const updated = recalcItem({ ...n[idx], productName, unitPrice: defaultPrice || n[idx].unitPrice });
      n[idx] = updated;
      return n;
    });
    loadPriceHistory(productName, idx);
  };

  // Totals
  const grandTotal = items.reduce((s, i) => s + i.totalPrice, 0);
  const dueAmount = Math.max(0, grandTotal - paidAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledger) return showToast('Ledger not found', 'error');
    if (items.some((i) => !i.productName || i.quantity <= 0)) return showToast('Fill all item details', 'error');
    if (customerType === 'existing' && !selectedCustomer) return showToast('Please select a customer', 'error');
    if (customerType === 'new' && !newCustomerName) return showToast('Enter new customer name', 'error');

    setLoading(true);
    try {
      let customerId = '';
      let customerName = 'Walk-in Customer';
      let isWalkIn = customerType === 'walkin';

      if (customerType === 'existing' && selectedCustomer) {
        customerId = selectedCustomer._id;
        customerName = selectedCustomer.name;
      } else if (customerType === 'new') {
        const { data } = await api.post('/customers', { name: newCustomerName, phone: newCustomerPhone });
        customerId = data.customer._id;
        customerName = newCustomerName;
      } else {
        // Walk-in: find or create system walk-in customer
        const { data } = await api.get('/customers?search=Walk-in&limit=1');
        if (data.customers.length > 0 && data.customers[0].isWalkIn) {
          customerId = data.customers[0]._id;
        } else {
          const { data: wc } = await api.post('/customers', { name: 'Walk-in Customer', isWalkIn: true });
          customerId = wc.customer._id;
        }
      }

      await api.post('/sales', {
        customerId,
        customerName,
        isWalkIn,
        items,
        paidAmount,
        paymentMode,
        remarks,
        dailyLedgerId: ledger._id,
      });

      showToast('✅ Sale saved successfully!');
      setTimeout(() => router.push('/daily-sheet'), 1200);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save sale', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <div className="page-header">
        <h1 className="page-title">Add Sale</h1>
        <p className="page-subtitle">Enter sale details manually</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ─── CUSTOMER SECTION ─── */}
        <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
          <div className="section-title" style={{ marginBottom: '16px' }}>Customer</div>

          {/* Type selector */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {([
              { value: 'walkin', label: '👤 Walk-in' },
              { value: 'existing', label: '🔍 Existing Customer' },
              { value: 'new', label: '➕ New Customer' },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setCustomerType(value);
                  setSelectedCustomer(null);
                  setCustomerSearch('');
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${customerType === value ? 'var(--accent)' : 'var(--border)'}`,
                  background: customerType === value ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                  color: customerType === value ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Existing customer search */}
          {customerType === 'existing' && (
            <div style={{ position: 'relative' }} ref={customerRef}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input"
                  style={{ paddingLeft: '36px' }}
                  placeholder="Search customer by name or phone..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                    setSelectedCustomer(null);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                />
              </div>
              {showCustomerDropdown && customerResults.length > 0 && (
                <div className="autocomplete-dropdown">
                  {customerResults.map((c: any) => (
                    <div
                      key={c._id}
                      className="autocomplete-item"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setCustomerSearch(c.name);
                        setShowCustomerDropdown(false);
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                        {c.phone && <span style={{ marginLeft: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>{c.phone}</span>}
                      </div>
                      {c.outstandingDue > 0 && (
                        <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>
                          Due: {formatCurrency(c.outstandingDue)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* Selected customer info */}
              {selectedCustomer && (
                <div style={{
                  marginTop: '12px', padding: '14px',
                  background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.2)',
                  borderRadius: '10px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px' }}>{selectedCustomer.name}</div>
                      {selectedCustomer.phone && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{selectedCustomer.phone}</div>}
                    </div>
                    {selectedCustomer.outstandingDue > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Outstanding Due</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(selectedCustomer.outstandingDue)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* New customer form */}
          {customerType === 'new' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="label">Customer Name *</label>
                <input className="input" placeholder="Full name" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="label">Phone (optional)</label>
                <input className="input" placeholder="10-digit number" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} />
              </div>
            </div>
          )}

          {customerType === 'walkin' && (
            <div style={{ padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Walk-in sale — no customer record will be created.
            </div>
          )}
        </div>

        {/* ─── ITEMS SECTION ─── */}
        <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Items</div>
            <button type="button" onClick={addItem} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }}>
              <Plus size={12} /> Add Item
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {items.map((item, idx) => (
              <div key={idx} style={{
                padding: '16px',
                background: 'var(--bg-elevated)',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>ITEM {idx + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: '4px' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Product search */}
                <div style={{ position: 'relative', marginBottom: '10px' }}>
                  <label className="label">Product Name *</label>
                  <input
                    className="input"
                    placeholder="Type product name or search catalog..."
                    value={productSearches[idx]}
                    onChange={(e) => {
                      const v = e.target.value;
                      setProductSearches((prev) => { const n = [...prev]; n[idx] = v; return n; });
                      setShowProductDropdowns((prev) => { const n = [...prev]; n[idx] = true; return n; });
                      updateItem(idx, 'productName', v);
                      searchProducts(v, idx);
                    }}
                    required
                  />
                  {showProductDropdowns[idx] && productResults[idx]?.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {productResults[idx].map((p: any) => (
                        <div
                          key={p._id}
                          className="autocomplete-item"
                          onClick={() => setItemProduct(idx, p.name, p.defaultPrice)}
                        >
                          <span style={{ fontWeight: 500 }}>{p.name}</span>
                          {p.defaultPrice && <span style={{ color: 'var(--accent)', fontSize: '12px' }}>{formatCurrency(p.defaultPrice)}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Price history */}
                {priceHistories[idx]?.history?.length > 0 && (
                  <div className="price-history-card" style={{ marginBottom: '12px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--accent)', fontSize: '12px' }}>
                      📊 Price History for {selectedCustomer?.name}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      {priceHistories[idx].history.slice(0, 3).map((h: any, hi: number) => (
                        <div key={hi} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{h.date ? new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}</span>
                          {' '}• Qty {h.quantity} @ <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(h.unitPrice)}</strong>
                        </div>
                      ))}
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Avg: <strong style={{ color: 'var(--accent)' }}>{formatCurrency(priceHistories[idx].averagePrice)}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Qty / Price / Discount grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="label">Quantity *</label>
                    <input type="number" min="0.01" step="0.01" className="input" value={item.quantity || ''} onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} required />
                  </div>
                  <div className="form-group">
                    <label className="label">Unit Price (₹) *</label>
                    <input type="number" min="0" step="0.01" className="input" value={item.unitPrice || ''} onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} required />
                  </div>
                  <div className="form-group">
                    <label className="label">Discount (₹)</label>
                    <input type="number" min="0" step="0.01" className="input" value={item.discount || ''} onChange={(e) => updateItem(idx, 'discount', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label className="label">Item Total</label>
                    <div className="input" style={{ background: 'var(--bg-base)', fontWeight: 700, color: '#10b981', cursor: 'default' }}>
                      {formatCurrency(item.totalPrice)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Grand Total */}
          <div style={{
            marginTop: '16px', padding: '14px 16px',
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontWeight: 600, fontSize: '14px' }}>Grand Total</span>
            <span style={{ fontWeight: 800, fontSize: '22px', color: '#10b981' }}>{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        {/* ─── PAYMENT SECTION ─── */}
        <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
          <div className="section-title" style={{ marginBottom: '16px' }}>Payment</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="label">Payment Mode</label>
              <select className="select" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as any)}>
                <option value="Cash">💵 Cash</option>
                <option value="UPI">📱 UPI</option>
                <option value="Mixed">🔀 Mixed (Cash + UPI)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Paid Amount (₹)</label>
              <input
                type="number" min="0" step="0.01" className="input"
                value={paidAmount || ''}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                placeholder="Enter amount paid now"
              />
            </div>
          </div>

          {/* Due summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Total</div>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>{formatCurrency(grandTotal)}</div>
            </div>
            <div style={{ padding: '12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#10b981', marginBottom: '4px' }}>Paid Now</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>{formatCurrency(paidAmount)}</div>
            </div>
            <div style={{
              padding: '12px',
              background: dueAmount > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.05)',
              border: `1px solid ${dueAmount > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.1)'}`,
              borderRadius: '8px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '11px', color: dueAmount > 0 ? '#f59e0b' : '#10b981', marginBottom: '4px' }}>
                {dueAmount > 0 ? 'Due Amount' : 'Fully Paid ✓'}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: dueAmount > 0 ? '#f59e0b' : '#10b981' }}>
                {dueAmount > 0 ? formatCurrency(dueAmount) : '₹0'}
              </div>
            </div>
          </div>

          {dueAmount > 0 && (
            <div style={{
              padding: '10px 14px', background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px',
              fontSize: '13px', color: '#f59e0b', marginBottom: '16px',
            }}>
              ⚠️ A pending due of {formatCurrency(dueAmount)} will be created for this customer.
            </div>
          )}

          <div className="form-group">
            <label className="label">Remarks (optional)</label>
            <input className="input" placeholder="Any notes about this sale..." value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" onClick={() => router.back()} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" style={{ flex: 2, justifyContent: 'center', padding: '14px' }} disabled={loading}>
            {loading ? 'Saving...' : `💾 Save Sale — ${formatCurrency(grandTotal)}`}
          </button>
        </div>
      </form>

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
