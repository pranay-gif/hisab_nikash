'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Pencil, Trash2, Plus, X } from 'lucide-react';

interface Employee {
	_id: string;
	name: string;
	phone?: string;
	role?: string;
	daySalary?: number;
	joiningDate?: string;
	isActive: boolean;
	notes?: string;
}

const initialFormData = {
	name: '',
	phone: '',
	role: '',
	daySalary: '',
	joiningDate: '',
	isActive: true,
	notes: '',
};

export default function EmployeesPage() {
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editId, setEditId] = useState<string | null>(null);
	const [formData, setFormData] = useState(initialFormData);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		fetchEmployees();
	}, []);

	const fetchEmployees = async () => {
		try {
			setLoading(true);
			const res = await api.get('/employees');
			setEmployees(res.data.employees || res.data || []);
			setError(null);
		} catch (err: any) {
			setError(err.response?.data?.message || 'Failed to fetch employees');
		} finally {
			setLoading(false);
		}
	};

	const handleOpenModal = (employee?: Employee) => {
		if (employee) {
			setEditId(employee._id);
			setFormData({
				name: employee.name,
				phone: employee.phone || '',
				role: employee.role || '',
				daySalary: employee.daySalary ? employee.daySalary.toString() : '',
				joiningDate: employee.joiningDate ? employee.joiningDate.split('T')[0] : '',
				isActive: employee.isActive ?? true,
				notes: employee.notes || '',
			});
		} else {
			setEditId(null);
			setFormData({
				...initialFormData,
				joiningDate: new Date().toISOString().split('T')[0],
			});
		}
		setIsModalOpen(true);
	};

	const handleCloseModal = () => {
		setIsModalOpen(false);
		setEditId(null);
		setFormData(initialFormData);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			setSubmitting(true);
			const payload = {
				name: formData.name,
				phone: formData.phone || undefined,
				role: formData.role || undefined,
				daySalary: formData.daySalary ? Number(formData.daySalary) : undefined,
				joiningDate: formData.joiningDate || undefined,
				isActive: formData.isActive,
				notes: formData.notes || undefined,
			};

			if (editId) {
				await api.patch(`/employees/${editId}`, payload);
			} else {
				await api.post('/employees', payload);
			}

			handleCloseModal();
			fetchEmployees();
		} catch (err: any) {
			alert(err.response?.data?.message || 'Failed to save employee');
		} finally {
			setSubmitting(false);
		}
	};

	const handleDelete = async (id: string, name: string) => {
		if (window.confirm(`Are you sure you want to deactivate/delete ${name}?`)) {
			try {
				await api.delete(`/employees/${id}`);
				fetchEmployees();
			} catch (err: any) {
				alert(err.response?.data?.message || 'Failed to delete employee');
			}
		}
	};

	return (
		<div className='p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6'>
			<header className='page-header flex justify-between items-center'>
				<div>
					<h1
						className='page-title text-2xl font-bold'
						style={{ color: 'var(--text-primary)' }}
					>
						Employees
					</h1>
					<p className='page-subtitle text-sm' style={{ color: 'var(--text-secondary)' }}>
						Manage staff for Yummy Eats
					</p>
				</div>
				<button
					className='btn-primary flex items-center gap-2'
					onClick={() => handleOpenModal()}
				>
					<Plus size={18} />
					<span>Add Employee</span>
				</button>
			</header>

			<div
				className='card bg-surface rounded-lg shadow border border-subtle overflow-hidden'
				style={{
					backgroundColor: 'var(--bg-surface)',
					borderColor: 'var(--border-subtle)',
				}}
			>
				<div
					className='p-4 border-b border-subtle'
					style={{ borderColor: 'var(--border-subtle)' }}
				>
					<h2 className='text-lg font-semibold' style={{ color: 'var(--text-primary)' }}>
						All Employees ({employees.length})
					</h2>
				</div>

				{loading ? (
					<div className='p-8 text-center' style={{ color: 'var(--text-muted)' }}>
						Loading employees...
					</div>
				) : error ? (
					<div className='p-8 text-center text-red-500'>{error}</div>
				) : employees.length === 0 ? (
					<div className='p-8 text-center' style={{ color: 'var(--text-muted)' }}>
						No employees found. Add one to get started.
					</div>
				) : (
					<div className='table-container overflow-x-auto w-full'>
						<table className='w-full text-left border-collapse min-w-[800px]'>
							<thead
								className='bg-elevated text-sm'
								style={{
									backgroundColor: 'var(--bg-elevated)',
									color: 'var(--text-secondary)',
								}}
							>
								<tr>
									<th
										className='p-3 border-b'
										style={{ borderColor: 'var(--border-subtle)' }}
									>
										Name
									</th>
									<th
										className='p-3 border-b'
										style={{ borderColor: 'var(--border-subtle)' }}
									>
										Role
									</th>
									<th
										className='p-3 border-b'
										style={{ borderColor: 'var(--border-subtle)' }}
									>
										Phone
									</th>
									<th
										className='p-3 border-b'
										style={{ borderColor: 'var(--border-subtle)' }}
									>
										Day Salary
									</th>
									<th
										className='p-3 border-b'
										style={{ borderColor: 'var(--border-subtle)' }}
									>
										Joining Date
									</th>
									<th
										className='p-3 border-b'
										style={{ borderColor: 'var(--border-subtle)' }}
									>
										Status
									</th>
									<th
										className='p-3 border-b text-center'
										style={{ borderColor: 'var(--border-subtle)' }}
									>
										Actions
									</th>
								</tr>
							</thead>
							<tbody
								className='divide-y text-sm'
								style={{ borderColor: 'var(--border-subtle)' }}
							>
								{employees.map((emp) => (
									<tr
										key={emp._id}
										className='hover:bg-hover transition-colors'
										style={{ color: 'var(--text-primary)' }}
									>
										<td className='p-3 font-medium'>{emp.name}</td>
										<td className='p-3'>{emp.role || '-'}</td>
										<td className='p-3'>{emp.phone || '-'}</td>
										<td className='p-3'>
											{emp.daySalary ? formatCurrency(emp.daySalary) : '-'}
										</td>
										<td className='p-3'>
											{emp.joiningDate ? formatDate(emp.joiningDate) : '-'}
										</td>
										<td className='p-3'>
											<span
												className={`badge px-2 py-1 rounded text-xs font-medium ${emp.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
											>
												{emp.isActive ? 'Active' : 'Inactive'}
											</span>
										</td>
										<td className='p-3 flex justify-center gap-3'>
											<button
												onClick={() => handleOpenModal(emp)}
												className='p-1 rounded hover:bg-gray-200 transition-colors text-blue-600'
												title='Edit Employee'
											>
												<Pencil size={18} />
											</button>
											<button
												onClick={() => handleDelete(emp._id, emp.name)}
												className={`p-1 rounded hover:bg-gray-200 transition-colors ${emp.isActive ? 'text-red-500' : 'text-gray-400'}`}
												title={
													emp.isActive
														? 'Deactivate/Delete'
														: 'Deleted/Inactive'
												}
											>
												<Trash2 size={18} />
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{isModalOpen && (
				<div className='modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50'>
					<div
						className='modal bg-surface rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col'
						style={{ backgroundColor: 'var(--bg-surface)' }}
					>
						<div
							className='modal-header flex justify-between items-center p-4 border-b border-subtle'
							style={{ borderColor: 'var(--border-subtle)' }}
						>
							<h2
								className='text-lg font-bold'
								style={{ color: 'var(--text-primary)' }}
							>
								{editId ? 'Edit Employee' : 'Add Employee'}
							</h2>
							<button
								onClick={handleCloseModal}
								className='text-gray-500 hover:text-gray-700'
							>
								<X size={20} />
							</button>
						</div>

						<form
							onSubmit={handleSubmit}
							className='flex flex-col flex-1 overflow-hidden'
						>
							<div className='modal-body p-4 overflow-y-auto space-y-4'>
								<div className='form-group flex flex-col gap-1'>
									<label
										className='label text-sm font-medium'
										style={{ color: 'var(--text-secondary)' }}
									>
										Name *
									</label>
									<input
										type='text'
										required
										className='input w-full p-2 border rounded'
										style={{
											backgroundColor: 'var(--bg-base)',
											borderColor: 'var(--border)',
											color: 'var(--text-primary)',
										}}
										value={formData.name}
										onChange={(e) =>
											setFormData({ ...formData, name: e.target.value })
										}
									/>
								</div>

								<div className='form-group flex flex-col gap-1'>
									<label
										className='label text-sm font-medium'
										style={{ color: 'var(--text-secondary)' }}
									>
										Role
									</label>
									<input
										type='text'
										className='input w-full p-2 border rounded'
										style={{
											backgroundColor: 'var(--bg-base)',
											borderColor: 'var(--border)',
											color: 'var(--text-primary)',
										}}
										value={formData.role}
										onChange={(e) =>
											setFormData({ ...formData, role: e.target.value })
										}
									/>
								</div>

								<div className='form-group flex flex-col gap-1'>
									<label
										className='label text-sm font-medium'
										style={{ color: 'var(--text-secondary)' }}
									>
										Phone
									</label>
									<input
										type='text'
										className='input w-full p-2 border rounded'
										style={{
											backgroundColor: 'var(--bg-base)',
											borderColor: 'var(--border)',
											color: 'var(--text-primary)',
										}}
										value={formData.phone}
										onChange={(e) =>
											setFormData({ ...formData, phone: e.target.value })
										}
									/>
								</div>

								<div className='form-group flex flex-col gap-1'>
									<label
										className='label text-sm font-medium'
										style={{ color: 'var(--text-secondary)' }}
									>
										Day Salary (₹/day)
									</label>
									<input
										type='number'
										min='0'
										step='0.01'
										className='input w-full p-2 border rounded'
										style={{
											backgroundColor: 'var(--bg-base)',
											borderColor: 'var(--border)',
											color: 'var(--text-primary)',
										}}
										value={formData.daySalary}
										onChange={(e) =>
											setFormData({ ...formData, daySalary: e.target.value })
										}
									/>
								</div>

								<div className='form-group flex flex-col gap-1'>
									<label
										className='label text-sm font-medium'
										style={{ color: 'var(--text-secondary)' }}
									>
										Joining Date
									</label>
									<input
										type='date'
										className='input w-full p-2 border rounded'
										style={{
											backgroundColor: 'var(--bg-base)',
											borderColor: 'var(--border)',
											color: 'var(--text-primary)',
										}}
										value={formData.joiningDate}
										onChange={(e) =>
											setFormData({
												...formData,
												joiningDate: e.target.value,
											})
										}
									/>
								</div>

								<div className='form-group flex items-center gap-3 mt-2'>
									<input
										type='checkbox'
										id='isActive'
										className='w-4 h-4'
										checked={formData.isActive}
										onChange={(e) =>
											setFormData({ ...formData, isActive: e.target.checked })
										}
									/>
									<label
										htmlFor='isActive'
										className='label text-sm font-medium'
										style={{ color: 'var(--text-primary)' }}
									>
										Active Status
									</label>
								</div>

								<div className='form-group flex flex-col gap-1'>
									<label
										className='label text-sm font-medium'
										style={{ color: 'var(--text-secondary)' }}
									>
										Notes
									</label>
									<textarea
										className='input w-full p-2 border rounded'
										style={{
											backgroundColor: 'var(--bg-base)',
											borderColor: 'var(--border)',
											color: 'var(--text-primary)',
										}}
										value={formData.notes}
										onChange={(e) =>
											setFormData({ ...formData, notes: e.target.value })
										}
										rows={2}
									/>
								</div>
							</div>

							<div
								className='modal-footer p-4 border-t border-subtle flex justify-end gap-3'
								style={{ borderColor: 'var(--border-subtle)' }}
							>
								<button
									type='button'
									className='btn-secondary px-4 py-2 rounded bg-gray-200 text-gray-800'
									onClick={handleCloseModal}
								>
									Cancel
								</button>
								<button
									type='submit'
									className='btn-primary px-4 py-2 rounded bg-blue-600 text-white'
									disabled={submitting}
								>
									{submitting ? 'Saving...' : 'Save Employee'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
