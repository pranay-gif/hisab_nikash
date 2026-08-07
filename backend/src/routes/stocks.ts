import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Stock from '../models/Stock';
import DailyLedger from '../models/DailyLedger';
import { ApiError } from '../middleware/errorHandler';
import { format, subDays } from 'date-fns';

const router = Router();
router.use(protect);

// GET stocks — by ledgerId or date
router.get('/', async (req: AuthRequest, res: Response) => {
  const { ledgerId, date } = req.query;
  const query: Record<string, any> = {};
  if (ledgerId) query.dailyLedgerId = ledgerId;
  if (date) query.dateString = date as string;
  const stocks = await Stock.find(query).sort({ createdAt: -1 });
  res.json({ success: true, stocks });
});

// GET yesterday's remaining for a specific item (for opening stock calculation)
router.get('/yesterday/:itemName', async (req: AuthRequest, res: Response) => {
  const itemName = decodeURIComponent(req.params.itemName);
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  const yesterdayStock = await Stock.findOne({ itemName, dateString: yesterday }).sort({ createdAt: -1 });
  res.json({ success: true, remainingQty: yesterdayStock?.remainingQty ?? 0, dateString: yesterday });
});

// POST: Create today's stock entry
// No purchasedAmount — no delete allowed from frontend
router.post('/', async (req: AuthRequest, res: Response) => {
  const { itemName = 'Maida', unit = 'Bag', openingStock, purchasedQty, todayUsage, remarks, dailyLedgerId } = req.body;

  if (purchasedQty === undefined || todayUsage === undefined || !dailyLedgerId) {
    throw new ApiError('purchasedQty, todayUsage, dailyLedgerId are required', 400);
  }

  const ledger = await DailyLedger.findById(dailyLedgerId);
  if (!ledger) throw new ApiError('Daily ledger not found', 404);
  if (ledger.status === 'Closed') throw new ApiError('Cannot add stock to a closed day', 403);

  // If openingStock not provided, auto-fetch from yesterday
  let opening = openingStock;
  if (opening === undefined || opening === null) {
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const yStock = await Stock.findOne({ itemName, dateString: yesterday }).sort({ createdAt: -1 });
    opening = yStock?.remainingQty ?? 0;
  }

  const remainingQty = Math.max(0, opening + Number(purchasedQty) - Number(todayUsage));

  const stock = new Stock({
    itemName,
    unit,
    openingStock: Number(opening),
    purchasedQty: Number(purchasedQty),
    todayUsage: Number(todayUsage),
    remainingQty,
    remarks,
    date: new Date(),
    dateString: ledger.dateString,
    dailyLedgerId,
  });

  await stock.save();
  res.status(201).json({ success: true, stock });
});

// PATCH: Update stock entry (today only)
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const stockEntry = await Stock.findById(req.params.id);
  if (!stockEntry) throw new ApiError('Stock entry not found', 404);

  const ledger = await DailyLedger.findById(stockEntry.dailyLedgerId);
  if (ledger?.status === 'Closed') throw new ApiError('Cannot edit stock on a closed day', 403);

  const { openingStock, purchasedQty, todayUsage, remarks } = req.body;
  const newOpening = openingStock !== undefined ? Number(openingStock) : stockEntry.openingStock;
  const newPurchased = purchasedQty !== undefined ? Number(purchasedQty) : stockEntry.purchasedQty;
  const newUsage = todayUsage !== undefined ? Number(todayUsage) : stockEntry.todayUsage;
  const newRemaining = Math.max(0, newOpening + newPurchased - newUsage);

  const updated = await Stock.findByIdAndUpdate(
    req.params.id,
    {
      openingStock: newOpening,
      purchasedQty: newPurchased,
      todayUsage: newUsage,
      remainingQty: newRemaining,
      ...(remarks !== undefined && { remarks }),
    },
    { new: true }
  );
  res.json({ success: true, stock: updated });
});

// NOTE: No DELETE route — stock records cannot be deleted per business rules

export default router;
