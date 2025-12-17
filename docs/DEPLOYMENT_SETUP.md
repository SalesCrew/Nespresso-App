# 🚀 Deployment Setup - Vercel + Railway

## 📋 Overview

This app uses a **split deployment architecture**:

1. **Vercel** → Next.js Frontend (no custom server)
2. **Railway** → Socket.IO Server (real-time messaging)

## 🎯 Why This Architecture?

Vercel doesn't support custom Node.js servers (like Socket.IO). So we:
- Deploy the Next.js app to **Vercel** (static + serverless)
- Deploy the Socket.IO server to **Railway** (custom server)
- Connect them via WebSocket

---

## 📦 Part 1: Deploy to Vercel (Frontend)

### 1. Build Commands

The `package.json` has been configured for Vercel:

```json
{
  "scripts": {
    "dev": "next dev",           // ← For local development (no Socket.IO)
    "build": "next build",        // ← Vercel build command
    "start": "next start",        // ← Vercel start command
    "dev:socket": "node server.js",    // ← For local Socket.IO testing
    "start:socket": "NODE_ENV=production node server.js"  // ← For Railway
  }
}
```

### 2. Vercel Environment Variables

Set these in your Vercel project settings:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Socket.IO (points to Railway!)
NEXT_PUBLIC_SOCKET_URL=https://salescrew-app-production.up.railway.app

# OpenAI (for Eddie)
OPENAI_API_KEY=your-openai-key
```

### 3. Deploy to Vercel

```bash
# Option 1: Using Vercel CLI
vercel --prod

# Option 2: Push to GitHub (auto-deploys)
git push origin master
```

Vercel will:
- ✅ Run `npm run build` (standard Next.js build)
- ✅ Use `npm run start` (standard Next.js server)
- ✅ NOT try to run `server.js` (custom server)

---

## 🚂 Part 2: Deploy to Railway (Socket.IO Server)

### 1. Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Create new project
3. Connect your GitHub repo
4. Select the **same repo** as Vercel

### 2. Railway Build Configuration

**Start Command:**
```
npm run start:socket
```

This runs `node server.js` which starts the Socket.IO server.

### 3. Railway Environment Variables

Set these in Railway project settings:

```env
# Supabase (same as Vercel)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# CORS (IMPORTANT!)
ALLOWED_ORIGIN=https://test-nespresso-seven.vercel.app
# Or use * for all origins (less secure but easier for testing)

# Port (Railway auto-assigns, but good to have)
PORT=3000
```

### 4. Deploy to Railway

Railway auto-deploys on git push. Your Socket.IO server will be at:
```
https://salescrew-app-production.up.railway.app
```

---

## 🔗 How They Connect

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Vercel (Next.js App)                                   │
│  https://test-nespresso-seven.vercel.app                │
│                                                         │
│  - Renders UI                                           │
│  - Handles API routes (/api/*)                          │
│  - Makes WebSocket connection to Railway                │
│                                                         │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ WebSocket Connection
                 │ (via NEXT_PUBLIC_SOCKET_URL)
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Railway (Socket.IO Server)                             │
│  https://salescrew-app-production.up.railway.app        │
│                                                         │
│  - Handles real-time messaging                          │
│  - Broadcasts events to all connected clients           │
│  - Manages chat rooms                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing the Setup

### 1. Check Vercel Deployment

```bash
# Visit your Vercel URL
https://test-nespresso-seven.vercel.app

# Open Browser Console (F12)
# Look for:
[Socket.IO] Using URL: https://salescrew-app-production.up.railway.app
Socket.IO connected
```

### 2. Check Railway Deployment

```bash
# Check Railway logs
# Look for:
Socket.IO server is running
User [ID] authenticated and joined conversation [ID]
```

### 3. Test Chat

1. Open admin chat
2. Open promoter chat (incognito window)
3. Send message from admin
4. Message should appear instantly in promoter chat ✅

---

## 🐛 Troubleshooting

### Build Fails on Vercel

**Error:** `Custom server not supported`

**Fix:** Make sure `package.json` uses:
```json
"start": "next start"  // NOT "node server.js"
```

### Socket Won't Connect

**Error:** `Socket not connected`

**Check:**
1. ✅ Railway server is running (check Railway dashboard)
2. ✅ `NEXT_PUBLIC_SOCKET_URL` is set in Vercel
3. ✅ `ALLOWED_ORIGIN` is set in Railway
4. ✅ CORS is configured correctly

**Fix:**
```bash
# Railway Environment Variable
ALLOWED_ORIGIN=https://test-nespresso-seven.vercel.app
# Or use * for testing
ALLOWED_ORIGIN=*
```

### CORS Errors

**Error:** `Access-Control-Allow-Origin`

**Fix:** In Railway, set:
```
ALLOWED_ORIGIN=*
```

Or specific domain:
```
ALLOWED_ORIGIN=https://test-nespresso-seven.vercel.app
```

---

## 📝 Local Development

### Option 1: Frontend Only (No Socket.IO)

```bash
npm run dev
```

This starts Next.js on http://localhost:3000 without Socket.IO.
Chat won't work, but everything else will.

### Option 2: Full Stack (With Socket.IO)

```bash
npm run dev:socket
```

This starts Next.js + Socket.IO server on http://localhost:3000.
Chat will work locally.

---

## ✅ Deployment Checklist

### Before Deploying:

- [ ] Set all environment variables in Vercel
- [ ] Set all environment variables in Railway  
- [ ] Update `NEXT_PUBLIC_SOCKET_URL` to point to Railway
- [ ] Update `ALLOWED_ORIGIN` in Railway to include Vercel domain
- [ ] Test Socket.IO connection locally

### After Deploying:

- [ ] Verify Vercel build succeeded
- [ ] Verify Railway deployment succeeded
- [ ] Check browser console for Socket.IO connection
- [ ] Test sending a message in chat
- [ ] Check Railway logs for errors

---

## 🎓 Summary

| Platform | Purpose | Start Command | Environment |
|----------|---------|---------------|-------------|
| **Vercel** | Next.js Frontend | `next start` | Production |
| **Railway** | Socket.IO Server | `node server.js` | Production |
| **Localhost** | Full Development | `node server.js` | Development |

**Key Points:**
- ✅ Vercel uses standard Next.js (no custom server)
- ✅ Railway runs the Socket.IO server
- ✅ They communicate via WebSocket
- ✅ Both need proper environment variables
- ✅ CORS must be configured on Railway

---

**Questions?** Check the logs:
- Vercel: Project → Deployments → View Logs
- Railway: Project → Deployments → View Logs
- Browser: F12 → Console

---

Last updated: December 17, 2024

