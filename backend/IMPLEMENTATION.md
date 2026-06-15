# Backend Implementation Notes

## Why this shape

The current frontend is a static but fairly complete product surface. It already promises:

- live account onboarding
- dashboard portfolio data
- spot and pro trading
- deposits and withdrawals
- P2P trading
- earn products
- developer API access
- security controls

Because of that, the backend should start as a modular monolith instead of pretending to be many microservices on day one. This repo now uses a single Fastify API with domain modules that can later be extracted if scale or team boundaries require it.

## Implemented now

- Fastify application bootstrap
- Prisma schema for `User`, `UserProfile`, and `AuthSession`
- Auth service with:
  - register
  - login
  - refresh with token rotation
  - logout current session
  - logout all sessions
- global validation and error formatting
- health endpoint

## Important decisions

- Access tokens are JWTs.
- Refresh tokens are opaque random secrets stored only as SHA-256 hashes in the database.
- Passwords use `bcrypt`.
- Registration accepts profile fields from the `OpenAccountPage` UI so the API contract already matches the frontend.
- Session records capture IP, user-agent, and device name to support future account-security screens.

## Next recommended backend slices

1. Add `GET /auth/me` and protected route middleware for the frontend session bootstrap.
2. Add auth rate limiting and brute-force protection.
3. Add email verification and password reset.
4. Add user profile/KYC document upload endpoints for the live account flow.
5. Add wallet, market, and dashboard read APIs before trading write APIs.
