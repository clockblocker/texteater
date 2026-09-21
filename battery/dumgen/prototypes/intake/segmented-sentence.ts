/**
 * The Segmented Sentence as the intake lab emits it (issue 493) and the
 * Resolution Selector that turns its masses into resolved values (issue 494),
 * in two layers (`layers.ts`).
 *
 * The Lexeme layer is `targets`: a flat partition of the ResolvableText
 * Segments into Lexeme Targets, each with its members and their roles, one
 * Route Mass keyed by Lexeme Kind, and, when its head enumerates authored
 * candidates, an Identity Mass keyed by headword group (issue 509). The
 * Phraseme layer is `phrasemes`: Phraseme Targets whose members are Lexeme
 * Targets, never Segments, with one Kind Mass and a fixedness score. A
 * Phraseme's Segment span is derived from its members.
 *
 * Nothing resolved is stored. The selector below is the one pure function
 * that applies the policy, and it is what the playground renders and what
 * `fixtures.ts` scores. It has no dependency on the rest of the lab so the
 * playground can import it.
 */

export type SegmentKind =
	| "ResolvableText"
	| "OpaqueText"
	| "Whitespace"
	| "Punctuation";

/** One clickable piece: offset in the Stitched Text, the text shown, the surface it stands for. */
export type Segment = {
	readonly offset: number;
	readonly kind: SegmentKind;
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

/** One headword group of authored members the head's spelling can realize. */
export type IdentityCandidate = {
	/** `Kind:headword:pronType`, the key the mass is stored under. */
	readonly key: string;
	readonly kind: "DET" | "PRON" | "AUX";
	readonly headword: string;
	readonly pronType: string | null;
	/** Authored cells behind the group; the grammar step picks one. */
	readonly cells: readonly string[];
	readonly definition: string;
};

export type IdentityMass = {
	readonly candidates: readonly IdentityCandidate[];
	/** Mass per candidate key plus `NoMatch` and `Unresolved`. */
	readonly mass: Readonly<Record<string, number>>;
};

/** A Lexeme Target: the Segments that realize one Lexeme occurrence. */
export type AnalysisTarget = {
	readonly id: string;
	readonly members: readonly Member[];
	/** Mass per Lexeme Kind, `Unresolved` included. */
	readonly routeMass: Readonly<Record<string, number>>;
	/** Present only when the head's spelling enumerates authored candidates. */
	readonly identity: IdentityMass | null;
	/** How the target came to be, for the playground: `vote`, `fusion-table`, or an assembly guard. */
	readonly provenance: string;
};

/** A Phraseme Target: the Lexeme Targets that are fixed lexical members of one expression. */
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

export type SegmentedSentence = {
	readonly id: string;
	readonly language: "de";
	readonly stitchedText: string;
	readonly segments: readonly Segment[];
	/** The Lexeme layer: a flat partition of the ResolvableText Segments. */
	readonly targets: readonly AnalysisTarget[];
	/** The Phraseme layer: a partition of a subset of `targets`. */
	readonly phrasemes: readonly PhrasemeTarget[];
	readonly fusions: readonly Fusion[];
};

/** Gold for one target, keyed by offset like the Sentence itself (issue 495). */
export type GoldTarget = {
	readonly kind: string;
	readonly members: readonly {
		readonly offset: number;
		/** Scored only when authored; singletons are Head. */
		readonly role?: MemberRole;
	}[];
	/** `Kind:headword` of the closed-class head, when authored. */
	readonly identity?: string;
};

/** Gold for one Phraseme: its Kind and the head offset of every member word. */
export type GoldPhraseme = {
	readonly kind: string;
	readonly words: readonly number[];
};

export type Fixture = {
	readonly sentence: SegmentedSentence;
	/** The Lexeme layer's gold. */
	readonly gold: readonly GoldTarget[];
	/** The Phraseme layer's gold; empty when the sentence has no expression. */
	readonly goldPhrasemes: readonly GoldPhraseme[];
	readonly note: string;
	readonly produced: { readonly design: string; readonly at: string };
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

export function familyOf(kind: string): string {
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
	readonly family: string;
	readonly share: number;
};

/** Route: the argmax of the Route Mass; `Unresolved` is a route the mass can win. */
export function selectRoute(target: AnalysisTarget): SelectedRoute {
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

export function headOf(target: AnalysisTarget): Member {
	return (
		target.members.find((member) => member.role === "Head") ??
		target.members[0]!
	);
}

/**
 * Identity State per member. A non-head inherits its parent's route and is
 * Derived. The head is Selected when a candidate wins its Identity Mass,
 * Open when NoMatch wins or the route is open-class with no candidates,
 * Unresolved when Unresolved wins, and a Miss when the route is closed-class
 * and the spelling enumerated nothing.
 */
export function selectIdentity(
	target: AnalysisTarget,
	member: Member,
): IdentityState {
	if (member !== headOf(target)) return { state: "Derived", from: "head" };
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
export function effectiveRoute(target: AnalysisTarget): SelectedRoute {
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
	sentence: SegmentedSentence,
	offset: number,
): AnalysisTarget | undefined {
	return sentence.targets.find((target) =>
		target.members.some((member) => member.offset === offset),
	);
}

export function segmentAt(
	sentence: SegmentedSentence,
	offset: number,
): Segment | undefined {
	return sentence.segments.find((segment) => segment.offset === offset);
}

export function fusionAt(
	sentence: SegmentedSentence,
	offset: number,
): Fusion | undefined {
	return sentence.fusions.find((fusion) =>
		fusion.components.some((component) => component.offset === offset),
	);
}

// --------------------------------------------------------- Phraseme layer

export type SelectedPhrasemeKind = {
	readonly kind: string;
	readonly share: number;
};

/** Below this mean fixedness (0 free, 1 preferred, 2 collocation, 3 fixed) no expression is established. */
export const fixednessFloor = 1.5;

/**
 * Kind under the `score` policy: the fixedness Score establishes the
 * expression and the Kind Mass only names it. Below the floor the Phraseme
 * is `None`; above it the best named Kind wins even when `None` carries
 * more mass, and `Unresolved` wins only when no Kind has any mass.
 */
export function selectPhrasemeKind(
	phraseme: PhrasemeTarget,
): SelectedPhrasemeKind {
	if (phraseme.fixedness < fixednessFloor)
		return { kind: "None", share: phraseme.kindMass.None ?? 0 };
	const named = Object.fromEntries(
		Object.entries(phraseme.kindMass).filter(
			([key]) => key !== "None" && key !== "Unresolved",
		),
	);
	const { key, share } = argmax(named);
	return { kind: key, share };
}

/** The Lexeme Targets a Phraseme is made of, in member order. */
export function membersOf(
	sentence: SegmentedSentence,
	phraseme: PhrasemeTarget,
): AnalysisTarget[] {
	return phraseme.members.flatMap((id) => {
		const target = sentence.targets.find((entry) => entry.id === id);
		return target ? [target] : [];
	});
}

/** The Phraseme's Segment span is derived: every member word's Segments. */
export function offsetsOf(
	sentence: SegmentedSentence,
	phraseme: PhrasemeTarget,
): number[] {
	return membersOf(sentence, phraseme)
		.flatMap((target) => target.members.map((member) => member.offset))
		.sort((a, b) => a - b);
}

export function phrasemeOf(
	sentence: SegmentedSentence,
	offset: number,
): PhrasemeTarget | undefined {
	const target = targetOf(sentence, offset);
	if (!target) return undefined;
	return sentence.phrasemes.find((phraseme) =>
		phraseme.members.includes(target.id),
	);
}

/**
 * What a click selects: the Phraseme containing the word when there is one,
 * else the word. The learner is after the largest semantic unit; the word
 * beneath it is reached from the Phraseme.
 */
export function largestOf(
	sentence: SegmentedSentence,
	offset: number,
):
	| { readonly layer: "Phraseme"; readonly phraseme: PhrasemeTarget }
	| { readonly layer: "Lexeme"; readonly target: AnalysisTarget }
	| undefined {
	const phraseme = phrasemeOf(sentence, offset);
	if (phraseme) return { layer: "Phraseme", phraseme };
	const target = targetOf(sentence, offset);
	return target ? { layer: "Lexeme", target } : undefined;
}
