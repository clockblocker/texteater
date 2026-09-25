/**
 * The Sentence Analysis: what intake owns for one accepted German sentence,
 * in two layers (Dumgen ADR 0006).
 *
 * Segments carry their character offset in the Stitched Text, the text they
 * show and the surface they stand for; a fused word is one Segment per
 * component. The Lexeme layer partitions the ResolvableText Segments into
 * Lexeme Targets, each the Segments that realize one word, with member roles,
 * one Route Mass over Lexeme Kinds and, for a closed-class head, an Identity
 * Mass over authored headword groups. The Phraseme layer partitions a subset
 * of the Lexeme Targets into Phraseme Targets, whose members are words, never
 * Segments, with one Kind Mass and a fixedness score. Government links each
 * governed preposition to the Lexeme or Phraseme Target that selects it (ADR
 * 0030).
 * Nothing resolved is stored; the Resolution Selector below is the one pure
 * function that applies the policy.
 */

import type {
	GovernablePreposition,
	GovernedPrepositionDraft,
} from "../governable-prepositions.js";

export type AnalyzedSegmentKind =
	| "ResolvableText"
	| "OpaqueText"
	| "Whitespace"
	| "Punctuation";

export type AnalyzedSegment = {
	readonly offset: number;
	readonly kind: AnalyzedSegmentKind;
	readonly text: string;
	readonly surface: string;
};

export type MemberRole =
	| "Head"
	| "SeparableParticle"
	| "GovernedPreposition"
	| "Reflexive"
	| "Expletive"
	| "Article"
	| "Auxiliary"
	| "Unresolved";

export type Member = {
	readonly offset: number;
	readonly role: MemberRole;
};

export type IdentityCandidate = {
	/** `Kind:headword:pronType`, the key the mass is stored under. */
	readonly key: string;
	readonly kind: "DET" | "PRON" | "AUX";
	readonly headword: string;
	readonly pronType: string | null;
	/** A pillar group's Core cells, or the cells a stem's spelling marks on its Surface; the grammar step picks one. */
	readonly cells: readonly string[];
	readonly definition: string;
};

export type IdentityMass = {
	readonly candidates: readonly IdentityCandidate[];
	/** Mass per candidate key plus `NoMatch` and `Unresolved`. */
	readonly mass: Readonly<Record<string, number>>;
};

export type LexemeTarget = {
	readonly id: string;
	readonly members: readonly Member[];
	/** Mass per Lexeme Kind, `Unresolved` included. */
	readonly routeMass: Readonly<Record<string, number>>;
	/** Present only when the head's spelling enumerates authored candidates. */
	readonly identity: IdentityMass | null;
	/** How the target came to be: `vote`, `fusion-table`, or an assembly guard. */
	readonly provenance: string;
};

export type PhrasemeTarget = {
	readonly id: string;
	/** Lexeme Target ids, ordered by first offset. */
	readonly members: readonly string[];
	/** Mass per Phraseme Kind plus `None` and `Unresolved`. */
	readonly kindMass: Readonly<Record<string, number>>;
	/** Mean fixedness Score of the member words, 0 (free) to 3 (fixed expression). */
	readonly fixedness: number;
	readonly provenance: string;
};

export type FusionComponent = {
	readonly offset: number;
	readonly span: string;
	readonly surface: string;
	readonly role: string;
};

export type Fusion = {
	readonly offset: number;
	readonly form: string;
	readonly components: readonly FusionComponent[];
};

/**
 * One governed preposition: the Segment realizing it (the preposition, a
 * fused word's adposition or a pronominal adverb), its ADP headword, the case
 * the government requires and the governing Lexeme Target's id, or a Phraseme
 * Target's id when the expression governs and no one word does (`mit … zu tun
 * haben`).
 */
export type Government = {
	readonly offset: number;
	readonly preposition: GovernablePreposition;
	readonly case: "Acc" | "Dat" | "Gen";
	readonly governor: string;
};

