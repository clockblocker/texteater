import json, os, sys
os.environ.setdefault("USE_TF","0"); os.environ.setdefault("HF_HUB_OFFLINE","1")
os.environ.setdefault("TOKENIZERS_PARALLELISM","false")
sys.path.insert(0, "/Users/annagorelova/work/laya-playground")
from transformers import AutoTokenizer
from laya.common import build_sequence, render_options, serialize_state

SNAP="/Users/annagorelova/.cache/huggingface/hub/models--convaiinnovations--laya/snapshots"
snap=os.path.join(SNAP, os.listdir(SNAP)[0])
tok_en=AutoTokenizer.from_pretrained(os.path.join(snap,"tokenizer"))
tok_ml=AutoTokenizer.from_pretrained(os.path.join(snap,"multilingual","tokenizer"))

d=json.load(open("/tmp/layabench/jev-request.json"))
state=d["state"]; qs=d["questions"]

def internal(qd):
    t=qd["type"]; c=qd.get("criteria")
    if t=="choice" and isinstance(c,list): c={x:None for x in c}
    ins=qd["instructions"]
    if not isinstance(ins,str): ins=json.dumps(ins)
    return {"t":t,"ins":ins,"crit":c}

for name,tok,max_len,head_max in (("english",tok_en,512,192),("multilingual",tok_ml,1024,256)):
    print("="*70); print(name, "max_len=%d head_max_len=%d"%(max_len,head_max))
    st_ids=tok(serialize_state(state), add_special_tokens=False)["input_ids"]
    print("  FULL state tokens: %d  (sentence-only: %d)"%(len(st_ids),
          len(tok(serialize_state({'sentence':state['sentence']}),add_special_tokens=False)["input_ids"])))
    for qid in ("route_0","role_0","id_0","pk_0","fix_0","m_0_2","same_0_2"):
        if qid not in qs: continue
        q=internal(qs[qid])
        opts=render_options(q)
        raw=[len(tok(" "+o,add_special_tokens=False)["input_ids"]) for o in opts]
        opt_ids=[[tok.mask_token_id]+tok(" "+o,add_special_tokens=False)["input_ids"][:48] for o in opts]
        budget=head_max-sum(len(o) for o in opt_ids)
        truncated=budget<16
        if truncated:
            per=max(4,(head_max-16)//max(1,len(opt_ids)))
            opt_ids=[o[:per] for o in opt_ids]
        head_ids=tok("%s question: %s"%(q["t"],q["ins"]),add_special_tokens=False)["input_ids"]
        head_full=len(head_ids)
        budget2=head_max-sum(len(o) for o in opt_ids)
        head_keep=max(8,budget2)
        seq,markers=build_sequence(tok,state,q,max_len,head_max)
        used=1+min(head_full,head_keep)+1+sum(len(o) for o in opt_ids)+1
        room=max(0,max_len-used)
        print("  --- %s (%s, %d options)"%(qid,q["t"],len(opts)))
        print("      option tokens raw: total=%d max=%d  -> per-option cap applied: %s (%d tok each)"
              %(sum(raw),max(raw),truncated, (len(opt_ids[0])-1) if truncated else -1))
        print("      instructions: %d tokens -> kept %d"%(head_full,min(head_full,head_keep)))
        print("      STATE room: %d tokens of %d  => %.1f%% of state survives"
              %(min(room,len(st_ids)),len(st_ids),100.0*min(room,len(st_ids))/len(st_ids)))
        print("      markers returned: %d / %d options  %s"%(len(markers),len(opts),
              "<-- ValueError: options exceed head_max_len" if len(markers)!=len(opts) else "ok"))
