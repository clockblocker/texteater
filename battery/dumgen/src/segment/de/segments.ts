/**
 * The German Segment stage: one Sentence in, its Segments out (Dumgen ADR
 * 0004). Code stitches the Sentence's whitespace and scans it into written
 * runs. A run the fusion table matches (a fused word, an apostrophe clitic,
 * an abbreviation) or an apostrophe or dotted run it cannot read gets one
 * jev Choice among complete authored plans, its intact spelling always
 * among them. Every other run needs no question, and a Sentence with none
 * makes no call.
 *
 * Code decides where a dumspec Rule does: an infinitive's infixed zu is a
 * piece (abzuspannen, de/fused-word-pieces), am before a superlative with
 * no noun after it stays one Segment (am besten), a period inside the
 * Sentence that ends a short word is the abbreviation's own (K., u.,
 * de/abbreviation-is-one-segment), a sign that stands for a word (%, §§,
 * ©, ※, ;-)) is clickable, and ?! and ... are one mark each while …? is
 * two (de/one-segment-per-mark).
 *
 * No gold boundary, generated text or language parser enters the request,
 * and there is no stitching question and no language judge. Matching the
 * table is evidence, not interpretation: `Im` can be a name and `I'm` a
 * Foreign word in a German Sentence. A fused word splits unless jev
 * confidently keeps it whole, though: the Rule makes the split the norm.
 */
import * as Effect from "effect/Effect";
import type { EntryType, Questions } from "promptsmith/typesafe";
import {
	type Answers,
	type Ask,
	type AskFailure,
	askAny,
	choice,
	choiceOf,
} from "../ask.js";
import {
	abbreviationEntry,
	cliticEntry,
	fusedWordSegments,
	leadingAbbreviation,
	leadingFreeClitic,
	splitClitic,
} from "../fusion-table.js";
import type { Segment } from "../segmented-sentence.js";
import { stitchedText } from "../stitched-text.js";
import { germanFusionTable, germanInfixParticles } from "./fusion-entries.js";

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
	/**
	 * The plan a weak, out-of-plan or Unresolved answer gets. Without one,
	 * such an answer keeps the run's spelling and lists it unresolved.
	 */
	readonly fallback?: Plan;
};

/** The scanned runs and the one request that settles the ambiguous ones. */
export type PreparedSegments = {
	readonly text: string;
	readonly runs: readonly Run[];
	readonly state: Readonly<Record<string, EntryType>>;
	readonly questions: Questions;
};

