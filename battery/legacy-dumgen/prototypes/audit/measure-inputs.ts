/**
 * Offline input-bloat and prompt-consistency audit (2026-09-23). No model
 * calls and no API keys: every Dumgen operation runs from `src` against stub
 * executors, and `onModelExchange` records the exact state + questions (jev)
 * or system prompt + input (Luna) each stage would send.
 *
 *   bun prototypes/audit/measure-inputs.ts                 tables to stdout
 *   bun prototypes/audit/measure-inputs.ts --json out.json also write raw rows
 *   bun prototypes/audit/measure-inputs.ts --dump grammar.features:grammar-de-verb-subject-question
 *
 * Stub answers: grammar replays the reviewed ideal output through the test
 * fixture (src/testing/grammar-fixture.ts), so follow-ups (Luna canonical form,
 * lexical strings, noun Case, DET/PRON identity) fire exactly when gold
 * answers would make them fire. Other stages answer with a neutral default
 * (Exclude / NoMatch / Free / score 0), which is enough to record the one
 * payload they send. Token estimate = JSON chars / 3.5; live jev usage
 * measures 3.52 chars/token on recorded grammar calls and 3.40 on intake
 * calls (both printed below), so intake tokens run ~3% above the estimate.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { Effect } from "effect";
import type { Questions, SystemOneResult } from "promptsmith/typesafe";
import { routeGuidance } from "../../src/concrete-lang/de/grammatical-resolution/route-guidance.js";
import { verbalCompositionGuidance } from "../../src/concrete-lang/de/grammatical-resolution/verbal-guidance.js";
import { examples as emojiExamples } from "../../src/concrete-lang/de/reading-emoji-description/generate/cases.js";
import readingCases from "../../src/concrete-lang/de/reading-emoji-description/operation-cases.json";
import { sentenceCases } from "../../src/concrete-lang/de/sentence-analysis/cases.js";
import {
	lexemeRoutes,
	realizationCriteria,
} from "../../src/concrete-lang/de/sentence-analysis/criteria.js";
import { candidatesFor } from "../../src/concrete-lang/de/sentence-analysis/identity.js";
import { routes as classificationRoutes } from "../../src/concrete-lang/de/target-classification/assembly.js";
import { targetCases } from "../../src/concrete-lang/de/target-classification/cases.js";
import { targetCriteria } from "../../src/concrete-lang/de/target-classification/judgments.js";
import { prompts } from "../../src/generated/prompts.js";
import { createDumgen, draftKnowledge } from "../../src/index.js";
import { grammarFixture } from "../../src/testing.js";
import type {
	CallTrace,
	DumgenOptions,
	Encounter,
	OperationTrace,
	Segment,
	SegmentedSentence,
} from "../../src/types.js";

const here = dirname(new URL(import.meta.url).pathname);
const root = resolve(here, "../..");
const { values: args } = parseArgs({
	options: {
		json: { type: "string" },
		dump: { type: "string" },
	},
});

// ------------------------------------------------------------- recording

type Row = {
	readonly label: string;
	readonly caseId: string;
	readonly route: string;
	readonly executor: "TypeSafe" | "Luna";
	readonly plainSentence: string;
	readonly state?: unknown;
	readonly questions?: Questions;
	readonly systemPrompt?: string;
	readonly input?: unknown;
};
type CaseOutcome = {
	readonly group: string;
	readonly caseId: string;
	readonly outcome: string;
	readonly failure?: string;
	readonly consumed?: number;
	readonly ignored?: string[];
	readonly lunaCalls: number;
	readonly jevCalls: number;
};

const rows: Row[] = [];
const outcomes: CaseOutcome[] = [];
let current = { caseId: "", plainSentence: "" };

function labelOf(exchange: CallTrace): string {
	const request = exchange.request as {
		stage: string;
		route: string;
		input?: Record<string, unknown>;
		questions?: Questions;
	};
	const { stage, route } = request;
	if (exchange.executor === "TypeSafe") {
		if (stage === "analyzeSentence") return "intake.analyze";
		if (stage === "segment") return "intake.segment";
		if (stage === "classifyTarget") return "click.classify";
		if (stage === "resolveGrammar") {
			if (route.endsWith("/features")) return "grammar.features";
			if (route.endsWith("/lexical-strings"))
				return "grammar.lexicalStrings";
			if (route.endsWith("/case")) return "grammar.nounCase";
			if (route.endsWith("/identity")) return "grammar.authoredIdentity";
		}
		if (stage === "resolveOrGenerateReadingEmojiDescription")
			return request.input && "readings" in request.input
				? "reading.authoredChoice"
				: "reading.compare";
		return `jev.${stage}`;
	}
	if (
		stage === "generateCanonicalForm" ||
		stage === "generateNormalizedMembers" ||
		stage === "generateCanonicalFormAndNormalizedMembers"
	)
		return "grammar.text";
	if (stage === "generateReadingEmojiDescription") return "reading.generate";
	if (stage === "draftKnowledge") {
		const input = request.input as { aspect?: string; language?: string };
		return `draft.${input.aspect}${input.language ? `.${input.language}` : ""}`;
	}
	if (stage === "draftRelationCandidates") return "draft.relations";
	return `luna.${stage}`;
}

function record(exchange: CallTrace) {
	const request = exchange.request as {
		stage: string;
		route: string;
		input?: unknown;
		questions?: Questions;
		systemPrompt?: string;
	};
	rows.push({
		label: labelOf(exchange),
		caseId: current.caseId,
		route: request.route,
		executor: exchange.executor,
		plainSentence: current.plainSentence,
		...(exchange.executor === "TypeSafe"
			? {
					state: JSON.parse(JSON.stringify(request.input)),
					questions: request.questions,
				}
			: { systemPrompt: request.systemPrompt, input: request.input }),
	});
}

// ------------------------------------------------------------- stub answers

const neutral = [
	"Exclude",
	"NoMatch",
	"Free",
	"None",
	"Supported",
	"Current",
	"Standard",
	"Keep",
	"Citation",
	"Absent",
	"Unmarked",
];
function stubAnswers<Q extends Questions>(
	questions: Q,
	pick: (id: string, keys: string[]) => string | undefined = () => undefined,
): SystemOneResult<Q> {
	const answers: Record<string, unknown> = {};
	for (const [id, question] of Object.entries(questions)) {
		if (question.type === "noul") {
			answers[id] = { type: "noul", noul: 0.1 };
			continue;
		}
		const keys = Object.keys(question.criteria);
		if (question.type === "score") {
			answers[id] = {
				type: "score",
				score: 0,
				confidence: 1,
				probabilities: Object.fromEntries(
					keys.map((key) => [key, key === "0" ? 1 : 0]),
				),
			};
			continue;
		}
		const selected =
			pick(id, keys) ??
			neutral.find((key) => keys.includes(key)) ??
			keys.find((key) => key !== "Unresolved") ??
			keys[0]!;
		answers[id] = {
			type: "choice",
			choice: selected,
			confidence: 1,
			probabilities: Object.fromEntries(
				keys.map((key) => [key, key === selected ? 1 : 0]),
			),
		};
	}
	return {
		model: "stub",
		usage: { input_tokens: 0, output_tokens: 0 },
		answers,
	} as unknown as SystemOneResult<Q>;
}

let traces: OperationTrace[] = [];
function options(overrides: Partial<DumgenOptions>): DumgenOptions {
	return {
		judge: async (request) => stubAnswers(request.questions),
		execute: async () => ({ output: "🧪" }),
		...overrides,
		onModelExchange: record,
		onOperation: (trace) => traces.push(trace),
	};
}

async function run<T>(
	group: string,
	caseId: string,
	plainSentence: string,
	task: () => Effect.Effect<T, unknown>,
) {
	current = { caseId, plainSentence };
	traces = [];
	const before = rows.length;
	const result = await Effect.runPromise(Effect.either(task()));
	const produced = rows.slice(before);
	const applicability = traces
		.flatMap((trace) => trace.events)
		.find((event) => event.kind === "JudgmentApplicability")?.data as
		| { consumed: string[]; ignored: string[] }
		| undefined;
	outcomes.push({
		group,
		caseId,
		outcome: result._tag === "Right" ? "Success" : "Failure",
		...(result._tag === "Left"
			? {
					failure:
						result.left instanceof Error
							? result.left.message
							: String(result.left),
				}
			: {}),
		...(applicability
			? {
					consumed: applicability.consumed.length,
					ignored: applicability.ignored,
				}
			: {}),
		lunaCalls: produced.filter((row) => row.executor === "Luna").length,
		jevCalls: produced.filter((row) => row.executor === "TypeSafe").length,
	});
}

// ------------------------------------------------------------- corpora

const plain = (segments: readonly { text: string }[]) =>
	segments.map((segment) => segment.text).join("");

/** Same parser as src/evaluation/grammar-operation.ts. */
function encounterFrom(
	markedContext: string,
	family: string,
	kind: string,
): Encounter {
	const segments: Segment[] = [];
	const members: number[] = [];
	for (const chunk of markedContext.split(/(<TARGET>.*?<\/TARGET>)/gu)) {
		if (!chunk) continue;
		if (chunk.startsWith("<TARGET>")) {
			members.push(segments.length);
			segments.push({ kind: "ResolvableText", text: chunk.slice(8, -9) });
			continue;
		}
		for (const text of chunk.match(
			/\s+|[\p{L}\p{N}]+(?:[-‐‑'][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]/gu,
		) ?? [])
			segments.push({
				kind: /^\s+$/u.test(text)
					? "Whitespace"
					: /^[\p{L}\p{N}]/u.test(text)
						? "ResolvableText"
						: "Punctuation",
				text,
			} as Segment);
	}
	return {
		sentence: { id: "audit", language: "de", segments },
		target: { family, kind, memberSegmentIndices: members },
	} as unknown as Encounter;
}

const grammarKinds: Record<string, string> = {
	"proper-noun": "PROPN",
	auxiliary: "AUX",
	determiner: "DET",
	"subordinating-conjunction": "SCONJ",
	particle: "PART",
	adposition: "ADP",
	adverb: "ADV",
	"coordinating-conjunction": "CCONJ",
	pronoun: "PRON",
	adjective: "ADJ",
	interjection: "INTJ",
	verb: "VERB",
	symbol: "SYM",
	numeral: "NUM",
	noun: "NOUN",
	other: "X",
	idiom: "Idiom",
	aphorism: "Aphorism",
	"discourse-formula": "DiscourseFormula",
	collocation: "Collocation",
	proverb: "Proverb",
};
type GrammarCase = {
	input: { markedContext: string; members: string[] };
	idealOutput: {
		decision?: string;
		lemma?: {
			canonicalForm: string;
			coreFeatures: Record<string, unknown>;
		};
	};
};
function grammarCorpora() {
	const base = resolve(root, "src/concrete-lang/de/grammatical-resolution");
	const out: {
		family: string;
		kind: string;
		cases: [string, GrammarCase][];
	}[] = [];
	for (const family of ["lexeme", "phraseme"])
		for (const dir of readdirSync(resolve(base, family))) {
			const file = resolve(base, family, dir, "corpus.json");
			if (!existsSync(file)) continue;
			out.push({
				family: family === "lexeme" ? "Lexeme" : "Phraseme",
				kind: grammarKinds[dir]!,
				cases: Object.entries(
					JSON.parse(readFileSync(file, "utf8")) as Record<
						string,
						GrammarCase
					>,
				),
			});
		}
	return out;
}

// ------------------------------------------------------------- stage runs

async function measureIntake() {
	const dumgen = createDumgen(options({}));
	const sentences = new Map<string, SegmentedSentence<"de">>();
	for (const [id, golden] of Object.entries(sentenceCases))
		sentences.set(id, {
			id,
			language: "de",
			segments: (golden.input as { segments: unknown }).segments,
		} as unknown as SegmentedSentence<"de">);
	// Every distinct classification-corpus sentence widens the length spread.
	const seen = new Set(
		[...sentences.values()].map((sentence) => plain(sentence.segments)),
	);
	for (const [id, golden] of Object.entries(targetCases)) {
		const text = plain(golden.input.segments);
		if (seen.has(text)) continue;
		seen.add(text);
		sentences.set(`tc:${id}`, {
			id,
			language: "de",
			segments: golden.input.segments,
		} as unknown as SegmentedSentence<"de">);
	}
	for (const [id, sentence] of sentences)
		await run("intake", id, plain(sentence.segments), () =>
			dumgen.analyzeSentence({ sentence }),
		);
}

async function measureClassification() {
	for (const [id, golden] of Object.entries(targetCases)) {
		const ideal = golden.idealOutput as {
			family?: string;
			kind?: string;
		};
		const dumgen = createDumgen(
			options({
				judge: async (request) =>
					stubAnswers(request.questions, (question) =>
						question === "route" && ideal.family
							? `${ideal.family}/${ideal.kind}`
							: undefined,
					),
			}),
		);
		const sentence = {
			id,
			language: "de",
			segments: golden.input.segments,
		} as unknown as SegmentedSentence<"de">;
		await run("classify", id, plain(sentence.segments), () =>
			dumgen.classifyTarget({
				sentence,
				clickedSegmentIndex: golden.input.clickedSegmentIndex,
			}),
		);
	}
}

async function measureGrammar() {
	for (const corpus of grammarCorpora())
		for (const [id, golden] of corpus.cases) {
			const encounter = encounterFrom(
				golden.input.markedContext,
				corpus.family,
				corpus.kind,
			);
			const fixture = grammarFixture(golden.idealOutput);
			const dumgen = createDumgen(
				options({ judge: fixture.judge, execute: fixture.execute }),
			);
			await run(
				`grammar:${corpus.family}/${corpus.kind}`,
				id,
				plain(encounter.sentence.segments),
				() => dumgen.resolveGrammar(encounter),
			);
		}
}

async function measureReading() {
	for (const [id, golden] of Object.entries(
		readingCases as Record<
			string,
			{
				input: {
					encounter: Encounter;
					lemma: unknown;
					candidates: string[];
				};
			}
		>,
	)) {
		const dumgen = createDumgen(
			options({
				judge: async (request) =>
					stubAnswers(request.questions, (_, keys) =>
						keys.includes("authored_0") ? "authored_0" : "NoMatch",
					),
				execute: async () => ({ output: "🧪" }),
			}),
		);
		await run(
			"reading",
			id,
			plain(golden.input.encounter.sentence.segments),
			() =>
				dumgen.resolveOrGenerateReadingEmojiDescription(
					golden.input as never,
				),
		);
	}
}

/** Drafts over every gold grammar Lemma, with the tf-demo request shape (definition, transcription, en+ru). */
async function measureDrafts() {
	let count = 0;
	for (const corpus of grammarCorpora())
		for (const [id, golden] of corpus.cases) {
			const lemma = golden.idealOutput.lemma;
			if (!lemma || count++ % 3) continue; // every third case is plenty
			const encounter = encounterFrom(
				golden.input.markedContext,
				corpus.family,
				corpus.kind,
			);
			const draftOptions = options({
				execute: async (request) => ({
					output:
						request.stage === "draftRelationCandidates"
							? { candidates: [] }
							: { text: "Beispiel" },
				}),
			});
			await run("draft", id, plain(encounter.sentence.segments), () =>
				draftKnowledge(draftOptions, {
					encounter,
					lemma: {
						unitKind: "Lemma",
						language: "de",
						family: corpus.family,
						kind: corpus.kind,
						...lemma,
					} as never,
					request: {
						definition: null,
						transcription: null,
						translations: { en: null, ru: null },
					} as never,
				}),
			);
		}
}

// ------------------------------------------------------------- metrics

const tokens = (chars: number) => chars / 3.5;
const json = (value: unknown) => JSON.stringify(value) ?? "";
const stripTags = (text: string) => text.replace(/<\/?[A-Za-z][^>]*>/gu, "");

function leaves(
	value: unknown,
	zone: string,
	out: [string, string][],
	depth = 0,
) {
	if (typeof value === "string") out.push([zone, value]);
	else if (Array.isArray(value))
		for (const item of value) leaves(item, zone, out, depth + 1);
	else if (value && typeof value === "object")
		for (const [key, item] of Object.entries(value))
			leaves(
				item,
				depth === 0 && zone === "state.policy"
					? `state.policy.${key}`
					: zone,
				out,
				depth + 1,
			);
}

/** Zones: top-level state/input fields (policy split one level), question instructions, question criteria. */
function zonesOf(row: Row): [string, string][] {
	const out: [string, string][] = [];
	const body = (row.state ?? row.input) as Record<string, unknown> | string;
	if (typeof body === "string") out.push(["input", body]);
	else if (body)
		for (const [key, value] of Object.entries(body))
			leaves(value, key === "policy" ? "state.policy" : `in.${key}`, out);
	if (row.systemPrompt) out.push(["systemPrompt", row.systemPrompt]);
	for (const question of Object.values(row.questions ?? {})) {
		if (typeof question.instructions === "string")
			out.push(["Q.instructions", question.instructions]);
		leaves(question.criteria, "Q.criteria", out);
	}
	return out;
}

/** Words in one zone that sit inside an 8-word shingle also present in another zone. */
function crossZoneDuplication(zones: [string, string][]) {
	const width = 8;
	const owners = new Map<string, Set<string>>();
	const shingled: [string, string[], string[]][] = [];
	for (const [zone, text] of zones) {
		const words = stripTags(text)
			.toLowerCase()
			.split(/\s+/u)
			.filter(Boolean);
		const keys: string[] = [];
		for (let index = 0; index + width <= words.length; index++) {
			const key = words.slice(index, index + width).join(" ");
			keys.push(key);
			const set = owners.get(key) ?? new Set();
			set.add(zone);
			owners.set(key, set);
		}
		shingled.push([zone, words, keys]);
	}
	const pairWords = new Map<string, number>();
	let duplicatedWords = 0;
	for (const [zone, words, keys] of shingled) {
		const covered = new Set<number>();
		const partners = new Map<string, Set<number>>();
		keys.forEach((key, start) => {
			const others = [...(owners.get(key) ?? [])].filter(
				(owner) => owner !== zone,
			);
			if (!others.length) return;
			for (let offset = 0; offset < width; offset++)
				covered.add(start + offset);
			for (const other of others) {
				const set = partners.get(other) ?? new Set();
				for (let offset = 0; offset < width; offset++)
					set.add(start + offset);
				partners.set(other, set);
			}
		});
		duplicatedWords += covered.size;
		for (const [other, set] of partners) {
			const pair = [zone, other].sort().join(" <-> ");
			pairWords.set(pair, Math.max(pairWords.get(pair) ?? 0, set.size));
		}
		void words;
	}
	return { duplicatedWords, pairWords };
}

function measure(row: Row) {
	const fields: Record<string, number> = {};
	const body = (row.state ?? row.input) as Record<string, unknown> | string;
	if (body && typeof body === "object")
		for (const [key, value] of Object.entries(body)) {
			fields[key] = json(value).length;
			if (key === "policy" && value && typeof value === "object")
				for (const [sub, text] of Object.entries(value))
					fields[`policy.${sub}`] = json(text).length;
		}
	const questions = Object.values(row.questions ?? {});
	const criteriaJson = questions.map((question) => json(question.criteria));
	const instructions = questions.map((question) =>
		typeof question.instructions === "string"
			? question.instructions
			: json(question.instructions),
	);
	const template = (text: string) =>
		text
			.replace(/<s\d+>/gu, "<s#>")
			.replace(/"[^"]*"/gu, '"…"')
			.replace(/\d+/gu, "#")
			.replace(/\(([^)]*)\)/gu, "(…)");
	const uniqueCriteria = [...new Set(criteriaJson)];
	const uniqueTemplates = [...new Set(instructions.map(template))];
	const questionsJson = json(row.questions ?? {});
	const stateJson = json(row.state ?? row.input ?? {});
	const chars =
		row.executor === "TypeSafe"
			? json({ state: row.state, questions: row.questions }).length
			: (row.systemPrompt?.length ?? 0) + stateJson.length;
	const sentenceCopies = zonesOf(row).filter(
		([zone, text]) =>
			!zone.startsWith("Q.") &&
			row.plainSentence.length > 12 &&
			stripTags(text).includes(row.plainSentence.trim()),
	).length;
	const dup = crossZoneDuplication(zonesOf(row));
	return {
		chars,
		stateChars: stateJson.length,
		questionsChars: questionsJson.length,
		systemPromptChars: row.systemPrompt?.length ?? 0,
		questions: questions.length,
		unresolvedOptions: questions.filter(
			(question) =>
				question.type === "choice" &&
				Object.hasOwn(question.criteria, "Unresolved"),
		).length,
		fields,
		criteriaChars: criteriaJson.reduce((sum, text) => sum + text.length, 0),
		uniqueCriteriaChars: uniqueCriteria.reduce(
			(sum, text) => sum + text.length,
			0,
		),
		instructionChars: instructions.reduce(
			(sum, text) => sum + text.length,
			0,
		),
		uniqueTemplateChars: uniqueTemplates.reduce(
			(sum, text) => sum + text.length,
			0,
		),
		sentenceCopies,
		duplicatedWords: dup.duplicatedWords,
		pairWords: dup.pairWords,
	};
}

// ------------------------------------------------------------- reporting

const pct = (values: number[], p: number) => {
	if (!values.length) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]!;
};
const mean = (values: number[]) =>
	values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
