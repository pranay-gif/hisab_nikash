import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
  businessName: string;
  businessPhone?: string;
  businessAddress?: string;
  currency: string;
  expenseCategories: string[];
  paymentModes: string[];
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    businessName: { type: String, default: 'Yummy Eats' },
    businessPhone: { type: String },
    businessAddress: { type: String },
    currency: { type: String, default: '₹' },
    expenseCategories: {
      type: [String],
      default: ['Vegetables', 'Gas', 'Milk', 'Salary', 'Electricity', 'Transport', 'Others'],
    },
    paymentModes: { type: [String], default: ['Cash', 'UPI'] },
  },
  { timestamps: true }
);

export default mongoose.model<ISettings>('Settings', SettingsSchema);
