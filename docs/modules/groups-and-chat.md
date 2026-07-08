# User Major — Organization system (Groups)

**Points:** 2 · **Category:** User Management

## Summary

**Groups** are Dicteé’s organization unit: parents create or join groups via email invitation, manage members with **ADMIN** / **MEMBER** roles, and share vocabulary and games within the group.

This maps to the subject’s organization-system module (create/edit/delete org, add/remove users, role-based actions).

## Capabilities

| Action | Who |
|--------|-----|
| Create group | Any registered user |
| Rename / delete group | Admin |
| Invite by email | Admin |
| Accept invitation | Invited user |
| Promote / demote admin | Admin |
| Expel member | Admin |
| Leave group | Member or admin (with rules) |
| Group chat + activity log | Members and admins |

## Demo steps

1. Register → **Create Group** or accept invitation link from email
2. **Manage Group** → member list, chat, admin actions
3. **Send Invite** → show email flow and `/accept_invitation` page

## Key files

| Layer | Path |
|-------|------|
| Backend | `apps/backend/src/groups/groups.service.ts` |
| Invitations | `apps/backend/src/invitations/invitations.service.ts` |
| Chat | `apps/backend/src/chat/chat.service.ts` |
| Frontend | `apps/frontend/app/manage_group/`, `apps/frontend/app/accept_invitation/` |
| Schema | `Group`, `GroupMembership`, `GroupChatEntry` in `packages/database/prisma/schema.prisma` |
