/**
 * Round 2 (#744): candidates v3 as it was, plus levers that change only
 * what jev is asked and how code reads it. v3's three requests are sent
 * unchanged, so they stay cache hits, and every lever asks in its own
 * request over the same state. `v3` reproduces v3's output.
 *
 * - `step0=1` (assembly and bug fixes, reported apart from the prompts):
 *   symbols take no article; number `Komma`/`bis` number is one Locution;
 *   adjacent interjections merge; abbreviation-shaped pieces also see
 *   Locution routes; clause-initial pieces may host an idiom; `so … daß`.
 * - `span=1`: a Choice for every clause-internal run of 2–4 written words:
 *   exactly one dictionary expression, an expression plus free words, part
 *   of a longer one, or free words.
 * - `polish=1`: the Saying Noul becomes a Choice (whole, fragment, saying
 *   plus other words, general maxim, none); the fixedness and pair questions
 *   get criteria naming the false cases the first round showed.
 * - `alt=1`: for each multi-piece unit of the combined policy, code renders
 *   alternative markings (as built, minus an outer block, plus a neighbour,
 *   split) and jev picks one.
 * - `closed=1`: closed-class identity for PART, CCONJ and SCONJ words among
 *   candidates encoded here from the #734 rulings (see `closed-class.ts`).
 */
import type { Questions } from "promptsmith/typesafe";
import { type Answers, choice, choiceOf, noul } from "../../lab/jev.js";
import {
	type Arm,
	type ArmContext,
	joinRefs,
	judgeRoutes,
	type LinkJudgment,
	numberOption,
	option,
	type RouteJudgment,
	readRoutes,
	routeQuestions,
} from "../arm.js";
import type { Slot, SlotKind } from "../candidates.js";
import {
	contiguousSpans,
	idiomHosts,
	isAbbreviationPiece,
	isSymbolPiece,
	numberRanges,
	oldSpellingCorrelators,
	sayingSpans,
} from "../candidates.js";
import {
	closedClassQuestion,
	closedClassRoute,
	hasFixedRoute,
} from "../closed-class.js";
import {
	argmax,
	groupKey,
	outputOf,
	type Partition,
	partitionOf,
} from "../partition.js";
import { allRoutes, type RouteKey, routeCriteria } from "../routes.js";
import { markedText, type Sentence } from "../sentence.js";
import type { SlotLink } from "./candidates.js";
import {
	type AssemblyInput,
	articleHosts,
	assemble,
	type CandidatesCore,
	candidatesCore,
	type Family,
	oneSatellitePerHost,
	policies,
	policyInput,
	structuralRoute,
} from "./candidates2.js";

/** v3's options: its requests must stay byte-identical. */
const v3Options = { routes: "question", tests: "1", gen: "3" } as const;

const text = (sentence: Sentence, ids: readonly number[]) => {
	const first = sentence.pieces[(ids[0] ?? 1) - 1]?.segment ?? 0;
	const last = sentence.pieces[(ids[ids.length - 1] ?? 1) - 1]?.segment ?? 0;
	return sentence.segments
		.slice(first, last + 1)
		.map((segment) => segment.text)
		.join("");
};

// ------------------------------------------------------------- step 0

