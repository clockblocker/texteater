// PROTOTYPE ONLY — throwaway prompt/agent experiment for GitHub issue #4.
//
// Question: which decomposition and prompt source most reliably implements the
// Segmentation Chain against the fixed segmentation-chain-v1 eval corpus?

import { createHash } from "node:crypto";
import {
	appendFile,
	mkdir,
	readdir,
	readFile,
	writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import {
	CORPUS,
	type CorpusCase,
	type Decision,
	KINDS,
	type Kind,
	type Segment,
} from "./corpus.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNS = join(HERE, "runs");
const MODEL = "gpt-5-nano";
const RESOLVED_SNAPSHOT = "gpt-5-nano-2025-08-07";
const CORPUS_VERSION = "segmentation-chain-v1";
const RUNNER_VERSION = "issue-4-prototype-v1";
const REPS = 3;
const SHUFFLE_SEED = 4_204_202_607_31;
const PRICING = {
	scheduleId: "openai-standard-pricing-2026-07-31",
	effectiveDate: "2026-07-31",
	url: "https://developers.openai.com/api/docs/pricing",
	currency: "USD",
	perMillion: { input: 0.05, cachedInput: 0.005, output: 0.4 },
};

type Arm = {
	id: string;
	decomposition: "combined" | "decomposed";
	strategy: "direct" | "agentic-review";
	promptSource: "minimal-zero-shot" | "explicit-few-shot";
};

const ARMS: readonly Arm[] = [
	{
		id: "minimal-combined-direct",
		decomposition: "combined",
		strategy: "direct",
		promptSource: "minimal-zero-shot",
	},
	{
		id: "explicit-combined-direct",
		decomposition: "combined",
		strategy: "direct",
		promptSource: "explicit-few-shot",
	},
	{
		id: "explicit-decomposed-direct",
		decomposition: "decomposed",
		strategy: "direct",
		promptSource: "explicit-few-shot",
	},
	{
		id: "explicit-combined-agentic",
		decomposition: "combined",
		strategy: "agentic-review",
		promptSource: "explicit-few-shot",
	},
] as const;

type Usage = {
	input_tokens?: number;
	input_tokens_details?: {
		cached_tokens?: number;
		cache_write_tokens?: number;
	};
	output_tokens?: number;
	output_tokens_details?: { reasoning_tokens?: number };
	total_tokens?: number;
};

type RequestRecord = {
	stage: string;
	startedAt: string;
	endedAt: string;
	latencyMs: number;
	promptBytes: number;
	rawOutputBytes: number;
	responseId?: string;
	resolvedModel?: string;
	serviceTier?: string;
	status?: string;
	usage?: Usage;
	costUsd?: number;
	rawResponse?: unknown;
	error?: { name: string; message: string; status?: number; code?: string };
};

type Prediction = { decision: Decision; segments: Segment[] };

type CanonicalResult =
	| { decision: Exclude<Decision, "Accepted"> }
	| {
			decision: "Accepted";
			segmentedSentenceId: string;
			segments: Array<Segment & { index: number; clickable: boolean }>;
	  };

type Attempt = {
	arm: Arm;
	caseId: string;
	className: string;
	repetition: number;
	shuffleOrdinal: number;
	source: string;
	prediction?: Prediction;
	canonical?: CanonicalResult;
	requests: RequestRecord[];
	adapterError?: string;
	domainGates: Record<string, boolean>;
};

const combinedSchema = {
	type: "object",
	additionalProperties: false,
	required: ["decision", "segments"],
	properties: {
		decision: {
			type: "string",
			enum: ["Accepted", "UnsupportedLanguage", "Unintelligible"],
		},
		segments: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				required: ["kind", "text"],
				properties: {
					kind: { type: "string", enum: [...KINDS] },
					text: { type: "string" },
				},
			},
		},
	},
} as const;

const intakeSchema = {
	type: "object",
	additionalProperties: false,
	required: ["decision"],
	properties: {
		decision: {
			type: "string",
			enum: ["Accepted", "UnsupportedLanguage", "Unintelligible"],
		},
	},
} as const;

const segmentationSchema = {
	type: "object",
	additionalProperties: false,
	required: ["segments"],
	properties: { segments: combinedSchema.properties.segments },
} as const;

const BASE_RULES = `Supported languages are German, English, and Hebrew.
Intake is exactly Accepted, UnsupportedLanguage, or Unintelligible.
Accepted means at least some useful supported-language material is defensibly resolvable; it is not a percentage threshold and may contain local OpaqueText.
UnsupportedLanguage is valid language outside the supported inventory.
Unintelligible is gibberish or too corrupted for a defensible interpretation.

For Accepted input, output the complete authoritative text as ordered nonempty segments. Concatenating segment text is the authoritative replacement.
Kinds are exactly ResolvableText, OpaqueText, Whitespace, Punctuation.
Only ResolvableText is clickable, but clickability is application-derived and must not be output.
Use one maximal contiguous whitespace run per Whitespace segment.
Use one punctuation grapheme per Punctuation segment, so ?! is two segments.
Keep a maximal locally uninterpretable run as OpaqueText while preserving useful surrounding text.
Ordinary typos and licensed spelling variants remain byte-for-byte as written.
Only severe but intelligible structural corruption may be conservatively reconstructed.
Reconstruction may repair structural word boundaries but must not normalize spelling, expand abbreviations, lemmatize, or perform downstream lexical resolution.
Hebrew visible fused prefixes and pronominal suffixes are separate adjacent ResolvableText click atoms even without whitespace.
Never output IDs, indices, source spans, alignment, analysis, or explanations.`;

