import { z } from "zod";
import {
	emojiDescriptionError,
	fusedMemberError,
	fusionError,
	hasMarkedFeature,
	isEmojiDescription,
	isFusedMember,
	isFusion,
	isSayingCanonicalForm,
	isVariantTagCombination,
	isVariantTagList,
	nonEmptyFeatureBagError,
	normalizeEmojiDescription,
	normalizeForm,
	sayingCanonicalFormError,
	variantTagCombinationError,
	variantTagListError,
	variantTagOrder,
} from "../validation/semantics.js";

export const UnitKindSchema = z.enum([
	"Lemma",
	"Surface",
	"Reading",
	"Attestation",
]);

export const normalizedFormSchema = z.string().overwrite(normalizeForm).min(1);
/** A Saying is written as a sentence without final punctuation (ADR 0039). */
const sayingCanonicalFormSchema = normalizedFormSchema.refine(
	isSayingCanonicalForm,
	{ error: sayingCanonicalFormError },
);
export const emojiDescriptionSchema = z
	.string()
	.overwrite(normalizeEmojiDescription)
	.min(1)
	.refine(isEmojiDescription, { error: emojiDescriptionError });
export const indexSchema = z.number().int().nonnegative();
const fusionComponentSchema = z.strictObject({
	span: z.string(),
	surface: z.string().min(1),
});
/**
 * A written word holding several words (ADR 0035): its spelling and the
 * ordered components it stands for. Each component spells its letters of the
 * word; a component with no letters of its own, such as the hidden article in
 * Hebrew `בבית`, has an empty span.
 */
const fusionSchema = z
	.strictObject({
		spelling: z.string().min(1),
		components: z.tuple(
			[fusionComponentSchema, fusionComponentSchema],
			fusionComponentSchema,
		),
	})
	.refine(isFusion, { error: fusionError });
/**
 * A `Fused` member is one piece of a fused word and names the Fusion
 * component it realizes; `Shorthand` is a standalone shortened spelling of
 * one word (`'ne`, `z.B.`). Neither carries anything else (ADR 0035).
 */
export const memberSchema = z.union([
	z.strictObject({
		attested: z.string().min(1),
		orthography: z.enum(["Standard", "Typo", "Shorthand"]),
	}),
	z
		.strictObject({
			attested: z.string().min(1),
			orthography: z.literal("Fused"),
			fusion: fusionSchema,
			component: indexSchema,
		})
		.refine(isFusedMember, { error: fusedMemberError }),
]);
/**
 * Where a Head's article is attested (ADR 0035, ADR 0040): an owned member of
 * the Head's Attestation, a shared article it does not own (`der Aufstieg und
 * Abstieg`), or a Fusion component with no letters of its own (Hebrew
 * `בבית`).
 */
export const articleEvidenceSchema = z.union([
	z.strictObject({ kind: z.literal("Owned"), member: indexSchema }),
	z.strictObject({ kind: z.literal("Shared"), article: memberSchema }),
	z.strictObject({
		kind: z.literal("Hidden"),
		fusion: fusionSchema,
		component: indexSchema,
	}),
]);
/**
 * Why a Variant differs from the Lemma's standard spelling (ADR 0041, amended
 * 2026-09-29): accepted by a current standard (`zwo`, `auf Grund`, British
 * `colour`), valid under an earlier standard (`daß`, `Photographie`), a
 * dialect or regional form (`nit`, `nedd`), or letters stretched for effect
 * (`ohhh`, `boahhh`). The declaration order is the tags' canonical order.
 */
export const VariantTagSchema = z.enum(variantTagOrder);
/**
 * How a Surface is spelled: the Lemma's standard spelling, or a Variant, any
 * other spelling of the same Lemma that is not a mistake (a mistake is a Typo
 * member). A Variant names every tag that applies, because the tags answer
 * different questions: Swiss `Strasse` is Licensed and Regional, `nit` in a
 * 17th-century text Historical and Regional, `neeee` in a Swabian chat
 * Regional and Expressive. The tags are distinct, in canonical order, and
 * never both Licensed and Historical.
 */
export const spellingSchema = z.union([
	z.strictObject({ kind: z.literal("Canonical") }),
	z
		.strictObject({
			kind: z.literal("Variant"),
			variantTags: z.tuple([VariantTagSchema], VariantTagSchema),
		})
		.refine(isVariantTagList, { error: variantTagListError })
		.refine(isVariantTagCombination, { error: variantTagCombinationError }),
]);
export const surfaceFeaturesSchema = z
	.strictObject({ historicalStatus: z.literal("Archaic").nullable() })
	.refine(hasMarkedFeature, { error: nonEmptyFeatureBagError })
	.nullable();
/** Whether a valency complement names a person, a thing, or either (ADR 0034). */
export const referentSchema = z.enum(["Someone", "Something", "Either"]);

/**
 * A route's Lemma without the Syncretism fields a route may add (system ADR
 * 0046). A route policy builds the ADP Lemma its Preposition complements name
 * from it.
 */
export function plainLemmaSchema<
	L extends string,
	F extends string,
	K extends string,
	C extends z.core.$ZodType,
>(route: { language: L; family: F; kind: K }, core: C) {
	return z.strictObject({
		unitKind: z.literal(UnitKindSchema.enum.Lemma),
		language: z.literal(route.language),
		family: z.literal(route.family),
		kind: z.literal(route.kind),
		canonicalForm:
			route.family === "Saying"
				? sayingCanonicalFormSchema
				: normalizedFormSchema,
		coreFeatures: core,
	});
}
