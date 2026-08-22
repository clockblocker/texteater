import { resolve } from "node:path";
import {
	compileZodValidationArtifacts,
	defineCodegen,
	type ZodValidationOperationRegistration,
} from "codegen";
import { supportedLanguages } from "dumling";
import { dangerouslyHeavySchemasForAbout100MiBRss as schemasFor } from "dumling/dangerously-heavy-schema-tree";
import { lexicalUnitShadowSchema } from "dumrel/schema";
import emojiRegex from "emoji-regex";
import type { z } from "zod";
import type { CanonicalDumgenValidationSchemaRegistry } from "../src/parsing/validation-route-proofs.js";
import {
	grammaticalInputSchema,
	grammaticalInteractionSchema,
	grammaticalResultSchema,
	grammaticalRouteSchema,
	knowledgeGenerationInputSchema,
	knowledgeGenerationRequestSchema,
	knowledgeGenerationResultSchema,
	section1ErrorSchema,
	segmentationDecisionSchema,
	segmentationResultSchema,
	segmentedSentenceIdSchema,
	segmentedSentenceSchema,
	segmentSchema,
} from "../src/schema.js";
import {
	type CanonicalGermanAttestationRouteKey,
	canonicalGermanAttestationSchemas,
	germanAttestationSchema,
} from "../src/schemas/german-attestation-schema.js";
import {
	bindGermanKnowledgeInput,
	bindGermanKnowledgeReading,
	bindGermanRelationTarget,
	bindSegmentedSentenceId,
	finalizeKnowledgeGenerationResult,
	hasEnglishTranslationSelection,
	hasSemanticRelationSelection,
	isGermanKnowledgeLemma,
	isGermanKnowledgeReading,
	isGermanRelationTarget,
	isValidWhitespaceSegment,
	lemmaCatalogMissRouteMatches,
	readingKnowledgeCatalogMissRouteMatches,
} from "../src/validation-semantics.js";

export const canonicalDumgenValidationSchemas = {
	parseAsKnowledgeGenerationRequest: knowledgeGenerationRequestSchema,
	"parseAsKnowledgeGenerationInput:de": knowledgeGenerationInputSchema,
	parseAsKnowledgeGenerationResult: knowledgeGenerationResultSchema,
	parseAsSegmentedSentenceId: segmentedSentenceIdSchema,
	parseAsSegment: segmentSchema,
	"parseAsSegmentedSentence:de": segmentedSentenceSchema.options[0],
	"parseAsSegmentedSentence:he": segmentedSentenceSchema.options[1],
	parseAsSegmentationDecision: segmentationDecisionSchema,
	parseAsSection1Error: section1ErrorSchema,
	parseAsSegmentationResult: segmentationResultSchema,
	"parseAsGrammaticalRoute:de": grammaticalRouteSchema,
	parseAsGrammaticalInteraction: grammaticalInteractionSchema,
	"parseAsGrammaticalInput:de": grammaticalInputSchema,
	"parseAsGrammaticalResult:de": grammaticalResultSchema,
} as const satisfies CanonicalDumgenValidationSchemaRegistry;

const dumgenOperationalValidationSchemas = {
	...canonicalDumgenValidationSchemas,
	"internal:GermanAttestation:de": germanAttestationSchema,
} as const;

type Operation = (...args: never[]) => unknown;
type CheckInternals = {
	readonly _zod: {
		readonly check?: Operation;
		readonly def: {
			readonly check?: string;
			readonly error?: Operation;
			readonly fn?: Operation;
			readonly tx?: Operation;
		};
	};
};
type SchemaInternals = {
	readonly _zod: {
		readonly def: {
			readonly checks?: readonly unknown[];
			readonly discriminator?: string;
			readonly element?: unknown;
			readonly getter?: () => unknown;
			readonly in?: unknown;
			readonly innerType?: unknown;
			readonly keyType?: unknown;
			readonly options?: readonly unknown[];
			readonly out?: unknown;
			readonly shape?:
				| Readonly<Record<string, unknown>>
				| (() => Readonly<Record<string, unknown>>);
			readonly transform?: Operation;
			readonly type?: string;
			readonly values?: readonly unknown[];
			readonly valueType?: unknown;
		};
	};
};

