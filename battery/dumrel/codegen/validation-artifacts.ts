import { resolve } from "node:path";
import {
	compileZodValidationArtifacts,
	defineCodegen,
	type ZodValidationOperationRegistration,
} from "codegen";
import { supportedLanguages } from "dumling";
import { dangerouslyHeavySchemasForAbout100MiBRss as schemasFor } from "dumling/dangerously-heavy-schema-tree";
import type { z } from "zod";
import type { CanonicalDumrelValidationSchemaRegistry } from "../src/parsing/validation-route-proofs.js";
import {
	directSemanticRelationGraphEdgeSchema,
	grammaticalRelationClaimSchema,
	grammaticalSeriesSchema,
	knowledgeChangeSchema,
	knowledgeRequestMaskSchema,
	knowledgeSettingsSchema,
	lexemeUnitShadowSchema,
	lexicalBreakdownSchema,
	lexicalUnitShadowSchema,
	morphemeReadingReferenceSchema,
	morphologicalTreeNodeSchema,
	morphologicalTreeSchema,
	morphologicalTreeStructureSchema,
	pendingSemanticRelationSchema,
	readingKnowledgeSchema,
	readingReferenceSchema,
	semanticRelationGraphReadingSchema,
	semanticRelationGraphSchema,
	semanticRelationsSchema,
	unitShadowSchema,
} from "../src/schema.js";
import {
	bindLemmaReference,
	bindLexemeUnitShadow,
	bindLexicalUnitShadow,
	bindMorphemeReadingReference,
	bindSupportedUnitShadow,
	dumrelNormalizeNfc,
	dumrelTrimString,
	hasSemanticRelationSelection,
	hasTranslationSelection,
	isLexemeUnitShadow,
	isLexicalUnitShadow,
	isMorphemeReading,
	normalizeLemmaCanonicalForm,
	retainAtLeastTwo,
	retainNonEmptyArray,
} from "../src/validation-semantics.js";

const packageRoot = resolve(import.meta.dir, "..");

/** Actual canonical schema inventory, proven against the frozen parser outputs. */
export const canonicalDumrelValidationSchemas = {
	parseAsDirectSemanticRelationGraphEdge:
		directSemanticRelationGraphEdgeSchema,
	parseAsGrammaticalRelationClaim: grammaticalRelationClaimSchema,
	parseAsGrammaticalSeries: grammaticalSeriesSchema,
	parseAsKnowledgeChange: knowledgeChangeSchema,
	parseAsKnowledgeRequestMask: knowledgeRequestMaskSchema,
	parseAsKnowledgeSettings: knowledgeSettingsSchema,
	parseAsLexemeUnitShadow: lexemeUnitShadowSchema,
	parseAsLexicalBreakdown: lexicalBreakdownSchema,
	parseAsLexicalUnitShadow: lexicalUnitShadowSchema,
	parseAsMorphemeReadingReference: morphemeReadingReferenceSchema,
	parseAsMorphologicalTree: morphologicalTreeSchema,
	parseAsMorphologicalTreeNode: morphologicalTreeNodeSchema,
	parseAsMorphologicalTreeStructure: morphologicalTreeStructureSchema,
	parseAsPendingSemanticRelation: pendingSemanticRelationSchema,
	parseAsReadingKnowledge: readingKnowledgeSchema,
	parseAsSemanticRelationGraph: semanticRelationGraphSchema,
	parseAsSemanticRelationGraphReading: semanticRelationGraphReadingSchema,
	parseAsSemanticRelations: semanticRelationsSchema,
	parseAsUnitShadow: unitShadowSchema,
} as const satisfies CanonicalDumrelValidationSchemaRegistry;

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
			readonly element?: unknown;
			readonly getter?: () => unknown;
			readonly in?: unknown;
			readonly innerType?: unknown;
			readonly keyType?: unknown;
			readonly options?: readonly unknown[];
			readonly out?: unknown;
			readonly shape?: Readonly<Record<string, unknown>>;
			readonly transform?: Operation;
			readonly type?: string;
			readonly valueType?: unknown;
		};
	};
};

