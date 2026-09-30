import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { isReviewed } from "../layers.js";
import type { AdrId, RuleId, SpecRecord } from "../types.js";

/** Which bag of a Surface a value sits in: the Lemma's Core or the inflection. */
type FeatureBag = "Core" | "Inflectional";

/** One value a Dumling route's schema allows for one feature. */
export interface SchemaValue {
	/** `<Family>/<Kind>`: `Lexeme/ADP`. */
	route: string;
	bag: FeatureBag;
	feature: string;
	value: string;
}

/**
 * A schema value that no reviewed record needs to use to be kept, and what
 * keeps it: a Rule, an ADR, or an open issue. Remove an entry that points at
 * an issue when the issue is ruled; a ruling that settles a class of values
 * adds a failing check for it.
 */
export interface KeptValue extends SchemaValue {
	keptBy: { rule: RuleId } | { adr: AdrId } | { issue: number };
	why: string;
}

/** A value's key for lookups: `Lexeme/ADP Core adpType=Circ`. */
export function schemaValueKey(value: SchemaValue): string {
	return `${value.route} ${value.bag} ${value.feature}=${value.value}`;
}

interface JsonSchemaNode {
	type?: unknown;
	const?: unknown;
	enum?: readonly unknown[];
	anyOf?: readonly JsonSchemaNode[];
	properties?: Readonly<Record<string, JsonSchemaNode>>;
}

/** The string values a feature's schema allows; none for a free string. */
function allowedValues(node: JsonSchemaNode | undefined): string[] {
	if (!node) return [];
	return [
		...(typeof node.const === "string" ? [node.const] : []),
		...(node.enum ?? []).filter(
			(value): value is string => typeof value === "string",
		),
		...(node.anyOf ?? []).flatMap(allowedValues),
	];
}

/** Each feature of a bag schema, which may be a union, with its values. */
function bagValues(node: JsonSchemaNode | undefined): Map<string, Set<string>> {
	const features = new Map<string, Set<string>>();
	const visit = (bag: JsonSchemaNode | undefined) => {
		if (!bag) return;
		for (const alternative of bag.anyOf ?? []) visit(alternative);
		for (const [feature, schema] of Object.entries(bag.properties ?? {})) {
			const values = features.get(feature) ?? new Set<string>();
			for (const value of allowedValues(schema)) values.add(value);
			features.set(feature, values);
		}
	};
	visit(node);
	return features;
}

/**
 * The Core and inflectional values a route's Surface schema allows, read
 * from its JSON Schema, in schema order. Free-string features, such as
 * `hasSepPrefix`, have no values to list.
 */
export function routeSchemaValues(
	route: string,
	surfaceSchema: JsonSchemaNode,
): SchemaValue[] {
	const lemma = surfaceSchema.properties?.lemma;
	const bags: [FeatureBag, JsonSchemaNode | undefined][] = [
		["Core", lemma?.properties?.coreFeatures],
		["Inflectional", surfaceSchema.properties?.inflectionalFeatures],
	];
	return bags.flatMap(([bag, node]) =>
		[...bagValues(node)].flatMap(([feature, values]) =>
			[...values].map((value) => ({ route, bag, feature, value })),
		),
	);
}

const dumlingSchemas = new URL(
	"../../../dumling/src/generated/schemas/",
	import.meta.url,
);

/** The route a Dumling Lemma schema fixes, as `<Family>/<Kind>`. */
function routeOf(lemmaSchema: z.ZodType): string {
	const { properties } = z.toJSONSchema(lemmaSchema, {
		io: "input",
		unrepresentable: "any",
	}) as { properties?: Record<string, { const?: unknown }> };
	return `${properties?.family?.const}/${properties?.kind?.const}`;
}

/**
 * Every Core and inflectional value each of a language's Dumling routes
 * allows, sorted by route. Reads Dumling's generated route schemas from the
 * repository, so call it from a script or test.
 */
export async function loadSchemaValues(
	language: string,
): Promise<SchemaValue[]> {
	const directory = fileURLToPath(new URL(`${language}/`, dumlingSchemas));
	const modules = readdirSync(directory, {
		recursive: true,
		encoding: "utf8",
	})
		.filter((path) => path.endsWith(".ts"))
		.map((path) => path.replaceAll("\\", "/").slice(0, -".ts".length))
		.toSorted();
	const routes = await Promise.all(
		modules.map(async (module) => {
			const { lemmaSchema, surfaceSchema } = (await import(
				`dumling/schema/${language}/${module}`
			)) as { lemmaSchema: z.ZodType; surfaceSchema: z.ZodType };
			return routeSchemaValues(
				routeOf(lemmaSchema),
				z.toJSONSchema(surfaceSchema, {
					io: "input",
					unrepresentable: "any",
				}) as JsonSchemaNode,
			);
		}),
	);
	return routes
		.flat()
		.toSorted((a, b) =>
			a.route < b.route ? -1 : a.route > b.route ? 1 : 0,
		);
}

/**
 * The keys of the Core and inflectional values the targets of records
 * reviewed through at least Attestation use. A Segmentation-only review
 * doesn't count: those values are checked at Attestation.
 */
export function reviewedValueKeys(
	records: readonly Pick<SpecRecord, "reviewDepth" | "targets">[],
): Set<string> {
	const keys = new Set<string>();
	for (const record of records) {
		if (!isReviewed(record, "Attestation")) continue;
		for (const { attestation } of record.targets) {
			const { surface } = attestation;
			const { lemma } = surface;
			const route = `${lemma.family}/${lemma.kind}`;
			const bags: [FeatureBag, object | null | undefined][] = [
				["Core", lemma.coreFeatures],
				[
					"Inflectional",
					"inflectionalFeatures" in surface
						? surface.inflectionalFeatures
						: null,
				],
			];
			for (const [bag, features] of bags)
				for (const [feature, value] of Object.entries(features ?? {}))
					if (typeof value === "string")
						keys.add(
							schemaValueKey({ route, bag, feature, value }),
						);
		}
	}
	return keys;
}

/** The schema values neither a reviewed record uses nor an entry keeps. */
export function unkeptValues(
	values: readonly SchemaValue[],
	used: ReadonlySet<string>,
	kept: readonly KeptValue[],
): SchemaValue[] {
	const keptKeys = new Set(kept.map(schemaValueKey));
	return values.filter((value) => {
		const key = schemaValueKey(value);
		return !used.has(key) && !keptKeys.has(key);
	});
}
