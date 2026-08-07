import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Settings from '../models/Settings';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

const generateToken = (id: string, email: string, role: string): string => {
  return jwt.sign({ id, email, role }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
};

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) throw new ApiError('All fields are required', 400);

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError('Email already registered', 400);

  const user = await User.create({ name, email, password, role: 'owner' });

  // Create default settings on first user registration
  const existingSettings = await Settings.findOne();
  if (!existingSettings) await Settings.create({ businessName: 'Yummy Eats' });

  const token = generateToken(user._id.toString(), user.email, user.role);
  res.status(201).json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError('Email and password are required', 400);

  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError('Invalid email or password', 401);
  }
  if (!user.isActive) throw new ApiError('Account is disabled', 403);

  const token = generateToken(user._id.toString(), user.email, user.role);
  res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) throw new ApiError('Not authorized', 401);
  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
  const user = await User.findById(decoded.id).select('-password');
  if (!user) throw new ApiError('User not found', 404);
  res.json({ success: true, user });
});

export default router;
