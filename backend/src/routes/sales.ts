import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Sale from '../models/Sale';
import Customer from '../models/Customer';
import DailyLedger from '../models/DailyLedger';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(protect);

// POST /api/sales - Create a new sale
router.post('/', async (req: AuthRequest, res: Response) => {
  const { customerId, items, paidAmount, paymentMode, remarks, dailyLedgerId, isWalkIn, customerName } = req.body;

  // Validate ledger is open
  const ledger = await DailyLedger.findById(dailyLedgerId);
  if (!ledger) throw new ApiError('Daily ledger not found', 404);
  if (ledger.status === 'Closed') throw new ApiError('Cannot add sale to a closed day', 403);

  // Calculate totals
  const subtotal = items.reduce((sum: number, item: any) => sum + item.quantity * item.unitPrice, 0);
  const totalDiscount = items.reduce((sum: number, item: any) => sum + (item.discount || 0), 0);
  const grandTotal = subtotal - totalDiscount;
  const dueAmount = Math.max(0, grandTotal - paidAmount);

  // Determine payment status
  let paymentStatus: 'Paid' | 'Partial' | 'Pending' = 'Paid';
  if (dueAmount > 0 && paidAmount > 0) paymentStatus = 'Partial';
  if (paidAmount === 0) paymentStatus = 'Pending';

  // Compute item totals
  const processedItems = items.map((item: any) => ({
    ...item,
    totalPrice: item.quantity * item.unitPrice - (item.discount || 0),
  }));

  const sale = await Sale.create({
    customerId,
    customerName: customerName || 'Walk-in Customer',
    isWalkIn: isWalkIn || false,
    items: processedItems,
    subtotal,
    totalDiscount,
    grandTotal,
    paidAmount,
    dueAmount,
    paymentMode,
    paymentStatus,
    dailyLedgerId,
    date: new Date(),
    remarks,
  });

  // Update customer outstanding due
  if (!isWalkIn && dueAmount > 0) {
    await Customer.findByIdAndUpdate(customerId, {
      $inc: { outstandingDue: dueAmount, totalPurchases: grandTotal },
    });
  } else if (!isWalkIn) {
    await Customer.findByIdAndUpdate(customerId, { $inc: { totalPurchases: grandTotal } });
  }

  // Update daily ledger totals
  await DailyLedger.findByIdAndUpdate(dailyLedgerId, {
    $inc: { totalSales: grandTotal, totalDue: dueAmount },
  });

  res.status(201).json({ success: true, sale });
});

// GET /api/sales - Get sales with filters
router.get('/', async (req: AuthRequest, res: Response) => {
  const { date, customerId, ledgerId, page = 1, limit = 50 } = req.query;
  const query: Record<string, any> = {};

  if (date) {
    const d = new Date(date as string);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    query.date = { $gte: start, $lte: end };
  }
  if (customerId) query.customerId = customerId;
  if (ledgerId) query.dailyLedgerId = ledgerId;

  const skip = (Number(page) - 1) * Number(limit);
  const sales = await Sale.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('customerId', 'name phone');
  const total = await Sale.countDocuments(query);

  res.json({ success: true, sales, total });
});

// GET /api/sales/:id - Get single sale
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const sale = await Sale.findById(req.params.id).populate('customerId', 'name phone outstandingDue');
  if (!sale) throw new ApiError('Sale not found', 404);
  res.json({ success: true, sale });
});

// GET /api/sales/customer/:customerId/product/:productName - Price history
router.get('/customer/:customerId/product/:productName', async (req: AuthRequest, res: Response) => {
  const { customerId, productName } = req.params;

  const sales = await Sale.find({
    customerId,
    'items.productName': { $regex: productName, $options: 'i' },
  })
    .sort({ date: -1 })
    .limit(10)
    .select('date items');

  const history = sales.flatMap((sale) =>
    sale.items
      .filter((item) => item.productName.toLowerCase().includes(productName.toLowerCase()))
      .map((item) => ({
        date: sale.date,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
      }))
  );

  const avgPrice = history.length > 0 ? history.reduce((s, h) => s + h.unitPrice, 0) / history.length : 0;

  res.json({ success: true, history, averagePrice: Math.round(avgPrice * 100) / 100 });
});

export default router;