const FEW_SHOTS = `Examples below are authoring examples, not evaluation items.

Input: "Der Kaffee ist heiß."
Output: {"decision":"Accepted","segments":[{"kind":"ResolvableText","text":"Der"},{"kind":"Whitespace","text":" "},{"kind":"ResolvableText","text":"Kaffee"},{"kind":"Whitespace","text":" "},{"kind":"ResolvableText","text":"ist"},{"kind":"Whitespace","text":" "},{"kind":"ResolvableText","text":"heiß"},{"kind":"Punctuation","text":"."}]}

Input: "undAllesgut!"
Output: {"decision":"Accepted","segments":[{"kind":"ResolvableText","text":"und"},{"kind":"Whitespace","text":" "},{"kind":"ResolvableText","text":"Alles"},{"kind":"Whitespace","text":" "},{"kind":"ResolvableText","text":"gut"},{"kind":"Punctuation","text":"!"}]}

Input: "והחתול ישן."
Output: {"decision":"Accepted","segments":[{"kind":"ResolvableText","text":"ו"},{"kind":"ResolvableText","text":"ה"},{"kind":"ResolvableText","text":"חתול"},{"kind":"Whitespace","text":" "},{"kind":"ResolvableText","text":"ישן"},{"kind":"Punctuation","text":"."}]}

Input: "Wir treffen quux42 später."
Output: {"decision":"Accepted","segments":[{"kind":"ResolvableText","text":"Wir"},{"kind":"Whitespace","text":" "},{"kind":"ResolvableText","text":"treffen"},{"kind":"Whitespace","text":" "},{"kind":"OpaqueText","text":"quux42"},{"kind":"Whitespace","text":" "},{"kind":"ResolvableText","text":"später"},{"kind":"Punctuation","text":"."}]}

Input: "Bonjour tout le monde."
Output: {"decision":"UnsupportedLanguage","segments":[]}`;

const MINIMAL_COMBINED = `Classify the exact source as Accepted, UnsupportedLanguage, or Unintelligible. Supported: German, English, Hebrew. If Accepted, split all authoritative text into ResolvableText, OpaqueText, maximal Whitespace runs, and individual Punctuation characters. Preserve ordinary errors. Repair only severe intelligible spacing corruption. Split visible Hebrew fused material into clickable atoms. Rejected decisions have no segments. Return only the schema.`;

const EXPLICIT_COMBINED = `You are the Segmentation Chain intake and language-specific segmenter.

${BASE_RULES}

For rejected input, segments must be [].

${FEW_SHOTS}`;

const EXPLICIT_INTAKE = `You are the language-agnostic intake specialist for the Segmentation Chain.

${BASE_RULES.split("\n\nFor Accepted input")[0]}

Do not segment. Return only the decision schema.

Decision examples:
- "Der Kaffee ist heiß." => Accepted
- "והחתול ישן." => Accepted
- "Bonjour tout le monde." => UnsupportedLanguage
- "undAllesgut!" => Accepted`;

const EXPLICIT_SEGMENT = `You are the language-specific segmenter for an input already accepted by intake.

${BASE_RULES}

Return segments only.

${FEW_SHOTS.replaceAll(/"decision":"(?:Accepted|UnsupportedLanguage)",/g, "")}`;

const REVIEWER = `You are the reviewing agent for a Segmentation Chain candidate. Inspect the exact source and candidate independently. Correct every intake, preservation, corruption-boundary, opacity, punctuation, whitespace, or Hebrew fused-atom error. Do not defer to the draft. Emit the final canonical prediction only.

${BASE_RULES}

For rejected input, segments must be [].`;

function bytes(value: unknown): number {
	return new TextEncoder().encode(
		typeof value === "string" ? value : JSON.stringify(value),
	).byteLength;
}

function cost(usage: Usage | undefined): number | undefined {
	if (!usage) return undefined;
	const input = usage.input_tokens;
	const output = usage.output_tokens;
	if (input === undefined || output === undefined) return undefined;
	const cached = usage.input_tokens_details?.cached_tokens ?? 0;
	return (
		((input - cached) * PRICING.perMillion.input +
			cached * PRICING.perMillion.cachedInput +
			output * PRICING.perMillion.output) /
		1_000_000
	);
}

function assertDecision(value: unknown): Decision {
	if (
		value === "Accepted" ||
		value === "UnsupportedLanguage" ||
		value === "Unintelligible"
	)
		return value;
	throw new Error(`invalid decision: ${JSON.stringify(value)}`);
}

function assertSegments(value: unknown): Segment[] {
	if (!Array.isArray(value)) throw new Error("segments is not an array");
	return value.map((item, index) => {
		if (!item || typeof item !== "object")
			throw new Error(`segment ${index} is not an object`);
		const candidate = item as Record<string, unknown>;
		if (
			typeof candidate.kind !== "string" ||
			!KINDS.includes(candidate.kind as Kind)
		)
			throw new Error(`segment ${index} has invalid kind`);
		if (typeof candidate.text !== "string" || candidate.text.length === 0)
			throw new Error(`segment ${index} has empty/non-string text`);
		return { kind: candidate.kind as Kind, text: candidate.text };
	});
}

function parseCombined(text: string): Prediction {
	const value = JSON.parse(text) as Record<string, unknown>;
	const decision = assertDecision(value.decision);
	const segments = assertSegments(value.segments);
	if (decision === "Accepted" && segments.length === 0)
		throw new Error("Accepted result has no segments");
	if (decision !== "Accepted" && segments.length !== 0)
		throw new Error("rejected result has segments");
	return { decision, segments };
}

function parseIntake(text: string): Decision {
	return assertDecision(
		(JSON.parse(text) as Record<string, unknown>).decision,
	);
}

function parseSegmentation(text: string): Segment[] {
	const segments = assertSegments(
		(JSON.parse(text) as Record<string, unknown>).segments,
	);
	if (segments.length === 0)
		throw new Error("segmenter returned no segments");
	return segments;
}

function canonicalize(
	prediction: Prediction,
	armId: string,
	caseId: string,
	repetition: number,
): CanonicalResult {
	if (prediction.decision !== "Accepted")
		return { decision: prediction.decision };
	const stableInput = `${CORPUS_VERSION}\0${armId}\0${caseId}\0${repetition}\0${JSON.stringify(prediction.segments)}`;
	const segmentedSentenceId = `ss_${createHash("sha256").update(stableInput).digest("hex").slice(0, 24)}`;
	return {
		decision: "Accepted",
		segmentedSentenceId,
		segments: prediction.segments.map((segment, index) => ({
			...segment,
			index,
			clickable: segment.kind === "ResolvableText",
		})),
	};
}

