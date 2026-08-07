import mongoose, { Document, Schema } from 'mongoose';

export interface IExpense extends Document {
  category: string;           // Free-text, no enum restriction
  amount: number;
  paymentMode: 'Cash' | 'UPI';
  description?: string;
  date: Date;
  dailyLedgerId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    category: {
      type: String,
      required: true,
      trim: true,
      // NO enum — free text with autocomplete on frontend
    },
    amount: { type: Number, required: true, min: 0 },
    paymentMode: { type: String, enum: ['Cash', 'UPI'], required: true },
    description: { type: String, trim: true },
    date: { type: Date, required: true },
    dailyLedgerId: { type: Schema.Types.ObjectId, ref: 'DailyLedger', required: true },
  },
  { timestamps: true }
);

ExpenseSchema.index({ date: -1 });
ExpenseSchema.index({ dailyLedgerId: 1 });
ExpenseSchema.index({ category: 1 });

export default mongoose.model<IExpense>('Expense', ExpenseSchema);
