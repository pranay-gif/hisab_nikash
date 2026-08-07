'use client';

import { useState, useCallback } from 'react';
import {
	BarChart2,
	Calendar,
	TrendingUp,
	TrendingDown,
	DollarSign,
	Package,
	Users,
	AlertCircle,
	Download,
} from 'lucide-react';
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	LineChart,
	Line,
	PieChart,
	Pie,
	Cell,
	Legend,
} from 'recharts';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { format } from 'date-fns';

const REPORT_TYPES = [
	{ value: 'daily', label: 'Daily Report', icon: Calendar },
	{ value: 'monthly', label: 'Monthly Report', icon: BarChart2 },
	{ value: 'yearly', label: 'Yearly Report', icon: TrendingUp },
	{ value: 'expenses', label: 'Expense Report', icon: TrendingDown },
	{ value: 'dues', label: 'Customer Dues', icon: AlertCircle },
	{ value: 'stock', label: 'Stock Report', icon: Package },
	{ value: 'attendance', label: 'Attendance Report', icon: Users },
	{ value: 'profit', label: 'Profit Report', icon: DollarSign },
];

const EXPENSE_COLORS = [
	'#f97316',
	'#ef4444',
	'#10b981',
	'#3b82f6',
	'#8b5cf6',
	'#f59e0b',
	'#ec4899',
];

