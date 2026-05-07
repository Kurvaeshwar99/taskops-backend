const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { asyncHandler } = require('../utils/errors');

const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});

const updateMe = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { ...(name && { name }), ...(email && { email }) },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  res.json({ success: true, data: user });
});

module.exports = { getMe, updateMe };
