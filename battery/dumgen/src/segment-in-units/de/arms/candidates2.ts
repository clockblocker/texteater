/**
 * The candidates arm with the generators its first run showed missing: a
 * Noul per candidate Saying span (the sentence, quoted stretches, clauses),
 * a host Choice per noun for idioms and support-verb collocations,
 * circumpositions, adjacent subordinators (`ohne dass`), multiword names,
 * shortened articles and superlative `am`. Inside an expression unit, code
 * adds the other pieces of a split word (`zu` + `m` of `zum Ausdruck
 * bringen`) and the preposition opening a member noun's phrase (`in den
 * Sand`), as the Rules make fixed articles and prepositions members.
 */
import type { Questions } from "promptsmith/typesafe";
import { type Answers, choice, noul, noulOf } from "../../lab/jev.js";
import {
	type Arm,
	judgeRoutes,
	judgeState,
	type LinkJudgment,
	option,
	type Reference,
	routeFrom,
} from "../arm.js";
import {
	fusedSiblings,
	isAdpositionPiece,
	nounLike,
	type PairCandidate,
	pairCandidatesOf,
	type SayingSpan,
	type Slot,
	sayingSpans,
	slotsOf,
	superlativeLinks,
} from "../candidates.js";
import {
	argmax,
	groupKey,
	outputOf,
	type Partition,
	partitionOf,
} from "../partition.js";
import type { RouteKey } from "../routes.js";
import { type Sentence, sentenceOf } from "../sentence.js";
import {
	expressionId,
	fixedId,
	pairId,
	type SlotLink,
	slotId,
	slotLinks,
	slotQuestion,
} from "./candidates.js";

const sayingId = (span: SayingSpan) =>
	`y_${span.pieces.map((piece) => piece.id).join("_")}`;

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

/** v3: the v2 wording invited the modal as host (`musste … verleumdet haben`). */
const auxiliaryQuestion3 = (piece: string) =>
	`In \`sentence\`, is ${piece} an auxiliary that forms the perfect, future or passive of another verb (hat … gegessen, ist … gekommen, wird … gebaut, wird … kommen, ist … verleumdet worden)? If so, which piece is the participle or infinitive it combines with? Only in hat … schreiben müssen, where an infinitive-shaped modal stands for the participle, choose the modal. Choose none if ${piece} is a full verb here: a copula before an adjective or noun, possession, or becoming.`;

/**
 * v3: a host takes at most one particle and one governed preposition, the
 * most probable (`sehnen sich nach … nach`).
 */
