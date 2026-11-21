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
        print("TEST 6: Metadata-stripped MP4 with same real aircraft audio", flush=True)
        tagged = Path(tmp) / "source_with_test_metadata.mp4"
        clean = Path(tmp) / "clean_aircraft_video.mp4"
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-f", "lavfi", "-i", "color=c=black:s=640x360:r=2",
            "-i", str(wav), "-shortest",
            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "39", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "160k", "-movflags", "use_metadata_tags",
            "-metadata", "title=GPS_REMOVAL_TEST_TITLE",
            "-metadata", "location=+00.0000+000.0000/",
            "-metadata", "creation_time=2026-05-12T20:22:20Z",
            str(tagged),
        ], check=True, timeout=120)
        tagged_meta = subprocess.check_output([
            "ffprobe", "-v", "error", "-show_entries", "format_tags:stream_tags",
            "-of", "json", str(tagged)
        ], text=True, timeout=30)
        assert "GPS_REMOVAL_TEST_TITLE" in tagged_meta, "Original video did not contain expected metadata"
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(tagged),
            "-map", "0:v:0", "-map", "0:a?", "-map_metadata", "-1",
            "-map_metadata:s", "-1", "-map_chapters", "-1", "-c", "copy", str(clean)
        ], check=True, timeout=120)
        clean_meta = subprocess.check_output([
            "ffprobe", "-v", "error", "-show_entries", "format_tags:stream_tags",
            "-of", "json", str(clean)
        ], text=True, timeout=30)
        assert "GPS_REMOVAL_TEST_TITLE" not in clean_meta, "Title survived removal"
        assert "+00.0000+000.0000/" not in clean_meta, "Location tag survived removal"
        print("PASS: test metadata removed, video and audio preserved; size", clean.stat().st_size, flush=True)

        print("TEST 7: Ingest metadata-stripped MP4 into Codespaces engine", flush=True)
        cmd_video = [
            "curl", "-fsS", "--max-time", "180", "-X", "POST",
            "-F", "file=@" + str(clean) + ";type=video/mp4",
            "-F", "owner_permission_confirmed=true",
            "-F", "start_time_utc=2026-05-12T20:22:20.291Z",
            "-F", "start_time_uncertainty_s=0",
            ENGINE + "/api/recordings"
        ]
        video_out = subprocess.run(cmd_video, capture_output=True, text=True, timeout=190)
        if video_out.returncode:
            raise RuntimeError("Video upload failed: " + (video_out.stderr + video_out.stdout)[-1000:])
        vp = json.loads(video_out.stdout)
        vid = (vp.get("recording") or {}).get("id") or vp.get("recording_id")
        if not vid:
            result = await_job(vp, "MP4 audio extraction")
            vid = (result.get("result") or {}).get("recording_id") or result.get("recording_id")
        assert vid, "MP4 ingest did not yield recording id"
        detect = json_request("/api/recordings/" + str(vid) + "/events/detect", "POST", {
            "threshold_z": 2.5, "min_duration_s": 40, "save": True
        })
        if detect.get("job_id") or detect.get("id"):
            await_job(detect, "MP4 event detection")
        video_events = json_request("/api/recordings/" + str(vid) + "/events").get("events", [])
        video_plausible = sum(e.get("assessment", {}).get("label") in ("plausible_doppler", "weak_doppler") for e in video_events)
        print("PASS: clean MP4 video upload and event detection; events:", len(video_events), "plausible-or-weak:", video_plausible, flush=True)
        print("Note: These are acoustic and metadata-removal tests, NOT verified GPS predictions.", flush=True)

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("FAIL:", type(exc).__name__, str(exc), file=sys.stderr, flush=True)
        sys.exit(1)