function domainGates(canonical: CanonicalResult | undefined) {
	if (!canonical)
		return {
			nonemptyStableId: false,
			immutableRead: false,
			correctionCreatesNewId: false,
			localIndices: false,
			noGlobalSegmentIds: false,
			validKindsAndNonempty: false,
			clickabilityExact: false,
			rejectionCreatesNoSentence: false,
			noSourceAlignment: false,
		};
	if (canonical.decision !== "Accepted")
		return {
			nonemptyStableId: true,
			immutableRead: true,
			correctionCreatesNewId: true,
			localIndices: true,
			noGlobalSegmentIds: true,
			validKindsAndNonempty: true,
			clickabilityExact: true,
			rejectionCreatesNoSentence: !("segmentedSentenceId" in canonical),
			noSourceAlignment: true,
		};
	const serialized = JSON.stringify(canonical);
	return {
		nonemptyStableId: canonical.segmentedSentenceId.length > 0,
		immutableRead: JSON.stringify(JSON.parse(serialized)) === serialized,
		correctionCreatesNewId:
			`${canonical.segmentedSentenceId}_correction` !==
			canonical.segmentedSentenceId,
		localIndices: canonical.segments.every(
			(segment, i) => segment.index === i,
		),
		noGlobalSegmentIds: canonical.segments.every(
			(segment) => !("id" in segment) && !("segmentId" in segment),
		),
		validKindsAndNonempty: canonical.segments.every(
			(segment) =>
				segment.text.length > 0 && KINDS.includes(segment.kind as Kind),
		),
		clickabilityExact: canonical.segments.every(
			(segment) =>
				segment.clickable === (segment.kind === "ResolvableText"),
		),
		rejectionCreatesNoSentence: true,
		noSourceAlignment:
			!("sourceAlignment" in canonical) && !("spans" in canonical),
	};
}

async function structuredRequest(
	openai: OpenAI,
	stage: string,
	instructions: string,
	input: string,
	name: string,
	schema: Record<string, unknown>,
): Promise<{ text?: string; record: RequestRecord }> {
	const started = performance.now();
	const startedAt = new Date().toISOString();
	const requestBody = {
		model: MODEL,
		instructions,
		input,
		reasoning: { effort: "minimal" as const },
		max_output_tokens: 1_600,
		service_tier: "default" as const,
		store: false,
		text: {
			format: {
				type: "json_schema" as const,
				name,
				strict: true,
				schema,
			},
		},
	};
	try {
		const response = await openai.responses.create(requestBody);
		const endedAt = new Date().toISOString();
		const record: RequestRecord = {
			stage,
			startedAt,
			endedAt,
			latencyMs: performance.now() - started,
			promptBytes: bytes({
				instructions,
				input,
				text: requestBody.text,
			}),
			rawOutputBytes: bytes(response.output_text),
			responseId: response.id,
			resolvedModel: response.model,
			serviceTier: response.service_tier ?? undefined,
			status: response.status,
			usage: response.usage as Usage,
			rawResponse: response,
		};
		record.costUsd = cost(record.usage);
		if (response.status !== "completed")
			throw Object.assign(
				new Error(`response status ${response.status}`),
				{ responseRecord: record },
			);
		return { text: response.output_text, record };
	} catch (error) {
		const endedAt = new Date().toISOString();
		const e = error as Error & {
			status?: number;
			code?: string;
			responseRecord?: RequestRecord;
		};
		if (e.responseRecord) throw error;
		const record: RequestRecord = {
			stage,
			startedAt,
			endedAt,
			latencyMs: performance.now() - started,
			promptBytes: bytes({
				instructions,
				input,
				text: requestBody.text,
			}),
			rawOutputBytes: 0,
			error: {
				name: e.name,
				message: e.message,
				status: e.status,
				code: e.code,
			},
		};
		throw Object.assign(error as object, { responseRecord: record });
	}
}

async function runAttempt(
	openai: OpenAI,
	arm: Arm,
	corpusCase: CorpusCase,
	repetition: number,
	shuffleOrdinal: number,
): Promise<Attempt> {
	const attempt: Attempt = {
		arm,
		caseId: corpusCase.id,
		className: corpusCase.className,
		repetition,
		shuffleOrdinal,
		source: corpusCase.source,
		requests: [],
		domainGates: {},
	};
	try {
		let prediction: Prediction;
		if (arm.decomposition === "decomposed") {
			const intake = await structuredRequest(
				openai,
				"intake",
				EXPLICIT_INTAKE,
				`Exact source JSON string:\n${JSON.stringify(corpusCase.source)}`,
				"intake_decision",
				intakeSchema,
			);
			attempt.requests.push(intake.record);
			const decision = parseIntake(intake.text ?? "");
			if (decision === "Accepted") {
				const segmentation = await structuredRequest(
					openai,
					"segmentation",
					EXPLICIT_SEGMENT,
					`Exact accepted source JSON string:\n${JSON.stringify(corpusCase.source)}`,
					"segmentation",
					segmentationSchema,
				);
				attempt.requests.push(segmentation.record);
				prediction = {
					decision,
					segments: parseSegmentation(segmentation.text ?? ""),
				};
			} else {
				prediction = { decision, segments: [] };
			}
		} else {
			const prompt =
				arm.promptSource === "minimal-zero-shot"
					? MINIMAL_COMBINED
					: EXPLICIT_COMBINED;
			const draft = await structuredRequest(
				openai,
				"combined-draft",
				prompt,
				`Exact source JSON string:\n${JSON.stringify(corpusCase.source)}`,
				"segmentation_chain",
				combinedSchema,
			);
			attempt.requests.push(draft.record);
			prediction = parseCombined(draft.text ?? "");
			if (arm.strategy === "agentic-review") {
				const review = await structuredRequest(
					openai,
					"independent-review",
					REVIEWER,
					`Exact source JSON string:\n${JSON.stringify(corpusCase.source)}\n\nDraft candidate:\n${JSON.stringify(prediction)}`,
					"reviewed_segmentation_chain",
					combinedSchema,
				);
				attempt.requests.push(review.record);
				prediction = parseCombined(review.text ?? "");
			}
		}
		attempt.prediction = prediction;
		attempt.canonical = canonicalize(
			prediction,
			arm.id,
			corpusCase.id,
			repetition,
		);
	} catch (error) {
		const e = error as Error & { responseRecord?: RequestRecord };
		if (e.responseRecord) attempt.requests.push(e.responseRecord);
		attempt.adapterError = `${e.name}: ${e.message}`;
	}
	attempt.domainGates = domainGates(attempt.canonical);
	return attempt;
}

