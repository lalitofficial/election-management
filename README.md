# IITM Election Manager

Responsive turnout management webapp for IIT Madras Student General Elections.

## What it includes

- Credentials login for `SuperAdmin`, `Admin`, and `POC`
- Roster-driven student search by roll number and filters
- Single global `has voted` state per student
- Live breakdowns for `Hostels`
- Scoped POC access by assigned subgroup list
- SuperAdmin roster import and user creation
- Audit trail for every mark and unmark

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- NextAuth credentials provider

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Copy environment defaults if needed:

```bash
cp .env.example .env
```

3. Ensure PostgreSQL is available on `localhost:5432` and create the app database if needed:

```bash
createdb -U postgres elecmanager
```

If you prefer Docker:

```bash
docker compose up -d postgres
```

4. Apply the schema:

```bash
npm run db:migrate -- --name init
```

5. Seed demo data:

```bash
npm run db:seed
```

6. Start the app:

```bash
npm run dev
```

## Demo accounts

- `superadmin` / `superadmin123`
- `hostel-admin` / `admin123`
- `ganga-poc` / `poc123`

## Required roster columns

- `roll_no`
- `name_of_the_student`
- `current_hostel`
- `room_no`
- `mobile_no`

## Main routes

- `/login`
- `/`
- `/api/students/search`
- `/api/turnout/mark`
- `/api/turnout/unmark`
- `/api/roster/import`
- `/api/dashboard/summary`
- `/api/audit`

## Notes

- `unmark` requires a correction reason.
- Current roster import is hostel-based and uses room/phone details from the residents file.
- Admins and POCs operate on assigned hostel groups.
- Imports upsert students and derive group lists from the spreadsheet.
