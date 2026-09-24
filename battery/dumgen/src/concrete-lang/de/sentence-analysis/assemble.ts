/**
 * Pure assembly of the judge's answers into a Sentence Analysis (Dumgen ADR
 * 0006). The invariants live here, never in a question: connected components
 * of the symmetrized membership matrix at tau; one route vote per group; a
 * NOUN keeps at most the one article opening its phrase, with only
 * prenominal words between them; one Head per word (a group glued around two
 * Heads is split at them); a fused word never joins a group whole, its
 * adposition is a singleton and its article joins the noun its phrase opens
 * onto, or stands alone; a Phraseme's members are words, projected by
 * Head, only a word whose own fixedness Score reaches the floor joins one,
 * and one pair alone never ties two expressions together. Government comes
 * last, over the finished Lexeme Targets.
 */
import type { Questions, SystemOneResult } from "promptsmith/typesafe";
import type { SegmentedSentence } from "../../../types.js";
import type {
	IdentityMass,
	LexemeTarget,
	Member,
	MemberRole,
	PhrasemeTarget,
	SentenceAnalysis,
} from "./analysis.js";
import { articleForms, type RoleAnswer } from "./criteria.js";
import { assembleGovernment } from "./government.js";
import { candidateOf, candidatesFor, headwordGroups } from "./identity.js";
import type { Placement } from "./placement.js";

export type Answers = SystemOneResult<Questions>["answers"];

export type AssemblyPolicy = {
	/** Membership: symmetrized Include mass at or above this joins two occurrences. */
	readonly membershipTau: number;
	/** Phraseme membership: the pair Noul at or above this joins two words. */
	readonly phrasemeTau: number;
	/** A word's own fixedness Score at or above this lets it join an expression. */
	readonly fixednessFloor: number;
};

export const productionPolicy: AssemblyPolicy = {
	membershipTau: 0.6,
	phrasemeTau: 0.5,
	fixednessFloor: 1.5,
};

type Distribution = Readonly<Record<string, number>>;

function choiceOf(answers: Answers, id: string) {
	const answer = answers[id];
	return answer?.type === "choice" ? answer : null;
}
function noulOf(answers: Answers, id: string): number | null {
	const answer = answers[id];
	return answer?.type === "noul" ? answer.noul : null;
}
function scoreOf(answers: Answers, id: string): number | null {
	const answer = answers[id];
	return answer?.type === "score" ? answer.score : null;
}

const bare = (route: string) => route.split("/").at(-1) ?? route;

// ------------------------------------------------------------ Lexeme layer

type Word = {
	readonly members: readonly number[];
	readonly routeMass: Distribution;
	readonly unresolved: string | null;
};

function include(answers: Answers, a: number, b: number): number | null {
	const forward = choiceOf(answers, `m_${a}_${b}`);
	const backward = choiceOf(answers, `m_${b}_${a}`);
	if (!forward || !backward) return null;
	return (
		((forward.probabilities as Distribution).Include ?? 0) / 2 +
		((backward.probabilities as Distribution).Include ?? 0) / 2
	);
}

/** Connected components over the symmetrized Include mass. */
function components(
	resolvable: readonly number[],
	answers: Answers,
	tau: number,
): { groups: number[][]; unresolvable: Set<number> } {
	const parent = new Map<number, number>(resolvable.map((i) => [i, i]));
	const find = (index: number): number => {
		let current = index;
		for (;;) {
			const next = parent.get(current);
			if (next === undefined || next === current) return current;
			current = next;
		}
	};
	const unresolvable = new Set<number>();
	for (const [position, a] of resolvable.entries())
		for (const b of resolvable.slice(position + 1)) {
			const value = include(answers, a, b);
			if (value === null) {
				unresolvable.add(a);
				unresolvable.add(b);
				continue;
			}
			if (value >= tau) parent.set(find(a), find(b));
		}
	const byRoot = new Map<number, number[]>();
	for (const index of resolvable) {
		const root = find(index);
		byRoot.set(root, [...(byRoot.get(root) ?? []), index]);
	}
	return { groups: [...byRoot.values()], unresolvable };
}

/** The group's route: every member's route mass summed, per bare Kind. */
function routeMassOf(
	answers: Answers,
	members: readonly number[],
): Distribution {
	const totals: Record<string, number> = {};
	for (const member of members) {
		const answer = choiceOf(answers, `route_${member}`);
		if (!answer) continue;
		for (const [route, mass] of Object.entries(
			answer.probabilities as Distribution,
		))
			totals[bare(route)] =
				(totals[bare(route)] ?? 0) + mass / members.length;
	}
	return Object.fromEntries(
		Object.entries(totals)
			.sort((a, b) => b[1] - a[1])
			.map(([kind, mass]) => [kind, +mass.toFixed(3)]),
	);
}

