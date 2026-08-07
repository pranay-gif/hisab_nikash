import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import DuePayment from '../models/DuePayment';
import Sale from '../models/Sale';
import Customer from '../models/Customer';
import DailyLedger from '../models/DailyLedger';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(protect);

// POST /api/due-payments - Receive a payment
router.post('/', async (req: AuthRequest, res: Response) => {
  const { saleId, amount, paymentMode, notes } = req.body;
  if (!saleId || !amount || !paymentMode) throw new ApiError('saleId, amount, and paymentMode are required', 400);

  const sale = await Sale.findById(saleId);
  if (!sale) throw new ApiError('Sale not found', 404);
  if (sale.dueAmount <= 0) throw new ApiError('This sale has no outstanding due', 400);
  if (amount > sale.dueAmount) throw new ApiError(`Payment exceeds due amount of ₹${sale.dueAmount}`, 400);

  const remainingDue = sale.dueAmount - amount;

  // Create payment record
  const payment = await DuePayment.create({
    customerId: sale.customerId,
    customerName: sale.customerName,
    saleId: sale._id,
    amount,
    paymentMode,
    remainingDue,
    date: new Date(),
    notes,
  });

  // Update sale — only dueAmount and paymentStatus can change
  await Sale.findByIdAndUpdate(saleId, {
    $inc: { dueAmount: -amount, paidAmount: amount },
    paymentStatus: remainingDue === 0 ? 'Paid' : 'Partial',
  });

  // Update customer outstanding due
  await Customer.findByIdAndUpdate(sale.customerId, {
    $inc: { outstandingDue: -amount },
  });

  // Update today's ledger due collected (find today's open ledger)
  const todayStr = new Date().toISOString().slice(0, 10);
  await DailyLedger.findOneAndUpdate(
    { dateString: todayStr },
    { $inc: { totalDueCollected: amount } }
  );

  res.status(201).json({ success: true, payment, remainingDue });
});

// GET /api/due-payments/customer/:customerId
router.get('/customer/:customerId', async (req: AuthRequest, res: Response) => {
  const payments = await DuePayment.find({ customerId: req.params.customerId }).sort({ date: -1 });
  res.json({ success: true, payments });
});

// GET /api/due-payments/sale/:saleId
router.get('/sale/:saleId', async (req: AuthRequest, res: Response) => {
  const payments = await DuePayment.find({ saleId: req.params.saleId }).sort({ date: -1 });
  res.json({ success: true, payments });
});

// GET /api/due-payments - All pending dues
router.get('/', async (req: AuthRequest, res: Response) => {
  const { status = 'pending' } = req.query;
  const sales = await Sale.find({ dueAmount: { $gt: 0 } })
    .populate('customerId', 'name phone')
    .sort({ date: -1 });

  res.json({ success: true, pendingSales: sales });
});

export default router;
