/**
 * Hebrew's Segment stage: scan source runs losslessly and ask a bounded
 * contextual Choice only where a leading conjunction or article may split.
 */
import type { Questions } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import type { SentenceSegmentation } from "../../language-module.js";
import {
	type Answers,
	type Ask,
	type AskFailure,
	askAny,
	choice,
	choiceOf,
} from "../ask.js";
import type { Segment } from "../segmented-sentence.js";
import { stitchedText } from "../stitched-text.js";
import { segmentInstructions } from "./segment-instructions.js";

type Plan = {
	readonly key: string;
	readonly segments: readonly Segment[];
};

type Run = {
	readonly text: string;
	readonly plans: readonly Plan[];
};

type PreparedSegments = {
	readonly text: string;
	readonly runs: readonly Run[];
	readonly questions: Questions;
	readonly state: {
		readonly sentence: string;
		readonly written: Readonly<Record<string, string>>;
	};
};

const graphemes = new Intl.Segmenter("und", { granularity: "grapheme" });
const planFloor = 0.7;
// The instruction is repeated per ambiguous run; cap each TypeSafe request.
const maxHebrewQuestionsPerAsk = 22;

const resolvable = (text: string): Segment => ({
	kind: "ResolvableText",
	text,
});
const whole = (text: string): Plan => ({
	key: "AsWritten",
	segments: [resolvable(text)],
});
const baseLetter = (grapheme: string) => grapheme.normalize("NFD").charAt(0);

const sourcePrefixes = new Set(["ו", "ה", "ב", "ל", "כ", "מ", "ש"]);

function compoundPlan(clusters: readonly string[]): Plan | undefined {
	if (!clusters.some((cluster) => cluster === "־" || cluster === "-"))
		return undefined;
	const segments: Segment[] = [];
	let part = "";
	for (const cluster of clusters)
		if (cluster === "־" || cluster === "-") {
			if (part.length > 0) segments.push(resolvable(part));
			segments.push({ kind: "Punctuation", text: cluster });
			part = "";
		} else part += cluster;
	if (part.length > 0) segments.push(resolvable(part));
	return { key: "CompoundParts", segments };
}

function internalAsciiQuotePunctuationPlan(
	clusters: readonly string[],
): Plan | undefined {
	if (!clusters.includes('"')) return undefined;
	const segments: Segment[] = [];
	let part = "";
	for (const cluster of clusters)
		if (cluster === '"') {
			if (part.length > 0) segments.push(resolvable(part));
			segments.push({ kind: "Punctuation", text: cluster });
			part = "";
		} else part += cluster;
	if (part.length > 0) segments.push(resolvable(part));
	return { key: "InternalAsciiQuotePunctuation", segments };
}

function temporalPlan(
	clusters: readonly string[],
	first: string,
	key: string,
): Plan | undefined {
	if (
		clusters.length <= 2 ||
		baseLetter(clusters[0] ?? "") !== first ||
		baseLetter(clusters[1] ?? "") !== "ש"
	)
		return undefined;
	return {
		key,
		segments: [
			resolvable(clusters.slice(0, 2).join("")),
			resolvable(clusters.slice(2).join("")),
		],
	};
}

function plansFor(text: string): readonly Plan[] {
	const clusters = Array.from(
		graphemes.segment(text),
		({ segment }) => segment,
	);
	if (clusters.at(-1) === "׳")
		return [
			whole(text),
			{
				key: "TerminalGereshPunctuation",
				segments: [
					resolvable(clusters.slice(0, -1).join("")),
					{ kind: "Punctuation", text: "׳" },
				],
			},
		];
	const compound = compoundPlan(clusters);
	const internalAsciiQuote = internalAsciiQuotePunctuationPlan(clusters);
	if (internalAsciiQuote !== undefined)
		return [internalAsciiQuote, whole(text)];
	// Why is a single lexical form, never the preposition מ plus *דוע.
	if (clusters.map(baseLetter).join("") === "מדוע") return [whole(text)];
	const temporalKshe = temporalPlan(clusters, "כ", "TemporalKshe");
	const temporalMishe = temporalPlan(clusters, "מ", "TemporalMishe");
	let prefixCount = 0;
	if (
		clusters.length > 1 &&
		sourcePrefixes.has(baseLetter(clusters[0] ?? ""))
	) {
		prefixCount = 1;
		const first = baseLetter(clusters[0] ?? "");
		const second = baseLetter(clusters[1] ?? "");
		// Offer stacked proclitics only in plausible order. The rest of a
		// lexical stem may itself begin with a prefix letter (הממשלה, בבית).
		if (
			clusters.length > 2 &&
			((first === "ו" && sourcePrefixes.has(second)) ||
				(first === "ש" && ["ה", "ב", "ל", "כ", "מ"].includes(second)) ||
				(first === "כ" && second === "ש") ||
				(first === "מ" && ["ה", "ש"].includes(second)))
		)
			prefixCount = 2;
	}
	return [
		...Array.from({ length: prefixCount }, (_, index) => {
			const count = index + 1;
			return {
				key: `Prefixes${count}`,
				segments: [
					...clusters.slice(0, count).map(resolvable),
					resolvable(clusters.slice(count).join("")),
				],
			};
		}),
		...(temporalKshe === undefined ? [] : [temporalKshe]),
		...(temporalMishe === undefined ? [] : [temporalMishe]),
		...(compound === undefined ? [] : [compound]),
		whole(text),
	];
}

