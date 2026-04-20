# Deployment Guide: AI-Umpire PRO 🚀

Follow these steps to host your project for free and enable CI/CD.

## Phase 1: Database (Supabase)
1. Go to [Supabase.com](https://supabase.com) and create a free project.
2. In the project settings, find **Database Settings**.
3. Copy the **Connection String (Transaction mode)** under "Direct Connection" (it should look like `postgres://...`).
4. Save this as your `DATABASE_URL`.

## Phase 2: Create a GitHub Repository
1. Initialize a git repo in your project root:
   ```bash
   git init
   git add .
   git commit -m "feat: cloud ready deployment"
   ```
2. Create a new repository on GitHub.
3. Push your code:
   ```bash
   git remote add origin YOUR_GITHUB_URL
   git push -u origin main
   ```

## Phase 3: Backend (Render.com)
1. Sign up for a free account on [Render.com](https://render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Set the following:
   - **Root Directory**: `apps/backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
5. Click **Advanced** -> **Add Environment Variables**:
   - `DATABASE_URL`: (Paste your string from Supabase)
   - `FRONTEND_URL`: (Leave blank for now, you will add your Netlify URL here later)
   - `NODE_ENV`: `production`

## Phase 4: Frontend (Netlify)
1. Sign up for [Netlify.com](https://netlify.com).
2. Click **Add new site** -> **Import an existing project** -> **GitHub**.
3. Connect your repository.
4. Set the following:
   - **Base directory**: `apps/frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Click **Site Configuration** -> **Environment variables**:
   - `VITE_API_URL`: (The URL of your Render backend + `/api`, e.g., `https://crickbot-api.onrender.com/api`)
   - `VITE_SOCKET_URL`: (The URL of your Render backend without `/api`)

## Important Final Step 🏁
Once Netlify is deployed, copy your Netlify URL (e.g., `https://crickbot-pro.netlify.app`) and add it to your **Render.com** environment variables as `FRONTEND_URL`. This fixes CORS issues.

---
**Your pro analytics system is now live!** Global access enabled.