export type SentenceAnalysis = {
	readonly sentenceId: string;
	readonly language: "de";
	readonly stitchedText: string;
	readonly segments: readonly AnalyzedSegment[];
	/** The Lexeme layer: a flat partition of the ResolvableText Segments. */
	readonly targets: readonly LexemeTarget[];
	/** The Phraseme layer: a partition of a subset of `targets`. */
	readonly phrasemes: readonly PhrasemeTarget[];
	readonly fusions: readonly Fusion[];
	readonly government: readonly Government[];
};

// ------------------------------------------------------- Resolution Selector

const lexemeKinds = new Set([
	"ADJ",
	"ADP",
	"ADV",
	"AUX",
	"CCONJ",
	"DET",
	"INTJ",
	"NOUN",
	"NUM",
	"PART",
	"PRON",
	"PROPN",
	"PUNCT",
	"SCONJ",
	"SYM",
	"VERB",
	"X",
]);
const phrasemeKinds = new Set([
	"Aphorism",
	"Collocation",
	"DiscourseFormula",
	"Idiom",
	"Proverb",
]);
const closedKinds = new Set(["DET", "PRON"]);

export function familyOf(kind: string): "Lexeme" | "Phraseme" | "Unresolved" {
	if (lexemeKinds.has(kind)) return "Lexeme";
	if (phrasemeKinds.has(kind)) return "Phraseme";
	return "Unresolved";
}

export function argmax(mass: Readonly<Record<string, number>>): {
	readonly key: string;
	readonly share: number;
} {
	let best: { key: string; share: number } = { key: "Unresolved", share: 0 };
	for (const [key, share] of Object.entries(mass))
		if (share > best.share) best = { key, share };
	return best;
}

export type SelectedRoute = {
	readonly kind: string;
	readonly family: "Lexeme" | "Phraseme" | "Unresolved";
	readonly share: number;
};

/** Route: the argmax of the Route Mass; `Unresolved` is a route the mass can win. */
export function selectRoute(target: LexemeTarget): SelectedRoute {
	const { key, share } = argmax(target.routeMass);
	return { kind: key, family: familyOf(key), share };
}

export type IdentityState =
	| {
			readonly state: "Selected";
			readonly candidate: IdentityCandidate;
			readonly share: number;
	  }
	| { readonly state: "Derived"; readonly from: "head" }
	| { readonly state: "Open" }
	| { readonly state: "Unresolved" }
	| { readonly state: "Miss" };

export function headOf(target: LexemeTarget): Member {
	const head = target.members.find((member) => member.role === "Head");
	if (head) return head;
	const first = target.members[0];
	if (!first) throw Error("A Lexeme Target has at least one member");
	return first;
}

/**
 * Identity State per member. A non-head inherits its parent's route and is
 * Derived. The head is Selected when a candidate wins its Identity Mass,
 * Open when NoMatch wins or the route is open-class with no candidates,
 * Unresolved when Unresolved wins, and a Miss when the route is closed-class
 * and the spelling enumerated nothing.
 */
export function selectIdentity(
	target: LexemeTarget,
	member: Member,
): IdentityState {
	if (member.offset !== headOf(target).offset)
		return { state: "Derived", from: "head" };
	const route = selectRoute(target);
	if (!target.identity)
		return closedKinds.has(route.kind)
			? { state: "Miss" }
			: { state: "Open" };
	const { key, share } = argmax(target.identity.mass);
	if (key === "NoMatch") return { state: "Open" };
	if (key === "Unresolved") return { state: "Unresolved" };
	const candidate = target.identity.candidates.find((c) => c.key === key);
	return candidate
		? { state: "Selected", candidate, share }
		: { state: "Unresolved" };
}