function stepZeroQuestions(core: CandidatesCore): Questions {
	const { sentence, ref } = core;
	const questions: Questions = {};
	for (const slot of core.slots) {
		if (slot.kind !== "idiom") continue;
		const hosts = idiomHosts(sentence, slot.piece, true);
		if (hosts.length === slot.hosts.length) continue;
		questions[`s4_idiom_${slot.piece.id}`] = choice(
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
		questions[`c4_${pair.left.id}_${pair.right.id}`] = noul(
			`In \`sentence\`, do ${ref(pair.left)} and ${ref(pair.right)} together form the fixed conjunction so … dass (spelled daß)?`,
		);
	return questions;
}

/** v3's assembly input with the step-0 rules and fixed idiom hosts applied. */
function stepZeroInput(
	core: CandidatesCore,
	base: AssemblyInput,
	answers: Answers,
	idiomFloor: number,
): { input: AssemblyInput; ranges: (readonly number[])[] } {
	const { sentence } = core;
	const ranges = numberRanges(sentence);
	const inRange = new Set(ranges.flat());
	const symbol = (id: number) => {
		const piece = sentence.pieces[id - 1];
		return piece !== undefined && isSymbolPiece(piece);
	};
	const articleLinks = new Set(
		core.slotAnswers
			.filter((link) => link.kind === "article")
			.map((link) => `${link.from}>${link.to}`),
	);
	const satellites = base.satellites.filter(
		([from, to]) =>
			!inRange.has(from) &&
			!inRange.has(to) &&
			!(articleLinks.has(`${from}>${to}`) && symbol(to)),
	);
	// Idiom links: a re-asked slot replaces v3's answer for that noun.
	const reasked = new Set(
		Object.keys(answers)
			.filter((id) => id.startsWith("s4_idiom_"))
			.map((id) => Number(id.slice(9))),
	);
	const idiomLinks = new Set(
		core.slotAnswers
			.filter((link) => link.kind === "idiom")
			.map((link) => `${link.from}>${link.to}`),
	);
	const expression = base.expression.filter(
		([from, to]) => !(reasked.has(from) && idiomLinks.has(`${from}>${to}`)),
	);
	for (const id of reasked) {
		const answer = choiceOf(answers, `s4_idiom_${id}`);
		const hosts = Object.fromEntries(
			Object.entries(answer.probabilities).filter(
				([key]) => key !== "none",
			),
		);
		const top = argmax(hosts);
		if (
			top.key &&
			top.share > (answer.probabilities.none ?? 0) &&
			top.share >= idiomFloor
		)
			expression.push([id, Number(top.key.slice(1))]);
	}
	for (const range of ranges)
		for (const id of range.slice(1)) expression.push([range[0] ?? id, id]);
	const accepted = [...base.accepted];
	for (const [id, answer] of Object.entries(answers))
		if (
			id.startsWith("c4_") &&
			answer.type === "noul" &&
			answer.noul >= 0.5
		) {
			const [, left, right] = id.split("_").map(Number);
			if (left && right) accepted.push([left, right, "correlator"]);
		}
	return { input: { ...base, satellites, expression, accepted }, ranges };
}

/**
 * Adjacent one-piece units both routed INTJ, with only a space between,
 * merge into one Locution/INTJ (Rule `de/interjection-counts-its-words`).
 */
function mergeInterjections(
	sentence: Sentence,
	partition: Partition,
	route: (group: readonly number[]) => RouteKey,
): { partition: Partition; merged: Set<string> } {
	const interjection = (id: number) => {
		const group = partition.find((entry) => entry.includes(id));
		return group?.length === 1 && route(group) === "Lexeme/INTJ";
	};
	const links: [number, number][] = [];
	for (const piece of sentence.pieces.slice(1)) {
		const previous = sentence.pieces[piece.id - 2];
		if (!previous) continue;
		const between = sentence.segments.slice(
			previous.segment + 1,
			piece.segment,
		);
		if (
			between.length > 0 &&
			between.every((segment) => segment.kind === "Whitespace") &&
			interjection(previous.id) &&
			interjection(piece.id)
		)
			links.push([previous.id, piece.id]);
	}
	if (links.length === 0) return { partition, merged: new Set() };
	const next = partitionOf(
		sentence.pieces.map((piece) => piece.id),
		[
			...partition.flatMap((group) =>
				group.slice(1).map((id) => [group[0] ?? id, id] as const),
			),
			...links,
		],
	);
	const merged = new Set(
		next
			.filter((group) => links.some(([a]) => group.includes(a)))
			.map(groupKey),
	);
	return { partition: next, merged };
}

// ------------------------------------------------------------- spans

const spanCriteria = {
	exact: "Yes: exactly these words, nothing more and nothing less, are one fixed expression a dictionary lists as one entry (zum Beispiel, und so weiter, tut mir leid, ha ha, auf keinen Fall, drei Komma fünf)",
	more: "They hold a fixed expression plus free words next to it (Das tut mir leid: Das is free; Vielen Dank für: für is free)",
	part: "They are only part of a longer fixed expression whose other words stand outside them (den Kopf in den Sand in 'den Kopf in den Sand stecken')",
	free: "No: ordinary words combined freely (der alte Mann, sehr schnell, in der Stadt, hat gegessen)",
};

const spanId = (ids: readonly number[]) => `sp_${ids.join("_")}`;

function spanQuestions(core: CandidatesCore): Questions {
	const { sentence, ref } = core;
	const questions: Questions = {};
	for (const ids of contiguousSpans(sentence))
		questions[spanId(ids)] = choice(
			`In \`sentence\`, consider exactly the words "${text(sentence, ids)}" (${joinRefs(sentence, ref, ids)}). Would a German dictionary list exactly these words together as one entry: an idiom, a support-verb collocation, a fixed adverbial or connective, a routine formula or exclamation, or a number expression?`,
			spanCriteria,
		);
	return questions;
}

/** Spans whose `exact` share clears the floor, most probable first, disjoint. */
function chosenSpans(answers: Answers, floor: number): number[][] {
	const scored = Object.entries(answers)
		.filter(
			([id, answer]) => id.startsWith("sp_") && answer.type === "choice",
		)
		.map(([id, answer]) => ({
			ids: id.slice(3).split("_").map(Number),
			exact:
				answer.type === "choice"
					? (answer.probabilities.exact ?? 0)
					: 0,
		}))
		.filter(({ exact }) => exact >= floor)
		.sort((a, b) => b.exact - a.exact || b.ids.length - a.ids.length);
	const used = new Set<number>();
	const chosen: number[][] = [];
	for (const { ids } of scored) {
		if (ids.some((id) => used.has(id))) continue;
		for (const id of ids) used.add(id);
		chosen.push(ids);
	}
	return chosen;
}

function withSpans(
	input: AssemblyInput,
	spans: readonly (readonly number[])[],
	cut: boolean,
): AssemblyInput {
	const inside = (id: number) => spans.find((span) => span.includes(id));
	const expression = cut
		? input.expression.filter(([a, b]) => {
				const left = inside(a);
				const right = inside(b);
				return (
					left === right ||
					(left === undefined && right === undefined)
				);
			})
		: [...input.expression];
	for (const span of spans)
		for (const id of span.slice(1)) expression.push([span[0] ?? id, id]);
	return { ...input, expression };
}

// ------------------------------------------------------------- polish

const sayingCriteria = {
	whole: "A complete proverb, famous quotation or aphorism that people cite as a saying, in exactly this wording (Morgenstund hat Gold im Mund; Wer nichts weiß, muss alles glauben)",
	fragment:
		"The start of such a saying or a changed wording of one, standing for it (Wer im Glashaus sitzt …; Aller Anfank ist schwer with a typo)",
	plus: "A saying together with other words around it, such as the clause that introduces or comments on it",
	maxim: "A general maxim about life, stated as a timeless truth in the style of an aphorism, even if you do not know its author",
	idiom: "An ordinary sentence that only uses an idiom or fixed phrase inside it (Er ließ die Katze aus dem Sack; Sie hat den Faden verloren), not a saying",
	none: "An ordinary statement, question or description, not a saying",
};

const sayingChoiceId = (ids: readonly number[]) => `y4_${ids.join("_")}`;
const polishedFixedId = (id: number) => `f4_${id}`;
const polishedPairId = (a: number, b: number) => `e4_${a}_${b}`;

function sayingQuestions(core: CandidatesCore): Questions {
	const questions: Questions = {};
	for (const span of sayingSpans(core.sentence)) {
		const ids = span.pieces.map((piece) => piece.id);
		questions[sayingChoiceId(ids)] = choice(
			`In \`sentence\`, what is the wording "${span.text}"?`,
			sayingCriteria,
		);
	}
	return questions;
}

function polishQuestions(core: CandidatesCore): Questions {
	const { sentence, ref } = core;
	const questions: Questions = {};
	for (const span of sayingSpans(sentence)) {
		const ids = span.pieces.map((piece) => piece.id);
		questions[sayingChoiceId(ids)] = choice(
			`In \`sentence\`, what is the wording "${span.text}"?`,
			sayingCriteria,
		);
	}
	for (const piece of sentence.pieces)
		questions[polishedFixedId(piece.id)] = noul(
			`In \`sentence\`, is ${ref(piece)} one of the fixed words of a multiword expression that a German dictionary lists as one entry: an idiom, a support-verb collocation, a fixed adverbial or connective, a routine formula, or a proverb?`,
			{
				true: "The expression needs exactly this word: den Faden verlieren, zur Verfügung stellen, zum Beispiel, tut mir leid, Vielen Dank",
				false: "A free word, even right next to an expression: the subject Das in Das tut mir leid, für in Vielen Dank für die Hilfe, an ordinary object, adverb or name; or a word of an ordinary free combination",
			},
		);
	return questions;
}

function polishPairQuestions(
	core: CandidatesCore,
	fixed: ReadonlyMap<number, number>,
): Questions {
	const { sentence, ref } = core;
	const flagged = sentence.pieces
		.filter((piece) => (fixed.get(piece.id) ?? 0) >= 0.3)
		.sort((a, b) => (fixed.get(b.id) ?? 0) - (fixed.get(a.id) ?? 0))
		.slice(0, 14)
		.sort((a, b) => a.id - b.id);
	const questions: Questions = {};
	for (const [position, a] of flagged.entries())
		for (const b of flagged.slice(position + 1))
			questions[polishedPairId(a.id, b.id)] = noul(
				`In \`sentence\`, are ${ref(a)} and ${ref(b)} fixed words of the same one multiword expression that a German dictionary lists as one entry?`,
				{
					true: "Both belong to one expression: zum … Beispiel, den Faden … verlieren, tut … leid",
					false: "They belong to different expressions, or one is a free word: the subject, an object, or a preposition that introduces a free complement (Das + tut in Das tut mir leid; Dank + für in Vielen Dank für)",
				},
			);
	return questions;
}

function polishedSayings(
	sentence: Sentence,
	answers: Answers,
	floor: number,
	maxim: boolean,
): number[][] {
	const scored = sayingSpans(sentence)
		.map((span) => {
			const ids = span.pieces.map((piece) => piece.id);
			const answer = answers[sayingChoiceId(ids)];
			const probabilities =
				answer?.type === "choice" ? answer.probabilities : {};
			const score =
				(probabilities.whole ?? 0) +
				(probabilities.fragment ?? 0) +
				(maxim ? (probabilities.maxim ?? 0) : 0);
			return { ids, score, plus: probabilities.plus ?? 0 };
		})
		.filter(({ score, plus }) => score >= floor && score > plus)
		.sort((a, b) => b.score - a.score || a.ids.length - b.ids.length);
	const used = new Set<number>();
	const chosen: number[][] = [];
	for (const { ids } of scored) {
		if (ids.some((id) => used.has(id))) continue;
		for (const id of ids) used.add(id);
		chosen.push(ids);
	}
	return chosen;
}

function withPolish(
	core: CandidatesCore,
	input: AssemblyInput,
	fixed: ReadonlyMap<number, number>,
	pairs: Answers,
	sayings: readonly (readonly number[])[],
	floor: number,
): AssemblyInput {
	// v3's expression pairs go; idiom hosts, spans and ranges stay.
	const oldPairs = new Set(
		core.links.map((link) => `${link.left}>${link.right}`),
	);
	const expression = input.expression.filter(
		([a, b]) => !oldPairs.has(`${a}>${b}`),
	);
	for (const [id, answer] of Object.entries(pairs)) {
		if (
			!id.startsWith("e4_") ||
			answer.type !== "noul" ||
			answer.noul < floor
		)
			continue;
		const [, a, b] = id.split("_").map(Number);
		if (a && b && (fixed.get(a) ?? 0) >= 0.5 && (fixed.get(b) ?? 0) >= 0.5)
			expression.push([a, b]);
	}
	return { ...input, expression, sayings };
}

// ------------------------------------------------------------- alternatives

type Alternative = {
	readonly key: string;
	readonly groups: readonly (readonly number[])[];
};

/**
 * Alternatives for one unit, built from blocks: the Lexeme-level groups
 * inside it (or its pieces when it is one block) and the neighbouring groups.
 */
function alternativesFor(
	unit: readonly number[],
	partition: Partition,
	blocks: Partition,
): Alternative[] {
	let inner = blocks
		.map((block) => block.filter((id) => unit.includes(id)))
		.filter((block) => block.length > 0);
	if (inner.length < 2) inner = unit.map((id) => [id]);
	const sorted = [...inner].sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));
	const min = Math.min(...unit);
	const max = Math.max(...unit);
	const neighbour = (id: number) =>
		partition.find(
			(group) =>
				group.includes(id) && !group.some((x) => unit.includes(x)),
		);
	const alternatives: Alternative[] = [{ key: "built", groups: [unit] }];
	const first = sorted[0];
	const last = sorted[sorted.length - 1];
	if (first && sorted.length > 1)
		alternatives.push({
			key: "minusFirst",
			groups: [unit.filter((id) => !first.includes(id)), first],
		});
	if (last && sorted.length > 1)
		alternatives.push({
			key: "minusLast",
			groups: [unit.filter((id) => !last.includes(id)), last],
		});
	for (const [key, group] of [
		["plusLeft", neighbour(min - 1)],
		["plusRight", neighbour(max + 1)],
	] as const)
		if (group && group.length <= 3)
			alternatives.push({
				key,
				groups: [[...unit, ...group].sort((a, b) => a - b)],
			});
	alternatives.push({ key: "split", groups: sorted });
	return alternatives;
}

