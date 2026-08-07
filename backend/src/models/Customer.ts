import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  outstandingDue: number;
  totalPurchases: number;
  isWalkIn: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    notes: { type: String },
    outstandingDue: { type: Number, default: 0, min: 0 },
    totalPurchases: { type: Number, default: 0, min: 0 },
    isWalkIn: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CustomerSchema.index({ name: 'text', phone: 'text' });

export default mongoose.model<ICustomer>('Customer', CustomerSchema);
