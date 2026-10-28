const crypto = require('crypto');
const { db } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'scolarite_lmd_super_secret_jwt_key_2026';

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf8');
}

function generateToken(payload, expiresInSeconds = 86400) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp, iat: Math.floor(Date.now() / 1000) };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (signature !== expectedSignature) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return payload;
  } catch (err) {
    return null;
  }
}

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    // If no header, user is guest/unauthenticated
    req.user = null;
    return next ? next() : null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res ? res.status(401).json({ success: false, error: 'Format du token invalide (Bearer token requis)' }) : null;
  }

  const token = parts[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res ? res.status(401).json({ success: false, error: 'Token invalide ou expiré' }) : null;
  }

  const user = db.collection('utilisateurs').findById(decoded.id);
  if (!user || !user.isActive) {
    return res ? res.status(401).json({ success: false, error: 'Utilisateur inactif ou introuvable' }) : null;
  }

  req.user = user;
  if (next) next();
  return user;
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentification obligatoire (401 Unauthorized)'
    });
  }
  if (next) next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentification requise' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Accès refusé (403 Forbidden). Rôle requis : [${roles.join(', ')}]. Votre rôle : ${req.user.role}`
      });
    }
    if (next) next();
  };
}

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  requireAuth,
  requireRole
};
