import { schemasFor } from "dumling/schema";
import type { Lemma } from "dumling/types";
import { z } from "zod";

export const segmentKindSchema = z.enum([
	"ResolvableText",
	"OpaqueText",
	"Whitespace",
	"Punctuation",
]);

export const indexedSegmentSchema = z.strictObject({
	index: z.number().int().nonnegative(),
	kind: segmentKindSchema,
	text: z.string().min(1),
});

export const featureValueSchema = z
	.union([z.string(), z.number(), z.boolean()])
	.nullable();

export const namedFeatureSchema = z.strictObject({
	name: z.string().min(1),
	value: featureValueSchema,
});

export const surfaceFeaturesSchema = z
	.strictObject({
		historicalStatus: z.literal("Archaic").nullable(),
	})
	.nullable();

type SchemaGetter = () => z.ZodType;
type SchemaBranch = Record<string, Record<string, SchemaGetter>>;

const germanLemmaBranches = schemasFor.de.entity.Lemma as unknown as Record<
	string,
	Record<string, SchemaGetter>
>;

const germanLemmaSchemas = Object.values(germanLemmaBranches).flatMap(
	(branch) => Object.values(branch).map((getSchema) => getSchema()),
);

if (germanLemmaSchemas.length < 2) {
	throw new Error("German classification requires multiple Lemma schemas.");
}

export const germanLemmaSchema = z.union(
	germanLemmaSchemas as [z.ZodType, z.ZodType, ...z.ZodType[]],
) as z.ZodType<Lemma<"de">>;

export const germanLemmaFamilySchema = z.enum(
	Object.keys(germanLemmaBranches) as [string, ...string[]],
);

export const germanLemmaKindSchema = z.enum(
	Object.values(germanLemmaBranches).flatMap((branch) =>
		Object.keys(branch),
	) as [string, ...string[]],
);

export function hasGermanLemmaSchema(family: string, kind: string): boolean {
	return typeof germanLemmaBranches[family]?.[kind] === "function";
}

export function hasGermanSurfaceSchema(
	surfaceKind: "Citation" | "Inflection",
	family: string,
	kind: string,
): boolean {
	const branches = schemasFor.de.entity.Surface[
		surfaceKind
	] as unknown as SchemaBranch;
	return typeof branches[family]?.[kind] === "function";
}

export function assertUniqueFeatureNames(
	features: ReadonlyArray<{ readonly name: string }>,
	field: string,
): void {
	if (new Set(features.map(({ name }) => name)).size !== features.length) {
		throw new Error(`${field} must contain unique feature names.`);
	}
}
