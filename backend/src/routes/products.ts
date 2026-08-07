import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Product from '../models/Product';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const { search } = req.query;
  const query: Record<string, any> = { isActive: true };
  if (search) query.name = { $regex: search, $options: 'i' };
  const products = await Product.find(query).sort({ name: 1 });
  res.json({ success: true, products });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, unit, defaultPrice, category } = req.body;
  if (!name) throw new ApiError('Product name is required', 400);
  const product = await Product.create({ name, unit, defaultPrice, category });
  res.status(201).json({ success: true, product });
});

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!product) throw new ApiError('Product not found', 404);
  res.json({ success: true, product });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!product) throw new ApiError('Product not found', 404);
  res.json({ success: true, message: 'Product deactivated' });
});

export default router;
