import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import DailyLedger from '../models/DailyLedger';
import Sale from '../models/Sale';
import Expense from '../models/Expense';
import Attendance from '../models/Attendance';
import Stock from '../models/Stock';
import { format } from 'date-fns';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(protect);

// GET /api/daily-ledger/today - Get or create today's ledger
router.get('/today', async (req: AuthRequest, res: Response) => {
  const today = format(new Date(), 'yyyy-MM-dd');

  let ledger = await DailyLedger.findOne({ dateString: today });

  if (!ledger) {
    // Auto-carry opening cash from last closed day
    const lastLedger = await DailyLedger.findOne({ status: 'Closed' }).sort({ date: -1 });
    const openingCash = lastLedger?.closingCash ?? 0;

    ledger = await DailyLedger.create({
      date: new Date(),
      dateString: today,
      openingCash,
      status: 'Open',
      production: { status: 'ON', remarks: '' },
    });
  }

  const sales = await Sale.find({ dailyLedgerId: ledger._id }).populate('customerId', 'name');
  const expenses = await Expense.find({ dailyLedgerId: ledger._id });
  const attendance = await Attendance.find({ dailyLedgerId: ledger._id }).populate('employeeId', 'name role');
  const stocks = await Stock.find({ dailyLedgerId: ledger._id });

  res.json({ success: true, ledger, sales, expenses, attendance, stocks });
});

// GET /api/daily-ledger - Get ledger history (list)
router.get('/', async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 30 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const ledgers = await DailyLedger.find().sort({ date: -1 }).skip(skip).limit(Number(limit));
  const total = await DailyLedger.countDocuments();
  res.json({ success: true, ledgers, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

// GET /api/daily-ledger/:dateString - Get specific day (must come after /today)
router.get('/:dateString', async (req: AuthRequest, res: Response) => {
  const ledger = await DailyLedger.findOne({ dateString: req.params.dateString });
  if (!ledger) {
    res.status(404).json({ success: false, message: 'Ledger not found for this date' });
    return;
  }
  
  const sales = await Sale.find({ dailyLedgerId: ledger._id }).populate('customerId', 'name');
  const expenses = await Expense.find({ dailyLedgerId: ledger._id });
  const attendance = await Attendance.find({ dailyLedgerId: ledger._id }).populate('employeeId', 'name role');
  const stocks = await Stock.find({ dailyLedgerId: ledger._id });

  res.json({ success: true, ledger, sales, expenses, attendance, stocks });
});

// PATCH /api/daily-ledger/:id/close - Close the day
router.patch('/:id/close', async (req: AuthRequest, res: Response) => {
  const ledger = await DailyLedger.findById(req.params.id);
  if (!ledger) throw new ApiError('Ledger not found', 404);
  if (ledger.status === 'Closed') throw new ApiError('Day is already closed', 400);

  // Recalculate totals from actual data
  const salesAgg = await Sale.aggregate([
    { $match: { dailyLedgerId: ledger._id } },
    { $group: { _id: null, total: { $sum: '$grandTotal' }, due: { $sum: '$dueAmount' } } },
  ]);

  const expAgg = await Expense.aggregate([
    { $match: { dailyLedgerId: ledger._id } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const totalSales = salesAgg[0]?.total ?? 0;
  const totalDue = salesAgg[0]?.due ?? 0;
  const totalExpenses = expAgg[0]?.total ?? 0;
  const closingCash = ledger.openingCash + totalSales - totalExpenses - totalDue + ledger.totalDueCollected;

  const updated = await DailyLedger.findByIdAndUpdate(
    req.params.id,
    { status: 'Closed', closedAt: new Date(), totalSales, totalExpenses, totalDue, closingCash },
    { new: true }
  );

  res.json({ success: true, ledger: updated });
});

// PATCH /api/daily-ledger/:id/notes
router.patch('/:id/notes', async (req: AuthRequest, res: Response) => {
  const { notes } = req.body;
  const ledger = await DailyLedger.findByIdAndUpdate(req.params.id, { notes }, { new: true });
  if (!ledger) throw new ApiError('Ledger not found', 404);
  res.json({ success: true, ledger });
});

// PATCH /api/daily-ledger/:id/production - Update production status
router.patch('/:id/production', async (req: AuthRequest, res: Response) => {
  const { status, remarks } = req.body;
  if (!status || !['ON', 'OFF'].includes(status)) {
    throw new ApiError('Production status must be ON or OFF', 400);
  }
  if (status === 'OFF' && !remarks?.trim()) {
    throw new ApiError('Remarks are mandatory when production is OFF', 400);
  }

  const ledger = await DailyLedger.findById(req.params.id);
  if (!ledger) throw new ApiError('Ledger not found', 404);
  if (ledger.status === 'Closed') throw new ApiError('Cannot edit a closed day', 403);

  const updated = await DailyLedger.findByIdAndUpdate(
    req.params.id,
    { production: { status, remarks: remarks || '' } },
    { new: true }
  );

  res.json({ success: true, ledger: updated });
});

export default router;
