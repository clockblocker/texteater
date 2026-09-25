import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type * as Dumling from "dumling/types";

export type FeatureLayer = "Core" | "Inflectional";

/** Values a schema position accepts. */
export type AcceptedValues = Readonly<{
	/** Enumerated values, in schema order. */
	values: readonly string[];
	nullable: boolean;
	/** The position also accepts text outside `values`, such as a prefix. */
	freeText: boolean;
	/** The position also accepts a set of `values`, such as `Masc,Neut`. */
	sets: boolean;
}>;

/** A feature a route allows, and the values its schema accepts. */
export type RouteFeature = AcceptedValues &
	Readonly<{
		layer: FeatureLayer;
		name: string;
	}>;

/**
 * Surface and Attestation fields every route has, outside its feature bags:
 * Surface spelling and historical status, member orthography and realization
 * coverage.
 */
export type EvidenceField =
	| "spelling"
	| "historicalStatus"
	| "memberOrthography"
	| "realizationCoverage";

/** One language × Family × Kind route of Dumling's concrete schemas. */
export type SchemaRoute = Readonly<{
	evidence: Readonly<Record<EvidenceField, AcceptedValues>>;
	family: Dumling.Family;
	features: readonly RouteFeature[];
	kind: Dumling.Kind;
	language: Dumling.Language;
	/** The import path after `dumling/schema/`: `de/lexeme/noun`. */
	schemaPath: string;
}>;

type JsonSchema = {
	anyOf?: JsonSchema[];
	const?: unknown;
	enum?: unknown[];
	items?: JsonSchema | JsonSchema[];
	oneOf?: JsonSchema[];
	prefixItems?: JsonSchema[];
	properties?: Record<string, JsonSchema>;
	type?: string | string[];
};

type JsonSchemaSource = {
	toJSONSchema(params: { io: "input"; unrepresentable: "any" }): unknown;
};

type RouteSchemaModule = {
	attestationSchema: JsonSchemaSource;
	lemmaSchema: JsonSchemaSource;
	surfaceSchema: JsonSchemaSource;
};

function jsonSchema(source: JsonSchemaSource): JsonSchema {
	return source.toJSONSchema({
		io: "input",
		unrepresentable: "any",
	}) as JsonSchema;
}

/** The alternatives of a schema, with nested unions flattened. */
function alternatives(schema: JsonSchema): JsonSchema[] {
	const union = schema.anyOf ?? schema.oneOf;
	return union === undefined ? [schema] : union.flatMap(alternatives);
}

function propertyAlternatives(schema: JsonSchema, key: string): JsonSchema[] {
	return alternatives(schema).flatMap((alternative) => {
		const property = alternative.properties?.[key];
		return property === undefined ? [] : [property];
	});
}

function acceptedValues(schemas: readonly JsonSchema[]): AcceptedValues {
	const values = new Set<string>();
	let nullable = false;
	let freeText = false;
	let sets = false;
	const accept = (value: unknown) => {
		if (value === null) nullable = true;
		else values.add(String(value));
	};
	for (const schema of schemas.flatMap(alternatives)) {
		if (schema.const !== undefined) accept(schema.const);
		else if (schema.enum !== undefined) schema.enum.forEach(accept);
		else if (schema.type === "null") nullable = true;
		else if (schema.type === "array") sets = true;
		else freeText = true;
	}
	return { freeText, nullable, sets, values: [...values] };
}

function bagFeatures(
	bag: JsonSchema | undefined,
	layer: FeatureLayer,
): RouteFeature[] {
	if (bag === undefined) return [];
	const names = new Set(
		alternatives(bag).flatMap((alternative) =>
			Object.keys(alternative.properties ?? {}),
		),
	);
	return [...names].map((name) => ({
		layer,
		name,
		...acceptedValues(propertyAlternatives(bag, name)),
	}));
}

/** Every schema reachable from `schema`, itself included. */
function descendants(schema: JsonSchema): JsonSchema[] {
	const children = [
		...(schema.anyOf ?? []),
		...(schema.oneOf ?? []),
		...(schema.prefixItems ?? []),
		...(Array.isArray(schema.items)
			? schema.items
			: schema.items === undefined
				? []
				: [schema.items]),
		...Object.values(schema.properties ?? {}),
	];
	return [schema, ...children.flatMap(descendants)];
}

function routeFromModule(
	schemaPath: string,
	module: RouteSchemaModule,
): SchemaRoute {
	const lemma = jsonSchema(module.lemmaSchema);
	const surface = jsonSchema(module.surfaceSchema);
	const attestation = jsonSchema(module.attestationSchema);
	const constant = (key: string) =>
		String(propertyAlternatives(lemma, key)[0]?.const);
	const members = propertyAlternatives(attestation, "members");

	return {
		evidence: {
			historicalStatus: acceptedValues(
				propertyAlternatives(surface, "surfaceFeatures").flatMap(
					(features) =>
						propertyAlternatives(features, "historicalStatus"),
				),
			),
			memberOrthography: acceptedValues(
				members
					.flatMap(descendants)
					.flatMap((member) =>
						member.properties?.orthography === undefined
							? []
							: [member.properties.orthography],
					),
			),
			realizationCoverage: acceptedValues(
				propertyAlternatives(attestation, "realizationCoverage"),
			),
			spelling: acceptedValues(propertyAlternatives(surface, "spelling")),
		},
		family: constant("family") as Dumling.Family,
		features: [
			...bagFeatures(
				propertyAlternatives(lemma, "coreFeatures")[0],
				"Core",
			),
			...bagFeatures(
				propertyAlternatives(surface, "inflectionalFeatures")[0],
				"Inflectional",
			),
		],
		kind: constant("kind") as Dumling.Kind,
		language: constant("language") as Dumling.Language,
		schemaPath,
	};
}

const dumlingSchemasDir = join(
	dirname(fileURLToPath(import.meta.resolve("dumling/package.json"))),
	"dist/generated/schemas",
);

/**
 * Every route of Dumling's concrete schemas, read from the built
 * `dumling/schema/<language>/<family>/<kind>` modules.
 */
export async function loadSchemaRoutes(): Promise<SchemaRoute[]> {
	const schemaPaths = readdirSync(dumlingSchemasDir, {
		encoding: "utf8",
		recursive: true,
	})
		.filter((path) => path.endsWith(".js"))
		.map((path) => path.replaceAll("\\", "/").slice(0, -".js".length))
		.toSorted();

	return Promise.all(
		schemaPaths.map(async (schemaPath) =>
			routeFromModule(
				schemaPath,
				(await import(
					`dumling/schema/${schemaPath}`
				)) as RouteSchemaModule,
			),
		),
	);
}
