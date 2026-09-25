/**
 * Pure assembly of the judge's answers into a Sentence Analysis (Dumgen ADR
 * 0006). The invariants live here, never in a question: connected components
 * of the symmetrized membership matrix at tau; one route vote per group; a
 * NOUN keeps at most the one article opening its phrase, with only
 * prenominal words between them; one Head per word (a group glued around two
 * Heads is split at them); a fused word never joins a group whole and its
 * adposition is a singleton; every article no noun holds, fused or
 * standalone, joins the noun its phrase opens onto, or stands alone as DET;
 * a Phraseme's members are words, projected by Head, only a word whose own
 * fixedness Score reaches the floor joins one, one pair alone never ties two
 * expressions together, a preposition joins only with its complement, and a
 * governor with only what it governs is valency, not a Phraseme. Slots are
 * read over the finished Lexeme Targets and Phraseme Targets, and each
 * governor then takes in the preposition its slot names.
 */
import type { Questions, SystemOneResult } from "promptsmith/typesafe";
import type { SegmentedSentence } from "../../../types.js";
import { abbreviationEntry } from "../../../universal/fusion-table.js";
import { germanFusionTable } from "../fusion-entries.js";
import { articleForms } from "../target-classification/assembly.js";
import type {
	IdentityMass,
	LexemeTarget,
	Member,
	MemberRole,
	PhrasemeTarget,
	SentenceAnalysis,
	Slot,
} from "./analysis.js";
import { fixednessFloor, headOf, selectIdentity } from "./analysis.js";
import type { RoleAnswer } from "./criteria.js";
import { assembleSlots, takesPreposition } from "./government.js";
import {
	candidateKey,
	candidateOf,
	candidatesFor,
	headwordGroups,
	surfaceRealizing,
} from "./identity.js";
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
	fixednessFloor,
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

/** Kinds a preposition's complement is made of. */
const nominal = new Set(["NOUN", "PROPN", "PRON"]);

/**
 * The word an article's phrase opens onto: the first Lexeme Target after
 * `offset` that is not prenominal. An extended attribute is passed over: one
 * complement phrase, an optional preposition, determiners and prenominal
 * words, then a nominal, closed by prenominal words with an adjective among
 * them (`der auf seinen Sohn stolze Vater`, `die ihrem Vater ähnliche
 * Tochter`). A noun without its own article is the article's noun (`den
 * Kindern kleine Geschenke`).
 */
function phraseHeadAfter(
	targets: readonly LexemeTarget[],
	offset: number,
): LexemeTarget | undefined {
	const after = targets
		.filter((target) => headOffsetOf(target) > offset)
		.sort((a, b) => headOffsetOf(a) - headOffsetOf(b));
	const kindAt = (index: number) => {
		const target = after[index];
		return target ? winner(target.routeMass) : undefined;
	};
	let index = after.findIndex(
		(target) => !prenominal.has(winner(target.routeMass)),
	);
	const head = after[index];
	const opensAttribute =
		head !== undefined &&
		(kindAt(index) === "ADP" ||
			kindAt(index) === "DET" ||
			kindAt(index) === "PRON" ||
			head.members.some(
				(member) =>
					member.role === "Article" && member.offset !== offset,
			));
	if (!opensAttribute) return head;
	if (kindAt(index) === "ADP") index++;
	while (kindAt(index) === "DET" || prenominal.has(kindAt(index) ?? ""))
		index++;
	if (!nominal.has(kindAt(index) ?? "")) return head;
	index++;
	let adjective = false;
	while (prenominal.has(kindAt(index) ?? "")) {
		if (kindAt(index) === "ADJ") adjective = true;
		index++;
	}
	return adjective && kindAt(index) === "NOUN" ? after[index] : head;
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
	if (kind === "NOUN" || kind === "PROPN") {
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
]);