const r0 = (value: number) => Math.round(value);

function report() {
	const measured = rows.map((row) => ({ row, m: measure(row) }));
	const byLabel = new Map<string, typeof measured>();
	for (const item of measured) {
		const key =
			item.row.label === "grammar.features" ||
			item.row.label === "grammar.text"
				? `${item.row.label} ${item.row.route.split("/").slice(1, 3).join("/")}`
				: item.row.label;
		byLabel.set(key, [...(byLabel.get(key) ?? []), item]);
	}
	console.log(
		"\n## Payload size per stage (chars; ~tokens = chars/3.5; jev = state+questions JSON, Luna = system prompt + input JSON)\n",
	);
	console.log(
		"| stage | n | chars p50 | chars max | ~tok p50 | ~tok max | questions mean/max | Unresolved-able qs mean | state chars p50 | questions chars p50 | sys prompt chars | sentence copies (mean) | cross-zone dup words (mean) |",
	);
	console.log("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
	for (const [label, items] of [...byLabel].sort()) {
		const m = items.map((item) => item.m);
		console.log(
			`| ${label} | ${items.length} | ${r0(
				pct(
					m.map((x) => x.chars),
					0.5,
				),
			)} | ${r0(Math.max(...m.map((x) => x.chars)))} | ${r0(
				tokens(
					pct(
						m.map((x) => x.chars),
						0.5,
					),
				),
			)} | ${r0(tokens(Math.max(...m.map((x) => x.chars))))} | ${mean(m.map((x) => x.questions)).toFixed(1)}/${Math.max(...m.map((x) => x.questions))} | ${mean(m.map((x) => x.unresolvedOptions)).toFixed(1)} | ${r0(
				pct(
					m.map((x) => x.stateChars),
					0.5,
				),
			)} | ${r0(
				pct(
					m.map((x) => x.questionsChars),
					0.5,
				),
			)} | ${r0(
				pct(
					m.map((x) => x.systemPromptChars),
					0.5,
				),
			)} | ${mean(m.map((x) => x.sentenceCopies)).toFixed(2)} | ${r0(mean(m.map((x) => x.duplicatedWords)))} |`,
		);
	}

	console.log("\n## Largest state/input fields per stage (mean chars)\n");
	for (const [label, items] of [...byLabel].sort()) {
		const totals = new Map<string, number[]>();
		for (const { m } of items)
			for (const [field, size] of Object.entries(m.fields))
				totals.set(field, [...(totals.get(field) ?? []), size]);
		const top = [...totals]
			.map(([field, sizes]) => [field, mean(sizes)] as const)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 9)
			.map(([field, size]) => `${field}=${r0(size)}`)
			.join(", ");
		console.log(`- ${label}: ${top}`);
	}

	console.log(
		"\n## Question-side repetition (jev): criteria and instruction text repeated verbatim across questions\n",
	);
	console.log(
		"| stage | criteria chars mean | unique criteria chars mean | repeated share | instruction chars mean | unique template chars mean | repeated share | questions share of payload |",
	);
	console.log("|---|---|---|---|---|---|---|---|");
	for (const [label, items] of [...byLabel].sort()) {
		const m = items.map((item) => item.m).filter((x) => x.questions > 0);
		if (!m.length) continue;
		const crit = mean(m.map((x) => x.criteriaChars));
		const uniq = mean(m.map((x) => x.uniqueCriteriaChars));
		const inst = mean(m.map((x) => x.instructionChars));
		const tmpl = mean(m.map((x) => x.uniqueTemplateChars));
		const share = mean(m.map((x) => x.questionsChars / x.chars));
		console.log(
			`| ${label} | ${r0(crit)} | ${r0(uniq)} | ${((1 - uniq / crit) * 100).toFixed(0)}% | ${r0(inst)} | ${r0(tmpl)} | ${((1 - tmpl / inst) * 100).toFixed(0)}% | ${(share * 100).toFixed(0)}% |`,
		);
	}

	console.log(
		"\n## Cross-zone duplicated text (8-word shingles shared between fields; max words per pair, mean over payloads)\n",
	);
	for (const [label, items] of [...byLabel].sort()) {
		const pairs = new Map<string, number[]>();
		for (const { m } of items)
			for (const [pair, words] of m.pairWords)
				pairs.set(pair, [...(pairs.get(pair) ?? []), words]);
		const top = [...pairs]
			.map(
				([pair, words]) =>
					[
						pair,
						(words.reduce((a, b) => a + b, 0) /
							items.length) as number,
					] as const,
			)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5)
			.filter(([, words]) => words >= 4);
		if (top.length)
			console.log(
				`- ${label}: ${top.map(([pair, words]) => `${pair} ${r0(words)}w`).join("; ")}`,
			);
	}

	console.log("\n## Offline outcomes under gold/neutral answers\n");
	const groups = new Map<string, CaseOutcome[]>();
	for (const outcome of outcomes)
		groups.set(outcome.group, [
			...(groups.get(outcome.group) ?? []),
			outcome,
		]);
	console.log(
		"| group | cases | success | jev calls/case | Luna calls/case | Luna text follow-up rate | consumed qs mean | ignored qs mean | top failure |",
	);
	console.log("|---|---|---|---|---|---|---|---|---|");
	for (const [group, items] of [...groups].sort()) {
		const failures = new Map<string, number>();
		for (const item of items)
			if (item.failure)
				failures.set(
					item.failure.slice(0, 70),
					(failures.get(item.failure.slice(0, 70)) ?? 0) + 1,
				);
		const topFailure = [...failures].sort((a, b) => b[1] - a[1])[0];
		const withApplicability = items.filter(
			(item) => item.consumed !== undefined,
		);
		console.log(
			`| ${group} | ${items.length} | ${items.filter((item) => item.outcome === "Success").length} | ${mean(items.map((item) => item.jevCalls)).toFixed(2)} | ${mean(items.map((item) => item.lunaCalls)).toFixed(2)} | ${group.startsWith("grammar") ? `${items.filter((item) => item.lunaCalls > 0).length}/${items.length}` : "-"} | ${withApplicability.length ? mean(withApplicability.map((item) => item.consumed ?? 0)).toFixed(1) : "-"} | ${withApplicability.length ? mean(withApplicability.map((item) => item.ignored?.length ?? 0)).toFixed(1) : "-"} | ${topFailure ? `${topFailure[1]}x ${topFailure[0]}` : ""} |`,
		);
	}
	return measured;
}

