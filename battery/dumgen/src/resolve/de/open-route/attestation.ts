/**
 * An open route's Attestation, assembled from what the requests settled
 * and the headword code derived: its members and their piece readings,
 * the normalized Surface, and the evidence fields its route takes. The
 * parts are typed as Dumling's generated types give them; the value
 * leaves unchecked, for `parseUnit` to check against the route.
 */

import {
	germanAdpositionAllowedCases,
	germanAdpositionEntry,
} from "dumcorpus/inventories";
import type * as Dumling from "dumling/types";
import { attestedMember, type MemberOrthography } from "../member-spelling.js";
import { joinMembers, type Member, type Target } from "../target.js";
import type { AdverbialInflection } from "./adverbial.js";
import type { Agreement } from "./agreeing.js";
import type { Spelling, SurfaceFeatures } from "./common.js";
import type { NounInflection, OpeningArticle } from "./nominal.js";
import type { AdpCase, Shape, ValencyEvidence } from "./shape.js";
import type { VerbInflection } from "./verbal.js";

/** The inflection an open route's Surface may take. */
type OpenInflection =
	| VerbInflection
	| NounInflection
	| AdverbialInflection
	| Agreement;

/** An open route's Attestation, in parts typed as Dumling's generated types give them. */
type AttestationParts = {
	readonly canonicalForm: string;
	readonly coreFeatures: Dumling.Lemma<"de">["coreFeatures"];
	readonly normalizedSurface: string;
	readonly spelling: Spelling;
	readonly surfaceFeatures: SurfaceFeatures;
	/** Absent on a route that does not inflect. */
	readonly inflectionalFeatures: OpenInflection | null | undefined;
	readonly members: readonly Dumling.Attestation<"de">["members"][number][];
	readonly realizationCoverage: "Full" | "Partial";
	readonly articleEvidence?: Dumling.Attestation<
		"de",
		"Lexeme",
		"NOUN"
	>["articleEvidence"];
	readonly expletiveEvidence?: Dumling.Attestation<
		"de",
		"Lexeme",
		"VERB"
	>["expletiveEvidence"];
	readonly valencyEvidence?: readonly ValencyEvidence[];
};

/**
 * The Attestation its parts make on the unit's route. TypeScript cannot
 * tie the parts to the route's family and kind, which arrive at runtime,
 * so the value leaves unchecked: `parseUnit` in grammar.ts checks it
 * against the route, and one Dumling rejects is a Defect (#952).
 */
function attestationOn(
	route: Target["route"],
	parts: AttestationParts,
): unknown {
	const {
		canonicalForm,
		coreFeatures,
		normalizedSurface,
		spelling,
		surfaceFeatures,
		inflectionalFeatures,
		...attested
	} = parts;
	return {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "de",
			lemma: {
				unitKind: "Lemma",
				language: "de",
				family: route.family,
				kind: route.kind,
				canonicalForm,
				coreFeatures,
			},
			normalizedSurface,
			spelling,
			surfaceFeatures,
			...(inflectionalFeatures === undefined
				? {}
				: { inflectionalFeatures }),
		},
		...attested,
	};
}

/** What the requests settled that the Attestation records. */
export type AttestationRead = {
	readonly orthographies: readonly MemberOrthography[];
	/** The readings the head and the block fixed. */
	readonly readings: ReadonlyMap<number, string>;
	readonly spelling: Spelling;
	readonly surfaceFeatures: SurfaceFeatures;
	readonly coverage: "Full" | "Partial";
	readonly governed: readonly ValencyEvidence[];
	/** The case an ADP realizes. */
	readonly realizedCase: AdpCase | "None" | undefined;
	/** A VERB's subject es. */
	readonly expletive: Member | undefined;
	readonly inflection: OpenInflection | null | undefined;
};

/** The headword code derived: its Canonical Form, Core Features and each member's word. */
export type Headword = {
	readonly canonicalForm: string;
	readonly core: Dumling.Lemma<"de">["coreFeatures"];
	readonly normalized: readonly string[];
};

/**
 * The valency evidence an ADP attests: the case it realizes, or its ADP
 * Case Table's only case when a Locution's table allows one.
 */
function adpositionEvidence(
	shape: Shape,
	canonicalForm: string,
	realizedCase: AdpCase | "None" | undefined,
): readonly ValencyEvidence[] {
	if (!shape.adposition || !realizedCase || realizedCase === "None")
		return [];
	const table = shape.locution
		? germanAdpositionEntry({ family: "Locution", canonicalForm })
		: null;
	const [sole, ...more] = table ? germanAdpositionAllowedCases(table) : [];
	const realized =
		sole !== undefined && more.length === 0 ? sole : realizedCase;
	return [
		{
			member: null,
			complement: {
				kind: "Case",
				governedCase: realized,
				referent: "Either",
			},
			realizedCase: realized,
		},
	];
}

/**
 * The Attestation of a unit on an open route, unchecked. `outsideHeadword`
 * holds the members the normalized Surface leaves out: an owned article
 * and the governed prepositions.
 */
export function openAttestation(
	target: Target,
	shape: Shape,
	article: OpeningArticle | undefined,
	read: AttestationRead,
	headword: Headword,
	outsideHeadword: ReadonlySet<number>,
): unknown {
	const { canonicalForm } = headword;
	const normalized = [...headword.normalized];
	// The subject es is the authored es, whatever its position's capital.
	const { expletive } = read;
	if (expletive) normalized[expletive.position] = "es";
	const normalizedSurface = shape.foreign
		? canonicalForm
		: joinMembers(normalized, target.glued, outsideHeadword);
	// A member piece whose table names no word stands for its own word, in
	// the spelling Luna wrote for it (geht of geht's).
	const pieceReadings = new Map(read.readings);
	for (const member of target.members)
		if (
			member.spelling?.orthography === "Fused" &&
			member.spelling.surfaces.length === 0 &&
			!pieceReadings.has(member.segment)
		)
			pieceReadings.set(
				member.segment,
				normalized[member.position] ?? member.text,
			);
	const members = target.members.map((member) =>
		attestedMember(
			target.segments,
			member.segment,
			read.orthographies[member.position] ?? "Standard",
			pieceReadings,
		),
	);
	const expletiveEvidence = expletive ? members[expletive.position] : null;
	if (expletiveEvidence === undefined)
		throw Error("The subject es is no member of the unit");
	const valencyEvidence = [
		...read.governed,
		...adpositionEvidence(shape, canonicalForm, read.realizedCase),
	];
	return attestationOn(target.route, {
		canonicalForm,
		coreFeatures: headword.core,
		normalizedSurface,
		spelling: shape.foreign ? { kind: "Canonical" } : read.spelling,
		surfaceFeatures: shape.foreign ? null : read.surfaceFeatures,
		inflectionalFeatures: read.inflection,
		members,
		realizationCoverage: read.coverage,
		// A NOUN Locution's evidence is optional: it names only an owned article.
		...(shape.articleOwner && (shape.lexeme || article)
			? {
					articleEvidence: article
						? { kind: "Owned", member: article.member.position }
						: null,
				}
			: {}),
		...(shape.verbal ? { expletiveEvidence } : {}),
		...(shape.governor || shape.adposition ? { valencyEvidence } : {}),
	});
}
