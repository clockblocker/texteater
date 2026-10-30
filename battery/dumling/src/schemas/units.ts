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
import type { routePolicies } from "./concrete-language/route-policies.js";
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
	const shape = "shape" in bag ? bag.shape : undefined;
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
/**
 * One language's route policy. A route's schema module passes its own
 * language's, so it loads no other language's policy.
 */
type RoutePolicy = RoutePolicies[keyof RoutePolicies];
/** Whether a route condition of `policy` holds for the route `key` names. */
function holds(
	policy: RoutePolicy,
	condition: RouteCondition,
	key: string,
): boolean {
	return holdsNamed(policy, condition, key);
}
/** {@link holds} for a condition read as a key of a table. */
function holdsNamed(
	policy: RoutePolicy,
	condition: string,
	key: string,
): boolean {
	const conditions: Partial<Record<string, readonly string[]>> =
		policy.conditions;
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
	// TypeScript can't compute the extended shape of a generic Lemma schema.
	return withChecks(
		plainLemma.extend({
			syncretic: z.tuple([name], name).optional(),
			syncretized: z
				.tuple([plainLemma, plainLemma], plainLemma)
				.optional(),
		}),
		[
			[isSyncretismView, syncretismViewError],
			[isLemmaSyncretism, lemmaSyncretismError],
		],
	) as SyncretizableLemmaSchema<P, C>;
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
	// TypeScript can't compute the extended shape of a generic Surface schema.
	return withChecks(
		refine(
			z.strictObject({
				...plainSurface.shape,
				syncretic: z.tuple([name], name).optional(),
				syncretized: z.tuple([unit, unit], unit).optional(),
			}),
		),
		[
			[isSurfaceSyncretismView, surfaceSyncretismViewError],
			[isSurfaceSyncretism, surfaceSyncretismError],
		],
	) as SyncretizableSurfaceSchema<P, I>;
}

/** Missing inflectional schemas omit the Surface field; present schemas retain their refinements. */
function buildBaseUnitSchemas<
	L extends string,
	F extends string,
	K extends string,
	C extends z.core.$ZodType,
	I extends z.core.$ZodType | undefined,
