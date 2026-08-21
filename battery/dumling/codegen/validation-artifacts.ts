import { resolve } from "node:path";
import { compileZodValidationArtifacts, defineCodegen } from "codegen";
import type { z } from "zod";
import type {
	CanonicalDumlingValidationSchemaRegistry,
	CanonicalDumlingValidationSchemaRoute,
} from "../src/operations/parsing/validation-route-proofs.js";
import {
	buildReadingSchemaFor,
	schemasFor,
} from "../src/schemas/public-schemas.js";
import {
	hasDistinctPair,
	hasGermanVerbInflectionSignal,
	hasMarkedInflectionFeature,
	hasMarkedSurfaceFeature,
	inflectionalFeaturesNonEmptyError,
	isCompactEmojiSequence,
	normalizeNfc,
	normalizeReadingLemma,
	surfaceFeaturesNonEmptyError,
	trimString,
} from "../src/validation-semantics.js";

const packageRoot = resolve(import.meta.dir, "..");

const dumlingValidationOperationRegistrations = [
	{
		construct: "overwrite",
		implementation: normalizeNfc,
		name: "dumling.normalize-nfc",
		version: 1,
	},
	{
		construct: "overwrite",
		implementation: trimString,
		name: "dumling.trim-string",
		version: 1,
	},
	{
		construct: "transform",
		implementation: normalizeReadingLemma,
		name: "dumling.normalize-reading-lemma",
		version: 1,
	},
	{
		construct: "custom",
		error: surfaceFeaturesNonEmptyError,
		implementation: hasMarkedSurfaceFeature,
		name: "dumling.surface-features.non-empty",
		version: 1,
	},
	{
		construct: "custom",
		error: inflectionalFeaturesNonEmptyError,
		implementation: hasMarkedInflectionFeature,
		name: "dumling.inflectional-features.non-empty",
		version: 1,
	},
	{
		construct: "custom",
		implementation: hasDistinctPair,
		name: "dumling.distinct-pair",
		version: 1,
	},
	{
		construct: "custom",
		error: inflectionalFeaturesNonEmptyError,
		implementation: hasGermanVerbInflectionSignal,
		name: "dumling.german-verb-inflection.non-empty",
		version: 1,
	},
	{
		construct: "custom",
		implementation: isCompactEmojiSequence,
		name: "dumling.emoji.compact-sequence",
		version: 1,
	},
] as const;

type ActualSchemaRegistry = typeof schemasFor;
type ActualLanguage = keyof ActualSchemaRegistry & string;

function keysOf<Value extends object>(
	value: Value,
): Array<keyof Value & string> {
	return Object.keys(value) as Array<keyof Value & string>;
}

function isSchemaGetter(value: unknown): value is () => z.ZodType {
	return typeof value === "function";
}

function isSchemaBranch(value: unknown): value is object {
	return typeof value === "object" && value !== null;
}

function appendSchemaRoute(
	routes: CanonicalDumlingValidationSchemaRoute[],
	key: string,
	schema: z.ZodType,
): void {
	// Dynamic object traversal loses a leaf's indexed key. The plan's public type
	// is derived from typeof schemasFor, and this is the sole reconstruction cast.
	routes.push({ key, schema } as CanonicalDumlingValidationSchemaRoute);
}

function collectEntityValidationSchemaRoutes(
	routes: CanonicalDumlingValidationSchemaRoute[],
	entity: "Attestation" | "Lemma" | "Surface",
	language: ActualLanguage,
	branch: object,
	coordinates: readonly string[] = [],
): void {
	for (const [coordinate, uncheckedChild] of Object.entries(branch)) {
		const child: unknown = uncheckedChild;
		const childCoordinates = [...coordinates, coordinate];
		if (isSchemaGetter(child)) {
			const schema = child();
			appendSchemaRoute(
				routes,
				`${entity}:${language}/${childCoordinates.join("/")}`,
				schema,
			);
			if (entity === "Lemma") {
				appendSchemaRoute(
					routes,
					`Reading:${language}/${childCoordinates.join("/")}`,
					buildReadingSchemaFor(schema),
				);
			}
			continue;
		}
		if (!isSchemaBranch(child)) {
			throw new Error(
				`Invalid Dumling schema-tree node at ${entity}:${language}/${childCoordinates.join("/")}.`,
			);
		}
		collectEntityValidationSchemaRoutes(
			routes,
			entity,
			language,
			child,
			childCoordinates,
		);
	}
}

function collectDumlingValidationSchemaRoutes(): readonly CanonicalDumlingValidationSchemaRoute[] {
	const routes: CanonicalDumlingValidationSchemaRoute[] = [];
	for (const language of keysOf(schemasFor)) {
		const entitySchemas = schemasFor[language].entity;
		collectEntityValidationSchemaRoutes(
			routes,
			"Lemma",
			language,
			entitySchemas.Lemma,
		);
		collectEntityValidationSchemaRoutes(
			routes,
			"Surface",
			language,
			entitySchemas.Surface,
		);
		collectEntityValidationSchemaRoutes(
			routes,
			"Attestation",
			language,
			entitySchemas.Attestation,
		);
	}
	return routes;
}

