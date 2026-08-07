import mongoose, { Document, Schema } from 'mongoose';

export interface ISaleItem {
  productName: string;
  productId?: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

export interface ISale extends Document {
  customerId: mongoose.Types.ObjectId;
  customerName: string; // denormalized for history
  isWalkIn: boolean;
  items: ISaleItem[];
  subtotal: number;
  totalDiscount: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  paymentMode: 'Cash' | 'UPI' | 'Mixed';
  paymentStatus: 'Paid' | 'Partial' | 'Pending';
  dailyLedgerId: mongoose.Types.ObjectId;
  date: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>(
  {
    productName: { type: String, required: true, trim: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, required: true, min: 0.01 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SaleSchema = new Schema<ISale>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerName: { type: String, required: true },
    isWalkIn: { type: Boolean, default: false },
    items: { type: [SaleItemSchema], required: true, validate: [(v: ISaleItem[]) => v.length > 0, 'At least one item required'] },
    subtotal: { type: Number, required: true, min: 0 },
    totalDiscount: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, min: 0 },
    dueAmount: { type: Number, required: true, min: 0 },
    paymentMode: { type: String, enum: ['Cash', 'UPI', 'Mixed'], required: true },
    paymentStatus: { type: String, enum: ['Paid', 'Partial', 'Pending'], default: 'Paid' },
    dailyLedgerId: { type: Schema.Types.ObjectId, ref: 'DailyLedger', required: true },
    date: { type: Date, required: true },
    remarks: { type: String },
  },
  { timestamps: true }
);

SaleSchema.index({ customerId: 1, date: -1 });
SaleSchema.index({ dailyLedgerId: 1 });
SaleSchema.index({ date: -1 });

export default mongoose.model<ISale>('Sale', SaleSchema);
