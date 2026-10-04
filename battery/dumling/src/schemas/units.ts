import { z } from "zod";
import {
	articleAttestationError,
	comparabilitySurfaceError,
	foreignSurfaceError,
	isArticleAttestation,
	isComparabilitySurface,
	isForeignSurface,
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
import { routePolicies } from "./concrete-language/route-policies.js";
import type { Check } from "./route-policy.js";
import {
	articleEvidenceSchema,
	emojiDescriptionSchema,
	memberSchema,
	normalizedFormSchema,
	plainLemmaSchema,
	spellingSchema,
	surfaceFeaturesSchema,
	UnitKindSchema,
} from "./unit-parts.js";

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
 * Each language's route policy states its route conditions beside its
 * concrete routes, as the `language/Family/Kind` keys of the routes each
 * holds for. The runtime schemas test a route with `holds`, and their types
 * read the same lists through `RoutesOf`, so the two cannot disagree.
 */
type RoutePolicies = typeof routePolicies;
type Conditions = {
	[L in keyof RoutePolicies]: RoutePolicies[L]["conditions"];
};
type RouteCondition = {
	[L in keyof Conditions]: keyof Conditions[L];
}[keyof Conditions];
/** The keys of the routes a route condition holds for, in every language. */
type RoutesOf<Condition extends RouteCondition> = {
	[L in keyof Conditions]: Conditions[L] extends Record<
		Condition,
		readonly (infer Key)[]
	>
		? Key
		: never;
}[keyof Conditions];
/** The route policy of the language `key` names. */
function policyOf(key: string) {
	const language = key.slice(0, key.indexOf("/"));
	const policy = Object.values(routePolicies).find(
		(candidate) => candidate.language === language,
	);
	if (policy === undefined) throw Error(`No route policy for route ${key}`);
	return policy;
}
/** Whether a route condition holds for the route `key` names. */
function holds(condition: RouteCondition, key: string): boolean {
	const conditions: Partial<Record<string, readonly string[]>> =
		policyOf(key).conditions;
	return conditions[condition]?.includes(key) ?? false;
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
	const PlainLemma = plainLemmaSchema(route, core);
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

const { de, en, he } = routePolicies;
/**
 * The Attestation's evidence fields, in field order, each with its schema on
 * the routes of every route condition that adds it. A language's route policy
 * adds its own; no route meets two conditions that add one field.
 */
const attestationEvidence = {
	articleEvidence: {
		lexemeArticleOwner: articleEvidenceSchema.nullable(),
		// Optional, so Attestations recorded before a NOUN Locution owned its
		// article stay valid.
		locutionArticleOwner: articleEvidenceSchema.nullable().optional(),
	},
	expletiveEvidence: { ...de.attestationEvidence.expletiveEvidence },
	valencyEvidence: {
		...de.attestationEvidence.valencyEvidence,
		...he.attestationEvidence.valencyEvidence,
		...en.attestationEvidence.valencyEvidence,
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
 * Attestation. A Head that can open a phrase names where its article is
 * attested (ADR 0035, ADR 0040), and so may a NOUN Locution, the Head of its
 * phrase (ADR 0040, amended 2026-10-02). Comparability decides Degree on ADV
 * and ADJ where a language marks it (ADR 0042). Each language's route policy
 * adds its own checks and evidence fields.
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
	const policy = policyOf(key);
	const surfaceChecks: Check[] = [];
	if (holds("foreign", key))
		surfaceChecks.push([isForeignSurface, foreignSurfaceError]);
	if (holds("comparability", key))
		surfaceChecks.push([isComparabilitySurface, comparabilitySurfaceError]);
	for (const [condition, ...check] of policy.surfaceChecks)
		if (holds(condition, key)) surfaceChecks.push(check);
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
	for (const [condition, ...check] of policy.attestationChecks)
		if (holds(condition, key)) attestationChecks.push(check);
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
