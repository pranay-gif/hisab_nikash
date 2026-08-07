import mongoose, { Document, Schema } from 'mongoose';

export interface IDuePayment extends Document {
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  saleId: mongoose.Types.ObjectId;
  amount: number;
  paymentMode: 'Cash' | 'UPI';
  remainingDue: number;
  date: Date;
  notes?: string;
  createdAt: Date;
}

const DuePaymentSchema = new Schema<IDuePayment>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerName: { type: String, required: true },
    saleId: { type: Schema.Types.ObjectId, ref: 'Sale', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMode: { type: String, enum: ['Cash', 'UPI'], required: true },
    remainingDue: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    notes: { type: String },
  },
  { timestamps: true }
);

DuePaymentSchema.index({ customerId: 1, date: -1 });
DuePaymentSchema.index({ saleId: 1 });

export default mongoose.model<IDuePayment>('DuePayment', DuePaymentSchema);