/**
 * The one-Head invariant: a group with two Heads is split at them. A
 * non-head follows the Head it scored the higher Include with; a verbal role
 * landing on a non-VERB Head, a governed preposition on a Head that governs
 * nothing, or an Article on a Head that is neither a noun nor a name,
 * becomes a singleton.
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
			(role === "GovernedPreposition" &&
				!takesPreposition({ family: "Lexeme", kind: headKind })) ||
			(role === "Article" && headKind !== "NOUN" && headKind !== "PROPN")
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
	const text = sentence.segments[index]?.text ?? "";
	const candidates = candidatesFor(text);
	if (!candidates.length) return null;
	const groups = headwordGroups(candidates);
	const keyed = groups.map((group) => candidateOf(group, text));
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
	asked: Answers,
	policy: AssemblyPolicy = productionPolicy,
): Omit<SentenceAnalysis, "sentenceId" | "language"> {
	// An abbreviation's reviewed Kind stands for the route it is never asked.
	const answers: Answers = {
		...asked,
		...Object.fromEntries(
			[...placement.routes].map(([index, route]) => [
				`route_${index}`,
				{
					type: "choice",
					choice: route,
					confidence: 1,
					probabilities: { [route]: 1 },
				},
			]),
		),
	};
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
	// `name`: the judgment says the article is one a name is cited with
	// (the m of im Rhein).
	const fusedArticles: { offset: number; name: boolean }[] = [];
	let counter = 0;
	const nextId = () => `t${++counter}`;
	const memberRole = (index: number, singleton: boolean): MemberRole => {
		const role = roleOf(answers, index);
		if (role === "Free") return "Head";
		if (singleton && role === "Unresolved") return "Head";
		return role;
	};

	const abbreviationKindOf = (index: number) =>
		abbreviationEntry(
			germanFusionTable,
			sentence.segments[index]?.text ?? "",
		)?.kind ?? undefined;
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
				} else
					fusedArticles.push({
						offset: component.offset,
						name:
							choiceOf(answers, `nameArticle_${index}`)
								?.choice === "Name",
					});
		}
		// An abbreviation stands for its whole expansion, and the table names
		// the Kind of the unit that expansion is.
		for (const index of word.members) {
			const kind = abbreviationKindOf(index);
			const piece = placement.pieces.get(index)?.[0];
			if (!kind || !piece) continue;
			const id = nextId();
			headIndexOf.set(id, index);
			targets.push({
				id,
				members: [{ offset: piece.offset, role: "Head" }],
				routeMass: { [kind]: 1 },
				identity: null,
				provenance: "abbreviation-table",
			});
		}
		const plain = word.members.filter(
			(index) => !fusionOf(index) && !abbreviationKindOf(index),
		);
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
	// Every article no noun holds yet, fused or standalone, takes one path:
	// it joins the noun its phrase opens onto when that noun has no article
	// yet (system ADR 0032). It joins a name only when the judgment says the
	// name is cited with it (ADR 0035): a standalone article's Article role,
	// a fused one's name answer. A name cited bare, a later noun past another
	// word or an unresolved word leaves it standing alone as DET. Later
	// articles go first, so an earlier one never reaches past a later one's
	// noun.
	const orphans = targets.filter(
		(target) =>
			target.members.length === 1 &&
			target.members[0]?.role === "Article",
	);
	const articles = [
		...fusedArticles.map((article) => ({ ...article, orphan: null })),
		...orphans.map((orphan) => ({
			offset: orphan.members[0]?.offset ?? 0,
			name: true,
			orphan,
		})),
	].sort((a, b) => b.offset - a.offset);
	for (const orphan of orphans) targets.splice(targets.indexOf(orphan), 1);
	for (const article of articles) {
		const next = phraseHeadAfter(targets, article.offset);
		const kind = next ? winner(next.routeMass) : undefined;
		const noun =
			next &&
			(kind === "NOUN" || (kind === "PROPN" && article.name)) &&
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
				provenance: `${noun.provenance}+${article.orphan ? "article" : "fusion-table"}`,
			};
			if (article.orphan) headIndexOf.delete(article.orphan.id);
		} else if (article.orphan)
			targets.push({
				...article.orphan,
				members: [{ offset: article.offset, role: "Head" }],
				routeMass: { DET: 1 },
				provenance: "guard:articleScope",
			});
		else
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
		const kind = winner(target.routeMass);
		if (!article || (kind !== "NOUN" && kind !== "PROPN")) continue;
		const head = phraseHeadAfter(targets, article.offset);
		if (
			!head ||
			head === target ||
			headOffsetOf(head) > headOffsetOf(target)
		)
			continue;
		const index = indexAt.get(article.offset);
		targets[position] = {
			...target,
			members: target.members.filter((member) => member !== article),
			provenance: `${target.provenance}+guard:articleScope`,
		};
		const standalone = index !== undefined && !fusionOf(index);
		const id = nextId();
		if (standalone) headIndexOf.set(id, index);
		targets.push({
			id,
			members: [{ offset: article.offset, role: "Head" }],
			routeMass: { DET: 1 },
			identity: standalone
				? identityMassOf(sentence, answers, index)
				: null,
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
	// A preposition is a fixed member only through the noun it opens onto
	// (ins Feuer, zur Verfügung); one whose nominal complement is free
	// material is valency (ADR 0029), as mit in mit solchem Unsinn … zu tun.
	const freeComplement = (head: number, component: readonly number[]) =>
		targets.some((target) => {
			if (
				headIndexOf.get(target.id) !== head ||
				winner(target.routeMass) !== "ADP"
			)
				return false;
			const complement = targets
				.filter(
					(other) =>
						headOffsetOf(other) > headOffsetOf(target) &&
						!prenominal.has(winner(other.routeMass)) &&
						winner(other.routeMass) !== "DET",
				)
				.sort((a, b) => headOffsetOf(a) - headOffsetOf(b))[0];
			const complementHead = complement
				? headIndexOf.get(complement.id)
				: undefined;
			return (
				complement !== undefined &&
				nominal.has(winner(complement.routeMass)) &&
				(complementHead === undefined ||
					!component.includes(complementHead))
			);
		});
	const phrasemes: PhrasemeTarget[] = [];
	for (const linked of expressionsOf(
		heads,
		(a, b) =>
			(noulOf(answers, `same_${Math.min(a, b)}_${Math.max(a, b)}`) ??
				0) >= policy.phrasemeTau,
	)) {
		const component = linked.filter(
			(head) => !freeComplement(head, linked),
		);
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
			governedPrepositions: [],
			kindMass: Object.fromEntries(
				Object.entries(kindMass)
					.sort((a, b) => b[1] - a[1])
					.map(([option, share]) => [option, +share.toFixed(3)]),
			),
			fixedness: +fixedness.toFixed(2),
			provenance: `score@${policy.phrasemeTau}`,
		});
	}
	// A governor with only the prepositions it governs is valency, which its
	// slots already record (ADR 0030, ADR 0034), not an expression.
	const wordSlots = assembleSlots(placement, targets, answers);
	const valencyOnly = (phraseme: PhrasemeTarget) =>
		phraseme.members.every((id) => {
			const target = targets.find((candidate) => candidate.id === id);
			return wordSlots.some(
				(slot) =>
					phraseme.members.includes(slot.governor) &&
					(slot.governor === id ||
						slot.filler === id ||
						target?.members.some(
							(member) => member.offset === slot.marker,
						)),
			);
		});
	const expressions = phrasemes
		.filter((phraseme) => !valencyOnly(phraseme))
		.map((phraseme, position) => ({
			...phraseme,
			id: `p${position + 1}`,
		}));
	const slots = assembleSlots(placement, targets, answers, expressions);
	const governed = absorbGovernedPrepositions(
		placement,
		targets,
		expressions,
		slots,
		nextId,
	);
	// The analysis decides between an entry's candidate surfaces: an article
	// member stands for its article (das in 's Wetter), a Selected identity
	// for its own (es in geht's). Undecided, the first stays.
	const surfaceOf = (offset: number, surfaces: readonly string[]) => {
		const target = governed.targets.find((entry) =>
			entry.members.some((member) => member.offset === offset),
		);
		const member = target?.members.find((entry) => entry.offset === offset);
		if (!target || !member) return undefined;
		if (member.role === "Article")
			return surfaceRealizing(
				surfaces,
				(candidate) => candidate.lemma.kind === "DET",
			);
		const identity = selectIdentity(target, member);
		return identity.state === "Selected"
			? surfaceRealizing(
					surfaces,
					(candidate) =>
						candidateKey(candidate) === identity.candidate.key,
				)
			: undefined;
	};
	const segments = placement.segments.map((segment) => {
		const surfaces = placement.choices.get(segment.offset);
		const surface = surfaces && surfaceOf(segment.offset, surfaces);
		return surface ? { ...segment, surface } : segment;
	});
	return {
		stitchedText: placement.stitchedText,
		segments,
		targets: governed.targets,
		phrasemes: governed.phrasemes,
		fusions: placement.fusions,
		slots,
	};
}

// --------------------------------------------------- governed prepositions

/**
 * Every governor takes in the preposition its slot names (ADR 0034); slots
 * name only routes that take one. A VERB, ADJ or NOUN Lexeme Target gains it
 * as a `GovernedPreposition` member, wherever it stands (`Auf ihn bin ich
 * stolz`), and a Collocation or Idiom lists it among its governed
 * prepositions, beside its fixed words and outside its fixedness. The
 * preposition leaves the word it stood in: its own ADP singleton goes, and
 * a member the Lexeme layer glued to another word is split off. A member of
 * the governor itself keeps the role it has. A fused adposition (`vom`)
 * stays its own word, as does a preposition that is a fixed word of an
 * expression and one before a noun's article.
 */
