const prisma = require('../config/prisma');
const { AppError, asyncHandler } = require('../utils/errors');

const listTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { status, priority, assigneeId, overdue } = req.query;

  const where = { projectId };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assigneeId) where.assigneeId = assigneeId;
  if (overdue === 'true') {
    where.dueDate = { lt: new Date() };
    where.status = { not: 'DONE' };
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: tasks });
});

const createTask = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { title, description, priority, dueDate, assigneeId } = req.body;

  // Validate assignee is a project member
  if (assigneeId) {
    const isMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: assigneeId } },
    });
    if (!isMember) throw new AppError('Assignee is not a project member', 400);
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      projectId,
      assigneeId: assigneeId || null,
      createdById: req.user.id,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  res.status(201).json({ success: true, data: task });
});

const getTask = asyncHandler(async (req, res) => {
  const task = await prisma.task.findFirst({
    where: { id: req.params.taskId, projectId: req.params.projectId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
  });

  if (!task) throw new AppError('Task not found', 404);
  res.json({ success: true, data: task });
});

const updateTask = asyncHandler(async (req, res) => {
  const { taskId, projectId } = req.params;
  const isAdmin = req.projectRole === 'ADMIN';

  const task = await prisma.task.findFirst({ where: { id: taskId, projectId } });
  if (!task) throw new AppError('Task not found', 404);

  // Members can only update status, and only on their own tasks
  if (!isAdmin) {
    const isAssignee = task.assigneeId === req.user.id;
    if (!isAssignee) throw new AppError('You can only update your own tasks', 403);

    const allowedFields = ['status'];
    const attemptedFields = Object.keys(req.body);
    const forbidden = attemptedFields.filter((f) => !allowedFields.includes(f));
    if (forbidden.length) throw new AppError('Members can only update task status', 403);
  }

  const { title, description, status, priority, dueDate, assigneeId } = req.body;

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  res.json({ success: true, data: updated });
});

const deleteTask = asyncHandler(async (req, res) => {
  const task = await prisma.task.findFirst({
    where: { id: req.params.taskId, projectId: req.params.projectId },
  });
  if (!task) throw new AppError('Task not found', 404);

  await prisma.task.delete({ where: { id: req.params.taskId } });
  res.json({ success: true, message: 'Task deleted' });
});

const addComment = asyncHandler(async (req, res) => {
  const { taskId, projectId } = req.params;
  const { content } = req.body;

  const task = await prisma.task.findFirst({ where: { id: taskId, projectId } });
  if (!task) throw new AppError('Task not found', 404);

  const comment = await prisma.comment.create({
    data: { content, taskId, authorId: req.user.id },
    include: { author: { select: { id: true, name: true, email: true } } },
  });

  res.status(201).json({ success: true, data: comment });
});

const listComments = asyncHandler(async (req, res) => {
  const { taskId, projectId } = req.params;

  const task = await prisma.task.findFirst({ where: { id: taskId, projectId } });
  if (!task) throw new AppError('Task not found', 404);

  const comments = await prisma.comment.findMany({
    where: { taskId },
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ success: true, data: comments });
});

module.exports = { listTasks, createTask, getTask, updateTask, deleteTask, addComment, listComments };