function operationRegistration(
	construct: "custom" | "overwrite" | "transform",
	implementation: Operation,
	name: string,
): ZodValidationOperationRegistration {
	const match = findOperation(construct, implementation);
	return {
		construct,
		...(match.error === undefined ? {} : { error: match.error }),
		implementation,
		name,
		version: 1,
	};
}

function nestedOperationRegistrations(
	construct: "custom" | "overwrite" | "transform",
	functionName: string,
	name: string,
): ZodValidationOperationRegistration[] {
	const matches = collectOperations().filter(
		(candidate) =>
			candidate.construct === construct &&
			candidate.implementation.name === functionName,
	);
	const implementations = new Set(
		matches.map((match) => match.implementation),
	);
	if (implementations.size === 0 || matches[0] === undefined) {
		throw new Error(
			`Expected a canonical Dumrel ${construct} implementation named ${functionName}.`,
		);
	}
	return [...implementations].map((implementation, index) => {
		const match = matches.find(
			(candidate) => candidate.implementation === implementation,
		);
		if (match === undefined)
			throw new Error("Missing collected operation.");
		return {
			construct,
			...(match.error === undefined ? {} : { error: match.error }),
			implementation,
			name:
				implementations.size === 1
					? name
					: `${name}.${String(index + 1)}`,
			version: 1,
		};
	});
}

function contextualRegistration(
	schema: z.ZodType,
	name: string,
): ZodValidationOperationRegistration {
	const implementation = findContextualOperation(schema);
	if (implementation === undefined) {
		throw new Error(`Expected a canonical contextual check for ${name}.`);
	}
	return {
		construct: "contextual",
		implementation,
		name,
		version: 1,
	};
}

function findContextualOperation(schema: z.ZodType): Operation | undefined {
	const seen = new WeakSet<object>();
	const walk = (unchecked: unknown): Operation | undefined => {
		if (
			unchecked === null ||
			typeof unchecked !== "object" ||
			seen.has(unchecked)
		)
			return undefined;
		seen.add(unchecked);
		const definition = (unchecked as SchemaInternals)._zod?.def;
		if (definition === undefined) return undefined;
		for (const candidate of definition.checks ?? []) {
			const check = candidate as CheckInternals;
			if (
				check._zod.def.check === "custom" &&
				check._zod.def.fn === undefined &&
				typeof check._zod.check === "function"
			) {
				return check._zod.check;
			}
		}
		for (const child of [
			...Object.values(definition.shape ?? {}),
			definition.element,
			definition.in,
			definition.innerType,
			definition.keyType,
			definition.out,
			definition.valueType,
			...(definition.options ?? []),
		]) {
			const found = walk(child);
			if (found !== undefined) return found;
		}
		return definition.getter === undefined
			? undefined
			: walk(definition.getter());
	};
	return walk(schema);
}

type CollectedOperation = Readonly<{
	construct: "custom" | "overwrite" | "transform";
	error?: Operation;
	implementation: Operation;
}>;

function findOperation(
	construct: CollectedOperation["construct"],
	implementation: Operation,
): CollectedOperation {
	const match = collectOperations().find(
		(candidate) =>
			candidate.construct === construct &&
			candidate.implementation === implementation,
	);
	if (match === undefined) {
		throw new Error(
			`Canonical Dumrel operation was not found: ${construct}.`,
		);
	}
	return match;
}

