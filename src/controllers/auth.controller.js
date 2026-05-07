const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, getRefreshExpiryDate } = require('../utils/jwt');
const { AppError, asyncHandler } = require('../utils/errors');

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email already in use', 409);

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt: getRefreshExpiryDate() },
  });

  res.status(201).json({ success: true, data: { user, accessToken, refreshToken } });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('Invalid credentials', 401);

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new AppError('Invalid credentials', 401);

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt: getRefreshExpiryDate() },
  });

  const { password: _, ...safeUser } = user;
  res.json({ success: true, data: { user: safeUser, accessToken, refreshToken } });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid refresh token', 401);
  }

  // Rotate refresh token
  await prisma.refreshToken.delete({ where: { token: refreshToken } });

  const newAccessToken = generateAccessToken(decoded.userId);
  const newRefreshToken = generateRefreshToken(decoded.userId);

  await prisma.refreshToken.create({
    data: { token: newRefreshToken, userId: decoded.userId, expiresAt: getRefreshExpiryDate() },
  });

  res.json({ success: true, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } });
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } }).catch(() => {});
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = { register, login, refresh, logout };
