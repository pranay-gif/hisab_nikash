'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Pencil, Save, X, Calendar, AlertTriangle } from 'lucide-react';

interface DailyLedger {
	_id: string;
	dateString: string;
	isClosed: boolean;
}

interface Stock {
	_id: string;
	itemName: string;
	unit: string;
	openingStock: number;
	purchasedQty: number;
	todayUsage: number;
	remainingQty: number;
	remarks?: string;
	dailyLedgerId: string;
}

export default function StockPage() {
	const [selectedDate, setSelectedDate] = useState<string>(
		new Date().toISOString().split('T')[0],
	);
	const [ledger, setLedger] = useState<DailyLedger | null>(null);
	const [stock, setStock] = useState<Stock | null>(null);

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [isEditing, setIsEditing] = useState(false);
	const [formData, setFormData] = useState({
		openingStock: 0,
		purchasedQty: 0,
		todayUsage: 0,
		remarks: '',
	});
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		fetchData(selectedDate);
	}, [selectedDate]);

	const fetchData = async (date: string) => {
		setLoading(true);
		setError(null);
		try {
			// 1. Fetch ledger for selected date
			let currentLedger;
			try {
				const ledgerRes = await api.get(`/daily-ledger/date/${date}`);
				currentLedger = ledgerRes.data.ledger || ledgerRes.data;
			} catch (e: any) {
				if (e.response?.status === 404 && date === new Date().toISOString().split('T')[0]) {
					// If no ledger for today, try to get /daily-ledger/today which might create it
					const todayRes = await api.get('/daily-ledger/today');
					currentLedger = todayRes.data.ledger || todayRes.data;
				} else {
					currentLedger = null;
				}
			}

			setLedger(currentLedger);

			if (currentLedger) {
				// 2. Fetch stock for this ledger
				const stockRes = await api.get(`/stocks?ledgerId=${currentLedger._id}`);
				const stocks = stockRes.data.stocks || stockRes.data || [];
				const maidaStock = stocks.find((s: Stock) => s.itemName === 'Maida');

				if (maidaStock) {
					setStock(maidaStock);
					setFormData({
						openingStock: maidaStock.openingStock || 0,
						purchasedQty: maidaStock.purchasedQty || 0,
						todayUsage: maidaStock.todayUsage || 0,
						remarks: maidaStock.remarks || '',
					});
				} else {
					setStock(null);
					// Auto-fetch yesterday's stock if we're creating new
					try {
						const ydayRes = await api.get('/stocks/yesterday/Maida');
						const yesterdayQty = (ydayRes.data.data || ydayRes.data)?.remainingQty || 0;
						setFormData({
							openingStock: yesterdayQty,
							purchasedQty: 0,
							todayUsage: 0,
							remarks: '',
						});
					} catch {
						setFormData({
							openingStock: 0,
							purchasedQty: 0,
							todayUsage: 0,
							remarks: '',
						});
					}
				}
			} else {
				setStock(null);
			}
		} catch (err: any) {
			setError('Error fetching data. ' + (err.response?.data?.message || ''));
		} finally {
			setLoading(false);
		}
	};

	const handleSave = async () => {
		if (!ledger) return;
		try {
			setSubmitting(true);
			const payload = {
				itemName: 'Maida',
				unit: 'Bag',
				openingStock: Number(formData.openingStock),
				purchasedQty: Number(formData.purchasedQty),
				todayUsage: Number(formData.todayUsage),
				remarks: formData.remarks,
				dailyLedgerId: ledger._id,
			};

			if (stock) {
				await api.patch(`/stocks/${stock._id}`, payload);
			} else {
				await api.post('/stocks', payload);
			}

			setIsEditing(false);
			fetchData(selectedDate);
		} catch (err: any) {
			alert(err.response?.data?.message || 'Failed to save stock');
		} finally {
			setSubmitting(false);
		}
	};

	const remainingQty =
		Number(formData.openingStock) + Number(formData.purchasedQty) - Number(formData.todayUsage);

	return (
		<div className='p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6'>
			<header className='page-header flex flex-col md:flex-row md:justify-between md:items-center gap-4'>
				<div>
					<h1
						className='page-title text-2xl font-bold'
						style={{ color: 'var(--text-primary)' }}
					>
						Stock Management
					</h1>
					<p className='page-subtitle text-sm' style={{ color: 'var(--text-secondary)' }}>
						Track Maida inventory for Yummy Eats
					</p>
				</div>

				<div
					className='flex items-center gap-2 bg-surface p-2 rounded-lg border border-subtle'
					style={{
						backgroundColor: 'var(--bg-surface)',
						borderColor: 'var(--border-subtle)',
					}}
				>
					<Calendar size={18} style={{ color: 'var(--text-secondary)' }} />
					<input
						type='date'
						value={selectedDate}
						onChange={(e) => setSelectedDate(e.target.value)}
						max={new Date().toISOString().split('T')[0]}
						className='bg-transparent border-none outline-none text-sm font-medium'
						style={{ color: 'var(--text-primary)' }}
					/>
				</div>
			</header>

			{loading ? (
				<div
					className='p-8 text-center card bg-surface rounded-lg border border-subtle'
					style={{ color: 'var(--text-muted)' }}
				>
					Loading stock data...
				</div>
			) : error ? (
				<div className='p-8 text-center card bg-surface rounded-lg border border-subtle text-red-500'>
					{error}
				</div>
			) : !ledger ? (
				<div
					className='p-8 text-center card bg-surface rounded-lg border border-subtle'
					style={{ color: 'var(--text-muted)' }}
				>
					No ledger found for this date. Please create a daily ledger first.
				</div>
			) : (
				<div
					className='card bg-surface rounded-xl shadow-sm border border-subtle overflow-hidden'
					style={{
						backgroundColor: 'var(--bg-surface)',
						borderColor: 'var(--border-subtle)',
					}}
				>
					<div
						className='p-4 md:p-6 border-b border-subtle flex justify-between items-center'
						style={{ borderColor: 'var(--border-subtle)' }}
					>
						<div>
							<h2
								className='text-xl font-semibold flex items-center gap-2'
								style={{ color: 'var(--text-primary)' }}
							>
								Maida Stock Entry
								{ledger.isClosed && (
									<span className='badge bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded ml-2'>
										Closed
									</span>
								)}
							</h2>
							<p className='text-sm mt-1' style={{ color: 'var(--text-secondary)' }}>
								{formatDate(ledger.dateString)}
							</p>
						</div>

						{!ledger.isClosed &&
							(stock && !isEditing ? (
								<button
									onClick={() => setIsEditing(true)}
									className='btn-secondary flex items-center gap-2 px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-100'
								>
									<Pencil size={16} /> Edit
								</button>
							) : null)}
					</div>

					<div className='p-4 md:p-6 space-y-6'>
						<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
							<div className='form-group flex flex-col gap-1'>
								<label
									className='label text-sm font-medium'
									style={{ color: 'var(--text-secondary)' }}
								>
									Item Name
								</label>
								<div
									className='p-2.5 rounded bg-base border border-subtle text-md font-semibold'
									style={{
										backgroundColor: 'var(--bg-base)',
										borderColor: 'var(--border-subtle)',
										color: 'var(--text-primary)',
									}}
								>
									Maida
								</div>
							</div>

							<div className='form-group flex flex-col gap-1'>
								<label
									className='label text-sm font-medium'
									style={{ color: 'var(--text-secondary)' }}
								>
									Unit
								</label>
								<div
									className='p-2.5 rounded bg-base border border-subtle text-md'
									style={{
										backgroundColor: 'var(--bg-base)',
										borderColor: 'var(--border-subtle)',
										color: 'var(--text-primary)',
									}}
								>
									Bag
								</div>
							</div>

							<div className='form-group flex flex-col gap-1'>
								<label
									className='label text-sm font-medium'
									style={{ color: 'var(--text-secondary)' }}
								>
									Opening Stock (Bag)
								</label>
								<input
									type='number'
									className='input w-full p-2.5 border rounded bg-gray-50 cursor-not-allowed'
									style={{
										borderColor: 'var(--border-subtle)',
										color: 'var(--text-primary)',
									}}
									value={formData.openingStock}
									disabled
								/>
							</div>

							<div className='form-group flex flex-col gap-1'>
								<label
									className='label text-sm font-medium'
									style={{ color: 'var(--text-secondary)' }}
								>
									Purchased Today (Bag)
								</label>
								<input
									type='number'
									min='0'
									step='0.5'
									className={`input w-full p-2.5 border rounded ${(!stock || isEditing) && !ledger.isClosed ? '' : 'bg-gray-50 cursor-not-allowed'}`}
									style={{
										backgroundColor:
											(!stock || isEditing) && !ledger.isClosed
												? 'var(--bg-base)'
												: undefined,
										borderColor: 'var(--border)',
										color: 'var(--text-primary)',
									}}
									value={formData.purchasedQty}
									onChange={(e) =>
										setFormData({
											...formData,
											purchasedQty: e.target.value
												? Number(e.target.value)
												: 0,
										})
									}
									disabled={(!!stock && !isEditing) || ledger.isClosed}
								/>
							</div>

							<div className='form-group flex flex-col gap-1'>
								<label
									className='label text-sm font-medium'
									style={{ color: 'var(--text-secondary)' }}
								>
									Today's Usage (Bag)
								</label>
								<input
									type='number'
									min='0'
									step='0.5'
									className={`input w-full p-2.5 border rounded ${(!stock || isEditing) && !ledger.isClosed ? '' : 'bg-gray-50 cursor-not-allowed'}`}
									style={{
										backgroundColor:
											(!stock || isEditing) && !ledger.isClosed
												? 'var(--bg-base)'
												: undefined,
										borderColor: 'var(--border)',
										color: 'var(--text-primary)',
									}}
									value={formData.todayUsage}
									onChange={(e) =>
										setFormData({
											...formData,
											todayUsage: e.target.value ? Number(e.target.value) : 0,
										})
									}
									disabled={(!!stock && !isEditing) || ledger.isClosed}
								/>
							</div>

							<div className='form-group flex flex-col gap-1'>
								<label
									className='label text-sm font-medium'
									style={{ color: 'var(--text-secondary)' }}
								>
									Remaining (Bag)
								</label>
								<div
									className={`p-2.5 rounded border text-md font-bold ${remainingQty < 5 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}
								>
									{remainingQty}
									{remainingQty < 5 && (
										<span className='flex items-center gap-1 text-xs font-normal mt-1 text-red-600'>
											<AlertTriangle size={14} /> Low stock warning
										</span>
									)}
								</div>
							</div>
						</div>

						<div className='form-group flex flex-col gap-1 mt-4'>
							<label
								className='label text-sm font-medium'
								style={{ color: 'var(--text-secondary)' }}
							>
								Remarks
							</label>
							<textarea
								className={`input w-full p-2.5 border rounded ${(!stock || isEditing) && !ledger.isClosed ? '' : 'bg-gray-50 cursor-not-allowed'}`}
								style={{
									backgroundColor:
										(!stock || isEditing) && !ledger.isClosed
											? 'var(--bg-base)'
											: undefined,
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
								value={formData.remarks}
								onChange={(e) =>
									setFormData({ ...formData, remarks: e.target.value })
								}
								disabled={(!!stock && !isEditing) || ledger.isClosed}
								rows={3}
								placeholder='Any notes...'
							/>
						</div>

						{(!stock || isEditing) && !ledger.isClosed && (
							<div
								className='flex justify-end gap-3 pt-4 border-t border-subtle mt-6'
								style={{ borderColor: 'var(--border-subtle)' }}
							>
								{stock && (
									<button
										onClick={() => {
											setIsEditing(false);
											setFormData({
												openingStock: stock.openingStock,
												purchasedQty: stock.purchasedQty,
												todayUsage: stock.todayUsage,
												remarks: stock.remarks || '',
											});
										}}
										className='btn-secondary px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors'
									>
										Cancel
									</button>
								)}
								<button
									onClick={handleSave}
									disabled={submitting}
									className='btn-primary px-4 py-2 rounded bg-blue-600 text-white flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50'
								>
									<Save size={18} />
									{submitting ? 'Saving...' : 'Save Stock'}
								</button>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
