# Magomano Girls School Portal

## Current State
Full-stack school portal with:
- Role-based dashboards (Admin, Teacher, Parent, Student)
- CBC grading system with color-coded levels
- Fee management (structures + payments)
- Events and announcements
- Admin panel with CRUD for all data
- Max 3 admins enforcement
- Parent-student linkage via Principal IDs (admin manually links)

## Requested Changes (Diff)

### Add
- **Student self-registration form**: After login, a student (with no linked record) can fill in their name, admission number, and class, and submit a registration request.
- **Parent link request form**: After login, a parent (with no linked students) can fill in their child's admission number and name, and submit a link request.
- **Admin: Registration Requests panel**: Admin sees pending student registrations, can approve (which creates the student record linked to that principal) or reject.
- **Admin: Parent Link Requests panel**: Admin sees pending parent link requests, can approve (links that parent's principal to the matching student) or reject.
- **Student dashboard**: Shows the student's own grades and fee info once their account is linked.
- Backend: `RegistrationRequest` and `ParentLinkRequest` types + full CRUD/approval functions.
- Backend: `getMyStudentRecord()` for students to fetch their own record by Principal.
- Backend: Student model updated to include optional `studentPrincipalId` field.

### Modify
- Student dashboard: Previously showed blank; now shows self-registration prompt if no record found, or actual data if linked.
- Parent dashboard: Add a "Request to be linked to my child" form if no students are linked yet.
- Admin panel: Add two new tabs -- "Registration Requests" and "Parent Link Requests".

### Remove
- Nothing removed.

## Implementation Plan
1. Update backend Motoko with new types, state maps, and functions -- DONE
2. Update backend.d.ts with new TypeScript interfaces -- DONE
3. Update frontend App.tsx:
   - Student dashboard: detect no linked record, show registration form; otherwise show grades/fees
   - Parent dashboard: show link request form if no children linked
   - Admin panel: add two new tabs for requests with approve/reject actions
