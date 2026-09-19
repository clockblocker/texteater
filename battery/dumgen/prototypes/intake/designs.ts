/**
 * The three independent axes an intake design is made of.
 *
 * Axis A (grouping) decides which occurrences form one clickable thing.
 * Axis B (routing) decides its Family/Kind. Axis C (depth) decides whether a
 * second, smaller level is produced beneath the top one. They are separate so
 * a run measures one decision at a time and the winners can be recombined.
 *
 * Every axis produces questions over the same sentence state, so a whole
 * design is one jev round trip per sentence (chunked only when the question
 * count would exceed the request budget).
 */
import { choice, noul, type Questions } from "promptsmith/typesafe";
import { targetCriteria } from "../../src/concrete-lang/de/target-classification/judgments.js";
import { indexedContext } from "../../src/universal/validation.js";
import type { Sentence, Unit } from "./corpus.js";
import {
	extendedRoutes,
	hierarchicalQuestions,
	lexemeKinds,
	morphemeKinds,
	phrasemeKinds,
	productionRoutes,
	resolveHierarchical,
} from "./inventory.js";

type Answers = Record<string, unknown>;
type ChoiceAnswer = {
	type: "choice";
	choice: string;
	confidence: number;
	probabilities: Record<string, number>;
};
type NoulAnswer = { type: "noul"; noul: number };

function asChoice(answers: Answers, id: string): ChoiceAnswer | null {
	const answer = answers[id] as ChoiceAnswer | undefined;
	return answer?.type === "choice" ? answer : null;
}
function asNoul(answers: Answers, id: string): number | null {
	const answer = answers[id] as NoulAnswer | undefined;
	return answer?.type === "noul" ? answer.noul : null;
}

const sentencePreamble =
	"In `sentence`, <sN> tags identify selectable occurrences by original segment index N. Untagged text supplies context only. Every occurrence belongs to exactly one complete fixed unit; most units have exactly one member. ";

export function sentenceState(sentence: Sentence, preamble = sentencePreamble) {
	return {
		sentence: indexedContext({
			id: sentence.id,
			language: "de",
			segments: sentence.segments,
		} as never),
		criteria: preamble + targetCriteria,
	};
}

function label(sentence: Sentence, index: number): string {
	return `<s${index}> "${sentence.segments[index]?.text ?? ""}"`;
}

// ---------------------------------------------------------------- Axis A

/** Members per occurrence, or a miss. */
export type Groups = Map<number, number[] | "Unresolved">;

export type Grouping = {
	readonly id: string;
	readonly summary: string;
	questions(sentence: Sentence): Questions;
	solve(sentence: Sentence, answers: Answers, threshold: number): Groups;
	/** Whether a threshold sweep over returned probabilities is meaningful. */
	readonly thresholded: boolean;
};

/** Equivalence classes from an anchor function with a cycle guard. */
function classesFromAnchors(
	resolvable: readonly number[],
	anchor: Map<number, number | "Unresolved">,
): Groups {
	const root = (start: number): number | "Unresolved" => {
		const seen = new Set<number>();
		let current: number | "Unresolved" = start;
		while (current !== "Unresolved" && anchor.get(current) !== current) {
			if (seen.has(current)) return "Unresolved";
			seen.add(current);
			current = anchor.get(current) ?? "Unresolved";
		}
		return current;
	};
	const roots = new Map<number, number | "Unresolved">();
	for (const index of resolvable) roots.set(index, root(index));
	const groups: Groups = new Map();
	for (const index of resolvable) {
		const own = roots.get(index);
		if (own === "Unresolved" || own === undefined) {
			groups.set(index, "Unresolved");
			continue;
		}
		groups.set(
			index,
			resolvable.filter((other) => roots.get(other) === own),
		);
	}
	return groups;
}

