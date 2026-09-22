"""Laya sidecar for `promptsmith/laya`: one checkpoint, loopback only.

    uv venv --python 3.12 && uv pip install laya
    .venv/bin/python tooling/laya-sidecar.py            # english, port 8770
    LAYA_MODEL=multilingual .venv/bin/python tooling/laya-sidecar.py

The playground's own server.py preloads all three checkpoints; on a 16 GB
machine that is most of the RAM before a single judgment runs, so this loads
exactly one. Inference is serialised: the GPU is already compute-saturated by a
single sequence, so concurrent requests add latency and no throughput.

Speaks the same `POST /api/predict {state, questions}` contract the playground
does, so `createLayaExecutor` works against either.
"""

import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

os.environ.setdefault("USE_TF", "0")
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
_CACHE = os.path.expanduser(
    "~/.cache/huggingface/hub/models--convaiinnovations--laya/snapshots"
)
if os.path.isdir(_CACHE):
    os.environ.setdefault("HF_HUB_OFFLINE", "1")

import torch  # noqa: E402

import laya  # noqa: E402

HOST = "127.0.0.1"
PORT = int(os.environ.get("PORT", "8770"))
MODEL = os.environ.get("LAYA_MODEL", "english")
MAX_BODY = 1 << 22

LOCK = threading.Lock()
STATE = {"status": "loading", "agent": None}


def load():
    sub = None if MODEL == "english" else MODEL
    t0 = time.perf_counter()
    STATE["agent"] = laya.load("convaiinnovations/laya", subfolder=sub)
    STATE["status"] = "ready"
    print(
        "[laya] %s ready in %.1fs on %s"
        % (MODEL, time.perf_counter() - t0, STATE["agent"].device),
        flush=True,
    )


def predict(payload):
    agent = STATE["agent"]
    if agent is None:
        raise RuntimeError("model still loading")
    state, questions = payload.get("state"), payload.get("questions")
    if not questions:
        raise ValueError("questions must be a non-empty object")
    with LOCK:
        sync = (
            torch.mps.synchronize
            if agent.device.type == "mps"
            else (lambda: None)
        )
        t0 = time.perf_counter()
        result = agent.system_one(state, questions)
        sync()
        ms = (time.perf_counter() - t0) * 1000
    result["latency_ms"] = round(ms, 1)
    result["device"] = str(agent.device)
    result["model"] = MODEL
    return result


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        pass

    def _send(self, code, body):
        data = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _host_ok(self):
        host = (self.headers.get("Host") or "").split(":")[0]
        if host in ("127.0.0.1", "localhost"):
            return True
        self._send(403, {"error": "forbidden host"})
        return False

    def do_GET(self):
        if not self._host_ok():
            return
        if self.path.split("?")[0] == "/api/health":
            self._send(
                200,
                {
                    "status": STATE["status"],
                    "model": MODEL,
                    "version": laya.__version__,
                    "device": "mps"
                    if torch.backends.mps.is_available()
                    else "cpu",
                },
            )
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self):
        if not self._host_ok():
            return
        if self.path != "/api/predict":
            return self._send(404, {"error": "not found"})
        try:
            n = int(self.headers.get("Content-Length") or 0)
            if n <= 0 or n > MAX_BODY:
                raise ValueError("body must be between 1 byte and 4 MB")
            self._send(200, predict(json.loads(self.rfile.read(n))))
        except (ValueError, KeyError, TypeError) as e:
            self._send(400, {"error": str(e)})
        except Exception as e:
            self._send(500, {"error": "%s: %s" % (type(e).__name__, e)})


if __name__ == "__main__":
    threading.Thread(target=load, daemon=True).start()
    print("[laya] loading %s, serving http://%s:%d" % (MODEL, HOST, PORT), flush=True)
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
