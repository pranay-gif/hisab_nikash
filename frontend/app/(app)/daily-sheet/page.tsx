'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Lock, Edit3, Power, CheckCircle, AlertTriangle } from 'lucide-react';

interface Ledger {
	_id: string;
	date: string;
	dateString?: string;
	status: 'Open' | 'Closed';
	openingCash: number;
	closingCash: number;
	totalSales: number;
	totalExpenses: number;
	totalDueReceived: number;
	totalDueCollected?: number;
	cashSales?: number;
	upiSales?: number;
	creditSales?: number;
	production?: {
		status: 'ON' | 'OFF';
		remarks?: string;
	};
	notes?: string;
	closedAt?: string;
}

interface Sale {
	_id: string;
	customerId?: { name: string };
	grandTotal: number;
	paidAmount: number;
	dueAmount: number;
	paymentMode: string;
	paymentStatus: string;
	items: Array<{ productName: string; quantity: number; unitPrice: number }>;
}

interface Expense {
	_id: string;
	category: string;
	amount: number;
	paymentMode: string;
	description?: string;
}

interface AttendanceRecord {
	_id: string;
	employeeId?: { name: string; role?: string };
	status: string;
	remarks?: string;
}

interface Stock {
	_id: string;
	itemName: string;
	openingStock: number;
	purchasedQty: number;
	todayUsage: number;
	remainingQty: number;
	unit: string;
}

