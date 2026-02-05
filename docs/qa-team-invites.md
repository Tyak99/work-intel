# QA Test Documentation: Team Member Invite System

**Feature**: Team Member Invite System
**Branch**: `product-revamp`
**Migration**: `20260204091541_create_team_invites_table`

---

## Overview

This feature adds a complete invite system for team members. Admins can send email invites to new users, track pending invites, resend or revoke them. Invited users are automatically added to the team upon OAuth login.

---

## Database Changes

### New Table: `team_invites`

```sql
CREATE TABLE team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  github_username TEXT,
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, email)
);

-- Indexes
CREATE INDEX idx_team_invites_token ON team_invites(token);
CREATE INDEX idx_team_invites_email ON team_invites(email);
```

### Validation Queries

```sql
-- Verify table exists with correct structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'team_invites';

-- Verify indexes exist
SELECT indexname FROM pg_indexes WHERE tablename = 'team_invites';

-- Verify foreign keys
SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'team_invites' AND tc.constraint_type = 'FOREIGN KEY';
```

---

## API Endpoints

### 1. List Pending Invites

**Endpoint**: `GET /api/teams/{teamId}/invites`
**Authentication**: Required (session cookie)
**Authorization**: Team admin only

#### Request
```
GET /api/teams/550e8400-e29b-41d4-a716-446655440000/invites
Cookie: work_intel_session=<token>
```

#### Success Response (200)
```json
{
  "invites": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "email": "newuser@example.com",
      "role": "member",
      "github_username": "newuser",
      "created_at": "2026-02-04T09:00:00.000Z",
      "last_sent_at": "2026-02-04T09:00:00.000Z",
      "invited_by": "770e8400-e29b-41d4-a716-446655440002",
      "users": {
        "display_name": "Admin User",
        "email": "admin@example.com"
      }
    }
  ]
}
```

#### Error Responses
| Status | Response | Condition |
|--------|----------|-----------|
| 401 | `{"error": "Unauthorized"}` | No session cookie |
| 403 | `{"error": "Forbidden: Admin access required"}` | User is not team admin |
| 500 | `{"error": "Failed to list invites"}` | Database error |

---

### 2. Send Invite

**Endpoint**: `POST /api/teams/{teamId}/invites`
**Authentication**: Required (session cookie)
**Authorization**: Team admin only

#### Request
```
POST /api/teams/550e8400-e29b-41d4-a716-446655440000/invites
Cookie: work_intel_session=<token>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "role": "member",              // optional, defaults to "member"
  "github_username": "newuser"   // optional
}
```

#### Success Response - New Invite (201)
```json
{
  "invite": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "team_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "newuser@example.com",
    "role": "member",
    "github_username": "newuser",
    "token": "abc123...",
    "invited_by": "770e8400-e29b-41d4-a716-446655440002",
    "created_at": "2026-02-04T09:00:00.000Z",
    "last_sent_at": "2026-02-04T09:00:00.000Z"
  },
  "emailSent": true
}
```

#### Success Response - Upsert Existing (200)
```json
{
  "invite": { ... },
  "message": "Invite updated and resent"
}
```

#### Error Responses
| Status | Response | Condition |
|--------|----------|-----------|
| 400 | `{"error": "Email is required"}` | Missing email in body |
| 401 | `{"error": "Unauthorized"}` | No session cookie |
| 403 | `{"error": "Forbidden: Admin access required"}` | User is not team admin |
| 404 | `{"error": "Team not found"}` | Invalid team ID |
| 409 | `{"error": "User is already a team member"}` | Email belongs to existing member |
| 500 | `{"error": "Failed to create invite"}` | Database error |

---

### 3. Resend Invite

**Endpoint**: `POST /api/teams/{teamId}/invites/{inviteId}/resend`
**Authentication**: Required (session cookie)
**Authorization**: Team admin only

#### Request
```
POST /api/teams/550e8400.../invites/660e8400.../resend
Cookie: work_intel_session=<token>
```

#### Success Response (200)
```json
{
  "success": true
}
```

#### Error Responses
| Status | Response | Condition |
|--------|----------|-----------|
| 401 | `{"error": "Unauthorized"}` | No session cookie |
| 403 | `{"error": "Forbidden: Admin access required"}` | User is not team admin |
| 404 | `{"error": "Invite not found"}` | Invalid invite ID or wrong team |
| 404 | `{"error": "Team not found"}` | Invalid team ID |
| 500 | `{"error": "Failed to send email"}` | Email service error |

---

### 4. Revoke Invite

**Endpoint**: `DELETE /api/teams/{teamId}/invites/{inviteId}`
**Authentication**: Required (session cookie)
**Authorization**: Team admin only

#### Request
```
DELETE /api/teams/550e8400.../invites/660e8400...
Cookie: work_intel_session=<token>
```

#### Success Response (200)
```json
{
  "success": true
}
```

#### Error Responses
| Status | Response | Condition |
|--------|----------|-----------|
| 401 | `{"error": "Unauthorized"}` | No session cookie |
| 403 | `{"error": "Forbidden: Admin access required"}` | User is not team admin |
| 404 | `{"error": "Invite not found"}` | Invalid invite ID or wrong team |
| 500 | `{"error": "Failed to revoke invite"}` | Database error |

---

### 5. Accept Invite (Public)

**Endpoint**: `GET /api/invites/{token}`
**Authentication**: None (public endpoint)

#### Request
```
GET /api/invites/abc123def456...
```

