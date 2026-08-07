import mongoose, { Document, Schema } from 'mongoose';

export interface IStock extends Document {
  itemName: string;
  unit: string;
  openingStock: number;    // Yesterday's remaining (carry-forward)
  purchasedQty: number;    // Purchased today
  todayUsage: number;      // Used today
  remainingQty: number;    // Auto-calc: openingStock + purchasedQty - todayUsage
  remarks?: string;
  date: Date;
  dateString: string;      // YYYY-MM-DD for easy querying
  dailyLedgerId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StockSchema = new Schema<IStock>(
  {
    itemName: { type: String, required: true, trim: true, default: 'Maida' },
    unit: { type: String, default: 'Bag', trim: true },
    openingStock: { type: Number, default: 0, min: 0 },
    purchasedQty: { type: Number, required: true, min: 0, default: 0 },
    todayUsage: { type: Number, required: true, min: 0, default: 0 },
    remainingQty: { type: Number, min: 0, default: 0 },
    remarks: { type: String },
    date: { type: Date, required: true },
    dateString: { type: String, required: true },
    dailyLedgerId: { type: Schema.Types.ObjectId, ref: 'DailyLedger', required: true },
  },
  { timestamps: true }
);

// Auto-calculate remaining before save
StockSchema.pre('save', function () {
  this.remainingQty = this.openingStock + this.purchasedQty - this.todayUsage;
  if (this.remainingQty < 0) this.remainingQty = 0;
});

StockSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate() as any;
  if (update && (update.openingStock !== undefined || update.purchasedQty !== undefined || update.todayUsage !== undefined)) {
    // Will be handled in route
  }
});

StockSchema.index({ dateString: -1 });
StockSchema.index({ dailyLedgerId: 1 });
StockSchema.index({ itemName: 1, dateString: -1 });

export default mongoose.model<IStock>('Stock', StockSchema);
