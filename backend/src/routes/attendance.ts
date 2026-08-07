import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Attendance from '../models/Attendance';
import Employee from '../models/Employee';
import DailyLedger from '../models/DailyLedger';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(protect);

// GET attendance — by ledgerId or date
router.get('/', async (req: AuthRequest, res: Response) => {
  const { ledgerId, date } = req.query;
  const query: Record<string, any> = {};

  if (ledgerId) {
    query.dailyLedgerId = ledgerId;
  } else if (date) {
    // Find ledger for that date
    const ledger = await DailyLedger.findOne({ dateString: date as string });
    if (ledger) {
      query.dailyLedgerId = ledger._id;
    } else {
      return res.json({ success: true, attendance: [] });
    }
  }

  const attendance = await Attendance.find(query).populate('employeeId', 'name role daySalary');
  res.json({ success: true, attendance });
});

// POST /api/attendance/bulk - Save attendance for all employees
router.post('/bulk', async (req: AuthRequest, res: Response) => {
  const { records, dailyLedgerId } = req.body;

  if (!dailyLedgerId) throw new ApiError('dailyLedgerId is required', 400);
  if (!records || !Array.isArray(records)) throw new ApiError('records array is required', 400);

  // Use _id (not id) — fix for the "Daily Ledger not found" bug
  const ledger = await DailyLedger.findById(dailyLedgerId);
  if (!ledger) throw new ApiError('Daily ledger not found', 404);
  if (ledger.status === 'Closed') throw new ApiError('Cannot edit attendance on a closed day', 403);

  const results = [];
  let presentCount = 0;

  for (const record of records) {
    // Validate mandatory remarks for Absent and HalfDay
    if ((record.status === 'Absent' || record.status === 'HalfDay') && !record.remarks?.trim()) {
      throw new ApiError(`Remarks are mandatory for ${record.status} status (Employee: ${record.employeeName || record.employeeId})`, 400);
    }

    const emp = await Employee.findById(record.employeeId);
    if (!emp) continue;

    // Upsert attendance using _id
    const att = await Attendance.findOneAndUpdate(
      { employeeId: record.employeeId, dailyLedgerId },
      {
        employeeName: emp.name,
        status: record.status,
        remarks: record.remarks || '',
        date: new Date(),
        dailyLedgerId,
      },
      { upsert: true, new: true }
    );

    results.push(att);
    if (record.status === 'Present' || record.status === 'HalfDay') presentCount++;
  }

  // Update present employees count on ledger
  await DailyLedger.findByIdAndUpdate(dailyLedgerId, { presentEmployees: presentCount });

  res.json({ success: true, attendance: results, presentCount });
});

export default router;
