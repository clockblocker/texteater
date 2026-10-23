import { selectKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import type {
	AuthoredMember,
	AuthoredRealization,
} from "../src/inventories.js";

export const name = ({ lemma, reading }: AuthoredMember) =>
	`${lemma.kind}/${lemma.canonicalForm} ${reading.emojiDescription} ${JSON.stringify(lemma.coreFeatures)}`;

/**
 * The Surface a stem PRON's spelling realizes, marking the cell it names.
 */
export function pronounSurface(
	{ lemma }: AuthoredMember,
	spelled: string,
	cell: Readonly<Record<string, string | null>>,
) {
	return {
		unitKind: "Surface",
		language: "de",
		lemma,
		normalizedSurface: spelled,
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		inflectionalFeatures: {
			case: null,
			gender: null,
			number: null,
			"gender[psor]": null,
			"number[psor]": null,
			...cell,
		},
	};
}

/** A route's inflectional bag with nothing marked, for a stem's cell. */
function emptyBag({ family, kind }: AuthoredMember["lemma"]) {
	if (family === "Locution")
		return { case: null, gender: null, number: null };
	return {
		case: null,
		...(kind === "DET" ? { degree: null } : {}),
		gender: null,
		"gender[psor]": null,
		number: null,
		"number[psor]": null,
	};
}

/**
 * The one-member Attestation a realization with a spelling builds: its
 * Surface spells the word the member stands for, and a Fused piece sits in a
 * sample host word (gehts).
 */
export function realizationAttestation({
	member,
	spelled,
	spelling,
	historicalStatus,
	orthography,
	standsFor,
	inflection,
}: AuthoredRealization) {
	const { lemma } = member;
	return {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "de",
			lemma,
			normalizedSurface: standsFor ?? spelled,
			spelling,
			surfaceFeatures: historicalStatus ? { historicalStatus } : null,
			inflectionalFeatures: inflection
				? { ...emptyBag(lemma), ...inflection }
				: null,
		},
		members: [
			orthography === "Fused"
				? {
						attested: spelled,
						orthography,
						fusion: {
							spelling: `geht${spelled}`,
							components: [
								{ span: "geht", surface: "geht" },
								{ span: spelled, surface: standsFor },
							],
						},
						component: 1,
					}
				: { attested: spelled, orthography: orthography ?? "Standard" },
		],
		realizationCoverage: "Full",
		// The evidence fields the route's Attestation holds, here empty.
		...(lemma.kind === "AUX"
			? { expletiveEvidence: null, valencyEvidence: [] }
			: lemma.kind === "PRON" && lemma.family === "Lexeme"
				? { articleEvidence: null }
				: {}),
	};
}

export function field(value: unknown, key: string): unknown {
	return value && typeof value === "object" && key in value
		? (value as Record<string, unknown>)[key]
		: undefined;
}

/** A Locution may have no Locution Type (ADR 0039); ReviewedEmpty records that. */
const optionalAspects = new Set(["locutionType"]);

/**
 * The aspects an authored member leaves incomplete (system ADR 0021): every
 * aspect the route's Knowledge policy selects is stored and marked Authored,
 * an optional one may be ReviewedEmpty instead, and each semantic relation
 * is Authored with claims or ReviewedEmpty.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
export function incompleteKnowledge(member: AuthoredMember): string[] {
	const { language, family, kind } = member.lemma;
	const selected = selectKnowledge({
		route: {
			language,
			family,
			kind,
		} as Dumrel.KnowledgeSelectionInput["route"],
	});
	if (!selected.success) return [selected.error.message];
	const gaps: string[] = [];
	for (const [aspect, selection] of Object.entries(selected.value)) {
		const content = field(member.knowledge, aspect);
		const coverage = field(member.coverage, aspect);
		if (selection === null) {
			const reviewedNone =
				optionalAspects.has(aspect) &&
				content === undefined &&
				coverage === "ReviewedEmpty";
			if (
				!reviewedNone &&
				(content === undefined || coverage !== "Authored")
			)
				gaps.push(aspect);
			continue;
		}
		for (const leaf of Object.keys(selection)) {
			const value = field(content, leaf);
			const status = field(coverage, leaf);
			const complete =
				aspect !== "semanticRelations"
					? value !== undefined && status === "Authored"
					: status === "ReviewedEmpty"
						? value === undefined ||
							(Array.isArray(value) && !value.length)
						: status === "Authored" &&
							Array.isArray(value) &&
							value.length > 0;
			if (!complete) gaps.push(`${aspect}/${leaf}`);
		}
	}
	if (
		member.coverage.semanticRelationTargetKind !==
		(member.knowledge.semanticRelations?.targetKind ?? "lemma")
	)
		gaps.push("semanticRelationTargetKind");
	return gaps;
}
