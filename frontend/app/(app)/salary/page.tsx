'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Calendar, CheckCircle, IndianRupee, FileText } from 'lucide-react';

interface SalaryRecord {
  employeeId: string;
  name: string;
  role: string;
  daySalary: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  totalDays: number;
  calculatedSalary: number;
}

interface OffDay {
  dateString: string;
  production: { status: string; remarks: string };
}

interface SalaryReport {
  salaryList: SalaryRecord[];
  totalSalary: number;
  productionOffDays: OffDay[];
  year: number;
  month: number;
}

export default function SalaryPage() {
  const currentMonthYear = new Date().toISOString().slice(0, 7);
  const [monthYear, setMonthYear] = useState<string>(currentMonthYear);
  const [report, setReport] = useState<SalaryReport | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    if (!monthYear) return;
    
    setLoading(true);
    setError(null);
    try {
      const [year, month] = monthYear.split('-');
      const res = await api.get(`/reports/salary?year=${year}&month=${month}`);
      setReport(res.data);
    } catch (err) {
      console.error('Failed to fetch salary report', err);
      setError('Failed to load salary report. Please try again.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const totalCalculatedSalary = report?.totalSalary || report?.salaryList?.reduce((sum, emp) => sum + (emp.calculatedSalary || 0), 0) || 0;
  
  const totalPresent = report?.salaryList?.reduce((sum, emp) => sum + (emp.presentDays || 0), 0) || 0;
  const totalHalfDay = report?.salaryList?.reduce((sum, emp) => sum + (emp.halfDays || 0), 0) || 0;
  const totalAbsent = report?.salaryList?.reduce((sum, emp) => sum + (emp.absentDays || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Salary Report</h1>
          <p className="page-subtitle">Monthly employee salary and attendance summary</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
            <Calendar size={18} />
            Month:
          </label>
          <input
            type="month"
            className="input"
            value={monthYear}
            onChange={(e) => setMonthYear(e.target.value)}
            max={currentMonthYear}
          />
          <button 
            onClick={fetchReport} 
            disabled={loading}
            className="btn-primary"
          >
            Generate
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="skeleton h-24 rounded-lg w-full md:w-1/3"></div>
          <div className="skeleton h-64 rounded-lg w-full"></div>
          <div className="skeleton h-48 rounded-lg w-full"></div>
        </div>
      ) : report ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="kpi-card border border-[var(--border)] bg-[var(--bg-surface)] flex items-center p-6 gap-4 rounded-lg">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-full">
                <IndianRupee size={28} />
              </div>
              <div>
                <div className="kpi-label text-[var(--text-secondary)] text-sm font-medium">Total Salary Payout</div>
                <div className="kpi-value text-[var(--text-primary)] text-2xl font-bold mt-1">{formatCurrency(totalCalculatedSalary)}</div>
              </div>
            </div>
            
            <div className="kpi-card border border-[var(--border)] bg-[var(--bg-surface)] flex items-center p-6 gap-4 rounded-lg md:col-span-2">
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-full">
                <FileText size={28} />
              </div>
              <div>
                <div className="kpi-label text-[var(--text-secondary)] text-sm font-medium">Report Summary</div>
                <div className="text-[var(--text-primary)] mt-1 flex gap-4">
                  <span><strong className="text-emerald-500">{totalPresent}</strong> Present Days</span>
                  <span><strong className="text-amber-500">{totalHalfDay}</strong> Half Days</span>
                  <span><strong className="text-red-500">{totalAbsent}</strong> Absent Days</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-[var(--bg-surface)] p-0 overflow-hidden border border-[var(--border-subtle)]">
            <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Employee Salary Summary</h2>
            </div>
            <div className="table-container overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
                    <th className="p-4 font-medium text-[var(--text-secondary)]">Employee</th>
                    <th className="p-4 font-medium text-[var(--text-secondary)]">Role</th>
                    <th className="p-4 font-medium text-[var(--text-secondary)]">Day Salary</th>
                    <th className="p-4 font-medium text-[var(--text-secondary)] text-center">Present</th>
                    <th className="p-4 font-medium text-[var(--text-secondary)] text-center">Half Day</th>
                    <th className="p-4 font-medium text-[var(--text-secondary)] text-center">Absent</th>
                    <th className="p-4 font-medium text-[var(--text-secondary)] text-right">Calculated Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {!report.salaryList || report.salaryList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[var(--text-muted)]">
                        No salary records found for this month.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {report.salaryList.map((emp, idx) => {
                        const name = emp.name || 'Unknown';
                        const role = emp.role || 'N/A';
                        
                        return (
                          <tr key={emp.employeeId || idx} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-colors">
                            <td className="p-4 font-medium text-[var(--text-primary)]">{name}</td>
                            <td className="p-4 text-[var(--text-secondary)]">{role}</td>
                            <td className="p-4 text-[var(--text-primary)]">{formatCurrency(emp.daySalary)}/day</td>
                            <td className="p-4 text-center text-emerald-500 font-medium">{emp.presentDays}</td>
                            <td className="p-4 text-center text-amber-500 font-medium">{emp.halfDays}</td>
                            <td className="p-4 text-center text-red-500 font-medium">{emp.absentDays}</td>
                            <td className="p-4 text-right font-bold text-[var(--accent)]">{formatCurrency(emp.calculatedSalary)}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-[var(--bg-elevated)] border-t-2 border-[var(--border-subtle)]">
                        <td colSpan={3} className="p-4 font-bold text-[var(--text-primary)] text-right">TOTALS</td>
                        <td className="p-4 text-center font-bold text-emerald-500">{totalPresent}</td>
                        <td className="p-4 text-center font-bold text-amber-500">{totalHalfDay}</td>
                        <td className="p-4 text-center font-bold text-red-500">{totalAbsent}</td>
                        <td className="p-4 text-right font-bold text-[var(--accent)] text-lg">{formatCurrency(totalCalculatedSalary)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card bg-[var(--bg-surface)] p-0 overflow-hidden border border-[var(--border-subtle)]">
            <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Production OFF Days</h2>
            </div>
            
            {!report.productionOffDays || report.productionOffDays.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-emerald-500 gap-2">
                <CheckCircle size={32} className="mb-2" />
                <p className="font-medium text-lg">✅ Production was ON all days this month</p>
              </div>
            ) : (
              <div className="table-container overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
                      <th className="p-4 font-medium text-[var(--text-secondary)] w-1/3">Date</th>
                      <th className="p-4 font-medium text-[var(--text-secondary)]">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.productionOffDays.map((day, idx) => (
                      <tr key={idx} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-elevated)] transition-colors">
                        <td className="p-4 text-[var(--text-primary)] font-medium">
                          {day.dateString}
                        </td>
                        <td className="p-4 text-[var(--text-secondary)]">{day.production?.remarks || 'No remarks provided'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="card p-12 text-center text-[var(--text-muted)] flex flex-col items-center justify-center border border-[var(--border-subtle)]">
          <Calendar size={48} className="mb-4 opacity-50" />
          <p>Select a month and click Generate to view the salary report.</p>
        </div>
      )}
    </div>
  );
}