export function collectDumlingValidationSchemas(): Readonly<CanonicalDumlingValidationSchemaRegistry> {
	const routes = collectDumlingValidationSchemaRoutes();
	// Every entry was constructed through schemaRoute's exact key-to-actual-leaf
	// check. The generated key equality proof plus freshness check establishes
	// completeness; this cast only reconstructs the mapped registry from entries.
	return Object.fromEntries(
		routes.map(({ key, schema }) => [key, schema]),
	) as CanonicalDumlingValidationSchemaRegistry;
}

export function compileDumlingValidationArtifacts() {
	return compileZodValidationArtifacts({
		operations: dumlingValidationOperationRegistrations,
		schemas: collectDumlingValidationSchemas(),
	});
}

export const dumlingValidationArtifactRecipe = defineCodegen({
	inputs: {
		schemas: {
			kind: "text-set",
			root: resolve(packageRoot, "src"),
			include: ["schemas/**/*.ts", "validation-semantics.ts"],
			recursive: true,
		},
	},
	outputs: {
		generated: {
			root: resolve(packageRoot, "src/generated"),
			ownership: { manifest: ".validation-artifacts.json" },
		},
	},
	build: ({ schemas }) => {
		const compiled = compileDumlingValidationArtifacts();
		const routes = keysOf(compiled.roots).toSorted();
		const definitionPayloads: string[] = [];
		for (const [reference, constraint] of Object.entries(
			compiled.definitions,
		)) {
			const index = definitionIndex(reference);
			definitionPayloads[index] = JSON.stringify(constraint);
		}
		const definitions = packIndexedPayloads(definitionPayloads);
		let rootPayloadBlob = "";
		let routeIndexPayload = "";
		for (const route of routes) {
			const constraint = compiled.roots[route];
			if (constraint === undefined) {
				throw new Error(`Missing compiled Dumling route: ${route}.`);
			}
			const payload = JSON.stringify(constraint);
			routeIndexPayload += `\n${route}\0${fixedWidthHex(rootPayloadBlob.length)}${fixedWidthHex(payload.length)}`;
			rootPayloadBlob += payload;
		}
		const encoded = {
			definitionOffsetPayload: definitions.offsetPayload,
			definitionPayloadBlob: definitions.payloadBlob,
			offsetWidth: OFFSET_WIDTH,
			operationSignatures: compiled.operationSignatures,
			requiredOperations: compiled.requiredOperations,
			rootPayloadBlob,
			routeIndexPayload,
			version: compiled.version,
		};
		const content = [
			"// Generated by codegen/generate-validation-artifacts.ts. Do not edit.",
			'import type { CanonicalDumlingValidationRouteKey } from "../operations/parsing/validation-routes.js";',
			"// biome-ignore format: generated compact validation payload",
			`export const encodedDumlingValidationArtifacts = ${JSON.stringify(encoded)} as const satisfies {`,
			"\treadonly definitionOffsetPayload: string;",
			"\treadonly definitionPayloadBlob: string;",
			`\treadonly offsetWidth: ${OFFSET_WIDTH};`,
			"\treadonly operationSignatures: Readonly<Record<string, Readonly<{ errorMessage?: string; version: number }>>>;",
			"\treadonly requiredOperations: readonly string[];",
			"\treadonly rootPayloadBlob: string;",
			"\treadonly routeIndexPayload: string;",
			"\treadonly version: 1;",
			"};",
			"// biome-ignore format: generated exact route proof",
			`export type GeneratedDumlingValidationRouteKey = ${routes.map((route) => JSON.stringify(route)).join(" | ")};`,
			"type Assert<T extends true> = T;",
			"type _GeneratedRoutesMatchCanonicalSchemas = Assert<",
			"\t[",
			"\t\tGeneratedDumlingValidationRouteKey,",
			"\t\tCanonicalDumlingValidationRouteKey,",
			"\t] extends [",
			"\t\tCanonicalDumlingValidationRouteKey,",
			"\t\tGeneratedDumlingValidationRouteKey,",
			"\t]",
			"\t\t? true",
			"\t\t: false",
			">;",
			"",
		].join("\n");
		return [
			{
				id: "dumling-validation-artifacts",
				to: { target: "generated", path: "validation-artifacts.ts" },
				content,
				provenance: schemas.map((source) => source.source),
				meta: { kind: "validation-artifact" },
			},
		];
	},
});

const OFFSET_WIDTH = 6;

function packIndexedPayloads(payloads: readonly string[]): {
	offsetPayload: string;
	payloadBlob: string;
} {
	let offsetPayload = fixedWidthHex(0);
	let payloadBlob = "";
	for (let index = 0; index < payloads.length; index += 1) {
		const payload = payloads[index];
		if (payload === undefined) {
			throw new Error(
				`Missing generated definition payload at index ${index}.`,
			);
		}
		payloadBlob += payload;
		offsetPayload += fixedWidthHex(payloadBlob.length);
	}
	return { offsetPayload, payloadBlob };
}

function fixedWidthHex(value: number): string {
	const encoded = value.toString(16);
	if (encoded.length > OFFSET_WIDTH) {
		throw new Error(
			`Generated validation payload exceeds ${OFFSET_WIDTH} hex digits.`,
		);
	}
	return encoded.padStart(OFFSET_WIDTH, "0");
}

function definitionIndex(reference: string): number {
	const match = /^n(0|[1-9]\d*)$/.exec(reference);
	if (match === null) {
		throw new Error(
			`Unsupported generated definition reference: ${reference}`,
		);
	}
	return Number(match[1]);
}
