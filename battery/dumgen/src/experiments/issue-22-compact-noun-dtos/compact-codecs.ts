import { codecBuilder4 } from "codec-builder-library/v4";
import { schemasFor } from "dumling/schema";
import { z } from "zod";
import { asObjectSchema } from "../../schema/as-object-schema";
import type { GrammaticalResolution, ReadingResolution } from "../../types";

export const COMPACT_CODE_MAPS = {
	grammarDecision: { R: "Resolved", U: "Unresolved" },
	memberOrthography: { S: "Standard", T: "Typo" },
	spelling: { C: "Canonical", V: "Variant" },
	realizationCoverage: { F: "Full", P: "Partial" },
	surfaceKind: { C: "Citation", I: "Inflection" },
	historicalStatus: { A: "Archaic" },
	gender: { F: "Fem", M: "Masc", N: "Neut" },
	hyph: { Y: "Yes" },
	case: { A: "Acc", D: "Dat", G: "Gen", N: "Nom" },
	number: { P: "Plur", S: "Sing" },
	readingDecision: { N: "New", R: "Reuse" },
} as const;

export const COMPACT_FIELD_KEYS = {
	grammaticalInput: { markedContext: "c" },
	grammaticalOutput: { decision: "d", resolution: "r" },
	grammaticalResolution: {
		memberOrthographies: "o",
		surface: "s",
		lemma: "l",
	},
	surface: {
		normalizedSurface: "n",
		spelling: "p",
		realizationCoverage: "r",
		surfaceKind: "k",
		historicalStatus: "h",
		inflectionalFeatures: "i",
	},
	inflectionalFeatures: { case: "c", number: "n" },
	lemma: { canonicalForm: "c", gender: "g", hyph: "h" },
	readingInput: {
		markedContext: "c",
		lemma: "l",
		existingEmojiDescriptions: "e",
	},
	readingOutput: { decision: "d", emojiDescription: "e" },
} as const;

function describeFields(fields: Record<string, string>): string {
	return Object.entries(fields)
		.map(([meaning, key]) => `${key}=${meaning}`)
		.join(", ");
}

function describeCodes(codes: Record<string, string>): string {
	return Object.entries(codes)
		.map(([code, meaning]) => `${code}=${meaning}`)
		.join(", ");
}

export const grammaticalLegendClaims = [
	`Input fields: ${describeFields(COMPACT_FIELD_KEYS.grammaticalInput)}.`,
	`Output fields: ${describeFields(COMPACT_FIELD_KEYS.grammaticalOutput)}.`,
	`Decision codes: ${describeCodes(COMPACT_CODE_MAPS.grammarDecision)}; resolution is null for Unresolved.`,
	`Resolution fields: ${describeFields(COMPACT_FIELD_KEYS.grammaticalResolution)}.`,
	`memberOrthographies codes: ${describeCodes(COMPACT_CODE_MAPS.memberOrthography)}.`,
	`Surface fields: ${describeFields(COMPACT_FIELD_KEYS.surface)}.`,
	`spelling codes: ${describeCodes(COMPACT_CODE_MAPS.spelling)}.`,
	`realizationCoverage codes: ${describeCodes(COMPACT_CODE_MAPS.realizationCoverage)}.`,
	`surfaceKind codes: ${describeCodes(COMPACT_CODE_MAPS.surfaceKind)}.`,
	`historicalStatus codes: ${describeCodes(COMPACT_CODE_MAPS.historicalStatus)}; null means unmarked.`,
	`inflectionalFeatures fields: ${describeFields(COMPACT_FIELD_KEYS.inflectionalFeatures)}.`,
	`case codes: ${describeCodes(COMPACT_CODE_MAPS.case)}; null means unmarked.`,
	`number codes: ${describeCodes(COMPACT_CODE_MAPS.number)}; null means unmarked.`,
	`Lemma fields: ${describeFields(COMPACT_FIELD_KEYS.lemma)}.`,
	`gender codes: ${describeCodes(COMPACT_CODE_MAPS.gender)}; null means unmarked.`,
	`hyph codes: ${describeCodes(COMPACT_CODE_MAPS.hyph)}; null means unmarked.`,
] as const;

