'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface Employee {
	_id: string;
	name: string;
	role?: string;
	phone?: string;
}

interface AttendanceRecord {
	status: 'Present' | 'Absent' | 'HalfDay' | null;
	remarks: string;
}

export default function AttendancePage() {
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
	const [dailyLedgerId, setDailyLedgerId] = useState<string | null>(null);
	const [isClosed, setIsClosed] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
	const [errors, setErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		fetchData();
	}, []);

	const fetchData = async () => {
		try {
			setLoading(true);
			// Fetch employees
			const empRes = await api.get('/employees');
			const emps: Employee[] =
				empRes.data?.employees || empRes.data?.data || empRes.data || [];
			setEmployees(emps);

			// Fetch today's ledger
			const ledgerRes = await api.get('/daily-ledger/today');
			const ledger = ledgerRes.data?.ledger || ledgerRes.data;
			if (ledger?._id) {
				setDailyLedgerId(ledger._id);
				setIsClosed(ledger.status === 'Closed');

				// Fetch existing attendance for today's ledger
				const attRes = await api.get(`/attendance?ledgerId=${ledger._id}`);
				const records: any[] = attRes.data?.attendance || [];
				const attMap: Record<string, AttendanceRecord> = {};
				records.forEach((a: any) => {
					const empId =
						typeof a.employeeId === 'object' ? a.employeeId._id : a.employeeId;
					if (empId) {
						attMap[empId] = {
							status: a.status,
							remarks: a.remarks || '',
						};
					}
				});
				setAttendance(attMap);
			}
		} catch (err) {
			console.error('Failed to fetch attendance data', err);
		} finally {
			setLoading(false);
		}
	};

	const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
		setToast({ show: true, msg, type });
		setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
	};

	const setStatus = (empId: string, status: 'Present' | 'Absent' | 'HalfDay') => {
		setAttendance((prev) => ({
			...prev,
			[empId]: {
				status,
				remarks: prev[empId]?.remarks || '',
			},
		}));
		// Clear error on status change
		if (errors[empId]) setErrors((prev) => ({ ...prev, [empId]: '' }));
	};

	const setRemarks = (empId: string, remarks: string) => {
		setAttendance((prev) => ({
			...prev,
			[empId]: {
				...prev[empId],
				status: prev[empId]?.status || null,
				remarks,
			},
		}));
		if (remarks.trim() && errors[empId]) setErrors((prev) => ({ ...prev, [empId]: '' }));
	};

	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};
		employees.forEach((emp) => {
			const record = attendance[emp._id];
			if (record?.status === 'Absent' || record?.status === 'HalfDay') {
				if (!record.remarks.trim()) {
					newErrors[emp._id] = 'Remarks required for Absent / Half Day';
				}
			}
		});
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSave = async () => {
		if (!validate()) {
			showToast('Please fill in remarks for Absent / Half Day employees.', 'error');
			return;
		}
		if (!dailyLedgerId) {
			showToast('No active daily ledger found.', 'error');
			return;
		}
		try {
			setSaving(true);
			const records = employees.map((emp) => ({
				employeeId: emp._id,
				status: attendance[emp._id]?.status || 'Present',
				remarks: attendance[emp._id]?.remarks || '',
			}));
			await api.post('/attendance/bulk', { records, dailyLedgerId });
			showToast('Attendance saved successfully!');
			fetchData();
		} catch (err: any) {
			showToast(err.response?.data?.message || 'Failed to save attendance.', 'error');
		} finally {
			setSaving(false);
		}
	};

	// Counts
	const presentCount = Object.values(attendance).filter((a) => a.status === 'Present').length;
	const absentCount = Object.values(attendance).filter((a) => a.status === 'Absent').length;
	const halfCount = Object.values(attendance).filter((a) => a.status === 'HalfDay').length;

	const StatusBtn = ({
		empId,
		label,
		value,
		activeColor,
		activeStyle,
	}: {
		empId: string;
		label: string;
		value: 'Present' | 'Absent' | 'HalfDay';
		activeColor: string;
		activeStyle: React.CSSProperties;
	}) => {
		const isActive = attendance[empId]?.status === value;
		return (
			<button
				type='button'
				disabled={isClosed}
				onClick={() => setStatus(empId, value)}
				style={{
					padding: '6px 14px',
					borderRadius: '8px',
					border: `1.5px solid ${isActive ? activeColor : 'var(--border)'}`,
					background: isActive ? (activeStyle.background as string) : 'transparent',
					color: isActive ? activeColor : 'var(--text-secondary)',
					fontWeight: isActive ? 700 : 500,
					fontSize: '13px',
					cursor: isClosed ? 'not-allowed' : 'pointer',
					transition: 'all 0.15s',
					fontFamily: 'inherit',
					opacity: isClosed ? 0.6 : 1,
					whiteSpace: 'nowrap',
				}}
			>
				{label}
			</button>
		);
	};

	return (
		<div>
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

			{/* Header */}
			<div
				style={{
					display: 'flex',
					alignItems: 'flex-start',
					justifyContent: 'space-between',
					marginBottom: '24px',
					flexWrap: 'wrap',
					gap: '12px',
				}}
			>
				<div>
					<h1 className='page-title'>Attendance Management</h1>
					<p className='page-subtitle'>Mark today's employee attendance</p>
				</div>
				{!isClosed && employees.length > 0 && !loading && (
					<button className='btn-primary' onClick={handleSave} disabled={saving}>
						{saving ? 'Saving...' : '💾 Save Attendance'}
					</button>
				)}
			</div>

			{loading && (
				<div
					className='card'
					style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}
				>
					Loading attendance...
				</div>
			)}

			{!loading && employees.length === 0 && (
				<div className='card' style={{ padding: '48px', textAlign: 'center' }}>
					<div style={{ fontSize: '40px', marginBottom: '12px' }}>👤</div>
					<h3
						style={{
							fontSize: '18px',
							fontWeight: 600,
							color: 'var(--text-primary)',
							marginBottom: '8px',
						}}
					>
						No Employees Found
					</h3>
					<p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
						Add employees first before marking attendance.
					</p>
					<Link href='/employees' className='btn-primary'>
						Go to Employees
					</Link>
				</div>
			)}

			{!loading && employees.length > 0 && (
				<>
					{/* Summary counts */}
					<div
						style={{
							display: 'flex',
							gap: '12px',
							marginBottom: '20px',
							flexWrap: 'wrap',
						}}
					>
						<div
							style={{
								padding: '12px 20px',
								borderRadius: '10px',
								background: 'rgba(16,185,129,0.1)',
								border: '1px solid rgba(16,185,129,0.25)',
								color: '#10b981',
								fontWeight: 700,
								fontSize: '15px',
								display: 'flex',
								alignItems: 'center',
								gap: '8px',
							}}
						>
							<span style={{ fontSize: '20px', fontWeight: 800 }}>
								{presentCount}
							</span>
							<span style={{ fontWeight: 500, fontSize: '13px' }}>Present</span>
						</div>
						<div
							style={{
								padding: '12px 20px',
								borderRadius: '10px',
								background: 'rgba(239,68,68,0.1)',
								border: '1px solid rgba(239,68,68,0.25)',
								color: '#ef4444',
								fontWeight: 700,
								fontSize: '15px',
								display: 'flex',
								alignItems: 'center',
								gap: '8px',
							}}
						>
							<span style={{ fontSize: '20px', fontWeight: 800 }}>{absentCount}</span>
							<span style={{ fontWeight: 500, fontSize: '13px' }}>Absent</span>
						</div>
						<div
							style={{
								padding: '12px 20px',
								borderRadius: '10px',
								background: 'rgba(245,158,11,0.1)',
								border: '1px solid rgba(245,158,11,0.25)',
								color: '#f59e0b',
								fontWeight: 700,
								fontSize: '15px',
								display: 'flex',
								alignItems: 'center',
								gap: '8px',
							}}
						>
							<span style={{ fontSize: '20px', fontWeight: 800 }}>{halfCount}</span>
							<span style={{ fontWeight: 500, fontSize: '13px' }}>Half Day</span>
						</div>
					</div>

					{/* Closed banner */}
					{isClosed && (
						<div
							style={{
								padding: '12px 16px',
								borderRadius: '10px',
								marginBottom: '16px',
								background: 'rgba(245,158,11,0.1)',
								border: '1px solid rgba(245,158,11,0.25)',
								color: '#f59e0b',
								fontSize: '14px',
								fontWeight: 500,
							}}
						>
							🔒 Today's ledger is <strong>closed</strong>. Attendance is read-only.
						</div>
					)}

					{/* Attendance Table */}
					<div className='card'>
						<div className='table-container'>
							<table>
								<thead>
									<tr>
										<th>Employee</th>
										<th>Role</th>
										<th style={{ textAlign: 'center' }}>Status</th>
										<th>Remarks</th>
									</tr>
								</thead>
								<tbody>
									{employees.map((emp) => {
										const record = attendance[emp._id];
										const currentStatus = record?.status;
										const needsRemarks =
											currentStatus === 'Absent' ||
											currentStatus === 'HalfDay';
										const hasError = !!errors[emp._id];

										return (
											<tr key={emp._id}>
												<td>
													<div
														style={{
															fontWeight: 600,
															color: 'var(--text-primary)',
														}}
													>
														{emp.name}
													</div>
													{emp.phone && (
														<div
															style={{
																fontSize: '12px',
																color: 'var(--text-muted)',
															}}
														>
															{emp.phone}
														</div>
													)}
												</td>
												<td
													style={{
														color: 'var(--text-secondary)',
														fontSize: '13px',
													}}
												>
													{emp.role || '—'}
												</td>
												<td>
													<div
														style={{
															display: 'flex',
															gap: '6px',
															justifyContent: 'center',
															flexWrap: 'wrap',
														}}
													>
														<StatusBtn
															empId={emp._id}
															label='Present'
															value='Present'
															activeColor='#10b981'
															activeStyle={{
																background: 'rgba(16,185,129,0.12)',
															}}
														/>
														<StatusBtn
															empId={emp._id}
															label='Absent'
															value='Absent'
															activeColor='#ef4444'
															activeStyle={{
																background: 'rgba(239,68,68,0.12)',
															}}
														/>
														<StatusBtn
															empId={emp._id}
															label='Half Day'
															value='HalfDay'
															activeColor='#f59e0b'
															activeStyle={{
																background: 'rgba(245,158,11,0.12)',
															}}
														/>
													</div>
												</td>
												<td style={{ minWidth: '200px' }}>
													<div style={{ position: 'relative' }}>
														<input
															type='text'
															className='input'
															placeholder={
																needsRemarks
																	? 'Required *'
																	: 'Remarks (optional)'
															}
															value={record?.remarks || ''}
															onChange={(e) =>
																setRemarks(emp._id, e.target.value)
															}
															disabled={isClosed}
															style={{
																borderColor: hasError
																	? '#ef4444'
																	: undefined,
																fontSize: '13px',
																padding: '8px 12px',
															}}
														/>
														{hasError && (
															<p
																style={{
																	color: '#ef4444',
																	fontSize: '11px',
																	marginTop: '3px',
																}}
															>
																{errors[emp._id]}
															</p>
														)}
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>

						{/* Save button at bottom of table */}
						{!isClosed && (
							<div
								style={{
									padding: '16px 20px',
									borderTop: '1px solid var(--border-subtle)',
									display: 'flex',
									justifyContent: 'flex-end',
								}}
							>
								<button
									className='btn-primary'
									onClick={handleSave}
									disabled={saving}
								>
									{saving ? 'Saving...' : '💾 Save Attendance'}
								</button>
							</div>
						)}
					</div>
				</>
			)}
		</div>
	);
}
