const { verifyAccessToken } = require('../utils/jwt');
const { AppError } = require('../utils/errors');
const prisma = require('../config/prisma');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('No token provided', 401));
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) return next(new AppError('User not found', 401));

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401));
    }
    return next(new AppError('Invalid token', 401));
  }
};

// Check if user is a project member and attach their project role
const requireProjectAccess = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id;
    const userId = req.user.id;

    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!member) {
      return next(new AppError('You are not a member of this project', 403));
    }

    req.projectRole = member.role;
    next();
  } catch (err) {
    next(err);
  }
};

const requireProjectAdmin = (req, res, next) => {
  if (req.projectRole !== 'ADMIN') {
    return next(new AppError('Admin access required', 403));
  }
  next();
};

module.exports = { authenticate, requireProjectAccess, requireProjectAdmin };
