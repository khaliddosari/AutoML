import sys
import time
import json
import urllib.request
import urllib.parse

BASE = "http://localhost:8000"
INTERVAL = 5  # seconds between status checks


def post_json(url, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def get_json(url):
    with urllib.request.urlopen(url) as r:
        return json.loads(r.read())


def download(url, path):
    urllib.request.urlretrieve(url, path)


def run(run_id, target):
    print(f"Starting run {run_id} with target='{target}' ...")
    resp = post_json(f"{BASE}/runs/{run_id}/start", {"target": target})
    print(f"  status: {resp['status']}")

    print(f"\nPolling every {INTERVAL}s ...")
    while True:
        status = get_json(f"{BASE}/runs/{run_id}/status")
        s = status.get("status", "unknown")
        print(f"  [{time.strftime('%H:%M:%S')}] {s}")
        if s == "succeeded":
            break
        if s == "failed":
            print(f"\nRun failed: {status.get('error')}")
            sys.exit(1)
        time.sleep(INTERVAL)

    result = get_json(f"{BASE}/runs/{run_id}/result")
    print("\n=== Result ===")
    print(f"  Problem type : {result.get('problem_type')}")
    print(f"  Model score  : {result.get('accuracy_score')} ({result.get('score_metric')})")
    print(f"  Justification: {result.get('justification')}")

    plot_path = f"plot_{run_id}.png"
    download(f"{BASE}/runs/{run_id}/plot", plot_path)
    print(f"\nPlot saved to: {plot_path}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python run_and_poll.py <run_id> <target_column>")
        print("Example: python run_and_poll.py b69a13bd747f charges")
        sys.exit(1)
    run(sys.argv[1], sys.argv[2])
