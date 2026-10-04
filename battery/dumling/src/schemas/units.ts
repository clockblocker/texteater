import { z } from "zod";
import {
	articleAttestationError,
	caselessValencyAttestationError,
	comparabilitySurfaceError,
	emojiDescriptionError,
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
	isArticleAttestation,
	isCaselessValencyAttestation,
	isComparabilitySurface,
	isEmojiDescription,
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
	isSurfaceSyncretism,
	isSurfaceSyncretismView,
	isSyncretismView,
	lemmaSyncretismError,
	surfaceSyncretismError,
	surfaceSyncretismViewError,
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

/** A feature of a route's feature bag, named in a Syncretism's `syncretic` list. */
type FeatureName<C extends z.core.$ZodType> = z.ZodEnum<{
	[Name in Extract<keyof z.output<C>, string>]: Name;
}>;
/** The feature names of a feature bag schema, for a Syncretism's `syncretic` list. */
function featureNameSchema(bag: z.core.$ZodType) {
	const shape = (bag as { shape?: unknown }).shape;
	const [first, ...rest] =
		shape !== null && typeof shape === "object" ? Object.keys(shape) : [];
	if (first === undefined)
		throw Error("A Syncretism needs a route whose features are named");
	return z.enum([first, ...rest]);
}
/**
 * Each route condition of the unit schemas, stated once as the
 * `language/Family/Kind` keys of the routes it holds for. The runtime schemas
 * test a route with `holds`, and their types read the same lists through
 * `RoutesOf`, so the two cannot disagree.
 */
const routeConditions = {
	/**
	 * German PRON opts in first: only the referent tells some of its pillar
	 * cells, and some of a stem's Surfaces, apart (system ADR 0046). Other
	 * routes reject both fields.
	 */
	syncretism: ["de/Lexeme/PRON"],
	foreign: ["de/Foreign/Foreign", "en/Foreign/Foreign", "he/Foreign/Foreign"],
	germanNoun: ["de/Lexeme/NOUN"],
	germanProperNoun: ["de/Lexeme/PROPN"],
	lexemeArticleOwner: [
		"de/Lexeme/NOUN",
		"de/Lexeme/PROPN",
		"de/Lexeme/ADJ",
		"de/Lexeme/NUM",
		"de/Lexeme/PRON",
		"en/Lexeme/NOUN",
		"en/Lexeme/PROPN",
		"en/Lexeme/ADJ",
		"en/Lexeme/NUM",
		"en/Lexeme/PRON",
		"he/Lexeme/NOUN",
		"he/Lexeme/PROPN",
		"he/Lexeme/ADJ",
	],
	// A NOUN Locution heads its phrase and owns its article as a Lexeme NOUN
	// does (ADR 0040, amended 2026-10-02).
	locutionArticleOwner: ["de/Locution/NOUN", "en/Locution/NOUN"],
	germanVerbal: ["de/Lexeme/VERB", "de/Lexeme/AUX", "de/Locution/VERB"],
	germanAdposition: ["de/Lexeme/ADP", "de/Locution/ADP"],
	germanAdnominalGovernor: [
		"de/Lexeme/ADJ",
		"de/Lexeme/NOUN",
		"de/Locution/ADJ",
		"de/Locution/NOUN",
	],
	hebrewGovernor: [
		"he/Lexeme/VERB",
		"he/Lexeme/ADJ",
		"he/Lexeme/NOUN",
		"he/Locution/VERB",
		"he/Locution/ADJ",
		"he/Locution/NOUN",
	],
	englishGovernor: [
		"en/Lexeme/VERB",
		"en/Lexeme/ADJ",
		"en/Lexeme/NOUN",
		"en/Locution/VERB",
		"en/Locution/ADJ",
		"en/Locution/NOUN",
	],
	// Comparability decides Degree on German and English ADV and ADJ (ADR 0042).
	comparability: [
		"de/Lexeme/ADV",
		"de/Lexeme/ADJ",
		"de/Locution/ADV",
		"de/Locution/ADJ",
		"en/Lexeme/ADV",
		"en/Lexeme/ADJ",
		"en/Locution/ADV",
		"en/Locution/ADJ",
	],
	germanClosedClass: [
		"de/Lexeme/PRON",
		"de/Lexeme/DET",
		"de/Locution/PRON",
		"de/Locution/DET",
	],
} as const;
type RouteCondition = keyof typeof routeConditions;
/** The keys of the routes a route condition holds for. */
type RoutesOf<Condition extends RouteCondition> =
	(typeof routeConditions)[Condition][number];
/** Whether a route condition holds for the route `key` names. */
function holds(condition: RouteCondition, key: string): boolean {
	const routes: readonly string[] = routeConditions[condition];
	return routes.includes(key);
}
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
		syncretic: z.ZodOptional<z.ZodTuple<[FeatureName<C>], FeatureName<C>>>;
		syncretized: z.ZodOptional<z.ZodTuple<[P, P], P>>;
	},
	z.core.$strict