function winner(mass: Distribution): string {
	let best: [string, number] = ["Unresolved", 0];
	for (const entry of Object.entries(mass))
		if (entry[1] > best[1]) best = entry;
	return best[0];
}

/** Kinds that may stand between an article and its noun (`im sehr dichten und dunklen Wald`). */
const prenominal = new Set(["ADJ", "ADV", "NUM", "CCONJ"]);

const headOffsetOf = (target: LexemeTarget) =>
	(
		target.members.find((member) => member.role === "Head") ??
		target.members[0]
	)?.offset ?? 0;

/** The first Lexeme Target after `offset` that is not prenominal: the word an article's phrase opens onto. */
function phraseHeadAfter(
	targets: readonly LexemeTarget[],
	offset: number,
): LexemeTarget | undefined {
	return targets
		.filter(
			(target) =>
				headOffsetOf(target) > offset &&
				!prenominal.has(winner(target.routeMass)),
		)
		.sort((a, b) => headOffsetOf(a) - headOffsetOf(b))[0];
}

function roleOf(answers: Answers, index: number): RoleAnswer {
	const answer = choiceOf(answers, `role_${index}`);
	return (answer?.choice as RoleAnswer | undefined) ?? "Unresolved";
}

function wordOf(
	sentence: SegmentedSentence<"de">,
	answers: Answers,
	members: readonly number[],
	unresolved: string | null,
): Word {
	const ordered = [...members].sort((a, b) => a - b);
	const routeMass = routeMassOf(answers, ordered);
	if (unresolved) return { members: ordered, routeMass, unresolved };
	const kind = winner(routeMass);
	if (kind === "Unresolved")
		return { members: ordered, routeMass, unresolved: "route" };
	if (kind === "NOUN") {
		const articles = ordered.filter((member) =>
			articleForms.has(
				sentence.segments[member]?.text.toLowerCase() ?? "",
			),
		);
		if (
			articles.length > 1 ||
			(articles.length === 1 && articles[0] !== ordered[0])
		)
			return { members: ordered, routeMass, unresolved: "nounArticle" };
	}
	return { members: ordered, routeMass, unresolved: null };
}

const verbalRoles = new Set<RoleAnswer>([
	"Auxiliary",
	"SeparableParticle",
	"Reflexive",
	"Expletive",
	"GovernedPreposition",
]);

/**
 * The one-Head invariant: a group with two Heads is split at them. A
 * non-head follows the Head it scored the higher Include with; a verbal role
 * landing on a non-VERB Head, or an Article on a non-NOUN Head, becomes a
 * singleton.
 */
function splitMultiHead(
	sentence: SegmentedSentence<"de">,
	answers: Answers,
	word: Word,
): Word[] {
	const heads = word.members.filter((m) => roleOf(answers, m) === "Head");
	if (heads.length < 2) return [word];
	const groups = new Map<number, number[]>(
		heads.map((head) => [head, [head]]),
	);
	const singletons: number[] = [];
	for (const member of word.members) {
		if (roleOf(answers, member) === "Head") continue;
		const best = [...heads].sort(
			(a, b) =>
				(include(answers, member, b) ?? 0) -
				(include(answers, member, a) ?? 0),
		)[0];
		if (best === undefined) continue;
		const role = roleOf(answers, member);
		const headKind = winner(routeMassOf(answers, [best]));
		if (
			(verbalRoles.has(role) && headKind !== "VERB") ||
			(role === "Article" && headKind !== "NOUN")
		)
			singletons.push(member);
		else groups.get(best)?.push(member);
	}
	return [...groups.values(), ...singletons.map((m) => [m])].map((members) =>
		wordOf(sentence, answers, members, null),
	);
}

function identityMassOf(
	sentence: SegmentedSentence<"de">,
	answers: Answers,
	index: number,
): IdentityMass | null {
	const candidates = candidatesFor(sentence.segments[index]?.text ?? "");
	if (!candidates.length) return null;
	const groups = headwordGroups(candidates);
	const keyed = groups.map(candidateOf);
	const mass: Record<string, number> = {};
	for (const candidate of keyed) mass[candidate.key] = 0;
	mass.NoMatch = 0;
	mass.Unresolved = 0;
	const answer = choiceOf(answers, `id_${index}`);
	if (answer)
		for (const [option, share] of Object.entries(
			answer.probabilities as Distribution,
		)) {
			if (!option.startsWith("c")) {
				mass[option] = (mass[option] ?? 0) + share;
				continue;
			}
			const member = candidates[Number(option.slice(1))];
			const position = groups.findIndex(
				(group) => member !== undefined && group.includes(member),
			);
			const key = keyed[position]?.key;
			if (key) mass[key] = (mass[key] ?? 0) + share;
		}
	return {
		candidates: keyed,
		mass: Object.fromEntries(
			Object.entries(mass).map(([key, share]) => [
				key,
				+share.toFixed(3),
			]),
		),
	};
}

