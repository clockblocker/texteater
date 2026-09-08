// Disposable viewer for measured prototype evidence. Open review.html directly.
const evidencePath = new URL(
	"../../battery/dumgen/prototype-effect/evidence.json",
	import.meta.url,
);
const evidence = await Bun.file(evidencePath).json();
const data = JSON.stringify(evidence).replaceAll("<", "\\u003c");
const html = `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dum pipeline prototype review</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#faf9f6;color:#242622;font:16px/1.55 system-ui,sans-serif}main{max-width:1120px;margin:48px auto;padding:0 24px}h1{font-size:32px;line-height:1.2;margin-bottom:16px}h2{font-size:21px}p{max-width:80ch}.muted{color:#60665d}.badge{font-size:12px;letter-spacing:.07em;text-transform:uppercase;color:#506347}nav{display:flex;flex-wrap:wrap;gap:8px;margin:24px 0}button{font:inherit;border:1px solid #aeb5a7;background:white;color:inherit;border-radius:6px;padding:9px 13px;cursor:pointer}button[aria-pressed=true]{background:#36523e;color:white;border-color:#36523e}button:focus-visible{outline:3px solid #987026;outline-offset:3px}.panel{background:white;border:1px solid #d4d8cd;padding:24px;border-radius:8px;margin:20px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.55 ui-monospace,monospace;background:#f4f5ef;padding:16px;border-radius:4px}li{margin:8px 0}summary{cursor:pointer;padding:8px 0}#counter{margin:0 14px}#events{max-height:640px;overflow:auto}a{color:#36523e}footer{margin:32px 0;color:#60665d}details{border-top:1px solid #e3e5dc}
</style><main>
<div class="badge">Disposable design experiment · recorded execution</div>
<h1>Can one Dum pipeline stay inspectable when stages fail?</h1>
<p>This prototype composes routing, a fake model, validation, dictionary preparation, and an atomic in-memory commit with Effect 3. Select a recorded scenario and step through the evidence. The buttons replay captured results; they do not call a model or change a database.</p>
<p class="muted">The production rewrite is pending review. This small experiment cannot establish every production behavior or host integration guarantee.</p>
<section class="panel"><h2>What this experiment does not prove</h2><ul id="limits"></ul></section>
<nav id="scenarios" aria-label="Recorded scenarios"></nav>
<section class="panel" aria-live="polite"><h2 id="title"></h2><p id="outcome"></p><h3>Checks</h3><pre id="assertions"></pre><div id="gaps"></div><details><summary>Final result or failure</summary><pre id="result"></pre></details></section>
<section class="panel"><h2>Execution evidence</h2><p class="muted">Reveal stages in recorded order. Raw payloads and failures remain available below.</p><button id="reset">Start over</button><button id="next">Next event</button><button id="all">Show complete trace</button><span id="counter" aria-live="polite"></span><div id="events"></div><details><summary>Recording diagnostics</summary><pre id="diagnostics"></pre></details></section>
<details><summary>Complete source evidence</summary><pre id="source"></pre></details><footer id="date"></footer>
</main><script>
const evidence=${data};
const scenarios=evidence.scenarios;let selected=0;let visible=0;
const el=id=>document.getElementById(id);const format=value=>JSON.stringify(value,null,2);
const label=name=>name.replaceAll(/[-_]/g,' ');
(evidence.gaps??[]).forEach(gap=>{const li=document.createElement('li');li.textContent=gap;el('limits').append(li)});
scenarios.forEach((scenario,index)=>{const button=document.createElement('button');button.textContent=label(scenario.name);button.onclick=()=>{selected=index;visible=0;render()};el('scenarios').append(button)});
function render(){const scenario=scenarios[selected];const events=scenario.trace?.events??[];[...el('scenarios').children].forEach((button,index)=>button.setAttribute('aria-pressed',String(selected===index)));el('title').textContent=label(scenario.name);el('outcome').textContent='Recorded outcome: '+(typeof scenario.outcome==='string'?scenario.outcome:format(scenario.outcome));el('assertions').textContent=format(scenario.assertions);el('result').textContent=format(scenario.result??scenario.failure??null);el('diagnostics').textContent=format(scenario.trace?.diagnostics??[]);el('gaps').textContent=scenario.gaps?.length?'Limits: '+scenario.gaps.join(' '):'';el('counter').textContent=visible+' / '+events.length+' events';el('next').disabled=visible>=events.length;el('events').replaceChildren();events.slice(0,visible).forEach((event,index)=>{const detail=document.createElement('details');const summary=document.createElement('summary');summary.textContent=(index+1)+'. '+(event.stage??event.name??event.type??event.event??'Trace event');const pre=document.createElement('pre');pre.textContent=format(event);detail.append(summary,pre);el('events').append(detail)});}
el('reset').onclick=()=>{visible=0;render()};el('next').onclick=()=>{visible++;render()};el('all').onclick=()=>{visible=scenarios[selected].trace?.events?.length??0;render()};el('source').textContent=format(evidence);el('date').textContent='Evidence generated '+evidence.generatedAt;render();
</script></html>`;
await Bun.write(new URL("review.html", import.meta.url), html);
console.log("Wrote tooling/effect-prototype-review/review.html");
