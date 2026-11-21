#!/usr/bin/env python3
"""LocateVideo external smoke test. Uses published, attributed Pathak aircraft audio.
Only tests network, upload and event detection. Does not claim successful geolocation.
"""
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

PAGE = "https://erenuss.github.io/Yaman-n-oyunlar-/locatevideo/"
ENGINE = "https://effective-garbanzo-xjv9wp7g6w9264vp-7070.app.github.dev"
SOURCE = "https://raw.githubusercontent.com/Legendile7/aircraft-sound-geolocation/main/examples/pathak_r07/audio.wav"
ORIGIN = "https://erenuss.github.io"

def fetch(path, method="GET", data=None, headers=None, timeout=30):
    url = path if path.startswith("https://") else ENGINE + path
    req = urllib.request.Request(url, data=data, method=method, headers={"User-Agent": "LocateVideo-smoke/1.0", **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, dict(resp.headers), resp.read()

def json_request(path, method="GET", obj=None):
    body = json.dumps(obj).encode() if obj is not None else None
    status, hdr, raw = fetch(path, method, body, {"Content-Type": "application/json"} if body else None, 45)
    return json.loads(raw)

def await_job(result, label):
    ident = result.get("job_id") or (result.get("job") or {}).get("job_id") or result.get("id")
    if not ident:
        return result
    deadline = time.monotonic() + 240
    while time.monotonic() < deadline:
        job = json_request("/api/jobs/" + str(ident))
        st = job.get("status")
        if st in ("succeeded", "abstained"):
            print(label, "job:", st, flush=True)
            return job
        if st in ("failed", "cancelled", "interrupted"):
            raise RuntimeError(f"{label} job {st}: {job.get('error')}")
        time.sleep(5)
    raise TimeoutError(label + " job not completed within 240 seconds")

def main():
    print("TEST 1: Public GitHub Pages", flush=True)
    status, hdr, page = fetch(PAGE)
    assert status == 200 and (b"LOCATE" in page or b"LocateVideo" in page), "Pages missing expected UI"
    print("PASS: Pages accessible, HTML bytes", len(page), flush=True)

    print("TEST 2: Public Codespaces /health + CORS", flush=True)
    status, hdr, raw = fetch("/health", headers={"Origin": ORIGIN})
    print("health:", raw[:350].decode(errors="replace"), flush=True)
    assert status == 200 and raw.lstrip().startswith(b"{"), "Bad health endpoint"
    assert hdr.get("Access-Control-Allow-Origin") == ORIGIN, "CORS origin missing"
    print("PASS: motor answers with CORS header", flush=True)

    print("TEST 3: Browser CORS preflight on recording upload", flush=True)
    status, hdr, raw = fetch("/api/recordings", method="OPTIONS", headers={"Origin": ORIGIN, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"})
    assert status in (200,204), f"Preflight status {status}"
    assert hdr.get("Access-Control-Allow-Origin") == ORIGIN, "CORS preflight header missing"
    print("PASS: browser upload permitted", flush=True)

    print("TEST 4: Real aircraft recording upload (Pathak N814SR_R07)", flush=True)
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "pathak_N814SR_R07.wav"
        urllib.request.urlretrieve(SOURCE, wav)
        print("downloaded bytes:", wav.stat().st_size, flush=True)
        cmd = [
            "curl", "-fsS", "--max-time", "180", "-X", "POST",
            "-F", "file=@" + str(wav) + ";type=audio/wav",
            "-F", "owner_permission_confirmed=true",
            "-F", "start_time_utc=2026-05-12T20:22:20.291Z",
            "-F", "start_time_uncertainty_s=0",
            ENGINE + "/api/recordings"
        ]
        output = subprocess.run(cmd, capture_output=True, text=True, timeout=190)
        if output.returncode:
            raise RuntimeError("Upload failed: " + (output.stderr + output.stdout)[-1000:])
        payload = json.loads(output.stdout)
        print("upload response keys:", list(payload), flush=True)
        rid = (payload.get("recording") or {}).get("id") or payload.get("recording_id")
        if not rid:
            job = await_job(payload, "Audio ingest")
            rid = (job.get("result") or {}).get("recording_id") or job.get("recording_id")
        assert rid, "Upload did not yield a recording_id"
        print("PASS: actual WAV accepted; recording_id:", rid, flush=True)

        print("TEST 5: Real aircraft Doppler event detection", flush=True)
        response = json_request("/api/recordings/" + str(rid) + "/events/detect", "POST", {
            "threshold_z": 2.5, "min_duration_s": 40, "save": True
        })
        if response.get("job_id") or response.get("id"):
            await_job(response, "Event detection")
        data = json_request("/api/recordings/" + str(rid) + "/events")
        events = data.get("events", [])
        plausible = sum(e.get("assessment", {}).get("label") in ("plausible_doppler", "weak_doppler") for e in events)
        print("PASS: detection endpoint responded. Events:", len(events), "plausible-or-weak:", plausible, flush=True)
        print("Note: This is an audio detection test, not a verified location prediction.", flush=True)

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("FAIL:", type(exc).__name__, str(exc), file=sys.stderr, flush=True)
        sys.exit(1)