function absorbGovernedPrepositions(
	placement: Placement,
	lexemes: readonly LexemeTarget[],
	phrasemes: readonly PhrasemeTarget[],
	slots: readonly Slot[],
	nextId: () => string,
): { targets: LexemeTarget[]; phrasemes: PhrasemeTarget[] } {
	const targets = [...lexemes];
	const expressions = [...phrasemes];
	const fused = new Set(
		placement.fusions.flatMap((fusion) =>
			fusion.components.map((component) => component.offset),
		),
	);
	const referenced = (id: string) =>
		expressions.some(
			(phraseme) =>
				phraseme.members.includes(id) ||
				phraseme.governedPrepositions.includes(id),
		) || slots.some((slot) => slot.governor === id || slot.filler === id);
	const replace = (target: LexemeTarget, next: LexemeTarget | null) => {
		const position = targets.indexOf(target);
		if (next) targets[position] = next;
		else targets.splice(position, 1);
	};
	/** Takes the marker out of the word it stands in; false when it cannot leave. */
	const detach = (owner: LexemeTarget, offset: number): boolean => {
		if (owner.members.length === 1) {
			if (referenced(owner.id)) return false;
			replace(owner, null);
			return true;
		}
		if (headOf(owner).offset === offset) return false;
		replace(owner, {
			...owner,
			members: owner.members.filter((member) => member.offset !== offset),
			provenance: `${owner.provenance}+guard:governed`,
		});
		return true;
	};
	for (const slot of slots) {
		const offset = slot.marker;
		if (offset === null || fused.has(offset)) continue;
		const owner = targets.find((target) =>
			target.members.some((member) => member.offset === offset),
		);
		if (!owner) continue;
		const word = targets.find((target) => target.id === slot.governor);
		if (word) {
			const article = word.members.find(
				(member) => member.role === "Article",
			);
			// A member the word already holds keeps its role (`auf` stays
			// the SeparableParticle of `steht … auf`).
			if (owner === word || (article && offset < article.offset))
				continue;
			if (!detach(owner, offset)) continue;
			const current = targets.find((target) => target.id === word.id);
			if (!current) continue;
			replace(current, {
				...current,
				members: [
					...current.members,
					{ offset, role: "GovernedPreposition" as const },
				].sort((a, b) => a.offset - b.offset),
				provenance: `${current.provenance}+governed`,
			});
			continue;
		}
		const expression = expressions.find(
			(phraseme) => phraseme.id === slot.governor,
		);
		if (!expression) continue;
		let preposition = owner;
		if (owner.members.length > 1) {
			if (!detach(owner, offset)) continue;
			preposition = {
				id: nextId(),
				members: [{ offset, role: "Head" }],
				routeMass: { ADP: 1 },
				identity: null,
				provenance: "guard:governed",
			};
			targets.push(preposition);
		} else if (referenced(owner.id)) continue;
		expressions[expressions.indexOf(expression)] = {
			...expression,
			governedPrepositions: [
				...expression.governedPrepositions,
				preposition.id,
			],
		};
	}
	targets.sort(
		(a, b) => (a.members[0]?.offset ?? 0) - (b.members[0]?.offset ?? 0),
	);
	return { targets, phrasemes: expressions };
}
