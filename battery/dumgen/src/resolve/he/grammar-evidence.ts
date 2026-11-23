/** Transient Hebrew evidence consistency checks, not a syntactic recognizer. */
const binyanValues = [
	"HIFIL",
	"HITPAEL",
	"HUFAL",
	"NIFAL",
	"PAAL",
	"PIEL",
	"PUAL",
];

const anchorSchema = {
	type: "object",
	additionalProperties: false,
	required: ["memberIndexes", "exactText"],
	properties: {
		memberIndexes: {
			type: "array",
			minItems: 1,
			uniqueItems: true,
			items: { type: "integer", minimum: 0 },
		},
		exactText: { type: "string", minLength: 1 },
	},
};

/** Private model-output schema; never part of stored grammar or Reading identity. */
export const hebrewGrammarEvidenceSchema: Record<string, unknown> = {
	anyOf: [
		{ type: "null" },
		{
			type: "object",
			additionalProperties: false,
			required: ["kind", "state", "complement"],
			properties: {
				kind: { const: "NOUN" },
				state: { enum: ["Absolute", "Construct", "Unknown"] },
				complement: { anyOf: [{ type: "null" }, anchorSchema] },
			},
		},
		{
			type: "object",
			additionalProperties: false,
			required: ["kind", "binyan", "citationRole", "occurrence"],
			properties: {
				kind: { const: "VERB" },
				binyan: { enum: [...binyanValues, null] },
				citationRole: { enum: ["Past3ms", "Restricted"] },
				occurrence: anchorSchema,
			},
		},
	],
};

export const hebrewGrammarEvidencePrompt = `After the existing emoji-first answer, choose transient grammarEvidence before assembling surface. Do not change semantic identity or stored Reading selection.
Use supplied sentence Segment indexes in source order. exactText is the literal concatenation of the indexed Segment texts, including source whitespace and niqqud; never normalize or invent characters.
For NOUN return {kind:"NOUN",state:"Absolute"|"Construct"|"Unknown",complement:null|{memberIndexes:number[],exactText:string}}. Construct needs a nonempty contextual nominal-complement witness wholly outside the target, and surface.inflectionalFeatures.definite:Cons. A preceding quantifier alone supplies no such witness. Absolute must not have Cons and uses complement:null. Unknown abstains: it cannot validate a noun. An unsupported elliptical construct must remain unresolved rather than inventing a complement. Anchors are not proof of a nominal relation; do not assume every following noun is a complement.
For VERB return {kind:"VERB",binyan:the supplied Hebrew enum or null,citationRole:"Past3ms"|"Restricted",occurrence:{memberIndexes:number[],exactText:string}}. occurrence indexes must equal the target indexes. Choose binyan from context, never mechanically from a root or suffix; it must agree with surface.lemma.coreFeatures.hebBinyan. Null abstains. Past3ms describes the canonical citation, not necessarily this occurrence. Restricted does not authorize inventing an unavailable citation. Under local morphology-only policy a Part occurrence has person:null and tense:null. This is not a universal syntactic claim.
For other routes return null. Use only the declared fields; evidence remains transient and is not an Attestation or sense key.`;

function record(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(
	value: Record<string, unknown>,
	keys: readonly string[],
): boolean {
	return (
		Object.keys(value).length === keys.length &&
		keys.every((key) => Object.hasOwn(value, key))
	);
}

function indexes(
	value: unknown,
	segments: readonly string[],
): value is number[] {
	return (
		Array.isArray(value) &&
		value.length > 0 &&
		value.every(
			(index, position) =>
				Number.isInteger(index) &&
				index >= 0 &&
				index < segments.length &&
				(position === 0 || index > value[position - 1]),
		)
	);
}

function anchor(
	value: unknown,
	segments: readonly string[],
): value is { memberIndexes: number[]; exactText: string } {
	return (
		record(value) &&
		exactKeys(value, ["memberIndexes", "exactText"]) &&
		indexes(value.memberIndexes, segments) &&
		typeof value.exactText === "string" &&
		value.exactText.length > 0 &&
		value.memberIndexes.map((index) => segments[index]).join("") ===
			value.exactText
	);
}

/** Reject contradictory/unsupported evidence without rewriting the native Surface. */
export function validateHebrewGrammarEvidence(input: {
	route: string;
	surface: unknown;
	evidence: unknown;
	segments: readonly string[];
	targetIndexes: readonly number[];
}): boolean {
	const { route, surface, evidence, segments, targetIndexes } = input;
	if (route !== "NOUN" && route !== "VERB") return evidence === null;
	if (
		!Array.isArray(segments) ||
		!segments.every((segment) => typeof segment === "string") ||
		!indexes(targetIndexes, segments)
	)
		return false;
	if (
		!record(surface) ||
		surface.unitKind !== "Surface" ||
		surface.language !== "he" ||
		!record(surface.lemma) ||
		surface.lemma.unitKind !== "Lemma" ||
		surface.lemma.language !== "he" ||
		surface.lemma.family !== "Lexeme" ||
		surface.lemma.kind !== route ||
		!record(surface.inflectionalFeatures) ||
		!record(evidence) ||
		evidence.kind !== route
	)
		return false;
	const features = surface.inflectionalFeatures;
	if (route === "NOUN") {
		if (!exactKeys(evidence, ["kind", "state", "complement"])) return false;
		if (evidence.state === "Absolute")
			return (
				evidence.complement === null &&
				(features.definite === "Ind" || features.definite === "Def")
			);
		if (
			evidence.state !== "Construct" ||
			features.definite !== "Cons" ||
			!anchor(evidence.complement, segments)
		)
			return false;
		return evidence.complement.memberIndexes.every(
			(index) => !targetIndexes.includes(index),
		);
	}
	if (
		!exactKeys(evidence, [
			"kind",
			"binyan",
			"citationRole",
			"occurrence",
		]) ||
		(evidence.citationRole !== "Past3ms" &&
			evidence.citationRole !== "Restricted") ||
		typeof evidence.binyan !== "string" ||
		!binyanValues.includes(evidence.binyan) ||
		!record(surface.lemma.coreFeatures) ||
		evidence.binyan !== surface.lemma.coreFeatures.hebBinyan ||
		!anchor(evidence.occurrence, segments)
	)
		return false;
	if (
		features.verbForm === "Part" &&
		(features.person !== null || features.tense !== null)
	)
		return false;
	return (
		evidence.occurrence.memberIndexes.length === targetIndexes.length &&
		evidence.occurrence.memberIndexes.every(
			(index, position) => index === targetIndexes[position],
		)
	);
}
