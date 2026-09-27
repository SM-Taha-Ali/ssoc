import jwt from 'jsonwebtoken';
import { Company } from '../models/Company.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ssoc-jwt-secret-company-boundary-2026';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Please sign in to your company workspace.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Invalid authentication token.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Session expired or invalid token. Please sign in again.' });
    }

    const company = await Company.findById(decoded.companyId).select('-password');
    if (!company) {
      return res.status(401).json({ error: 'Company workspace not found.' });
    }

    req.company = company;
    req.companyId = company._id;
    next();
  } catch (err) {
    console.error('[Auth Middleware Error]:', err);
    res.status(500).json({ error: 'Authentication verification failure.' });
  }
}

export function generateToken(company) {
  return jwt.sign(
    {
      companyId: company._id,
      companyName: company.companyName
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}
