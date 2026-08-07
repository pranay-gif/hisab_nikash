import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler';
import User from '../models/User';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const protect = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  let token: string | undefined;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError('Not authorized, no token', 401);
  }

  try {
    const secret = process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, secret) as { id: string; email: string; role: string };
    const user = await User.findById(decoded.id).select('-password');
    if (!user) throw new ApiError('User not found', 401);

    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch {
    throw new ApiError('Not authorized, token failed', 401);
  }
};
