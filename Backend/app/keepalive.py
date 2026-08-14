"""Scheduled Modal function that pings the Render backend every minute.

Backend only. The frontend is on Vercel and needs no pinging — and pinging two
always-on Render free services burned ~1,460 h against the workspace's pooled
750 free instance-hours, which exhausted the quota mid-month and suspended every
free service until the 1st. Do not add a second target here.

Point BACKEND_URL at your own backend before deploying.

Deploy once:  modal deploy app/keepalive.py
Stop anytime: modal app stop namtheg-keepalive
"""
import modal

app = modal.App("namtheg-keepalive")

BACKEND_URL = "https://modelforge-backend-wy4n.onrender.com"


@app.function(schedule=modal.Period(minutes=1))
def ping() -> None:
    import urllib.request

    url = f"{BACKEND_URL.rstrip('/')}/health"
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            print(f"Backend: {r.status} OK")
    except Exception as exc:
        print(f"Backend: ping failed — {exc}")
