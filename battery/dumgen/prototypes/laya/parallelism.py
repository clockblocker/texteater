"""Aggregate throughput vs concurrent workers, threads (shared agent) and processes."""
import json, os, sys, time
os.environ.setdefault("USE_TF","0"); os.environ.setdefault("HF_HUB_OFFLINE","1")
os.environ.setdefault("TOKENIZERS_PARALLELISM","false")
import torch, laya, threading, resource
def P(*a): print(*a, flush=True)
def mps(): return torch.mps.driver_allocated_memory()/1e6

d=json.load(open("/tmp/layabench/jev-request.json"))
state=d["state"]; qs=d["questions"]; ids=list(qs.keys())
Q={k:qs[k] for k in ids[:10]}   # a 10-question call, a realistic classifyTarget size

agent=laya.load("convaiinnovations/laya")
agent.system_one(state,Q); torch.mps.synchronize()
P("loaded. mps=%.0fMB"%mps())

CALLS=8
P("\n--- THREADS sharing one agent (no lock: what concurrent requests really do) ---")
for workers in (1,2,4,8):
    done=[]; lock=threading.Lock()
    def work(n):
        for _ in range(n):
            t=time.perf_counter(); agent.system_one(state,Q)
            with lock: done.append(time.perf_counter()-t)
    per=max(1,CALLS//workers)
    ths=[threading.Thread(target=work,args=(per,)) for _ in range(workers)]
    t0=time.perf_counter()
    for t in ths: t.start()
    for t in ths: t.join()
    torch.mps.synchronize()
    wall=time.perf_counter()-t0; n=len(done)
    lat=sorted(done)
    P("  workers=%d calls=%2d wall=%6.1fs  throughput=%5.2f calls/s (%5.1f q/s)  p50 call=%6.0fms  mps=%.0fMB"
      %(workers,n,wall,n/wall,n*10/wall,lat[len(lat)//2]*1000,mps()))