/** Connected components over a symmetric score matrix at `threshold`. */
function componentsFromScores(
	resolvable: readonly number[],
	score: (a: number, b: number) => number | null,
	threshold: number,
): Groups {
	const parent = new Map<number, number>(
		resolvable.map((index) => [index, index]),
	);
	const find = (index: number): number => {
		let current = index;
		while (parent.get(current) !== current) current = parent.get(current)!;
		return current;
	};
	const unresolvable = new Set<number>();
	for (const [position, a] of resolvable.entries())
		for (const b of resolvable.slice(position + 1)) {
			const value = score(a, b);
			if (value === null) {
				unresolvable.add(a);
				unresolvable.add(b);
				continue;
			}
			if (value >= threshold) parent.set(find(a), find(b));
		}
	const groups: Groups = new Map();
	for (const index of resolvable) {
		if (unresolvable.has(index)) {
			groups.set(index, "Unresolved");
			continue;
		}
		const own = find(index);
		groups.set(
			index,
			resolvable.filter((other) => find(other) === own),
		);
	}
	return groups;
}

/** A1: P2's leftmost-member link, kept as the reproducible baseline. */
const link: Grouping = {
	id: "link",
	summary:
		"per occurrence, which occurrence is the leftmost member of its unit",
	thresholded: false,
	questions(sentence) {
		const questions: Questions = {};
		for (const index of sentence.resolvable) {
			const earlier = sentence.resolvable.filter(
				(other) => other < index,
			);
			questions[`first_${index}`] = choice(
				`Under \`criteria\`, which occurrence in \`sentence\` is the leftmost fixed member of the complete fixed unit that contains occurrence <s${index}>? Choose Self when <s${index}> is itself the leftmost member, including when it is the only member.`,
				{
					Self: `<s${index}> is the leftmost member of its own unit`,
					...Object.fromEntries(
						earlier.map((other) => [
							`s${other}`,
							`${label(sentence, other)} is the leftmost fixed member of the same unit as <s${index}>`,
						]),
					),
					Unresolved: "Membership cannot be defensibly decided",
				},
			);
		}
		return questions;
	},
	solve(sentence, answers) {
		const anchor = new Map<number, number | "Unresolved">();
		for (const index of sentence.resolvable) {
			const answer = asChoice(answers, `first_${index}`);
			anchor.set(
				index,
				!answer || answer.choice === "Unresolved"
					? "Unresolved"
					: answer.choice === "Self"
						? index
						: Number(answer.choice.slice(1)),
			);
		}
		return classesFromAnchors(sentence.resolvable, anchor);
	},
};

/**
 * A2: the head of the unit instead of its leftmost member. A head is the word
 * a learner would name the unit by (the noun, the lexical verb, the idiom's
 * verb), so the anchor is a semantic judgment rather than a positional one,
 * and discontinuous units need no special case.
 */
const head: Grouping = {
	id: "head",
	summary: "per occurrence, which occurrence heads its unit",
	thresholded: false,
	questions(sentence) {
		const questions: Questions = {};
		for (const index of sentence.resolvable) {
			const others = sentence.resolvable.filter(
				(other) => other !== index,
			);
			questions[`head_${index}`] = choice(
				`Under \`criteria\`, which occurrence in \`sentence\` is the head of the complete fixed unit that contains occurrence <s${index}>? The head is the member that names the unit: the noun of a noun phrase target, the lexical verb of a verbal target, the verb of an idiom. Choose Self when <s${index}> is that head, including when its unit has only one member.`,
				{
					Self: `<s${index}> heads its own unit`,
					...Object.fromEntries(
						others.map((other) => [
							`s${other}`,
							`${label(sentence, other)} heads the unit that also contains <s${index}>`,
						]),
					),
					Unresolved: "Membership cannot be defensibly decided",
				},
			);
		}
		return questions;
	},
	solve(sentence, answers) {
		const anchor = new Map<number, number | "Unresolved">();
		for (const index of sentence.resolvable) {
			const answer = asChoice(answers, `head_${index}`);
			anchor.set(
				index,
				!answer || answer.choice === "Unresolved"
					? "Unresolved"
					: answer.choice === "Self"
						? index
						: Number(answer.choice.slice(1)),
			);
		}
		return classesFromAnchors(sentence.resolvable, anchor);
	},
};