// ------------------------------------------------------------- targeted checks

/** Would cheap deterministic candidates have covered the Luna canonical-form follow-up? */
function canonicalCoverage() {
	console.log(
		"\n## Canonical-form follow-up: could deterministic candidates replace the Luna call? (gold answers)\n",
	);
	const byRoute = new Map<
		string,
		{
			needed: number;
			casing: number;
			rulesOnly: number;
			covered: number;
			total: number;
			examples: string[];
		}
	>();
	for (const { m: _m, row } of rows
		.filter((row) => row.label === "grammar.text")
		.map((row) => ({ m: null, row }))) {
		const features = rows.find(
			(candidate) =>
				candidate.caseId === row.caseId &&
				candidate.label === "grammar.features",
		);
		const state = features?.state as { members: string[] } | undefined;
		const input = row.input as { needed?: Record<string, string> };
		if (!state || !input.needed?.canonicalForm) continue;
		const corpus = grammarCorpora().find((entry) =>
			entry.cases.some(([id]) => id === row.caseId),
		);
		const gold = corpus?.cases.find(([id]) => id === row.caseId)?.[1]
			.idealOutput.lemma?.canonicalForm;
		if (!corpus || !gold) continue;
		const route = `${corpus.family}/${corpus.kind}`;
		const entry = byRoute.get(route) ?? {
			needed: 0,
			casing: 0,
			rulesOnly: 0,
			covered: 0,
			total: corpus.cases.length,
			examples: [],
		};
		entry.needed++;
		const joined = state.members.join(" ");
		if (
			joined.slice(0, 1).toLocaleLowerCase("de") + joined.slice(1) ===
			gold
		)
			entry.casing++;
		if (ruleCandidates(corpus.kind, state.members, false).has(gold))
			entry.rulesOnly++;
		if (ruleCandidates(corpus.kind, state.members).has(gold))
			entry.covered++;
		else if (entry.examples.length < 6)
			entry.examples.push(`${state.members.join(" ")} -> ${gold}`);
		byRoute.set(route, entry);
	}
	console.log(
		"| route | cases | Luna canonical follow-up (gold answers) | of which lowercase-initial of the joined candidate | covered by suffix rules (incl. casing) | + 30-form irregular table (corpus-informed, optimistic) | uncovered examples |",
	);
	console.log("|---|---|---|---|---|---|---|");
	for (const [route, entry] of [...byRoute].sort())
		console.log(
			`| ${route} | ${entry.total} | ${entry.needed} | ${entry.casing} | ${entry.rulesOnly} | ${entry.covered} | ${entry.examples.join("; ")} |`,
		);
	const verbSizes = rows
		.filter(
			(row) =>
				row.label === "grammar.features" &&
				row.route.endsWith("/VERB/features"),
		)
		.map(
			(row) =>
				ruleCandidates(
					"VERB",
					(row.state as { members: string[] }).members,
				).size,
		);
	console.log(
		`\nVERB rule-candidate list size: mean ${mean(verbSizes).toFixed(1)}, max ${Math.max(...verbSizes)} (choice limit 255, current canonicalFormAlternatives cap 64).`,
	);
}

