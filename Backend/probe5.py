import urllib.request
import urllib.error

urls = [
    "https://namtheg-8kup.onrender.com/",
    "https://namtheg-b-8kup.onrender.com/health",
]

for url in urls:
    print(f"\nProbing {url} ...")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            print(f"  Status: {resp.status}")
            print(f"  Headers: {dict(resp.headers)}")
            print(f"  Body: {resp.read().decode('utf-8')[:200]}")
    except urllib.error.HTTPError as e:
        print(f"  HTTPError: {e.code} - {e.reason}")
        try:
            print(f"  Error Body: {e.read().decode('utf-8')[:200]}")
        except Exception:
            pass
    except urllib.error.URLError as e:
        print(f"  URLError: {e.reason}")
    except Exception as e:
        print(f"  Unexpected error: {type(e).__name__} - {e}")
