/** Laya shaped its own way: short state, no rules blob, click named in words. */
import { createLayaExecutor } from "../../../promptsmith/src/laya.js";
import {
  assembleTarget, membershipQuestions, routeQuestion,
} from "../../src/concrete-lang/de/target-classification/assembly.js";
import { evaluationCaseIds } from "../../src/concrete-lang/de/target-classification/evaluation-ids.js";
import { indexedContext } from "../../src/universal/validation.js";
import data from "../../src/concrete-lang/de/target-classification/source-data.json";

const judge = createLayaExecutor({ strict: false, lang: "de" });
const cases = (evaluationCaseIds as readonly string[]).filter((id) => (data as any).cases[id]);

let exact = 0, routeOk = 0, membersOk = 0, unresolved = 0, failed = 0;
const lat: number[] = [];
for (const [n, id] of cases.entries()) {
  const c = (data as any).cases[id];
  const sentence = { id, language: "de" as const, segments: c.segments ?? c.input.segments };
  const input = { sentence, clickedSegmentIndex: c.input.clickedSegmentIndex };
  const clicked = sentence.segments[input.clickedSegmentIndex]?.text ?? "";
  // Laya's own guidance: short, front-loaded state; no rules; the comparison resolved in words.
  const state = { sentence: indexedContext(sentence), clickedWord: `<s${input.clickedSegmentIndex}> "${clicked}"` };
  const questions = { ...membershipQuestions(input as any), route: routeQuestion };
  const t0 = performance.now();
  let answers: any;
  try { answers = (await judge({ state, questions } as any, { timeout: 120_000 } as any) as any).answers; }
  catch { failed++; continue; }
  lat.push(performance.now() - t0);
  const got: any = assembleTarget(input as any, answers);
  const want = c.idealOutput;
  const u = got.decision === "Unresolved"; if (u) unresolved++;
  const rOk = !u && got.family === want.family && got.kind === want.kind;
  const mOk = !u && JSON.stringify([...(got.memberSegmentIndices ?? [])].sort((a:number,b:number)=>a-b)) === JSON.stringify([...(want.memberSegmentIndices ?? [])].sort((a:number,b:number)=>a-b));
  if (rOk) routeOk++; if (mOk) membersOk++; if (rOk && mOk) exact++;
  if (n % 40 === 0) console.error(`[${n}/${cases.length}] exact=${exact}`);
}
lat.sort((a,b)=>a-b);
const s = cases.length - failed;
console.log(JSON.stringify({ judge: "laya-trimmed-state", cases: cases.length, scored: s, failed,
  exact, exactPct: +(100*exact/Math.max(1,s)).toFixed(1),
  routeOnly: routeOk, routePct: +(100*routeOk/Math.max(1,s)).toFixed(1),
  membersOnly: membersOk, membersPct: +(100*membersOk/Math.max(1,s)).toFixed(1),
  unresolved, p50ms: Math.round(lat[Math.floor(lat.length*0.5)] ?? 0),
  totalSec: +(lat.reduce((a,b)=>a+b,0)/1000).toFixed(1) }, null, 1));