/** Closed-class routes re-judge Core features that an authored candidate list already fixes. */
function closedClassIdentity() {
	console.log(
		"\n## DET/PRON: Core-feature questions asked at click vs authored identities for the spelling\n",
	);
	console.log(
		"| route | cases | Core questions asked (mean) | all questions (mean) | authored candidates for spelling (mean / max) | cases with 1 candidate | authored follow-up calls | Core features that vary across the spelling's candidates (mean) |",
	);
	console.log("|---|---|---|---|---|---|---|---|");
	for (const kind of ["DET", "PRON", "AUX"]) {
		const features = rows.filter(
			(row) =>
				row.label === "grammar.features" &&
				row.route === `de/Lexeme/${kind}/features`,
		);
		if (!features.length) continue;
		const core = features.map(
			(row) =>
				Object.keys(row.questions ?? {}).filter((id) =>
					id.startsWith("lemma.coreFeatures."),
				).length,
		);
		const all = features.map(
			(row) => Object.keys(row.questions ?? {}).length,
		);
		const counts = features.map(
			(row) =>
				candidatesFor(
					(row.state as { members: string[] }).members.join(" "),
				).filter((member) => member.lemma.kind === kind).length,
		);
		const followUps = rows.filter(
			(row) =>
				row.label === "grammar.authoredIdentity" &&
				row.route === `de/Lexeme/${kind}/identity`,
		).length;
		// Core features on which the spelling's authored candidates disagree:
		// every other asked Core question has a catalog-fixed answer.
		const varying = features.map((row) => {
			const members = candidatesFor(
				(row.state as { members: string[] }).members.join(" "),
			).filter((member) => member.lemma.kind === kind);
			if (!members.length) return Number.NaN;
			const keys = Object.keys(
				members[0]!.lemma.coreFeatures as Record<string, unknown>,
			);
			return keys.filter(
				(key) =>
					new Set(
						members.map((member) =>
							JSON.stringify(
								(
									member.lemma.coreFeatures as Record<
										string,
										unknown
									>
								)[key],
							),
						),
					).size > 1,
			).length;
		});
		const known = varying.filter((value) => !Number.isNaN(value));
		console.log(
			`| ${kind} | ${features.length} | ${mean(core).toFixed(1)} | ${mean(all).toFixed(1)} | ${mean(counts).toFixed(1)} / ${Math.max(...counts)} | ${counts.filter((count) => count === 1).length} | ${followUps} | ${known.length ? `${mean(known).toFixed(1)} (n=${known.length}, no candidate: ${varying.length - known.length})` : "-"} |`,
		);
	}
}