type CollectedOperation = Readonly<{
	construct: "contextual" | "custom" | "overwrite" | "transform";
	error?: Operation;
	implementation: Operation;
}>;

function shapeFor(
	definition: SchemaInternals["_zod"]["def"],
): Readonly<Record<string, unknown>> {
	return typeof definition.shape === "function"
		? definition.shape()
		: (definition.shape ?? {});
}

function walkSchemas(visitor: (schema: SchemaInternals) => void): void {
	const seen = new WeakSet<object>();
	const walk = (unchecked: unknown): void => {
		if (
			unchecked === null ||
			typeof unchecked !== "object" ||
			seen.has(unchecked)
		)
			return;
		seen.add(unchecked);
		const schema = unchecked as SchemaInternals;
		const definition = schema._zod?.def;
		if (definition === undefined) return;
		visitor(schema);
		for (const key of Object.keys(shapeFor(definition)).toSorted())
			walk(shapeFor(definition)[key]);
		walk(definition.element);
		walk(definition.in);
		walk(definition.innerType);
		walk(definition.keyType);
		walk(definition.valueType);
		walk(definition.out);
		for (const option of definition.options ?? []) walk(option);
		if (definition.getter !== undefined) walk(definition.getter());
	};
	for (const key of Object.keys(canonicalDumgenValidationSchemas).toSorted())
		walk(
			canonicalDumgenValidationSchemas[
				key as keyof typeof canonicalDumgenValidationSchemas
			],
		);
}

function collectOperations(): CollectedOperation[] {
	const operations: CollectedOperation[] = [];
	walkSchemas((schema) => {
		const definition = schema._zod.def;
		for (const uncheckedCheck of definition.checks ?? []) {
			const check = uncheckedCheck as CheckInternals;
			const checkDefinition = check._zod.def;
			const implementation = checkDefinition.fn ?? checkDefinition.tx;
			if (
				implementation !== undefined &&
				(checkDefinition.check === "custom" ||
					checkDefinition.check === "overwrite")
			) {
				operations.push({
					construct: checkDefinition.check,
					...(checkDefinition.error === undefined
						? {}
						: { error: checkDefinition.error }),
					implementation,
				});
			}
			if (
				checkDefinition.check === "custom" &&
				implementation === undefined &&
				typeof check._zod.check === "function"
			) {
				operations.push({
					construct: "contextual",
					implementation: check._zod.check,
				});
			}
		}
		if (definition.type !== "pipe") return;
		for (const child of [definition.in, definition.out]) {
			const childDefinition = (child as SchemaInternals | undefined)?._zod
				.def;
			if (
				childDefinition?.type === "transform" &&
				childDefinition.transform !== undefined
			) {
				operations.push({
					construct: "transform",
					implementation: childDefinition.transform,
				});
			}
		}
	});
	return operations;
}

const localOperationNames = new Map<Operation, string>([
	[bindSegmentedSentenceId as Operation, "dumgen.bind-segmented-sentence-id"],
	[bindGermanKnowledgeInput as Operation, "dumgen.bind-knowledge-input.de"],
	[
		bindGermanKnowledgeReading as Operation,
		"dumgen.bind-knowledge-reading.de",
	],
	[bindGermanRelationTarget as Operation, "dumgen.bind-relation-target.de"],
	[
		finalizeKnowledgeGenerationResult as Operation,
		"dumgen.finalize-knowledge-result",
	],
	[
		lemmaCatalogMissRouteMatches as Operation,
		"dumgen.catalog-miss.lemma-route-correlation",
	],
	[
		readingKnowledgeCatalogMissRouteMatches as Operation,
		"dumgen.catalog-miss.reading-knowledge-route-correlation",
	],
	[
		hasEnglishTranslationSelection as Operation,
		"dumgen.translation-request.english",
	],
	[
		hasSemanticRelationSelection as Operation,
		"dumgen.semantic-relation-request.non-empty",
	],
	[isGermanKnowledgeReading as Operation, "dumgen.knowledge-reading.de"],
	[isGermanKnowledgeLemma as Operation, "dumgen.knowledge-lemma.de"],
	[isGermanRelationTarget as Operation, "dumgen.relation-target.de"],
	[isValidWhitespaceSegment as Operation, "dumgen.segment.whitespace"],
	[
		findContextualOperation(grammaticalInputSchema),
		"dumgen.grammatical-input.clicked-resolvable",
	],
	[
		findContextualOperation(grammaticalInteractionSchema),
		"dumgen.grammatical-interaction.membership",
	],
	[
		findContextualOperation(knowledgeGenerationResultSchema),
		"dumgen.knowledge-result.base-only",
	],
	[
		findContextualOperation(lexicalUnitShadowSchema),
		"dumgen.transitive.unit-shadow.supported-route",
	],
]);

