/**
 * Grouping from deterministic candidates: code proposes where a satellite
 * could attach (`candidates.ts`) and the judge picks the host or `none`; a
 * fixedness Noul per piece and a pair Noul among the fixed pieces find the
 * multiword expressions. Three requests: satellites and fixedness, then
 * expression pairs, then routes. One policy per threshold combination.
 */
import type { Questions } from "promptsmith/typesafe";
import { type Answers, choice, choiceOf, noul, noulOf } from "../../lab/jev.js";
import type { Reference } from "../arm.js";
import {
	type Arm,
	judgeRoutes,
	judgeState,
	type LinkJudgment,
	routeFrom,
} from "../arm.js";
import {
	type PairCandidate,
	pairCandidatesOf,
	type Slot,
	type SlotKind,
	slotsOf,
} from "../candidates.js";
import { argmax, outputOf, type Partition, partitionOf } from "../partition.js";
import { type Sentence, sentenceOf } from "../sentence.js";

export const slotQuestion: Record<SlotKind, (piece: string) => string> = {
	idiom: (piece) =>
		`In \`sentence\`, is ${piece} a fixed part of an idiom or a support-verb collocation together with a verb (den Faden verlieren, den Kopf in den Sand stecken, eine Entscheidung treffen, Kritik üben, einen Antrag stellen, zur Verfügung stellen, Angst haben)? If so, which piece is that verb? Choose none for an ordinary noun the verb merely takes as its object or complement, and for a name.`,
	article: (piece) =>
		`In \`sentence\`, ${piece} is the article der/die/das/ein of a noun phrase. Which piece is the head of that phrase: its noun, or the word standing in for an elided noun? Choose none if ${piece} is not an article here but a pronoun (relative or demonstrative der, die, das) or a numeral.`,
	particle: (piece) =>
		`In \`sentence\`, is ${piece} the separable particle of a verb standing apart from it (zog … an, kam … zurück)? If so, which piece is that verb? Choose none if it is a preposition, an adverb or anything else.`,
	auxiliary: (piece) =>
		`In \`sentence\`, is ${piece} an auxiliary that forms the perfect, future or passive of another verb (hat … gegessen, ist … gekommen, wird … gebaut, wird … kommen)? If so, which piece is that verb (the participle or infinitive, or the modal it serves)? Choose none if ${piece} is a full verb here: a copula before an adjective or noun, possession, or becoming.`,
	reflexive: (piece) =>
		`In \`sentence\`, is ${piece} the inherently required reflexive of a verb (sich schämen, sich erinnern, sich beeilen), which cannot be replaced by another object? If so, which piece is that verb? Choose none if it is an ordinary object, a reciprocal or a personal pronoun.`,
	expletive: (piece) =>
		`In \`sentence\`, is ${piece} a non-referential es that a verb lexically selects (es gibt, es regnet, es geht um, es handelt sich um)? If so, which piece is that verb? Choose none if it refers to something, anticipates a clause, or only fills the first position.`,
	preposition: (piece) =>
		`In \`sentence\`, does a verb, adjective or noun lexically select ${piece} as its fixed preposition (wartet auf, erinnert sich an, stolz auf, Angst vor)? If so, which piece is that word? Choose none if it is a free preposition of place, time, manner or cause, or part of a pronominal adverb.`,
};

export const slotId = (slot: Slot) => `s_${slot.kind}_${slot.piece.id}`;
export const fixedId = (id: number) => `f_${id}`;
export const pairId = (pair: PairCandidate) =>
	`c_${pair.left.id}_${pair.right.id}`;
export const expressionId = (a: number, b: number) => `e_${a}_${b}`;

