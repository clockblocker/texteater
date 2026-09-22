import json, os, sys, time
os.environ.setdefault("USE_TF","0"); os.environ.setdefault("HF_HUB_OFFLINE","1")
os.environ.setdefault("TOKENIZERS_PARALLELISM","false")
import torch, laya, resource
def P(*a): print(*a, flush=True)
def mps(): return torch.mps.driver_allocated_memory()/1e6
def rss(): return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1e6

d=json.load(open("/tmp/layabench/jev-request.json"))
state=d["state"]; qs=d["questions"]; ids=list(qs.keys())
sent_only={"sentence":state["sentence"]}

P("baseline: rss=%.0fMB mps=%.0fMB"%(rss(),mps()))
t0=time.perf_counter(); agent=laya.load("convaiinnovations/laya"); L=time.perf_counter()-t0
P("ENGLISH loaded %.1fs  rss=%.0fMB mps_driver=%.0fMB device=%s dtype=%s"%(L,rss(),mps(),agent.device,agent.dtype))
P("params=%.1fM"%(sum(p.numel() for p in agent.model.parameters())/1e6))

def run(sub,label,st):
    q={k:qs[k] for k in sub}
    try:
        agent.system_one(st,q); torch.mps.synchronize()
    except Exception as e:
        P("  %-22s n=%3d FAILED %s: %s"%(label,len(sub),type(e).__name__,str(e)[:90])); return
    ts=[]
    for _ in range(3):
        t=time.perf_counter(); r=agent.system_one(st,q); torch.mps.synchronize(); ts.append((time.perf_counter()-t)*1000)
    ts.sort()
    P("  %-22s n=%3d median %8.1fms  %6.2fms/q  mps=%.0fMB tok=%s"%(label,len(sub),ts[1],ts[1]/len(sub),mps(),r.get("usage",{}).get("input_tokens")))

P("\n--- FULL dumgen state (2188 tok, truncated to ~317) ---")
for n in (1,4,10,25,50,89,178): run(ids[:n],"%dq"%n,state)
P("\n--- sentence-only state (103 tok, fits) ---")
for n in (1,10,50,178): run(ids[:n],"%dq"%n,sent_only)
P("\nPEAK english: mps_driver=%.0fMB rss=%.0fMB"%(mps(),rss()))

P("\n--- loading multilingual + typed-decisions (Router all-resident) ---")
t0=time.perf_counter(); ml=laya.load("convaiinnovations/laya",subfolder="multilingual"); P("multilingual %.1fs rss=%.0fMB mps=%.0fMB params=%.1fM"%(time.perf_counter()-t0,rss(),mps(),sum(p.numel() for p in ml.model.parameters())/1e6))
t0=time.perf_counter(); td=laya.load("convaiinnovations/laya",subfolder="typed-decisions"); P("typed-decisions %.1fs rss=%.0fMB mps=%.0fMB"%(time.perf_counter()-t0,rss(),mps()))
P("ALL THREE RESIDENT: rss=%.0fMB mps_driver=%.0fMB"%(rss(),mps()))

P("\n--- multilingual (German is detected; 1024 window) ---")
def run2(a,sub,label,st):
    q={k:qs[k] for k in sub}
    a.system_one(st,q); torch.mps.synchronize()
    ts=[]
    for _ in range(3):
        t=time.perf_counter(); a.system_one(st,q); torch.mps.synchronize(); ts.append((time.perf_counter()-t)*1000)
    ts.sort(); P("  %-22s n=%3d median %8.1fms  %6.2fms/q"%(label,len(sub),ts[1],ts[1]/len(sub)))
for n in (1,10,50,178): run2(ml,ids[:n],"ml %dq"%n,state)
