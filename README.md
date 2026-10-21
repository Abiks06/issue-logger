# Issue Logger

A full-stack issue tracker for logging, prioritising and closing out bugs and server issues. Accounts are email-verified, sessions expire when idle, and every route except sign-in is protected.

**[Live demo](https://issue-logger-beta.vercel.app)**

## Features

- **Issue lifecycle:** create, edit and delete issues; move them through Open → In progress → Closed
- **Priorities:** Low, Medium, High and Critical, with search across issues
- **Markdown descriptions:** written in a Markdown editor and rendered with GitHub-flavoured Markdown
- **Authentication:** email and password sign-up with email verification, password reset by email, bcrypt-hashed passwords, and JWT sessions with a 30-minute idle timeout
- **Route protection:** a Next.js proxy sends signed-out visitors to the login page and keeps signed-in users out of the auth pages
- **Validation:** forms validated with Zod schemas on both client and server
- **Polish:** dashboard counters, page transitions with Framer Motion, and light and dark themes

## Tech stack

| Layer | Tools |
| :-- | :-- |
| Framework | Next.js (App Router, Server Actions), React, TypeScript |
| Data | PostgreSQL, Prisma ORM |
| Auth | Auth.js (NextAuth v5) credentials provider, bcrypt |
| Forms | React Hook Form, Zod |
| Email | Nodemailer (SMTP) |
| UI | Tailwind CSS, Framer Motion, Lucide icons, next-themes |

## Data model

`User` owns many `Issue`s. Each issue has a title, Markdown description, `status` (`OPEN`, `IN_PROGRESS`, `CLOSED`) and `priority` (`LOW` to `CRITICAL`). Verification and password-reset tokens expire automatically.

## Running locally

1. Install dependencies (this also generates the Prisma client):

   ```bash
   npm install
   ```

2. Create `.env.local` with:

   ```bash
   DATABASE_URL=postgresql://...
   DIRECT_URL=postgresql://...
   AUTH_SECRET=        # any long random string
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   SMTP_HOST=
   SMTP_PORT=
   SMTP_USER=
   SMTP_PASS=
   SMTP_FROM=
   ```

3. Apply the schema and start the dev server:

   ```bash
   npx prisma migrate dev
   npm run dev
   ```

Then open [localhost:3000](http://localhost:3000).
