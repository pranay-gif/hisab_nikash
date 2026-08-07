'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, BookOpen, ShoppingCart, Users, Receipt,
  Package, UserCheck, BarChart2, Settings, LogOut,
  ChefHat, Menu, X, DollarSign, Banknote, Moon, Sun,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';

// ─── THEME CONTEXT ───────────────────────────────────────────────────────────
const ThemeContext = createContext<{ theme: string; toggleTheme: () => void }>({
  theme: 'dark',
  toggleTheme: () => {},
});

export function useTheme() { return useContext(ThemeContext); }

// ─── NAV CONFIG ──────────────────────────────────────────────────────────────
const navItems = [
  { href: '/dashboard',      label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/daily-sheet',    label: 'Daily Sheet',    icon: BookOpen },
  { href: '/sales',          label: 'Sales',          icon: ShoppingCart },
  { href: '/due-management', label: 'Due Management', icon: DollarSign },
];

const managementItems = [
  { href: '/customers',  label: 'Customers',  icon: Users },
  { href: '/expenses',   label: 'Expenses',   icon: Receipt },
  { href: '/stock',      label: 'Stock',      icon: Package },
  { href: '/attendance', label: 'Attendance', icon: UserCheck },
  { href: '/employees',  label: 'Employees',  icon: ChefHat },
];

const reportItems = [
  { href: '/reports',  label: 'Reports',  icon: BarChart2 },
  { href: '/salary',   label: 'Salary',   icon: Banknote },
  { href: '/settings', label: 'Settings', icon: Settings },
];

// ─── MAIN LAYOUT ─────────────────────────────────────────────────────────────
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [today] = useState(format(new Date(), 'EEEE, dd MMM yyyy'));

  // Load theme preference
  useEffect(() => {
    const saved = localStorage.getItem('bdlms_theme') as 'dark' | 'light' || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('bdlms_token');
    if (!token) { router.push('/login'); return; }
    const u = localStorage.getItem('bdlms_user');
    if (u) {
      try { setUser(JSON.parse(u)); } catch { }
    }
  }, [router]);

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('bdlms_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const handleLogout = () => {
    localStorage.removeItem('bdlms_token');
    localStorage.removeItem('bdlms_user');
    router.push('/login');
  };

  const NavLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: any }) => {
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'));
    return (
      <Link
        href={href}
        className={`nav-item ${isActive ? 'active' : ''}`}
        title={label}
      >
        <Icon size={16} style={{ flexShrink: 0 }} />
        <span>{label}</span>
      </Link>
    );
  };

  const NavSection = ({ title, items }: { title: string; items: typeof navItems }) => (
    <div style={{ marginBottom: '4px' }}>
      <div className="nav-section-title">{title}</div>
      {items.map((item) => <NavLink key={item.href} {...item} />)}
    </div>
  );

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 49 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ─── SIDEBAR ─────────────────────────────────────────── */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          {/* Logo */}
          <div className="sidebar-logo">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--accent), #fb923c)',
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px',
              }}>🍴</div>
              <div className="sidebar-logo-text">
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  Yummy Eats
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Business Ledger
                </div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="sidebar-nav">
            <NavSection title="Main" items={navItems} />
            <NavSection title="Management" items={managementItems} />
            <NavSection title="Reports" items={reportItems} />
          </nav>

          {/* User info + logout */}
          <div style={{ padding: '12px', borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px',
              background: 'var(--bg-elevated)',
              borderRadius: '10px',
              marginBottom: '8px',
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 700, color: 'white', flexShrink: 0,
              }}>
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name || 'Owner'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Owner</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="nav-item"
              style={{ color: 'var(--red)', width: '100%' }}
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* ─── MAIN CONTENT ─────────────────────────────────────── */}
        <div className="main-content" style={{ flex: 1 }}>
          {/* Topbar */}
          <header className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Hamburger — always visible */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="btn-icon"
                style={{ display: 'flex' }}
                aria-label="Toggle menu"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {today}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Theme toggle */}
              <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              {/* Live indicator */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '5px 12px',
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: '100px',
                fontSize: '12px',
                color: '#10b981',
                fontWeight: 500,
              }}>
                <span className="status-dot active" />
                Live
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="page-content animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}
