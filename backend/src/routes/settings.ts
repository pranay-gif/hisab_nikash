import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Settings from '../models/Settings';

const router = Router();
router.use(protect);

router.get('/', async (_req: AuthRequest, res: Response) => {
  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});
  res.json({ success: true, settings });
});

router.patch('/', async (req: AuthRequest, res: Response) => {
  const settings = await Settings.findOneAndUpdate({}, req.body, { new: true, upsert: true });
  res.json({ success: true, settings });
});

export default router;
