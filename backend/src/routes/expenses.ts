import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Expense from '../models/Expense';
import DailyLedger from '../models/DailyLedger';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(protect);

// GET expenses with date or ledgerId filter
router.get('/', async (req: AuthRequest, res: Response) => {
  const { date, ledgerId, category } = req.query;
  const query: Record<string, any> = {};
  if (ledgerId) query.dailyLedgerId = ledgerId;
  if (category) query.category = { $regex: new RegExp(category as string, 'i') };
  if (date) {
    // Find ledger for that date and use its ID
    const ledger = await DailyLedger.findOne({ dateString: date as string });
    if (ledger) {
      query.dailyLedgerId = ledger._id;
    } else {
      return res.json({ success: true, expenses: [] });
    }
  }
  const expenses = await Expense.find(query).sort({ createdAt: -1 });
  res.json({ success: true, expenses });
});

// GET distinct categories (for autocomplete)
router.get('/categories', async (_req: AuthRequest, res: Response) => {
  const categories = await Expense.distinct('category');
  res.json({ success: true, categories: categories.sort() });
});

// POST: Create expense — smart merge if same category on same day
router.post('/', async (req: AuthRequest, res: Response) => {
  const { category, amount, paymentMode, description, dailyLedgerId } = req.body;
  if (!category || !amount || !paymentMode || !dailyLedgerId) {
    throw new ApiError('category, amount, paymentMode, dailyLedgerId are required', 400);
  }

  const ledger = await DailyLedger.findById(dailyLedgerId);
  if (!ledger) throw new ApiError('Daily ledger not found', 404);
  if (ledger.status === 'Closed') throw new ApiError('Cannot add expense to a closed day', 403);

  const numAmount = Number(amount);

  // Smart merge: if same category exists for same day, increase amount
  const existing = await Expense.findOne({
    dailyLedgerId,
    category: { $regex: new RegExp(`^${category.trim()}$`, 'i') },
  });

  if (existing) {
    const oldAmount = existing.amount;
    existing.amount += numAmount;
    if (description) existing.description = description;
    await existing.save();

    // Update ledger total
    await DailyLedger.findByIdAndUpdate(dailyLedgerId, { $inc: { totalExpenses: numAmount } });

    return res.status(200).json({
      success: true,
      expense: existing,
      merged: true,
      message: `Added ₹${numAmount} to existing ${category} (was ₹${oldAmount}, now ₹${existing.amount})`,
    });
  }

  // Create new expense
  const expense = await Expense.create({
    category: category.trim(),
    amount: numAmount,
    paymentMode,
    description,
    date: new Date(),
    dailyLedgerId,
  });

  await DailyLedger.findByIdAndUpdate(dailyLedgerId, { $inc: { totalExpenses: numAmount } });

  res.status(201).json({ success: true, expense, merged: false });
});

// DELETE: Only allowed on open day
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw new ApiError('Expense not found', 404);

  const ledger = await DailyLedger.findById(expense.dailyLedgerId);
  if (ledger?.status === 'Closed') throw new ApiError('Cannot delete from a closed day', 403);

  await DailyLedger.findByIdAndUpdate(expense.dailyLedgerId, { $inc: { totalExpenses: -expense.amount } });
  await expense.deleteOne();

  res.json({ success: true, message: 'Expense deleted' });
});

export default router;