// ------------------------------------------------------- Phraseme linkage

/** The words `from` reaches over `linked` pairs inside `within`, without the pair `cut`. */
function reached(
	from: number,
	within: readonly number[],
	linked: (a: number, b: number) => boolean,
	cut: readonly [number, number],
): Set<number> {
	const seen = new Set([from]);
	const stack = [from];
	for (
		let current = stack.pop();
		current !== undefined;
		current = stack.pop()
	)
		for (const next of within)
			if (
				!seen.has(next) &&
				linked(current, next) &&
				!(
					(current === cut[0] && next === cut[1]) ||
					(current === cut[1] && next === cut[0])
				)
			) {
				seen.add(next);
				stack.push(next);
			}
	return seen;
}

/**
 * Expressions over the linked pairs: connected components, then every
 * bridge with two words or more on both sides is cut. One cross pair cannot
 * chain two expressions (`auf die Idee kommen` and `sich in … verstricken`),
 * while a word hanging on its expression by one pair, like an article or a
 * preposition, stays in.
 */
function expressionsOf(
	heads: readonly number[],
	linked: (a: number, b: number) => boolean,
): number[][] {
	const expressions: number[][] = [];
	const unvisited = new Set(heads);
	const queue: number[][] = [];
	for (const head of heads) {
		if (!unvisited.has(head)) continue;
		const component = [...reached(head, heads, linked, [-1, -1])];
		for (const member of component) unvisited.delete(member);
		queue.push(component);
	}
	for (let component = queue.pop(); component; component = queue.pop()) {
		const bridge = component
			.flatMap((a, position) =>
				component.slice(position + 1).map((b) => [a, b] as const),
			)
			.filter(([a, b]) => linked(a, b))
			.map(([a, b]) => reached(a, component, linked, [a, b]))
			.find(
				(side) =>
					side.size >= 2 &&
					component.length - side.size >= 2 &&
					side.size < component.length,
			);
		if (!bridge) {
			expressions.push(component);
			continue;
		}
		queue.push(
			[...bridge],
			component.filter((head) => !bridge.has(head)),
		);
	}
	return expressions.sort((a, b) => Math.min(...a) - Math.min(...b));
}

// ------------------------------------------------------------- assembly

