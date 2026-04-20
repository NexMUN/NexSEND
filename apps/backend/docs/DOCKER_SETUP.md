# Docker Setup Guide

## Prerequisites
- Docker and Docker Compose installed
- Node.js 20+ (for local development)
- Bun package manager

## Quick Start

### 1. Start the infrastructure (PostgreSQL + Redis)
```bash
bun run docker:up
```

This will start:
- PostgreSQL 16 on port 5433
- Redis 7 on port 6380

### 2. Install dependencies
```bash
bun install
```

### 3. Generate Prisma client
```bash
bun run prisma:generate
```

### 4. Run database migrations
```bash
bun run prisma:migrate:dev
```

### 5. Seed the database (optional)
```bash
bun run prisma:seed
```

This will create:
- A test organization
- A service API key (save this!)
- Sample email templates

### 6. Start the application
```bash
bun run start:dev
```

The application will be available at:
- API: http://localhost:8001/api
- Swagger docs: http://localhost:8001/api/docs
- Scalar docs: http://localhost:8001/api/reference
- Prisma Studio: http://localhost:5556 (run `bun run prisma:studio`)

## Docker Commands

### Start services
```bash
bun run docker:up
```

### Stop services
```bash
bun run docker:down
```

### View logs
```bash
bun run docker:logs
```

### Run with app in Docker
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## Database Management

### Prisma Studio (visual database editor)
```bash
bun run prisma:studio
```

### Reset database
```bash
bun run prisma:migrate:reset
```

## Environment Variables

Copy `.env.example` to `.env` and update values as needed:
```bash
cp .env.example .env
```

Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `AWS_REGION`: SES region
- `AWS_ACCESS_KEY_ID`: SES access key
- `AWS_SECRET_ACCESS_KEY`: SES secret key
- `ENCRYPTION_KEY`: For encrypting sensitive data
- `API_KEY_SALT`: For hashing API keys

## Troubleshooting

### Port already in use
If you get "address already in use" errors:
```bash
# Check what's using the ports
lsof -i :5433  # PostgreSQL
lsof -i :6380  # Redis
lsof -i :8001  # App
lsof -i :5556  # Prisma Studio

# Kill the process
kill -9 <PID>
```

### Database connection issues
1. Ensure Docker containers are running: `docker ps`
2. Check container health: `docker-compose ps`
3. View logs: `bun run docker:logs`

### Prisma issues
1. Regenerate client: `bun run prisma:generate`
2. Reset migrations: `bun run prisma:migrate:reset`
3. Check database connection: `bunx prisma db pull`