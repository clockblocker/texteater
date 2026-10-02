/**
 * Nomination, the unit stage's first step: what jev judges about the
 * connections code proposes. Three requests over one judge state:
 *
 * 1. `candidates`: a host Choice per slot (an article's noun, a particle's
 *    or an auxiliary's verb, a noun's idiom verb, …), a Noul per proposed
 *    pair, a fixedness Noul per piece, and a Noul per Saying span.
 * 2. `expressions`: a Noul per pair of the pieces most likely fixed, whether
 *    they belong to one expression.
 * 3. `final`: step 0 asks a noun's idiom host again with clause-initial
 *    verbs among the hosts, and the old-spelling `so … daß`; the Saying
 *    Choice weighs each Saying span as a whole saying, a fragment of one, a
 *    saying plus other words, a general maxim, an idiom or none.
 *
 * These are candidates v3's requests and candidates4's `final` request,
 * worded byte for byte as the lab sent them, so cached answers replay.
 */
import * as Effect from "effect/Effect";
import type { Questions } from "promptsmith/typesafe";
import {
	type Answers,
	type Ask,
	type AskFailure,
	askAny,
	choice,
	choiceOf,
	noul,
	noulOf,
} from "../ask.js";
import type { Segment } from "../segmented-sentence.js";
import {
	idiomHosts,
	oldSpellingCorrelators,
	type PairCandidate,
	pairCandidatesOf,
	type SayingSpan,
	type Slot,
	type SlotKind,
	sayingSpans,
	slotsOf,
	wasFuerId,
	wasFuerPairs,
} from "./candidates.js";
import type { GermanInventory } from "./inventory.js";
import { argmax } from "./partition.js";
import {
	judgeState,
	type Reference,
	type Sentence,
	sentenceOf,
} from "./sentence.js";

const slotQuestion: Record<SlotKind, (piece: string) => string> = {
	idiom: (piece) =>
		`In \`sentence\`, is ${piece} a fixed part of an idiom or a support-verb collocation together with a verb (den Faden verlieren, den Kopf in den Sand stecken, eine Entscheidung treffen, Kritik üben, einen Antrag stellen, zur Verfügung stellen, Angst haben)? If so, which piece is that verb? Choose none for an ordinary noun the verb merely takes as its object or complement, and for a name.`,
	article: (piece) =>
		`In \`sentence\`, ${piece} is the article der/die/das/ein of a noun phrase. Which piece is the head of that phrase: its noun, or the word standing in for an elided noun? Choose none if ${piece} is not an article here but a pronoun (relative or demonstrative der, die, das) or a numeral.`,
	particle: (piece) =>
		`In \`sentence\`, is ${piece} the separable particle of a verb standing apart from it (zog … an, kam … zurück)? If so, which piece is that verb? Choose none if it is a preposition, an adverb or anything else.`,
	auxiliary: (piece) =>
		`In \`sentence\`, is ${piece} an auxiliary that forms the perfect, future or passive of another verb (hat … gegessen, ist … gekommen, wird … gebaut, wird … kommen, ist … verleumdet worden)? If so, which piece is the participle or infinitive it combines with? Only in hat … schreiben müssen, where an infinitive-shaped modal stands for the participle, choose the modal. Choose none if ${piece} is a full verb here: a copula before an adjective or noun, possession, or becoming.`,
	reflexive: (piece) =>
		`In \`sentence\`, is ${piece} the inherently required reflexive of a verb (sich schämen, sich erinnern, sich beeilen), which cannot be replaced by another object? If so, which piece is that verb? Choose none if it is an ordinary object, a reciprocal or a personal pronoun.`,
	expletive: (piece) =>
		`In \`sentence\`, is ${piece} a non-referential es that a verb lexically selects (es gibt, es regnet, es geht um, es handelt sich um)? If so, which piece is that verb? Choose none if it refers to something, anticipates a clause, or only fills the first position.`,
	preposition: (piece) =>
		`In \`sentence\`, does a verb, adjective or noun lexically select ${piece} as its fixed preposition (wartet auf, erinnert sich an, stolz auf, Angst vor)? If so, which piece is that word? Choose none if it is a free preposition of place, time, manner or cause, or part of a pronominal adverb.`,
};

const pairQuestion: Record<
	PairCandidate["kind"],
	(pair: PairCandidate, ref: Reference) => string
