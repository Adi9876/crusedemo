# Cruse X Backend

Fastify + Prisma backend scaffold for the Cruse X trading platform. The first implemented slice is the auth service.

## Current Scope

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /health`

The auth layer currently supports:

- user registration with the fields implied by the live account UI
- bcrypt password hashing
- JWT access token issuance
- refresh-token-backed session rotation
- session revocation for current session or all sessions
- device, user-agent, and IP tracking per session

## Quick Start

1. Copy `.env.example` to `.env` and update the secrets and `DATABASE_URL`.
2. Install dependencies with `npm install`.
3. Generate the Prisma client with `npm run prisma:generate`.
4. Create the database schema with `npm run prisma:migrate`.
5. Start the API with `npm run dev`.

Default local URL: `http://localhost:4000`

## Request Examples

### Register

```json
POST /auth/register
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@example.com",
  "phone": "+1 (555) 123-4567",
  "dateOfBirth": "1994-02-18",
  "addressLine1": "123 Main Street, Apt 4B",
  "city": "New York",
  "postalCode": "10001",
  "country": "United States",
  "password": "SecurePass123",
  "acceptTerms": true,
  "deviceName": "MacBook Pro"
}
```

### Login

```json
POST /auth/login
{
  "email": "john.smith@example.com",
  "password": "SecurePass123",
  "deviceName": "MacBook Pro"
}
```

### Refresh

```json
POST /auth/refresh
{
  "refreshToken": "..."
}
```

### Logout

Current session:

```json
POST /auth/logout
{
  "refreshToken": "..."
}
```

All sessions for the authenticated user:

```json
POST /auth/logout
Authorization: Bearer <access-token>

{
  "logoutAll": true
}
```

## Project Structure

```text
backend/
├── prisma/
│   └── schema.prisma
└── src/
    ├── config/
    ├── lib/
    └── modules/
        ├── auth/
        └── health/
```