function collectOperations(): CollectedOperation[] {
	const operations: CollectedOperation[] = [];
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
		}
		if (definition.type === "pipe") {
			const input = definition.in as SchemaInternals | undefined;
			if (
				input?._zod.def.type === "transform" &&
				input._zod.def.transform !== undefined
			) {
				operations.push({
					construct: "transform",
					implementation: input._zod.def.transform,
				});
			}
			const output = definition.out as SchemaInternals | undefined;
			if (
				output?._zod.def.type === "transform" &&
				output._zod.def.transform !== undefined
			) {
				operations.push({
					construct: "transform",
					implementation: output._zod.def.transform,
				});
			}
		}
		for (const child of Object.values(definition.shape ?? {})) walk(child);
		walk(definition.element);
		walk(definition.in);
		walk(definition.innerType);
		walk(definition.keyType);
		walk(definition.valueType);
		walk(definition.out);
		for (const option of definition.options ?? []) walk(option);
		if (definition.getter !== undefined) walk(definition.getter());
	};
	for (const schema of Object.values(canonicalDumrelValidationSchemas)) {
		walk(schema);
	}
	return operations;
}

const dumrelValidationOperationRegistrations = [
	operationRegistration(
		"overwrite",
		dumrelTrimString as Operation,
		"dumrel.trim-string",
	),
	operationRegistration(
		"overwrite",
		dumrelNormalizeNfc as Operation,
		"dumrel.normalize-nfc",
	),
	operationRegistration(
		"transform",
		normalizeLemmaCanonicalForm as Operation,
		"dumrel.normalize-lemma-canonical-form",
	),
	operationRegistration(
		"transform",
		bindLemmaReference as Operation,
		"dumrel.bind-lemma-reference",
	),
	operationRegistration(
		"transform",
		bindMorphemeReadingReference as Operation,
		"dumrel.bind-morpheme-reading-reference",
	),
	operationRegistration(
		"transform",
		bindSupportedUnitShadow as Operation,
		"dumrel.bind-supported-unit-shadow",
	),
	operationRegistration(
		"transform",
		bindLexicalUnitShadow as Operation,
		"dumrel.bind-lexical-unit-shadow",
	),
	operationRegistration(
		"transform",
		bindLexemeUnitShadow as Operation,
		"dumrel.bind-lexeme-unit-shadow",
	),
	operationRegistration(
		"transform",
		retainNonEmptyArray as Operation,
		"dumrel.retain-non-empty-array",
	),
	operationRegistration(
		"transform",
		retainAtLeastTwo as Operation,
		"dumrel.retain-at-least-two",
	),
	operationRegistration(
		"custom",
		hasTranslationSelection as Operation,
		"dumrel.translation-request.non-empty",
	),
	operationRegistration(
		"custom",
		hasSemanticRelationSelection as Operation,
		"dumrel.semantic-relation-request.non-empty",
	),
	operationRegistration(
		"custom",
		isMorphemeReading as Operation,
		"dumrel.morpheme-reading",
	),
	operationRegistration(
		"custom",
		isLexicalUnitShadow as Operation,
		"dumrel.lexical-unit-shadow",
	),
	operationRegistration(
		"custom",
		isLexemeUnitShadow as Operation,
		"dumrel.lexeme-unit-shadow",
	),
	...nestedOperationRegistrations(
		"transform",
		"normalizeReadingLemma",
		"dumrel.reading.normalize-lemma",
	),
	...nestedOperationRegistrations(
		"overwrite",
		"trimString",
		"dumrel.reading.trim-string",
	),
	...nestedOperationRegistrations(
		"overwrite",
		"normalizeNfc",
		"dumrel.reading.normalize-nfc",
	),
	...nestedOperationRegistrations(
		"custom",
		"isCompactEmojiSequence",
		"dumrel.reading.compact-emoji-sequence",
	),
	contextualRegistration(
		unitShadowSchema,
		"dumrel.unit-shadow.supported-route",
	),
	contextualRegistration(
		lexicalUnitShadowSchema,
		"dumrel.lexical-unit-shadow.supported-route",
	),
	contextualRegistration(
		lexemeUnitShadowSchema,
		"dumrel.lexeme-unit-shadow.supported-route",
	),
	contextualRegistration(
		semanticRelationGraphSchema,
		"dumrel.semantic-relation-graph.integrity",
	),
] as const satisfies readonly ZodValidationOperationRegistration[];