export type GermanSegmentation = {
	readonly language: "de";
	/** The Stitched Text; the Segments concatenated give it back. */
	readonly text: string;
	readonly segments: readonly Segment[];
	/**
	 * The Segments whose written run kept its spelling because jev did not
	 * settle how to cut it, or found no authored plan for it. Only the
	 * evaluator's raw mode reads it; `segment.inUnits` does not return it.
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
/** The ellipsis written as three full stops is one mark, as … is. */
const ellipsis = /^\.{3}/u;
/**
 * The marks convention writes as one: three full stops and ?!. Any other
 * run of marks, …? and !? included, is one Segment per mark
 * (de/one-segment-per-mark).
 */
const conventionalMarks = /^(?:\.{3}|\?!)/u;
const mathematicalOrCurrencySymbol = /^([\p{Sm}\p{Sc}])\1*/u;
/**
 * A sign that stands for a word, alone or repeated (§§, ‰‰), before a
 * space, a mark or the end; `*` inside a word (Lehrer*innen) stays a mark.
 */
const standaloneSign = /^([%‰‱§&@#°†‡*※٪﹪％¶⁂])\1*(?=\s|$|\p{P}|\p{S})/u;
/** A Unicode symbol such as © ® №, unless it is an emoji. */
const otherSymbol = /^\p{So}$/u;
const emoji = /\p{Emoji_Presentation}|\u{FE0F}|\u{200D}/u;
/** The micro sign µ (U+00B5) prefixes a unit (µm) and is a sign of its own. */
const microSign = /^µ(?=\p{L})/u;
/** A dash right between two digits reads bis (10–12). */
const rangeDash = /^[–—]/u;
/**
 * A Western emoticon written apart, one Segment (de/one-segment-per-mark):
 * ;-) :) :-( :D. Glued to a word its marks stay marks, since a parenthesis
 * may close there (etwa so:).
 */
const emoticon = /^[:;][-']?[()DPp](?=\s|$|[.,!?…])/u;
/** A word of letters only, the shape a dotted short abbreviation has. */
const letters = /^\p{L}+$/u;

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

/** Where a run stands in its Sentence: the text before and after it. */
type Context = { readonly before: string; readonly after: string };

/** The run opens a Sentence: nothing but opening marks since the last end. */
const opensSentence = (before: string) =>
	/(?:^|[.!?…:])[\s„"‚'»«“‘(\]]*$/u.test(before);

/**
 * The first word after a run, and what follows that word, or undefined
 * when a mark or the end comes first.
 */
function nextWord(after: string) {
	const found = after.match(/^ ([\p{L}\p{M}]+)/u);
	if (!found?.[1]) return undefined;
	return { word: found[1], after: after.slice(found[0].length) };
}

/** Ordinals that end like a superlative: am ersten, am zwanzigsten. */
const ordinalSten =
	/^(?:er|.*(?:zig|ßig|hundert|tausend|million|milliard))sten$/u;
/** An inflected adjective that may stand between a superlative and its noun. */
const adjectiveEnding = /^\p{Ll}{3,}(?:e|en|em|er|es)$/u;
/** A determiner opens a noun phrase of its own, never one a superlative is in. */
const determiner =
	/^(?:ein|kein|mein|dein|sein|ihr|unser|euer|eur|dies|jen|jed|all|manch|welch|solch)(?:e|en|em|er|es)?$/u;
const capitalized = /^\p{Lu}/u;

/**
 * `am` before a superlative with no noun after it is one Segment
 * (de/fused-word-pieces): am besten, am meisten, am liebsten im Frühling.
 * A capitalized word after the superlative, or an inflected adjective and
 * then one, may be its noun (am nächsten Morgen, am höchsten gelegenen
 * Punkt), so the run stays a question.
 */
function amBeforeSuperlative(after: string): boolean {
	const superlative = nextWord(after);
	if (
		!superlative ||
		!/^\p{Ll}+sten$/u.test(superlative.word) ||
		ordinalSten.test(superlative.word)
	)
		return false;
	const following = nextWord(superlative.after);
	if (!following) return true;
	if (capitalized.test(following.word)) return false;
	if (
		!adjectiveEnding.test(following.word) ||
		determiner.test(following.word)
	)
		return true;
	const third = nextWord(following.after);
	return !third || !capitalized.test(third.word);
}

/** The separable particles, longest first (hinaus before hin…). */
const infixParticles = [...germanInfixParticles].sort(
	(a, b) => b.length - a.length,
);

/**
 * An infinitive's infixed zu as its three pieces, each standing for
 * itself (de/fused-word-pieces, de/bare-infinitive-zu): abzuspannen is ab,
 * zu and spannen. The word must be lowercase, open with a separable
 * particle and zu, and end in a stem with a vowel and an infinitive's n; a
 * gerundive (auszubildenden) or a word on Zug (abzugsfähigen) is no
 * infinitive and stays whole.
 */
function infixedZuPieces(text: string): readonly string[] | undefined {
	if (!/^\p{Ll}+$/u.test(text)) return undefined;
	for (const particle of infixParticles) {
		if (!text.startsWith(`${particle}zu`)) continue;
		const stem = text.slice(particle.length + 2);
		if (stem.length < 3 || !stem.endsWith("n")) continue;
		if (!/[aeiouäöüy]/u.test(stem.replace(/(?:e|er|el)?n$/u, ""))) continue;
		if (/^g[^aeiouäöülnr]/u.test(stem)) continue;
		const participle = stem.match(/^(.+)den$/u)?.[1];
		if (
			participle &&
			/(?:e|er|el)n$/u.test(participle) &&
			/[aeiouäöüy]/u.test(participle.replace(/(?:e|er|el)n$/u, ""))
		)
			continue;
		return [particle, "zu", stem];
	}
	return undefined;
}

/**
 * A short word whose period, inside the Sentence, is its own: a single
 * letter before another word or a numeral (K. wartete, u. Käse, S. 12),
 * or any word before a lowercase one, which no Sentence opens with (aff.
 * abgekürzt). The abbreviation is one Segment with its period
 * (de/abbreviation-is-one-segment).
 */
function dottedShortWord(found: string, rest: string): string | undefined {
	if (!letters.test(found)) return undefined;
	const after = rest.slice(found.length);
	if (!/^\.\s+/u.test(after) || ellipsis.test(after)) return undefined;
	const next = after.replace(/^\.\s+/u, "");
	const single = Array.from(found).length === 1;
	return (single && /^[\p{L}\p{N}]/u.test(next)) || /^\p{Ll}/u.test(next)
		? `${found}.`
		: undefined;
}

function plansFor(text: string, context: Context): readonly Plan[] {
	const fusion = fusedWordSegments(germanFusionTable, text);
	if (fusion) {
		const plan: Plan = {
			key: "Fusion",
			segments: fusion.map(({ text, surface }) => spelled(text, surface)),
			description:
				"The German written word holds a preposition and its article",
		};
		if (text.toLowerCase() === "am") {
			if (amBeforeSuperlative(context.after)) return [whole(text)];
			return [
				plan,
				{
					...whole(text),
					description:
						"am marks a superlative degree with no noun after the superlative (am schönsten, am liebsten), or is an intact name, literal spelling or Foreign word; it stands for no German preposition or article",
				},
			];
		}
		// A table entry supplies a possible German recovery; its spelling alone
		// cannot exclude a name, literal mention or Foreign interpretation.
		return [plan, whole(text)];
	}

	const infixed = infixedZuPieces(text);
	if (infixed)
		return [
			{
				key: "InfixedZu",
				segments: infixed.map((piece) => spelled(piece, piece)),
				description:
					"An infinitive with its infixed zu: particle, zu and stem",
			},
		];

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
		// A host is a piece of its fused word and stands for itself, a
		// Sentence's opening capital aside (Geht's is geht and 's).
		const hostSurface =
			host !== undefined &&
			opensSentence(context.before) &&
			/^\p{Lu}\p{Ll}*$/u.test(host)
				? host.charAt(0).toLocaleLowerCase("de") + host.slice(1)
				: host;
		const plans = values(shortened.surface).map(
			(surface, index): Plan => ({
				key: `Clitic${index}`,
				segments: [
					...(host === undefined ? [] : [spelled(host, hostSurface)]),
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

/** The next written run of `text` at `start`, and its render kind. */
function scan(
	text: string,
	start: number,
): { readonly source: string; readonly kind: Segment["kind"] } {
	const rest = text.slice(start);
	const whitespace = rest.match(/^\s+/u)?.[0];
	if (whitespace) return { source: whitespace, kind: "Whitespace" };
	const marks = rest.match(conventionalMarks)?.[0];
	if (marks) return { source: marks, kind: "Punctuation" };
	const before = text.slice(0, start);
	const grapheme =
		graphemes.segment(rest)[Symbol.iterator]().next().value?.segment ?? "";
	const found = rest.match(word)?.[0];
	const resolvable =
		leadingAbbreviation(germanFusionTable, rest) ??
		rest.match(abbreviation)?.[0] ??
		leadingFreeClitic(germanFusionTable, rest) ??
		rest.match(number)?.[0] ??
		(/(?:^|\s)$/u.test(before) ? rest.match(emoticon)?.[0] : undefined) ??
		(/\p{N}$/u.test(before) && /^.\p{N}/u.test(rest)
			? rest.match(rangeDash)?.[0]
			: undefined) ??
		rest.match(microSign)?.[0] ??
		rest.match(mathematicalOrCurrencySymbol)?.[0] ??
		rest.match(standaloneSign)?.[0] ??
		(otherSymbol.test(grapheme) && !emoji.test(grapheme)
			? grapheme
			: undefined) ??
		(found ? (dottedShortWord(found, rest) ?? found) : undefined);
	if (resolvable) return { source: resolvable, kind: "ResolvableText" };
	if (!grapheme) throw Error("Cannot scan a non-empty remainder");
	return {
		source: grapheme,
		kind: /^\p{P}/u.test(grapheme) ? "Punctuation" : "OpaqueText",
	};
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
		const { source, kind } = scan(text, start);
		const end = start + source.length;
		const plans: readonly Plan[] =
			kind === "ResolvableText"
				? plansFor(source, {
						before: text.slice(0, start),
						after: text.slice(end),
					})
				: [
						{
							key: "AsWritten",
							segments: [{ kind, text: source }],
							description: kind,
						},
					];
		const fallback = plans.find(({ key }) => key === "Fusion");
		const run: Run = {
			start,
			end,
			text: source,
			plans,
			...(fallback ? { fallback } : {}),
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
		start = end;
	}
	return { text, runs, questions, state: { sentence: text, written } };
}

/**
 * The Segments of the prepared runs, each run cut by `planOf`; a run it
 * gives no plan keeps its spelling and is listed unresolved.
 */
function assemble(
	prepared: PreparedSegments,
	planOf: (run: Run, index: number) => Plan | undefined,
): GermanSegmentation {
	const segments: Segment[] = [];
	const unresolved: number[] = [];
	for (const [index, run] of prepared.runs.entries()) {
		let plan = planOf(run, index);
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
 * Applies the plan each answer chose. A share under the floor, an unknown
 * plan or `Unresolved` gives the run its fallback, a fused word's split,
 * or else keeps the whole written run, with no retry.
 */
export function resolveGermanSegments(
	prepared: PreparedSegments,
	answers: Answers,
): GermanSegmentation {
	return assemble(prepared, (run, index) => {
		if (!(`source_${index}` in prepared.questions)) return run.plans[0];
		const answer = choiceOf(answers, `source_${index}`);
		const chosen =
			(answer.probabilities[answer.choice] ?? 0) >= planFloor
				? run.plans.find(({ key }) => key === answer.choice)
				: undefined;
		return chosen ?? run.fallback;
	});
}

/**
 * Stitches one German Sentence and cuts it into Segments, asking jev once
 * for every ambiguous run together; a Sentence with none makes no call.
 */
export const segmentGermanSentence = Effect.fnUntraced(function* (
	sentence: string,
	ask: Ask,
): Effect.fn.Return<GermanSegmentation, AskFailure> {
	const prepared = prepareGermanSegments(stitchedText(sentence));
	const answers = yield* askAny(ask, {
		stage: "segments",
		state: prepared.state,
		questions: prepared.questions,
	});
	return resolveGermanSegments(prepared, answers);
});

/**
 * The Segments code alone gives one German Sentence, for when jev cannot
 * be asked: every run a question would have settled keeps its spelling
 * and is listed unresolved, a fused word included.
 */
export function writtenGermanSegments(sentence: string): GermanSegmentation {
	const prepared = prepareGermanSegments(stitchedText(sentence));
	return assemble(prepared, (run, index) =>
		`source_${index}` in prepared.questions ? undefined : run.plans[0],
	);
}