/** Static cross-stage prompt checks over the exact texts that ship. */
function consistency() {
	console.log("\n## Static prompt-consistency checks\n");
	const checks: [string, boolean, string][] = [];
	const intakeClick = realizationCriteria.match(/click/giu)?.length ?? 0;
	checks.push([
		"intake criteria still speak of clicks/assembled groups (intake has no click)",
		intakeClick > 0 || realizationCriteria.includes("assembled group"),
		`${intakeClick} 'click' mentions; 'assembled group': ${realizationCriteria.includes("assembled group")}`,
	]);
	for (const phrase of [
		"Select the largest complete fixed learner-facing unit",
		"is one Collocation target",
		"only a support-verb predicate is a Collocation",
		"Their internal article may supply noun grammar later",
		"These noun rules preserve any larger established idiom boundary",
	])
		checks.push([
			`intake criteria .replace() removed: "${phrase.slice(0, 50)}"`,
			realizationCriteria.includes(phrase),
			realizationCriteria.includes(phrase) ? "STILL PRESENT" : "removed",
		]);
	checks.push([
		"intake criteria mention idioms only to exclude them as units (informational)",
		false,
		(realizationCriteria.match(/[^.]*idiom[^.]*\./giu) ?? []).join(" | "),
	]);
	const tiger = targetCriteria.includes("TIGER");
	const grammarHasStatePassiveRule =
		verbalCompositionGuidance.includes("TIGER") ||
		verbalCompositionGuidance.includes("paraphrase");
	checks.push([
		"state-passive rule (TIGER paraphrase test) exists at intake but not in grammar policy",
		tiger && !grammarHasStatePassiveRule,
		`intake has TIGER rule: ${tiger}; grammar verbal policy has it: ${grammarHasStatePassiveRule}`,
	]);
	const emptyRoutes = [
		"VERB",
		"AUX",
		"NOUN",
		"PROPN",
		"ADJ",
		"ADV",
		"PRON",
		"DET",
	].filter((kind) => !routeGuidance[kind]);
	checks.push([
		"questions cite `policy.route` but routeGuidance is empty for these Kinds",
		emptyRoutes.length > 0,
		emptyRoutes.join(", "),
	]);
	checks.push([
		"DET route guidance prescribes Partial coverage, but DET has no coverage question and production rejects Partial for non-Phraseme non-NOUN",
		(routeGuidance.DET ?? "").includes("Partial coverage"),
		(routeGuidance.DET ?? "").match(/[^.]*Partial coverage[^.]*\./u)?.[0] ??
			"",
	]);
	checks.push([
		"ADP guidance refers to a 'lexical particle policy' that no state field supplies",
		(routeGuidance.ADP ?? "").includes("lexical particle policy"),
		"",
	]);
	checks.push([
		"NOUN guidance points to suspension rules 'in the shared policy', but they live in policy.noun.suspension",
		(routeGuidance.NOUN ?? "").includes("shared policy"),
		"",
	]);
	const routeDiffs = Object.keys(lexemeRoutes).filter(
		(key) =>
			key in classificationRoutes &&
			(lexemeRoutes as Record<string, string>)[key] !==
				(classificationRoutes as Record<string, string>)[key],
	);
	checks.push([
		"intake route inventory and classification-fallback route inventory describe the same Kinds differently",
		routeDiffs.length > 0,
		routeDiffs.join(", "),
	]);
	const emojiKinds = [
		...new Set(emojiExamples.map((example) => example.kind)),
	];
	checks.push([
		"emoji generation prompt/corpus demonstrate only these Kinds, yet production generates for every open route",
		true,
		`${emojiKinds.join(", ")}; reading operation cases that reached reading.generate by route: ${[
			...new Set(
				rows
					.filter((row) => row.label === "reading.generate")
					.map((row) => row.route.split("/").at(-1)),
			),
		].join(", ")}`,
	]);
	const emojiPrompt = prompts["reading-generation/de"] ?? "";
	checks.push([
		"emoji prompt is free text ('Return only one to four emoji graphemes, directly as text') with no output schema",
		emojiPrompt.includes("directly as text"),
		"",
	]);
	checks.push([
		"emoji prompt example treats 'ist ... geschlossen' as ADJ geschlossen while the verb grammar corpus treats 'Die Tür ist geschlossen' as a VERB state passive",
		emojiPrompt.includes('"lemma":"geschlossen"'),
		"",
	]);
	for (const [name, flagged, detail] of checks)
		console.log(
			`- [${flagged ? "FLAG" : "ok"}] ${name}${detail ? ` — ${detail}` : ""}`,
		);
}

