/** Head-to-head: the real classifyTarget judgment, answered by jev or by laya. */
import { createLayaExecutor } from "../../../promptsmith/src/laya.js";
import { createTypeSafeExecutor } from "../../../promptsmith/src/typesafe.js";
import {
  assembleTarget, classificationState, membershipQuestions, routeQuestion,
} from "../../src/concrete-lang/de/target-classification/assembly.js";
import { targetCriteria } from "../../src/concrete-lang/de/target-classification/judgments.js";
import { evaluationCaseIds } from "../../src/concrete-lang/de/target-classification/evaluation-ids.js";
import data from "../../src/concrete-lang/de/target-classification/source-data.json";

const which = process.argv[2] ?? "laya";
const limit = Number(process.argv[3] ?? "0");
const judge = which === "jev"
  ? createTypeSafeExecutor({ apiKey: process.env.TYPESAFE_API_KEY })
  : createLayaExecutor({ strict: false, lang: "de", model: which === "laya-ml" ? "multilingual" : "english" });

const cases = (evaluationCaseIds as readonly string[])
  .filter((id) => (data as any).cases[id])
  .slice(0, limit || undefined);

let exact = 0, routeOk = 0, membersOk = 0, unresolved = 0, failed = 0;
const lat: number[] = [];
const rows: any[] = [];

for (const [n, id] of cases.entries()) {
  const c = (data as any).cases[id];
  const input = { sentence: { id, language: "de" as const, segments: c.segments ?? c.input.segments }, clickedSegmentIndex: c.input.clickedSegmentIndex };
  const questions = { ...membershipQuestions(input as any), route: routeQuestion };
  const state = classificationState(input as any, targetCriteria);
  const t0 = performance.now();
  let answers: any;
  try {
    const r: any = await judge({ state, questions } as any, { timeout: 120_000 } as any);
    answers = r.answers;
  } catch (e) {
    failed++; rows.push({ id, error: String(e).slice(0, 90) });
    if (n % 20 === 0) console.error(`[${n}/${cases.length}] fail`);
    continue;
  }
  const ms = performance.now() - t0; lat.push(ms);
  const got: any = assembleTarget(input as any, answers);
  const want = c.idealOutput;
  const gotUnres = got.decision === "Unresolved";
  if (gotUnres) unresolved++;
  const rOk = !gotUnres && got.family === want.family && got.kind === want.kind;
  const mOk = !gotUnres && JSON.stringify([...(got.memberSegmentIndices ?? [])].sort((a:number,b:number)=>a-b)) === JSON.stringify([...(want.memberSegmentIndices ?? [])].sort((a:number,b:number)=>a-b));
  if (rOk) routeOk++; if (mOk) membersOk++; if (rOk && mOk) exact++;
  rows.push({ id, questions: Object.keys(questions).length, ms: Math.round(ms), rOk, mOk,
    got: gotUnres ? "Unresolved" : `${got.family}/${got.kind} [${got.memberSegmentIndices}]`,
    want: `${want.family}/${want.kind} [${want.memberSegmentIndices}]` });
  if (n % 20 === 0) console.error(`[${n}/${cases.length}] exact=${exact} ${Math.round(ms)}ms`);
}

lat.sort((a, b) => a - b);
const scored = cases.length - failed;
const out = {
  judge: which, cases: cases.length, scored, failed,
  exact, exactPct: +(100 * exact / Math.max(1, scored)).toFixed(1),
  routeOnly: routeOk, routePct: +(100 * routeOk / Math.max(1, scored)).toFixed(1),
  membersOnly: membersOk, membersPct: +(100 * membersOk / Math.max(1, scored)).toFixed(1),
  unresolved,
  p50ms: Math.round(lat[Math.floor(lat.length * 0.5)] ?? 0),
  p95ms: Math.round(lat[Math.floor(lat.length * 0.95)] ?? 0),
  totalSec: +(lat.reduce((a, b) => a + b, 0) / 1000).toFixed(1),
};
console.log(JSON.stringify(out, null, 1));
await Bun.write(`/tmp/layabench/acc-${which}.json`, JSON.stringify({ summary: out, rows }, null, 1));
