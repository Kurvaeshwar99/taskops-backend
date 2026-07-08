# Team Task Manager — Backend

Full REST API for a team task management application built with Node.js, Express, PostgreSQL, and Prisma.

---

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: JWT (access + refresh tokens with rotation)
- **Validation**: Zod
- **Scheduling**: node-cron (auto-marks overdue tasks hourly)
- **Security**: bcryptjs, express-rate-limit, CORS

---

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.js             # Demo data seeder
├── src/
│   ├── config/
│   │   └── prisma.js       # Prisma client singleton
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── project.controller.js
│   │   ├── task.controller.js
│   │   └── dashboard.controller.js
│   ├── middleware/
│   │   ├── auth.js         # JWT + RBAC middleware
│   │   ├── errorHandler.js # Global error handler
│   │   └── validate.js     # Zod schemas + validator
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── project.routes.js
│   │   ├── task.routes.js
│   │   └── dashboard.routes.js
│   ├── services/
│   │   └── cron.service.js # Overdue task cron job
│   └── index.js            # App entry point
├── .env.example
└── package.json
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/taskmanager"
JWT_SECRET="change-this-to-a-random-32-char-string"
JWT_REFRESH_SECRET="change-this-to-another-random-32-char-string"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:5173"
PORT=3000
```

### 3. Set up database
```bash
# Create the database
createdb taskmanager

# Run migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate
```

### 4. Seed demo data
```bash
npm run db:seed
```

Demo accounts created:
| Name          | Email               | Password     | Role   |
|---------------|---------------------|--------------|--------|
| Alice Admin   | alice@example.com   | password123  | ADMIN  |
| Bob Member    | bob@example.com     | password123  | MEMBER |
| Carol Member  | carol@example.com   | password123  | MEMBER |

### 5. Start the server
```bash
npm run dev    # development (nodemon)
npm start      # production
```

Server runs at: `http://localhost:3000`

---

## API Reference

### Auth — `/api/auth`

| Method | Endpoint    | Body                            | Auth | Description          |
|--------|-------------|----------------------------------|------|----------------------|
| POST   | /register   | `{name, email, password}`       | No   | Create account       |
| POST   | /login      | `{email, password}`             | No   | Login, get tokens    |
| POST   | /refresh    | `{refreshToken}`                | No   | Rotate tokens        |
| POST   | /logout     | `{refreshToken}`                | No   | Invalidate token     |

### Users — `/api/users`

| Method | Endpoint | Body              | Auth | Description        |
|--------|----------|-------------------|------|--------------------|
| GET    | /me      | —                 | Yes  | Current user info  |
| PUT    | /me      | `{name?, email?}` | Yes  | Update profile     |

### Projects — `/api/projects`

| Method | Endpoint              | Body                    | Auth  | Role   | Description          |
|--------|-----------------------|--------------------------|-------|--------|----------------------|
| GET    | /                     | —                        | Yes   | Any    | List my projects     |
| POST   | /                     | `{name, description?}`  | Yes   | Any    | Create project       |
| GET    | /:id                  | —                        | Yes   | Member | Project + members    |
| PUT    | /:id                  | `{name?, description?}` | Yes   | Admin  | Update project       |
| DELETE | /:id                  | —                        | Yes   | Admin  | Delete project       |
| POST   | /:id/members          | `{email, role}`         | Yes   | Admin  | Add member           |
| DELETE | /:id/members/:userId  | —                        | Yes   | Admin  | Remove member        |

### Tasks — `/api/projects/:projectId/tasks`

| Method | Endpoint                    | Body                                          | Auth  | Role   | Description          |
|--------|-----------------------------|------------------------------------------------|-------|--------|----------------------|
| GET    | /                           | Query: `status, priority, assigneeId, overdue` | Yes   | Member | List tasks           |
| POST   | /                           | `{title, description?, priority?, dueDate?, assigneeId?}` | Yes | Admin | Create task |
| GET    | /:taskId                    | —                                              | Yes   | Member | Task detail          |
| PUT    | /:taskId                    | `{title?, description?, status?, priority?, dueDate?, assigneeId?}` | Yes | Admin/Assignee | Update task |
| DELETE | /:taskId                    | —                                              | Yes   | Admin  | Delete task          |
| POST   | /:taskId/comments           | `{content}`                                   | Yes   | Member | Add comment          |
| GET    | /:taskId/comments           | —                                              | Yes   | Member | List comments        |

### Dashboard — `/api/dashboard`

| Method | Endpoint | Auth | Description                                                   |
|--------|----------|------|---------------------------------------------------------------|
| GET    | /        | Yes  | Stats: totalProjects, totalTasks, tasksByStatus, overdue, etc |

---

## RBAC Rules

| Action                    | ADMIN | MEMBER (own task) | MEMBER (others) |
|---------------------------|-------|-------------------|-----------------|
| View project/tasks        | ✅    | ✅                | ✅              |
| Create task               | ✅    | ❌                | ❌              |
| Update task (all fields)  | ✅    | ❌                | ❌              |
| Update task status        | ✅    | ✅                | ❌              |
| Delete task               | ✅    | ❌                | ❌              |
| Add/remove members        | ✅    | ❌                | ❌              |
| Add comments              | ✅    | ✅                | ✅              |

---

## Deployment (Railway)

1. Push to GitHub
2. Create a new Railway project → "Deploy from GitHub repo"
3. Add a PostgreSQL plugin
4. Set environment variables in Railway dashboard
5. Set start command: `node src/index.js`
6. Add build command: `npx prisma migrate deploy && npx prisma generate`

Railway auto-injects `DATABASE_URL` from the PostgreSQL plugin.

---

## Postman Testing

### Step 1: Register
```
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "name": "Test User",
  "email": "test@example.com",
  "password": "password123"
}
```
Save the `accessToken` from response.

### Step 2: Set Bearer Token
Add `Authorization: Bearer <accessToken>` to all protected requests.

### Step 3: Create a project
```
POST http://localhost:3000/api/projects
Authorization: Bearer <token>

{ "name": "My Project", "description": "Test project" }
```

### Step 4: Create a task
```
POST http://localhost:3000/api/projects/<projectId>/tasks
Authorization: Bearer <token>

{
  "title": "First task",
  "priority": "HIGH",
  "dueDate": "2025-12-31T00:00:00.000Z"
}
```

---

## Health Check

```
GET http://localhost:3000/health
→ { "status": "ok", "timestamp": "..." }
```