function seededShuffle<T>(values: readonly T[], seed: number): T[] {
	const result = [...values];
	let state = seed >>> 0;
	const random = () => {
		state = (state * 1_664_525 + 1_013_904_223) >>> 0;
		return state / 2 ** 32;
	};
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[result[i], result[j]] = [result[j] as T, result[i] as T];
	}
	return result;
}

function percentile(values: number[], p: number): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.ceil((p / 100) * sorted.length) - 1] ?? null;
}

function stats(values: number[]) {
	return {
		count: values.length,
		mean:
			values.length === 0
				? null
				: values.reduce((sum, value) => sum + value, 0) / values.length,
		p50: percentile(values, 50),
		p95: percentile(values, 95),
		max: values.length === 0 ? null : Math.max(...values),
		total: values.reduce((sum, value) => sum + value, 0),
	};
}

function graphemeLength(text: string): number {
	return [
		...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
			text,
		),
	].length;
}

type Span = {
	start: number;
	end: number;
	kind: Kind;
	text: string;
	clickable: boolean;
};

function spans(segments: readonly Segment[]): Span[] {
	let cursor = 0;
	return segments.map((segment) => {
		const start = cursor;
		cursor += graphemeLength(segment.text);
		return {
			start,
			end: cursor,
			kind: segment.kind,
			text: segment.text,
			clickable: segment.kind === "ResolvableText",
		};
	});
}

function key(value: unknown): string {
	return JSON.stringify(value);
}

function setCounts(gold: Set<string>, predicted: Set<string>) {
	let intersection = 0;
	for (const value of gold) if (predicted.has(value)) intersection++;
	return {
		tp: intersection,
		fp: predicted.size - intersection,
		fn: gold.size - intersection,
	};
}

function ratios(counts: { tp: number; fp: number; fn: number }) {
	const precision =
		counts.tp + counts.fp === 0
			? null
			: counts.tp / (counts.tp + counts.fp);
	const recall =
		counts.tp + counts.fn === 0
			? null
			: counts.tp / (counts.tp + counts.fn);
	const f1 =
		precision === null || recall === null || precision + recall === 0
			? null
			: (2 * precision * recall) / (precision + recall);
	const union = counts.tp + counts.fp + counts.fn;
	return {
		...counts,
		precision,
		recall,
		f1,
		unionAccuracy: union === 0 ? null : counts.tp / union,
	};
}

function scoreAttempt(attempt: Attempt, corpusCase: CorpusCase) {
	const prediction = attempt.prediction;
	const goldSegments = corpusCase.segments ?? [];
	const predictedSegments =
		prediction?.decision === "Accepted" ? prediction.segments : [];
	const goldText = goldSegments.map((segment) => segment.text).join("");
	const predictedText = predictedSegments
		.map((segment) => segment.text)
		.join("");
	const textAligns =
		corpusCase.decision === "Accepted" &&
		prediction?.decision === "Accepted" &&
		predictedText === goldText;
	const goldSpans = spans(goldSegments);
	const predictedSpans = spans(predictedSegments);
	const predictedForIntersection = textAligns ? predictedSpans : [];
	const boundary = ratios(
		setCounts(
			new Set(goldSpans.map((span) => key([span.start, span.end]))),
			new Set(
				predictedForIntersection.map((span) =>
					key([span.start, span.end]),
				),
			),
		),
	);
	if (!textAligns && predictedSpans.length > 0)
		boundary.fp += predictedSpans.length;
	const boundaryFinal = ratios(boundary);
	const boundaryKindCounts = setCounts(
		new Set(
			goldSpans.map((span) => key([span.start, span.end, span.kind])),
		),
		new Set(
			predictedForIntersection.map((span) =>
				key([span.start, span.end, span.kind]),
			),
		),
	);
	if (!textAligns && predictedSpans.length > 0)
		boundaryKindCounts.fp += predictedSpans.length;
	const clickCounts = setCounts(
		new Set(
			goldSpans.map((span) =>
				key([span.start, span.end, span.clickable]),
			),
		),
		new Set(
			predictedForIntersection.map((span) =>
				key([span.start, span.end, span.clickable]),
			),
		),
	);
	if (!textAligns && predictedSpans.length > 0)
		clickCounts.fp += predictedSpans.length;
	const opaqueCounts = setCounts(
		new Set(
			goldSpans
				.filter((span) => span.kind === "OpaqueText")
				.map((span) => key([span.start, span.end, span.text])),
		),
		new Set(
			predictedForIntersection
				.filter((span) => span.kind === "OpaqueText")
				.map((span) => key([span.start, span.end, span.text])),
		),
	);
	const exactSentence =
		corpusCase.decision === "Accepted" &&
		prediction?.decision === "Accepted" &&
		JSON.stringify(predictedSegments) === JSON.stringify(goldSegments);
	const exactCase =
		prediction?.decision === corpusCase.decision &&
		(corpusCase.decision !== "Accepted" || exactSentence);
	return {
		intakeExact: prediction?.decision === corpusCase.decision,
		textExact:
			corpusCase.decision === "Accepted"
				? predictedText === goldText
				: null,
		exactSentence,
		exactCase,
		boundary: boundaryFinal,
		boundaryKind: ratios(boundaryKindCounts),
		click: ratios(clickCounts),
		clickCaseExact:
			textAligns &&
			key(
				goldSpans.map((span) => [span.start, span.end, span.clickable]),
			) ===
				key(
					predictedSpans.map((span) => [
						span.start,
						span.end,
						span.clickable,
					]),
				),
		opaque: ratios(opaqueCounts),
		predictedText,
		preservedSource: corpusCase.id.startsWith("DE-PRESERVE-")
			? predictedText === corpusCase.source
			: null,
		reconstructionExact: corpusCase.id.startsWith("RECON-")
			? predictedText === goldText
			: null,
		falseReconstruction:
			corpusCase.decision === "Accepted" &&
			!corpusCase.id.startsWith("RECON-") &&
			prediction?.decision === "Accepted"
				? predictedText !== corpusCase.source
				: null,
		requiredAtoms:
			corpusCase.id === "RECON-03"
				? key(
						predictedSegments
							.filter(
								(segment) => segment.kind === "ResolvableText",
							)
							.map((segment) => segment.text),
					) === key(["braw", "u", "r", "him", "frfr"]) &&
					!predictedText.includes("you") &&
					!predictedText.includes("are")
				: null,
		hebrewExact: corpusCase.id.startsWith("HE-FUSED-")
			? exactSentence
			: null,
		adapterFailure: Boolean(attempt.adapterError),
		allDomainGates: Object.values(attempt.domainGates).every(Boolean),
	};
}