function compileDumrelValidationArtifacts() {
	return compileZodValidationArtifacts({
		operations: dumrelValidationOperationRegistrations,
		schemas: {
			...canonicalDumrelValidationSchemas,
			"internal:reading-reference": readingReferenceSchema,
		},
	});
}

export const dumrelValidationArtifactRecipe = defineCodegen({
	inputs: {
		dumlingSchemas: {
			kind: "text-set",
			root: resolve(packageRoot, "../dumling/src"),
			include: ["schemas/**/*.ts", "validation-semantics.ts"],
			recursive: true,
		},
		dumrelSchemas: {
			kind: "text-set",
			root: resolve(packageRoot, "src"),
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
	build: ({ dumlingSchemas, dumrelSchemas }) => {
		const compiled = compileDumrelValidationArtifacts();
		const routes = keysOf(compiled.roots).toSorted();
		const publicRoutes = keysOf(
			canonicalDumrelValidationSchemas,
		).toSorted();
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
			if (constraint === undefined) {
				throw new Error(`Missing compiled Dumrel route: ${route}.`);
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
			supportedUnitShadowRoutes:
				collectSupportedUnitShadowRoutes().join("\n"),
			version: compiled.version,
		};
		const content = [
			"// Generated by codegen/generate-validation-artifacts.ts. Do not edit.",
			'import type { DumrelValidationRouteKey } from "../parsing/validation-routes.js";',
			"// biome-ignore format: generated compact validation payload",
			`export const encodedDumrelValidationArtifacts = ${JSON.stringify(encoded)} as const satisfies {`,
			"\treadonly definitionOffsetPayload: string;",
			"\treadonly definitionPayloadBlob: string;",
			`\treadonly offsetWidth: ${OFFSET_WIDTH};`,
			"\treadonly operationSignatures: Readonly<Record<string, Readonly<{ errorMessage?: string; version: number }>>>;",
			"\treadonly requiredOperations: readonly string[];",
			"\treadonly rootPayloadBlob: string;",
			"\treadonly routeIndexPayload: string;",
			"\treadonly supportedUnitShadowRoutes: string;",
			"\treadonly version: 1;",
			"};",
			"// biome-ignore format: generated exact parser-root proof",
			`export type GeneratedDumrelValidationRouteKey = ${publicRoutes.map((route) => JSON.stringify(route)).join(" | ")};`,
			"type Assert<T extends true> = T;",
			"// biome-ignore format: generated exact parser-root proof",
			"type _GeneratedRoutesMatchCanonicalSchemas = Assert<",
			"\t[GeneratedDumrelValidationRouteKey, DumrelValidationRouteKey] extends",
			"\t[DumrelValidationRouteKey, GeneratedDumrelValidationRouteKey] ? true : false",
			">;",
			"",
		].join("\n");
		return [
			{
				id: "dumrel-validation-artifacts",
				to: { target: "generated", path: "validation-artifacts.ts" },
				content,
				provenance: [...dumlingSchemas, ...dumrelSchemas].map(
					(source) => source.source,
				),
				meta: { kind: "validation-artifact" },
			},
		];
	},
});

function collectSupportedUnitShadowRoutes(): string[] {
	const routes: string[] = [];
	for (const language of supportedLanguages) {
		const families = schemasFor[language].descriptor
			.Lemma as unknown as Record<string, Record<string, z.ZodType>>;
		for (const [family, kinds] of Object.entries(families)) {
			for (const kind of Object.keys(kinds)) {
				routes.push(`${language}/${family}/${kind}`);
			}
		}
	}
	return routes.toSorted();
}

const OFFSET_WIDTH = 6;

function keysOf<Value extends object>(
	value: Value,
): Array<keyof Value & string> {
	return Object.keys(value) as Array<keyof Value & string>;
}

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