>;
function syncretizableLemmaSchema<
	P extends z.ZodObject,
	C extends z.core.$ZodType,
>(plainLemma: P, core: C): SyncretizableLemmaSchema<P, C> {
	const name = featureNameSchema(core);
	return plainLemma
		.extend({
			syncretic: z.tuple([name], name).optional(),
			syncretized: z
				.tuple([plainLemma, plainLemma], plainLemma)
				.optional(),
		})
		.refine(isSyncretismView, { error: syncretismViewError })
		.refine(isLemmaSyncretism, {
			error: lemmaSyncretismError,
		}) as SyncretizableLemmaSchema<P, C>;
}
/**
 * A Surface of a route that allows Syncretisms (system ADR 0046), shaped as
 * its Lemma is: a plain Surface, a view whose `syncretic` list names the
 * inflectional features it leaves open, or a Syncretism that also holds its
 * Surfaces in `syncretized`. Each unit passes the route's Surface checks.
 */
type SyncretizableSurfaceSchema<
	P extends z.ZodObject,
	I extends z.core.$ZodType,
> = z.ZodObject<
	P["shape"] & {
		syncretic: z.ZodOptional<z.ZodTuple<[FeatureName<I>], FeatureName<I>>>;
		syncretized: z.ZodOptional<z.ZodTuple<[P, P], P>>;
	},
	z.core.$strict
>;
function syncretizableSurfaceSchema<
	P extends z.ZodObject,
	I extends z.core.$ZodType,
>(
	plainSurface: P,
	inflectional: I | undefined,
	refine: <S extends z.ZodObject>(schema: S) => S,
): SyncretizableSurfaceSchema<P, I> {
	if (inflectional === undefined)
		throw Error(
			"A Surface Syncretism needs a route with inflectional features",
		);
	const name = featureNameSchema(inflectional);
	const unit = refine(plainSurface);
	return refine(
		z.strictObject({
			...plainSurface.shape,
			syncretic: z.tuple([name], name).optional(),
			syncretized: z.tuple([unit, unit], unit).optional(),
		}),
	)
		.refine(isSurfaceSyncretismView, { error: surfaceSyncretismViewError })
		.refine(isSurfaceSyncretism, {
			error: surfaceSyncretismError,
		}) as SyncretizableSurfaceSchema<P, I>;
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
	const key = `${route.language}/${route.family}/${route.kind}` as const;
	// The type picks the branch the runtime picks, from the same route list.
	const Lemma = (
		holds("syncretism", key)
			? syncretizableLemmaSchema(PlainLemma, core)
			: PlainLemma
	) as typeof key extends RoutesOf<"syncretism">
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
		...(holds("foreign", key)
			? {}
			: { emojiDescription: emojiDescriptionSchema }),
	}) as z.ZodObject<
		typeof readingShape &
			(typeof key extends RoutesOf<"foreign">
				? Record<never, never>
				: { emojiDescription: typeof emojiDescriptionSchema }),
		z.core.$strict
	>;
	return { key, Lemma, Surface, Reading };
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
 * The Attestation's evidence fields, in field order, each with its schema on
 * the routes of every route condition that adds it. No route meets two
 * conditions that add one field.
 */
const attestationEvidence = {
	articleEvidence: {
		lexemeArticleOwner: articleEvidenceSchema.nullable(),
		// Optional, so Attestations recorded before a NOUN Locution owned its
		// article stay valid.
		locutionArticleOwner: articleEvidenceSchema.nullable().optional(),
	},
	expletiveEvidence: { germanVerbal: memberSchema.nullable() },
	valencyEvidence: {
		germanVerbal: valencyEvidenceSchema,
		germanAdposition: valencyEvidenceSchema,
		germanAdnominalGovernor: valencyEvidenceSchema,
		hebrewGovernor: hebrewValencyEvidenceSchema.optional(),
		englishGovernor: englishValencyEvidenceSchema.optional(),
	},
} satisfies Record<string, { [Condition in RouteCondition]?: unknown }>;
type AttestationEvidence = typeof attestationEvidence;
/** The route condition under which `Entry` gives the route `Key` names a field. */
type HeldCondition<Key extends string, Entry> = {
	[Condition in keyof Entry & RouteCondition]: Key extends RoutesOf<Condition>
		? Condition
		: never;
}[keyof Entry & RouteCondition];
/** A route's evidence field `Field`, or no such field where no condition adds it. */
type EvidenceField<
	Key extends string,
	Field extends keyof AttestationEvidence,
	Held = HeldCondition<Key, AttestationEvidence[Field]>,
> = [Held] extends [never]
	? Record<never, never>
	: {
			[Name in Field]: AttestationEvidence[Field][Held &
				keyof AttestationEvidence[Field]];
		};
/** The evidence field `Field` of the route `key` names, read from the same table as its type. */
function evidenceField<
	Key extends string,
	Field extends keyof AttestationEvidence,