>(
	policy: RoutePolicy,
	route: { language: L; family: F; kind: K },
	core: C,
	inflectional: I,
) {
	const PlainLemma = plainLemmaSchema(route, core);
	const key = `${route.language}/${route.family}/${route.kind}` as const;
	if (policy.language !== route.language)
		throw Error(`Route ${key} takes no ${policy.language} route policy`);
	// The type picks the branch the runtime picks, from the same route list.
	const Lemma = (
		holds(policy, "syncretism", key)
			? syncretizableLemmaSchema(PlainLemma, core)
			: PlainLemma
	) as typeof key extends RoutesOf<"syncretism">
		? SyncretizableLemmaSchema<typeof PlainLemma, C>
		: typeof PlainLemma;
	const surfaceShape = {
		unitKind: z.literal(UnitKindSchema.enum.Surface),
		language: z.literal(route.language),
		lemma: Lemma,
		/**
		 * The form the Surface spells, with no slot filler and no slot token.
		 * A German Surface is its base-order form (system ADR 0056): the
		 * Lemma's fixed words, inflected, in its Canonical Form's order, and
		 * the verbal complex last in subordinate-clause order, so word-order
		 * variants share it (`hatte es damit zu tun` is `mit zu tun hatte`,
		 * `fängt … an` is `anfängt`). A pronominal adverb gives the fixed
		 * preposition it holds (`damit` gives `mit`). An imperative keeps its
		 * own order. Free arguments, a Lexeme's governed prepositions and a
		 * lexical reflexive stay out. The slotted line (`jD mit jM zu tun
		 * hatte`) is derived from the Reading's frame, never stored.
		 */
		normalizedSurface: normalizedFormSchema,
		spelling: spellingSchema,
		surfaceFeatures: surfaceFeaturesSchema,
	};
	// The conditional type preserves field presence for concrete schema callers.
	// Runtime construction uses the same inflectional-schema condition, which
	// TypeScript can't follow through the spread.
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
	// identifies, so it carries no Emoji Description (ADR 0045). The type
	// reads the `foreign` route list `holds` reads, which TypeScript can't
	// follow through the spread.
	const readingShape = {
		unitKind: z.literal(UnitKindSchema.enum.Reading),
		lemma: Lemma,
	};
	const Reading = z.strictObject({
		...readingShape,
		...(holds(policy, "foreign", key)
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

/** The article evidence field's schema on the routes of each condition that adds it. */
const articleEvidence = {
	lexemeArticleOwner: articleEvidenceSchema.nullable(),
	// Optional, so Attestations recorded before a NOUN Locution owned its
	// article stay valid.
	locutionArticleOwner: articleEvidenceSchema.nullable().optional(),
} satisfies { [Condition in RouteCondition]?: unknown };
/** The schemas language `L`'s route policy gives the evidence field `Field`, by condition. */
type Evidence<
	L extends keyof RoutePolicies,
	Field extends "expletiveEvidence" | "valencyEvidence",
> = RoutePolicies[L]["attestationEvidence"] extends {
	readonly [Name in Field]: infer Entry;
}
	? Entry
	: Record<never, never>;
/**
 * The Attestation's evidence fields, in field order, each with its schema on
 * the routes of every route condition that adds it. A language's route policy
 * adds its own; no route meets two conditions that add one field.
 */
type AttestationEvidence = {
	articleEvidence: typeof articleEvidence;
	expletiveEvidence: Evidence<"de", "expletiveEvidence">;
	valencyEvidence: Evidence<"de", "valencyEvidence"> &
		Evidence<"he", "valencyEvidence"> &
		Evidence<"en", "valencyEvidence">;
};
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
/**
 * The evidence field `Field` of the route `key` names, read from its route
 * policy, which states the conditions its type reads.
 */
function evidenceField<
	Key extends string,
	Field extends keyof AttestationEvidence,
>(policy: RoutePolicy, key: Key, field: Field) {
	const evidence: Partial<Record<string, Record<string, unknown>>> =
		policy.attestationEvidence;
	const entry: Record<string, unknown> =
		field === "articleEvidence" ? articleEvidence : (evidence[field] ?? {});
	const held = Object.keys(entry).find((condition) =>
		holdsNamed(policy, condition, key),
	);
	// TypeScript can't evaluate the conditional `EvidenceField` for a generic
	// key; the runtime finds the field from the same table.
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
		(refined, [check, error]) =>
			// A check reads the fields of the unit `schema` parses, which hang on
			// the route; the refinement keeps the check itself, which the
			// validation compiler finds by identity.
			refined.refine(check as (input: unknown) => boolean, { error }),
		schema,
	);
}

/**
 * Composition stores grammatical features; source evidence belongs to the
 * Attestation. A Head that can open a phrase names where its article is
 * attested (ADR 0035, ADR 0040), and so may a NOUN Locution, the Head of its
 * phrase (ADR 0040). Comparability decides Degree on ADV
 * and ADJ where a language marks it (ADR 0042). Each language's route policy
 * adds its own checks and evidence fields.
 */
export function buildUnitSchemas<
	L extends string,
	F extends string,
	K extends string,
	C extends z.core.$ZodType,
	I extends z.core.$ZodType | undefined,
>(
	policy: RoutePolicy,
	route: { language: L; family: F; kind: K },
	core: C,
	inflectional: I,
) {
	const base = buildBaseUnitSchemas(policy, route, core, inflectional);
	const { key } = base;
	const surfaceChecks: Check[] = [];
	if (holds(policy, "foreign", key))
		surfaceChecks.push([isForeignSurface, foreignSurfaceError]);
	if (holds(policy, "comparability", key))
		surfaceChecks.push([isComparabilitySurface, comparabilitySurfaceError]);
	for (const [condition, ...check] of policy.surfaceChecks)
		if (holds(policy, condition, key)) surfaceChecks.push(check);
	const refineSurface = <S extends z.ZodObject>(schema: S): S =>
		withChecks(schema, surfaceChecks);
	// The type picks the branch the runtime picks, from the same route list.
	const Surface = (
		holds(policy, "syncretism", key)
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
	if (
		holds(policy, "lexemeArticleOwner", key) ||
		holds(policy, "locutionArticleOwner", key)
	)
		attestationChecks.push([isArticleAttestation, articleAttestationError]);
	for (const [condition, ...check] of policy.attestationChecks)
		if (holds(policy, condition, key)) attestationChecks.push(check);
	const Attestation = withChecks(
		z.strictObject({
			unitKind: z.literal(UnitKindSchema.enum.Attestation),
			surface: Surface,
			members: z.tuple([memberSchema], memberSchema),
			realizationCoverage: z.enum(["Full", "Partial"]),
			...evidenceField(policy, key, "articleEvidence"),
			...evidenceField(policy, key, "expletiveEvidence"),
			...evidenceField(policy, key, "valencyEvidence"),
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
	policy: RoutePolicy,
	route: { language: string; family: string; kind: string },
	core: z.core.$ZodType,
	inflectional: z.core.$ZodType | undefined,
): Record<z.infer<typeof UnitKindSchema>, z.ZodObject> {
	return buildUnitSchemas(policy, route, core, inflectional);
}
