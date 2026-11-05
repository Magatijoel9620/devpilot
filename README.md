# 🚀 DevPilot

**Your personal command centre for building, managing, and shipping software.**

DevPilot brings projects, tasks, daily planning, focus sessions, project notes, and release tracking into one clean workspace — helping developers stay organised and keep moving.

🌐 **[Open DevPilot](https://devpilot.hempongroup.co.ke/)**

## ✨ What’s inside?

- 📅 **Daily planning** — prioritise tasks, manage your workload, and plan realistic workdays.
- 📁 **Projects & tasks** — organise projects, track progress, manage priorities, and capture ideas.
- ⚡ **Focus sessions** — track focused work and record where you left off.
- 🧠 **Project memory** — keep decisions, blockers, notes, and handover context in one place.
- 🚢 **Release tracking** — manage release targets and verification checklists.
- 🎨 **Personalisation** — switch between dark and light themes.
- 📱 **Responsive PWA** — use DevPilot on desktop or mobile, and install it like an app.
- ☁️ **Cloud workspace** — Supabase authentication and account-scoped workspace sync.

## 🛠️ Built with

Next.js · React · TypeScript · Tailwind CSS · Supabase

## 💻 Run locally

**Requirements:** Node.js 20.9+ and npm.

```bash
git clone <repository-url>
cd <project-directory>
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Add your Supabase project URL and publishable/anon key to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_KEY
```

Apply the SQL migrations in `supabase/migrations/` to your Supabase project and configure the required authentication URLs before signing in. Never expose a Supabase service-role key in frontend code.

## 🔐 A note on data & offline support

DevPilot uses Supabase authentication and cloud storage to keep workspaces account-scoped. Workspace data is not stored in browser `localStorage`. The PWA provides an app-shell offline fallback, but **full offline editing and background sync are not yet supported**.

## 🧪 Verify

```bash
npm run typecheck
npm run lint
npm run build
```

## 🤝 Built by Hempon Group

DevPilot is built and maintained by **[Hempon Group](https://hempongroup.co.ke/)**.

Want to learn more about the thinking and development behind it?

📝 [Read: Building DevPilot — A Personal Productivity and Project Management App](https://portfolio.hempongroup.co.ke/posts/building-devpilot-personal-productivity-and-project-management-app)

🌐 [Visit DevPilot](https://devpilot.hempongroup.co.ke/)

---

💡 **Built for developers who love building things. Happy shipping!** 🚀
