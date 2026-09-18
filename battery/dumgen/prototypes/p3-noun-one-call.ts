/**
 * P3: German NOUN grammar in ONE jev round trip.
 * Runs the unmodified production pipeline, but wraps the judge so that the
 * article-attachment and Case questions are appended to the `/features`
 * request (their candidates are computable from raw text before any
 * judgment). The later `/article` and `/case` requests are then answered from
 * that cache without a network call. Case policy: deterministic derivation
 * from article form + agreement when unique (as production), else the
 * speculative Case answer if compatible, else Unresolved.
 *
 * Variant `head-only`: additionally rewrites markedContext so only the noun
 * head is marked, testing whether feature judgments survive without fixed
 * membership (what a click-time call would see before membership is known).
 */
import { germanArticleForm } from "dumling";
import { createOpenAIExecutor } from "promptsmith/openai";
import type { Questions, TypeSafeExecutor } from "promptsmith/typesafe";
import { choice } from "promptsmith/typesafe";
import { germanFusion } from "../src/concrete-lang/de/fusions.js";
import { featureQuestion } from "../src/concrete-lang/de/grammatical-resolution/feature-questions.js";
import corpus from "../src/concrete-lang/de/grammatical-resolution/lexeme/noun/corpus.json";
import { operationExperiment } from "../src/development.js";
import type { DumgenOptions } from "../src/types.js";
import { judge as network, runCases, save, stable, summarize, type Call, type CaseResult } from "./harness.js";

const variant = process.argv[2] ?? "fold";
const casePath = "surface.inflectionalFeatures.case";
const definite = new Set(["der", "die", "das", "den", "dem", "des"]);
const indefinite = new Set(["ein", "eine", "einen", "einem", "einer", "eines"]);

type Candidate = { key: string; segmentIndex: number; attested: string; realization: "Owned" | "Shared" | "Fusion"; article: "Definite" | "Indefinite"; form: string; case: "Dat" | "Acc" | null };

/** Same candidate logic as production articleCandidates, from raw text only. */
function candidatesFrom(segments: { kind: string; text: string }[], members: number[]): Candidate[] {
	const out: Candidate[] = [];
	const first = members[0]!;
	for (const [index, segment] of segments.entries()) {
		if (segment.kind !== "ResolvableText") continue;
		const position = members.indexOf(index);
		const owned = position !== -1;
		if (owned ? position !== 0 || members.length < 2 : index >= first) continue;
		const form = segment.text.normalize("NFC").toLocaleLowerCase("de");
		const fusion = germanFusion(form);
		if (fusion && owned) continue;
		const article = fusion || definite.has(form) ? "Definite" : indefinite.has(form) ? "Indefinite" : undefined;
		if (!article) continue;
		const realization = fusion ? "Fusion" : owned ? "Owned" : "Shared";
		out.push({ key: `${realization}_s${index}`, segmentIndex: index, attested: segment.text, realization, article, form: fusion?.articleForm ?? form, case: fusion?.articleCase ?? null });
	}
	return out;
}

function answerFor(criteria: Record<string, unknown>, selected: string) {
	const keys = Object.keys(criteria);
	const pick = keys.includes(selected) ? selected : "Unresolved";
	return { type: "choice", choice: pick, confidence: 0.99, probabilities: Object.fromEntries(keys.map((k) => [k, k === pick ? 1 : 0])) };
}

