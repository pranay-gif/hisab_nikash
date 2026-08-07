import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  unit?: string;
  defaultPrice?: number;
  category?: string;
  isActive: boolean;
  createdAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    unit: { type: String, default: 'Pcs', trim: true },
    defaultPrice: { type: Number, min: 0 },
    category: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProductSchema.index({ name: 'text' });

export default mongoose.model<IProduct>('Product', ProductSchema);
