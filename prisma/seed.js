const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean up
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 12);

  // Create users
  const admin = await prisma.user.create({
    data: { name: 'Alice Admin', email: 'alice@example.com', password: hashedPassword, role: 'ADMIN' },
  });

  const member1 = await prisma.user.create({
    data: { name: 'Bob Member', email: 'bob@example.com', password: hashedPassword },
  });

  const member2 = await prisma.user.create({
    data: { name: 'Carol Member', email: 'carol@example.com', password: hashedPassword },
  });

  // Create project
  const project = await prisma.project.create({
    data: {
      name: 'Website Redesign',
      description: 'Revamp the company website with a modern look and better UX',
      ownerId: admin.id,
      members: {
        create: [
          { userId: admin.id, role: 'ADMIN' },
          { userId: member1.id, role: 'MEMBER' },
          { userId: member2.id, role: 'MEMBER' },
        ],
      },
    },
  });

  // Create tasks
  const tasks = [
    { title: 'Design new homepage mockup', status: 'DONE', priority: 'HIGH', assigneeId: member1.id },
    { title: 'Set up React + Vite project', status: 'DONE', priority: 'HIGH', assigneeId: admin.id },
    { title: 'Implement auth flow', status: 'IN_PROGRESS', priority: 'HIGH', assigneeId: admin.id },
    { title: 'Build dashboard components', status: 'TODO', priority: 'MEDIUM', assigneeId: member1.id, dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    { title: 'Write API documentation', status: 'TODO', priority: 'LOW', assigneeId: member2.id, dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
  ];

  for (const t of tasks) {
    const task = await prisma.task.create({
      data: {
        ...t,
        projectId: project.id,
        createdById: admin.id,
        dueDate: t.dueDate || null,
      },
    });

    // Add a comment to first task
    if (t.title.includes('mockup')) {
      await prisma.comment.create({
        data: { content: 'Mockup looks great! Ready for review.', taskId: task.id, authorId: member1.id },
      });
    }
  }

  console.log('✅ Seed complete!');
  console.log('');
  console.log('Demo accounts:');
  console.log('  Admin:   alice@example.com / password123');
  console.log('  Member1: bob@example.com   / password123');
  console.log('  Member2: carol@example.com / password123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