/** Support-gate false rejections from recorded live grammar runs (no new calls). */
function recordedSupport() {
	const base = resolve(root, "../../.runs/dumgen");
	if (!existsSync(base)) return;
	console.log(
		"\n## Recorded live grammar runs: `support` gate on gold targets (no new calls)\n",
	);
	console.log(
		"| run | experiment | cases | failures | support-gate failures | P(Unresolved)>0.5 / >0.65 / >0.8 on gold-supported targets | features-call tokens p50 (usage) | chars per token |",
	);
	console.log("|---|---|---|---|---|---|---|---|");
	for (const run of readdirSync(base)) {
		const file = resolve(base, run, "cases.jsonl");
		if (!existsSync(file)) continue;
		const manifest = JSON.parse(
			readFileSync(resolve(base, run, "manifest.json"), "utf8"),
		);
		if (!String(manifest.experimentId).startsWith("grammatical-resolution"))
			continue;
		const cases = readFileSync(file, "utf8")
			.split("\n")
			.filter(Boolean)
			.map((line) => JSON.parse(line));
		const probabilities: number[] = [];
		const inputTokens: number[] = [];
		const ratios: number[] = [];
		for (const item of cases) {
			const goldUnresolved = item.idealOutput?.decision === "Unresolved";
			for (const trace of item.traces ?? [])
				for (const call of trace.calls ?? []) {
					if (!String(call.request?.route).endsWith("/features"))
						continue;
					const usage = call.output?.usage?.input_tokens;
					if (usage) {
						inputTokens.push(usage);
						ratios.push(
							json({
								state: call.request.input,
								questions: call.request.questions,
							}).length / usage,
						);
					}
					const support =
						call.output?.answers?.support?.probabilities;
					if (support && !goldUnresolved)
						probabilities.push(support.Unresolved);
				}
		}
		const failures = cases.filter((item) => item.status !== "Success");
		const supportFailures = failures.filter((item) =>
			JSON.stringify(item.traces ?? []).includes(
				"Unresolved applicable question support",
			),
		).length;
		console.log(
			`| ${run.slice(0, 8)} (${manifest.sourceRevision}) | ${manifest.experimentId} | ${cases.length} | ${failures.length} | ${supportFailures} | ${probabilities.filter((p) => p > 0.5).length} / ${probabilities.filter((p) => p > 0.65).length} / ${probabilities.filter((p) => p > 0.8).length} | ${r0(pct(inputTokens, 0.5))} | ${mean(ratios).toFixed(2)} |`,
		);
	}
}