const alternativeId = (unit: readonly number[]) => `al_${unit.join("_")}`;

function alternativeQuestions(
	sentence: Sentence,
	units: readonly (readonly number[])[],
	partition: Partition,
	blocks: Partition,
): { questions: Questions; options: Map<string, Alternative[]> } {
	const questions: Questions = {};
	const options = new Map<string, Alternative[]>();
	for (const unit of units) {
		const alternatives = alternativesFor(unit, partition, blocks);
		options.set(alternativeId(unit), alternatives);
		questions[alternativeId(unit)] = choice(
			"Which option marks exactly one complete unit of the sentence in ⟦ ⟧: one word with the pieces it owns (its article, separable particle, auxiliaries, required reflexive, governed preposition), or one fixed multiword expression, with no free word inside and no fixed word of it left outside? When the words of a unit stand apart, one unit gets several ⟦ ⟧.",
			Object.fromEntries(
				alternatives.map((alternative) => [
					alternative.key,
					alternative.key === "split"
						? `None: in ${markedText(sentence, unit)} the marked words are not one unit`
						: markedText(sentence, alternative.groups[0] ?? unit),
				]),
			),
		);
	}
	return { questions, options };
}

function applyAlternatives(
	partition: Partition,
	answers: Answers,
	options: ReadonlyMap<string, Alternative[]>,
	floor: number,
): { partition: Partition; changed: number } {
	let groups = partition.map((group) => [...group]);
	let changed = 0;
	const decided = [...options]
		.map(([id, alternatives]) => {
			const answer = choiceOf(answers, id);
			const top = argmax(answer.probabilities);
			return { id, alternatives, top };
		})
		.filter(({ top }) => top.key !== "built" && top.share >= floor)
		.sort((a, b) => b.top.share - a.top.share);
	for (const { id, alternatives, top } of decided) {
		const unit = id.slice(3).split("_").map(Number);
		const current = groups.find(
			(group) => group.join(",") === unit.join(","),
		);
		const alternative = alternatives.find((entry) => entry.key === top.key);
		if (!current || !alternative) continue;
		const touched = new Set(alternative.groups.flat());
		// Only groups wholly inside the alternative may be taken over.
		const taken = groups.filter((group) =>
			group.some((x) => touched.has(x)),
		);
		if (taken.some((group) => group.some((x) => !touched.has(x)))) continue;
		groups = [
			...groups.filter((group) => !taken.includes(group)),
			...alternative.groups.map((group) => [...group]),
		];
		changed++;
	}
	return {
		partition: groups
			.map((group) => group.sort((a, b) => a - b))
			.sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0)),
		changed,
	};
}