export const readingLegendClaims = [
	`Input fields: ${describeFields(COMPACT_FIELD_KEYS.readingInput)}; lemma is fixed.`,
	`Lemma fields: ${describeFields(COMPACT_FIELD_KEYS.lemma)}.`,
	`gender codes: ${describeCodes(COMPACT_CODE_MAPS.gender)}; null means unmarked.`,
	`hyph codes: ${describeCodes(COMPACT_CODE_MAPS.hyph)}; null means unmarked.`,
	`Output fields: ${describeFields(COMPACT_FIELD_KEYS.readingOutput)}.`,
	`Decision codes: ${describeCodes(COMPACT_CODE_MAPS.readingDecision)}.`,
] as const;

export const grammaticalLegend = grammaticalLegendClaims.join("\n");
export const readingLegend = readingLegendClaims.join("\n");

function enumSchemaForKeys<const Map extends Record<string, string>>(map: Map) {
	const keys = Object.keys(map);
	if (keys.length === 0)
		throw new Error("A compact code map cannot be empty.");
	return z.enum(
		keys as [Extract<keyof Map, string>, ...Extract<keyof Map, string>[]],
	);
}

function decodeCode<
	const Map extends Record<string, string>,
	const Code extends Extract<keyof Map, string>,
>(map: Map, code: Code): Map[Code] {
	return map[code];
}

type CodeForValue<Map extends Record<string, string>, Value> = {
	[Code in Extract<keyof Map, string>]: Map[Code] extends Value
		? Code
		: never;
}[Extract<keyof Map, string>];

function encodeCode<
	const Map extends Record<string, string>,
	const Value extends Map[Extract<keyof Map, string>],
>(map: Map, value: Value): CodeForValue<Map, Value> {
	const entry = Object.entries(map).find(
		([, candidate]) => candidate === value,
	);
	if (!entry) {
		throw new Error(
			`No compact code maps canonical value ${JSON.stringify(value)}.`,
		);
	}
	return entry[0] as CodeForValue<Map, Value>;
}

export const COMPACT_CODE_SCHEMAS = {
	grammarDecision: enumSchemaForKeys(COMPACT_CODE_MAPS.grammarDecision),
	memberOrthography: enumSchemaForKeys(COMPACT_CODE_MAPS.memberOrthography),
	spelling: enumSchemaForKeys(COMPACT_CODE_MAPS.spelling),
	realizationCoverage: enumSchemaForKeys(
		COMPACT_CODE_MAPS.realizationCoverage,
	),
	surfaceKind: enumSchemaForKeys(COMPACT_CODE_MAPS.surfaceKind),
	historicalStatus: enumSchemaForKeys(COMPACT_CODE_MAPS.historicalStatus),
	gender: enumSchemaForKeys(COMPACT_CODE_MAPS.gender),
	hyph: enumSchemaForKeys(COMPACT_CODE_MAPS.hyph),
	case: enumSchemaForKeys(COMPACT_CODE_MAPS.case),
	number: enumSchemaForKeys(COMPACT_CODE_MAPS.number),
	readingDecision: enumSchemaForKeys(COMPACT_CODE_MAPS.readingDecision),
} as const;

const compactHistoricalStatusSchema =
	COMPACT_CODE_SCHEMAS.historicalStatus.nullable();
const compactGenderSchema = COMPACT_CODE_SCHEMAS.gender.nullable();
const compactHyphSchema = COMPACT_CODE_SCHEMAS.hyph.nullable();
const compactCaseSchema = COMPACT_CODE_SCHEMAS.case.nullable();
const compactNumberSchema = COMPACT_CODE_SCHEMAS.number.nullable();

const grammaticalInputKeys = COMPACT_FIELD_KEYS.grammaticalInput;
const grammaticalOutputKeys = COMPACT_FIELD_KEYS.grammaticalOutput;
const grammaticalResolutionKeys = COMPACT_FIELD_KEYS.grammaticalResolution;
const surfaceKeys = COMPACT_FIELD_KEYS.surface;
const inflectionKeys = COMPACT_FIELD_KEYS.inflectionalFeatures;
const lemmaKeys = COMPACT_FIELD_KEYS.lemma;
const readingInputKeys = COMPACT_FIELD_KEYS.readingInput;
const readingOutputKeys = COMPACT_FIELD_KEYS.readingOutput;

const compactCitationCode = encodeCode(
	COMPACT_CODE_MAPS.surfaceKind,
	"Citation",
);
const compactInflectionCode = encodeCode(
	COMPACT_CODE_MAPS.surfaceKind,
	"Inflection",
);

