import mongoose, { Document, Schema } from 'mongoose';

export type AttendanceStatus = 'Present' | 'Absent' | 'HalfDay';

export interface IAttendance extends Document {
  employeeId: mongoose.Types.ObjectId;
  employeeName: string; // denormalized
  date: Date;
  status: AttendanceStatus;
  remarks?: string;
  dailyLedgerId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeName: { type: String, required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['Present', 'Absent', 'HalfDay'], required: true },
    remarks: { type: String },
    dailyLedgerId: { type: Schema.Types.ObjectId, ref: 'DailyLedger', required: true },
  },
  { timestamps: true }
);

AttendanceSchema.index({ date: -1 });
AttendanceSchema.index({ employeeId: 1, date: -1 });
AttendanceSchema.index({ dailyLedgerId: 1 });

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema);