// ------------------------------------------------------------- slots

/**
 * v5 slot DTO: the same hosts, but `none` split into the false cases the
 * first round's over-grouping showed, each its own option, so the judge has
 * somewhere to put a free preposition or an ordinary object.
 */
const slotFalseCases: Readonly<
	Record<SlotKind, Readonly<Record<string, string>>>
> = {
	idiom: {
		literal:
			"Not an idiom here: an ordinary noun the verb takes as its object or complement in its literal sense",
		name: "A name or title",
	},
	article: {
		pronoun:
			"Not an article here: a demonstrative or relative pronoun standing on its own (der, die, das)",
		numeral: "The numeral ein (one)",
	},
	particle: {
		preposition:
			"A preposition that opens a phrase (auf dem Tisch, mit ihm)",
		adverb: "An adverb of its own, not part of a verb (weg = gone, wieder = again, vorbei = over)",
	},
	auxiliary: {
		copula: "A copula before a predicate adjective, participle or noun (ist müde, ist geschlossen, wird Arzt)",
		full: "A full verb of its own: haben = own, werden = become, sein = exist or be somewhere",
	},
	reflexive: {
		object: "An ordinary object: another noun or pronoun could stand there with the same verb meaning (sie wäscht sich / das Kind)",
		other: "A reciprocal (each other) or a personal pronoun that is not reflexive",
	},
	expletive: {
		referential: "es refers to a thing or situation named elsewhere",
		placeholder:
			"es points ahead to a clause or only fills the first position (Es freut mich, dass …; Es kamen Gäste)",
	},
	preposition: {
		free: "A free preposition of place, time, manner, cause or company that almost any verb could take (im Keller, am Montag, mit dem Bus, wegen des Regens)",
		fixed: "Part of a fixed phrase or pronominal adverb rather than chosen by one word (zum Beispiel, auf keinen Fall)",
	},
};

const slotQuestion5: Record<SlotKind, (piece: string) => string> = {
	idiom: (piece) =>
		`In \`sentence\`, is ${piece} a fixed part of an idiom or a support-verb collocation together with a verb (den Faden verlieren, den Kopf in den Sand stecken, eine Entscheidung treffen, Kritik üben, einen Antrag stellen, zur Verfügung stellen, Angst haben)? If so, which piece is that verb?`,
	article: (piece) =>
		`In \`sentence\`, which piece is the head of the noun phrase that ${piece} opens as its article der/die/das/ein: its noun, or the word standing in for an elided noun?`,
	particle: (piece) =>
		`In \`sentence\`, is ${piece} the separable particle of a verb standing apart from it (zog … an, kam … zurück)? If so, which piece is that verb?`,
	auxiliary: (piece) =>
		`In \`sentence\`, is ${piece} an auxiliary that forms the perfect, future or passive of another verb (hat … gegessen, ist … gekommen, wird … gebaut, wird … kommen)? If so, which piece is the participle or infinitive it combines with?`,
	reflexive: (piece) =>
		`In \`sentence\`, is ${piece} the inherently required reflexive of a verb (sich schämen, sich erinnern, sich beeilen), one no other object could replace? If so, which piece is that verb?`,
	expletive: (piece) =>
		`In \`sentence\`, is ${piece} a non-referential es that a verb lexically selects (es gibt, es regnet, es geht um, es handelt sich um)? If so, which piece is that verb?`,
	preposition: (piece) =>
		`In \`sentence\`, does one verb, adjective or noun lexically select ${piece} as its fixed preposition, so a learner must memorize them together (wartet auf, erinnert sich an, stolz auf, Angst vor)? If so, which piece is that word?`,
};