/**
 * A3: one Noul per unordered pair. The grouping stops being a chain of
 * dependent picks and becomes a symmetric score matrix code can cluster, and
 * the decision threshold can be swept after the run without new calls.
 */
const pairwise: Grouping = {
	id: "pairwise",
	summary: "one same-unit Noul per occurrence pair, clustered in code",
	thresholded: true,
	questions(sentence) {
		const questions: Questions = {};
		for (const [position, a] of sentence.resolvable.entries())
			for (const b of sentence.resolvable.slice(position + 1))
				questions[`same_${a}_${b}`] = noul(
					`Under \`criteria\`, do occurrences ${label(sentence, a)} and ${label(sentence, b)} in \`sentence\` belong to the same one complete fixed unit?`,
					{
						true: "Both are fixed members of the same complete unit",
						false: "They belong to different units, or one is free contextual material",
					},
				);
		return questions;
	},
	solve(sentence, answers, threshold) {
		return componentsFromScores(
			sentence.resolvable,
			(a, b) =>
				asNoul(answers, `same_${Math.min(a, b)}_${Math.max(a, b)}`),
			threshold,
		);
	},
};

/**
 * A4: production's own membership Choice, asked from every anchor instead of
 * only the clicked one, then symmetrized. This separates "the question is
 * wrong" from "one-sided aggregation is wrong" - the stray-article failures
 * in P4 had Include probabilities of 0.75-0.86 from the noun's side only.
 */
const anchored: Grouping = {
	id: "anchored",
	summary: "production's membership Choice from every anchor, symmetrized",
	thresholded: true,
	questions(sentence) {
		const questions: Questions = {};
		for (const anchor of sentence.resolvable)
			for (const other of sentence.resolvable) {
				if (other === anchor) continue;
				questions[`m_${anchor}_${other}`] = choice(
					`Under \`criteria\`, does occurrence <s${other}> in \`sentence\` belong to the same complete fixed unit as occurrence <s${anchor}>?`,
					{
						Include: "It is a fixed member of that same unit",
						Exclude:
							"It belongs to another unit or is free contextual material",
						Unresolved:
							"Its membership cannot be defensibly decided",
					},
				);
			}
		return questions;
	},
	solve(sentence, answers, threshold) {
		const include = (from: number, to: number): number | null => {
			const answer = asChoice(answers, `m_${from}_${to}`);
			if (!answer) return null;
			return answer.probabilities.Include ?? 0;
		};
		return componentsFromScores(
			sentence.resolvable,
			(a, b) => {
				const forward = include(a, b);
				const backward = include(b, a);
				if (forward === null || backward === null) return null;
				return (forward + backward) / 2;
			},
			threshold,
		);
	},
};

export const groupings: Record<string, Grouping> = {
	link,
	head,
	pairwise,
	anchored,
};

// ---------------------------------------------------------------- Axis B

export type Routing = {
	readonly id: string;
	readonly summary: string;
	/** Every Family/Kind this axis can emit, for the reachability report. */
	readonly offers: readonly string[];
	questions(sentence: Sentence): Questions;
	route(sentence: Sentence, answers: Answers, index: number): string;
	/** Route probability mass per occurrence, for group-level route policies. */
	distribution(
		sentence: Sentence,
		answers: Answers,
		index: number,
	): Record<string, number> | null;
};

function flatRouting(id: string, inventory: Record<string, string>): Routing {
	return {
		id,
		summary: `one flat Choice over ${Object.keys(inventory).length - 1} routes`,
		offers: Object.keys(inventory).filter(
			(route) => route !== "Unresolved",
		),
		questions(sentence) {
			const questions: Questions = {};
			for (const index of sentence.resolvable)
				questions[`route_${index}`] = choice(
					`Under \`criteria\`, what is the Family/Kind of the complete fixed unit that contains occurrence <s${index}> in \`sentence\`? Classify the whole unit, not the standalone part of speech of this word alone.`,
					inventory,
				);
			return questions;
		},
		route(_sentence, answers, index) {
			return asChoice(answers, `route_${index}`)?.choice ?? "Unresolved";
		},
		distribution(_sentence, answers, index) {
			return asChoice(answers, `route_${index}`)?.probabilities ?? null;
		},
	};
}

