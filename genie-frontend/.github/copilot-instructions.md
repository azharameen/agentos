# 🧑‍💻 Genie Frontend — Copilot Instructions

This guide enables AI coding agents to be immediately productive in the Genie Frontend codebase. It summarizes architecture, workflows, conventions, and integration points unique to this project.

---

## 🏗️ Big Picture Architecture
- **Framework:** Next.js (React, TypeScript)
- **Structure:**
  - `app/` — Main application pages and layout
  - `public/` — Static assets
  - `globals.css` — Global styles
- **Why:** Modern, scalable frontend for agentic AI platform, designed for rapid iteration and best practices

---

## ⚡ Developer Workflows
- **Install:** `npm install` (Node.js 18+)
- **Run (dev):** `npm run dev` (hot reload)
- **Build:** `npm run build`
- **Start (prod):** `npm start`
- **Lint:** `npm run lint`
- **Format:** `npm run format` (if configured)
- **Test:** Add tests in `__tests__/` or use your preferred React testing library

---

## 🧩 Project-Specific Patterns
- **Routing:** Uses Next.js App Router (`app/` directory)
- **Styling:** Global styles in `app/globals.css`; component styles via CSS modules or Tailwind (if present)
- **Font Optimization:** Uses `next/font` for automatic font loading
- **Page Editing:** Main entry at `app/page.tsx`; auto-updates on save
- **Environment Variables:** Configure in `.env.local` for frontend secrets

---

## 🔗 Integration Points
- **Backend API:** Connect to Genie Backend at `http://localhost:3001/api` (see backend copilot-instructions)
- **Vercel:** Deploy via Vercel for production (see Next.js docs)
- **Static Assets:** Place images and files in `public/`

---

## 📚 Key References
- `README.md` — Project setup, build/run instructions
- `app/page.tsx` — Main page entry
- `app/layout.tsx` — App-wide layout
- `app/globals.css` — Global styles
- `next.config.ts` — Next.js configuration

---

## 📝 Examples
- **Edit main page:** Update `app/page.tsx` to change homepage
- **Add a new page:** Create a file in `app/` (e.g., `app/about.tsx`)
- **Consume backend API:** Use `fetch('http://localhost:3001/api/agent/execute', {...})` in React components

---

## 🚦 Conventions
- **TypeScript only**; use functional React components
- **Prefer App Router** for new pages
- **Use environment variables** for secrets/config
- **Follow Next.js best practices** for routing, data fetching, and deployment

---

## 🛑 What NOT to do
- Do not hardcode secrets; use `.env.local`
- Do not modify files in `.next/` (build output)
- Do not bypass Next.js routing conventions

---

**For unclear or missing patterns, consult `README.md` and Next.js documentation.**

---

**Happy coding! 🚀**