/** Intake: which question families carry the payload, and how often the chunk budget bites. */
function intakeBreakdown() {
	const intake = rows.filter((row) => row.label === "intake.analyze");
	const families = new Map<string, { count: number[]; chars: number[] }>();
	const share = new Map<string, number[]>();
	for (const row of intake) {
		const totals = new Map<string, { count: number; chars: number }>();
		for (const [id, question] of Object.entries(row.questions ?? {})) {
			const family = id.split("_")[0]!;
			const entry = totals.get(family) ?? { count: 0, chars: 0 };
			entry.count++;
			entry.chars += json({ [id]: question }).length;
			totals.set(family, entry);
		}
		const all = measure(row).chars;
		for (const [family, entry] of totals) {
			const bucket = families.get(family) ?? { count: [], chars: [] };
			bucket.count.push(entry.count);
			bucket.chars.push(entry.chars);
			families.set(family, bucket);
			share.set(family, [
				...(share.get(family) ?? []),
				entry.chars / all,
			]);
		}
		share.set("state", [
			...(share.get("state") ?? []),
			json(row.state).length / all,
		]);
	}
	console.log(
		"\n## Intake payload by question family (per call; m=membership, route, role, id=authored identity, fix=fixedness, pk=phraseme kind, same=pair)\n",
	);
	console.log(
		"| family | calls with it | questions/call mean | chars/call mean | chars per question | share of payload |",
	);
	console.log("|---|---|---|---|---|---|");
	for (const [family, bucket] of [...families].sort(
		(a, b) => mean(b[1].chars) - mean(a[1].chars),
	))
		console.log(
			`| ${family} | ${bucket.count.length} | ${mean(bucket.count).toFixed(1)} | ${r0(mean(bucket.chars))} | ${r0(mean(bucket.chars) / mean(bucket.count))} | ${(mean(share.get(family) ?? [0]) * 100).toFixed(0)}% |`,
		);
	console.log(
		`| state (sentence+criteria+fixedness) | ${intake.length} | - | ${r0(mean(intake.map((row) => json(row.state).length)))} | - | ${(mean(share.get("state") ?? [0]) * 100).toFixed(0)}% |`,
	);
	const perSentence = new Map<string, Row[]>();
	for (const row of intake)
		perSentence.set(row.caseId, [
			...(perSentence.get(row.caseId) ?? []),
			row,
		]);
	const resolvable = (row: Row) =>
		Object.keys(row.questions ?? {}).filter((id) => id.startsWith("route_"))
			.length;
	const chunked = [...perSentence.values()].filter(
		(calls) => calls.length > 1,
	);
	const overBudget = intake.filter(
		(row) => tokens(measure(row).chars) > 32_000,
	);
	const sentenceTokens = [...perSentence.values()].map((calls) =>
		calls.reduce((sum, row) => sum + tokens(measure(row).chars), 0),
	);
	console.log(
		`\nSentences: ${perSentence.size}; chunked into >1 call: ${chunked.length} (max ${Math.max(...[...perSentence.values()].map((calls) => calls.length))} calls); calls over the 32k-token budget the chunker assumes: ${overBudget.length} (largest ~${r0(Math.max(...intake.map((row) => tokens(measure(row).chars))))} tok). Whole-sentence ~tokens p50 ${r0(pct(sentenceTokens, 0.5))}, p90 ${r0(pct(sentenceTokens, 0.9))}, max ${r0(Math.max(...sentenceTokens))}.`,
	);
	const byWords = new Map<number, number[]>();
	for (const calls of perSentence.values()) {
		const words = calls.reduce((sum, row) => sum + resolvable(row), 0);
		const bucket =
			words < 6
				? 5
				: words < 9
					? 8
					: words < 12
						? 11
						: words < 16
							? 15
							: 99;
		byWords.set(bucket, [
			...(byWords.get(bucket) ?? []),
			calls.reduce((sum, row) => sum + tokens(measure(row).chars), 0),
		]);
	}
	console.log(
		`Whole-sentence ~tokens by resolvable words: ${[...byWords]
			.sort((a, b) => a[0] - b[0])
			.map(
				([bucket, values]) =>
					`${bucket === 99 ? "16+" : `<=${bucket}`}: n=${values.length} p50 ${r0(pct(values, 0.5))}`,
			)
			.join("; ")}`,
	);
}