function stageOneQuestions(
	sentence: Sentence,
	ref: Reference,
	slots: readonly Slot[],
	pairs: readonly PairCandidate[],
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
		questions[pairId(pair)] = noul(
			pair.kind === "split-adverb"
				? `In \`sentence\`, do ${ref(pair.left)} and ${ref(pair.right)} together form the split adverb ${pair.name} (as Da … von is davon, Wo … hin is wohin)?`
				: `In \`sentence\`, do ${ref(pair.left)} and ${ref(pair.right)} together form the fixed correlative conjunction ${pair.name}?`,
		);
	for (const piece of sentence.pieces)
		questions[fixedId(piece.id)] = noul(
			`In \`sentence\`, is ${ref(piece)} a fixed word of an established multiword expression: an idiom (den Faden verlieren), a support-verb collocation (zur Verfügung stellen, Angst haben), a fixed adverbial (zum Teil, auf keinen Fall), a routine formula (tut mir leid, guten Morgen), or a proverb or famous quotation? Answer no for a word in an ordinary free combination.`,
		);
	return questions;
}

export type SlotLink = {
	readonly from: number;
	readonly to: number;
	readonly share: number;
	readonly kind: SlotKind;
};

/** Each piece's best slot answer: the kind whose best host has the highest share. */
export function slotLinks(
	slots: readonly Slot[],
	answers: Answers,
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
		if (!top.key || top.share <= none) continue;
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

export const candidatesArm: Arm = {
	id: "candidates",
	summary:
		"Code proposes satellite hosts and split-adverb/correlator pairs; jev picks; fixedness Noul plus pair Nouls among fixed pieces for expressions",
	async run(input, context) {
		const sentence = sentenceOf(input);
		const { state, ref } = judgeState(sentence, context);
		const slots = slotsOf(sentence);
		const pairs = pairCandidatesOf(sentence);
		const first = await context.jev.ask({
			stage: "candidates",
			state,
			questions: stageOneQuestions(sentence, ref, slots, pairs),
			repetition: context.repetition,
			calls: context.calls,
		});
		const fixed = new Map(
			sentence.pieces.map((piece) => [
				piece.id,
				noulOf(first, fixedId(piece.id)),
			]),
		);
		// Expression pairs among pieces any policy could call fixed.
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
		const second = await context.jev.ask({
			stage: "expressions",
			state,
			questions: expressionQuestions,
			repetition: context.repetition,
			calls: context.calls,
		});
		const satellites = slotLinks(slots, first);
		const ids = sentence.pieces.map((piece) => piece.id);
		const partitions = new Map<string, Partition>();
		const links: LinkJudgment[] = [];
		for (const [a, b] of flagged.flatMap((a, position) =>
			flagged.slice(position + 1).map((b) => [a, b] as const),
		))
			links.push({
				left: a.id,
				right: b.id,
				probability: noulOf(second, expressionId(a.id, b.id)),
			});
		for (const satelliteFloor of [0.4, 0.6])
			for (const expressionFloor of [null, 0.5, 0.7]) {
				const edges: (readonly [number, number])[] = satellites
					.filter((link) => link.share >= satelliteFloor)
					.map((link) => [link.from, link.to] as const);
				for (const pair of pairs)
					if (noulOf(first, pairId(pair)) >= 0.5)
						edges.push([pair.left.id, pair.right.id]);
				if (expressionFloor !== null)
					for (const link of links)
						if (
							link.probability >= expressionFloor &&
							(fixed.get(link.left) ?? 0) >= 0.5 &&
							(fixed.get(link.right) ?? 0) >= 0.5
						)
							edges.push([link.left, link.right]);
				partitions.set(
					`sat${satelliteFloor}${expressionFloor === null ? "" : `+expr${expressionFloor}`}`,
					partitionOf(ids, edges),
				);
			}
		const routes = await judgeRoutes(
			sentence,
			[...partitions.values()],
			context,
		);
		return {
			primary: "sat0.4+expr0.5",
			outputs: Object.fromEntries(
				[...partitions].map(([policy, partition]) => [
					policy,
					outputOf(sentence, partition, routeFrom(routes.identity)),
				]),
			),
			routes: [...routes.identity.values()],
			links,
		};
	},
};