function findContextualOperation(schema: z.ZodType): Operation {
	let found: Operation | undefined;
	const seen = new WeakSet<object>();
	const walk = (unchecked: unknown): void => {
		if (
			found !== undefined ||
			unchecked === null ||
			typeof unchecked !== "object" ||
			seen.has(unchecked)
		)
			return;
		seen.add(unchecked);
		const definition = (unchecked as SchemaInternals)._zod?.def;
		if (definition === undefined) return;
		for (const candidate of definition.checks ?? []) {
			const check = candidate as CheckInternals;
			if (
				check._zod.def.check === "custom" &&
				check._zod.def.fn === undefined &&
				typeof check._zod.check === "function"
			) {
				found = check._zod.check;
				return;
			}
		}
		for (const child of Object.values(shapeFor(definition))) walk(child);
		walk(definition.element);
		walk(definition.in);
		walk(definition.innerType);
		walk(definition.keyType);
		walk(definition.valueType);
		walk(definition.out);
		for (const option of definition.options ?? []) walk(option);
		if (definition.getter !== undefined) walk(definition.getter());
	};
	walk(schema);
	if (found === undefined)
		throw new Error("Expected a canonical Dumgen contextual operation.");
	return found;
}

function operationBaseName(operation: CollectedOperation): string {
	return (
		localOperationNames.get(operation.implementation) ??
		`dumgen.transitive.${operation.construct}.${operation.implementation.name || "anonymous"}`
	);
}

function collectValidationOperationRegistrations(): ZodValidationOperationRegistration[] {
	const registrations: ZodValidationOperationRegistration[] = [];
	const seen = new Set<Operation>();
	const nameCounts = new Map<string, number>();
	for (const operation of collectOperations()) {
		if (seen.has(operation.implementation)) continue;
		seen.add(operation.implementation);
		const baseName = operationBaseName(operation);
		const count = (nameCounts.get(baseName) ?? 0) + 1;
		nameCounts.set(baseName, count);
		registrations.push({
			construct: operation.construct,
			...(operation.error === undefined
				? {}
				: { error: operation.error }),
			implementation: operation.implementation,
			name: count === 1 ? baseName : `${baseName}.${String(count)}`,
			version: 1,
		});
	}

	let readonlyIndex = 0;
	const discriminatorNameCounts = new Map<string, number>();
	walkSchemas((schema) => {
		const definition = schema._zod.def;
		if (definition.type === "readonly") {
			readonlyIndex += 1;
			registrations.push({
				construct: "readonly",
				name: `dumgen.readonly.${String(readonlyIndex)}`,
				schema: schema as unknown as z.ZodType,
				version: 1,
			});
		}
		if (
			definition.type !== "union" ||
			definition.discriminator === undefined
		)
			return;
		const options = (definition.options ?? []).map((option) => {
			const optionDefinition = (option as SchemaInternals)._zod.def;
			const literal = shapeFor(optionDefinition)[
				definition.discriminator as string
			] as SchemaInternals | undefined;
			const values = literal?._zod.def.values;
			if (values?.length !== 1 || typeof values[0] !== "string")
				throw new TypeError(
					`Unsupported Dumgen discriminator option for ${definition.discriminator}.`,
				);
			return values[0];
		});
		const baseName = `dumgen.discriminator.${definition.discriminator}`;
		const count = (discriminatorNameCounts.get(baseName) ?? 0) + 1;
		discriminatorNameCounts.set(baseName, count);
		registrations.push({
			construct: "discriminator",
			discriminator: definition.discriminator,
			name: `${baseName}.${String(count)}`,
			options,
			schema: schema as unknown as z.ZodType,
			version: 1,
		});
	});
	return registrations;
}