function mergeCounts(values: Array<{ tp: number; fp: number; fn: number }>): {
	tp: number;
	fp: number;
	fn: number;
} {
	return values.reduce(
		(acc, value) => ({
			tp: acc.tp + value.tp,
			fp: acc.fp + value.fp,
			fn: acc.fn + value.fn,
		}),
		{ tp: 0, fp: 0, fn: 0 },
	);
}

function rate(values: Array<boolean | null>): number | null {
	const eligible = values.filter((value): value is boolean => value !== null);
	return eligible.length === 0
		? null
		: eligible.filter(Boolean).length / eligible.length;
}

function summarize(attempts: Attempt[]) {
	const byCase = new Map(CORPUS.map((item) => [item.id, item]));
	return ARMS.map((arm) => {
		const armAttempts = attempts.filter(
			(attempt) => attempt.arm.id === arm.id,
		);
		const scored = armAttempts.map((attempt) => ({
			attempt,
			score: scoreAttempt(
				attempt,
				byCase.get(attempt.caseId) as CorpusCase,
			),
		}));
		const accepted = scored.filter(
			({ attempt }) =>
				(byCase.get(attempt.caseId) as CorpusCase).decision ===
				"Accepted",
		);
		const requests = armAttempts.flatMap((attempt) => attempt.requests);
		const usages = requests.map((request) => request.usage).filter(Boolean);
		const confusion: Record<
			string,
			Record<string, number>
		> = Object.fromEntries(
			["Accepted", "UnsupportedLanguage", "Unintelligible"].map(
				(gold) => [
					gold,
					{
						Accepted: 0,
						UnsupportedLanguage: 0,
						Unintelligible: 0,
						Failure: 0,
					},
				],
			),
		);
		for (const { attempt } of scored) {
			const gold = (byCase.get(attempt.caseId) as CorpusCase).decision;
			const predicted = attempt.prediction?.decision ?? "Failure";
			const row = confusion[gold];
			if (!row) {
				throw new Error(`Unexpected gold intake decision: ${gold}`);
			}
			row[predicted] = (row[predicted] ?? 0) + 1;
		}
		const classRows = [
			...new Set(CORPUS.map((item) => item.className)),
		].map((className) => {
			const rows = scored.filter(
				({ attempt }) => attempt.className === className,
			);
			return {
				className,
				attempts: rows.length,
				intakeAccuracy: rate(
					rows.map(({ score }) => score.intakeExact),
				),
				exactCaseAccuracy: rate(
					rows.map(({ score }) => score.exactCase),
				),
				exactSentenceAccuracy: rate(
					rows.map(({ score, attempt }) =>
						(byCase.get(attempt.caseId) as CorpusCase).decision ===
						"Accepted"
							? score.exactSentence
							: null,
					),
				),
			};
		});
		const intakeRecalls = Object.entries(confusion).map(([gold, row]) => {
			const denominator = Object.values(row).reduce((a, b) => a + b, 0);
			return denominator === 0 ? null : (row[gold] ?? 0) / denominator;
		});
		const minimumPerClassExact = Math.min(
			...classRows.map((row) => row.exactCaseAccuracy ?? 0),
		);
		const costs = requests
			.map((request) => request.costUsd)
			.filter((value): value is number => value !== undefined);
		const totalCost = costs.reduce((sum, value) => sum + value, 0);
		const canonicalBytes = armAttempts
			.filter((attempt) => attempt.canonical?.decision === "Accepted")
			.map((attempt) => bytes(attempt.canonical));
		const segmentCounts = armAttempts
			.filter((attempt) => attempt.canonical?.decision === "Accepted")
			.map(
				(attempt) =>
					(
						attempt.canonical as Extract<
							CanonicalResult,
							{ decision: "Accepted" }
						>
					).segments.length,
			);
		const summary = {
			arm,
			attempts: armAttempts.length,
			requests: requests.length,
			adapterFailures: scored.filter(({ score }) => score.adapterFailure)
				.length,
			providerErrors: requests.filter((request) => request.error).length,
			retries: 0,
			domainGatePass: scored.every(({ score }) => score.allDomainGates),
			intakeAccuracy: rate(scored.map(({ score }) => score.intakeExact)),
			intakeMacroRecall:
				intakeRecalls.filter((value): value is number => value !== null)
					.length === 0
					? null
					: intakeRecalls
							.filter((value): value is number => value !== null)
							.reduce((sum, value) => sum + value, 0) /
						intakeRecalls.filter(
							(value): value is number => value !== null,
						).length,
			confusion,
			authoritativeTextExact: rate(
				accepted.map(({ score }) => score.textExact),
			),
			boundary: ratios(
				mergeCounts(accepted.map(({ score }) => score.boundary)),
			),
			boundaryKind: ratios(
				mergeCounts(accepted.map(({ score }) => score.boundaryKind)),
			),
			exactSegmentedSentenceAccuracy: rate(
				accepted.map(({ score }) => score.exactSentence),
			),
			click: ratios(
				mergeCounts(accepted.map(({ score }) => score.click)),
			),
			clickExactCaseAccuracy: rate(
				accepted.map(({ score }) => score.clickCaseExact),
			),
			typoVariantPreservation: rate(
				scored.map(({ score }) => score.preservedSource),
			),
			conservativeReconstruction: rate(
				scored.map(({ score }) => score.reconstructionExact),
			),
			falseReconstructionRate: rate(
				scored.map(({ score }) => score.falseReconstruction),
			),
			requiredNoisyAtomAccuracy: rate(
				scored.map(({ score }) => score.requiredAtoms),
			),
			localOpaque: ratios(
				mergeCounts(
					scored
						.filter(({ attempt }) =>
							attempt.caseId.startsWith("MIXED-"),
						)
						.map(({ score }) => score.opaque),
				),
			),
			hebrewFusedExactAccuracy: rate(
				scored.map(({ score }) => score.hebrewExact),
			),
			minimumPerClassExact,
			byClass: classRows,
			operations: {
				latencyMs: stats(requests.map((request) => request.latencyMs)),
				promptBytes: stats(
					requests.map((request) => request.promptBytes),
				),
				rawOutputBytes: stats(
					requests.map((request) => request.rawOutputBytes),
				),
				canonicalResultBytes: stats(canonicalBytes),
				segmentCount: stats(segmentCounts),
				inputTokens: stats(
					usages.map((usage) => usage?.input_tokens ?? 0),
				),
				cachedInputTokens: stats(
					usages.map(
						(usage) =>
							usage?.input_tokens_details?.cached_tokens ?? 0,
					),
				),
				outputTokens: stats(
					usages.map((usage) => usage?.output_tokens ?? 0),
				),
				reasoningTokens: stats(
					usages.map(
						(usage) =>
							usage?.output_tokens_details?.reasoning_tokens ?? 0,
					),
				),
				totalTokens: stats(
					usages.map((usage) => usage?.total_tokens ?? 0),
				),
				costUsd: {
					total: totalCost,
					perCase:
						armAttempts.length === 0
							? null
							: totalCost / armAttempts.length,
					per1000Cases:
						armAttempts.length === 0
							? null
							: (totalCost / armAttempts.length) * 1_000,
				},
			},
		};
		const eligible =
			summary.domainGatePass &&
			summary.adapterFailures === 0 &&
			summary.typoVariantPreservation === 1 &&
			summary.conservativeReconstruction === 1 &&
			summary.falseReconstructionRate === 0 &&
			summary.requiredNoisyAtomAccuracy === 1 &&
			summary.localOpaque.f1 === 1;
		return { ...summary, eligible };
	});
}

