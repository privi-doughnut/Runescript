# Rune Script — Deployment Guide
Complete instructions to get live at runescript.app by Sunday.

---

## What You Need First (Saturday, ~30 min)

### 1. Buy a Domain (~5 min, ~$14)
1. Go to [namecheap.com](https://namecheap.com)
2. Search `runescript.app`
3. Buy it (~$14/yr)
4. Also grab `runescript.co` as backup if available (~$3 first year)

### 2. Create Cloudflare Account (~3 min, free)
1. Go to [cloudflare.com](https://cloudflare.com) → Sign Up
2. Go to **Workers & Pages** → note your account subdomain (shown as `your-name.workers.dev`)
3. You'll use this for the API proxy

### 3. Create Netlify Account (~3 min, free)
1. Go to [netlify.com](https://netlify.com) → Sign Up with GitHub
2. This hosts your app

### 4. Create GitHub Account / Repo (~5 min, free)
1. Go to [github.com](https://github.com) → Sign Up (if needed)
2. Create a new repo named `runescript`
3. Keep it public (easier for Netlify)

### 5. Get Anthropic API Key (~2 min)
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Click **API Keys** → **Create Key**
3. Name it `runescript-prod`
4. Copy the key — you only see it once
5. Add $20 credit to start (Settings → Billing)

### 6. Install Node.js (if not installed)
Download from [nodejs.org](https://nodejs.org) → LTS version

---

## Step 1: Deploy the Cloudflare Worker

The Worker is the Claude API proxy. It keeps your API key secret.

```bash
# Install Wrangler (Cloudflare CLI)
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Go to the worker directory
cd deploy/worker

# Deploy the worker
wrangler deploy

# Set your Anthropic API key as a secret (paste when prompted)
wrangler secret put ANTHROPIC_API_KEY
```

After deploying, you'll see a URL like:
`https://claude-proxy.your-name.workers.dev`

**Copy this URL.** You'll need it in the next step.

---

## Step 2: Update the Worker URL in Your App

Open `deploy/index.html` and update this line:
```javascript
window.CLAUDE_ENDPOINT = 'https://claude-proxy.runescript.workers.dev';
```
Replace with your actual worker URL from Step 1.

---

## Step 3: Push to GitHub

```bash
# From the deploy/ folder
cd deploy

# Initialize git
git init
git add .
git commit -m "Initial Rune Script deployment"

# Push to GitHub (replace with your username)
git remote add origin https://github.com/YOUR_USERNAME/runescript.git
git branch -M main
git push -u origin main
```

---

## Step 4: Deploy to Netlify

1. Go to [netlify.com](https://netlify.com)
2. Click **Add new site** → **Import an existing project**
3. Choose **GitHub** → select your `runescript` repo
4. Build settings (should auto-detect from netlify.toml):
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click **Deploy site**
6. Wait 2-3 minutes → you'll get a URL like `random-name.netlify.app`
7. Test it — the full app should be live

---

## Step 5: Connect Your Domain

### In Cloudflare:
1. Go to your Cloudflare dashboard → **Add a site** → enter `runescript.app`
2. Choose the **Free plan**
3. Cloudflare will show you nameservers (like `carl.ns.cloudflare.com`)

### In Namecheap:
1. Go to your domain → **Domain** tab → **Nameservers**
2. Choose **Custom DNS**
3. Enter the Cloudflare nameservers
4. Save — propagation takes up to 48 hours (usually 30 min)

### In Netlify:
1. Go to your site → **Domain settings** → **Add custom domain**
2. Enter `runescript.app`
3. Also add `www.runescript.app`
4. Netlify will give you a DNS record to add in Cloudflare

### In Cloudflare DNS:
Add these records:
| Type  | Name | Value                          |
|-------|------|-------------------------------|
| CNAME | @    | your-site.netlify.app          |
| CNAME | www  | your-site.netlify.app          |
| CNAME | app  | your-site.netlify.app          |

Netlify provides free SSL automatically. ✓

---

## Step 6: Add Real Prospect Scanning (Monday)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → Enable **Places API (New)**
3. Create an API key → Copy it
4. In your app: Settings → API Keys → paste Google Places key
5. I'll wire this in when you have the key

---

## Final Checklist Before Demo

- [ ] runescript.app loads the landing page
- [ ] Sign In / Sign Up works and persists
- [ ] Prospect Scanner works (Claude AI generates prospects)
- [ ] Pitch Generator works  
- [ ] Site Builder builds and previews a site
- [ ] GitHub deploy works (Settings → paste GitHub token)
- [ ] Agency OS loads
- [ ] AI Studio generates content
- [ ] Domains page loads
- [ ] Creator Program loads
- [ ] Mobile view looks good

---

## If Something Breaks

Message me with the error. Common issues:
- **CORS error in console** → update allowed origins in worker/index.js
- **Build fails** → run `npm install` first
- **White screen** → check browser console for JS error
- **Claude not working** → verify Worker URL in index.html matches deployed worker URL

---

## Costs After Launch

| Service | Cost |
|---------|------|
| Domain (runescript.app) | ~$14/yr |
| Cloudflare Workers | Free (100k req/day) |
| Netlify Hosting | Free (100GB bandwidth/mo) |
| Anthropic API | ~$0.003 per request (pay as you go) |
| Google Places API | Free ($200 credit/mo) |

**Total fixed cost: $14/year.**
Everything else is pay-as-you-go or free tier.
