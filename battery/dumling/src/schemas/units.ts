import { z } from "zod";
import {
	emojiDescriptionError,
	germanNounAttestationError,
	germanNounSurfaceError,
	hasMarkedFeature,
	isEmojiDescription,
	isGermanNounAttestation,
	isGermanNounSurface,
	nonEmptyFeatureBagError,
	normalizeForm,
} from "../validation/semantics.js";
import type { DeDeterminerFeatureBagsSchema } from "./concrete-language/de/lexeme/determiner.js";

export const UnitKindSchema = z.enum([
	"Lemma",
	"Surface",
	"Reading",
	"Attestation",
]);

const normalizedFormSchema = z.string().overwrite(normalizeForm).min(1);
const emojiDescriptionSchema = normalizedFormSchema.refine(isEmojiDescription, {
	error: emojiDescriptionError,
});
const memberSchema = z.strictObject({
	attested: z.string().min(1),
	orthography: z.enum(["Standard", "Typo"]),
});
const surfaceFeaturesSchema = z
	.strictObject({ historicalStatus: z.literal("Archaic").nullable() })
	.refine(hasMarkedFeature, { error: nonEmptyFeatureBagError })
	.nullable();

/** Missing inflectional schemas omit the Surface field; present schemas retain their refinements. */
function buildBaseUnitSchemas<
	L extends string,
	F extends string,
	K extends string,
	C extends z.core.$ZodType,
	I extends z.core.$ZodType | undefined,
>(route: { language: L; family: F; kind: K }, core: C, inflectional: I) {
	const Lemma = z.strictObject({
		unitKind: z.literal(UnitKindSchema.enum.Lemma),
		language: z.literal(route.language),
		family: z.literal(route.family),
		kind: z.literal(route.kind),
		canonicalForm: normalizedFormSchema,
		coreFeatures: core,
	});
	const surfaceShape = {
		unitKind: z.literal(UnitKindSchema.enum.Surface),
		language: z.literal(route.language),
		lemma: Lemma,
		normalizedSurface: normalizedFormSchema,
		spelling: z.enum(["Canonical", "Variant"]),
		surfaceFeatures: surfaceFeaturesSchema,
	};
	// The conditional type preserves field presence for concrete schema callers.
	// Runtime construction uses the same inflectional-schema condition.
	const Surface = z.strictObject({
		...surfaceShape,
		...(inflectional === undefined
			? {}
			: { inflectionalFeatures: z.nullable(inflectional) }),
	}) as z.ZodObject<
		typeof surfaceShape &
			(I extends z.core.$ZodType
				? { inflectionalFeatures: z.ZodNullable<I> }
				: Record<never, never>),
		z.core.$strict
	>;
	const Reading = z.strictObject({
		unitKind: z.literal(UnitKindSchema.enum.Reading),
		lemma: Lemma,
		emojiDescription: emojiDescriptionSchema,
	});
	const Attestation = z.strictObject({
		unitKind: z.literal(UnitKindSchema.enum.Attestation),
		surface: Surface,
		members: z.tuple([memberSchema], memberSchema),
		realizationCoverage: z.enum(["Full", "Partial"]),
	});
	return { Lemma, Surface, Reading, Attestation };
}

function buildArticleReferenceSchema(
	bags: typeof DeDeterminerFeatureBagsSchema,
) {
	const units = buildBaseUnitSchemas(
		{ language: "de", family: "Lexeme", kind: "DET" },
		bags.shape.core,
		bags.shape.inflectional,
	);
	return z.strictObject({ surface: units.Surface, reading: units.Reading });
}

/** A noun owns one reusable article analysis; occurrence evidence stays on its Attestation. */
export function buildUnitSchemas<
	L extends string,
	F extends string,
	K extends string,
	C extends z.core.$ZodType,
	I extends z.core.$ZodType | undefined,
>(
	route: { language: L; family: F; kind: K },
	core: C,
	inflectional: I,
	articleBags?: typeof DeDeterminerFeatureBagsSchema,
) {
	const base = buildBaseUnitSchemas(route, core, inflectional);
	const noun =
		route.language === "de" &&
		route.family === "Lexeme" &&
		route.kind === "NOUN";
	if (noun && !articleBags)
		throw new Error(
			"German noun schemas require their DET component schema",
		);
	const articleReference = articleBags
		? buildArticleReferenceSchema(articleBags).nullable()
		: undefined;
	let Surface = base.Surface.extend(
		noun && articleReference ? { articleReference } : {},
	) as z.ZodObject<
		typeof base.Surface.shape &
			(L extends "de"
				? F extends "Lexeme"
					? K extends "NOUN"
						? {
								articleReference: z.ZodNullable<
									ReturnType<
										typeof buildArticleReferenceSchema
									>
								>;
							}
						: Record<never, never>
					: Record<never, never>
				: Record<never, never>)
	>;
	if (noun)
		Surface = Surface.refine(isGermanNounSurface, {
			error: germanNounSurfaceError,
		});
	let Attestation = base.Attestation.extend({
		surface: Surface,
		...(noun ? { articleEvidence: memberSchema.nullable() } : {}),
	}) as unknown as z.ZodObject<
		Omit<typeof base.Attestation.shape, "surface"> & {
			surface: typeof Surface;
		} & (L extends "de"
				? F extends "Lexeme"
					? K extends "NOUN"
						? {
								articleEvidence: z.ZodNullable<
									typeof memberSchema
								>;
							}
						: Record<never, never>
					: Record<never, never>
				: Record<never, never>)
	>;
	if (noun)
		Attestation = Attestation.refine(isGermanNounAttestation, {
			error: germanNounAttestationError,
		});
	return { Lemma: base.Lemma, Surface, Reading: base.Reading, Attestation };
}
