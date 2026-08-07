import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import 'express-async-errors';
import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import customerRoutes from './routes/customers';
import employeeRoutes from './routes/employees';
import saleRoutes from './routes/sales';
import expenseRoutes from './routes/expenses';
import stockRoutes from './routes/stocks';
import attendanceRoutes from './routes/attendance';
import duePaymentRoutes from './routes/duePayments';
import dailyLedgerRoutes from './routes/dailyLedger';
import reportRoutes from './routes/reports';
import dashboardRoutes from './routes/dashboard';
import settingsRoutes from './routes/settings';
import productRoutes from './routes/products';

const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/due-payments', duePaymentRoutes);
app.use('/api/daily-ledger', dailyLedgerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/products', productRoutes);

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

start();

export default app;
