const prisma = require('../config/prisma');
const { AppError, asyncHandler } = require('../utils/errors');

const listProjects = asyncHandler(async (req, res) => {
  const memberships = await prisma.projectMember.findMany({
    where: { userId: req.user.id },
    include: {
      project: {
        include: {
          _count: { select: { members: true, tasks: true } },
          owner: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  const projects = memberships.map((m) => ({
    ...m.project,
    myRole: m.role,
  }));

  res.json({ success: true, data: projects });
});

const createProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  const project = await prisma.project.create({
    data: {
      name,
      description,
      ownerId: req.user.id,
      members: {
        create: { userId: req.user.id, role: 'ADMIN' },
      },
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { members: true, tasks: true } },
    },
  });

  res.status(201).json({ success: true, data: { ...project, myRole: 'ADMIN' } });
});

const getProject = asyncHandler(async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      },
      _count: { select: { tasks: true } },
    },
  });

  if (!project) throw new AppError('Project not found', 404);

  res.json({ success: true, data: { ...project, myRole: req.projectRole } });
});

const updateProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: { ...(name && { name }), ...(description !== undefined && { description }) },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });
  res.json({ success: true, data: project });
});

const deleteProject = asyncHandler(async (req, res) => {
  await prisma.project.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Project deleted' });
});

const addMember = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const projectId = req.params.id;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('User not found', 404);

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });
  if (existing) throw new AppError('User is already a member', 409);

  const member = await prisma.projectMember.create({
    data: { projectId, userId: user.id, role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  res.status(201).json({ success: true, data: member });
});

const removeMember = asyncHandler(async (req, res) => {
  const { id: projectId, userId } = req.params;

  // Can't remove the project owner
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (project?.ownerId === userId) throw new AppError('Cannot remove project owner', 400);

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId } },
  });

  res.json({ success: true, message: 'Member removed' });
});

module.exports = { listProjects, createProject, getProject, updateProject, deleteProject, addMember, removeMember };