const slotId5 = (slot: Slot) => `s5_${slot.kind}_${slot.piece.id}`;

function slotQuestions(core: CandidatesCore): Questions {
	const questions: Questions = {};
	for (const slot of core.slots) {
		const hosts =
			slot.kind === "idiom"
				? idiomHosts(core.sentence, slot.piece, true)
				: slot.hosts;
		questions[slotId5(slot)] = choice(
			slotQuestion5[slot.kind](core.ref(slot.piece)),
			{
				...Object.fromEntries(
					hosts.map((host) => [`p${host.id}`, host.text]),
				),
				...slotFalseCases[slot.kind],
			},
		);
	}
	return questions;
}

/** Each piece's best v5 slot answer: a host whose share beats every false case together. */
function slotLinks5(core: CandidatesCore, answers: Answers): SlotLink[] {
	const best = new Map<number, SlotLink>();
	for (const slot of core.slots) {
		const answer = answers[slotId5(slot)];
		if (answer?.type !== "choice") continue;
		const hosts = Object.fromEntries(
			Object.entries(answer.probabilities).filter(([key]) =>
				/^p\d+$/u.test(key),
			),
		);
		const falseMass = Object.entries(answer.probabilities)
			.filter(([key]) => !/^p\d+$/u.test(key))
			.reduce((total, [, share]) => total + share, 0);
		const top = argmax(hosts);
		if (!top.key || top.share <= falseMass) continue;
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
	return oneSatellitePerHost([...best.values()]);
}

/** The assembly input with every slot link taken from the v5 answers. */
function withSlots(
	core: CandidatesCore,
	input: AssemblyInput,
	links: readonly SlotLink[],
	ranges: readonly (readonly number[])[],
): AssemblyInput {
	const inRange = new Set(ranges.flat());
	const symbol = (id: number) => {
		const piece = core.sentence.pieces[id - 1];
		return piece !== undefined && isSymbolPiece(piece);
	};
	// Expression pairs and number ranges stay; every idiom link is re-read.
	const expression: (readonly [number, number])[] = [
		...policyInput(core, {
			satellite: 0.5,
			idiom: null,
			expression: 0.7,
			saying: null,
			absorb: true,
		}).expression,
		...ranges.flatMap((range) =>
			range.slice(1).map((id) => [range[0] ?? id, id] as const),
		),
	];
	for (const link of links)
		if (link.kind === "idiom" && link.share >= 0.7)
			expression.push([link.from, link.to]);
	return {
		...input,
		satellites: links
			.filter((link) => link.kind !== "idiom" && link.share >= 0.5)
			.filter((link) => !inRange.has(link.from) && !inRange.has(link.to))
			.filter((link) => !(link.kind === "article" && symbol(link.to)))
			.map((link) => [link.from, link.to] as const),
		expression,
	};
}

// ------------------------------------------------------------- support verbs and trimming

const supportVerbId = (id: number) => `fv_${id}`;

/**
 * v6 DTO: for each noun, which nearby verb only supports it, tested by the
 * paraphrase a learner knows (eine Frage stellen = fragen), with the literal
 * reading as its own option.
 */
function supportVerbQuestions(core: CandidatesCore): Questions {
	const questions: Questions = {};
	for (const slot of core.slots) {
		if (slot.kind !== "idiom") continue;
		const hosts = idiomHosts(core.sentence, slot.piece, true);
		if (hosts.length === 0) continue;
		const noun = core.ref(slot.piece);
		questions[supportVerbId(slot.piece.id)] = choice(
			`In \`sentence\`, is there a verb that only supports ${noun}, so that the verb and ${noun} together mean what one simple verb or adjective means (eine Frage stellen = fragen, Einfluss nehmen = beeinflussen, Zustimmung erteilen = zustimmen, zur Verfügung stellen = bereitstellen, Rücksicht nehmen = berücksichtigen), or that forms an idiom with it (den Faden verlieren, Trübsal blasen)? If so, which piece is that verb?`,
			{
				...Object.fromEntries(
					hosts.map((host) => [`p${host.id}`, host.text]),
				),
				literal: `No: the verb keeps its own full meaning and ${noun} is its ordinary object, subject or complement (stellt die Vase ab, trifft den Ball)`,
				none: "No verb here goes with it",
			},
		);
	}
	return questions;
}

function supportVerbLinks(
	answers: Answers,
	floor: number,
): (readonly [number, number])[] {
	const links: (readonly [number, number])[] = [];
	for (const [id, answer] of Object.entries(answers)) {
		if (!id.startsWith("fv_") || answer.type !== "choice") continue;
		const hosts = Object.fromEntries(
			Object.entries(answer.probabilities).filter(([key]) =>
				/^p\d+$/u.test(key),
			),
		);
		const falseMass =
			(answer.probabilities.literal ?? 0) +
			(answer.probabilities.none ?? 0);
		const top = argmax(hosts);
		if (top.key && top.share > falseMass && top.share >= floor)
			links.push([Number(id.slice(3)), Number(top.key.slice(1))]);
	}
	return links;
}

type TrimCandidate = {
	readonly unit: readonly number[];
	readonly block: readonly number[];
};

const trimId = (candidate: TrimCandidate) =>
	`tr_${candidate.unit.join("_")}__${candidate.block.join("_")}`;

/** For every Locution unit of two or more blocks, one Noul per block: fixed word or free? */
function trimQuestions(
	core: CandidatesCore,
	entry: Built,
	blocks: Partition,
): { questions: Questions; candidates: TrimCandidate[] } {
	const { sentence } = core;
	const questions: Questions = {};
	const candidates: TrimCandidate[] = [];
	for (const unit of entry.partition) {
		if (unit.length < 2 || entry.familyOf(unit) !== "Locution") continue;
		const inner = blocks
			.map((block) => block.filter((id) => unit.includes(id)))
			.filter((block) => block.length > 0);
		if (inner.length < 3) continue;
		for (const block of inner) {
			const candidate = { unit, block };
			candidates.push(candidate);
			questions[trimId(candidate)] = noul(
				`In \`sentence\`, the words ${markedText(sentence, unit)} were grouped as one fixed expression. Are the words "${text(sentence, block)}" one of its fixed parts, rather than a free object, subject, adverb or complement the expression merely takes?`,
				{
					true: "The expression needs these words: Verfügung in zur Verfügung stellen, Faden in den Faden verlieren, Rücksicht in Rücksicht nehmen",
					false: "A free word the expression takes: Daten in Daten zur Verfügung stellen, Kollegen in Rücksicht auf die Kollegen nehmen, Hilfe in Hilfe in Anspruch nehmen",
				},
			);
		}
	}
	return { questions, candidates };
}

function applyTrim(
	partition: Partition,
	candidates: readonly TrimCandidate[],
	answers: Answers,
	floor: number,
): { partition: Partition; freed: readonly (readonly number[])[] } {
	const removed = new Map<string, number[][]>();
	for (const candidate of candidates) {
		const answer = answers[trimId(candidate)];
		if (answer?.type !== "noul" || answer.noul >= floor) continue;
		const key = candidate.unit.join(",");
		removed.set(key, [...(removed.get(key) ?? []), [...candidate.block]]);
	}
	return {
		partition: partition
			.flatMap((group) => {
				const blocks = removed.get(group.join(","));
				if (!blocks) return [group];
				const gone = new Set(blocks.flat());
				const kept = group.filter((id) => !gone.has(id));
				return [...(kept.length > 0 ? [kept] : []), ...blocks];
			})
			.sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0)),
		freed: [...removed.values()].flat(),
	};
}

