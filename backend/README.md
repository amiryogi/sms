# K-12 School Management System - Backend

A comprehensive school management system backend built with Node.js, Express, and Prisma ORM.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Multi-school Ready**: Architecture supports multiple schools
- **Complete Academic Management**: Classes, sections, subjects, academic years
- **Dynamic Subjects**: Subjects can be assigned per class per academic year
- **Teacher Assignments**: Fine-grained teacher-subject-section assignments
- **Student Management**: Profiles, enrollment, parent linking
- **Attendance System**: Daily attendance with teacher access control
- **Exam & Results**: Exam creation, marks entry, report cards
- **LMS/Assignments**: Assignment creation, submission, grading
- **Notices**: Announcement system with target audience

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Validation**: express-validator
- **Security**: Helmet, CORS

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.js           # Database seeder
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Express middleware
│   ├── routes/           # API routes
│   ├── utils/            # Utility functions
│   ├── app.js            # Express app setup
│   └── server.js         # Server entry point
├── uploads/              # File uploads directory
├── .env                  # Environment variables
├── .env.example          # Environment template
└── package.json          # Dependencies
```

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8.0+

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```

4. Push schema to database:
   ```bash
   npm run prisma:push
   ```

5. Seed the database:
   ```bash
   npm run seed
   ```

6. Start development server:
   ```bash
   npm run dev
   ```

### Default Admin Credentials

- **Email**: admin@demoschool.edu.np
- **Password**: Admin@123
- **School Code**: DEMO001

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user profile
- `PUT /api/v1/auth/change-password` - Change password

### Users, Students, Teachers, etc.
(To be implemented in subsequent steps)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | development |
| `PORT` | Server port | 5000 |
| `DATABASE_URL` | MySQL connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | Access token expiry | 1d |
| `JWT_REFRESH_SECRET` | Refresh token secret | - |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | 7d |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:3000 |

## Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:push` - Push schema to database
- `npm run prisma:migrate` - Run migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run seed` - Seed the database

## License

ISC