#### Success Response (302 Redirect)
- Sets `pending_team_invite` cookie with token
- Redirects to `/login?invite=true&team={teamName}`

#### Error Response (302 Redirect)
- Invalid/revoked token: Redirects to `/login?error=Invalid%20or%20expired%20invitation`
- Server error: Redirects to `/login?error=Failed%20to%20process%20invitation`

---

## Test Scenarios

### Happy Path Tests

#### TC-001: Send invite to new email
1. Login as team admin
2. POST `/api/teams/{teamId}/invites` with `{"email": "new@example.com"}`
3. **Verify**: 201 response, invite in database, email sent
4. **DB Check**: `SELECT * FROM team_invites WHERE email = 'new@example.com'`

#### TC-002: Accept invite and auto-join team
1. Create invite for `test@example.com`
2. GET `/api/invites/{token}` (simulating email link click)
3. **Verify**: Redirect to `/login?invite=true&team=...`
4. **Verify**: `pending_team_invite` cookie is set
5. Complete OAuth login with `test@example.com`
6. **Verify**: User is added to `team_members` table
7. **Verify**: Invite is deleted from `team_invites`
8. **Verify**: Redirect to `/team/{slug}?joined=true`

#### TC-003: Resend invite
1. Create invite for `test@example.com`
2. Note the `last_sent_at` timestamp
3. Wait 1+ second
4. POST `/api/teams/{teamId}/invites/{inviteId}/resend`
5. **Verify**: 200 response
6. **Verify**: `last_sent_at` is updated
7. **Verify**: New email is sent

#### TC-004: Revoke invite
1. Create invite
2. DELETE `/api/teams/{teamId}/invites/{inviteId}`
3. **Verify**: 200 response
4. **Verify**: Invite deleted from database
5. GET `/api/invites/{token}` with old token
6. **Verify**: Redirects with error message

#### TC-005: Auto-join by email (no invite click)
1. Create invite for `existing@example.com`
2. User signs up via OAuth with `existing@example.com` (without clicking invite link)
3. **Verify**: `processInvitesByEmail()` runs during OAuth callback
4. **Verify**: User is added to team
5. **Verify**: Invite is deleted

---

### Edge Case Tests

#### TC-101: Invite existing team member
1. Add `user@example.com` as team member
2. POST invite for `user@example.com`
3. **Verify**: 409 response with `"User is already a team member"`

#### TC-102: Duplicate invite (upsert)
1. Create invite for `test@example.com` with `role: "member"`
2. Create another invite for `test@example.com` with `role: "admin"`
3. **Verify**: 200 response (not 201)
4. **Verify**: Only one row in database with updated role
5. **Verify**: `last_sent_at` is updated

#### TC-103: Non-admin attempts to send invite
1. Login as team member (not admin)
2. POST `/api/teams/{teamId}/invites`
3. **Verify**: 403 response

#### TC-104: Invite to wrong team
1. Create invite on Team A
2. Try to revoke via Team B's endpoint
3. **Verify**: 404 response

#### TC-105: Revoked invite link
1. Create invite
2. Revoke invite
3. Click accept link
4. **Verify**: Redirect to login with error

---

## Data Setup Requirements

### Prerequisites
1. At least one team exists in `teams` table
2. At least one user with admin role in `team_members`
3. Valid session for admin user

### Test Data SQL
```sql
-- Create test team
INSERT INTO teams (id, name, slug, created_by)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Test Team', 'test-team',
        '770e8400-e29b-41d4-a716-446655440002');

-- Create admin member
INSERT INTO team_members (team_id, user_id, role)
VALUES ('550e8400-e29b-41d4-a716-446655440000',
        '770e8400-e29b-41d4-a716-446655440002', 'admin');
```

---

## Email Testing

### Email Template Verification
- Subject: `You're invited to join {teamName} on Work Intel`
- From: `Work Intel <reports@work-intel.vercel.app>` (or configured `EMAIL_FROM_ADDRESS`)
- Body contains:
  - Inviter's name
  - Team name
  - Role (admin/member)
  - CTA button linking to `/api/invites/{token}`

### Environment Variables Required
- `RESEND_API_KEY` - Resend API key for email sending
- `NEXT_PUBLIC_BASE_URL` - Base URL for invite links
- `EMAIL_FROM_ADDRESS` - Sender email (optional, has default)

---

## Cookie Details

### `pending_team_invite` Cookie
- **Set by**: `/api/invites/{token}` endpoint
- **Read by**: OAuth callback (`/api/auth/nylas/callback`)
- **Deleted by**: OAuth callback after processing
- **Properties**:
  - `httpOnly: true`
  - `secure: true` (in production)
  - `sameSite: 'lax'`
  - `maxAge: 3600` (1 hour)

---

## Frontend Integration

### Zustand Store Actions
```typescript
// Fetch pending invites (admin only)
fetchInvites(teamId: string): Promise<void>

// Send new invite
sendInvite(teamId: string, email: string, githubUsername?: string, role?: 'admin' | 'member'): Promise<void>

// Resend invite email
resendInvite(teamId: string, inviteId: string): Promise<void>

// Revoke invite
revokeInvite(teamId: string, inviteId: string): Promise<void>
```

### UI Component: `components/team/member-management.tsx`
- Displays pending invites section for admins
- Shows email, role, `last_sent_at` timestamp
- Resend button (with loading state)
- Revoke button (trash icon)
- "Send Invite" form (replaces old "Add Member")

---

*Generated by Claude Code*