> = {
	"split-adverb": (pair, ref) =>
		`In \`sentence\`, do ${ref(pair.left)} and ${ref(pair.right)} together form the split adverb ${pair.name} (as Da … von is davon, Wo … hin is wohin)?`,
	correlator: (pair, ref) =>
		`In \`sentence\`, do ${ref(pair.left)} and ${ref(pair.right)} together form the fixed conjunction ${pair.name}?`,
	circumposition: (pair, ref) =>
		`In \`sentence\`, do ${ref(pair.left)} and ${ref(pair.right)} together form one circumposition around a phrase (von … an, an … vorbei, über … hinaus, um … willen), rather than ${ref(pair.right)} being a verb's particle or an adverb?`,
	name: (pair, ref) =>
		`In \`sentence\`, are ${ref(pair.left)} and ${ref(pair.right)} parts of one multiword proper name (Johann Wolfgang von Goethe, Tundu Lissu, New York), rather than a title or common noun next to a name, or two separate names?`,
};

export const slotId = (slot: Slot) => `s_${slot.kind}_${slot.piece.id}`;
const fixedId = (id: number) => `f_${id}`;
export const pairId = (pair: PairCandidate) =>
	`c_${pair.left.id}_${pair.right.id}`;
export const expressionId = (a: number, b: number) => `e_${a}_${b}`;
const sayingNoulId = (span: SayingSpan) =>
	`y_${span.pieces.map((piece) => piece.id).join("_")}`;
export const reaskedIdiomId = (id: number) => `s4_idiom_${id}`;
export const correlatorId = (pair: PairCandidate) =>
	`c4_${pair.left.id}_${pair.right.id}`;
export const sayingChoiceId = (ids: readonly number[]) => `y4_${ids.join("_")}`;

function candidateQuestions(
	sentence: Sentence,
	ref: Reference,
	slots: readonly Slot[],
	pairs: readonly PairCandidate[],
	spans: readonly SayingSpan[],
): Questions {
	const questions: Questions = {};
	for (const slot of slots)
		questions[slotId(slot)] = choice(
			slotQuestion[slot.kind](ref(slot.piece)),
			{
				...Object.fromEntries(
					slot.hosts.map((host) => [`p${host.id}`, host.text]),
				),
				none: "None of these",
			},
		);
	for (const pair of pairs)
		questions[pairId(pair)] = noul(pairQuestion[pair.kind](pair, ref));
	for (const piece of sentence.pieces)
		questions[fixedId(piece.id)] = noul(
			`In \`sentence\`, is ${ref(piece)} a fixed word of an established multiword expression: an idiom (den Faden verlieren), a support-verb collocation (zur Verfügung stellen, eine Entscheidung treffen), a fixed adverbial (zum Teil, und so weiter, auf keinen Fall), a routine formula or exclamation of several words (tut mir leid, ach je, ha ha), or a proverb or famous quotation? Answer no for a word in an ordinary free combination.`,
		);
	for (const span of spans)
		questions[sayingNoulId(span)] = noul(
			`In \`sentence\`, is exactly the wording "${span.text}" a complete proverb, or a famous quotation or aphorism that speakers cite as a saying (Morgenstund hat Gold im Mund; Wer nichts weiß, muss alles glauben)? Answer no for an ordinary statement, and no when the saying is only part of this wording.`,
		);
	return questions;
}

/** A satellite or idiom link: the slot's piece joins its host. */
export type SlotLink = {
	readonly from: number;
	readonly to: number;
	readonly share: number;
	readonly kind: SlotKind;
};

/**
 * Each piece's best slot answer: the kind whose best host has the highest
 * share. A host counts only when its share beats `none`, a satellite's by
 * more than `satelliteMargin` (#762).
 */
export function slotLinks(
	slots: readonly Slot[],
	answers: Answers,
	satelliteMargin = 0,
): SlotLink[] {
	const best = new Map<number, SlotLink>();
	for (const slot of slots) {
		const answer = choiceOf(answers, slotId(slot));
		const hosts = Object.fromEntries(
			Object.entries(answer.probabilities).filter(
				([key]) => key !== "none",
			),
		);
		const top = argmax(hosts);
		const none = answer.probabilities.none ?? 0;
		const margin = slot.kind === "idiom" ? 0 : satelliteMargin;
		if (!top.key || top.share <= none + margin) continue;
		const link = {
			from: slot.piece.id,
			to: Number(top.key.slice(1)),
			share: top.share,
			kind: slot.kind,
		};
		const previous = best.get(slot.piece.id);
		if (!previous || previous.share < link.share)
			best.set(slot.piece.id, link);
	}
	return [...best.values()];
}

