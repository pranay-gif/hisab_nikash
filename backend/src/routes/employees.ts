import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Employee from '../models/Employee';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(protect);

// GET all active employees (include inactive with ?all=true)
router.get('/', async (req: AuthRequest, res: Response) => {
  const { all } = req.query;
  const query = all === 'true' ? {} : { isActive: true };
  const employees = await Employee.find(query).sort({ name: 1 });
  res.json({ success: true, employees });
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const emp = await Employee.findById(req.params.id);
  if (!emp) throw new ApiError('Employee not found', 404);
  res.json({ success: true, employee: emp });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, phone, role, joiningDate, daySalary, notes } = req.body;
  if (!name) throw new ApiError('Employee name is required', 400);
  const emp = await Employee.create({ name, phone, role, joiningDate, daySalary, notes });
  res.status(201).json({ success: true, employee: emp });
});

// PATCH: Update existing employee (fix: was creating new instead of updating)
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const { name, phone, role, joiningDate, daySalary, notes, isActive } = req.body;
  const emp = await Employee.findByIdAndUpdate(
    req.params.id,
    { name, phone, role, joiningDate, daySalary, notes, isActive },
    { new: true, runValidators: true }
  );
  if (!emp) throw new ApiError('Employee not found', 404);
  res.json({ success: true, employee: emp });
});

// DELETE: Soft delete only — set isActive = false
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const emp = await Employee.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!emp) throw new ApiError('Employee not found', 404);
  res.json({ success: true, message: 'Employee deactivated successfully' });
});

export default router;