const CustomTooltip = ({ active, payload, label }: any) => {
	if (!active || !payload?.length) return null;
	return (
		<div
			style={{
				background: 'var(--bg-elevated)',
				border: '1px solid var(--border)',
				borderRadius: '10px',
				padding: '12px 16px',
				fontSize: '13px',
			}}
		>
			<p style={{ color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
				{label}
			</p>
			{payload.map((p: any) => (
				<p key={p.dataKey} style={{ color: p.color }}>
					{p.name}: {formatCurrency(p.value)}
				</p>
			))}
		</div>
	);
};

export default function ReportsPage() {
	const [reportType, setReportType] = useState('monthly');
	const [loading, setLoading] = useState(false);
	const [reportData, setReportData] = useState<any>(null);

	// Filters
	const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
	const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
	const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
	const [fromDate, setFromDate] = useState(
		format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
	);
	const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));

	const generateReport = useCallback(async () => {
		setLoading(true);
		setReportData(null);
		try {
			let url = `/reports/${reportType}`;
			const params = new URLSearchParams();

			if (reportType === 'daily') params.set('date', selectedDate);
			else if (reportType === 'monthly') {
				params.set('year', String(selectedYear));
				params.set('month', String(selectedMonth));
			} else if (reportType === 'yearly') params.set('year', String(selectedYear));
			else if (reportType === 'profit') {
				params.set('year', String(selectedYear));
				params.set('month', String(selectedMonth));
			} else if (['expenses', 'stock', 'attendance'].includes(reportType)) {
				params.set('from', fromDate);
				params.set('to', toDate);
			}

			const qs = params.toString();
			const { data } = await api.get(`${url}${qs ? '?' + qs : ''}`);
			setReportData(data);
		} catch (err: any) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	}, [reportType, selectedDate, selectedYear, selectedMonth, fromDate, toDate]);

	return (
		<div>
			<div className='page-header'>
				<h1 className='page-title'>Reports</h1>
				<p className='page-subtitle'>Generate business insights and analytics</p>
			</div>

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: '220px 1fr',
					gap: '20px',
					alignItems: 'start',
				}}
			>
				{/* Sidebar */}
				<div className='card' style={{ padding: '12px' }}>
					<div
						style={{
							fontSize: '11px',
							color: 'var(--text-muted)',
							fontWeight: 600,
							textTransform: 'uppercase',
							letterSpacing: '0.08em',
							marginBottom: '8px',
							padding: '4px 8px',
						}}
					>
						Report Types
					</div>
					{REPORT_TYPES.map(({ value, label, icon: Icon }) => (
						<button
							key={value}
							onClick={() => {
								setReportType(value);
								setReportData(null);
							}}
							style={{
								width: '100%',
								display: 'flex',
								alignItems: 'center',
								gap: '8px',
								padding: '10px 12px',
								borderRadius: '8px',
								border: 'none',
								background:
									reportType === value ? 'var(--accent-glow)' : 'transparent',
								color:
									reportType === value
										? 'var(--accent)'
										: 'var(--text-secondary)',
								fontSize: '13px',
								fontWeight: 500,
								cursor: 'pointer',
								fontFamily: 'inherit',
								transition: 'all 0.15s',
								marginBottom: '2px',
								textAlign: 'left',
							}}
						>
							<Icon size={14} />
							{label}
						</button>
					))}
				</div>

				{/* Main area */}
				<div>
					{/* Filters */}
					<div className='card' style={{ padding: '20px', marginBottom: '16px' }}>
						<div
							style={{
								display: 'flex',
								gap: '12px',
								alignItems: 'flex-end',
								flexWrap: 'wrap',
							}}
						>
							{reportType === 'daily' && (
								<div className='form-group'>
									<label className='label'>Date</label>
									<input
										type='date'
										className='input'
										style={{ width: '180px' }}
										value={selectedDate}
										onChange={(e) => setSelectedDate(e.target.value)}
									/>
								</div>
							)}
							{(reportType === 'monthly' ||
								reportType === 'yearly' ||
								reportType === 'profit') && (
								<>
									<div className='form-group'>
										<label className='label'>Year</label>
										<select
											className='select'
											style={{ width: '100px' }}
											value={selectedYear}
											onChange={(e) =>
												setSelectedYear(Number(e.target.value))
											}
										>
											{[2024, 2025, 2026].map((y) => (
												<option key={y} value={y}>
													{y}
												</option>
											))}
										</select>
									</div>
									{(reportType === 'monthly' || reportType === 'profit') && (
										<div className='form-group'>
											<label className='label'>Month</label>
											<select
												className='select'
												style={{ width: '130px' }}
												value={selectedMonth}
												onChange={(e) =>
													setSelectedMonth(Number(e.target.value))
												}
											>
												{[
													'Jan',
													'Feb',
													'Mar',
													'Apr',
													'May',
													'Jun',
													'Jul',
													'Aug',
													'Sep',
													'Oct',
													'Nov',
													'Dec',
												].map((m, i) => (
													<option key={i} value={i + 1}>
														{m}
													</option>
												))}
											</select>
										</div>
									)}
								</>
							)}
							{['expenses', 'stock', 'attendance', 'dues'].includes(reportType) &&
								!['dues'].includes(reportType) && (
									<>
										<div className='form-group'>
											<label className='label'>From</label>
											<input
												type='date'
												className='input'
												style={{ width: '160px' }}
												value={fromDate}
												onChange={(e) => setFromDate(e.target.value)}
											/>
										</div>
										<div className='form-group'>
											<label className='label'>To</label>
											<input
												type='date'
												className='input'
												style={{ width: '160px' }}
												value={toDate}
												onChange={(e) => setToDate(e.target.value)}
											/>
										</div>
									</>
								)}
							<button
								onClick={generateReport}
								className='btn-primary'
								disabled={loading}
							>
								{loading ? 'Generating...' : '📊 Generate Report'}
							</button>
						</div>
					</div>

					{/* Report output */}
					{loading && (
						<div className='card' style={{ padding: '60px', textAlign: 'center' }}>
							<div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
								Generating report...
							</div>
						</div>
					)}

					{!loading && !reportData && (
						<div className='card' style={{ padding: '60px', textAlign: 'center' }}>
							<BarChart2
								size={40}
								style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }}
							/>
							<div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
								Select a report type and click Generate
							</div>
						</div>
					)}

					{/* MONTHLY REPORT */}
					{!loading && reportData && reportType === 'monthly' && (
						<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
							<div
								style={{
									display: 'grid',
									gridTemplateColumns: 'repeat(4, 1fr)',
									gap: '12px',
								}}
							>
								{[
									{
										label: 'Total Sales',
										value: formatCurrency(reportData.totals?.sales ?? 0),
										color: '#10b981',
									},
									{
										label: 'Total Expenses',
										value: formatCurrency(reportData.totals?.expenses ?? 0),
										color: '#ef4444',
									},
									{
										label: 'Net Profit',
										value: formatCurrency(reportData.totals?.profit ?? 0),
										color: '#f97316',
									},
									{
										label: 'Outstanding Due',
										value: formatCurrency(reportData.totals?.due ?? 0),
										color: '#f59e0b',
									},
								].map((kpi) => (
									<div
										key={kpi.label}
										className='card'
										style={{
											padding: '16px',
											borderTop: `3px solid ${kpi.color}`,
										}}
									>
										<div
											style={{
												fontSize: '11px',
												color: 'var(--text-muted)',
												textTransform: 'uppercase',
												letterSpacing: '0.06em',
												marginBottom: '8px',
											}}
										>
											{kpi.label}
										</div>
										<div
											style={{
												fontSize: '22px',
												fontWeight: 700,
												color: kpi.color,
											}}
										>
											{kpi.value}
										</div>
									</div>
								))}
							</div>
							<div className='card' style={{ padding: '20px' }}>
								<h3
									style={{
										fontSize: '14px',
										fontWeight: 600,
										marginBottom: '16px',
									}}
								>
									Daily Sales & Expenses
								</h3>
								<ResponsiveContainer width='100%' height={280}>
									<BarChart
										data={reportData.ledgers?.map((l: any) => ({
											date: l.dateString?.slice(8),
											Sales: l.totalSales,
											Expenses: l.totalExpenses,
										}))}
									>
										<CartesianGrid
											strokeDasharray='3 3'
											stroke='var(--border-subtle)'
										/>
										<XAxis
											dataKey='date'
											stroke='var(--text-muted)'
											fontSize={11}
										/>
										<YAxis
											stroke='var(--text-muted)'
											fontSize={11}
											tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
										/>
										<Tooltip content={<CustomTooltip />} />
										<Bar dataKey='Sales' fill='#10b981' radius={[4, 4, 0, 0]} />
										<Bar
											dataKey='Expenses'
											fill='#ef4444'
											radius={[4, 4, 0, 0]}
										/>
									</BarChart>
								</ResponsiveContainer>
							</div>
						</div>
					)}

					{/* YEARLY REPORT */}
					{!loading && reportData && reportType === 'yearly' && (
						<div className='card' style={{ padding: '20px' }}>
							<h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>
								Monthly Sales Trend {selectedYear}
							</h3>
							<ResponsiveContainer width='100%' height={300}>
								<LineChart
									data={reportData.monthly?.map((m: any) => ({
										month: [
											'',
											'Jan',
											'Feb',
											'Mar',
											'Apr',
											'May',
											'Jun',
											'Jul',
											'Aug',
											'Sep',
											'Oct',
											'Nov',
											'Dec',
										][m._id?.month || 0],
										Sales: m.totalSales,
										Expenses: m.totalExpenses,
									}))}
								>
									<CartesianGrid
										strokeDasharray='3 3'
										stroke='var(--border-subtle)'
									/>
									<XAxis
										dataKey='month'
										stroke='var(--text-muted)'
										fontSize={11}
									/>
									<YAxis
										stroke='var(--text-muted)'
										fontSize={11}
										tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
									/>
									<Tooltip content={<CustomTooltip />} />
									<Line
										type='monotone'
										dataKey='Sales'
										stroke='#10b981'
										strokeWidth={2}
										dot={{ fill: '#10b981', r: 4 }}
									/>
									<Line
										type='monotone'
										dataKey='Expenses'
										stroke='#ef4444'
										strokeWidth={2}
										dot={{ fill: '#ef4444', r: 4 }}
									/>
								</LineChart>
							</ResponsiveContainer>
						</div>
					)}

					{/* EXPENSE REPORT */}
					{!loading && reportData && reportType === 'expenses' && (
						<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
							<div
								style={{
									display: 'grid',
									gridTemplateColumns: '1fr 1fr',
									gap: '16px',
								}}
							>
								<div className='card' style={{ padding: '20px' }}>
									<h3
										style={{
											fontSize: '14px',
											fontWeight: 600,
											marginBottom: '16px',
										}}
									>
										By Category
									</h3>
									<ResponsiveContainer width='100%' height={240}>
										<PieChart>
											<Pie
												data={reportData.byCategory}
												dataKey='total'
												nameKey='_id'
												cx='50%'
												cy='50%'
												outerRadius={90}
												label={({ name, percent }: any) =>
													`${name} ${(percent * 100).toFixed(0)}%`
												}
											>
												{reportData.byCategory?.map((_: any, i: number) => (
													<Cell
														key={i}
														fill={
															EXPENSE_COLORS[
																i % EXPENSE_COLORS.length
															]
														}
													/>
												))}
											</Pie>
											<Tooltip
												formatter={(val: any) => formatCurrency(val)}
											/>
										</PieChart>
									</ResponsiveContainer>
								</div>
								<div className='card' style={{ padding: '20px' }}>
									<h3
										style={{
											fontSize: '14px',
											fontWeight: 600,
											marginBottom: '16px',
										}}
									>
										Category Summary
									</h3>
									{reportData.byCategory?.map((cat: any, i: number) => (
										<div
											key={cat._id}
											style={{
												display: 'flex',
												justifyContent: 'space-between',
												alignItems: 'center',
												padding: '8px 0',
												borderBottom: '1px solid var(--border-subtle)',
											}}
										>
											<div
												style={{
													display: 'flex',
													alignItems: 'center',
													gap: '8px',
												}}
											>
												<div
													style={{
														width: '10px',
														height: '10px',
														borderRadius: '50%',
														background:
															EXPENSE_COLORS[
																i % EXPENSE_COLORS.length
															],
													}}
												/>
												<span style={{ fontSize: '13px' }}>{cat._id}</span>
											</div>
											<div style={{ textAlign: 'right' }}>
												<div style={{ fontWeight: 600, fontSize: '14px' }}>
													{formatCurrency(cat.total)}
												</div>
												<div
													style={{
														fontSize: '11px',
														color: 'var(--text-muted)',
													}}
												>
													{cat.count} entries
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					)}

					{/* DUES REPORT */}
					{!loading && reportData && reportType === 'dues' && (
						<div className='card' style={{ padding: '0', overflow: 'hidden' }}>
							<div
								style={{
									padding: '16px 20px',
									borderBottom: '1px solid var(--border-subtle)',
									display: 'flex',
									justifyContent: 'space-between',
								}}
							>
								<span style={{ fontWeight: 600 }}>Outstanding Dues</span>
								<span style={{ color: '#f59e0b', fontWeight: 700 }}>
									Total: {formatCurrency(reportData.totalOutstanding)}
								</span>
							</div>
							<div
								className='table-container'
								style={{ border: 'none', borderRadius: 0 }}
							>
								<table>
									<thead>
										<tr>
											<th>Customer</th>
											<th>Sale Date</th>
											<th>Grand Total</th>
											<th>Due Amount</th>
											<th>Status</th>
										</tr>
									</thead>
									<tbody>
										{reportData.pendingSales?.map((sale: any) => (
											<tr key={sale._id}>
												<td style={{ fontWeight: 600 }}>
													{sale.customerId?.name ||
														sale.customerName ||
														'—'}
												</td>
												<td
													style={{
														fontSize: '12px',
														color: 'var(--text-secondary)',
													}}
												>
													{formatDate(sale.date)}
												</td>
												<td>{formatCurrency(sale.grandTotal)}</td>
												<td style={{ color: '#f59e0b', fontWeight: 700 }}>
													{formatCurrency(sale.dueAmount)}
												</td>
												<td>
													<span className='badge badge-partial'>
														🟡 {sale.paymentStatus}
													</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* PROFIT REPORT */}
					{!loading && reportData && reportType === 'profit' && (
						<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
							<div
								style={{
									display: 'grid',
									gridTemplateColumns: 'repeat(3, 1fr)',
									gap: '12px',
								}}
							>
								{[
									{
										label: 'Total Sales',
										value: formatCurrency(reportData.totals?.sales ?? 0),
										color: '#10b981',
									},
									{
										label: 'Total Expenses',
										value: formatCurrency(reportData.totals?.expenses ?? 0),
										color: '#ef4444',
									},
									{
										label: 'Net Profit',
										value: formatCurrency(reportData.totals?.profit ?? 0),
										color:
											reportData.totals?.profit >= 0 ? '#f97316' : '#ef4444',
									},
								].map((kpi) => (
									<div
										key={kpi.label}
										className='card'
										style={{
											padding: '20px',
											borderTop: `3px solid ${kpi.color}`,
										}}
									>
										<div
											style={{
												fontSize: '11px',
												color: 'var(--text-muted)',
												textTransform: 'uppercase',
												letterSpacing: '0.06em',
												marginBottom: '8px',
											}}
										>
											{kpi.label}
										</div>
										<div
											style={{
												fontSize: '24px',
												fontWeight: 700,
												color: kpi.color,
											}}
										>
											{kpi.value}
										</div>
									</div>
								))}
							</div>
							<div className='card' style={{ padding: '20px' }}>
								<h3
									style={{
										fontSize: '14px',
										fontWeight: 600,
										marginBottom: '16px',
									}}
								>
									Daily Profit Chart
								</h3>
								<ResponsiveContainer width='100%' height={280}>
									<BarChart
										data={reportData.profitData?.map((d: any) => ({
											date: d.date?.slice(8),
											Profit: d.profit,
											Sales: d.sales,
											Expenses: d.expenses,
										}))}
									>
										<CartesianGrid
											strokeDasharray='3 3'
											stroke='var(--border-subtle)'
										/>
										<XAxis
											dataKey='date'
											stroke='var(--text-muted)'
											fontSize={11}
										/>
										<YAxis
											stroke='var(--text-muted)'
											fontSize={11}
											tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
										/>
										<Tooltip content={<CustomTooltip />} />
										<Bar
											dataKey='Profit'
											fill='#f97316'
											radius={[4, 4, 0, 0]}
										/>
									</BarChart>
								</ResponsiveContainer>
							</div>
						</div>
					)}

					{/* DAILY REPORT */}
					{!loading && reportData && reportType === 'daily' && (
						<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
							<div
								style={{
									display: 'grid',
									gridTemplateColumns: 'repeat(4, 1fr)',
									gap: '12px',
								}}
							>
								{[
									{
										label: 'Opening Cash',
										value: formatCurrency(reportData.ledger?.openingCash ?? 0),
										color: '#3b82f6',
									},
									{
										label: 'Total Sales',
										value: formatCurrency(reportData.ledger?.totalSales ?? 0),
										color: '#10b981',
									},
									{
										label: 'Total Expenses',
										value: formatCurrency(
											reportData.ledger?.totalExpenses ?? 0,
										),
										color: '#ef4444',
									},
									{
										label: 'Closing Cash',
										value: formatCurrency(reportData.ledger?.closingCash ?? 0),
										color: '#f97316',
									},
								].map((kpi) => (
									<div
										key={kpi.label}
										className='card'
										style={{
											padding: '16px',
											borderTop: `3px solid ${kpi.color}`,
										}}
									>
										<div
											style={{
												fontSize: '11px',
												color: 'var(--text-muted)',
												textTransform: 'uppercase',
												letterSpacing: '0.06em',
												marginBottom: '6px',
											}}
										>
											{kpi.label}
										</div>
										<div
											style={{
												fontSize: '20px',
												fontWeight: 700,
												color: kpi.color,
											}}
										>
											{kpi.value}
										</div>
									</div>
								))}
							</div>
							<div className='card' style={{ padding: '0', overflow: 'hidden' }}>
								<div
									style={{
										padding: '14px 20px',
										background: 'var(--bg-elevated)',
										borderBottom: '1px solid var(--border-subtle)',
										fontWeight: 600,
										fontSize: '14px',
									}}
								>
									Sales ({reportData.sales?.length || 0})
								</div>
								<div
									className='table-container'
									style={{ border: 'none', borderRadius: 0 }}
								>
									<table>
										<thead>
											<tr>
												<th>Customer</th>
												<th>Items</th>
												<th>Total</th>
												<th>Paid</th>
												<th>Due</th>
												<th>Status</th>
											</tr>
										</thead>
										<tbody>
											{reportData.sales?.map((s: any) => (
												<tr key={s._id}>
													<td style={{ fontWeight: 600 }}>
														{s.customerName}
													</td>
													<td
														style={{
															fontSize: '12px',
															color: 'var(--text-secondary)',
														}}
													>
														{s.items?.length} item(s)
													</td>
													<td>{formatCurrency(s.grandTotal)}</td>
													<td style={{ color: '#10b981' }}>
														{formatCurrency(s.paidAmount)}
													</td>
													<td
														style={{
															color:
																s.dueAmount > 0
																	? '#f59e0b'
																	: 'var(--text-muted)',
														}}
													>
														{s.dueAmount > 0
															? formatCurrency(s.dueAmount)
															: '—'}
													</td>
													<td>
														<span
															className={`badge badge-${s.paymentStatus?.toLowerCase()}`}
														>
															{s.paymentStatus}
														</span>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					)}

					{/* STOCK REPORT */}
					{!loading && reportData && reportType === 'stock' && (
						<div className='card' style={{ padding: '0', overflow: 'hidden' }}>
							<div
								style={{
									padding: '14px 20px',
									background: 'var(--bg-elevated)',
									borderBottom: '1px solid var(--border-subtle)',
									fontWeight: 600,
								}}
							>
								Stock Entries
							</div>
							<div
								className='table-container'
								style={{ border: 'none', borderRadius: 0 }}
							>
								<table>
									<thead>
										<tr>
											<th>Date</th>
											<th>Item</th>
											<th>Unit</th>
											<th>Purchased</th>
											<th>Remaining</th>
											<th>Remarks</th>
										</tr>
									</thead>
									<tbody>
										{reportData.stocks?.map((s: any) => (
											<tr key={s._id}>
												<td
													style={{
														fontSize: '12px',
														color: 'var(--text-secondary)',
													}}
												>
													{formatDate(s.date)}
												</td>
												<td style={{ fontWeight: 600 }}>{s.itemName}</td>
												<td style={{ fontSize: '12px' }}>{s.unit}</td>
												<td>{s.purchasedQty}</td>
												<td
													style={{
														color:
															s.remainingQty < s.purchasedQty * 0.2
																? '#ef4444'
																: 'var(--text-primary)',
													}}
												>
													{s.remainingQty}{' '}
													{s.remainingQty < s.purchasedQty * 0.2 && '⚠️'}
												</td>
												<td
													style={{
														fontSize: '12px',
														color: 'var(--text-muted)',
													}}
												>
													{s.remarks || '—'}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* ATTENDANCE REPORT */}
					{!loading && reportData && reportType === 'attendance' && (
						<div className='card' style={{ padding: '0', overflow: 'hidden' }}>
							<div
								style={{
									padding: '14px 20px',
									background: 'var(--bg-elevated)',
									borderBottom: '1px solid var(--border-subtle)',
									fontWeight: 600,
								}}
							>
								Attendance Records
							</div>
							<div
								className='table-container'
								style={{ border: 'none', borderRadius: 0 }}
							>
								<table>
									<thead>
										<tr>
											<th>Date</th>
											<th>Employee</th>
											<th>Status</th>
											<th>Remarks</th>
										</tr>
									</thead>
									<tbody>
										{reportData.attendance?.map((a: any) => (
											<tr key={a._id}>
												<td
													style={{
														fontSize: '12px',
														color: 'var(--text-secondary)',
													}}
												>
													{formatDate(a.date)}
												</td>
												<td style={{ fontWeight: 600 }}>
													{a.employeeName || a.employeeId?.name}
												</td>
												<td>
													<span
														className={`badge ${a.status === 'Present' ? 'badge-paid' : a.status === 'Absent' ? 'badge-pending' : 'badge-partial'}`}
													>
														{a.status}
													</span>
												</td>
												<td
													style={{
														fontSize: '12px',
														color: 'var(--text-muted)',
													}}
												>
													{a.remarks || '—'}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