/** A host takes at most one particle and one governed preposition, the most probable (`sehnen sich nach … nach`). */
export function oneSatellitePerHost(links: readonly SlotLink[]): SlotLink[] {
	const best = new Map<string, SlotLink>();
	for (const link of links) {
		if (link.kind !== "preposition" && link.kind !== "particle") continue;
		const key = `${link.kind}:${link.to}`;
		const previous = best.get(key);
		if (!previous || previous.share < link.share) best.set(key, link);
	}
	return links.filter(
		(link) =>
			(link.kind !== "preposition" && link.kind !== "particle") ||
			best.get(`${link.kind}:${link.to}`) === link,
	);
}

/** Greedy one-to-one matching of accepted pairs, most probable first. */
function matchedPairs(
	pairs: readonly PairCandidate[],
	answers: Answers,
	floor: number,
) {
	const used = new Set<number>();
	const accepted: [number, number, PairCandidate["kind"]][] = [];
	for (const pair of [...pairs]
		.map((pair) => ({ pair, probability: noulOf(answers, pairId(pair)) }))
		.filter(({ probability }) => probability >= floor)
		.sort((a, b) => b.probability - a.probability)) {
		const { left, right } = pair.pair;
		if (
			pair.pair.kind !== "name" &&
			(used.has(left.id) || used.has(right.id))
		)
			continue;
		used.add(left.id);
		used.add(right.id);
		accepted.push([left.id, right.id, pair.pair.kind]);
		if (pair.pair.kind === "name")
			for (let id = left.id + 1; id < right.id; id++)
				accepted.push([left.id, id, "name"]);
	}
	return accepted;
}

/** Whether two fixed pieces belong to one expression, as `expressions` answered. */
export type ExpressionLink = {
	readonly left: number;
	readonly right: number;
	readonly probability: number;
};

/** What the three requests answered, and what code read from them before any floor. */
export type Nomination = {
	readonly sentence: Sentence;
	readonly state: ReturnType<typeof judgeState>["state"];
	readonly ref: Reference;
	readonly inventory: GermanInventory;
	/** `candidates`, `expressions` and `final`. */
	readonly first: Answers;
	readonly second: Answers;
	readonly final: Answers;
	readonly slots: readonly Slot[];
	readonly pairs: readonly PairCandidate[];
	readonly spans: readonly SayingSpan[];
	/** The slot links with no margin, one particle and preposition per host. */
	readonly slotAnswers: readonly SlotLink[];
	readonly links: readonly ExpressionLink[];
	/** Each piece's fixedness Noul. */
	readonly fixed: ReadonlyMap<number, number>;
	/** The proposed pairs at 0.5, matched one to one. */
	readonly accepted: readonly (readonly [
		number,
		number,
		PairCandidate["kind"],
	])[];
};

const sayingCriteria = {
	whole: "A complete proverb, famous quotation or aphorism that people cite as a saying, in exactly this wording (Morgenstund hat Gold im Mund; Wer nichts weiß, muss alles glauben)",
	fragment:
		"The start of such a saying or a changed wording of one, standing for it (Wer im Glashaus sitzt …; Aller Anfank ist schwer with a typo)",
	plus: "A saying together with other words around it, such as the clause that introduces or comments on it",
	maxim: "A general maxim about life, stated as a timeless truth in the style of an aphorism, even if you do not know its author",
	idiom: "An ordinary sentence that only uses an idiom or fixed phrase inside it (Er ließ die Katze aus dem Sack; Sie hat den Faden verloren), not a saying",
	none: "An ordinary statement, question or description, not a saying",
};

/** What the `final` request asks beyond candidates4's questions. */
export type FinalOptions = {
	/** A Noul per was … für pair, for the `was-fuer` code rule (de/was-fuer). */
	readonly wasFuer?: boolean;
};

/**
 * The `final` request: step 0's idiom hosts and `so … daß`, and the Saying
 * Choice; with `wasFuer`, whether was … für is was für (ein).
 */
