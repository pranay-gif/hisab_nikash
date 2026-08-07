import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Customer from '../models/Customer';
import Sale from '../models/Sale';
import DuePayment from '../models/DuePayment';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(protect);

// GET /api/customers - List all customers
router.get('/', async (req: AuthRequest, res: Response) => {
  const { search, page = 1, limit = 50 } = req.query;
  const query: Record<string, any> = { isActive: true, isWalkIn: false };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const customers = await Customer.find(query).sort({ name: 1 }).skip(skip).limit(Number(limit));
  const total = await Customer.countDocuments(query);

  res.json({ success: true, customers, total });
});

// GET /api/customers/:id - Get customer with stats
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new ApiError('Customer not found', 404);

  const recentSales = await Sale.find({ customerId: req.params.id }).sort({ date: -1 }).limit(20).select('-__v');
  const duePayments = await DuePayment.find({ customerId: req.params.id }).sort({ date: -1 }).limit(20);
  const pendingSales = await Sale.find({ customerId: req.params.id, dueAmount: { $gt: 0 } }).select('date grandTotal dueAmount paymentStatus');

  res.json({ success: true, customer, recentSales, duePayments, pendingSales });
});

// POST /api/customers - Create customer
router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, phone, address, notes } = req.body;
  if (!name) throw new ApiError('Customer name is required', 400);

  // Check for duplicate phone
  if (phone) {
    const existing = await Customer.findOne({ phone });
    if (existing) throw new ApiError('A customer with this phone number already exists', 400);
  }

  const customer = await Customer.create({ name, phone, address, notes });
  res.status(201).json({ success: true, customer });
});

// PATCH /api/customers/:id - Update customer
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const { name, phone, address, notes } = req.body;
  const customer = await Customer.findByIdAndUpdate(req.params.id, { name, phone, address, notes }, { new: true, runValidators: true });
  if (!customer) throw new ApiError('Customer not found', 404);
  res.json({ success: true, customer });
});

// DELETE /api/customers/:id - Soft delete
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const customer = await Customer.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!customer) throw new ApiError('Customer not found', 404);
  res.json({ success: true, message: 'Customer deactivated' });
});

export default router;
