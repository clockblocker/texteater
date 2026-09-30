import type { EntryType, Questions } from "promptsmith/typesafe";
import { germanFusionTable } from "../../concrete-lang/de/fusion-entries.js";
import type { SegmentInUnitsInput } from "../../evaluation/spec-corpus/segment-in-units.js";
import {
	abbreviationEntry,
	cliticEntry,
	fusedWordSegments,
	leadingAbbreviation,
	leadingFreeClitic,
	splitClitic,
} from "../../universal/fusion-table.js";
import {
	type Answers,
	type CallRecord,
	choice,
	choiceOf,
	type Jev,
} from "../lab/jev.js";

type Segment = SegmentInUnitsInput["segments"][number];

/** UTF-16 source coordinates, matching String.slice and the persisted offsets. */
export type SourceSpan = {
	readonly start: number;
	readonly end: number;
};

type Plan = {
	readonly key: string;
	readonly segments: readonly Segment[];
	readonly description: string;
};

type Run = SourceSpan & {
	readonly text: string;
	readonly plans: readonly Plan[];
};

export type PreparedGermanSource = {
	readonly text: string;
	readonly runs: readonly Run[];
	readonly state: Record<string, EntryType>;
	readonly questions: Questions;
};

export type GermanSource = {
	readonly input: SegmentInUnitsInput;
	/** One coordinate per input Segment, including whitespace and punctuation. */
	readonly spans: readonly SourceSpan[];
	/** Unsupported or uncertain source recovery; ownership must leave it Unresolved. */
	readonly unresolved: readonly number[];
};

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
 * Scans exact written runs, then supplies complete authored alternatives.
 * No gold boundaries, expansions, generated text or language parser enter the request.
 * Ordinary words need no semantic question. Authored recovery entries retain
 * an intact alternative: matching the table is evidence, not interpretation.
 */
export function prepareGermanSource(text: string): PreparedGermanSource {
	if (text.length === 0) throw Error("A source Sentence must be non-empty");
	const runs: Run[] = [];
	const questions: Questions = {};
	const written: Record<string, EntryType> = {};
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
		if (!source) throw Error("Cannot scan a non-empty source remainder");
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

/** Applies only supplied plans. Uncertainty keeps the whole written run, with no retry. */
export function resolveGermanSource(
	prepared: PreparedGermanSource,
	answers: Answers,
	minimumProbability = 0.7,
): GermanSource {
	const segments: Segment[] = [];
	const spans: SourceSpan[] = [];
	const unresolved: number[] = [];
	for (const [index, run] of prepared.runs.entries()) {
		let plan = run.plans[0];
		if (`source_${index}` in prepared.questions) {
			const answer = choiceOf(answers, `source_${index}`);
			plan =
				(answer.probabilities[answer.choice] ?? 0) >= minimumProbability
					? run.plans.find(({ key }) => key === answer.choice)
					: undefined;
		}
		if (!plan) {
			unresolved.push(segments.length);
			plan = whole(run.text);
		}
		if (plan.segments.map(({ text }) => text).join("") !== run.text)
			throw Error("A source plan does not preserve its written run");
		let start = run.start;
		for (const segment of plan.segments) {
			segments.push(segment);
			spans.push({ start, end: start + segment.text.length });
			start += segment.text.length;
		}
	}
	return { input: { language: "de", segments }, spans, unresolved };
}

/** Batches every contextual source decision; a deterministic sentence makes no call. */
export async function segmentGermanSource(
	text: string,
	context: {
		readonly jev: Pick<Jev, "ask">;
		readonly repetition: number;
		readonly calls: CallRecord[];
	},
): Promise<GermanSource> {
	const prepared = prepareGermanSource(text);
	const answers =
		Object.keys(prepared.questions).length > 0
			? await context.jev.ask({
					stage: "source",
					state: prepared.state,
					questions: prepared.questions,
					repetition: context.repetition,
					calls: context.calls,
				})
			: {};
	return resolveGermanSource(prepared, answers);
}
