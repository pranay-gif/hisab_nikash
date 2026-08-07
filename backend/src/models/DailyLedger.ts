import mongoose, { Document, Schema } from 'mongoose';

export type LedgerStatus = 'Open' | 'Closed';

export interface IProduction {
  status: 'ON' | 'OFF';
  remarks?: string;
}

export interface IDailyLedger extends Document {
  date: Date;
  dateString: string;
  openingCash: number;
  totalSales: number;
  totalExpenses: number;
  totalDue: number;
  totalDueCollected: number;
  closingCash: number;
  status: LedgerStatus;
  presentEmployees: number;
  production: IProduction;
  notes?: string;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DailyLedgerSchema = new Schema<IDailyLedger>(
  {
    date: { type: Date, required: true },
    dateString: { type: String, required: true, unique: true },
    openingCash: { type: Number, required: true, default: 0 },
    totalSales: { type: Number, default: 0, min: 0 },
    totalExpenses: { type: Number, default: 0, min: 0 },
    totalDue: { type: Number, default: 0, min: 0 },
    totalDueCollected: { type: Number, default: 0, min: 0 },
    closingCash: { type: Number, default: 0 },
    status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
    presentEmployees: { type: Number, default: 0 },
    production: {
      status: { type: String, enum: ['ON', 'OFF'], default: 'ON' },
      remarks: { type: String, default: '' },
    },
    notes: { type: String },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

DailyLedgerSchema.index({ dateString: -1 });
DailyLedgerSchema.index({ date: -1 });

export default mongoose.model<IDailyLedger>('DailyLedger', DailyLedgerSchema);