const hierarchical: Routing = {
	id: "hier",
	summary: "Family Choice plus a speculative Kind Choice per Family",
	offers: [
		...Object.keys(lexemeKinds).map((kind) => `Lexeme/${kind}`),
		...Object.keys(phrasemeKinds).map((kind) => `Phraseme/${kind}`),
		"Construction/Fusion",
	],
	questions(sentence) {
		const questions: Questions = {};
		for (const index of sentence.resolvable)
			for (const [key, question] of Object.entries(
				hierarchicalQuestions(`occurrence <s${index}>`),
			))
				questions[`h_${index}_${key}`] = question;
		return questions;
	},
	route(_sentence, answers, index) {
		return resolveHierarchical(answers, `h_${index}_`).route;
	},
	/** Family mass times that Family's Kind mass, flattened to Family/Kind. */
	distribution(_sentence, answers, index) {
		const family = asChoice(answers, `h_${index}_family`);
		if (!family) return null;
		const spread: Record<string, number> = {};
		for (const [name, mass] of Object.entries(family.probabilities)) {
			if (name === "Unresolved") {
				spread.Unresolved = (spread.Unresolved ?? 0) + mass;
				continue;
			}
			if (name === "Construction") {
				spread["Construction/Fusion"] =
					(spread["Construction/Fusion"] ?? 0) + mass;
				continue;
			}
			const kind = asChoice(
				answers,
				`h_${index}_${name === "Lexeme" ? "lexemeKind" : "phrasemeKind"}`,
			);
			if (!kind) continue;
			for (const [label, share] of Object.entries(kind.probabilities))
				if (label === "Unresolved")
					spread.Unresolved = (spread.Unresolved ?? 0) + mass * share;
				else
					spread[`${name}/${label}`] =
						(spread[`${name}/${label}`] ?? 0) + mass * share;
		}
		return spread;
	},
};

export const routings: Record<string, Routing> = {
	flat: flatRouting("flat", productionRoutes),
	extended: flatRouting("extended", extendedRoutes),
	hier: hierarchical,
};

// ---------------------------------------------------------------- Axis C

/**
 * The lattice layer: below the top unit, the smaller independently resolvable
 * unit an occurrence heads, and below the word, its Morpheme decomposition.
 * Neither level has gold cases, so these are reported as coverage and as
 * `inLattice` recall against the existing gold, never as pass/fail.
 */
export function latticeQuestions(sentence: Sentence): Questions {
	const questions: Questions = {};
	for (const index of sentence.resolvable) {
		questions[`sub_${index}`] = noul(
			`Inside the complete fixed unit containing ${label(sentence, index)} in \`sentence\`, is that occurrence alone also a smaller unit a learner could resolve on its own - a dictionary word with its own entry, separate from the larger unit?`,
			{
				true: "It has its own independent dictionary identity as well",
				false: "It only exists as part of the larger unit, or the larger unit is already this single occurrence",
			},
		);
		questions[`subRoute_${index}`] = choice(
			`If ${label(sentence, index)} alone is an independently resolvable unit, what is its own Family/Kind, ignoring the larger unit around it?`,
			extendedRoutes,
		);
		questions[`morph_${index}`] = noul(
			`Does the word at ${label(sentence, index)} decompose into parts that are themselves Dumling Morphemes with their own dictionary identity - a separable or inseparable prefix, a derivational suffix, a compound interfix - rather than being morphologically simple or merely inflected?`,
			{
				true: "It has at least one bound morpheme beyond inflection",
				false: "Morphologically simple, or only inflectional endings",
			},
		);
		questions[`morphKind_${index}`] = choice(
			`If the word at ${label(sentence, index)} has a bound morpheme beyond inflection, which Kind is the most prominent one?`,
			{ ...morphemeKinds, Unresolved: "No defensible Morpheme Kind" },
		);
	}
	return questions;
}

