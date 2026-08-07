import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return `₹${amount?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: Date | string): string {
  console.log('formatDate called with:', date);
  return format(new Date(date), 'dd MMM yyyy');
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), 'dd MMM yyyy, hh:mm a');
}

export function getPaymentStatusColor(status: string): string {
  switch (status) {
    case 'Paid': return 'text-emerald-400';
    case 'Partial': return 'text-amber-400';
    case 'Pending': return 'text-red-400';
    default: return 'text-zinc-400';
  }
}

export function getPaymentStatusBadge(status: string): string {
  switch (status) {
    case 'Paid': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'Partial': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'Pending': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  }
}

export function getAttendanceColor(status: string): string {
  switch (status) {
    case 'Present': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'Absent': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'HalfDay': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    default: return 'bg-zinc-700 text-zinc-400';
  }
}
