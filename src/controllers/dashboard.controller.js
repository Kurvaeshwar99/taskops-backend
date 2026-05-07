const prisma = require('../config/prisma');
const { asyncHandler } = require('../utils/errors');

const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get user's project IDs
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  const projectIds = memberships.map((m) => m.projectId);

  const [
    totalProjects,
    totalTasks,
    tasksByStatus,
    overdueTasks,
    myTasks,
    recentTasks,
  ] = await Promise.all([
    prisma.project.count({ where: { id: { in: projectIds } } }),

    prisma.task.count({ where: { projectId: { in: projectIds } } }),

    prisma.task.groupBy({
      by: ['status'],
      where: { projectId: { in: projectIds } },
      _count: { status: true },
    }),

    prisma.task.count({
      where: {
        projectId: { in: projectIds },
        status: 'OVERDUE',
      },
    }),

    prisma.task.findMany({
      where: { assigneeId: userId },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),

    prisma.task.findMany({
      where: { projectId: { in: projectIds } },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
  ]);

  const statusMap = {};
  tasksByStatus.forEach((t) => { statusMap[t.status] = t._count.status; });

  res.json({
    success: true,
    data: {
      totalProjects,
      totalTasks,
      tasksByStatus: statusMap,
      overdueTasks,
      myTasks,
      recentActivity: recentTasks,
    },
  });
});

module.exports = { getDashboard };
