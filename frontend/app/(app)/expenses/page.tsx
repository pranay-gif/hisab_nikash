'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Calendar, Trash2, Plus, Info, AlertCircle, CheckCircle } from 'lucide-react';

interface Expense {
	_id: string;
	category: string;
	amount: number;
	paymentMode: string;
	description?: string;
	date: string;
}

export default function ExpensesPage() {
	const todayStr = new Date().toISOString().split('T')[0];
	const [selectedDate, setSelectedDate] = useState<string>(todayStr);
	const [expenses, setExpenses] = useState<Expense[]>([]);
	const [categories, setCategories] = useState<string[]>([]);

	const [loading, setLoading] = useState(true);
	const [isClosed, setIsClosed] = useState(false);
	const [dailyLedgerId, setDailyLedgerId] = useState<string | null>(null);

	// Form states
	const [showAddForm, setShowAddForm] = useState(false);
	const [newCategory, setNewCategory] = useState('');
	const [newAmount, setNewAmount] = useState('');
	const [newPaymentMode, setNewPaymentMode] = useState('Cash');
	const [newDescription, setNewDescription] = useState('');
	const [saving, setSaving] = useState(false);

	const [showSuggestions, setShowSuggestions] = useState(false);

	const [toast, setToast] = useState<{
		message: string;
		type: 'success' | 'error' | 'info';
	} | null>(null);

	useEffect(() => {
		fetchData();
	}, [selectedDate]);

	const fetchData = async () => {
		setLoading(true);
		try {
			const isToday = selectedDate === todayStr;

			let ledgerId = null;
			if (isToday) {
				const ledgerRes = await api.get('/daily-ledger/today');
				if (ledgerRes.data) {
					ledgerId = ledgerRes?.data?.ledger?._id;
					setDailyLedgerId(ledgerId);
					setIsClosed(ledgerRes.data.status === 'Closed');
				} else {
					setDailyLedgerId(null);
					setIsClosed(false);
				}
			} else {
				setDailyLedgerId(null);
				setIsClosed(true); // Historical is view only
			}

			// Fetch expenses
			let expRes;
			if (isToday && ledgerId) {
				expRes = await api.get(`/expenses?ledgerId=${ledgerId}`);
			} else {
				expRes = await api.get(`/expenses?date=${selectedDate}`);
			}
			setExpenses(expRes?.data?.expenses || []);

			// Fetch categories
			const catRes = await api.get('/expenses/categories');
			setCategories(catRes?.data?.categories || []);
		} catch (error) {
			console.error('Failed to fetch expenses', error);
			showToast('Failed to load data', 'error');
		} finally {
			setLoading(false);
		}
	};

	const showToast = (message: string, type: 'success' | 'error' | 'info') => {
		setToast({ message, type });
		setTimeout(() => setToast(null), 3000);
	};

	const handleAddExpense = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newCategory.trim() || !newAmount) {
			showToast('Category and amount are required', 'error');
			return;
		}

		setSaving(true);
		try {
			const payload = {
				category: newCategory.trim(),
				amount: Number(newAmount),
				paymentMode: newPaymentMode,
				description: newDescription.trim(),
				dailyLedgerId,
			};

			const res = await api.post('/expenses', payload);

			if (res.data.merged) {
				showToast('Expense merged with existing category for today', 'info');
			} else {
				showToast('Expense added successfully', 'success');
			}

			setNewCategory('');
			setNewAmount('');
			setNewDescription('');
			setNewPaymentMode('Cash');
			setShowAddForm(false);

			fetchData();
		} catch (error) {
			console.error('Failed to add expense', error);
			showToast('Failed to add expense', 'error');
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm('Are you sure you want to delete this expense?')) return;
		try {
			await api.delete(`/expenses/${id}`);
			showToast('Expense deleted', 'success');
			fetchData();
		} catch (error) {
			console.error('Failed to delete expense', error);
			showToast('Failed to delete expense', 'error');
		}
	};

	const totalAmount = expenses?.reduce((sum, exp) => sum + exp.amount, 0);

	const categoryTotals = expenses?.reduce(
		(acc, exp) => {
			acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
			return acc;
		},
		{} as Record<string, number>,
	);

	const filteredCategories = categories.filter((c) =>
		c.toLowerCase().includes(newCategory.toLowerCase()),
	);

	return (
		<div className='space-y-6'>
			<div className='page-header'>
				<div>
					<h1 className='page-title'>Expenses</h1>
					<p className='page-subtitle'>Manage daily expenses</p>
				</div>
				<div className='flex items-center gap-3'>
					<label className='text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2'>
						<Calendar size={18} />
						Date:
					</label>
					<input
						type='date'
						className='input'
						value={selectedDate}
						onChange={(e) => setSelectedDate(e.target.value)}
						max={todayStr}
					/>
				</div>
			</div>

			{toast && (
				<div
					className={`toast toast-${toast.type} fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg flex items-center gap-2 bg-[var(--bg-elevated)] border ${toast.type === 'error' ? 'border-red-500 text-red-500' : toast.type === 'success' ? 'border-emerald-500 text-emerald-500' : 'border-blue-500 text-blue-500'}`}
				>
					{toast.type === 'error' ? (
						<AlertCircle size={20} />
					) : toast.type === 'info' ? (
						<Info size={20} />
					) : (
						<CheckCircle size={20} />
					)}
					<span>{toast.message}</span>
				</div>
			)}

			{loading ? (
				<div className='space-y-4'>
					<div className='skeleton h-24 rounded-lg w-full md:w-1/3'></div>
					<div className='skeleton h-64 rounded-lg w-full'></div>
				</div>
			) : (
				<>
					<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
						<div className='kpi-card border border-[var(--border)] bg-[var(--bg-surface)]'>
							<div className='kpi-label text-[var(--text-secondary)]'>
								Total Expenses
							</div>
							<div className='kpi-value text-[var(--text-primary)]'>
								{formatCurrency(totalAmount)}
							</div>
						</div>

						<div className='md:col-span-2 card bg-[var(--bg-surface)]'>
							<h3 className='text-sm font-medium text-[var(--text-secondary)] mb-3'>
								Category Summary
							</h3>
							<div className='flex flex-wrap gap-2'>
								{Object.keys(categoryTotals).length === 0 ? (
									<span className='text-sm text-[var(--text-muted)]'>
										No expenses recorded.
									</span>
								) : (
									Object.entries(categoryTotals).map(([cat, total]) => (
										<div
											key={cat}
											className='badge bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-full flex gap-2 items-center'
										>
											<span className='text-sm text-[var(--text-primary)]'>
												{cat}
											</span>
											<span className='text-sm font-bold text-[var(--accent)]'>
												{formatCurrency(total)}
											</span>
										</div>
									))
								)}
							</div>
						</div>
					</div>

					{isClosed && (
						<div className='bg-amber-500/10 border border-amber-500/30 text-amber-500 p-4 rounded-lg flex items-center gap-3'>
							<Info size={20} />
							<p>
								This date is <strong>closed or historical</strong>. Expenses are
								currently in view-only mode.
							</p>
						</div>
					)}

					{!isClosed && !showAddForm && (
						<div className='flex justify-start'>
							<button
								onClick={() => setShowAddForm(true)}
								className='btn-primary flex items-center gap-2'
							>
								<Plus size={18} />
								Add Expense
							</button>
						</div>
					)}

					{!isClosed && showAddForm && (
						<div className='card border border-[var(--border-subtle)] bg-[var(--bg-surface)]'>
							<h3 className='text-lg font-semibold text-[var(--text-primary)] mb-4'>
								Add New Expense
							</h3>
							<form
								onSubmit={handleAddExpense}
								className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start'
							>
								<div className='form-group lg:col-span-1 relative'>
									<label className='label'>Category</label>
									<input
										type='text'
										className='input w-full'
										placeholder='e.g. Vegetables'
										value={newCategory}
										onChange={(e) => {
											setNewCategory(e.target.value);
											setShowSuggestions(true);
										}}
										onFocus={() => setShowSuggestions(true)}
										onBlur={() =>
											setTimeout(() => setShowSuggestions(false), 150)
										}
										required
									/>
									{showSuggestions && filteredCategories.length > 0 && (
										<ul className='absolute z-10 w-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-md shadow-lg max-h-48 overflow-y-auto autocomplete-dropdown'>
											{filteredCategories.map((cat) => (
												<li
													key={cat}
													className='px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer autocomplete-item'
													onClick={() => {
														setNewCategory(cat);
														setShowSuggestions(false);
													}}
												>
													{cat}
												</li>
											))}
										</ul>
									)}
								</div>

								<div className='form-group lg:col-span-1'>
									<label className='label'>Amount</label>
									<input
										type='number'
										min='1'
										className='input w-full'
										placeholder='0.00'
										value={newAmount}
										onChange={(e) => setNewAmount(e.target.value)}
										required
									/>
								</div>

								<div className='form-group lg:col-span-1'>
									<label className='label'>Mode</label>
									<select
										className='select w-full'
										value={newPaymentMode}
										onChange={(e) => setNewPaymentMode(e.target.value)}
									>
										<option value='Cash'>Cash</option>
										<option value='UPI'>UPI</option>
									</select>
								</div>

								<div className='form-group lg:col-span-1'>
									<label className='label'>Description (Optional)</label>
									<input
										type='text'
										className='input w-full'
										placeholder='Details...'
										value={newDescription}
										onChange={(e) => setNewDescription(e.target.value)}
									/>
								</div>

								<div className='lg:col-span-1 flex items-end gap-2 h-full pb-0.5'>
									<button
										type='submit'
										disabled={saving}
										className='btn-primary w-full h-[42px]'
									>
										{saving ? 'Saving...' : 'Save'}
									</button>
									<button
										type='button'
										onClick={() => setShowAddForm(false)}
										className='btn-secondary h-[42px] px-3'
									>
										Cancel
									</button>
								</div>
							</form>
						</div>
					)}

					<div className='table-container bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg overflow-hidden'>
						<table className='w-full text-left border-collapse'>
							<thead>
								<tr className='bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]'>
									<th className='p-4 font-medium text-[var(--text-secondary)]'>
										Category
									</th>
									<th className='p-4 font-medium text-[var(--text-secondary)]'>
										Amount
									</th>
									<th className='p-4 font-medium text-[var(--text-secondary)]'>
										Mode
									</th>
									<th className='p-4 font-medium text-[var(--text-secondary)]'>
										Description
									</th>
									{!isClosed && (
										<th className='p-4 font-medium text-[var(--text-secondary)] text-right'>
											Actions
										</th>
									)}
								</tr>
							</thead>
							<tbody>
								{expenses.length === 0 ? (
									<tr>
										<td
											colSpan={isClosed ? 4 : 5}
											className='p-8 text-center text-[var(--text-muted)]'
										>
											No expenses found for this date.
										</td>
									</tr>
								) : (
									expenses.map((expense) => (
										<tr
											key={expense._id}
											className='border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-elevated)] transition-colors'
										>
											<td className='p-4 font-medium text-[var(--text-primary)]'>
												{expense.category}
											</td>
											<td className='p-4 text-[var(--text-primary)]'>
												{formatCurrency(expense.amount)}
											</td>
											<td className='p-4'>
												<span
													className={`px-2 py-1 rounded-md text-xs font-medium ${expense.paymentMode === 'Cash' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}
												>
													{expense.paymentMode}
												</span>
											</td>
											<td className='p-4 text-[var(--text-secondary)] text-sm'>
												{expense.description || '-'}
											</td>
											{!isClosed && (
												<td className='p-4 text-right'>
													<button
														onClick={() => handleDelete(expense._id)}
														className='text-red-500 hover:text-red-400 p-2 rounded-md hover:bg-red-500/10 transition-colors'
														title='Delete Expense'
													>
														<Trash2 size={18} />
													</button>
												</td>
											)}
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</>
			)}
		</div>
	);
}