/** Identity implies route: a Selected head's Kind replaces the vote's Kind. */
export function effectiveRoute(target: LexemeTarget): SelectedRoute {
	const identity = selectIdentity(target, headOf(target));
	if (identity.state === "Selected" && target.members.length === 1)
		return {
			kind: identity.candidate.kind,
			family: "Lexeme",
			share: identity.share,
		};
	return selectRoute(target);
}

export function targetOf(
	analysis: SentenceAnalysis,
	offset: number,
): LexemeTarget | undefined {
	return analysis.targets.find((target) =>
		target.members.some((member) => member.offset === offset),
	);
}

export function segmentAt(
	analysis: SentenceAnalysis,
	offset: number,
): AnalyzedSegment | undefined {
	return analysis.segments.find((segment) => segment.offset === offset);
}

export function fusionAt(
	analysis: SentenceAnalysis,
	offset: number,
): Fusion | undefined {
	return analysis.fusions.find((fusion) =>
		fusion.components.some((component) => component.offset === offset),
	);
}

// --------------------------------------------------------- Phraseme layer

/** Below this mean fixedness (0 free, 1 preferred, 2 collocation, 3 fixed) no expression is established. */
export const fixednessFloor = 1.5;

export type SelectedPhrasemeKind = {
	readonly kind: string;
	readonly share: number;
};

/**
 * A Collocation is a Funktionsverbgefüge (ADR 0028): a support verb with its
 * predicate noun. Grammar refuses any other wording on the Collocation route.
 */
function funktionsverbgefuege(
	analysis: SentenceAnalysis,
	phraseme: PhrasemeTarget,
): boolean {
	const kinds = new Set(
		membersOf(analysis, phraseme).map(
			(target) => effectiveRoute(target).kind,
		),
	);
	return kinds.has("VERB") && kinds.has("NOUN");
}

/**
 * Kind under the `score` policy: the fixedness Score establishes the
 * expression and the Kind Mass only names it. Below the floor the Phraseme
 * is `None`; above it the best named Kind wins even when `None` carries
 * more mass, and `Unresolved` wins only when no Kind has any mass. Words
 * without a support verb and a predicate noun cannot be named Collocation.
 */
export function selectPhrasemeKind(
	analysis: SentenceAnalysis,
	phraseme: PhrasemeTarget,
): SelectedPhrasemeKind {
	if (phraseme.fixedness < fixednessFloor)
		return { kind: "None", share: phraseme.kindMass.None ?? 0 };
	const collocation = funktionsverbgefuege(analysis, phraseme);
	const named = Object.fromEntries(
		Object.entries(phraseme.kindMass).filter(
			([key]) =>
				key !== "None" &&
				key !== "Unresolved" &&
				(key !== "Collocation" || collocation),
		),
	);
	const { key, share } = argmax(named);
	return { kind: key, share };
}

/** The Lexeme Targets a Phraseme is made of, in member order. */
export function membersOf(
	analysis: SentenceAnalysis,
	phraseme: PhrasemeTarget,
): LexemeTarget[] {
	return phraseme.members.flatMap((id) => {
		const target = analysis.targets.find((entry) => entry.id === id);
		return target ? [target] : [];
	});
}

/** The Phraseme's Segment span is derived: every member word's Segments. */
export function offsetsOf(
	analysis: SentenceAnalysis,
	phraseme: PhrasemeTarget,
): number[] {
	return membersOf(analysis, phraseme)
		.flatMap((target) => target.members.map((member) => member.offset))
		.sort((a, b) => a - b);
}

export function phrasemeOf(
	analysis: SentenceAnalysis,
	offset: number,
): PhrasemeTarget | undefined {
	const target = targetOf(analysis, offset);
	if (!target) return undefined;
	return analysis.phrasemes.find((phraseme) =>
		phraseme.members.includes(target.id),
	);
}

export type LargestUnit =
	| { readonly layer: "Phraseme"; readonly phraseme: PhrasemeTarget }
	| { readonly layer: "Lexeme"; readonly target: LexemeTarget };