function compileDumgenValidationArtifacts() {
	return compileZodValidationArtifacts({
		operations: collectValidationOperationRegistrations(),
		schemas: dumgenOperationalValidationSchemas,
	});
}

const packageRoot = resolve(import.meta.dir, "..");
const OFFSET_WIDTH = 6;

export const dumgenValidationArtifactRecipe = defineCodegen({
	inputs: {
		dumgenSchemas: {
			kind: "text-set",
			root: resolve(packageRoot, "src"),
			include: [
				"knowledge-generation/contracts.ts",
				"knowledge-generation/relations.ts",
				"schemas/**/*.ts",
				"validation-semantics.ts",
			],
			recursive: true,
		},
		dumlingSchemas: {
			kind: "text-set",
			root: resolve(packageRoot, "../dumling/src"),
			include: ["schemas/**/*.ts", "validation-semantics.ts"],
			recursive: true,
		},
		dumrelSchemas: {
			kind: "text-set",
			root: resolve(packageRoot, "../dumrel/src"),
			include: ["schema.ts", "types.ts", "validation-semantics.ts"],
			recursive: true,
		},
	},
	outputs: {
		generated: {
			root: resolve(packageRoot, "src/generated"),
			ownership: { manifest: ".validation-artifacts.json" },
		},
	},
	build: ({ dumgenSchemas, dumlingSchemas, dumrelSchemas }) => {
		const compiled = compileDumgenValidationArtifacts();
		const routes = keysOf(compiled.roots).toSorted();
		const germanAttestationRoutes = Object.keys(
			canonicalGermanAttestationSchemas,
		).toSorted() as CanonicalGermanAttestationRouteKey[];
		const definitionPayloads: string[] = [];
		for (const [reference, constraint] of Object.entries(
			compiled.definitions,
		)) {
			definitionPayloads[definitionIndex(reference)] =
				JSON.stringify(constraint);
		}
		const definitions = packIndexedPayloads(definitionPayloads);
		let rootPayloadBlob = "";
		let routeIndexPayload = "";
		for (const route of routes) {
			const constraint = compiled.roots[route];
			if (constraint === undefined)
				throw new Error(`Missing compiled Dumgen route: ${route}.`);
			const payload = JSON.stringify(constraint);
			routeIndexPayload += `\n${route}\0${fixedWidthHex(rootPayloadBlob.length)}${fixedWidthHex(payload.length)}`;
			rootPayloadBlob += payload;
		}
		const encoded = {
			definitionOffsetPayload: definitions.offsetPayload,
			definitionPayloadBlob: definitions.payloadBlob,
			emojiRegexSource: emojiRegex().source,
			germanAttestationRouteKeys: germanAttestationRoutes.join("\n"),
			offsetWidth: OFFSET_WIDTH,
			operationSignatures: compiled.operationSignatures,
			requiredOperations: compiled.requiredOperations,
			rootPayloadBlob,
			routeIndexPayload,
			supportedUnitShadowRoutes:
				collectSupportedUnitShadowRoutes().join("\n"),
			version: compiled.version,
		};
		const content = [
			"// Generated by codegen/generate-validation-artifacts.ts. Do not edit.",
			'import type { DumgenValidationRouteKey } from "../parsing/validation-routes.js";',
			'import type { CanonicalGermanAttestationRouteKey } from "../schemas/german-attestation-schema.js";',
			"// biome-ignore format: generated compact validation payload",
			`export const encodedDumgenValidationArtifacts = ${JSON.stringify(encoded)} as const satisfies {`,
			"\treadonly definitionOffsetPayload: string;",
			"\treadonly definitionPayloadBlob: string;",
			"\treadonly emojiRegexSource: string;",
			"\treadonly germanAttestationRouteKeys: string;",
			`\treadonly offsetWidth: ${OFFSET_WIDTH};`,
			"\treadonly operationSignatures: Readonly<Record<string, Readonly<{ discriminator?: Readonly<{ branches: readonly unknown[]; key: string; options: readonly string[] }>; errorMessage?: string; version: number }>>>;",
			"\treadonly requiredOperations: readonly string[];",
			"\treadonly rootPayloadBlob: string;",
			"\treadonly routeIndexPayload: string;",
			"\treadonly supportedUnitShadowRoutes: string;",
			"\treadonly version: 1;",
			"};",
			"export function loadEncodedDumgenValidationPayloads(): Readonly<{ definitionOffsetPayload: string; definitionPayloadBlob: string; rootPayloadBlob: string }> {",
			"\treturn encodedDumgenValidationArtifacts;",
			"}",
			"// biome-ignore format: generated exact parser-root proof",
			`export type GeneratedDumgenOperationalValidationRouteKey = ${routes.map((route) => JSON.stringify(route)).join(" | ")};`,
			'type GeneratedDumgenValidationRouteKey = Exclude<GeneratedDumgenOperationalValidationRouteKey, "internal:GermanAttestation:de">;',
			"// biome-ignore format: generated exact German Attestation leaf proof",
			`type GeneratedDumgenGermanAttestationRouteKey = ${germanAttestationRoutes.map((route) => JSON.stringify(route)).join(" | ")};`,
			"type Assert<T extends true> = T;",
			"// biome-ignore format: generated exact parser-root proof",
			"type _GeneratedRoutesMatchCanonicalSchemas = Assert<",
			"\t[GeneratedDumgenValidationRouteKey, DumgenValidationRouteKey] extends",
			"\t[DumgenValidationRouteKey, GeneratedDumgenValidationRouteKey] ? true : false",
			">;",
			"type _GeneratedGermanAttestationRoutesMatchCanonicalSchemas = Assert<",
			"\t[GeneratedDumgenGermanAttestationRouteKey, CanonicalGermanAttestationRouteKey] extends",
			"\t[CanonicalGermanAttestationRouteKey, GeneratedDumgenGermanAttestationRouteKey] ? true : false",
			">;",
			"",
		].join("\n");
		return [
			{
				id: "dumgen-validation-artifacts",
				to: { target: "generated", path: "validation-artifacts.ts" },
				content,
				provenance: [
					...dumgenSchemas,
					...dumlingSchemas,
					...dumrelSchemas,
				].map((source) => source.source),
				meta: { kind: "validation-artifact" },
			},
		];
	},
});