export const compactNounLemmaSchema = z.strictObject({
	[lemmaKeys.canonicalForm]: z.string().min(1),
	[lemmaKeys.gender]: compactGenderSchema,
	[lemmaKeys.hyph]: compactHyphSchema,
});

const compactSurfaceShape = {
	[surfaceKeys.normalizedSurface]: z.string().min(1),
	[surfaceKeys.spelling]: COMPACT_CODE_SCHEMAS.spelling,
	[surfaceKeys.realizationCoverage]: COMPACT_CODE_SCHEMAS.realizationCoverage,
	[surfaceKeys.historicalStatus]: compactHistoricalStatusSchema,
};

export const compactCitationSurfaceSchema = z.strictObject({
	...compactSurfaceShape,
	[surfaceKeys.surfaceKind]: z.literal(compactCitationCode),
	[surfaceKeys.inflectionalFeatures]: z.null(),
});

export const compactInflectionSurfaceSchema = z.strictObject({
	...compactSurfaceShape,
	[surfaceKeys.surfaceKind]: z.literal(compactInflectionCode),
	[surfaceKeys.inflectionalFeatures]: z.strictObject({
		[inflectionKeys.case]: compactCaseSchema,
		[inflectionKeys.number]: compactNumberSchema,
	}),
});

export const compactGrammaticalInputSchema = z.strictObject({
	[grammaticalInputKeys.markedContext]: z.string().min(1),
});

export const compactGrammaticalOutputSchema = z.strictObject({
	[grammaticalOutputKeys.decision]: COMPACT_CODE_SCHEMAS.grammarDecision,
	[grammaticalOutputKeys.resolution]: z
		.strictObject({
			[grammaticalResolutionKeys.memberOrthographies]: z
				.array(COMPACT_CODE_SCHEMAS.memberOrthography)
				.min(1),
			[grammaticalResolutionKeys.surface]: z.discriminatedUnion(
				surfaceKeys.surfaceKind,
				[compactCitationSurfaceSchema, compactInflectionSurfaceSchema],
			),
			[grammaticalResolutionKeys.lemma]: compactNounLemmaSchema,
		})
		.nullable(),
});

export const compactReadingInputSchema = z.strictObject({
	[readingInputKeys.markedContext]: z.string().min(1),
	[readingInputKeys.lemma]: compactNounLemmaSchema,
	[readingInputKeys.existingEmojiDescriptions]: z.array(
		z.string().trim().min(1),
	),
});

export const compactReadingOutputSchema = z.strictObject({
	[readingOutputKeys.decision]: COMPACT_CODE_SCHEMAS.readingDecision,
	[readingOutputKeys.emojiDescription]: z.string().trim().min(1),
});

export const grammaticalInputSchema = z.strictObject({
	markedContext: z.string().min(1),
});

const canonicalNounLemmaSchema = asObjectSchema(
	schemasFor.de.entity.Lemma.Lexeme.NOUN(),
);
const canonicalCitationSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Citation.Lexeme.NOUN(),
);
const canonicalInflectionSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Inflection.Lexeme.NOUN(),
);

const nounLemmaFixedFieldsCodec = codecBuilder4.buildFixedFieldsCodec(
	canonicalNounLemmaSchema,
	{ language: "de", family: "Lexeme", kind: "NOUN" },
);

const compactToModelNounLemmaCodec = z.codec(
	compactNounLemmaSchema,
	nounLemmaFixedFieldsCodec.in,
	{
		decode: (compact) => ({
			canonicalForm: compact.c,
			coreFeatures: {
				gender:
					compact.g === null
						? null
						: decodeCode(COMPACT_CODE_MAPS.gender, compact.g),
				hyph:
					compact.h === null
						? null
						: decodeCode(COMPACT_CODE_MAPS.hyph, compact.h),
			},
		}),
		encode: (model) => ({
			c: model.canonicalForm,
			g:
				model.coreFeatures.gender === null
					? null
					: encodeCode(
							COMPACT_CODE_MAPS.gender,
							model.coreFeatures.gender,
						),
			h:
				model.coreFeatures.hyph === null
					? null
					: encodeCode(
							COMPACT_CODE_MAPS.hyph,
							model.coreFeatures.hyph,
						),
		}),
	},
);

export const compactNounLemmaCodec = codecBuilder4.helpers.pipeCodecs(
	compactToModelNounLemmaCodec,
	nounLemmaFixedFieldsCodec,
);

type CanonicalNounLemma = z.output<typeof canonicalNounLemmaSchema>;