/**
 * What a click selects: the Phraseme containing the word when there is one,
 * else the word. The learner is after the largest semantic unit; the word
 * beneath it is reached from the Phraseme.
 */
export function largestOf(
	analysis: SentenceAnalysis,
	offset: number,
): LargestUnit | undefined {
	const phraseme = phrasemeOf(analysis, offset);
	if (phraseme) return { layer: "Phraseme", phraseme };
	const target = targetOf(analysis, offset);
	return target ? { layer: "Lexeme", target } : undefined;
}

/**
 * The route and Segment span of the largest unit at an offset, or null when
 * the unit's route or the Phraseme's Kind is Unresolved or None, or when the
 * selected word's head Identity State is a Miss: a closed-class route whose
 * spelling enumerated no authored candidate. This is what a host reads at
 * click time instead of classifying.
 */
export function resolvedUnitAt(
	analysis: SentenceAnalysis,
	offset: number,
): {
	readonly family: "Lexeme" | "Phraseme";
	readonly kind: string;
	readonly offsets: readonly number[];
} | null {
	const largest = largestOf(analysis, offset);
	if (!largest) return null;
	if (largest.layer === "Phraseme") {
		const kind = selectPhrasemeKind(analysis, largest.phraseme);
		if (kind.kind !== "None" && kind.kind !== "Unresolved")
			return {
				family: "Phraseme",
				kind: kind.kind,
				offsets: offsetsOf(analysis, largest.phraseme),
			};
		const target = targetOf(analysis, offset);
		if (!target) return null;
		return lexemeUnit(target);
	}
	return lexemeUnit(largest.target);
}

/**
 * The route and Segment span of the word at an offset, ignoring any Phraseme
 * over it: what a host resolves when grammar refuses the Phraseme.
 */
export function resolvedWordAt(
	analysis: SentenceAnalysis,
	offset: number,
): ReturnType<typeof resolvedUnitAt> {
	const target = targetOf(analysis, offset);
	return target ? lexemeUnit(target) : null;
}

function lexemeUnit(target: LexemeTarget) {
	if (selectIdentity(target, headOf(target)).state === "Miss") return null;
	const route = effectiveRoute(target);
	if (route.family !== "Lexeme") return null;
	return {
		family: "Lexeme" as const,
		kind: route.kind,
		offsets: target.members.map((member) => member.offset),
	};
}

// ------------------------------------------------------------- Government

/** The Lexeme Targets behind a Government's governor: one word, or a Phraseme's words. */
export function governorTargets(
	analysis: SentenceAnalysis,
	governor: string,
): LexemeTarget[] {
	const phraseme = analysis.phrasemes.find((entry) => entry.id === governor);
	if (phraseme) return membersOf(analysis, phraseme);
	return analysis.targets.filter((target) => target.id === governor);
}

/**
 * The governed prepositions a unit attests in this sentence: every
 * Government whose governing word has a member among the unit's offsets. A
 * Phraseme reaches the government of its member words; a Phraseme's own
 * government reaches only a unit covering the whole Phraseme.
 */
export function governedPrepositionsAt(
	analysis: SentenceAnalysis,
	offsets: readonly number[],
): GovernedPrepositionDraft[] {
	const covered = new Set(offsets);
	const found = new Map<string, GovernedPrepositionDraft>();
	for (const entry of analysis.government) {
		const phraseme = analysis.phrasemes.find(
			(candidate) => candidate.id === entry.governor,
		);
		const governor = analysis.targets.find(
			(target) => target.id === entry.governor,
		);
		if (
			phraseme
				? offsetsOf(analysis, phraseme).every((offset) =>
						covered.has(offset),
					)
				: governor?.members.some((member) => covered.has(member.offset))
		)
			found.set(`${entry.preposition}/${entry.case}`, {
				preposition: entry.preposition,
				case: entry.case,
			});
	}
	return [...found.values()];
}