function keysOf<Value extends object>(
	value: Value,
): Array<keyof Value & string> {
	return Object.keys(value) as Array<keyof Value & string>;
}

function packIndexedPayloads(payloads: readonly string[]): {
	offsetPayload: string;
	payloadBlob: string;
} {
	let offsetPayload = "";
	let payloadBlob = "";
	for (const payload of payloads) {
		if (payload === undefined)
			throw new Error(
				"Dumgen validation definition indexes are not dense.",
			);
		offsetPayload += fixedWidthHex(payloadBlob.length);
		payloadBlob += payload;
		offsetPayload += fixedWidthHex(payloadBlob.length);
	}
	return { offsetPayload, payloadBlob };
}

function fixedWidthHex(value: number): string {
	const encoded = value.toString(16).padStart(OFFSET_WIDTH, "0");
	if (encoded.length !== OFFSET_WIDTH)
		throw new RangeError(
			`Dumgen validation payload exceeds ${OFFSET_WIDTH} hex digits.`,
		);
	return encoded;
}

function definitionIndex(reference: string): number {
	if (!/^n\d+$/u.test(reference))
		throw new TypeError(
			`Invalid Dumgen validation reference: ${reference}`,
		);
	return Number.parseInt(reference.slice(1), 10);
}

function collectSupportedUnitShadowRoutes(): string[] {
	const routes: string[] = [];
	for (const language of supportedLanguages) {
		const families = schemasFor[language].descriptor
			.Lemma as unknown as Record<string, Record<string, z.ZodType>>;
		for (const [family, kinds] of Object.entries(families))
			for (const kind of Object.keys(kinds))
				routes.push(`${language}/${family}/${kind}`);
	}
	return routes.toSorted();
}
