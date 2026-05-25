"""Scheduled Modal function that pings Render services every minute.

Deploy once:  modal deploy app/keepalive.py
Stop anytime: modal app stop namtheg-keepalive
"""
import modal

app = modal.App("namtheg-keepalive")


@app.function(schedule=modal.Period(minutes=1))
def ping() -> None:
    import urllib.request

    targets = [
        ("Backend", "https://modelforge-backend-wy4n.onrender.com/health"),
        ("Frontend", "https://namtheg.onrender.com/"),
    ]

    for name, url in targets:
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                print(f"{name}: {r.status} OK")
        except Exception as exc:
            print(f"{name}: ping failed — {exc}")