function scan(text: string): readonly Run[] {
	const runs: Run[] = [];
	let offset = 0;
	while (offset < text.length) {
		const rest = text.slice(offset);
		const whitespace = rest.match(/^\s+/u)?.[0];
		const numeric = rest.match(
			/^(?:[\u05D0-\u05EA\p{M}]+[־-])?\d+(?:[.,]\d+)*/u,
		)?.[0];
		const hebrew = rest.match(
			/^[\u05D0-\u05EA\p{M}]+(?:(?:[־-]|[׳״'"‘’])[\u05D0-\u05EA\p{M}]+)*׳?/u,
		)?.[0];
		const grapheme = graphemes.segment(rest)[Symbol.iterator]().next()
			.value?.segment;
		const source = whitespace ?? numeric ?? hebrew ?? grapheme;
		if (source === undefined)
			throw Error("Cannot scan a non-empty Hebrew Sentence");
		const segments = whitespace
			? [{ kind: "Whitespace" as const, text: source }]
			: numeric
				? [resolvable(source)]
				: hebrew
					? undefined
					: [
							{
								kind: /^\p{P}/u.test(source)
									? "Punctuation"
									: "OpaqueText",
								text: source,
							} as Segment,
						];
		runs.push({
			text: source,
			plans: segments
				? [{ key: "AsWritten", segments }]
				: plansFor(source),
		});
		offset += source.length;
	}
	return runs;
}

function prepare(sentence: string): PreparedSegments {
	const text = stitchedText(sentence);
	const runs = scan(text);
	const questions: Record<string, ReturnType<typeof choice>> = {};
	const written: Record<string, string> = {};
	for (const [index, run] of runs.entries()) {
		if (run.plans.length === 1) continue;
		written[`w${index}`] = run.text;
		questions[`source_${index}`] = choice(
			segmentInstructions(index),
			Object.fromEntries(
				run.plans.map((plan) => [
					plan.key,
					plan.key === "AsWritten"
						? `${run.text} — no separable syntactic-word prefix in context; lexical or inflected form stays whole, including infinitival ל with its verb`
						: `${plan.segments.map(({ text }) => text).join(" + ")} — ${
								(
									{
										TemporalMishe:
											"temporal מש meaning once or since is one clickable connector",
										TemporalKshe:
											"temporal כש meaning when is one clickable connector",
										TerminalGereshPunctuation:
											"terminal geresh as punctuation",
										InternalAsciiQuotePunctuation:
											"ASCII quote as punctuation",
										CompoundParts:
											"contextual compound parts",
									} as Readonly<Record<string, string>>
								)[plan.key] ??
								"independently clickable grammatical prefix(es) and remainder"
							}`,
				]),
			),
		);
	}
	return { text, runs, questions, state: { sentence: text, written } };
}

function assemble(
	prepared: PreparedSegments,
	answers: Answers,
): SentenceSegmentation {
	const segments: Segment[] = [];
	const unresolved: number[] = [];
	for (const [index, run] of prepared.runs.entries()) {
		const question = `source_${index}`;
		const answer =
			question in prepared.questions
				? choiceOf(answers, question)
				: undefined;
		const chosen =
			answer && (answer.probabilities[answer.choice] ?? 0) >= planFloor
				? run.plans.find(({ key }) => key === answer.choice)
				: undefined;
		const plan = chosen ?? (answer ? undefined : run.plans[0]);
		if (plan === undefined) {
			unresolved.push(segments.length);
			segments.push(resolvable(run.text));
		} else segments.push(...plan.segments);
	}
	return { text: prepared.text, segments, unresolved };
}

export const segmentHebrewSentence = Effect.fnUntraced(function* (
	sentence: string,
	ask: Ask,
): Effect.fn.Return<SentenceSegmentation, AskFailure> {
	const prepared = prepare(sentence);
	const entries = Object.entries(prepared.questions);
	const askBatch = (
		subset: typeof entries,
	): Effect.Effect<Answers, AskFailure> =>
		Effect.gen(function* () {
			const response = yield* Effect.result(
				askAny(ask, {
					stage: "segments",
					state: prepared.state,
					questions: Object.fromEntries(subset),
				}),
			);
			if (Result.isSuccess(response)) return response.success;
			const failure = response.failure;
			const cause =
				failure._tag === "ProviderFailure" ? failure.cause : undefined;
			if (
				subset.length < 2 ||
				!(cause instanceof Error) ||
				!("status" in cause && cause.status === 400) ||
				!cause.message.includes('"error_type":"max_tokens_exceeded"')
			)
				return yield* Effect.fail(failure);
			const middle = Math.floor(subset.length / 2);
			const left = yield* askBatch(subset.slice(0, middle));
			const right = yield* askBatch(subset.slice(middle));
			return { ...left, ...right };
		});
	const answers: Record<string, Answers[string]> = {};
	for (
		let start = 0;
		start < entries.length;
		start += maxHebrewQuestionsPerAsk
	)
		Object.assign(
			answers,
			yield* askBatch(
				entries.slice(start, start + maxHebrewQuestionsPerAsk),
			),
		);
	return assemble(prepared, answers);
});

export function writtenHebrewSegments(sentence: string): SentenceSegmentation {
	const prepared = prepare(sentence);
	return assemble(
		prepared,
		Object.fromEntries(
			Object.keys(prepared.questions).map((id) => [
				id,
				{
					type: "choice",
					choice: "Unresolved",
					confidence: 0,
					probabilities: {},
				},
			]),
		),
	);
}
