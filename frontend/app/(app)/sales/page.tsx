'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { format } from 'date-fns';

export default function SalesPage() {
  const router = useRouter();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/sales${dateFilter ? `?date=${dateFilter}` : ''}`);
      setSales(data.sales);
    } catch (err: any) {
      if (err.response?.status === 401) router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, router]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const totalSales = sales.reduce((s: number, x: any) => s + x.grandTotal, 0);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Sales</h1>
          <p className="page-subtitle">{sales.length} sales • {formatCurrency(totalSales)} total</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input type="date" className="input" style={{ width: '160px' }} value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          <Link href="/sales/new" className="btn-primary"><Plus size={16} /> Add Sale</Link>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '60px', borderRadius: '10px' }} />)}
        </div>
      ) : sales.length === 0 ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '12px' }}>No sales for this date</div>
          <Link href="/sales/new" className="btn-primary" style={{ display: 'inline-flex' }}><Plus size={16} /> Add Sale</Link>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Grand Total</th>
                  <th>Paid</th>
                  <th>Due</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale: any) => (
                  <tr key={sale._id} style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === sale._id ? null : sale._id)}>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(sale.createdAt || sale.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ fontWeight: 600 }}>{sale.customerName}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {expandedId === sale._id ? (
                        <div>
                          {sale.items?.map((item: any, i: number) => (
                            <div key={i} style={{ marginBottom: '4px' }}>
                              <strong>{item.productName}</strong> × {item.quantity} @ {formatCurrency(item.unitPrice)}
                              {item.discount > 0 && <span style={{ color: '#f59e0b' }}> -{formatCurrency(item.discount)}</span>}
                              <span style={{ color: '#10b981', marginLeft: '6px' }}>= {formatCurrency(item.totalPrice)}</span>
                            </div>
                          ))}
                          {sale.remarks && <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>Note: {sale.remarks}</div>}
                        </div>
                      ) : `${sale.items?.length} item(s)`}
                    </td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(sale.grandTotal)}</td>
                    <td style={{ color: '#10b981' }}>{formatCurrency(sale.paidAmount)}</td>
                    <td style={{ color: sale.dueAmount > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                      {sale.dueAmount > 0 ? formatCurrency(sale.dueAmount) : '—'}
                    </td>
                    <td style={{ fontSize: '12px' }}>{sale.paymentMode}</td>
                    <td>
                      <span className={`badge badge-${sale.paymentStatus?.toLowerCase()}`}>
                        {sale.paymentStatus === 'Paid' && '🟢'}
                        {sale.paymentStatus === 'Partial' && '🟡'}
                        {sale.paymentStatus === 'Pending' && '🔴'}
                        {' '}{sale.paymentStatus}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{expandedId === sale._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
