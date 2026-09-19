/**
 * Can grammar move to intake too?
 *
 * If a sentence resolves into units once, the feature judgments for every unit
 * in it are independent questions over the same state, so they could ride the
 * same round trip and a click would need no judgment call at all - only the
 * generation steps (canonical form, Emoji Description, Knowledge texts), which
 * then fan out in parallel.
 *
 * The risk is contamination: production asks one target's features with only
 * that target marked. This measures the cost of marking several targets at
 * once. `solo` reproduces the production shape; `batchK` adds K decoy targets
 * from the same sentence and scores only the real one. Nothing here replaces
 * production's projection; it compares feature answers to the corpus gold so
 * the batching question is answered on its own.
 *
 *   zsh -ic 'export TYPESAFE_API_KEY=$TYPESAFE_TOKEN; bun prototypes/intake/grammar-batch.ts --route noun --sizes 0,2,4,8'
 *
 * Flags: --route noun|verb|adjective|pronoun   --sizes 0,2,4,8
 *        --decoy same|mixed   --scope eval|all   --concurrency N
 */
import type { ChoiceQuestion, Questions } from "promptsmith/typesafe";
import {
	featureQuestion,
	inflectionQuestion,
} from "../../src/concrete-lang/de/grammatical-resolution/feature-questions.js";
import { grammarFeatureFields } from "../../src/concrete-lang/de/grammatical-resolution/feature-schema.js";
import { ask, type Call, save } from "../harness.js";

const argv = process.argv.slice(2);
function flag(name: string, fallback: string): string {
	const index = argv.indexOf(`--${name}`);
	return index >= 0 ? (argv[index + 1] ?? fallback) : fallback;
}

const routeKey = flag("route", "noun");
const sizes = flag("sizes", "0,2,4").split(",").map(Number);
const decoyMode = flag("decoy", "mixed");
const scope = flag("scope", "eval");
const concurrency = Number(flag("concurrency", "4"));

const routesByKey: Record<string, { route: string; directory: string }> = {
	noun: { route: "de/Lexeme/NOUN", directory: "lexeme/noun" },
	verb: { route: "de/Lexeme/VERB", directory: "lexeme/verb" },
	adjective: { route: "de/Lexeme/ADJ", directory: "lexeme/adjective" },
	pronoun: { route: "de/Lexeme/PRON", directory: "lexeme/pronoun" },
};
const selected = routesByKey[routeKey];
if (!selected) throw Error(`Unknown route ${routeKey}`);
const kind = selected.route.split("/").at(-1)!;

const base = `${import.meta.dir}/../../src/concrete-lang/de/grammatical-resolution/${selected.directory}`;
const corpus = (await Bun.file(`${base}/corpus.json`).json()) as Record<
	string,
	{
		input: { markedContext: string; members: string[] };
		idealOutput: Record<string, unknown>;
	}
>;
const { evaluationCaseIds } = (await import(`${base}/evaluation-ids.ts`)) as {
	evaluationCaseIds: string[];
};
const caseIds = scope === "all" ? Object.keys(corpus) : evaluationCaseIds;

const determiners = new Set([
	"der",
	"die",
	"das",
	"den",
	"dem",
	"des",
	"ein",
	"eine",
	"einen",
	"einem",
	"einer",
	"eines",
	"mein",
	"dein",
	"kein",
	"dieser",
	"diese",
	"dieses",
]);

type Target = { markedContext: string; members: string[]; route: string };

function decoyTargets(markedContext: string, count: number): Target[] {
	const plain = markedContext.replaceAll(/<\/?TARGET>/g, "");
	const marked = new Set(
		[...markedContext.matchAll(/<TARGET>(.*?)<\/TARGET>/g)].map(
			(match) => match[1]!,
		),
	);
	const words = [...plain.matchAll(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu)].filter(
		(match) => !marked.has(match[0]),
	);
	if (!words.length || count <= 0) return [];
	const step = Math.max(1, Math.floor(words.length / count));
	const chosen = words
		.filter((_, index) => index % step === 0)
		.slice(0, count);
	return chosen.map((match) => {
		const start = match.index;
		const text = match[0];
		const decoyKind =
			decoyMode === "same"
				? kind
				: determiners.has(text.toLowerCase())
					? "DET"
					: /^[A-ZÄÖÜ]/.test(text) && start > 0
						? "NOUN"
						: "VERB";
		return {
			markedContext: `${plain.slice(0, start)}<TARGET>${text}</TARGET>${plain.slice(start + text.length)}`,
			members: [text],
			route: `de/Lexeme/${decoyKind}`,
		};
	});
}

/**
 * The production feature question, re-pointed at one entry of a `targets`
 * array. Only the state reference changes; the judgment is untouched.
 */
function retarget(question: ChoiceQuestion, position: number): ChoiceQuestion {
	return {
		...question,
		instructions: String(question.instructions).replaceAll(
			"`markedContext`",
			`\`targets[${position}].markedContext\``,
		),
	};
}