function oneSatellitePerHost(links: readonly SlotLink[]): SlotLink[] {
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

function questionsOf(
	sentence: Sentence,
	ref: Reference,
	slots: readonly Slot[],
	pairs: readonly PairCandidate[],
	spans: readonly SayingSpan[],
	generation: number,
): Questions {
	const questions: Questions = {};
	for (const slot of slots)
		questions[slotId(slot)] = choice(
			generation >= 3 && slot.kind === "auxiliary"
				? auxiliaryQuestion3(ref(slot.piece))
				: slotQuestion[slot.kind](ref(slot.piece)),
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
		questions[sayingId(span)] = noul(
			`In \`sentence\`, is exactly the wording "${span.text}" a complete proverb, or a famous quotation or aphorism that speakers cite as a saying (Morgenstund hat Gold im Mund; Wer nichts weiß, muss alles glauben)? Answer no for an ordinary statement, and no when the saying is only part of this wording.`,
		);
	return questions;
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

type Family = "Lexeme" | "Locution" | "Saying";

type Policy = {
	readonly satellite: number;
	readonly idiom: number | null;
	readonly expression: number | null;
	readonly saying: number | null;
	readonly absorb: boolean;
};

const policies: Readonly<Record<string, Policy>> = {
	sat: {
		satellite: 0.5,
		idiom: null,
		expression: null,
		saying: null,
		absorb: false,
	},
	"sat+idiom": {
		satellite: 0.5,
		idiom: 0.5,
		expression: null,
		saying: null,
		absorb: true,
	},
	"sat+idiom+expr": {
		satellite: 0.5,
		idiom: 0.5,
		expression: 0.5,
		saying: null,
		absorb: true,
	},
	full: {
		satellite: 0.5,
		idiom: 0.5,
		expression: 0.5,
		saying: 0.5,
		absorb: true,
	},
	"full-noabsorb": {
		satellite: 0.5,
		idiom: 0.5,
		expression: 0.5,
		saying: 0.5,
		absorb: false,
	},
	"full@0.7": {
		satellite: 0.5,
		idiom: 0.7,
		expression: 0.7,
		saying: 0.7,
		absorb: true,
	},
	"full@0.3": {
		satellite: 0.5,
		idiom: 0.3,
		expression: 0.5,
		saying: 0.3,
		absorb: true,
	},
};

export const candidates2Arm: Arm = {
	id: "candidates2",
	summary:
		"candidates plus Saying spans, idiom/collocation hosts for nouns, circumpositions, names, subordinator pairs, superlative am, and fused/preposition absorption inside expressions",
	async run(input, context) {
		const sentence = sentenceOf(input);
		const { state, ref } = judgeState(sentence, context);
		const generation = Number(option(context.options, "gen", "2"));
		const slots = slotsOf(sentence, generation);
		const pairs = pairCandidatesOf(sentence, 2);
		const spans = sayingSpans(sentence);
		const first = await context.jev.ask({
			stage: "candidates",
			state,
			questions: questionsOf(
				sentence,
				ref,
				slots,
				pairs,
				spans,
				generation,
			),
			repetition: context.repetition,
			calls: context.calls,
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
		const second = await context.jev.ask({
			stage: "expressions",
			state,
			questions: expressionQuestions,
			repetition: context.repetition,
			calls: context.calls,
		});
		const links: LinkJudgment[] = flagged.flatMap((a, position) =>
			flagged.slice(position + 1).map((b) => ({
				left: a.id,
				right: b.id,
				probability: noulOf(second, expressionId(a.id, b.id)),
			})),
		);
		const slotAnswers =
			generation >= 3
				? oneSatellitePerHost(slotLinks(slots, first))
				: slotLinks(slots, first);
		const articleOf = new Map(
			slotAnswers
				.filter((link) => link.kind === "article")
				.map((link) => [link.to, link.from]),
		);
		const siblings = fusedSiblings(sentence);
		const ids = sentence.pieces.map((piece) => piece.id);
		const partitions = new Map<string, Partition>();
		const families = new Map<
			string,
			(group: readonly number[]) => Family
		>();
		const accepted = matchedPairs(pairs, first, 0.5);
		for (const [name, policy] of Object.entries(policies)) {
			const edges: (readonly [number, number])[] = [
				...slotAnswers
					.filter(
						(link) =>
							link.kind !== "idiom" &&
							link.share >= policy.satellite,
					)
					.map((link) => [link.from, link.to] as const),
				...accepted.map(([left, right]) => [left, right] as const),
				...superlativeLinks(sentence),
			];
			const locutionPieces = new Set(
				accepted
					.filter(
						([, , kind]) =>
							kind === "correlator" || kind === "circumposition",
					)
					.flatMap(([left, right]) => [left, right]),
			);
			const sayingPieces = new Set<number>();
			const expression: (readonly [number, number])[] = [];
			if (policy.idiom !== null) {
				const floor = policy.idiom;
				for (const link of slotAnswers)
					if (link.kind === "idiom" && link.share >= floor)
						expression.push([link.from, link.to]);
			}
			if (policy.expression !== null)
				for (const link of links)
					if (
						link.probability >= policy.expression &&
						(fixed.get(link.left) ?? 0) >= 0.5 &&
						(fixed.get(link.right) ?? 0) >= 0.5
					)
						expression.push([link.left, link.right]);
			if (policy.saying !== null) {
				const covered = new Set<number>();
				const floor = policy.saying;
				for (const span of [...spans]
					.filter((span) => noulOf(first, sayingId(span)) >= floor)
					.sort(
						(a, b) =>
							noulOf(first, sayingId(b)) -
								noulOf(first, sayingId(a)) ||
							a.pieces.length - b.pieces.length,
					)) {
					if (span.pieces.some((piece) => covered.has(piece.id)))
						continue;
					for (const piece of span.pieces) {
						covered.add(piece.id);
						sayingPieces.add(piece.id);
						expression.push([
							span.pieces[0]?.id ?? piece.id,
							piece.id,
						]);
					}
				}
			}
			if (policy.absorb) {
				const members = new Set(expression.flat());
				for (const id of [...members]) {
					for (const sibling of siblings.get(id) ?? [])
						expression.push([id, sibling]);
					const piece = sentence.pieces[id - 1];
					if (!piece || !nounLike(piece)) continue;
					const start = Math.min(articleOf.get(id) ?? id, id);
					const before = sentence.pieces[start - 2];
					if (
						before &&
						before.clause === piece.clause &&
						isAdpositionPiece(before)
					) {
						expression.push([id, before.id]);
						for (const sibling of siblings.get(before.id) ?? [])
							expression.push([id, sibling]);
					}
				}
			}
			for (const id of expression.flat()) locutionPieces.add(id);
			partitions.set(name, partitionOf(ids, [...edges, ...expression]));
			families.set(name, (group) =>
				group.length === 1
					? "Lexeme"
					: group.some((id) => sayingPieces.has(id))
						? "Saying"
						: group.some((id) => locutionPieces.has(id))
							? "Locution"
							: "Lexeme",
			);
		}
		const routes = await judgeRoutes(
			sentence,
			[...partitions.values()],
			context,
		);
		const jevRoute = routeFrom(routes.identity);
		/** Code names the Family from how the unit was built; jev only the Kind within it. */
		const structural =
			(familyOf: (group: readonly number[]) => Family) =>
			(group: readonly number[]): RouteKey => {
				if (group.length === 1) return jevRoute(group);
				const family = familyOf(group);
				if (family === "Saying") return "Saying/Saying";
				const distribution =
					routes.distributions.get(groupKey(group)) ?? {};
				const best = argmax(
					Object.fromEntries(
						Object.entries(distribution).filter(([key]) =>
							key.startsWith(`${family}/`),
						),
					),
				);
				return best.key || jevRoute(group);
			};
		return {
			primary: "full+family",
			outputs: Object.fromEntries(
				[...partitions].flatMap(([policy, partition]) => {
					const familyOf = families.get(policy);
					return [
						[policy, outputOf(sentence, partition, jevRoute)],
						...(familyOf
							? [
									[
										`${policy}+family`,
										outputOf(
											sentence,
											partition,
											structural(familyOf),
										),
									],
								]
							: []),
					];
				}),
			),
			routes: [...routes.identity.values()],
			links,
		};
	},
};
