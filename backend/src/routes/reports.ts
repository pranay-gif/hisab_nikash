import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import DailyLedger from '../models/DailyLedger';
import Sale from '../models/Sale';
import Expense from '../models/Expense';
import Attendance from '../models/Attendance';
import Stock from '../models/Stock';
import Customer from '../models/Customer';

const router = Router();
router.use(protect);

// GET /api/reports/daily?date=YYYY-MM-DD
router.get('/daily', async (req: AuthRequest, res: Response) => {
  const dateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const ledger = await DailyLedger.findOne({ dateString: dateStr });
  if (!ledger) { res.status(404).json({ success: false, message: 'No ledger for this date' }); return; }

  const [sales, expenses, attendance, stocks] = await Promise.all([
    Sale.find({ dailyLedgerId: ledger._id }).populate('customerId', 'name phone'),
    Expense.find({ dailyLedgerId: ledger._id }),
    Attendance.find({ dailyLedgerId: ledger._id }).populate('employeeId', 'name'),
    Stock.find({ dailyLedgerId: ledger._id }),
  ]);

  res.json({ success: true, ledger, sales, expenses, attendance, stocks });
});

// GET /api/reports/monthly?year=2024&month=8
router.get('/monthly', async (req: AuthRequest, res: Response) => {
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const ledgers = await DailyLedger.find({ date: { $gte: start, $lte: end } }).sort({ date: 1 });
  const totals = ledgers.reduce((acc, l) => ({
    sales: acc.sales + l.totalSales,
    expenses: acc.expenses + l.totalExpenses,
    due: acc.due + l.totalDue,
    profit: acc.profit + (l.totalSales - l.totalExpenses),
  }), { sales: 0, expenses: 0, due: 0, profit: 0 });

  res.json({ success: true, ledgers, totals, year, month });
});

// GET /api/reports/yearly?year=2024
router.get('/yearly', async (req: AuthRequest, res: Response) => {
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59);

  const monthly = await DailyLedger.aggregate([
    { $match: { date: { $gte: start, $lte: end } } },
    { $group: {
      _id: { month: { $month: '$date' } },
      totalSales: { $sum: '$totalSales' },
      totalExpenses: { $sum: '$totalExpenses' },
      totalDue: { $sum: '$totalDue' },
    }},
    { $sort: { '_id.month': 1 } },
  ]);

  res.json({ success: true, monthly, year });
});

// GET /api/reports/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/expenses', async (req: AuthRequest, res: Response) => {
  const { from, to } = req.query;
  const query: Record<string, any> = {};
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from as string);
    if (to) query.date.$lte = new Date(to as string);
  }

  const expenses = await Expense.find(query).sort({ date: -1 });
  const byCategory = await Expense.aggregate([
    { $match: query },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);

  res.json({ success: true, expenses, byCategory });
});

// GET /api/reports/dues
router.get('/dues', async (_req: AuthRequest, res: Response) => {
  const pendingSales = await Sale.find({ dueAmount: { $gt: 0 } })
    .populate('customerId', 'name phone')
    .sort({ date: -1 });

  const totalOutstanding = await Customer.aggregate([
    { $match: { outstandingDue: { $gt: 0 } } },
    { $group: { _id: null, total: { $sum: '$outstandingDue' } } },
  ]);

  res.json({ success: true, pendingSales, totalOutstanding: totalOutstanding[0]?.total ?? 0 });
});

// GET /api/reports/stock?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/stock', async (req: AuthRequest, res: Response) => {
  const { from, to } = req.query;
  const query: Record<string, any> = {};
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from as string);
    if (to) query.date.$lte = new Date(to as string);
  }
  const stocks = await Stock.find(query).sort({ date: -1 });
  res.json({ success: true, stocks });
});

// GET /api/reports/attendance?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/attendance', async (req: AuthRequest, res: Response) => {
  const { from, to, employeeId } = req.query;
  const query: Record<string, any> = {};
  if (employeeId) query.employeeId = employeeId;
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from as string);
    if (to) query.date.$lte = new Date(to as string);
  }
  const attendance = await Attendance.find(query).populate('employeeId', 'name role').sort({ date: -1 });
  res.json({ success: true, attendance });
});

// GET /api/reports/profit?year=2024&month=8
router.get('/profit', async (req: AuthRequest, res: Response) => {
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const month = req.query.month ? parseInt(req.query.month as string) : undefined;

  const start = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
  const end = month ? new Date(year, month, 0, 23, 59, 59) : new Date(year, 11, 31, 23, 59, 59);

  const ledgers = await DailyLedger.find({ date: { $gte: start, $lte: end }, status: 'Closed' }).sort({ date: 1 });
  const profitData = ledgers.map(l => ({
    date: l.dateString,
    sales: l.totalSales,
    expenses: l.totalExpenses,
    profit: l.totalSales - l.totalExpenses,
    dueCollected: l.totalDueCollected,
  }));

  const totals = profitData.reduce((acc, d) => ({
    sales: acc.sales + d.sales,
    expenses: acc.expenses + d.expenses,
    profit: acc.profit + d.profit,
  }), { sales: 0, expenses: 0, profit: 0 });

  res.json({ success: true, profitData, totals });
});

// GET /api/reports/salary?year=YYYY&month=MM
// Monthly salary calculation per employee
router.get('/salary', async (req: AuthRequest, res: Response) => {
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  // Get all attendance records for the month
  const attendance = await Attendance.find({ date: { $gte: start, $lte: end } })
    .populate('employeeId', 'name role daySalary');

  // Get all employees
  const Employee = (await import('../models/Employee')).default;
  const employees = await Employee.find({ isActive: true });

  // Calculate per employee
  const salaryMap: Record<string, {
    employeeId: string;
    name: string;
    role: string;
    daySalary: number;
    presentDays: number;
    halfDays: number;
    absentDays: number;
    totalDays: number;
    calculatedSalary: number;
  }> = {};

  for (const emp of employees) {
    const empId = (emp._id as any).toString();
    salaryMap[empId] = {
      employeeId: empId,
      name: emp.name,
      role: emp.role || '',
      daySalary: emp.daySalary || 0,
      presentDays: 0,
      halfDays: 0,
      absentDays: 0,
      totalDays: 0,
      calculatedSalary: 0,
    };
  }

  for (const att of attendance) {
    const empId = att.employeeId?.toString() || (att as any).employeeId?.toString();
    if (!salaryMap[empId]) continue;
    if (att.status === 'Present') salaryMap[empId].presentDays++;
    else if (att.status === 'HalfDay') salaryMap[empId].halfDays++;
    else if (att.status === 'Absent') salaryMap[empId].absentDays++;
  }

  // Calculate salary
  for (const empId of Object.keys(salaryMap)) {
    const s = salaryMap[empId];
    s.totalDays = s.presentDays + s.halfDays + s.absentDays;
    s.calculatedSalary = (s.presentDays * s.daySalary) + (s.halfDays * s.daySalary * 0.5);
  }

  const salaryList = Object.values(salaryMap);
  const totalSalary = salaryList.reduce((sum, s) => sum + s.calculatedSalary, 0);

  // Get production OFF days for the month
  const productionOffDays = await DailyLedger.find({
    date: { $gte: start, $lte: end },
    'production.status': 'OFF',
  }).select('dateString production').sort({ date: 1 });

  res.json({
    success: true,
    salaryList,
    totalSalary,
    productionOffDays,
    year,
    month,
  });
});

export default router;