function formatPercent(value: number | null): string {
	return value === null ? "N/A" : `${(value * 100).toFixed(1)}%`;
}

function renderMarkdown(
	runMeta: Record<string, unknown>,
	armSummaries: ReturnType<typeof summarize>,
	availability: unknown,
): string {
	const lines = [
		"# Segmentation Chain prompt experiment results",
		"",
		`Run: \`${runMeta.runId}\`  `,
		`Corpus: \`${CORPUS_VERSION}\` (${CORPUS.length} cases × ${REPS} repetitions)  `,
		`Model request: \`${MODEL}\`; resolved snapshot: \`${RESOLVED_SNAPSHOT}\`  `,
		`Provider: OpenAI Responses API; concurrency: 1; retries: 0; storage: false  `,
		`Price schedule: [${PRICING.scheduleId}](${PRICING.url}), effective ${PRICING.effectiveDate}`,
		"",
		"## Model availability",
		"",
		"The supplied project exposed only `gpt-5-nano`. Stronger-model probes are retained in `availability.json`; inaccessible models returned HTTP 403 `model_not_found`, so the ticket's stronger-model comparison was not available under this credential.",
		"",
		"```json",
		JSON.stringify(availability, null, 2),
		"```",
		"",
		"## Arm comparison",
		"",
		"| Arm | Eligible | Exact sentence | Intake | Boundary+kind F1 | Click F1 | Min class exact | Hebrew | Opaque F1 | Preserve | Reconstruction | False reconstruction | Requests | p95 ms | Cost |",
		"| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
		...armSummaries.map(
			(row) =>
				`| \`${row.arm.id}\` | ${row.eligible ? "yes" : "no"} | ${formatPercent(row.exactSegmentedSentenceAccuracy)} | ${formatPercent(row.intakeAccuracy)} | ${formatPercent(row.boundaryKind.f1)} | ${formatPercent(row.click.f1)} | ${formatPercent(row.minimumPerClassExact)} | ${formatPercent(row.hebrewFusedExactAccuracy)} | ${formatPercent(row.localOpaque.f1)} | ${formatPercent(row.typoVariantPreservation)} | ${formatPercent(row.conservativeReconstruction)} | ${formatPercent(row.falseReconstructionRate)} | ${row.requests} | ${row.operations.latencyMs.p95?.toFixed(0) ?? "N/A"} | $${row.operations.costUsd.total.toFixed(6)} |`,
		),
		"",
		"## Required-stratum results",
		"",
	];
	for (const row of armSummaries) {
		lines.push(`### ${row.arm.id}`, "");
		lines.push(
			`Confusion matrix: \`${JSON.stringify(row.confusion)}\`  `,
			`Intake macro recall: ${formatPercent(row.intakeMacroRecall)}  `,
			`Authoritative-text exact: ${formatPercent(row.authoritativeTextExact)}  `,
			`Boundary P/R/F1: ${formatPercent(row.boundary.precision)} / ${formatPercent(row.boundary.recall)} / ${formatPercent(row.boundary.f1)}  `,
			`Boundary+kind P/R/F1: ${formatPercent(row.boundaryKind.precision)} / ${formatPercent(row.boundaryKind.recall)} / ${formatPercent(row.boundaryKind.f1)}  `,
			`Click union accuracy / P/R/F1 / exact-case: ${formatPercent(row.click.unionAccuracy)} / ${formatPercent(row.click.precision)} / ${formatPercent(row.click.recall)} / ${formatPercent(row.click.f1)} / ${formatPercent(row.clickExactCaseAccuracy)}  `,
			`Adapter failures / provider errors / retries: ${row.adapterFailures} / ${row.providerErrors} / ${row.retries}  `,
			`Domain validity gates: ${row.domainGatePass ? "PASS" : "FAIL"}`,
			"",
			"| Class | Attempts | Intake | Exact case | Exact accepted sentence |",
			"| --- | ---: | ---: | ---: | ---: |",
			...row.byClass.map(
				(classRow) =>
					`| ${classRow.className} | ${classRow.attempts} | ${formatPercent(classRow.intakeAccuracy)} | ${formatPercent(classRow.exactCaseAccuracy)} | ${formatPercent(classRow.exactSentenceAccuracy)} |`,
			),
			"",
		);
	}
	lines.push(
		"## Operational evidence",
		"",
		"Provider-reported token usage and every raw response are retained in `attempts.jsonl`. Means, p50, p95, maximum, and totals are in `summary.json`. Reasoning tokens are included in output-token billing. No retry or output repair was applied.",
		"",
		"## Reproducibility notes",
		"",
		`- Seeded shuffle: \`${SHUFFLE_SEED}\`; concurrency: 1.`,
		"- The 28 corpus cases are eval-only. Few-shots use different strings and are frozen in `prototype.ts`.",
		"- Each accepted prediction is adapted to one deterministic stable ID and locally indexed Segment array. Re-segmentation is modeled as a distinct ID; no source alignment crosses the adapter boundary.",
		"- OpenAI Structured Outputs are used to isolate semantic quality from JSON-shape failures.",
		"- This is a throwaway prototype and does not select or install production code.",
		"",
	);
	return `${lines.join("\n")}\n`;
}

