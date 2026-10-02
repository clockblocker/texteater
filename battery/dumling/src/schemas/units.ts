import { z } from "zod";
import {
	articleAttestationError,
	comparabilitySurfaceError,
	emojiDescriptionError,
	englishValencyAttestationError,
	foreignSurfaceError,
	fusedMemberError,
	fusionError,
	germanAdpositionAttestationError,
	germanClosedClassSurfaceError,
	germanNounSurfaceError,
	germanProperNounSurfaceError,
	germanValencyAttestationError,
	germanVerbalAttestationError,
	germanVerbalSurfaceError,
	hasMarkedFeature,
	hebrewValencyAttestationError,
	isArticleAttestation,
	isComparabilitySurface,
	isEmojiDescription,
	isEnglishValencyAttestation,
	isForeignSurface,
	isFusedMember,
	isFusion,
	isGermanAdpositionAttestation,
	isGermanClosedClassSurface,
	isGermanNounSurface,
	isGermanProperNounSurface,
	isGermanValencyAttestation,
	isGermanVerbalAttestation,
	isGermanVerbalSurface,
	isHebrewValencyAttestation,
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
import {
	isLemmaSyncretism,
	isSyncretismView,
	lemmaSyncretismError,
	syncretismViewError,
} from "../validation/syncretism.js";
import { DeAdpositionFeatureBagsSchema } from "./concrete-language/de/lexeme/adposition.js";
import { EnAdpositionFeatureBagsSchema } from "./concrete-language/en/lexeme/adposition.js";
import { HeAdpositionFeatureBagsSchema } from "./concrete-language/he/lexeme/adposition.js";

export const UnitKindSchema = z.enum([
	"Lemma",
	"Surface",
	"Reading",
	"Attestation",
]);

const normalizedFormSchema = z.string().overwrite(normalizeForm).min(1);
/** A Saying is written as a sentence without final punctuation (ADR 0039). */
const sayingCanonicalFormSchema = normalizedFormSchema.refine(
	isSayingCanonicalForm,
	{ error: sayingCanonicalFormError },
);
const emojiDescriptionSchema = z
	.string()
	.overwrite(normalizeEmojiDescription)
	.min(1)
	.refine(isEmojiDescription, { error: emojiDescriptionError });
const indexSchema = z.number().int().nonnegative();
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
const memberSchema = z.union([
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
const articleEvidenceSchema = z.union([
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
const spellingSchema = z.union([
	z.strictObject({ kind: z.literal("Canonical") }),
	z
		.strictObject({
			kind: z.literal("Variant"),
			variantTags: z.tuple([VariantTagSchema], VariantTagSchema),
		})
		.refine(isVariantTagList, { error: variantTagListError })
		.refine(isVariantTagCombination, { error: variantTagCombinationError }),
]);
const surfaceFeaturesSchema = z
	.strictObject({ historicalStatus: z.literal("Archaic").nullable() })
	.refine(hasMarkedFeature, { error: nonEmptyFeatureBagError })
	.nullable();

/** A Core Feature of the route, named in a Syncretism's `syncretic` list. */
type CoreFeatureName<C extends z.core.$ZodType> = z.ZodEnum<{
	[Name in Extract<keyof z.output<C>, string>]: Name;
}>;
/**
 * A Lemma of a route that allows Syncretisms (system ADR 0046). It is a plain
 * Lemma, a view that adds `syncretic`, or a Syncretism that also holds its
 * units in `syncretized`. The two fields are optional, so the Lemma stays one
 * object schema whose `shape` consumers compose.
 */
type SyncretizableLemmaSchema<
	P extends z.ZodObject,
	C extends z.core.$ZodType,
> = z.ZodObject<
	P["shape"] & {
		syncretic: z.ZodOptional<
			z.ZodTuple<[CoreFeatureName<C>], CoreFeatureName<C>>
		>;
		syncretized: z.ZodOptional<z.ZodTuple<[P, P], P>>;
	},
	z.core.$strict
>;
function syncretizableLemmaSchema(
	plainLemma: z.ZodObject,
	core: z.core.$ZodType,
) {
	const shape = (core as { shape?: unknown }).shape;
	const [first, ...rest] =
		shape !== null && typeof shape === "object" ? Object.keys(shape) : [];
	if (first === undefined)
		throw Error("A Syncretism needs a route whose Core names its features");
	const name = z.enum([first, ...rest]);
	return plainLemma
		.extend({
			syncretic: z.tuple([name], name).optional(),
			syncretized: z
				.tuple([plainLemma, plainLemma], plainLemma)
				.optional(),
		})
		.refine(isSyncretismView, { error: syncretismViewError })
		.refine(isLemmaSyncretism, { error: lemmaSyncretismError });
}

/** Missing inflectional schemas omit the Surface field; present schemas retain their refinements. */
function buildBaseUnitSchemas<
	L extends string,
	F extends string,
	K extends string,
	C extends z.core.$ZodType,
	I extends z.core.$ZodType | undefined,
>(route: { language: L; family: F; kind: K }, core: C, inflectional: I) {
	const PlainLemma = z.strictObject({
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
	// German PRON opts in first: only the referent tells some of its pillar
	// cells apart (system ADR 0046). Other routes reject both fields.
	const syncretizable =
		route.language === "de" &&
		route.family === "Lexeme" &&
		route.kind === "PRON";
	// The conditional type keeps the concrete schema exports exact; runtime
	// construction uses the same route condition.
	const Lemma = (
		syncretizable ? syncretizableLemmaSchema(PlainLemma, core) : PlainLemma
	) as `${L}/${F}/${K}` extends "de/Lexeme/PRON"
		? SyncretizableLemmaSchema<typeof PlainLemma, C>
		: typeof PlainLemma;
	const surfaceShape = {
		unitKind: z.literal(UnitKindSchema.enum.Surface),
		language: z.literal(route.language),
		lemma: Lemma,
		normalizedSurface: normalizedFormSchema,
		spelling: spellingSchema,
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
	// A Foreign Lemma has exactly one Reading, which the Lemma alone
	// identifies, so it carries no Emoji Description (ADR 0045).
	const readingShape = {
		unitKind: z.literal(UnitKindSchema.enum.Reading),
		lemma: Lemma,
	};
	const Reading = z.strictObject({
		...readingShape,
		...(route.family === "Foreign"
			? {}
			: { emojiDescription: emojiDescriptionSchema }),
	}) as z.ZodObject<
		typeof readingShape &
			(F extends "Foreign"
				? Record<never, never>
				: { emojiDescription: typeof emojiDescriptionSchema }),
		z.core.$strict
	>;
	const Attestation = z.strictObject({
		unitKind: z.literal(UnitKindSchema.enum.Attestation),
		surface: Surface,
		members: z.tuple([memberSchema], memberSchema),
		realizationCoverage: z.enum(["Full", "Partial"]),
	});
	return { Lemma, Surface, Reading, Attestation };
}

const germanCaseSchema = z.enum(["Nom", "Acc", "Dat", "Gen"]);
const referentSchema = z.enum(["Someone", "Something", "Either"]);

/**
 * The German valency complements an occurrence can realize (ADR 0034), after
 * E-VALBU: a bare case, or a preposition's ADP Lemma with the case it governs
 * in this construction. `referent` says whether the complement names a
 * person, a thing, or either. The field is `governedCase`, since an
 * Attestation names no Feature Pool feature (ADR 0032). Evidence takes no
 * Adverbial, Predicative or Clause: nothing produces or reads them here.
 */
const germanComplementSchema = z.union([
	z.strictObject({
		kind: z.literal("Case"),
		governedCase: germanCaseSchema,
		referent: referentSchema,
	}),
	z.strictObject({
		kind: z.literal("Preposition"),
		preposition: buildBaseUnitSchemas(
			{ language: "de", family: "Lexeme", kind: "ADP" },
			DeAdpositionFeatureBagsSchema.shape.core,
			undefined,
		).Lemma,
		governedCase: germanCaseSchema.exclude(["Nom"]),
		referent: referentSchema,
	}),
]);

/**
 * The valency slots one occurrence realizes (ADR 0034). `member` indexes the
 * owned member realizing the slot's marker, such as a governed preposition,
 * and is null when no member does. `realizedCase` is the case the occurrence
 * shows.
 */
const valencyEvidenceSchema = z.array(
	z.strictObject({
		member: indexSchema.nullable(),
		complement: germanComplementSchema,
		realizedCase: germanCaseSchema,
	}),
);

/**
 * Hebrew valency complements (ADR 0034), marked by function and preposition
 * with no case: the subject, the direct object, or a governed preposition's
 * ADP Lemma (`סמך על`).
 */
const hebrewComplementSchema = z.union([
	z.strictObject({ kind: z.literal("Subject"), referent: referentSchema }),
	z.strictObject({
		kind: z.literal("DirectObject"),
		referent: referentSchema,
	}),
	z.strictObject({
		kind: z.literal("Preposition"),
		preposition: buildBaseUnitSchemas(
			{ language: "he", family: "Lexeme", kind: "ADP" },
			HeAdpositionFeatureBagsSchema.shape.core,
			undefined,
		).Lemma,
		referent: referentSchema,
	}),
]);

/**
 * The Hebrew valency slots one occurrence realizes, indexed like German
 * evidence. Hebrew marks no case, so a slot records no realized case.
 */
const hebrewValencyEvidenceSchema = z.array(
	z.strictObject({
		member: indexSchema.nullable(),
		complement: hebrewComplementSchema,
	}),
);

/**
 * English valency complements (ADR 0034), marked by position and preposition
 * with no case: the subject, the direct object, the indirect object (`him` in
 * `give him a book`), or a governed preposition's ADP Lemma (`depend on`).
 */
const englishComplementSchema = z.union([
	z.strictObject({ kind: z.literal("Subject"), referent: referentSchema }),
	z.strictObject({
		kind: z.literal("DirectObject"),
		referent: referentSchema,
	}),
	z.strictObject({
		kind: z.literal("IndirectObject"),
		referent: referentSchema,
	}),
	z.strictObject({
		kind: z.literal("Preposition"),
		preposition: buildBaseUnitSchemas(
			{ language: "en", family: "Lexeme", kind: "ADP" },
			EnAdpositionFeatureBagsSchema.shape.core,
			undefined,
		).Lemma,
		referent: referentSchema,
	}),
]);

/**
 * The English valency slots one occurrence realizes, indexed like German
 * evidence. English marks no case, so a slot records no realized case.
 */
const englishValencyEvidenceSchema = z.array(
	z.strictObject({
		member: indexSchema.nullable(),
		complement: englishComplementSchema,
	}),
);

/**
 * Composition stores grammatical features; source evidence belongs to the
 * Attestation. A German or English Head that can open a phrase (NOUN, PROPN,
 * ADJ, NUM, PRON) and a Hebrew noun, proper noun or adjective name where
 * their article is attested (ADR 0035, ADR 0040). A German verbal
 * Attestation names its owned subject-expletive member as evidence (ADR
 * 0022). Every German governor (a Lexeme or Locution VERB, ADJ or NOUN, and
 * AUX) names the valency slots it realizes, such as its governed preposition
 * member (ADR 0034). A German ADP Attestation, Lexeme or Locution, records the
 * case its complement took as its one bare-case slot, and no position;
 * dumspec checks the case against the ADP Case Table. A Hebrew or English governor (a Lexeme or Locution VERB,
 * ADJ or NOUN) may name the slots it realizes, with no case. A Locution route
 * is a governor where the Lexeme route of its Kind is (ADR 0039); the Kind
 * alone never decides, since Lexeme and Locution share Kind names.
 */
export function buildUnitSchemas<
	L extends string,
	F extends string,
	K extends string,
	C extends z.core.$ZodType,
	I extends z.core.$ZodType | undefined,
>(route: { language: L; family: F; kind: K }, core: C, inflectional: I) {
	const base = buildBaseUnitSchemas(route, core, inflectional);
	const noun =
		route.language === "de" &&
		route.family === "Lexeme" &&
		route.kind === "NOUN";
	const properNoun =
		route.language === "de" &&
		route.family === "Lexeme" &&
		route.kind === "PROPN";
	const articleOwner =
		route.family === "Lexeme" &&
		(route.language === "he"
			? ["NOUN", "PROPN", "ADJ"].includes(route.kind)
			: ["de", "en"].includes(route.language) &&
				["NOUN", "PROPN", "ADJ", "NUM", "PRON"].includes(route.kind));
	const lexemeOrLocution =
		route.family === "Lexeme" || route.family === "Locution";
	const verbal =
		route.language === "de" &&
		((route.family === "Lexeme" && ["VERB", "AUX"].includes(route.kind)) ||
			(route.family === "Locution" && route.kind === "VERB"));
	const adposition =
		route.language === "de" && lexemeOrLocution && route.kind === "ADP";
	const adnominalGovernor =
		route.language === "de" &&
		lexemeOrLocution &&
		["ADJ", "NOUN"].includes(route.kind);
	const caselessGovernor =
		lexemeOrLocution && ["VERB", "ADJ", "NOUN"].includes(route.kind);
	const hebrewGovernor = route.language === "he" && caselessGovernor;
	const englishGovernor = route.language === "en" && caselessGovernor;
	// Comparability decides Degree on German and English ADV and ADJ (ADR 0042).
	const comparability =
		["de", "en"].includes(route.language) &&
		lexemeOrLocution &&
		["ADV", "ADJ"].includes(route.kind);
	const closedClass =
		route.language === "de" &&
		lexemeOrLocution &&
		["PRON", "DET"].includes(route.kind);
	let Surface = base.Surface;
	if (route.family === "Foreign")
		Surface = Surface.refine(isForeignSurface, {
			error: foreignSurfaceError,
		});
	if (comparability)
		Surface = Surface.refine(isComparabilitySurface, {
			error: comparabilitySurfaceError,
		});
	if (closedClass)
		Surface = Surface.refine(isGermanClosedClassSurface, {
			error: germanClosedClassSurfaceError,
		});
	if (noun)
		Surface = Surface.refine(isGermanNounSurface, {
			error: germanNounSurfaceError,
		});
	if (properNoun)
		Surface = Surface.refine(isGermanProperNounSurface, {
			error: germanProperNounSurfaceError,
		});
	if (verbal)
		Surface = Surface.refine(isGermanVerbalSurface, {
			error: germanVerbalSurfaceError,
		});
	let Attestation = base.Attestation.extend({
		surface: Surface,
		...(articleOwner
			? { articleEvidence: articleEvidenceSchema.nullable() }
			: {}),
		...(verbal
			? {
					expletiveEvidence: memberSchema.nullable(),
					valencyEvidence: valencyEvidenceSchema,
				}
			: {}),
		...(adposition || adnominalGovernor
			? { valencyEvidence: valencyEvidenceSchema }
			: {}),
		...(hebrewGovernor
			? { valencyEvidence: hebrewValencyEvidenceSchema.optional() }
			: {}),
		...(englishGovernor
			? { valencyEvidence: englishValencyEvidenceSchema.optional() }
			: {}),
	}) as unknown as z.ZodObject<
		Omit<typeof base.Attestation.shape, "surface"> & {
			surface: typeof Surface;
		} & (F extends "Lexeme"
				? `${L}/${K}` extends
						| `${"de" | "en"}/${"NOUN" | "PROPN" | "ADJ" | "NUM" | "PRON"}`
						| `he/${"NOUN" | "PROPN" | "ADJ"}`
					? {
							articleEvidence: z.ZodNullable<
								typeof articleEvidenceSchema
							>;
						}
					: Record<never, never>
				: Record<never, never>) &
			(L extends "de"
				? `${F}/${K}` extends
						| "Lexeme/VERB"
						| "Lexeme/AUX"
						| "Locution/VERB"
					? {
							expletiveEvidence: z.ZodNullable<
								typeof memberSchema
							>;
							valencyEvidence: typeof valencyEvidenceSchema;
						}
					: Record<never, never>
				: Record<never, never>) &
			(L extends "de"
				? `${F}/${K}` extends
						| "Lexeme/ADP"
						| "Locution/ADP"
						| "Lexeme/ADJ"
						| "Lexeme/NOUN"
						| "Locution/ADJ"
						| "Locution/NOUN"
					? { valencyEvidence: typeof valencyEvidenceSchema }
					: Record<never, never>
				: Record<never, never>) &
			(L extends "he"
				? `${F}/${K}` extends
						| "Lexeme/VERB"
						| "Lexeme/ADJ"
						| "Lexeme/NOUN"
						| "Locution/VERB"
						| "Locution/ADJ"
						| "Locution/NOUN"
					? {
							valencyEvidence: z.ZodOptional<
								typeof hebrewValencyEvidenceSchema
							>;
						}
					: Record<never, never>
				: Record<never, never>) &
			(L extends "en"
				? `${F}/${K}` extends
						| "Lexeme/VERB"
						| "Lexeme/ADJ"
						| "Lexeme/NOUN"
						| "Locution/VERB"
						| "Locution/ADJ"
						| "Locution/NOUN"
					? {
							valencyEvidence: z.ZodOptional<
								typeof englishValencyEvidenceSchema
							>;
						}
					: Record<never, never>
				: Record<never, never>)
	>;
	if (articleOwner)
		Attestation = Attestation.refine(isArticleAttestation, {
			error: articleAttestationError,
		});
	if (adnominalGovernor)
		Attestation = Attestation.refine(isGermanValencyAttestation, {
			error: germanValencyAttestationError,
		});
	if (hebrewGovernor)
		Attestation = Attestation.refine(isHebrewValencyAttestation, {
			error: hebrewValencyAttestationError,
		});
	if (englishGovernor)
		Attestation = Attestation.refine(isEnglishValencyAttestation, {
			error: englishValencyAttestationError,
		});
	if (verbal)
		Attestation = Attestation.refine(isGermanVerbalAttestation, {
			error: germanVerbalAttestationError,
		});
	if (adposition)
		Attestation = Attestation.refine(isGermanAdpositionAttestation, {
			error: germanAdpositionAttestationError,
		});
	return { Lemma: base.Lemma, Surface, Reading: base.Reading, Attestation };
}
