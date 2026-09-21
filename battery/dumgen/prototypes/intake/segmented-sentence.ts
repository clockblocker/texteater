/**
 * The Segmented Sentence as the intake lab emits it (issue 493) and the
 * Resolution Selector that turns its masses into resolved values (issue 494).
 *
 * Nothing resolved is stored: a target carries its members with roles, one
 * Route Mass keyed by bare Kind, and, when its head enumerates authored
 * candidates, an Identity Mass keyed by headword group (issue 509). The
 * selector below is the one pure function that applies the policy, and it is
 * what the playground renders and what `fixtures.ts` scores. It has no
 * dependency on the rest of the lab so the playground can import it.
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

export type AnalysisTarget = {
	readonly id: string;
	readonly members: readonly Member[];
	/** Mass per bare Kind, `Unresolved` included. */
	readonly routeMass: Readonly<Record<string, number>>;
	/** Present only when the head's spelling enumerates authored candidates. */
	readonly identity: IdentityMass | null;
	/** How the target came to be, for the playground: `vote`, `fusion-table`, or an assembly guard. */
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
	readonly targets: readonly AnalysisTarget[];
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

export type Fixture = {
	readonly sentence: SegmentedSentence;
	readonly gold: readonly GoldTarget[];
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
	if (kind === "Fusion") return "Construction";
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
