# Magomano Girls School Portal

## Current State
The portal has a student enrollment request flow and an admin registration requests panel. Both are broken:
- Students get "Failed to submit enrollment" when trying to request enrollment
- Admins see "Failed to load registration requests" in their panel

Root cause: `getUserRole` in `authorization/access-control.mo` calls `Runtime.trap("User is not registered")` when a user's Principal is not in the `userRoles` map. This happens because the frontend never calls `_initializeAccessControlWithSecret` to register users. As a result:
1. Any new user who logs in and calls any function guarded by `AccessControl.hasPermission` or `AccessControl.isAdmin` crashes the entire call
2. `getCallerUserProfile` traps → app fails to load for new users
3. `getMyRegistrationRequest` traps → student can't check enrollment status
4. `getAllRegistrationRequests` traps → admin can't load the requests panel
5. `seedSampleData` traps → sample data never loads

## Requested Changes (Diff)

### Add
- Frontend: call `_initializeAccessControlWithSecret` with the admin secret on every login, before any other backend call, to register the user in the access control system
- Frontend: store/retrieve admin secret from env config

### Modify
- `authorization/access-control.mo`: Change `getUserRole` to return `#guest` instead of trapping when user is not in the map. This makes all permission checks safe for unregistered users.
- `src/backend/main.mo`: Change `getCallerUserProfile` and `saveCallerUserProfile` to allow any non-anonymous user (not just `#user`), since new users won't be registered yet when they first call these
- `src/backend/main.mo`: Change `getMyRegistrationRequest` to allow any non-anonymous caller (not just `#user`)
- `src/backend/main.mo`: Change `seedSampleData` to allow the first-ever caller to seed (or only check isAdmin after they're registered)
- `src/frontend/src/App.tsx`: Call `_initializeAccessControlWithSecret` right after login before loading the profile, using the `CAFFEINE_ADMIN_TOKEN` secret from env/config

### Remove
- Nothing removed

## Implementation Plan
1. Fix `access-control.mo`: return `#guest` on unknown user (line ~46: replace `Runtime.trap(...)` with `#guest`)
2. Fix `main.mo`: `getCallerUserProfile` - change guard from `hasPermission(#user)` to `!caller.isAnonymous()`
3. Fix `main.mo`: `saveCallerUserProfile` - change guard to `!caller.isAnonymous()`, and auto-register the user as `#user` in `userRoles` if not already registered
4. Fix `main.mo`: `getMyRegistrationRequest` - change guard from `hasPermission(#user)` to `!caller.isAnonymous()`
5. Fix `main.mo`: `seedSampleData` - allow if caller is admin OR if no admin has been assigned yet (first run)
6. Fix `frontend/App.tsx`: After identity is available, call `actor._initializeAccessControlWithSecret(adminSecret)` before `loadProfile()`. Get the secret from `src/frontend/env.json` or hardcoded as empty string (non-admins just get registered as `#user`)