// ------------------------------------------------------------- the arm

type Built = {
	partition: Partition;
	familyOf: (group: readonly number[]) => Family;
	merged?: Set<string>;
};

export const candidates4Arm: Arm = {
	id: "candidates4",
	summary:
		"candidates v3 unchanged plus round-2 levers: step-0 rules, span Choice, polished Saying/fixedness questions, alternatives Choice, closed-class identity",
	async run(input, context) {
		const v3Context: ArmContext = { ...context, options: { ...v3Options } };
		const core = await candidatesCore(input, v3Context);
		const { sentence, state } = core;
		const articleOf = articleHosts(core);
		const lever = (key: string) =>
			option(context.options, key, "0") === "1";
		const v3Built = new Map(
			Object.entries(policies).map(([name, policy]) => [
				name,
				assemble(sentence, articleOf, policyInput(core, policy)),
			]),
		);
		const ask = (stage: string, questions: Questions) =>
			context.jev.ask({
				stage,
				state,
				questions,
				repetition: context.repetition,
				calls: context.calls,
			});
		// `final=1`: only the finalist's questions (step 0 and the Saying
		// Choice) in one request.
		const final = lever("final");
		const step0On = lever("step0") || final;
		const [v3Routes, zero, spans, polish] = await Promise.all([
			judgeRoutes(
				sentence,
				[...v3Built.values()].map(({ partition }) => partition),
				v3Context,
			),
			final
				? ask("final", {
						...stepZeroQuestions(core),
						...sayingQuestions(core),
					})
				: lever("step0")
					? ask("step0", stepZeroQuestions(core))
					: Promise.resolve({} as Answers),
			lever("span")
				? ask("span", spanQuestions(core))
				: Promise.resolve({} as Answers),
			lever("polish")
				? ask("polish", polishQuestions(core))
				: Promise.resolve({} as Answers),
		]);
		const sayingAnswers = final ? zero : polish;
		const polishedFixed = new Map(
			sentence.pieces.map((piece) => {
				const answer = polish[polishedFixedId(piece.id)];
				return [piece.id, answer?.type === "noul" ? answer.noul : 0];
			}),
		);
		const polishPairs = lever("polish")
			? await ask(
					"polish-pairs",
					polishPairQuestions(core, polishedFixed),
				)
			: ({} as Answers);

		// Assembly inputs, from v3's full@0.7.
		const base = policyInput(
			core,
			policies["full@0.7"] ?? {
				satellite: 0.5,
				idiom: 0.7,
				expression: 0.7,
				saying: 0.7,
				absorb: true,
			},
		);
		const { input: zeroInput, ranges } = stepZeroInput(
			core,
			base,
			zero,
			0.7,
		);
		const built = new Map<string, Built>();
		const v3 = v3Built.get("full@0.7");
		if (v3) built.set("v3", v3);
		if (step0On)
			built.set("step0", assemble(sentence, articleOf, zeroInput));
		if (final)
			for (const [name, maxim, sayingFloor] of [
				["step0+saying", false, 0.5],
				["step0+saying+maxim@0.7", true, 0.7],
			] as const)
				built.set(
					name,
					assemble(sentence, articleOf, {
						...zeroInput,
						sayings: polishedSayings(
							sentence,
							sayingAnswers,
							sayingFloor,
							maxim,
						),
					}),
				);

		const start = step0On ? zeroInput : base;
		const prefix = step0On ? "step0+" : "";
		const floor = numberOption(context.options, "spanfloor", 0.5);
		if (lever("span")) {
			built.set(
				`${prefix}span@${floor}`,
				assemble(
					sentence,
					articleOf,
					withSpans(start, chosenSpans(spans, floor), false),
				),
			);
			built.set(
				`${prefix}span@${floor}-cut`,
				assemble(
					sentence,
					articleOf,
					withSpans(start, chosenSpans(spans, floor), true),
				),
			);
			built.set(
				`${prefix}span@0.7-cut`,
				assemble(
					sentence,
					articleOf,
					withSpans(start, chosenSpans(spans, 0.7), true),
				),
			);
		}
		if (lever("polish")) {
			for (const maxim of [false, true])
				built.set(
					`${prefix}polish${maxim ? "+maxim" : ""}`,
					assemble(
						sentence,
						articleOf,
						withPolish(
							core,
							start,
							polishedFixed,
							polishPairs,
							polishedSayings(sentence, polish, 0.5, maxim),
							0.5,
						),
					),
				);
		}
		if (lever("span") && lever("polish"))
			built.set(
				`${prefix}span+polish`,
				assemble(
					sentence,
					articleOf,
					withSpans(
						withPolish(
							core,
							start,
							polishedFixed,
							polishPairs,
							polishedSayings(sentence, polish, 0.5, false),
							0.5,
						),
						chosenSpans(spans, floor),
						true,
					),
				),
			);
		// Ranges are Locution/NUM: mark them for the Family.
		const rangeKeys = new Set(ranges.map((range) => groupKey(range)));

		// Alternatives over the combined policy's multi-piece units.
		if (lever("alt")) {
			const target = option(
				context.options,
				"altbase",
				`${prefix}span+polish`,
			);
			const chosen =
				built.get(target) ??
				built.get(`${prefix}span@${floor}-cut`) ??
				built.get("step0") ??
				v3;
			if (chosen) {
				const blocks = partitionOf(
					sentence.pieces.map((piece) => piece.id),
					[
						...start.satellites,
						...start.accepted.map(([a, b]) => [a, b] as const),
					],
				);
				const units = chosen.partition.filter(
					(group) => group.length > 1,
				);
				const { questions, options } = alternativeQuestions(
					sentence,
					units,
					chosen.partition,
					blocks,
				);
				const answers = await ask("alternatives", questions);
				for (const altFloor of [0.5, 0.7]) {
					const applied = applyAlternatives(
						chosen.partition,
						answers,
						options,
						altFloor,
					);
					built.set(`${target}+alt@${altFloor}`, {
						partition: applied.partition,
						familyOf: (group) => {
							if (group.length === 1) return "Lexeme";
							const inside = chosen.partition.filter(
								(old) =>
									old.every((id) => group.includes(id)) &&
									old.length > 1,
							);
							return (
								inside
									.map((old) => chosen.familyOf(old))
									.find((family) => family !== "Lexeme") ??
								chosen.familyOf(group)
							);
						},
					});
				}
			}
		}

		// Policies added after the first multiword400 run: their new groups
		// get their own route request, so the earlier requests stay cached.
		const later = new Map<string, Built>();
		if (lever("polish")) {
			const v3Sayings = { ...start };
			for (const [name, maxim, sayingFloor] of [
				["saying", false, 0.5],
				["saying+maxim", true, 0.5],
				["saying+maxim@0.7", true, 0.7],
			] as const)
				later.set(
					`${prefix}${name}`,
					assemble(sentence, articleOf, {
						...v3Sayings,
						sayings: polishedSayings(
							sentence,
							polish,
							sayingFloor,
							maxim,
						),
					}),
				);
			if (lever("span"))
				later.set(
					`${prefix}saying+span@0.7-cut`,
					assemble(
						sentence,
						articleOf,
						withSpans(
							{
								...start,
								sayings: polishedSayings(
									sentence,
									polish,
									0.5,
									false,
								),
							},
							chosenSpans(spans, 0.7),
							true,
						),
					),
				);
		}
		if (lever("slots")) {
			const slotAnswers = await ask("slots", slotQuestions(core));
			const links = slotLinks5(core, slotAnswers);
			const slotArticles = new Map(
				links
					.filter((link) => link.kind === "article")
					.map((link) => [link.to, link.from]),
			);
			later.set(
				`${prefix}slots`,
				assemble(
					sentence,
					slotArticles,
					withSlots(core, start, links, ranges),
				),
			);
			if (lever("polish"))
				later.set(
					`${prefix}saying+slots`,
					assemble(
						sentence,
						slotArticles,
						withSlots(
							core,
							{
								...start,
								sayings: polishedSayings(
									sentence,
									polish,
									0.5,
									false,
								),
							},
							links,
							ranges,
						),
					),
				);
		}

		// Routes: v3's request answered v3's groups; new groups and changed
		// singleton questions go in their own request.
		const v3Groups = new Set(
			[...v3Built.values()].flatMap(({ partition }) =>
				partition.map(groupKey),
			),
		);
		const fresh = new Map<string, readonly number[]>();
		for (const { partition } of built.values())
			for (const group of partition)
				if (!v3Groups.has(groupKey(group)))
					fresh.set(groupKey(group), group);
		const extraRoutes: Questions = {};
		const abbreviations = step0On
			? sentence.pieces.filter((piece) => isAbbreviationPiece(piece))
			: [];
		for (const piece of abbreviations)
			extraRoutes[`ra_${piece.id}`] = choice(
				`In \`sentence\`, the word ${core.ref(piece)} is a unit on its own. Which route does it take? An abbreviation takes the route of what it stands for (z.B. = zum Beispiel, a Locution ADV).`,
				routeCriteria(allRoutes, true),
			);
		const freshGroups = [...fresh.values()];
		const route2 = await ask("route2", {
			...routeQuestions(sentence, freshGroups, core.ref, v3Context),
			...extraRoutes,
		});
		const freshRoutes = readRoutes(sentence, freshGroups, route2);
		const known = new Set([...v3Groups, ...fresh.keys()]);
		const laterGroups = new Map<string, readonly number[]>();
		for (const { partition } of later.values())
			for (const group of partition)
				if (!known.has(groupKey(group)))
					laterGroups.set(groupKey(group), group);
		const route3 = await ask(
			"route3",
			routeQuestions(
				sentence,
				[...laterGroups.values()],
				core.ref,
				v3Context,
			),
		);
		const laterRoutes = readRoutes(
			sentence,
			[...laterGroups.values()],
			route3,
		);
		for (const [name, entry] of later) built.set(name, entry);
		// Third generation: support-verb Choice per noun and trimming of free
		// blocks from expression units; routed in their own request.
		const third = new Map<string, Built>();
		const base3 = later.get(`${prefix}saying+maxim@0.7`);
		const input3: AssemblyInput = {
			...start,
			sayings: polishedSayings(sentence, polish, 0.7, true),
		};
		if (base3 && (lever("fvg") || lever("trim"))) {
			let fvgInput = input3;
			if (lever("fvg")) {
				const fvg = await ask("fvg", supportVerbQuestions(core));
				const links = supportVerbLinks(fvg, 0.6);
				fvgInput = {
					...input3,
					expression: [...input3.expression, ...links],
				};
				third.set(
					`${prefix}saying+maxim@0.7+fvg`,
					assemble(sentence, articleOf, fvgInput),
				);
			}
			if (lever("trim")) {
				const blocks = partitionOf(
					sentence.pieces.map((piece) => piece.id),
					[
						...start.satellites,
						...start.accepted.map(([a, b]) => [a, b] as const),
					],
				);
				for (const [name, entry] of [
					[`${prefix}saying+maxim@0.7`, base3],
					...(third.has(`${prefix}saying+maxim@0.7+fvg`)
						? [
								[
									`${prefix}saying+maxim@0.7+fvg`,
									third.get(
										`${prefix}saying+maxim@0.7+fvg`,
									) as Built,
								] as const,
							]
						: []),
				] as const) {
					const { questions, candidates } = trimQuestions(
						core,
						entry,
						blocks,
					);
					const answers = await ask(
						`trim-${name.includes("fvg") ? "fvg" : "base"}`,
						questions,
					);
					const trimmed = applyTrim(
						entry.partition,
						candidates,
						answers,
						0.4,
					);
					const freed = new Set(trimmed.freed.map(groupKey));
					third.set(`${name}+trim`, {
						partition: trimmed.partition,
						familyOf: (group) =>
							group.length === 1 || freed.has(groupKey(group))
								? "Lexeme"
								: entry.familyOf(group),
					});
				}
			}
			const known3 = new Set([...known, ...laterGroups.keys()]);
			const thirdGroups = new Map<string, readonly number[]>();
			for (const { partition } of third.values())
				for (const group of partition)
					if (!known3.has(groupKey(group)))
						thirdGroups.set(groupKey(group), group);
			const route4 = await ask(
				"route4",
				routeQuestions(
					sentence,
					[...thirdGroups.values()],
					core.ref,
					v3Context,
				),
			);
			const thirdRoutes = readRoutes(
				sentence,
				[...thirdGroups.values()],
				route4,
			);
			for (const [key, value] of thirdRoutes.identity)
				laterRoutes.identity.set(key, value);
			for (const [key, value] of thirdRoutes.distributions)
				laterRoutes.distributions.set(key, value);
			for (const [name, entry] of third) built.set(name, entry);
		}
		const closedQuestions: Questions = {};
		if (lever("closed"))
			for (const piece of sentence.pieces) {
				const question = closedClassQuestion(piece);
				if (question)
					closedQuestions[`cc_${piece.id}`] = choice(
						question.instructions(core.ref(piece)),
						question.criteria,
					);
			}
		const closedAnswers = await ask("closed", closedQuestions);
		const judged = new Map<string, RouteJudgment>([
			...v3Routes.identity,
			...freshRoutes.identity,
			...laterRoutes.identity,
		]);
		const distributions = new Map([
			...v3Routes.distributions,
			...freshRoutes.distributions,
			...laterRoutes.distributions,
		]);
		const jevRoute = (group: readonly number[]): RouteKey => {
			const [only] = group;
			if (group.length === 1 && only !== undefined) {
				const abbreviation = route2[`ra_${only}`];
				if (abbreviation?.type === "choice") return abbreviation.choice;
			}
			return judged.get(groupKey(group))?.choice ?? "Unresolved";
		};
		const closedRoute = (
			group: readonly number[],
		): RouteKey | undefined => {
			const [only] = group;
			if (group.length !== 1 || only === undefined) return undefined;
			const piece = sentence.pieces[only - 1];
			if (!piece) return undefined;
			if (hasFixedRoute(piece)) return closedClassRoute(piece, undefined);
			const answer = closedAnswers[`cc_${only}`];
			return answer?.type === "choice"
				? closedClassRoute(piece, answer.choice)
				: undefined;
		};

		const outputs: Record<string, ReturnType<typeof outputOf>> = {};
		for (const [policy, entry] of built) {
			const isStepZero = policy !== "v3";
			const familyOf = (group: readonly number[]): Family =>
				isStepZero && rangeKeys.has(groupKey(group))
					? "Locution"
					: entry.familyOf(group);
			let route = structuralRoute(
				distributions,
				isStepZero
					? jevRoute
					: (group) =>
							judged.get(groupKey(group))?.choice ?? "Unresolved",
				familyOf,
			);
			let partition = entry.partition;
			if (isStepZero && step0On) {
				const merged = mergeInterjections(sentence, partition, route);
				partition = merged.partition;
				const inner = route;
				route = (group) =>
					merged.merged.has(groupKey(group))
						? "Locution/INTJ"
						: inner(group);
			}
			outputs[policy] = outputOf(sentence, partition, route);
			if (lever("closed") && isStepZero) {
				const inner = route;
				outputs[`${policy}+closed`] = outputOf(
					sentence,
					partition,
					(group) => closedRoute(group) ?? inner(group),
				);
			}
		}
		const primary = option(
			context.options,
			"primary",
			[...built.keys()].pop() ?? "v3",
		);
		return {
			primary,
			outputs,
			routes: [...judged.values()],
			links: [] as LinkJudgment[],
		};
	},
};
