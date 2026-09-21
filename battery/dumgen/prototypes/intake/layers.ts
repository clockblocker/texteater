/**
 * Two layers instead of one flat partition.
 *
 * The Lexeme layer is the anchored membership matrix, the Lexeme-only route
 * inventory and the role Choice, asked under the realization rules alone
 * (`shapes.ts`, `layeredShape`). The Phraseme layer is asked in the same call
 * under the fixedness rules: per occurrence a fixedness Score and a Phraseme
 * Kind Choice, per unordered pair a Noul "fixed lexical members of the same
 * expression". Code projects the pair answers onto the Lexeme layer: a word
 * belongs to an expression when its head does, and it brings its article,
 * auxiliary or particle along. The scorer then sees the expression as the
 * top-level unit and the word beneath it as `sub`.
 */
import { choice, noul, type Questions, score } from "promptsmith/typesafe";
import type { Sentence, Unit } from "./corpus.js";
import { isResolved } from "./corpus.js";
import { phrasemeKinds } from "./inventory.js";
import type { Role } from "./roles.js";
import { roles } from "./roles.js";

type Answers = Record<string, unknown>;
type ChoiceAnswer = {
	type: "choice";
	choice: string;
	probabilities: Record<string, number>;
};
type ScoreAnswer = { type: "score"; score: number };
type NoulAnswer = { type: "noul"; noul: number };

function label(sentence: Sentence, index: number): string {
	return `<s${index}> "${sentence.segments[index]?.text ?? ""}"`;
}

/** The fixedness Score levels, in order; the index is the score. */
export const fixednessLevels = [
	"Free combination: this word can be replaced by any synonym without breaking anything",
	"Preferred combination: conventional wording with no expression of its own",
	"Collocation: the lexical choice is restricted but the meaning stays compositional (Funktionsverbgefüge)",
	"Fixed expression: an established noncompositional idiom, discourse formula, proverb or aphorism in this contextual meaning",
] as const;

export const phrasemeKindOptions = {
	...phrasemeKinds,
	None: "This word is not a fixed lexical member of any established expression here",
	Unresolved: "Whether it is a member cannot be defensibly decided",
};

/**
 * The one-Head invariant, enforced in code: a word has exactly one Head. When
 * the membership matrix glues two Heads into one group (a Funktionsverbgefüge
 * such as `stellt ... zur Verfügung`, where the verb and the noun each answer
 * Head), the group is split at its Heads. A non-head member follows the Head
 * it scored the higher symmetrized Include with; a verbal role (auxiliary,
 * particle, reflexive, expletive, governed preposition) that lands on a
 * non-VERB Head, or an Article on a non-NOUN Head, becomes a singleton. The
 * split words keep their own route vote.
 */
export function splitMultiHead(
	sentence: Sentence,
	units: ReadonlyMap<number, Unit>,
	roleOf: ReadonlyMap<number, Role>,
	answers: Answers,
	routeOf: (members: readonly number[]) => Unit,
): Map<number, Unit> {
	const include = (a: number, b: number): number => {
		const forward = answers[`m_${a}_${b}`] as ChoiceAnswer | undefined;
		const backward = answers[`m_${b}_${a}`] as ChoiceAnswer | undefined;
		return (
			((forward?.probabilities.Include ?? 0) +
				(backward?.probabilities.Include ?? 0)) /
			2
		);
	};
	const verbal = new Set<Role>([
		"Auxiliary",
		"SeparableParticle",
		"Reflexive",
		"Expletive",
		"GovernedPreposition",
	]);
	const result = new Map<number, Unit>(units);
	const seen = new Set<string>();
	for (const index of sentence.resolvable) {
		const unit = units.get(index);
		if (!isResolved(unit)) continue;
		const key = unit.memberSegmentIndices.join(",");
		if (seen.has(key)) continue;
		seen.add(key);
		const heads = unit.memberSegmentIndices.filter(
			(member) => roleOf.get(member) === "Head",
		);
		if (heads.length < 2) continue;
		const groups = new Map<number, number[]>(
			heads.map((head) => [head, [head]]),
		);
		const singletons: number[] = [];
		for (const member of unit.memberSegmentIndices) {
			if (roleOf.get(member) === "Head") continue;
			const best = [...heads].sort(
				(a, b) => include(member, b) - include(member, a),
			)[0]!;
			const role = roleOf.get(member) ?? "Unresolved";
			const headRoute = routeOf([best]);
			const headKind = isResolved(headRoute) ? headRoute.kind : "";
			if (
				(verbal.has(role) && headKind !== "VERB") ||
				(role === "Article" && headKind !== "NOUN")
			)
				singletons.push(member);
			else groups.get(best)!.push(member);
		}
		for (const members of [
			...groups.values(),
			...singletons.map((member) => [member]),
		]) {
			const ordered = [...members].sort((a, b) => a - b);
			const word = routeOf(ordered);
			for (const member of ordered) result.set(member, word);
		}
	}
	return result;
}