>(key: Key, field: Field) {
	const entry: Record<string, unknown> = attestationEvidence[field];
	const held = Object.keys(entry).find((condition) =>
		holds(condition as RouteCondition, key),
	);
	return (
		held === undefined ? {} : { [field]: entry[held] }
	) as EvidenceField<Key, Field>;
}

/** A route's check on one unit, with the error it reports. */
type Check = [(input: unknown) => boolean, () => string];
/** The schema with each check refined onto it, in order. */
function withChecks<S extends z.ZodObject>(
	schema: S,
	checks: readonly Check[],
): S {
	return checks.reduce(
		(refined, [check, error]) => refined.refine(check, { error }),
		schema,
	);
}

/**
 * Composition stores grammatical features; source evidence belongs to the
 * Attestation. A German or English Head that can open a phrase (NOUN, PROPN,
 * ADJ, NUM, PRON) and a Hebrew noun, proper noun or adjective name where
 * their article is attested (ADR 0035, ADR 0040); so may a German or English
 * NOUN Locution, the Head of its phrase (ADR 0040, amended 2026-10-02). A German verbal
 * Attestation names its owned subject-expletive member as evidence (ADR
 * 0022). Every German governor (a Lexeme or Locution VERB, ADJ or NOUN, and
 * AUX) names the valency slots it realizes, such as its governed preposition
 * member (ADR 0034). A German ADP Attestation, Lexeme or Locution, records the
 * case its complement took as its one bare-case slot, and no position;
 * dumcorpus checks the case against the ADP Case Table. A Hebrew or English governor (a Lexeme or Locution VERB,
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
	const { key } = base;
	const surfaceChecks: Check[] = [];
	if (holds("foreign", key))
		surfaceChecks.push([isForeignSurface, foreignSurfaceError]);
	if (holds("comparability", key))
		surfaceChecks.push([isComparabilitySurface, comparabilitySurfaceError]);
	if (holds("germanClosedClass", key))
		surfaceChecks.push([
			isGermanClosedClassSurface,
			germanClosedClassSurfaceError,
		]);
	if (holds("germanNoun", key))
		surfaceChecks.push([isGermanNounSurface, germanNounSurfaceError]);
	if (holds("germanProperNoun", key))
		surfaceChecks.push([
			isGermanProperNounSurface,
			germanProperNounSurfaceError,
		]);
	if (holds("germanVerbal", key))
		surfaceChecks.push([isGermanVerbalSurface, germanVerbalSurfaceError]);
	const refineSurface = <S extends z.ZodObject>(schema: S): S =>
		withChecks(schema, surfaceChecks);
	const Surface = (
		holds("syncretism", key)
			? syncretizableSurfaceSchema<typeof base.Surface, NonNullable<I>>(
					base.Surface,
					inflectional,
					refineSurface,
				)
			: refineSurface(base.Surface)
	) as typeof key extends RoutesOf<"syncretism">
		? SyncretizableSurfaceSchema<typeof base.Surface, NonNullable<I>>
		: typeof base.Surface;
	const attestationChecks: Check[] = [];
	if (holds("lexemeArticleOwner", key) || holds("locutionArticleOwner", key))
		attestationChecks.push([isArticleAttestation, articleAttestationError]);
	if (holds("germanAdnominalGovernor", key))
		attestationChecks.push([
			isGermanValencyAttestation,
			germanValencyAttestationError,
		]);
	if (holds("hebrewGovernor", key) || holds("englishGovernor", key))
		attestationChecks.push([
			isCaselessValencyAttestation,
			caselessValencyAttestationError,
		]);
	if (holds("germanVerbal", key))
		attestationChecks.push([
			isGermanVerbalAttestation,
			germanVerbalAttestationError,
		]);
	if (holds("germanAdposition", key))
		attestationChecks.push([
			isGermanAdpositionAttestation,
			germanAdpositionAttestationError,
		]);
	const Attestation = withChecks(
		z.strictObject({
			unitKind: z.literal(UnitKindSchema.enum.Attestation),
			surface: Surface,
			members: z.tuple([memberSchema], memberSchema),
			realizationCoverage: z.enum(["Full", "Partial"]),
			...evidenceField(key, "articleEvidence"),
			...evidenceField(key, "expletiveEvidence"),
			...evidenceField(key, "valencyEvidence"),
		}),
		attestationChecks,
	);
	return { Lemma: base.Lemma, Surface, Reading: base.Reading, Attestation };
}

/**
 * The unit schemas of a route that codegen discovers at runtime, whose
 * coordinates are only strings, so their types cannot be exact.
 */
export function buildDiscoveredUnitSchemas(
	route: { language: string; family: string; kind: string },
	core: z.core.$ZodType,
	inflectional: z.core.$ZodType | undefined,
): Record<z.infer<typeof UnitKindSchema>, z.ZodObject> {
	return buildUnitSchemas(route, core, inflectional);
}