function buildCompactCitationSurfaceCodec(lemma: CanonicalNounLemma) {
	const fixedFieldsCodec = codecBuilder4.buildFixedFieldsCodec(
		canonicalCitationSurfaceSchema,
		{ language: "de", lemma },
	);
	const compactToModelCodec = z.codec(
		compactCitationSurfaceSchema,
		fixedFieldsCodec.in,
		{
			decode: (compact) => ({
				normalizedSurface: compact.n,
				spelling: decodeCode(COMPACT_CODE_MAPS.spelling, compact.p),
				realizationCoverage: decodeCode(
					COMPACT_CODE_MAPS.realizationCoverage,
					compact.r,
				),
				surfaceKind: decodeCode(
					COMPACT_CODE_MAPS.surfaceKind,
					compact.k,
				),
				surfaceFeatures:
					compact.h === null
						? null
						: {
								historicalStatus: decodeCode(
									COMPACT_CODE_MAPS.historicalStatus,
									compact.h,
								),
							},
			}),
			encode: (model) => ({
				n: model.normalizedSurface,
				p: encodeCode(COMPACT_CODE_MAPS.spelling, model.spelling),
				r: encodeCode(
					COMPACT_CODE_MAPS.realizationCoverage,
					model.realizationCoverage,
				),
				k: encodeCode(COMPACT_CODE_MAPS.surfaceKind, model.surfaceKind),
				h:
					model.surfaceFeatures === null ||
					model.surfaceFeatures.historicalStatus === null
						? null
						: encodeCode(
								COMPACT_CODE_MAPS.historicalStatus,
								model.surfaceFeatures.historicalStatus,
							),
				i: null,
			}),
		},
	);
	return codecBuilder4.helpers.pipeCodecs(
		compactToModelCodec,
		fixedFieldsCodec,
	);
}

function buildCompactInflectionSurfaceCodec(lemma: CanonicalNounLemma) {
	const fixedFieldsCodec = codecBuilder4.buildFixedFieldsCodec(
		canonicalInflectionSurfaceSchema,
		{ language: "de", lemma },
	);
	const compactToModelCodec = z.codec(
		compactInflectionSurfaceSchema,
		fixedFieldsCodec.in,
		{
			decode: (compact) => ({
				normalizedSurface: compact.n,
				spelling: decodeCode(COMPACT_CODE_MAPS.spelling, compact.p),
				realizationCoverage: decodeCode(
					COMPACT_CODE_MAPS.realizationCoverage,
					compact.r,
				),
				surfaceKind: decodeCode(
					COMPACT_CODE_MAPS.surfaceKind,
					compact.k,
				),
				surfaceFeatures:
					compact.h === null
						? null
						: {
								historicalStatus: decodeCode(
									COMPACT_CODE_MAPS.historicalStatus,
									compact.h,
								),
							},
				inflectionalFeatures: {
					case:
						compact.i.c === null
							? null
							: decodeCode(COMPACT_CODE_MAPS.case, compact.i.c),
					number:
						compact.i.n === null
							? null
							: decodeCode(COMPACT_CODE_MAPS.number, compact.i.n),
				},
			}),
			encode: (model) => ({
				n: model.normalizedSurface,
				p: encodeCode(COMPACT_CODE_MAPS.spelling, model.spelling),
				r: encodeCode(
					COMPACT_CODE_MAPS.realizationCoverage,
					model.realizationCoverage,
				),
				k: encodeCode(COMPACT_CODE_MAPS.surfaceKind, model.surfaceKind),
				h:
					model.surfaceFeatures === null ||
					model.surfaceFeatures.historicalStatus === null
						? null
						: encodeCode(
								COMPACT_CODE_MAPS.historicalStatus,
								model.surfaceFeatures.historicalStatus,
							),
				i: {
					c:
						model.inflectionalFeatures.case === null
							? null
							: encodeCode(
									COMPACT_CODE_MAPS.case,
									model.inflectionalFeatures.case,
								),
					n:
						model.inflectionalFeatures.number === null
							? null
							: encodeCode(
									COMPACT_CODE_MAPS.number,
									model.inflectionalFeatures.number,
								),
				},
			}),
		},
	);
	return codecBuilder4.helpers.pipeCodecs(
		compactToModelCodec,
		fixedFieldsCodec,
	);
}

