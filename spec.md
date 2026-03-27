# Magomano Girls School Portal

## Current State
Full-featured school portal with Motoko backend supporting: user profiles, students, CBC grades, fee structures, fee payments, events, and announcements. Role-based access: admin, teacher, parent, student. Parent-student linking exists via `parentId` field in Student record. Backend already checks `canAccessStudentData` using `parentId == caller`.

## Requested Changes (Diff)

### Add
- `getStudentsByParent` backend function: returns all students where `parentId == caller` (so parents can see their linked children without knowing student IDs)
- `getAdminCount` backend query: returns number of current admins
- Max 3 admins enforcement: when assigning admin role, check current admin count and reject if >= 3
- Admin panel UI: when adding a student, clearly show a field to enter the parent's user Principal ID so the parent can later access that student
- Parent dashboard: automatically fetch and display all linked students using `getStudentsByParent`
- Show parent their linked students on login with grades, fees, and events per student

### Modify
- Admin role assignment: add count check before granting admin role
- Parent dashboard: use `getStudentsByParent` instead of requiring parent to know student ID manually

### Remove
- Nothing removed

## Implementation Plan
1. Add `getStudentsByParent(caller)` to backend
2. Add `getAdminCount()` query to backend
3. Add `grantAdminRole(principal)` with max-3 guard to backend
4. Update frontend parent dashboard to call `getStudentsByParent` and show all linked children
5. Update admin student creation form to prominently show "Parent Principal ID" field with helper text
6. Update admin panel to show admin count and disable add-admin button when at 3