export default function DailySheetPage() {
	const [ledger, setLedger] = useState<Ledger | null>(null);
	const [sales, setSales] = useState<Sale[]>([]);
	const [expenses, setExpenses] = useState<Expense[]>([]);
	const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
	const [stocks, setStocks] = useState<Stock[]>([]);

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
	const [closing, setClosing] = useState(false);

	// Production state
	const [productionStatus, setProductionStatus] = useState<'ON' | 'OFF'>('ON');
	const [productionRemarks, setProductionRemarks] = useState('');
	const [savingProduction, setSavingProduction] = useState(false);

	// Notes state
	const [notes, setNotes] = useState('');
	const [savingNotes, setSavingNotes] = useState(false);

	useEffect(() => {
		fetchToday();
	}, []);

	const fetchToday = async () => {
		try {
			setLoading(true);
			setError('');
			const res = await api.get('/daily-ledger/today');
			const data = res.data;

			setLedger(data.ledger);
			setSales(data.sales || []);
			setExpenses(data.expenses || []);
			setAttendance(data.attendance || []);
			setStocks(data.stocks || []);

			setProductionStatus(data.ledger?.production?.status || 'ON');
			setProductionRemarks(data.ledger?.production?.remarks || '');
			setNotes(data.ledger?.notes || '');
		} catch (err: any) {
			setError(err.response?.data?.message || "Failed to load today's daily sheet.");
		} finally {
			setLoading(false);
		}
	};

	// Calculations
	const calculatedCashSales = sales
		.filter((s) => s.paymentMode === 'Cash')
		.reduce((sum, s) => sum + s.paidAmount, 0);
	const calculatedUpiSales = sales
		.filter((s) => s.paymentMode === 'UPI')
		.reduce((sum, s) => sum + s.paidAmount, 0);
	const calculatedCreditSales = sales.reduce((sum, s) => sum + s.dueAmount, 0);
	const calculatedTotalSales = sales.reduce((sum, s) => sum + s.grandTotal, 0);
	const calculatedTotalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
	const calculatedDueReceived = ledger?.totalDueCollected || 0;

	const isClosed = ledger?.status === 'Closed';
	const currentClosingCash = isClosed
		? ledger?.closingCash || 0
		: (ledger?.openingCash || 0) +
			calculatedCashSales +
			calculatedUpiSales +
			calculatedDueReceived -
			calculatedTotalExpenses;

	const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
		setToast({ show: true, msg, type });
		setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
	};

	const handleSaveProduction = async () => {
		if (!ledger) return;
		if (productionStatus === 'OFF' && !productionRemarks.trim()) {
			showToast('Remarks are required when Production is OFF.', 'error');
			return;
		}
		try {
			setSavingProduction(true);
			await api.patch(`/daily-ledger/${ledger._id}/production`, {
				status: productionStatus,
				remarks: productionRemarks,
			});
			setLedger((prev) =>
				prev
					? {
							...prev,
							production: { status: productionStatus, remarks: productionRemarks },
						}
					: null,
			);
			showToast('Production status saved.');
		} catch (err: any) {
			showToast(err.response?.data?.message || 'Failed to save production status.', 'error');
		} finally {
			setSavingProduction(false);
		}
	};

	const handleSaveNotes = async () => {
		if (!ledger) return;
		try {
			setSavingNotes(true);
			await api.patch(`/daily-ledger/${ledger._id}/notes`, { notes });
			setLedger((prev) => (prev ? { ...prev, notes } : null));
			showToast('Notes saved.');
		} catch (err: any) {
			showToast(err.response?.data?.message || 'Failed to save notes.', 'error');
		} finally {
			setSavingNotes(false);
		}
	};

	const handleCloseDay = async () => {
		if (!ledger) return;
		if (!window.confirm('Are you sure you want to close today? This cannot be undone.')) return;
		try {
			setClosing(true);
			await api.patch(`/daily-ledger/${ledger._id}/close`);
			showToast('Day closed successfully.');
			fetchToday();
		} catch (err: any) {
			showToast(err.response?.data?.message || 'Failed to close day.', 'error');
			setClosing(false);
		}
	};

	return (
		<div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
			{/* Toast */}
			{toast.show && (
				<div
					style={{
						position: 'fixed',
						top: '16px',
						right: '16px',
						zIndex: 9999,
						padding: '12px 20px',
						borderRadius: '10px',
						fontWeight: 600,
						fontSize: '14px',
						background:
							toast.type === 'error'
								? 'rgba(239,68,68,0.15)'
								: 'rgba(16,185,129,0.15)',
						border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
						color: toast.type === 'error' ? '#ef4444' : '#10b981',
						boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
					}}
				>
					{toast.type === 'error' ? '⚠ ' : '✓ '}
					{toast.msg}
				</div>
			)}

			{/* Page Header */}
			<div className='page-header' style={{ marginBottom: '24px' }}>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						width: '100%',
					}}
				>
					<div>
						<h1 className='page-title'>Daily Sheet</h1>
						<p className='page-subtitle'>A clear picture of today's business</p>
					</div>

					{/* Close Day Button moved to top */}
					{!loading && !error && ledger && !isClosed && (
						<button
							onClick={handleCloseDay}
							disabled={closing}
							style={{
								padding: '12px 24px',
								background: closing ? '#555' : '#ef4444',
								color: 'white',
								border: 'none',
								borderRadius: '8px',
								fontWeight: 700,
								fontSize: '14px',
								cursor: closing ? 'not-allowed' : 'pointer',
								fontFamily: 'inherit',
								transition: 'background 0.2s',
								display: 'flex',
								alignItems: 'center',
								gap: '8px',
								boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
							}}
						>
							<Lock size={16} />
							{closing ? 'Closing...' : 'CLOSE DAY'}
						</button>
					)}
				</div>
			</div>

			{loading && (
				<div
					className='card'
					style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}
				>
					<div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
					Loading today's sheet...
				</div>
			)}

			{!loading && error && (
				<div className='card' style={{ padding: '48px', textAlign: 'center' }}>
					<div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
					<p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>{error}</p>
					<button className='btn-primary' onClick={fetchToday}>
						Retry
					</button>
				</div>
			)}

			{!loading && !error && ledger && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
					{/* Closed banner */}
					{isClosed && (
						<div
							style={{
								padding: '14px 20px',
								background: 'rgba(239,68,68,0.08)',
								border: '1px solid rgba(239,68,68,0.25)',
								borderRadius: '10px',
								color: '#ef4444',
								display: 'flex',
								alignItems: 'center',
								gap: '10px',
								fontWeight: 600,
								fontSize: '14px',
							}}
						>
							<Lock size={18} />
							This day is <strong>CLOSED</strong>
							{ledger.closedAt && (
								<span
									style={{
										fontWeight: 400,
										color: 'var(--text-secondary)',
										marginLeft: '4px',
									}}
								>
									— Closed at{' '}
									{new Date(ledger.closedAt).toLocaleTimeString('en-IN', {
										hour: '2-digit',
										minute: '2-digit',
									})}
								</span>
							)}
						</div>
					)}

					{/* Header Card (Date & Opening/Closing Cash) */}
					<div
						className='card'
						style={{
							padding: '20px 24px',
							borderLeft: `6px solid ${isClosed ? '#ef4444' : '#10b981'}`,
						}}
					>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								flexWrap: 'wrap',
								gap: '12px',
							}}
						>
							<div>
								<div
									style={{
										fontSize: '13px',
										color: 'var(--text-muted)',
										marginBottom: '4px',
									}}
								>
									Date
								</div>
								<div
									style={{
										fontSize: '20px',
										fontWeight: 700,
										color: 'var(--text-primary)',
									}}
								>
									{formatDate(ledger.date)}
								</div>
							</div>
							<div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
								<div style={{ textAlign: 'right' }}>
									<div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
										Opening Cash
									</div>
									<div
										style={{
											fontSize: '18px',
											fontWeight: 700,
											color: 'var(--text-primary)',
										}}
									>
										{formatCurrency(ledger.openingCash)}
									</div>
								</div>
								<div style={{ textAlign: 'right' }}>
									<div
										style={{
											fontSize: '12px',
											color: 'var(--accent)',
											fontWeight: 600,
										}}
									>
										Closing Cash
									</div>
									<div
										style={{
											fontSize: '24px',
											fontWeight: 800,
											color: 'var(--accent)',
										}}
									>
										{formatCurrency(currentClosingCash)}
									</div>
								</div>
								<span
									style={{
										padding: '6px 16px',
										borderRadius: '100px',
										fontSize: '13px',
										fontWeight: 700,
										letterSpacing: '0.04em',
										background: isClosed
											? 'rgba(239,68,68,0.12)'
											: 'rgba(16,185,129,0.12)',
										color: isClosed ? '#ef4444' : '#10b981',
										border: `1px solid ${isClosed ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
									}}
								>
									{isClosed ? '🔒 CLOSED' : '🟢 OPEN'}
								</span>
							</div>
						</div>
					</div>

					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
							gap: '24px',
						}}
					>
						{/* 1. SALES SUMMARY */}
						<div className='diary-section' style={{ height: '100%' }}>
							<div
								className='diary-section-header'
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
								}}
							>
								<h2 className='diary-section-title'>🛍️ Today's Sales</h2>
								{!isClosed && (
									<Link href='/sales/new' style={{ textDecoration: 'none' }}>
										<button
											className='btn-secondary'
											style={{ padding: '4px 12px', fontSize: '13px' }}
										>
											+ Add
										</button>
									</Link>
								)}
							</div>
							<div className='diary-section-body' style={{ padding: 0 }}>
								{/* Financial Summary Table */}
								<div
									style={{
										background: 'var(--bg-elevated)',
										padding: '16px 20px',
										borderBottom: '1px solid var(--border-subtle)',
									}}
								>
									<div
										style={{
											display: 'flex',
											justifyContent: 'space-between',
											marginBottom: '8px',
										}}
									>
										<span
											style={{
												color: 'var(--text-secondary)',
												fontWeight: 500,
											}}
										>
											Total Sales
										</span>
										<span
											style={{
												color: 'var(--accent)',
												fontWeight: 700,
												fontSize: '16px',
											}}
										>
											{formatCurrency(calculatedTotalSales)}
										</span>
									</div>
									<div
										style={{
											display: 'flex',
											justifyContent: 'space-between',
											fontSize: '13px',
											color: 'var(--text-muted)',
										}}
									>
										<span>Cash: {formatCurrency(calculatedCashSales)}</span>
										<span>UPI: {formatCurrency(calculatedUpiSales)}</span>
										<span style={{ color: '#f59e0b' }}>
											Due: {formatCurrency(calculatedCreditSales)}
										</span>
									</div>
								</div>

								{/* Sale List */}
								<div style={{ maxHeight: '250px', overflowY: 'auto' }}>
									{sales.length === 0 ? (
										<div
											style={{
												padding: '24px',
												textAlign: 'center',
												color: 'var(--text-muted)',
												fontSize: '14px',
											}}
										>
											No sales recorded today.
										</div>
									) : (
										<table
											style={{
												width: '100%',
												borderCollapse: 'collapse',
												fontSize: '14px',
											}}
										>
											<tbody>
												{sales.map((s) => (
													<tr
														key={s._id}
														style={{
															borderBottom:
																'1px solid var(--border-subtle)',
														}}
													>
														<td
															style={{
																padding: '12px 20px',
																color: 'var(--text-primary)',
																fontWeight: 500,
															}}
														>
															<div style={{ marginBottom: '4px' }}>
																{s.customerId?.name ||
																	'Walk-in Customer'}
															</div>
															<div
																style={{
																	fontSize: '12px',
																	color: 'var(--text-secondary)',
																	fontWeight: 400,
																}}
															>
																{s.items &&
																	s.items
																		.map(
																			(i) =>
																				`${i.productName} (${i.quantity} x ${formatCurrency(i.unitPrice)})`,
																		)
																		.join(', ')}
															</div>
														</td>
														<td
															style={{
																padding: '12px 20px',
																color: 'var(--text-secondary)',
															}}
														>
															<span
																style={{
																	padding: '2px 8px',
																	borderRadius: '4px',
																	fontSize: '12px',
																	background:
																		s.paymentStatus === 'Paid'
																			? 'rgba(16,185,129,0.1)'
																			: 'rgba(245,158,11,0.1)',
																	color:
																		s.paymentStatus === 'Paid'
																			? '#10b981'
																			: '#f59e0b',
																}}
															>
																{s.paymentStatus}
															</span>
														</td>
														<td
															style={{
																padding: '12px 20px',
																textAlign: 'right',
																fontWeight: 600,
																color: 'var(--text-primary)',
															}}
														>
															{formatCurrency(s.paidAmount)}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									)}
								</div>
							</div>
						</div>

						{/* 2. EXPENSES SUMMARY */}
						<div className='diary-section' style={{ height: '100%' }}>
							<div
								className='diary-section-header'
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
								}}
							>
								<h2 className='diary-section-title'>💸 Today's Expenses</h2>
								{!isClosed && (
									<Link href='/expenses' style={{ textDecoration: 'none' }}>
										<button
											className='btn-secondary'
											style={{ padding: '4px 12px', fontSize: '13px' }}
										>
											+ Add
										</button>
									</Link>
								)}
							</div>
							<div className='diary-section-body' style={{ padding: 0 }}>
								{/* Financial Summary Table */}
								<div
									style={{
										background: 'var(--bg-elevated)',
										padding: '16px 20px',
										borderBottom: '1px solid var(--border-subtle)',
									}}
								>
									<div
										style={{ display: 'flex', justifyContent: 'space-between' }}
									>
										<span
											style={{
												color: 'var(--text-secondary)',
												fontWeight: 500,
											}}
										>
											Total Expenses
										</span>
										<span
											style={{
												color: '#ef4444',
												fontWeight: 700,
												fontSize: '16px',
											}}
										>
											{formatCurrency(calculatedTotalExpenses)}
										</span>
									</div>
								</div>

								{/* Expense List */}
								<div style={{ maxHeight: '250px', overflowY: 'auto' }}>
									{expenses.length === 0 ? (
										<div
											style={{
												padding: '24px',
												textAlign: 'center',
												color: 'var(--text-muted)',
												fontSize: '14px',
											}}
										>
											No expenses recorded today.
										</div>
									) : (
										<table
											style={{
												width: '100%',
												borderCollapse: 'collapse',
												fontSize: '14px',
											}}
										>
											<tbody>
												{expenses.map((e) => (
													<tr
														key={e._id}
														style={{
															borderBottom:
																'1px solid var(--border-subtle)',
														}}
													>
														<td
															style={{
																padding: '12px 20px',
																color: 'var(--text-primary)',
																fontWeight: 500,
															}}
														>
															{e.category}
															{e.description && (
																<div
																	style={{
																		fontSize: '12px',
																		color: 'var(--text-muted)',
																		fontWeight: 400,
																	}}
																>
																	{e.description}
																</div>
															)}
														</td>
														<td
															style={{
																padding: '12px 20px',
																color: 'var(--text-secondary)',
																fontSize: '12px',
															}}
														>
															{e.paymentMode}
														</td>
														<td
															style={{
																padding: '12px 20px',
																textAlign: 'right',
																fontWeight: 600,
																color: '#ef4444',
															}}
														>
															{formatCurrency(e.amount)}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									)}
								</div>
							</div>
						</div>

						{/* 3. ATTENDANCE SUMMARY */}
						<div className='diary-section' style={{ height: '100%' }}>
							<div
								className='diary-section-header'
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
								}}
							>
								<h2 className='diary-section-title'>👥 Today's Attendance</h2>
								{!isClosed && (
									<Link href='/attendance' style={{ textDecoration: 'none' }}>
										<button
											className='btn-secondary'
											style={{ padding: '4px 12px', fontSize: '13px' }}
										>
											+ Add
										</button>
									</Link>
								)}
							</div>
							<div className='diary-section-body' style={{ padding: 0 }}>
								{/* Summary Table */}
								<div
									style={{
										background: 'var(--bg-elevated)',
										padding: '16px 20px',
										borderBottom: '1px solid var(--border-subtle)',
									}}
								>
									<div
										style={{
											display: 'flex',
											justifyContent: 'space-between',
											fontSize: '14px',
											fontWeight: 600,
										}}
									>
										<span style={{ color: '#10b981' }}>
											Present:{' '}
											{
												attendance.filter((a) => a.status === 'Present')
													.length
											}
										</span>
										<span style={{ color: '#ef4444' }}>
											Absent:{' '}
											{attendance.filter((a) => a.status === 'Absent').length}
										</span>
										<span style={{ color: '#f59e0b' }}>
											Half Day:{' '}
											{
												attendance.filter((a) => a.status === 'HalfDay')
													.length
											}
										</span>
									</div>
								</div>

								{/* Attendance List */}
								<div style={{ maxHeight: '250px', overflowY: 'auto' }}>
									{attendance.length === 0 ? (
										<div
											style={{
												padding: '24px',
												textAlign: 'center',
												color: 'var(--text-muted)',
												fontSize: '14px',
											}}
										>
											Attendance not marked yet.
										</div>
									) : (
										<table
											style={{
												width: '100%',
												borderCollapse: 'collapse',
												fontSize: '14px',
											}}
										>
											<tbody>
												{attendance.map((a) => (
													<tr
														key={a._id}
														style={{
															borderBottom:
																'1px solid var(--border-subtle)',
														}}
													>
														<td
															style={{
																padding: '12px 20px',
																color: 'var(--text-primary)',
																fontWeight: 500,
															}}
														>
															{a.employeeId?.name || 'Unknown'}
															<div
																style={{
																	fontSize: '12px',
																	color: 'var(--text-muted)',
																	fontWeight: 400,
																}}
															>
																{a.employeeId?.role || ''}
															</div>
														</td>
														<td
															style={{
																padding: '12px 20px',
																textAlign: 'right',
															}}
														>
															<span
																style={{
																	padding: '4px 10px',
																	borderRadius: '100px',
																	fontSize: '12px',
																	fontWeight: 600,
																	background:
																		a.status === 'Present'
																			? 'rgba(16,185,129,0.1)'
																			: a.status === 'Absent'
																				? 'rgba(239,68,68,0.1)'
																				: 'rgba(245,158,11,0.1)',
																	color:
																		a.status === 'Present'
																			? '#10b981'
																			: a.status === 'Absent'
																				? '#ef4444'
																				: '#f59e0b',
																}}
															>
																{a.status}
															</span>
															{a.remarks && (
																<div
																	style={{
																		fontSize: '11px',
																		color: 'var(--text-muted)',
																		marginTop: '4px',
																	}}
																>
																	{a.remarks}
																</div>
															)}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									)}
								</div>
							</div>
						</div>

						{/* 4. STOCK SUMMARY */}
						<div className='diary-section' style={{ height: '100%' }}>
							<div
								className='diary-section-header'
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
								}}
							>
								<h2 className='diary-section-title'>📦 Today's Stocks</h2>
								{!isClosed && (
									<Link href='/stock' style={{ textDecoration: 'none' }}>
										<button
											className='btn-secondary'
											style={{ padding: '4px 12px', fontSize: '13px' }}
										>
											+ Add
										</button>
									</Link>
								)}
							</div>
							<div className='diary-section-body' style={{ padding: 0 }}>
								{/* Stock List */}
								<div style={{ maxHeight: '250px', overflowY: 'auto' }}>
									{stocks.length === 0 ? (
										<div
											style={{
												padding: '24px',
												textAlign: 'center',
												color: 'var(--text-muted)',
												fontSize: '14px',
											}}
										>
											No stock data available.
										</div>
									) : (
										<table
											style={{
												width: '100%',
												borderCollapse: 'collapse',
												fontSize: '14px',
											}}
										>
											<thead style={{ background: 'var(--bg-elevated)' }}>
												<tr>
													<th
														style={{
															padding: '12px 20px',
															textAlign: 'left',
															fontWeight: 600,
															color: 'var(--text-secondary)',
															borderBottom:
																'1px solid var(--border-subtle)',
														}}
													>
														Item
													</th>
													<th
														style={{
															padding: '12px 20px',
															textAlign: 'center',
															fontWeight: 600,
															color: 'var(--text-secondary)',
															borderBottom:
																'1px solid var(--border-subtle)',
														}}
													>
														Used
													</th>
													<th
														style={{
															padding: '12px 20px',
															textAlign: 'right',
															fontWeight: 600,
															color: 'var(--text-secondary)',
															borderBottom:
																'1px solid var(--border-subtle)',
														}}
													>
														Remaining
													</th>
												</tr>
											</thead>
											<tbody>
												{stocks.map((s) => (
													<tr
														key={s._id}
														style={{
															borderBottom:
																'1px solid var(--border-subtle)',
														}}
													>
														<td
															style={{
																padding: '12px 20px',
																color: 'var(--text-primary)',
																fontWeight: 600,
															}}
														>
															{s.itemName}
														</td>
														<td
															style={{
																padding: '12px 20px',
																color: '#f59e0b',
																textAlign: 'center',
																fontWeight: 600,
															}}
														>
															{s.todayUsage}{' '}
															<span
																style={{
																	fontSize: '12px',
																	fontWeight: 400,
																}}
															>
																{s.unit}
															</span>
														</td>
														<td
															style={{
																padding: '12px 20px',
																textAlign: 'right',
																fontWeight: 600,
																color:
																	s.remainingQty < 5
																		? '#ef4444'
																		: 'var(--text-primary)',
															}}
														>
															{s.remainingQty}{' '}
															<span
																style={{
																	fontSize: '12px',
																	fontWeight: 400,
																}}
															>
																{s.unit}
															</span>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									)}
								</div>
							</div>
						</div>
					</div>

					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
							gap: '24px',
						}}
					>
						{/* 5. PRODUCTION STATUS */}
						<div className='diary-section' style={{ flex: 1 }}>
							<div className='diary-section-header'>
								<h2 className='diary-section-title'>⚙️ Production Status</h2>
								{ledger.production?.status && (
									<span
										style={{
											padding: '4px 12px',
											borderRadius: '100px',
											fontSize: '12px',
											fontWeight: 700,
											background:
												ledger.production.status === 'ON'
													? 'rgba(16,185,129,0.15)'
													: 'rgba(239,68,68,0.15)',
											color:
												ledger.production.status === 'ON'
													? '#10b981'
													: '#ef4444',
											border: `1px solid ${ledger.production.status === 'ON' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
										}}
									>
										Currently {ledger.production.status}
									</span>
								)}
							</div>
							<div className='diary-section-body'>
								{isClosed ? (
									/* Read-only view when closed */
									<div
										style={{
											display: 'flex',
											flexDirection: 'column',
											gap: '10px',
										}}
									>
										<div
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: '12px',
											}}
										>
											<span
												style={{
													color: 'var(--text-secondary)',
													fontWeight: 500,
													fontSize: '14px',
												}}
											>
												Status:
											</span>
											<span
												style={{
													padding: '4px 16px',
													borderRadius: '6px',
													fontWeight: 700,
													fontSize: '14px',
													background:
														ledger.production?.status === 'OFF'
															? 'rgba(239,68,68,0.12)'
															: 'rgba(16,185,129,0.12)',
													color:
														ledger.production?.status === 'OFF'
															? '#ef4444'
															: '#10b981',
												}}
											>
												PRODUCTION {ledger.production?.status || 'ON'}
											</span>
										</div>
										{ledger.production?.remarks && (
											<div>
												<span
													style={{
														color: 'var(--text-secondary)',
														fontSize: '13px',
														fontWeight: 500,
													}}
												>
													Remarks:
												</span>
												<p
													style={{
														marginTop: '4px',
														color: 'var(--text-primary)',
														fontSize: '14px',
														padding: '10px',
														background: 'var(--bg-elevated)',
														borderRadius: '8px',
													}}
												>
													{ledger.production.remarks}
												</p>
											</div>
										)}
									</div>
								) : (
									/* Editable view */
									<div
										style={{
											display: 'flex',
											flexDirection: 'column',
											gap: '16px',
										}}
									>
										<div style={{ display: 'flex', gap: '12px' }}>
											<button
												type='button'
												onClick={() => setProductionStatus('ON')}
												style={{
													flex: 1,
													padding: '12px',
													border: `2px solid ${productionStatus === 'ON' ? '#10b981' : 'var(--border)'}`,
													borderRadius: '10px',
													background:
														productionStatus === 'ON'
															? 'rgba(16,185,129,0.1)'
															: 'var(--bg-elevated)',
													color:
														productionStatus === 'ON'
															? '#10b981'
															: 'var(--text-muted)',
													fontWeight: 700,
													fontSize: '14px',
													cursor: 'pointer',
													transition: 'all 0.2s',
												}}
											>
												✅ ON
											</button>
											<button
												type='button'
												onClick={() => setProductionStatus('OFF')}
												style={{
													flex: 1,
													padding: '12px',
													border: `2px solid ${productionStatus === 'OFF' ? '#ef4444' : 'var(--border)'}`,
													borderRadius: '10px',
													background:
														productionStatus === 'OFF'
															? 'rgba(239,68,68,0.1)'
															: 'var(--bg-elevated)',
													color:
														productionStatus === 'OFF'
															? '#ef4444'
															: 'var(--text-muted)',
													fontWeight: 700,
													fontSize: '14px',
													cursor: 'pointer',
													transition: 'all 0.2s',
												}}
											>
												🔴 OFF
											</button>
										</div>

										{productionStatus === 'OFF' && (
											<div className='form-group'>
												<label className='label'>
													Remarks{' '}
													<span style={{ color: '#ef4444' }}>*</span>
												</label>
												<textarea
													className='input'
													rows={2}
													placeholder='Why is production off today?'
													value={productionRemarks}
													onChange={(e) =>
														setProductionRemarks(e.target.value)
													}
													style={{ resize: 'vertical' }}
												/>
											</div>
										)}

										<div
											style={{ display: 'flex', justifyContent: 'flex-end' }}
										>
											<button
												className='btn-primary'
												onClick={handleSaveProduction}
												disabled={savingProduction}
												style={{ padding: '8px 16px', fontSize: '13px' }}
											>
												{savingProduction ? 'Saving...' : 'Save Production'}
											</button>
										</div>
									</div>
								)}
							</div>
						</div>

						{/* 6. NOTES SECTION */}
						<div className='diary-section' style={{ flex: 1 }}>
							<div className='diary-section-header'>
								<h2 className='diary-section-title'>📝 Day Notes</h2>
							</div>
							<div
								className='diary-section-body'
								style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
							>
								<textarea
									className='input'
									rows={4}
									placeholder={
										isClosed
											? 'No notes.'
											: 'Add notes, observations, or incidents...'
									}
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									disabled={isClosed}
									style={{ resize: 'vertical' }}
								/>
								{!isClosed && (
									<div style={{ display: 'flex', justifyContent: 'flex-end' }}>
										<button
											className='btn-secondary'
											onClick={handleSaveNotes}
											disabled={savingNotes}
											style={{ padding: '8px 16px', fontSize: '13px' }}
										>
											{savingNotes ? 'Saving...' : 'Save Notes'}
										</button>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
