# Password Recovery Contract

Status: CURRENT for P3 implementation.

## Boundary

Password recovery uses two server routes:

- `POST /api/auth/password-recovery/request`
- `POST /api/auth/password-recovery/reset`

Request responses are account-safe. With a configured email boundary, a valid
request returns `202 {"ok":true}` for both known and unknown addresses. The
route never returns whether an account exists. Without the email boundary it
returns the same `503 RECOVERY_UNAVAILABLE` capability state before account
lookup.

## Token contract

- 32 random bytes encoded as base64url.
- Raw token appears only in the reset URL sent to the account email.
- Database stores SHA-256(token), never the raw token.
- TTL is 30 minutes.
- A new request invalidates the user's previous unused token.
- Reset claim requires matching hash, `used_at IS NULL` and `expires_at > now()`.
- Claim, password update and session invalidation execute in one PostgreSQL
  data-modifying CTE because the repository uses Drizzle's Neon HTTP driver,
  which has no interactive transactions.
- Every successful reset invalidates all sessions for that user.

## Delivery contract

The boundary uses Resend's HTTP API. Required deployment variables:

- `RESEND_API_KEY`
- `AUTH_EMAIL_FROM`
- `AUTH_APP_URL` (recommended canonical public origin for reset links)

Delivery failures invalidate the created token and preserve the generic `202`
external response. Internal failures are logged with a request id and no
email, token, password or reset URL.

## Rate limiting and tests

Recovery requests use an in-memory five-request / fifteen-minute limit keyed by
client IP and normalized email. Mutating recovery tests use synthetic users,
mocked delivery and token fixtures only. No production account or real email
is used by the test suite.
