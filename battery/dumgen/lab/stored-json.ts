/**
 * Stored JSON, checked by a schema where it is read (#1102): frozen sets,
 * run records, manifests, ledgers and caches. The schema's verdict decides,
 * and the value comes back as stored. zod rebuilds an object in its shape's
 * key order, and a stored value's key order reaches the requests a run
 * sends, which `evaluation/request-diff.ts` compares as written. So a schema
 * here checks and never changes a value: no transform, default or coercion.
 *
 * A file a schema rejects is a stored-data bug to report, not a reason to
 * loosen the schema.
 */
import { readFileSync } from "node:fs";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { z } from "zod";
import type { LunaRequest, LunaResponse } from "../src/luna.js";
import { isRoute } from "../src/segment/de/routes.js";
import type { JevResponse } from "../src/segment/jev.js";
import type {
	Route,
	Segment,
	SegmentedSentence,
	Unit,
} from "../src/segment/segmented-sentence.js";

const conforms = <T>(schema: z.ZodType<T>, value: unknown): value is T =>
	schema.safeParse(value).success;

/** The issues a rejected value shows first. */
const shownIssues = 5;

/** `value` as `schema` checks it, unchanged; one it rejects throws, naming `what`. */
export function storedAs<T>(
	schema: z.ZodType<T>,
	value: unknown,
	what: string,
): T {
	if (conforms(schema, value)) return value;
	const parsed = schema.safeParse(value);
	const issues = parsed.success ? [] : parsed.error.issues;
	const shown = issues
		.slice(0, shownIssues)
		.map(
			(issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
		);
	if (issues.length > shownIssues) shown.push(`${issues.length} issues`);
	throw Error(`${what} is not the stored shape: ${shown.join("; ")}`);
}

/** JSON `text`, checked by `schema`. */
export const parseStoredJson = <T>(
	schema: z.ZodType<T>,
	text: string,
	what: string,
): T => storedAs(schema, JSON.parse(text), what);

/** The JSON file at `path`, checked by `schema`. */
export const readStoredJsonSync = <T>(schema: z.ZodType<T>, path: string): T =>
	parseStoredJson(schema, readFileSync(path, "utf8"), path);

/** A German Reading Dumling accepts. */
export const germanReadingSchema = z.custom<Dumling.Reading<"de">>((value) => {
	const parsed = parseUnit(value);
	return (
		parsed.success &&
		parsed.chain.unitKind === "Reading" &&
		parsed.chain.language === "de"
	);
}, "Expected a German Dumling Reading");

/** A German Attestation Dumling accepts. */
export const germanAttestationSchema = z.custom<Dumling.Attestation<"de">>(
	(value) => {
		const parsed = parseUnit(value);
		return (
			parsed.success &&
			parsed.chain.unitKind === "Attestation" &&
			parsed.chain.language === "de"
		);
	},
	"Expected a German Dumling Attestation",
);

/**
 * A corpus Attestation as the German one its record's language makes it;
 * one whose Lemma is in another language throws.
 */
export function germanAttestation(
	attestation: Dumling.Attestation,
): Dumling.Attestation<"de"> {
	if (!isGermanAttestation(attestation))
		throw Error(
			`Expected a German Attestation, not ${attestation.surface.lemma.language}`,
		);
	return attestation;
}

const isGermanAttestation = (
	attestation: Dumling.Attestation,
): attestation is Dumling.Attestation<"de"> =>
	attestation.surface.lemma.language === "de";

/** A German route a click routes to. */
const routeSchema = z.custom<Route>(isRoute, "Expected a German route");

const segmentSchema = z.object({
	kind: z.enum(["ResolvableText", "OpaqueText", "Whitespace", "Punctuation"]),
	text: z.string(),
	surface: z.string().optional(),
}) satisfies z.ZodType<Segment>;

/** A biggest unit, as `segment.inUnits` hands it on. */
export const unitSchema = z.object({
	segments: z.array(z.number()),
	route: z.union([routeSchema, z.literal("Unresolved")]),
	variants: z.array(routeSchema).optional(),
	identity: z
		.object({
			kind: z.enum(["DET", "PRON"]),
			canonicalForm: z.string(),
			pronType: z.string().nullable(),
			poss: z.literal("Yes").optional(),
		})
		.optional(),
}) satisfies z.ZodType<Unit>;

/** A Segmented Sentence, as intake leaves it. */
export const segmentedSentenceSchema = z.object({
	text: z.string(),
	segments: z.array(segmentSchema),
	units: z.array(unitSchema),
	failed: z.literal(true).optional(),
}) satisfies z.ZodType<SegmentedSentence>;

/** A jev answer, as a cache keeps it. */
export const jevResponseSchema = z.object({
	model: z.string(),
	answers: z.record(z.string(), z.unknown()),
	usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }),
}) satisfies z.ZodType<JevResponse>;

/** A Luna answer, as a cache keeps it. */
export const lunaResponseSchema = z.object({
	output: z.unknown(),
	metadata: z.unknown().optional(),
}) satisfies z.ZodType<LunaResponse>;

const lunaFields = {
	systemPrompt: z.string(),
	input: z.unknown(),
	cachePrompt: z.boolean().optional(),
	configuration: z.object({
		model: z.string(),
		settings: z.record(z.string(), z.unknown()),
	}),
};

/** A Luna request, as a batch journal keeps it. */
export const lunaRequestSchema = z.union([
	z.object({
		...lunaFields,
		outputFormat: z.literal("text"),
		outputSchema: z.never().optional(),
	}),
	z.object({
		...lunaFields,
		outputFormat: z.literal("json").optional(),
		outputSchema: z.record(z.string(), z.unknown()),
	}),
]) satisfies z.ZodType<LunaRequest>;
