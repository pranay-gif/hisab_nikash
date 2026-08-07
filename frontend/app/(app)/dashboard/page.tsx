'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, DollarSign, AlertCircle,
  Users, Package, Plus, ArrowRight, RefreshCw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface DashboardData {
  today: {
    totalSales: number;
    totalExpenses: number;
    totalDue: number;
    closingCash: number;
    openingCash: number;
    presentEmployees: number;
    status: string;
  };
  recentSales: any[];
  topCustomers: any[];
  pendingDues: number;
  weekTrend: any[];
}

const KPICard = ({ label, value, icon: Icon, color, sub }: any) => (
  <div className="kpi-card" style={{ '--kpi-color': color } as any}>
    <div className="kpi-icon" style={{ background: `${color}20` }}>
      <Icon size={18} style={{ color }} />
    </div>
    <div className="kpi-value">{value}</div>
    <div className="kpi-label">{label}</div>
    {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>{sub}</div>}
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '12px 16px', fontSize: '13px',
      }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const { data: res } = await api.get('/dashboard');
      setData(res);
    } catch (err: any) {
      if (err.response?.status === 401) router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const chartData = data?.weekTrend.map((d: any) => ({
    date: d.dateString?.slice(5),
    Sales: d.totalSales,
    Expenses: d.totalExpenses,
  })) || [];

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="skeleton" style={{ height: '32px', width: '200px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ height: '16px', width: '300px' }} />
        </div>
        <div className="grid-kpi" style={{ marginBottom: '24px' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '16px' }} />
          ))}
        </div>
      </div>
    );
  }

  const t = data?.today;

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Today's business overview at a glance</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchDashboard} className="btn-secondary" style={{ padding: '8px 14px' }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <Link href="/sales/new" className="btn-primary">
            <Plus size={16} /> Add Sale
          </Link>
        </div>
      </div>

      {/* Day Status Banner */}
      {t?.status === 'Closed' && (
        <div style={{
          background: 'rgba(107,114,128,0.1)', border: '1px solid rgba(107,114,128,0.2)',
          borderRadius: '12px', padding: '12px 16px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px',
          color: 'var(--text-secondary)',
        }}>
          <AlertCircle size={16} />
          Today's ledger is <strong style={{ color: 'var(--text-primary)' }}>closed</strong>. Go to Daily Sheet to open tomorrow.
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid-kpi" style={{ marginBottom: '24px' }}>
        <KPICard label="Today's Sales" value={formatCurrency(t?.totalSales ?? 0)} icon={TrendingUp} color="#10b981" sub={`Opening: ${formatCurrency(t?.openingCash ?? 0)}`} />
        <KPICard label="Today's Expenses" value={formatCurrency(t?.totalExpenses ?? 0)} icon={TrendingDown} color="#ef4444" />
        <KPICard label="Cash in Hand" value={formatCurrency((t?.openingCash ?? 0) + (t?.totalSales ?? 0) - (t?.totalExpenses ?? 0))} icon={DollarSign} color="#f97316" />
        <KPICard label="Outstanding Due" value={formatCurrency(t?.totalDue ?? 0)} icon={AlertCircle} color="#f59e0b" sub={`${data?.pendingDues ?? 0} pending sales`} />
      </div>

      <div className="grid-2" style={{ gap: '20px', marginBottom: '24px' }}>
        {/* Weekly Trend Chart */}
        <div className="card" style={{ padding: '20px', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600 }}>7-Day Sales Trend</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Last 7 days</span>
          </div>
          {chartData.length === 0 ? (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              No data yet — start adding sales
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Sales" stroke="#10b981" fill="url(#gradSales)" strokeWidth={2} name="Sales" />
                <Area type="monotone" dataKey="Expenses" stroke="#ef4444" fill="url(#gradExp)" strokeWidth={2} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ gap: '20px' }}>
        {/* Recent Sales */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '20px 20px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Recent Sales</h2>
            <Link href="/sales" style={{ fontSize: '12px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {(data?.recentSales?.length ?? 0) === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              No sales yet today.<br />
              <Link href="/sales/new" style={{ color: 'var(--accent)', marginTop: '8px', display: 'inline-block' }}>+ Add first sale</Link>
            </div>
          ) : (
            <div>
              {data?.recentSales.slice(0, 6).map((sale: any, i: number) => (
                <div key={i} style={{
                  padding: '12px 20px',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{sale.customerName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {sale.items?.length} item(s) • {formatDate(sale.date)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(sale.grandTotal)}</div>
                    {sale.dueAmount > 0 && (
                      <div style={{ fontSize: '11px', color: '#f59e0b' }}>Due: {formatCurrency(sale.dueAmount)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Due Customers */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '20px 20px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Outstanding Dues</h2>
            <Link href="/due-management" style={{ fontSize: '12px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
              Manage <ArrowRight size={12} />
            </Link>
          </div>
          {(data?.topCustomers?.length ?? 0) === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              🎉 No outstanding dues!
            </div>
          ) : (
            <div>
              {data?.topCustomers.map((c: any, i: number) => (
                <Link key={i} href={`/customers/${c._id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '12px 20px',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'background 0.1s',
                    cursor: 'pointer',
                  }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'rgba(245,158,11,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontWeight: 700, color: '#f59e0b',
                      }}>
                        {c.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                        {c.phone && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.phone}</div>}
                      </div>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b' }}>
                      {formatCurrency(c.outstandingDue)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