/** The Lexeme layer's role Choice, worded for the realization rules. */
export function lexemeRoleQuestions(sentence: Sentence): Questions {
	const questions: Questions = {};
	for (const index of sentence.resolvable)
		questions[`role_${index}`] = choice(
			`Under \`criteria\`, what is the role of occurrence ${label(sentence, index)} inside the word it realizes in \`sentence\`? Choose Free when the word is this single Segment. Ignore any larger expression the word may be part of.`,
			roles,
		);
	return questions;
}

/** The Phraseme layer: fixedness, Kind and pairwise membership over words. */
export function phrasemeQuestions(sentence: Sentence): Questions {
	const questions: Questions = {};
	for (const index of sentence.resolvable) {
		questions[`fix_${index}`] = score(
			`Under \`fixedness\`, how fixed is the word realized by occurrence ${label(sentence, index)} in \`sentence\` inside the wording around it?`,
			fixednessLevels,
		);
		questions[`pk_${index}`] = choice(
			`Under \`fixedness\`, if the word realized by occurrence ${label(sentence, index)} in \`sentence\` is a fixed lexical member of an established multiword expression, which Kind is that expression?`,
			phrasemeKindOptions,
		);
	}
	for (const [position, a] of sentence.resolvable.entries())
		for (const b of sentence.resolvable.slice(position + 1))
			questions[`same_${a}_${b}`] = noul(
				`Under \`fixedness\`, are the words realized by occurrences ${label(sentence, a)} and ${label(sentence, b)} in \`sentence\` both fixed lexical members of the same one established multiword expression?`,
				{
					true: "Both words are fixed lexical members of the same expression",
					false: "At least one is free material, or they belong to different expressions",
				},
			);
	return questions;
}

export type PhrasemePolicy = "vote" | "score";

/** One expression: the words it is made of and the Segments they cover. */
export type Expression = {
	readonly kind: string;
	/** Head index of every member word, in order. */
	readonly words: readonly number[];
	readonly memberSegmentIndices: readonly number[];
	readonly kindMass: Readonly<Record<string, number>>;
	readonly fixedness: number;
};

export type Layered = {
	/** The Lexeme layer per resolvable occurrence. */
	readonly words: ReadonlyMap<number, Unit>;
	readonly roles: ReadonlyMap<number, Role>;
	readonly expressions: readonly Expression[];
};

function headOf(
	unit: Extract<Unit, { family: string }>,
	roleOf: ReadonlyMap<number, Role>,
): number {
	return (
		unit.memberSegmentIndices.find(
			(index) => roleOf.get(index) === "Head",
		) ?? unit.memberSegmentIndices[0]!
	);
}

/**
 * Project the pair answers onto the Lexeme layer. Components are built over
 * head Segments only, so a pair answer about an article or auxiliary never
 * moves a word; the word follows its head.
 */