const canonicalGrammaticalResolutionSchema = z.union([
	z.strictObject({ decision: z.literal("Unresolved") }),
	z.strictObject({
		decision: z.literal("Resolved"),
		memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(1),
		surface: z.union([
			canonicalCitationSurfaceSchema.omit({ lemma: true }),
			canonicalInflectionSurfaceSchema.omit({ lemma: true }),
		]),
		lemma: canonicalNounLemmaSchema,
	}),
]) satisfies z.ZodType<GrammaticalResolution>;

export const compactGrammaticalInputCodec = z.codec(
	compactGrammaticalInputSchema,
	grammaticalInputSchema,
	{
		decode: (compact) => ({ markedContext: compact.c }),
		encode: (canonical) => ({ c: canonical.markedContext }),
	},
);

export const compactGrammaticalOutputCodec = z.codec(
	compactGrammaticalOutputSchema,
	canonicalGrammaticalResolutionSchema,
	{
		decode: (compact) => {
			const decision = decodeCode(
				COMPACT_CODE_MAPS.grammarDecision,
				compact.d,
			);
			if (decision === "Unresolved") {
				if (compact.r !== null) {
					throw new Error(
						"Compact Unresolved grammar must have r=null.",
					);
				}
				return { decision: "Unresolved" as const };
			}
			if (compact.r === null) {
				throw new Error("Compact Resolved grammar requires r.");
			}
			const lemma = compactNounLemmaCodec.decode(compact.r.l);
			const linkedSurface =
				compact.r.s.k === compactCitationCode
					? buildCompactCitationSurfaceCodec(lemma).decode(
							compact.r.s,
						)
					: buildCompactInflectionSurfaceCodec(lemma).decode(
							compact.r.s,
						);
			const { lemma: _linkedLemma, ...surface } = linkedSurface;
			return {
				decision: "Resolved" as const,
				memberOrthographies: compact.r.o.map((value) =>
					decodeCode(COMPACT_CODE_MAPS.memberOrthography, value),
				),
				surface,
				lemma,
			};
		},
		encode: (canonical) => {
			if (canonical.decision === "Unresolved") {
				return {
					d: encodeCode(
						COMPACT_CODE_MAPS.grammarDecision,
						canonical.decision,
					),
					r: null,
				};
			}
			return {
				d: encodeCode(
					COMPACT_CODE_MAPS.grammarDecision,
					canonical.decision,
				),
				r: {
					o: canonical.memberOrthographies.map((value) =>
						encodeCode(COMPACT_CODE_MAPS.memberOrthography, value),
					),
					s:
						canonical.surface.surfaceKind === "Citation"
							? buildCompactCitationSurfaceCodec(
									canonical.lemma,
								).encode({
									...canonical.surface,
									lemma: canonical.lemma,
								})
							: buildCompactInflectionSurfaceCodec(
									canonical.lemma,
								).encode({
									...canonical.surface,
									lemma: canonical.lemma,
								}),
					l: compactNounLemmaCodec.encode(canonical.lemma),
				},
			};
		},
	},
);

export const readingInputSchema = z.strictObject({
	markedContext: z.string().min(1),
	lemma: canonicalNounLemmaSchema,
	existingEmojiDescriptions: z.array(z.string().trim().min(1)),
});

export const readingOutputSchema = z.strictObject({
	decision: z.enum(["Reuse", "New"]),
	emojiDescription: z.string().trim().min(1),
}) satisfies z.ZodType<ReadingResolution>;

export const compactReadingInputCodec = z.codec(
	compactReadingInputSchema,
	readingInputSchema,
	{
		decode: (compact) => ({
			markedContext: compact.c,
			lemma: compactNounLemmaCodec.decode(compact.l),
			existingEmojiDescriptions: compact.e,
		}),
		encode: (canonical) => ({
			c: canonical.markedContext,
			l: compactNounLemmaCodec.encode(canonical.lemma),
			e: canonical.existingEmojiDescriptions,
		}),
	},
);

export const compactReadingOutputCodec = z.codec(
	compactReadingOutputSchema,
	readingOutputSchema,
	{
		decode: (compact): ReadingResolution => ({
			decision: decodeCode(COMPACT_CODE_MAPS.readingDecision, compact.d),
			emojiDescription: compact.e,
		}),
		encode: (canonical) => ({
			d: encodeCode(
				COMPACT_CODE_MAPS.readingDecision,
				canonical.decision,
			),
			e: canonical.emojiDescription,
		}),
	},
);
