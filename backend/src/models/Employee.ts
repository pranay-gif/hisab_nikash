import mongoose, { Document, Schema } from 'mongoose';

export interface IEmployee extends Document {
  name: string;
  phone?: string;
  role?: string;
  joiningDate?: Date;
  daySalary?: number; // Daily salary (e.g., 300/day)
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    role: { type: String, trim: true },
    joiningDate: { type: Date },
    daySalary: { type: Number, min: 0 },
    isActive: { type: Boolean, default: true },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IEmployee>('Employee', EmployeeSchema);