function wrappedJudge(segments: { kind: string; text: string }[], members: number[], calls: Call[]): TypeSafeExecutor {
	const cache: { attachment?: string; case?: string; attachmentAnswer?: unknown; caseAnswer?: unknown } = {};
	const resolvable = segments.filter((s) => s.kind === "ResolvableText").length;
	const candidates = candidatesFrom(segments, members);
	const indexed = segments.map((s, i) => (s.kind === "ResolvableText" ? `<s${i}>${s.text}</s${i}>` : s.text)).join("");
	return async (request, options) => {
		const questions = request.questions as Questions;
		const ids = Object.keys(questions);
		if (ids.includes("support")) {
			// The features call: append attachment + Case speculatively.
			const extra: Record<string, unknown> = {};
			if (resolvable > 1)
				extra.articleAttachment = choice(
					"Under `articlePolicy`, which complete article attachment in `sentence` is licensed for the noun target marked in `markedContext`? Judge agreement from the sentence itself.",
					{
						...Object.fromEntries(candidates.map((c) => [c.key, `${c.realization}: source <s${c.segmentIndex}> ${c.attested} supplies ${c.article} DET form ${c.form}. Select only if this source grammatically supplies this noun's article.`])),
						None: "No owned, shared, or Fusion-supplied article belongs to this noun",
						Unresolved: "Attachment is ambiguous, incompatible, or required evidence has no supported candidate",
					},
				);
			extra.speculativeCase = featureQuestion("NOUN", casePath, { values: ["Nom", "Acc", "Dat", "Gen", null], open: false });
			let state = request.state as Record<string, unknown>;
			if (variant === "head-only") {
				const head = members[members.length - 1]!;
				state = {
					...state,
					markedContext: segments.map((s, i) => (i === head ? `<TARGET>${s.text}</TARGET>` : s.text)).join(""),
					membershipNote: "Only the noun head is marked. Its fixed unit may also include an owned article immediately governing it; judge the whole noun phrase unit as the target.",
				};
			}
			state = {
				...state,
				sentence: indexed,
				articlePolicy: "Select one licensed article attachment for the supplied noun, using the whole sentence independently of previous clicks. Candidates are possible analyses of source occurrences, not proof of attachment. Owned means an overt true article in this noun's supplied members. Shared means a standalone article licensed by compatible nominal coordination: der Aufstieg und Abstieg gives Owned for Aufstieg and Shared for Abstieg. A Fusion candidate supplies its internal DET form to its nominal complement, including compatible coordinated complements: im Wald gives dem Wald, ins Haus gives das Haus, and im Wald und Feld permits dem Feld. The fused word stays a separate Construction/Fusion target and never becomes a noun member. Distinguish actual governing Fusions from unrelated phrases, quoted words and nonnominal uses such as am besten. Standalone homographic pronouns are not articles. Sharing never crosses an explicit repeated article, clause boundary, nested nominal scope or incompatible agreement. Proximity alone does not license attachment; use grammatical scope. Ties or ambiguous attachment are Unresolved. mein/dieser/kein remain independent DETs and supply no article. None means no article is licensed, not uncertainty or a way to hide disagreement. If an article is required but no candidate represents it, including an unsupported spelling or Fusion, choose Unresolved.",
			};
			const start = performance.now();
			const result = await network({ ...request, state: state as never, questions: { ...questions, ...(extra as Questions) } }, options);
			calls.push({ route: "p3/features+article+case", durationMs: performance.now() - start, questions: ids.length + Object.keys(extra).length, input_tokens: result.usage?.input_tokens ?? 0, output_tokens: result.usage?.output_tokens ?? 0 });
			const answers = { ...(result.answers as Record<string, unknown>) };
			cache.attachment = (answers.articleAttachment as { choice?: string } | undefined)?.choice ?? "None";
			cache.case = (answers.speculativeCase as { choice: string }).choice;
			delete answers.articleAttachment;
			delete answers.speculativeCase;
			return { ...result, answers } as never;
		}
		if (ids.length === 1 && ids[0] === "attachment") {
			return { model: "cache", usage: { input_tokens: 0, output_tokens: 0 }, answers: { attachment: answerFor((questions.attachment as { criteria: Record<string, unknown> }).criteria, cache.attachment ?? "Unresolved") } } as never;
		}
		if (ids.length === 1 && ids[0] === casePath) {
			// Production only asks Case when derivation was not unique; offered values are the compatible set.
			return { model: "cache", usage: { input_tokens: 0, output_tokens: 0 }, answers: { [casePath]: answerFor((questions[casePath] as { criteria: Record<string, unknown> }).criteria, cache.case ?? "Unresolved") } } as never;
		}
		// Any other route (lexical strings etc.): real call.
		const start = performance.now();
		const result = await network(request, options);
		calls.push({ route: "p3/other", durationMs: performance.now() - start, questions: ids.length, input_tokens: result.usage?.input_tokens ?? 0, output_tokens: result.usage?.output_tokens ?? 0 });
		return result;
	};
}

const execute = createOpenAIExecutor();
const ids = Object.keys(corpus);
const experimentProbe = operationExperiment("grammatical-resolution/de/lexeme/noun", { execute: async () => { throw Error("probe"); }, judge: async () => { throw Error("probe"); } });
const evaluationIds = [...experimentProbe.evaluation.ids];
console.error(`${evaluationIds.length} evaluation cases of ${ids.length}`);

async function run(id: string): Promise<CaseResult> {
	const c = (corpus as Record<string, { input: { markedContext: string; members: string[] }; idealOutput: unknown }>)[id]!;
	const calls: Call[] = [];
	// Rebuild segments exactly as grammar-operation does, to compute candidates from raw text.
	const segments: { kind: string; text: string }[] = [], members: number[] = [];
	for (const chunk of c.input.markedContext.split(/(<TARGET>.*?<\/TARGET>)/gu)) {
		if (!chunk) continue;
		if (chunk.startsWith("<TARGET>")) { members.push(segments.length); segments.push({ kind: "ResolvableText", text: chunk.slice(8, -9) }); continue; }
		for (const text of chunk.match(/\s+|[\p{L}\p{N}]+(?:[-‐‑'][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]/gu) ?? [])
			segments.push({ kind: /^\s+$/u.test(text) ? "Whitespace" : /^[\p{L}\p{N}]/u.test(text) ? "ResolvableText" : "Punctuation", text });
	}
	const options: DumgenOptions = { execute: (request) => execute(request as never) as never, judge: wrappedJudge(segments, members, calls), judgmentConfiguration: { timeoutMs: 30_000 } };
	const experiment = operationExperiment("grammatical-resolution/de/lexeme/noun", options);
	try {
		const output = await experiment.run(c.input as never, { signal: new AbortController().signal, recordTrace: () => {} } as never);
		return { id, pass: stable(output) === stable(c.idealOutput), expected: c.idealOutput, actual: output, calls };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const unresolvedExpected = stable(c.idealOutput) === stable({ decision: "Unresolved" });
		return { id, pass: unresolvedExpected && /Unresolved/u.test(message), expected: c.idealOutput, actual: { decision: "Unresolved", message }, calls, error: message };
	}
}

const results = await runCases(evaluationIds, 4, run);
const summary = summarize(`P3 noun one call [${variant}]`, results);
await save(`/tmp/p3-${variant}.json`, { summary, results });