function questionsFor(
	target: Target,
	position: number,
	batched: boolean,
): Questions {
	const targetKind = target.route.split("/").at(-1)!;
	// Production's own exclusions: an AUX identity is selected whole, and
	// verbal Voice follows the judged passive construction.
	const verbal = ["VERB", "AUX", "Idiom", "Collocation"].includes(targetKind);
	const own = [...grammarFeatureFields(target.route)].filter(
		([path, field]) =>
			!field.open &&
			(path.startsWith("lemma.coreFeatures.") ||
				path.startsWith("surface.inflectionalFeatures.")) &&
			!(targetKind === "AUX" && path.startsWith("lemma.")) &&
			!(verbal && path.endsWith(".voice")),
	);
	const questions: Questions = {};
	const prefix = batched ? `t${position}.` : "";
	const wrap = (question: ChoiceQuestion) =>
		batched ? retarget(question, position) : question;
	if (grammarFeatureFields(target.route).has("surface.inflectionalFeatures"))
		questions[`${prefix}inflection`] = wrap(inflectionQuestion(targetKind));
	for (const [path, field] of own)
		questions[`${prefix}${path}`] = wrap(
			featureQuestion(targetKind, path, field),
		);
	return questions;
}

const policy = {
	target: "Each entry of `targets` is one fixed, already classified unit. Analyze each entry only in its own `markedContext`, independently of the other entries. Do not repair membership or reclassify.",
	identity:
		"Core Features belong to the dictionary identity, not the current inflection. Occurrence features belong to Surface.",
	inflection:
		"Citation has null inflection only for a dictionary/citation use or a genuinely unmarked invariant use under the route's policy. Structural null is not uncertainty.",
};

function goldFeatures(ideal: Record<string, unknown>): Record<string, string> {
	const gold: Record<string, string> = {};
	const surface = ideal.surface as
		| { inflectionalFeatures?: Record<string, unknown> | null }
		| undefined;
	const lemma = ideal.lemma as
		| { coreFeatures?: Record<string, unknown> | null }
		| undefined;
	gold.inflection = surface?.inflectionalFeatures ? "Marked" : "Citation";
	for (const [key, value] of Object.entries(
		surface?.inflectionalFeatures ?? {},
	))
		gold[`surface.inflectionalFeatures.${key}`] =
			value === null ? "Unmarked" : String(value);
	for (const [key, value] of Object.entries(lemma?.coreFeatures ?? {}))
		gold[`lemma.coreFeatures.${key}`] =
			value === null ? "Unmarked" : String(value);
	return gold;
}

type Outcome = {
	id: string;
	size: number;
	fields: number;
	correct: number;
	allCorrect: boolean;
	wrong: string[];
	calls: Call[];
};

async function runCase(id: string, size: number): Promise<Outcome> {
	const entry = corpus[id]!;
	const calls: Call[] = [];
	const real: Target = {
		markedContext: entry.input.markedContext,
		members: entry.input.members,
		route: selected!.route,
	};
	const decoys = decoyTargets(entry.input.markedContext, size);
	const batched = size > 0;
	const targets = [real, ...decoys];
	const state = batched
		? { targets, policy }
		: {
				markedContext: real.markedContext,
				members: real.members,
				route: real.route,
				policy,
			};
	const questions: Questions = {};
	for (const [position, target] of targets.entries())
		Object.assign(questions, questionsFor(target, position, batched));
	const result = await ask(
		calls,
		`${selected!.route}/features/${size}`,
		state,
		questions,
	);
	const gold = goldFeatures(entry.idealOutput);
	const prefix = batched ? "t0." : "";
	const wrong: string[] = [];
	let correct = 0;
	let fields = 0;
	for (const [path, expected] of Object.entries(gold)) {
		const answer = result.answers[`${prefix}${path}`] as
			| { type: "choice"; choice: string }
			| undefined;
		if (!answer) continue;
		fields += 1;
		if (answer.choice === expected) correct += 1;
		else wrong.push(`${path}: ${answer.choice} != ${expected}`);
	}
	return {
		id,
		size,
		fields,
		correct,
		allCorrect: fields > 0 && correct === fields,
		wrong,
		calls,
	};
}

const report: Record<string, unknown>[] = [];
for (const size of sizes) {
	const outcomes: Outcome[] = [];
	let next = 0;
	async function worker() {
		while (next < caseIds.length) {
			const id = caseIds[next++]!;
			try {
				outcomes.push(await runCase(id, size));
			} catch (error) {
				console.error(`  ! ${id}: ${String(error).slice(0, 140)}`);
			}
		}
	}
	await Promise.all(Array.from({ length: concurrency }, worker));
	const durations = outcomes
		.flatMap((outcome) => outcome.calls.map((call) => call.durationMs))
		.sort((a, b) => a - b);
	const fields = outcomes.reduce((sum, outcome) => sum + outcome.fields, 0);
	const row = {
		route: selected.route,
		decoys: size,
		decoyMode: size ? decoyMode : "none",
		cases: outcomes.length,
		allFeaturesCorrect: outcomes.filter((outcome) => outcome.allCorrect)
			.length,
		fieldAccuracy: +(
			outcomes.reduce((sum, outcome) => sum + outcome.correct, 0) /
			(fields || 1)
		).toFixed(3),
		questionsPerCall: +(
			outcomes.reduce(
				(sum, outcome) => sum + (outcome.calls[0]?.questions ?? 0),
				0,
			) / (outcomes.length || 1)
		).toFixed(1),
		inputTokensPerCase: Math.round(
			outcomes.reduce(
				(sum, outcome) => sum + (outcome.calls[0]?.input_tokens ?? 0),
				0,
			) / (outcomes.length || 1),
		),
		p50Ms: Math.round(durations[Math.floor(durations.length / 2)] ?? 0),
	};
	console.log(JSON.stringify(row));
	report.push({ ...row, outcomes });
}
await save(`/tmp/intake-grammar-${routeKey}-${decoyMode}.json`, report);