async function probeAvailability(openai: OpenAI) {
	const listResponse = await fetch("https://api.openai.com/v1/models", {
		headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
	});
	const listed = (await listResponse.json()) as {
		data?: Array<{ id: string }>;
		error?: unknown;
	};
	const probes = [];
	for (const model of [
		"gpt-5-mini",
		"gpt-5.4-mini-2026-03-17",
		"gpt-5.4-2026-03-05",
	]) {
		try {
			const response = await openai.responses.create({
				model,
				input: "Reply OK.",
				max_output_tokens: 16,
				store: false,
				service_tier: "default",
			});
			probes.push({
				model,
				available: true,
				resolvedModel: response.model,
				status: response.status,
			});
		} catch (error) {
			const e = error as Error & { status?: number; code?: string };
			probes.push({
				model,
				available: false,
				httpStatus: e.status,
				code: e.code,
				message: e.message.replace(
					/Project `[^`]+`/g,
					"Project `[redacted]`",
				),
			});
		}
	}
	return {
		modelListHttpStatus: listResponse.status,
		listedModels: listed.data?.map((item) => item.id).sort() ?? [],
		probes,
	};
}

async function latestRunDir(): Promise<string> {
	const entries = (await readdir(RUNS, { withFileTypes: true }))
		.filter((entry) => entry.isDirectory() && /^\d{4}-/.test(entry.name))
		.map((entry) => entry.name)
		.sort();
	const latest = entries.at(-1);
	if (!latest) throw new Error(`No runs under ${RUNS}`);
	return join(RUNS, latest);
}

async function readAttempts(runDir: string): Promise<Attempt[]> {
	const text = await readFile(join(runDir, "attempts.jsonl"), "utf8");
	return text
		.split("\n")
		.filter(Boolean)
		.map((line) => JSON.parse(line) as Attempt);
}

async function writeSummaries(runDir: string) {
	const [attempts, metaText, availabilityText] = await Promise.all([
		readAttempts(runDir),
		readFile(join(runDir, "run.json"), "utf8"),
		readFile(join(runDir, "availability.json"), "utf8"),
	]);
	const meta = JSON.parse(metaText) as Record<string, unknown>;
	const availability = JSON.parse(availabilityText) as unknown;
	const armSummaries = summarize(attempts);
	await writeFile(
		join(runDir, "summary.json"),
		`${JSON.stringify({ meta, availability, arms: armSummaries }, null, 2)}\n`,
	);
	await writeFile(
		join(runDir, "RESULTS.md"),
		renderMarkdown(meta, armSummaries, availability),
	);
	return armSummaries;
}

async function run() {
	if (!process.env.OPENAI_API_KEY)
		throw new Error(
			"OPENAI_API_KEY missing; run with --env-file ../../.env.local from battery/dumgen",
		);
	const runId = new Date().toISOString().replaceAll(/[:.]/g, "-");
	const runDir = join(RUNS, runId);
	await mkdir(runDir, { recursive: true });
	const openai = new OpenAI({ maxRetries: 0, timeout: 60_000 });
	const availability = await probeAvailability(openai);
	await writeFile(
		join(runDir, "availability.json"),
		`${JSON.stringify(availability, null, 2)}\n`,
	);
	const runMeta = {
		runId,
		startedAt: new Date().toISOString(),
		corpusVersion: CORPUS_VERSION,
		corpusCases: CORPUS.length,
		repetitions: REPS,
		shuffleSeed: SHUFFLE_SEED,
		runnerVersion: RUNNER_VERSION,
		runtime: `Bun ${Bun.version}`,
		provider: "OpenAI",
		endpoint: "Responses API",
		requestedModel: MODEL,
		expectedResolvedSnapshot: RESOLVED_SNAPSHOT,
		reasoningEffort: "minimal",
		maxOutputTokens: 1_600,
		temperature: "provider default (parameter unsupported/omitted)",
		apiSeed: "unavailable in Responses request; order seed fixed",
		serviceTier: "default",
		region: "provider-managed; API response exposes no region field",
		concurrency: 1,
		retries: 0,
		store: false,
		pricing: PRICING,
		arms: ARMS,
	};
	await writeFile(
		join(runDir, "run.json"),
		`${JSON.stringify(runMeta, null, 2)}\n`,
	);
	const jobs = seededShuffle(
		ARMS.flatMap((arm) =>
			Array.from({ length: REPS }, (_, repetition) =>
				CORPUS.map((corpusCase) => ({
					arm,
					corpusCase,
					repetition: repetition + 1,
				})),
			).flat(),
		),
		SHUFFLE_SEED,
	);
	console.log(`Run ${runId}: ${jobs.length} attempts, concurrency 1`);
	for (const [i, job] of jobs.entries()) {
		const attempt = await runAttempt(
			openai,
			job.arm,
			job.corpusCase,
			job.repetition,
			i,
		);
		await appendFile(
			join(runDir, "attempts.jsonl"),
			`${JSON.stringify(attempt)}\n`,
		);
		const status = attempt.adapterError
			? `ERROR ${attempt.adapterError}`
			: `${attempt.prediction?.decision}`;
		console.log(
			`${String(i + 1).padStart(3)}/${jobs.length} ${job.arm.id} ${job.corpusCase.id} r${job.repetition}: ${status}`,
		);
	}
	const armSummaries = await writeSummaries(runDir);
	const finishedMeta = {
		...runMeta,
		finishedAt: new Date().toISOString(),
	};
	await writeFile(
		join(runDir, "run.json"),
		`${JSON.stringify(finishedMeta, null, 2)}\n`,
	);
	await writeSummaries(runDir);
	console.log(`Results: ${join(runDir, "RESULTS.md")}`);
	for (const arm of armSummaries)
		console.log(
			`${arm.arm.id}: exact=${formatPercent(arm.exactSegmentedSentenceAccuracy)} intake=${formatPercent(arm.intakeAccuracy)} eligible=${arm.eligible}`,
		);
}

async function summarizeLatest() {
	const runDir = await latestRunDir();
	const summaries = await writeSummaries(runDir);
	console.log(`Rebuilt ${join(runDir, "RESULTS.md")}`);
	for (const row of summaries)
		console.log(
			`${row.arm.id}: exact=${formatPercent(row.exactSegmentedSentenceAccuracy)} intake=${formatPercent(row.intakeAccuracy)} eligible=${row.eligible}`,
		);
}

async function refreshAvailability() {
	if (!process.env.OPENAI_API_KEY)
		throw new Error(
			"OPENAI_API_KEY missing; run with --env-file ../../.env.local from battery/dumgen",
		);
	const runDir = await latestRunDir();
	const availability = await probeAvailability(
		new OpenAI({ maxRetries: 0, timeout: 60_000 }),
	);
	await writeFile(
		join(runDir, "availability.json"),
		`${JSON.stringify(availability, null, 2)}\n`,
	);
	await writeSummaries(runDir);
	console.log(JSON.stringify(availability, null, 2));
}

async function browse() {
	const runDir = await latestRunDir();
	const attempts = await readAttempts(runDir);
	const summaries = summarize(attempts);
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	let armIndex = 0;
	let caseIndex = 0;
	const render = () => {
		console.clear();
		const arm = summaries[armIndex];
		if (!arm) {
			throw new Error("No experiment arm is available to browse.");
		}
		const armAttempts = attempts.filter(
			(attempt) => attempt.arm.id === arm.arm.id,
		);
		const selected = armAttempts[caseIndex % armAttempts.length];
		if (!selected) {
			throw new Error(`No attempts are available for arm ${arm.arm.id}.`);
		}
		const gold = CORPUS.find((item) => item.id === selected.caseId);
		if (!gold) {
			throw new Error(`Unknown corpus case: ${selected.caseId}`);
		}
		const score = scoreAttempt(selected, gold);
		console.log("\x1b[1mIssue #4 Segmentation Chain prototype\x1b[0m");
		console.log(`\x1b[2m${runDir}\x1b[0m\n`);
		console.log(`\x1b[1marm\x1b[0m ${arm.arm.id}`);
		console.log(
			`\x1b[1mquality\x1b[0m exact ${formatPercent(arm.exactSegmentedSentenceAccuracy)} · intake ${formatPercent(arm.intakeAccuracy)} · boundary+kind ${formatPercent(arm.boundaryKind.f1)} · eligible ${arm.eligible}`,
		);
		console.log(
			`\x1b[1mcase\x1b[0m ${selected.caseId} r${selected.repetition}`,
		);
		console.log(`\x1b[1msource\x1b[0m ${JSON.stringify(selected.source)}`);
		console.log(
			`\x1b[1mgold\x1b[0m ${JSON.stringify({ decision: gold.decision, segments: gold.segments ?? [] }, null, 2)}`,
		);
		console.log(
			`\x1b[1mprediction\x1b[0m ${JSON.stringify(selected.prediction ?? { error: selected.adapterError }, null, 2)}`,
		);
		console.log(`\x1b[1mscore\x1b[0m ${JSON.stringify(score, null, 2)}`);
		console.log(
			"\n\x1b[1m[a]\x1b[0m next arm  \x1b[1m[n]\x1b[0m next case  \x1b[1m[p]\x1b[0m previous case  \x1b[1m[q]\x1b[0m quit",
		);
	};
	render();
	for (;;) {
		const answer = await rl.question("> ");
		if (answer === "q") break;
		if (answer === "a") {
			armIndex = (armIndex + 1) % summaries.length;
			caseIndex = 0;
		} else if (answer === "n") caseIndex++;
		else if (answer === "p") caseIndex = Math.max(0, caseIndex - 1);
		render();
	}
	rl.close();
}

const command = process.argv[2] ?? "browse";
if (command === "run") await run();
else if (command === "summarize") await summarizeLatest();
else if (command === "probe") await refreshAvailability();
else if (command === "browse") await browse();
else
	throw new Error(
		`Unknown command ${command}; use run, summarize, probe, or browse`,
	);