function finalQuestions(
	sentence: Sentence,
	ref: Reference,
	slots: readonly Slot[],
	options: FinalOptions,
): Questions {
	const questions: Questions = {};
	for (const slot of slots) {
		if (slot.kind !== "idiom") continue;
		const hosts = idiomHosts(sentence, slot.piece);
		if (hosts.length === slot.hosts.length) continue;
		questions[reaskedIdiomId(slot.piece.id)] = choice(
			`In \`sentence\`, is ${ref(slot.piece)} a fixed part of an idiom or a support-verb collocation together with a verb (den Faden verlieren, den Kopf in den Sand stecken, eine Entscheidung treffen, Kritik üben, einen Antrag stellen, zur Verfügung stellen, Angst haben)? If so, which piece is that verb? Choose none for an ordinary noun the verb merely takes as its object or complement, and for a name.`,
			{
				...Object.fromEntries(
					hosts.map((host) => [`p${host.id}`, host.text]),
				),
				none: "None of these",
			},
		);
	}
	for (const pair of oldSpellingCorrelators(sentence))
		questions[correlatorId(pair)] = noul(
			`In \`sentence\`, do ${ref(pair.left)} and ${ref(pair.right)} together form the fixed conjunction so … dass (spelled daß)?`,
		);
	for (const span of sayingSpans(sentence)) {
		const ids = span.pieces.map((piece) => piece.id);
		questions[sayingChoiceId(ids)] = choice(
			`In \`sentence\`, what is the wording "${span.text}"?`,
			sayingCriteria,
		);
	}
	if (options.wasFuer)
		for (const [was, fuer] of wasFuerPairs(sentence))
			questions[wasFuerId(was.id, fuer.id)] = noul(
				`In \`sentence\`, do ${ref(was)} and ${ref(fuer)} together form was für (ein), asking or exclaiming what kind of thing or person (Was für ein Buch liest du? Was ist das für ein Buch? Was für Bücher? Aber was für einen?), rather than was standing on its own and für being a preposition (Was hast du für das Buch bezahlt?)?`,
			);
	return questions;
}

/** Asks the three nomination requests for one Sentence. */
export const nominate = Effect.fnUntraced(function* (
	input: { readonly segments: readonly Segment[] },
	ask: Ask,
	inventory: GermanInventory,
	options: FinalOptions = {},
): Effect.fn.Return<Nomination, AskFailure> {
	const sentence = sentenceOf(input);
	const { state, ref } = judgeState(sentence);
	const slots = slotsOf(sentence, inventory);
	const pairs = pairCandidatesOf(sentence, inventory);
	const spans = sayingSpans(sentence);
	const first = yield* askAny(ask, {
		stage: "candidates",
		state,
		questions: candidateQuestions(sentence, ref, slots, pairs, spans),
	});
	const fixed = new Map(
		sentence.pieces.map((piece) => [
			piece.id,
			noulOf(first, fixedId(piece.id)),
		]),
	);
	const flagged = sentence.pieces
		.filter((piece) => (fixed.get(piece.id) ?? 0) >= 0.3)
		.sort((a, b) => (fixed.get(b.id) ?? 0) - (fixed.get(a.id) ?? 0))
		.slice(0, 14)
		.sort((a, b) => a.id - b.id);
	const expressionQuestions: Questions = {};
	for (const [position, a] of flagged.entries())
		for (const b of flagged.slice(position + 1))
			expressionQuestions[expressionId(a.id, b.id)] = noul(
				`In \`sentence\`, are ${ref(a)} and ${ref(b)} fixed words of the same one established multiword expression (idiom, collocation, fixed adverbial, routine formula, proverb or quotation)?`,
			);
	const second = yield* askAny(ask, {
		stage: "expressions",
		state,
		questions: expressionQuestions,
	});
	const links: ExpressionLink[] = flagged.flatMap((a, position) =>
		flagged.slice(position + 1).map((b) => ({
			left: a.id,
			right: b.id,
			probability: noulOf(second, expressionId(a.id, b.id)),
		})),
	);
	const final = yield* askAny(ask, {
		stage: "final",
		state,
		questions: finalQuestions(sentence, ref, slots, options),
	});
	return {
		sentence,
		state,
		ref,
		inventory,
		first,
		second,
		final,
		slots,
		pairs,
		spans,
		slotAnswers: oneSatellitePerHost(slotLinks(slots, first)),
		links,
		fixed,
		accepted: matchedPairs(pairs, first, 0.5),
	};
});

/** The v3 Saying spans whose Noul clears the floor, most probable first, disjoint. */
export function selectedSayings(
	nomination: Pick<Nomination, "spans" | "first">,
	floor: number,
): number[][] {
	const covered = new Set<number>();
	const chosen: number[][] = [];
	for (const span of [...nomination.spans]
		.filter((span) => noulOf(nomination.first, sayingNoulId(span)) >= floor)
		.sort(
			(a, b) =>
				noulOf(nomination.first, sayingNoulId(b)) -
					noulOf(nomination.first, sayingNoulId(a)) ||
				a.pieces.length - b.pieces.length,
		)) {
		if (span.pieces.some((piece) => covered.has(piece.id))) continue;
		for (const piece of span.pieces) covered.add(piece.id);
		chosen.push(span.pieces.map((piece) => piece.id));
	}
	return chosen;
}