/** Calibrate the chars/3.5 estimate against the sibling waterfall's live intake usage. */
function calibrate() {
	const file = resolve(here, "results/baseline-baseline.json");
	if (!existsSync(file)) return;
	const data = JSON.parse(readFileSync(file, "utf8")) as {
		calls: {
			label: string;
			scope: string;
			scopeId: string;
			questions: number;
			stateChars: number;
			inputTokens: number;
			durationMs: number;
			route: string;
			input?: { members?: string[] };
			output?: { canonicalForm?: string };
		}[];
	};
	const live = data.calls.filter(
		(call) =>
			call.label === "intake.analyze" &&
			call.scope === "intake" &&
			call.inputTokens > 0,
	);
	const ratios: number[] = [];
	for (const call of live) {
		const row = rows.find(
			(candidate) =>
				candidate.label === "intake.analyze" &&
				candidate.caseId.startsWith("sentence-de-") &&
				Object.keys(candidate.questions ?? {}).length ===
					call.questions &&
				Math.abs(json(candidate.state).length - call.stateChars) < 30,
		);
		if (row) ratios.push(measure(row).chars / call.inputTokens);
	}
	if (ratios.length)
		console.log(
			`\n## Calibration against live intake usage (waterfall baseline)\n\n${ratios.length} matched intake calls: chars per jev input token mean ${mean(ratios).toFixed(2)} (min ${Math.min(...ratios).toFixed(2)}, max ${Math.max(...ratios).toFixed(2)}).`,
		);
	// Live canonical-form follow-ups the rule candidates would have covered.
	const followUps = data.calls.filter(
		(call) => call.label === "grammar.text",
	);
	if (followUps.length)
		console.log(
			`\nLive grammar.text follow-ups in the waterfall baseline: ${followUps.length}. ${followUps
				.map((call) => {
					const members = call.input?.members ?? [];
					const gold = call.output?.canonicalForm ?? "";
					const kind = call.route.split("/")[2] ?? "";
					const rules = ruleCandidates(kind, members, false).has(
						gold,
					);
					const table = ruleCandidates(kind, members).has(gold);
					return `${members.join(" ")}->${gold}${rules ? " [rule]" : table ? " [table]" : ""}`;
				})
				.join("; ")}`,
		);
}

const verbEndings = [
	"est",
	"et",
	"st",
	"t",
	"e",
	"en",
	"n",
	"te",
	"ten",
	"test",
	"tet",
	"tst",
];
/** A small irregular table; a real one would come from a reviewed lexicon. */
const irregular: Record<string, string> = {
	war: "sein",
	waren: "sein",
	ist: "sein",
	sind: "sein",
	bin: "sein",
	bist: "sein",
	gibt: "geben",
	gab: "geben",
	ging: "gehen",
	liest: "lesen",
	las: "lesen",
	hat: "haben",
	hatte: "haben",
	wird: "werden",
	wurde: "werden",
	kam: "kommen",
	sah: "sehen",
	sieht: "sehen",
	nahm: "nehmen",
	nimmt: "nehmen",
	fand: "finden",
	gesungen: "singen",
	sang: "singen",
	mitgebracht: "mitbringen",
	gebracht: "bringen",
	brachte: "bringen",
	weiß: "wissen",
	wusste: "wissen",
	gebeten: "bitten",
	bat: "bitten",
};
function ruleCandidates(
	kind: string,
	members: readonly string[],
	useIrregular = true,
) {
	const words = members.map((word) => word.toLocaleLowerCase("de"));
	const joined = members.join(" ");
	const out = new Set<string>([
		joined.slice(0, 1).toLocaleLowerCase("de") + joined.slice(1),
	]);
	if (kind === "VERB" || kind === "AUX") {
		const stems = new Set<string>();
		for (const word of words) {
			if (useIrregular && irregular[word]) out.add(irregular[word]!);
			stems.add(word);
			for (const ending of verbEndings)
				if (word.endsWith(ending) && word.length > ending.length + 2)
					stems.add(word.slice(0, -ending.length));
			const participle = /^ge(.+?)(t|en)$/u.exec(word);
			if (participle) stems.add(participle[1]!);
			const inner = /^(.+?)ge(.+?)(t|en)$/u.exec(word);
			if (inner) stems.add(inner[1]! + inner[2]!);
			const zu = /^(.+?)zu(.+en)$/u.exec(word);
			if (zu) stems.add(zu[1]! + zu[2]!);
		}
		const infinitives = new Set<string>(
			[...out].filter((text) => !text.includes(" ")),
		);
		for (const stem of stems) {
			infinitives.add(stem.endsWith("en") ? stem : `${stem}en`);
			infinitives.add(stem.endsWith("n") ? stem : `${stem}n`);
		}
		for (const infinitive of infinitives) out.add(infinitive);
		for (const particle of words)
			for (const infinitive of infinitives)
				if (particle.length <= 6 && particle !== infinitive)
					out.add(particle + infinitive);
		for (const candidate of [...out]) out.add(`sich ${candidate}`);
	} else if (kind === "ADJ" || kind === "ADV") {
		for (const word of words) {
			out.add(word);
			for (const ending of ["e", "en", "em", "er", "es"])
				if (word.endsWith(ending))
					out.add(word.slice(0, -ending.length));
		}
	} else if (kind === "NOUN") {
		for (const word of members) {
			out.add(word);
			for (const ending of ["n", "en", "e", "er", "ern", "s", "es", "ns"])
				if (word.endsWith(ending) && word.length > ending.length + 2)
					out.add(word.slice(0, -ending.length));
		}
		for (const candidate of [...out])
			out.add(
				candidate
					.replace(/ä(?=[^äöü]*$)/u, "a")
					.replace(/ö(?=[^äöü]*$)/u, "o")
					.replace(/ü(?=[^äöü]*$)/u, "u"),
			);
	} else for (const word of words) out.add(word);
	return out;
}

// ------------------------------------------------------------- main

await measureIntake();
await measureClassification();
await measureGrammar();
await measureReading();
await measureDrafts();

if (args.dump) {
	const [label, caseId] = args.dump.split(":");
	const row = rows.find(
		(candidate) => candidate.label === label && candidate.caseId === caseId,
	);
	console.log(JSON.stringify(row ?? null, null, 2));
	process.exit(0);
}

const measured = report();
intakeBreakdown();
canonicalCoverage();
closedClassIdentity();
consistency();
recordedSupport();
calibrate();

if (args.json)
	writeFileSync(
		args.json,
		JSON.stringify(
			measured.map(({ row, m }) => ({
				label: row.label,
				caseId: row.caseId,
				route: row.route,
				...m,
				pairWords: Object.fromEntries(m.pairWords),
			})),
			null,
			1,
		),
	);