export function assembleAnalysis(
	sentence: SegmentedSentence<"de">,
	placement: Placement,
	answers: Answers,
	policy: AssemblyPolicy = productionPolicy,
): Omit<SentenceAnalysis, "sentenceId" | "language"> {
	const { groups, unresolvable } = components(
		placement.resolvable,
		answers,
		policy.membershipTau,
	);
	const words = groups
		.map((members) =>
			wordOf(
				sentence,
				answers,
				members,
				members.some((m) => unresolvable.has(m)) ? "membership" : null,
			),
		)
		.flatMap((word) =>
			word.unresolved ? [word] : splitMultiHead(sentence, answers, word),
		);

	const targets: LexemeTarget[] = [];
	const headIndexOf = new Map<string, number>();
	const fusedArticles: { offset: number }[] = [];
	let counter = 0;
	const nextId = () => `t${++counter}`;
	const memberRole = (index: number, singleton: boolean): MemberRole => {
		const role = roleOf(answers, index);
		if (role === "Free") return "Head";
		if (singleton && role === "Unresolved") return "Head";
		return role;
	};

	const fusionOf = (index: number) =>
		placement.fusions.find(
			(entry) =>
				entry.offset === placement.pieces.get(index)?.[0]?.offset,
		);
	for (const word of words) {
		// A fused word never joins a group whole: the table decides it, its
		// adposition a singleton and its article the next noun's, whatever the
		// matrix said about the source word.
		for (const index of word.members) {
			const fusion = fusionOf(index);
			if (!fusion) continue;
			for (const component of fusion.components)
				if (component.role === "Adposition") {
					const id = nextId();
					headIndexOf.set(id, index);
					targets.push({
						id,
						members: [{ offset: component.offset, role: "Head" }],
						routeMass: { ADP: 1 },
						identity: null,
						provenance: "fusion-table",
					});
				} else fusedArticles.push({ offset: component.offset });
		}
		const plain = word.members.filter((index) => !fusionOf(index));
		if (plain.length === 0) continue;
		const singleton = plain.length === 1;
		const members: Member[] = plain.flatMap((index) =>
			(placement.pieces.get(index) ?? []).map((piece) => ({
				offset: piece.offset,
				role: memberRole(index, singleton),
			})),
		);
		const headIndex =
			plain.find((index) => memberRole(index, false) === "Head") ??
			plain[0] ??
			0;
		const routeMass =
			plain.length === word.members.length
				? word.routeMass
				: routeMassOf(answers, plain);
		const id = nextId();
		headIndexOf.set(id, headIndex);
		targets.push({
			id,
			members,
			routeMass: word.unresolved ? { Unresolved: 1 } : routeMass,
			identity: identityMassOf(sentence, answers, headIndex),
			provenance: word.unresolved ? `guard:${word.unresolved}` : "vote",
		});
	}
	// A fused article joins the noun its phrase opens onto, when that noun has
	// no article yet (ADR 0024); a name, a later noun past another word or an
	// unresolved word leaves it standing alone.
	for (const article of fusedArticles) {
		const next = phraseHeadAfter(targets, article.offset);
		const noun =
			next &&
			winner(next.routeMass) === "NOUN" &&
			next.members.every(
				(member) =>
					member.role !== "Article" && member.offset > article.offset,
			)
				? next
				: undefined;
		if (noun) {
			const position = targets.indexOf(noun);
			targets[position] = {
				...noun,
				members: [
					{ offset: article.offset, role: "Article" },
					...noun.members,
				],
				provenance: `${noun.provenance}+fusion-table`,
			};
		} else
			targets.push({
				id: nextId(),
				members: [{ offset: article.offset, role: "Head" }],
				routeMass: { DET: 1 },
				identity: null,
				provenance: "fusion-table:unattached-article",
			});
	}
	// Whatever grouped them, an article only opens its own noun's phrase: a
	// word past the prenominal ones between them splits the article off.
	const indexAt = new Map<number, number>();
	for (const [index, pieces] of placement.pieces)
		for (const piece of pieces) indexAt.set(piece.offset, index);
	for (const [position, target] of [...targets.entries()]) {
		const article = target.members.find(
			(member) => member.role === "Article",
		);
		if (!article || winner(target.routeMass) !== "NOUN") continue;
		const head = phraseHeadAfter(
			targets.filter((other) => other !== target),
			article.offset,
		);
		if (!head || headOffsetOf(head) > headOffsetOf(target)) continue;
		const index = indexAt.get(article.offset);
		targets[position] = {
			...target,
			members: target.members.filter((member) => member !== article),
			provenance: `${target.provenance}+guard:articleScope`,
		};
		targets.push({
			id: nextId(),
			members: [{ offset: article.offset, role: "Head" }],
			routeMass: { DET: 1 },
			identity:
				index === undefined || fusionOf(index)
					? null
					: identityMassOf(sentence, answers, index),
			provenance: "guard:articleScope",
		});
	}
	targets.sort(
		(a, b) => (a.members[0]?.offset ?? 0) - (b.members[0]?.offset ?? 0),
	);

	// ---------------------------------------------------- Phraseme layer
	// The floor gates each word before the pairs link: a free word two fixed
	// words vouch for (`ganz und gar normal`) is never carried in by them.
	const heads = [...headIndexOf.values()].filter(
		(head, position, all) =>
			all.indexOf(head) === position &&
			(scoreOf(answers, `fix_${head}`) ?? 0) >= policy.fixednessFloor,
	);
	const phrasemes: PhrasemeTarget[] = [];
	for (const component of expressionsOf(
		heads,
		(a, b) =>
			(noulOf(answers, `same_${Math.min(a, b)}_${Math.max(a, b)}`) ??
				0) >= policy.phrasemeTau,
	)) {
		if (component.length < 2) continue;
		const kindMass: Record<string, number> = {};
		let fixedness = 0;
		for (const head of component) {
			const kind = choiceOf(answers, `pk_${head}`);
			if (kind)
				for (const [option, share] of Object.entries(
					kind.probabilities as Distribution,
				))
					kindMass[option] =
						(kindMass[option] ?? 0) + share / component.length;
			fixedness +=
				(scoreOf(answers, `fix_${head}`) ?? 0) / component.length;
		}
		const named = Object.entries(kindMass).filter(
			([option]) => option !== "None" && option !== "Unresolved",
		);
		if (!named.some(([, share]) => share > 0)) continue;
		const members = targets
			.filter((target) => {
				const head = headIndexOf.get(target.id);
				return head !== undefined && component.includes(head);
			})
			.map((target) => target.id);
		if (members.length < 2) continue;
		phrasemes.push({
			id: `p${phrasemes.length + 1}`,
			members,
			kindMass: Object.fromEntries(
				Object.entries(kindMass)
					.sort((a, b) => b[1] - a[1])
					.map(([option, share]) => [option, +share.toFixed(3)]),
			),
			fixedness: +fixedness.toFixed(2),
			provenance: `score@${policy.phrasemeTau}`,
		});
	}
	return {
		stitchedText: placement.stitchedText,
		segments: placement.segments,
		targets,
		phrasemes,
		fusions: placement.fusions,
		government: assembleGovernment(placement, targets, answers),
	};
}
