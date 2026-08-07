import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import DailyLedger from '../models/DailyLedger';
import Sale from '../models/Sale';
import Expense from '../models/Expense';
import Customer from '../models/Customer';

const router = Router();
router.use(protect);

// GET /api/dashboard
router.get('/', async (_req: AuthRequest, res: Response) => {
  const today = new Date().toISOString().slice(0, 10);

  const [todayLedger, recentSales, topCustomers, pendingDues] = await Promise.all([
    DailyLedger.findOne({ dateString: today }),
    Sale.find().sort({ createdAt: -1 }).limit(10).select('customerName grandTotal paidAmount dueAmount paymentStatus date items'),
    Customer.find({ outstandingDue: { $gt: 0 } }).sort({ outstandingDue: -1 }).limit(5).select('name outstandingDue phone'),
    Sale.countDocuments({ dueAmount: { $gt: 0 } }),
  ]);

  // Last 7 days trend
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const weekTrend = await DailyLedger.find({ date: { $gte: sevenDaysAgo } })
    .sort({ date: 1 })
    .select('dateString totalSales totalExpenses closingCash');

  res.json({
    success: true,
    today: {
      totalSales: todayLedger?.totalSales ?? 0,
      totalExpenses: todayLedger?.totalExpenses ?? 0,
      totalDue: todayLedger?.totalDue ?? 0,
      closingCash: todayLedger?.closingCash ?? 0,
      openingCash: todayLedger?.openingCash ?? 0,
      presentEmployees: todayLedger?.presentEmployees ?? 0,
      status: todayLedger?.status ?? 'Open',
    },
    recentSales,
    topCustomers,
    pendingDues,
    weekTrend,
  });
});

export default router;