export function solveExpressions(
	sentence: Sentence,
	answers: Answers,
	words: ReadonlyMap<number, Unit>,
	roleOf: ReadonlyMap<number, Role>,
	tau: number,
	policy: PhrasemePolicy,
): Expression[] {
	const heads: number[] = [];
	const seen = new Set<string>();
	for (const index of sentence.resolvable) {
		const unit = words.get(index);
		if (!isResolved(unit)) continue;
		const key = unit.memberSegmentIndices.join(",");
		if (seen.has(key)) continue;
		seen.add(key);
		heads.push(headOf(unit, roleOf));
	}
	const same = (a: number, b: number): number => {
		const answer = answers[`same_${Math.min(a, b)}_${Math.max(a, b)}`] as
			| NoulAnswer
			| undefined;
		return answer?.type === "noul" ? answer.noul : 0;
	};
	const parent = new Map<number, number>(heads.map((head) => [head, head]));
	const find = (index: number): number => {
		let current = index;
		while (parent.get(current) !== current) current = parent.get(current)!;
		return current;
	};
	for (const [position, a] of heads.entries())
		for (const b of heads.slice(position + 1))
			if (same(a, b) >= tau) parent.set(find(a), find(b));
	const components = new Map<number, number[]>();
	for (const head of heads) {
		const root = find(head);
		components.set(root, [...(components.get(root) ?? []), head]);
	}
	const expressions: Expression[] = [];
	for (const members of components.values()) {
		if (members.length < 2) continue;
		const kindMass: Record<string, number> = {};
		let fixedness = 0;
		for (const head of members) {
			const kind = answers[`pk_${head}`] as ChoiceAnswer | undefined;
			if (kind?.type === "choice")
				for (const [option, share] of Object.entries(
					kind.probabilities,
				))
					kindMass[option] =
						(kindMass[option] ?? 0) + share / members.length;
			const fix = answers[`fix_${head}`] as ScoreAnswer | undefined;
			fixedness +=
				(fix?.type === "score" ? fix.score : 0) / members.length;
		}
		const ranked = Object.entries(kindMass).sort((a, b) => b[1] - a[1]);
		let kind: string | null = null;
		if (policy === "vote") {
			const best = ranked[0]?.[0];
			kind =
				best && best !== "None" && best !== "Unresolved" ? best : null;
		} else {
			// The Score establishes the expression; the Choice only names it.
			const named = ranked.find(
				([option]) => option !== "None" && option !== "Unresolved",
			)?.[0];
			kind = fixedness >= 1.5 && named ? named : null;
		}
		if (!kind) continue;
		const segments = [
			...new Set(
				members.flatMap((head) =>
					words.get(head) && isResolved(words.get(head))
						? [
								...(
									words.get(head) as Extract<
										Unit,
										{ family: string }
									>
								).memberSegmentIndices,
							]
						: [head],
				),
			),
		].sort((a, b) => a - b);
		expressions.push({
			kind,
			words: [...members].sort((a, b) => a - b),
			memberSegmentIndices: segments,
			kindMass: Object.fromEntries(
				ranked.map(([option, share]) => [option, +share.toFixed(3)]),
			),
			fixedness: +fixedness.toFixed(2),
		});
	}
	return expressions.sort(
		(a, b) => a.memberSegmentIndices[0]! - b.memberSegmentIndices[0]!,
	);
}

/**
 * The view the shared scorer reads: the expression is the top-level unit of
 * every Segment it covers and the word beneath it is `sub`; a word outside
 * any expression is its own top-level unit.
 */
export function topLevel(
	sentence: Sentence,
	layered: Layered,
): { units: Map<number, Unit>; sub: Map<number, Unit> } {
	const units = new Map<number, Unit>();
	const sub = new Map<number, Unit>();
	for (const index of sentence.resolvable) {
		const word = layered.words.get(index) ?? { decision: "Unresolved" };
		const expression = layered.expressions.find((entry) =>
			entry.memberSegmentIndices.includes(index),
		);
		if (!expression) {
			units.set(index, word);
			continue;
		}
		units.set(index, {
			family: "Phraseme",
			kind: expression.kind,
			memberSegmentIndices: expression.memberSegmentIndices,
		});
		sub.set(index, word);
	}
	return { units, sub };
}

/** Unsupervised signal about the Phraseme layer, for the report. */
export function summarizeExpressions(
	pairs: readonly { sentence: Sentence; layered: Layered | null }[],
) {
	const kinds: Record<string, number> = {};
	let expressions = 0;
	let wordsInside = 0;
	let sizes = 0;
	const examples: string[] = [];
	for (const { sentence, layered } of pairs) {
		if (!layered) continue;
		for (const expression of layered.expressions) {
			expressions += 1;
			wordsInside += expression.words.length;
			sizes += expression.memberSegmentIndices.length;
			kinds[expression.kind] = (kinds[expression.kind] ?? 0) + 1;
			if (examples.length < 40)
				examples.push(
					`${expression.kind} ${expression.fixedness}: ${expression.memberSegmentIndices
						.map((index) => sentence.segments[index]?.text ?? "?")
						.join(" ")}`,
				);
		}
	}
	return {
		expressions,
		wordsPerExpression: +(wordsInside / (expressions || 1)).toFixed(2),
		segmentsPerExpression: +(sizes / (expressions || 1)).toFixed(2),
		kinds,
		examples,
	};
}
