/**
 * The German Segment stage: one Sentence in, its Segments out (Dumgen ADR
 * 0004). Code stitches the Sentence's whitespace and scans it into written
 * runs. A run the fusion table matches (a fused word, an apostrophe clitic,
 * an abbreviation) or an apostrophe or dotted run it cannot read gets one
 * jev Choice among complete authored plans, its intact spelling always
 * among them. Every other run needs no question, and a Sentence with none
 * makes no call.
 *
 * No gold boundary, generated text or language parser enters the request,
 * and there is no stitching question and no language judge. Matching the
 * table is evidence, not interpretation: `Im` can be a name and `I'm` a
 * Foreign word in a German Sentence.
 */
import type { EntryType, Questions } from "promptsmith/typesafe";
import { type Answers, type Ask, askAny, choice, choiceOf } from "../ask.js";
import {
	abbreviationEntry,
	cliticEntry,
	fusedWordSegments,
	leadingAbbreviation,
	leadingFreeClitic,
	splitClitic,
} from "../fusion-table.js";
import type { Segment, SegmentedSentence } from "../segmented-sentence.js";
import { stitchedText } from "../stitched-text.js";
import { germanFusionTable } from "./fusion-entries.js";

/** One complete way to cut a written run into Segments and recover them. */
type Plan = {
	readonly key: string;
	readonly segments: readonly Segment[];
	readonly description: string;
};

/** One written run, in UTF-16 coordinates of the scanned text. */
type Run = {
	readonly start: number;
	readonly end: number;
	readonly text: string;
	readonly plans: readonly Plan[];
};

/** The scanned runs and the one request that settles the ambiguous ones. */
export type PreparedSegments = {
	readonly text: string;
	readonly runs: readonly Run[];
	readonly state: Readonly<Record<string, EntryType>>;
	readonly questions: Questions;
};

export type GermanSegmentation = SegmentedSentence & {
	/**
	 * The Segments whose written run kept its spelling because jev did not
	 * settle how to cut it, or found no authored plan for it.
	 */
	readonly unresolved: readonly number[];
};

/** A plan counts only when jev gives it at least this share. */
const planFloor = 0.7;

