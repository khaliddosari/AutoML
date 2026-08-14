# Deployment

Namtheg runs across three platforms:

| Tier | Platform | Config |
| --- | --- | --- |
| Next.js frontend | **Vercel** | `Frontend/vercel.json` |
| FastAPI backend | **Render** (free) | `render.yaml` |
| Serverless predictors | **Modal** | `Backend/app/deploy/inference_app.py` |

---

## Why the frontend is not on Render

Render's **750 free instance-hours are pooled per workspace, not per service.** Two
always-on free web services consume roughly 2 x 730 = **1,460 hours/month** against that
750-hour pool, so the quota was exhausted around **day 15** — and when the pool runs dry
Render suspends *every* free service in the workspace until the 1st of the next month.

That was the cause of the recurring mid-month outage. It was made worse by two keep-alive
pingers (`.github/workflows/keep-alive.yml` and `Backend/app/keepalive.py`) that kept both
services awake 24/7, guaranteeing maximum burn.

Vercel's Hobby plan does not meter always-on instance hours for Next.js, so moving the
frontend there removes one of the two consumers. The backend alone uses at most
**24 x 31 = 744 hours**, which stays under the 750-hour cap for a full month.

> **Do not add a second `plan: free` service to `render.yaml`.** The remaining headroom is
> only about 6 hours per month; a second service reintroduces the mid-month suspension.

---

## 1. Backend on Render

1. Connect the repo to Render and let it pick up `render.yaml` as a Blueprint.
2. Fill in the values Render prompts for (`sync: false` keys):
   - `OPENROUTER_API_KEY`
   - `OPENROUTER_REFERER` — your Vercel URL, e.g. `https://namtheg.vercel.app`
   - `MODAL_WORKSPACE`, `MODAL_TOKEN_ID`, `MODAL_TOKEN_SECRET`
3. Note the resulting public URL, e.g. `https://modelforge-backend-wy4n.onrender.com`.

The free instance still spin-downs after 15 minutes idle, with a ~50s cold start on the
next request. The keep-alive workflow below covers that.

## 2. Frontend on Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. **Set Root Directory to `Frontend`.** This is the only non-default setting — the repo is
   a monorepo and Vercel otherwise builds from the root.
3. Add Environment Variables (Production + Preview):
   - `BACKEND_URL` = the Render backend URL from step 1
   - `NEXT_PUBLIC_SITE_URL` = your production domain, e.g. `https://namtheg.vercel.app`
4. Deploy.

No code changes are needed: `Frontend/next.config.ts` already proxies `/api/backend/*` to
`BACKEND_URL` via a Next.js rewrite, so the browser never talks to Render directly and
there is no CORS to configure.

`BACKEND_URL` is read at **build time**, so redeploy after changing it.

### Upload size note

CSV uploads pass through the Vercel rewrite. Rewrites to an absolute external URL are
handled by Vercel's routing layer rather than a Serverless Function, so the Hobby function
timeout does not apply. If very large CSVs ever fail at the proxy, have the browser POST
directly to the backend origin and enable CORS on the FastAPI side for that one route.

## 3. Keep-alive

Two pingers exist; **either one is enough — do not run both.**

- `.github/workflows/keep-alive.yml` — GitHub Actions, every 5 min. Set the repo variable
  `KEEPALIVE_BACKEND_URL` under *Settings > Secrets and variables > Actions > Variables*.
- `Backend/app/keepalive.py` — Modal cron, every minute. Edit `BACKEND_URL` in the file,
  then `modal deploy app/keepalive.py`.

Both target the backend only. The Vercel frontend never needs pinging.

## 4. Serverless predictors on Modal

One-time setup, unchanged:

```bash
cd Backend
pip install modal
modal token new
modal deploy app/deploy/inference_app.py
```

---

## Other options considered

If you later want off Render's free tier entirely:

- **Modal** — already a dependency and already authenticated here. Wrap `app.main:app` in
  `@modal.asgi_app()`. $30/month in free credits and scales to zero.
- **Hugging Face Spaces** (Docker, CPU Basic) — no monthly hour cap, sleeps only after 48 h
  idle, and 2 vCPU / 16 GB versus Render free's 512 MB, which suits pandas + scikit-learn +
  matplotlib far better. Disk is ephemeral, so `STORAGE_DIR` would not survive rebuilds.
- **Google Cloud Run** — scales to zero, generous free tier, requires a card on file.
- **Fly.io** — no longer has a permanent free tier; a minimal always-on machine is ~$2/month.