export function solveLattice(
	sentence: Sentence,
	answers: Answers,
	units: ReadonlyMap<number, Unit>,
	threshold = 0.5,
): { sub: Map<number, Unit>; morphemes: Map<number, string> } {
	const sub = new Map<number, Unit>();
	const morphemes = new Map<number, string>();
	for (const index of sentence.resolvable) {
		const top = units.get(index);
		const isSingleton =
			top &&
			!("decision" in top) &&
			top.memberSegmentIndices.length === 1;
		const wants = (asNoul(answers, `sub_${index}`) ?? 0) >= threshold;
		const route = asChoice(answers, `subRoute_${index}`)?.choice;
		if (wants && !isSingleton && route && route !== "Unresolved") {
			const [family, kind] = route.split("/") as [string, string];
			sub.set(index, { family, kind, memberSegmentIndices: [index] });
		}
		if ((asNoul(answers, `morph_${index}`) ?? 0) >= threshold) {
			const kind = asChoice(answers, `morphKind_${index}`)?.choice;
			if (kind && kind !== "Unresolved") morphemes.set(index, kind);
		}
	}
	return { sub, morphemes };
}

// ---------------------------------------------------------------- assembly

export const articleForms: ReadonlySet<string> = new Set([
	"der",
	"die",
	"das",
	"den",
	"dem",
	"des",
	"ein",
	"eine",
	"einen",
	"einem",
	"einer",
	"eines",
]);

/**
 * How a group's Family/Kind is chosen once the group is known.
 *
 * `perOccurrence` keeps the answer asked about the clicked word, which is what
 * every click-time design does and what lets two members of one group disagree
 * about their own unit. `groupVote` adds the route mass of every member and
 * takes the argmax, so one group has one route by construction; `groupHead`
 * trusts the leftmost member. These re-score from stored answers, so the
 * comparison costs no calls.
 */
export type RoutePolicy = "perOccurrence" | "groupVote" | "groupHead";

function groupRoute(
	sentence: Sentence,
	routing: Routing,
	answers: Answers,
	members: readonly number[],
	policy: RoutePolicy,
	index: number,
): string {
	if (policy === "groupHead")
		return routing.route(sentence, answers, members[0] ?? index);
	if (policy === "perOccurrence" || members.length === 1)
		return routing.route(sentence, answers, index);
	const totals: Record<string, number> = {};
	for (const member of members) {
		const spread = routing.distribution(sentence, answers, member);
		if (!spread) return routing.route(sentence, answers, index);
		for (const [label, mass] of Object.entries(spread))
			totals[label] = (totals[label] ?? 0) + mass;
	}
	const best = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
	return best ? best[0] : "Unresolved";
}

/**
 * The production noun-article guard, applied per unit instead of per click:
 * a NOUN unit keeps at most the one article opening its phrase.
 */
export function assemble(
	sentence: Sentence,
	groups: Groups,
	routing: Routing,
	answers: Answers,
	policy: RoutePolicy,
	guardArticles: boolean,
): Map<number, Unit> {
	const units = new Map<number, Unit>();
	for (const index of sentence.resolvable) {
		const members = groups.get(index);
		if (members === "Unresolved" || !members) {
			units.set(index, { decision: "Unresolved", reason: "membership" });
			continue;
		}
		const route = groupRoute(
			sentence,
			routing,
			answers,
			[...members].sort((a, b) => a - b),
			policy,
			index,
		);
		if (route === "Unresolved") {
			units.set(index, { decision: "Unresolved", reason: "route" });
			continue;
		}
		const [family, kind] = route.split("/") as [string, string];
		const ordered = [...members].sort((a, b) => a - b);
		if (guardArticles && kind === "NOUN") {
			const articles = ordered.filter((member) =>
				articleForms.has(
					sentence.segments[member]?.text.toLowerCase() ?? "",
				),
			);
			if (
				articles.length > 1 ||
				(articles.length === 1 && articles[0] !== ordered[0])
			) {
				units.set(index, {
					decision: "Unresolved",
					reason: "nounArticle",
				});
				continue;
			}
		}
		units.set(index, { family, kind, memberSegmentIndices: ordered });
	}
	return units;
}