const graphemes = new Intl.Segmenter("und", { granularity: "grapheme" });
const word = /^[\p{L}\p{M}\p{N}]+(?:[-‐‑'’‘´`][\p{L}\p{M}\p{N}]+)*[-‐‑]?/u;
const abbreviation = /^(?:\p{L}\.){2,}|^\p{L}\.(?: \p{L}\.)+/u;
const number = /^\p{N}+(?:[,.]\p{N}+)+/u;
const apostrophe = /['’‘´`]/u;
const mathematicalOrCurrencySymbol = /^[\p{Sm}\p{Sc}]/u;
const standaloneSign = /^[%‰‱§&@#°†‡](?=\s|$|\p{P})/u;

const spelled = (text: string, surface?: string): Segment => ({
	kind: "ResolvableText",
	text,
	...(surface === undefined ? {} : { surface }),
});

const values = (surface: string | readonly string[]): readonly string[] =>
	typeof surface === "string" ? [surface] : surface;

const whole = (text: string): Plan => ({
	key: "AsWritten",
	segments: [spelled(text)],
	description:
		"One intact word, name, initialism, literal spelling or Foreign word as written, with no German Fusion or shortened spelling to expand",
});

function plansFor(text: string): readonly Plan[] {
	const fusion = fusedWordSegments(germanFusionTable, text);
	if (fusion) {
		const plan: Plan = {
			key: "Fusion",
			segments: fusion.map(({ text, surface }) => spelled(text, surface)),
			description:
				"The German written word holds a preposition and its article",
		};
		if (text.toLowerCase() === "am")
			return [
				plan,
				{
					...whole(text),
					description:
						"am marks a superlative degree with no noun after the superlative (am schönsten, am liebsten), or is an intact name, literal spelling or Foreign word; it stands for no German preposition or article",
				},
			];
		// A table entry supplies a possible German recovery; its spelling alone
		// cannot exclude a name, literal mention or Foreign interpretation.
		return [plan, whole(text)];
	}

	const abbreviated = abbreviationEntry(germanFusionTable, text);
	if (abbreviated)
		return [
			...values(abbreviated.surface).map((surface, index) => ({
				key: `Expansion${index}`,
				segments: [spelled(text, surface)],
				description: `One German abbreviated word standing for ${surface}`,
			})),
			whole(text),
		];

	const attached = splitClitic(germanFusionTable, text);
	const free = cliticEntry(germanFusionTable, text);
	const shortened =
		attached?.entry ?? (free?.attachment !== "Attached" ? free : undefined);
	if (shortened) {
		const host = attached ? text.slice(0, attached.host.length) : undefined;
		const suffix = host === undefined ? text : text.slice(host.length);
		const plans = values(shortened.surface).map(
			(surface, index): Plan => ({
				key: `Clitic${index}`,
				segments: [
					...(host === undefined ? [] : [spelled(host)]),
					spelled(suffix, surface),
				],
				description: `The shortened part ${suffix} stands for ${surface}`,
			}),
		);
		// Even a suffix with one German expansion can be part of an intact
		// Foreign word (I'm), name or quoted spelling in a German sentence.
		return [...plans, whole(text)];
	}

	return [whole(text)];
}

/**
 * Scans the text into written runs and asks one Choice per ambiguous run
 * among its complete authored plans. The text is kept as given; stitching
 * is the caller's (`segmentGermanSentence`).
 */
export function prepareGermanSegments(text: string): PreparedSegments {
	if (text.length === 0) throw Error("A Sentence must be non-empty");
	const runs: Run[] = [];
	const questions: Questions = {};
	const written: Record<string, string> = {};
	let start = 0;
	while (start < text.length) {
		const rest = text.slice(start);
		const whitespace = rest.match(/^\s+/u)?.[0];
		const candidate =
			whitespace ??
			leadingAbbreviation(germanFusionTable, rest) ??
			rest.match(abbreviation)?.[0] ??
			leadingFreeClitic(germanFusionTable, rest) ??
			rest.match(number)?.[0] ??
			rest.match(mathematicalOrCurrencySymbol)?.[0] ??
			rest.match(standaloneSign)?.[0] ??
			rest.match(word)?.[0];
		const grapheme = graphemes
			.segment(rest)
			[Symbol.iterator]()
			.next().value;
		const source = candidate ?? grapheme?.segment;
		if (!source) throw Error("Cannot scan a non-empty remainder");
		const kind = whitespace
			? "Whitespace"
			: candidate
				? "ResolvableText"
				: /^\p{P}/u.test(source)
					? "Punctuation"
					: "OpaqueText";
		const plans: readonly Plan[] =
			kind === "ResolvableText"
				? plansFor(source)
				: [
						{
							key: "AsWritten",
							segments: [{ kind, text: source }],
							description: kind,
						},
					];
		const run: Run = {
			start,
			end: start + source.length,
			text: source,
			plans,
		};
		const index = runs.length;
		runs.push(run);
		const unsupportedShape =
			kind === "ResolvableText" &&
			plans.length === 1 &&
			plans[0]?.key === "AsWritten" &&
			(apostrophe.test(source) || abbreviation.test(source));
		if (plans.length > 1 || unsupportedShape) {
			written[`w${index}`] = source;
			questions[`source_${index}`] = choice(
				`How is the written word \`written.w${index}\` used in \`sentence\`? Choose its complete segmentation and recovery plan.`,
				{
					...Object.fromEntries(
						plans.map((plan) => [
							plan.key,
							{
								use: plan.description,
								pieces: plan.segments.map(
									({ text, surface }) => ({
										text,
										standsFor: surface ?? text,
									}),
								),
							},
						]),
					),
					Unresolved:
						"The word needs a recovery absent from these alternatives, or the intended use cannot be decided",
				},
			);
		}
		start = run.end;
	}
	return { text, runs, questions, state: { sentence: text, written } };
}

/**
 * Applies the plan each answer chose. A share under the floor, an unknown
 * plan or `Unresolved` keeps the whole written run, with no retry.
 */
export function resolveGermanSegments(
	prepared: PreparedSegments,
	answers: Answers,
): GermanSegmentation {
	const segments: Segment[] = [];
	const unresolved: number[] = [];
	for (const [index, run] of prepared.runs.entries()) {
		let plan = run.plans[0];
		if (`source_${index}` in prepared.questions) {
			const answer = choiceOf(answers, `source_${index}`);
			plan =
				(answer.probabilities[answer.choice] ?? 0) >= planFloor
					? run.plans.find(({ key }) => key === answer.choice)
					: undefined;
		}
		if (!plan) {
			unresolved.push(segments.length);
			plan = whole(run.text);
		}
		if (plan.segments.map(({ text }) => text).join("") !== run.text)
			throw Error("A plan does not preserve its written run");
		segments.push(...plan.segments);
	}
	return { language: "de", text: prepared.text, segments, unresolved };
}

/**
 * Stitches one German Sentence and cuts it into Segments, asking jev once
 * for every ambiguous run together; a Sentence with none makes no call.
 */
export async function segmentGermanSentence(
	sentence: string,
	ask: Ask,
): Promise<GermanSegmentation> {
	const prepared = prepareGermanSegments(stitchedText(sentence));
	const answers = await askAny(ask, {
		stage: "segments",
		state: prepared.state,
		questions: prepared.questions,
	});
	return resolveGermanSegments(prepared, answers);
}
