'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function DueManagementPage() {
	const [pendingDues, setPendingDues] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');

	const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean; sale: any }>({
		isOpen: false,
		sale: null,
	});
	const [paymentForm, setPaymentForm] = useState({ amount: '', mode: 'Cash', notes: '' });
	const [toastMessage, setToastMessage] = useState('');

	const fetchDues = async () => {
		try {
			setLoading(true);
			// Assuming GET /api/due-payments or /api/sales?status=Pending returns pending sales
			const res = await api.get('/due-payments');
			// If the backend sends an array directly or inside a property
			const data = res.data?.pendingSales || res.data || [];
			setPendingDues(Array.isArray(data) ? data : []);
		} catch (error) {
			console.error('Error fetching due payments:', error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchDues();
	}, []);

	const handleReceivePayment = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!paymentModal.sale) return;

		try {
			await api.post('/due-payments', {
				customerId: paymentModal.sale.customer || paymentModal.sale.customerId,
				saleId: paymentModal.sale._id,
				amount: Number(paymentForm.amount),
				paymentMode: paymentForm.mode,
				notes: paymentForm.notes,
			});

			setPaymentModal({ isOpen: false, sale: null });
			setPaymentForm({ amount: '', mode: 'Cash', notes: '' });
			setToastMessage('Payment recorded successfully!');

			setTimeout(() => setToastMessage(''), 3000);
			fetchDues();
		} catch (error) {
			console.error('Payment failed:', error);
			alert('Failed to process payment');
		}
	};

	const filteredDues = pendingDues.filter((due) => {
		const custName = (due.customerName || due.customer?.name || '').toLowerCase();
		return custName.includes(search.toLowerCase());
	});

	const totalOutstanding = filteredDues.reduce((sum, due) => sum + (due.dueAmount || 0), 0);

	return (
		<div className='diary-section relative'>
			{toastMessage && (
				<div className='absolute top-0 right-0 bg-green-500 text-white px-4 py-2 rounded shadow-md z-50'>
					{toastMessage}
				</div>
			)}

			<div className='page-header flex justify-between items-end mb-6'>
				<div>
					<h1 className='page-title'>Due Management</h1>
					<p className='page-subtitle'>Track and collect pending payments</p>
				</div>
				<div className='text-right'>
					<div className='text-muted text-sm font-medium'>Total Outstanding</div>
					<div className='text-3xl font-bold text-red-600'>
						{formatCurrency(totalOutstanding)}
					</div>
				</div>
			</div>

			<div className='card p-4'>
				<div className='form-group mb-4 max-w-md'>
					<input
						type='text'
						className='input w-full'
						placeholder='Search by customer name...'
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>

				{loading ? (
					<div className='p-8 text-center'>Loading pending dues...</div>
				) : (
					<div className='table-container w-full overflow-x-auto'>
						<table className='w-full text-left border-collapse'>
							<thead>
								<tr className='border-b border-subtle bg-surface'>
									<th className='p-3'>Customer</th>
									<th className='p-3'>Sale Date</th>
									<th className='p-3'>Items</th>
									<th className='p-3 text-right'>Original Due</th>
									<th className='p-3 text-right'>Current Due</th>
									<th className='p-3 text-center'>Action</th>
								</tr>
							</thead>
							<tbody>
								{filteredDues.length === 0 ? (
									<tr>
										<td colSpan={6} className='p-6 text-center text-muted'>
											No pending dues found!
										</td>
									</tr>
								) : (
									filteredDues.map((due) => (
										<tr
											key={due._id}
											className='border-b border-subtle hover:bg-hover'
										>
											<td className='p-3 font-medium text-accent'>
												{due.customerName ||
													due.customer?.name ||
													'Unknown'}
											</td>
											<td className='p-3'>
												{formatDate(due.date || due.saleDate)}
											</td>
											<td className='p-3'>{due.items?.length || 0} items</td>
											<td className='p-3 text-right text-muted'>
												{formatCurrency(
													(due.grandTotal || 0) -
														(due.paidAmount || 0) +
														(due.dueAmount || 0),
												)}
											</td>
											<td className='p-3 text-right font-bold text-red-600'>
												{formatCurrency(due.dueAmount)}
											</td>
											<td className='p-3 text-center'>
												<button
													className='btn-primary py-1 px-3 text-sm'
													onClick={() => {
														setPaymentForm({
															...paymentForm,
															amount: due.dueAmount.toString(),
														});
														setPaymentModal({
															isOpen: true,
															sale: due,
														});
													}}
												>
													Receive Payment
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

			{paymentModal.isOpen && (
				<div className='modal-overlay fixed inset-0 bg-black/50 flex justify-center items-center z-50'>
					<div className='modal bg-base w-full max-w-md rounded shadow-lg p-6'>
						<div className='modal-header flex justify-between items-center mb-4'>
							<h2 className='text-xl font-bold'>Receive Payment</h2>
							<button
								onClick={() => setPaymentModal({ isOpen: false, sale: null })}
								className='text-muted hover:text-primary'
							>
								&times;
							</button>
						</div>
						<p className='mb-4 text-sm text-muted'>
							Receiving payment for{' '}
							<strong>
								{paymentModal.sale?.customerName ||
									paymentModal.sale?.customer?.name}
							</strong>
							. Current Due:{' '}
							<span className='font-bold text-red-600'>
								{formatCurrency(paymentModal.sale?.dueAmount || 0)}
							</span>
						</p>
						<form onSubmit={handleReceivePayment} className='modal-body space-y-4'>
							<div className='form-group'>
								<label className='label'>Amount Received (₹) *</label>
								<input
									type='number'
									required
									min='1'
									max={paymentModal.sale?.dueAmount}
									step='0.01'
									className='input w-full'
									value={paymentForm.amount}
									onChange={(e) =>
										setPaymentForm({ ...paymentForm, amount: e.target.value })
									}
								/>
							</div>
							<div className='form-group'>
								<label className='label'>Payment Mode *</label>
								<select
									className='select w-full'
									value={paymentForm.mode}
									onChange={(e) =>
										setPaymentForm({ ...paymentForm, mode: e.target.value })
									}
								>
									<option value='Cash'>Cash</option>
									<option value='UPI'>UPI</option>
									<option value='Card'>Card</option>
									<option value='Bank Transfer'>Bank Transfer</option>
								</select>
							</div>
							<div className='form-group'>
								<label className='label'>Notes (Optional)</label>
								<textarea
									className='input w-full resize-none'
									rows={2}
									value={paymentForm.notes}
									onChange={(e) =>
										setPaymentForm({ ...paymentForm, notes: e.target.value })
									}
								></textarea>
							</div>
							<div className='modal-footer flex justify-end gap-2 mt-6'>
								<button
									type='button'
									className='btn-secondary'
									onClick={() => setPaymentModal({ isOpen: false, sale: null })}
								>
									Cancel
								</button>
								<button type='submit' className='btn-primary'>
									Confirm Payment
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
