import { resolve } from "node:path";
import {
	compileZodValidationArtifacts,
	defineCodegen,
	type ZodValidationOperationRegistration,
} from "codegen";
import { supportedLanguages } from "dumling";
import {
	dangerouslyHeavyCompactEmojiSequencePatternForAbout100MiBRss as compactEmojiSequencePattern,
	dangerouslyHeavySchemasForAbout100MiBRss as schemasFor,
} from "dumling/dangerously-heavy-schema-tree";
import {
	knowledgeChangeSchema,
	pendingSemanticRelationSchema,
	readingKnowledgeSchema,
	semanticRelationRetractKnowledgeChangeSchema,
	semanticRelationSetKnowledgeChangeSchema,
} from "dumrel/schema";
import type { z } from "zod";
import type { GeneratedDumlingCompatibilityValidationRouteKey } from "../src/generated/validation-artifacts.js";
import {
	COMPACT_EMOJI_PATTERN_TOKEN,
	collectCompactConstraintStringTable,
	compactExternalStringSignature,
	encodeCompactConstraintPayload,
	replaceCompactStringWithExternalToken,
} from "../src/parsing/compact-validation-payload.js";
import {
	commitChangesResultSchema,
	getDumdictSchemasFor,
} from "../src/schema.js";
import {
	dumdictNamedValidationPredicates,
	dumdictNamedValidationTransforms,
	retainCommitChangesRequest,
	retainDumdictPlan,
} from "../src/validation-semantics.js";
import type {
	CanonicalDumdictValidationSchemaRegistry,
	InternalDumdictOperationalValidationSchemaRegistry,
} from "./validation-route-proofs.js";

const packageRoot = resolve(import.meta.dir, "..");
const compactEmojiPatternSource = compactEmojiSequencePattern.source;
const compactEmojiPatternFlags = compactEmojiSequencePattern.flags;

type ActualDumlingSchemaRegistry = typeof schemasFor;
type DumlingSchemaGetter = () => z.ZodType;

interface DumlingCompatibilitySchemaRoute<
	Key extends string,
	Schema extends z.ZodType,
> {
	readonly key: Key;
	readonly schema: Schema;
}

type DumlingLemmaCompatibilityRoutes = {
	[Language in keyof ActualDumlingSchemaRegistry & string]: {
		[Family in keyof ActualDumlingSchemaRegistry[Language]["entity"]["Lemma"] &
			string]: {
			[Kind in keyof ActualDumlingSchemaRegistry[Language]["entity"]["Lemma"][Family] &
				string]: ActualDumlingSchemaRegistry[Language]["entity"]["Lemma"][Family][Kind] extends infer Getter extends
				DumlingSchemaGetter
				? DumlingCompatibilitySchemaRoute<
						`internal:dumling:Lemma:${Language}/${Family}/${Kind}`,
						ReturnType<Getter>
					>
				: never;
		}[keyof ActualDumlingSchemaRegistry[Language]["entity"]["Lemma"][Family] &
			string];
	}[keyof ActualDumlingSchemaRegistry[Language]["entity"]["Lemma"] & string];
}[keyof ActualDumlingSchemaRegistry & string];

type DumlingEntityCompatibilityRoutes<
	Entity extends "Attestation" | "Surface",
> = {
	[Language in keyof ActualDumlingSchemaRegistry & string]: {
		[SurfaceKind in keyof ActualDumlingSchemaRegistry[Language]["entity"][Entity] &
			string]: {
			[Family in keyof ActualDumlingSchemaRegistry[Language]["entity"][Entity][SurfaceKind] &
				string]: {
				[Kind in keyof ActualDumlingSchemaRegistry[Language]["entity"][Entity][SurfaceKind][Family] &
					string]: ActualDumlingSchemaRegistry[Language]["entity"][Entity][SurfaceKind][Family][Kind] extends infer Getter extends
					DumlingSchemaGetter
					? DumlingCompatibilitySchemaRoute<
							`internal:dumling:${Entity}:${Language}/${SurfaceKind}/${Family}/${Kind}`,
							ReturnType<Getter>
						>
					: never;
			}[keyof ActualDumlingSchemaRegistry[Language]["entity"][Entity][SurfaceKind][Family] &
				string];
		}[keyof ActualDumlingSchemaRegistry[Language]["entity"][Entity][SurfaceKind] &
			string];
	}[keyof ActualDumlingSchemaRegistry[Language]["entity"][Entity] & string];
}[keyof ActualDumlingSchemaRegistry & string];

type DumlingCompatibilitySchemaRoutes =
	| DumlingEntityCompatibilityRoutes<"Attestation">
	| DumlingLemmaCompatibilityRoutes
	| DumlingEntityCompatibilityRoutes<"Surface">;

type InternalDumlingCompatibilityValidationSchemaRegistry = {
	[Route in DumlingCompatibilitySchemaRoutes as Route["key"]]: Route["schema"];
};

export type ActualDumlingCompatibilityValidationRouteKey =
	keyof InternalDumlingCompatibilityValidationSchemaRegistry & string;

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false;
type Assert<Condition extends true> = Condition;
type _GeneratedFacadeInventoryMatchesActualSchemas = Assert<
	Equal<
		GeneratedDumlingCompatibilityValidationRouteKey,
		ActualDumlingCompatibilityValidationRouteKey
	>
>;
type DroppedFacadeLeafMatches = Equal<
	Exclude<
		ActualDumlingCompatibilityValidationRouteKey,
		"internal:dumling:Lemma:de/Lexeme/NOUN"
	>,
	ActualDumlingCompatibilityValidationRouteKey
>;
// @ts-expect-error Dropping an actual canonical leaf must fail the inventory proof.
type _DroppedFacadeLeafFails = Assert<DroppedFacadeLeafMatches>;
type SwappedFacadeLeafOutputMatches = Equal<
	z.output<
		InternalDumlingCompatibilityValidationSchemaRegistry["internal:dumling:Lemma:de/Lexeme/NOUN"]
	>,
	z.output<
		InternalDumlingCompatibilityValidationSchemaRegistry["internal:dumling:Lemma:en/Lexeme/NOUN"]
	>
>;
// @ts-expect-error Swapping the schema behind two language routes must fail.
type _SwappedFacadeLeafOutputFails = Assert<SwappedFacadeLeafOutputMatches>;

type InternalDumdictValidationSchemaRegistry =
	InternalDumdictOperationalValidationSchemaRegistry &
		InternalDumlingCompatibilityValidationSchemaRegistry;

function encodeDumdictConstraintPayload(
	constraint: Parameters<typeof encodeCompactConstraintPayload>[0],
	operations: readonly string[],
	stringTable: readonly string[],
): string {
	return replaceCompactStringWithExternalToken(
		encodeCompactConstraintPayload(constraint, operations, stringTable),
		compactEmojiPatternSource,
		COMPACT_EMOJI_PATTERN_TOKEN,
	);
}

/** Actual canonical schema inventory, proven against the frozen parser outputs. */
const de = getDumdictSchemasFor("de");
const en = getDumdictSchemasFor("en");
const he = getDumdictSchemasFor("he");

export const canonicalDumdictValidationSchemas = {
	"parseAsChangePrecondition:de": de.changePreconditionSchema,
	"parseAsChangePrecondition:en": en.changePreconditionSchema,
	"parseAsChangePrecondition:he": he.changePreconditionSchema,
	"parseAsCommitChangesRequest:de": de.commitChangesRequestSchema,
	"parseAsCommitChangesRequest:en": en.commitChangesRequestSchema,
	"parseAsCommitChangesRequest:he": he.commitChangesRequestSchema,
	parseAsCommitChangesResult: commitChangesResultSchema,
	"parseAsDumdictPlan:de": de.dumdictPlanSchema,
	"parseAsDumdictPlan:en": en.dumdictPlanSchema,
	"parseAsDumdictPlan:he": he.dumdictPlanSchema,
	"parseAsLemmaRecord:de": de.lemmaRecordSchema,
	"parseAsLemmaRecord:en": en.lemmaRecordSchema,
	"parseAsLemmaRecord:he": he.lemmaRecordSchema,
	"parseAsPendingSemanticRelationLocator:de":
		de.pendingSemanticRelationLocatorSchema,
	"parseAsPendingSemanticRelationLocator:en":
		en.pendingSemanticRelationLocatorSchema,
	"parseAsPendingSemanticRelationLocator:he":
		he.pendingSemanticRelationLocatorSchema,
	"parseAsPendingSemanticRelationRecord:de":
		de.pendingSemanticRelationRecordSchema,
	"parseAsPendingSemanticRelationRecord:en":
		en.pendingSemanticRelationRecordSchema,
	"parseAsPendingSemanticRelationRecord:he":
		he.pendingSemanticRelationRecordSchema,
	"parseAsPlannedChangeOp:de": de.plannedChangeOpSchema,
	"parseAsPlannedChangeOp:en": en.plannedChangeOpSchema,
	"parseAsPlannedChangeOp:he": he.plannedChangeOpSchema,
	"parseAsReadingEntry:de": de.readingEntrySchema,
	"parseAsReadingEntry:en": en.readingEntrySchema,
	"parseAsReadingEntry:he": he.readingEntrySchema,
	"parseAsReadingPatchOp:de": de.readingPatchOpSchema,
	"parseAsReadingPatchOp:en": en.readingPatchOpSchema,
	"parseAsReadingPatchOp:he": he.readingPatchOpSchema,
	"parseAsSurfaceEntry:de": de.surfaceEntrySchema,
	"parseAsSurfaceEntry:en": en.surfaceEntrySchema,
	"parseAsSurfaceEntry:he": he.surfaceEntrySchema,
} as const satisfies CanonicalDumdictValidationSchemaRegistry;

function collectDumlingCompatibilityValidationSchemas(): InternalDumlingCompatibilityValidationSchemaRegistry {
	const entries: Array<readonly [string, z.ZodType]> = [];
	const collect = (
		entity: "Attestation" | "Lemma" | "Surface",
		language: (typeof supportedLanguages)[number],
		branch: unknown,
		coordinates: readonly string[] = [],
	): void => {
		if (typeof branch === "function") {
			entries.push([
				`internal:dumling:${entity}:${language}/${coordinates.join("/")}`,
				branch(),
			]);
			return;
		}
		if (branch === null || typeof branch !== "object") {
			throw new TypeError(
				`Invalid Dumling compatibility schema node at ${entity}:${language}/${coordinates.join("/")}`,
			);
		}
		for (const [coordinate, child] of Object.entries(branch)) {
			collect(entity, language, child, [...coordinates, coordinate]);
		}
	};

	for (const language of supportedLanguages) {
		const entities = schemasFor[language].entity;
		collect("Lemma", language, entities.Lemma);
		collect("Surface", language, entities.Surface);
		collect("Attestation", language, entities.Attestation);
	}

	// The registry type is derived from Dumling's actual `typeof schemasFor`.
	// Dynamic traversal loses indexed keys; this is the single codegen-only
	// reconstruction after every key is built from the same canonical tree.
	return Object.fromEntries(
		entries,
	) as InternalDumlingCompatibilityValidationSchemaRegistry;
}

const dumlingCompatibilityValidationSchemas =
	collectDumlingCompatibilityValidationSchemas();

export const actualDumlingCompatibilityValidationRouteKeys = Object.keys(
	dumlingCompatibilityValidationSchemas,
).toSorted() as ActualDumlingCompatibilityValidationRouteKey[];

const internalDumdictOperationalValidationSchemas = {
	"internal:knowledge-change": knowledgeChangeSchema,
	"internal:knowledge-change:bucket:definition":
		knowledgeChangeSchema.options[8],
	"internal:knowledge-change:bucket:lexical-breakdown":
		knowledgeChangeSchema.options[12],
	"internal:knowledge-change:bucket:morphological-tree":
		knowledgeChangeSchema.options[10],
	"internal:knowledge-change:bucket:semantic-relations":
		semanticRelationSetKnowledgeChangeSchema,
	"internal:knowledge-change:bucket:transcription":
		knowledgeChangeSchema.options[0],
	"internal:knowledge-change:bucket:translations":
		knowledgeChangeSchema.options[2],
	"internal:knowledge-change:retract:definition":
		knowledgeChangeSchema.options[9],
	"internal:knowledge-change:retract:lexical-breakdown":
		knowledgeChangeSchema.options[13],
	"internal:knowledge-change:retract:morphological-tree":
		knowledgeChangeSchema.options[11],
	"internal:knowledge-change:retract:semantic-relations":
		semanticRelationRetractKnowledgeChangeSchema,
	"internal:knowledge-change:retract:transcription":
		knowledgeChangeSchema.options[1],
	"internal:knowledge-change:retract:translations":
		knowledgeChangeSchema.options[3],
	"internal:pending-semantic-relation": pendingSemanticRelationSchema,
	"internal:reading:de": de.readingEntrySchema.shape.reading,
	"internal:reading:en": en.readingEntrySchema.shape.reading,
	"internal:reading:he": he.readingEntrySchema.shape.reading,
	"internal:reading-knowledge": readingKnowledgeSchema,
	"internal:surface:de": de.surfaceEntrySchema.shape.surface,
	"internal:surface:en": en.surfaceEntrySchema.shape.surface,
	"internal:surface:he": he.surfaceEntrySchema.shape.surface,
} as const satisfies InternalDumdictOperationalValidationSchemaRegistry;

/** Exact private guard roots; deliberately excluded from the public route proof. */
const internalDumdictValidationSchemas = {
	...dumlingCompatibilityValidationSchemas,
	...internalDumdictOperationalValidationSchemas,
} as InternalDumdictValidationSchemaRegistry;

const allDumdictValidationSchemas = {
	...canonicalDumdictValidationSchemas,
	...internalDumdictValidationSchemas,
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
	for (const schema of Object.values(allDumdictValidationSchemas)) {
		walk(schema);
	}
	return operations;
}

const localOperationNames = new Map<Operation, string>([
	...Object.entries(dumdictNamedValidationPredicates).map(
		([name, implementation]) =>
			[implementation as Operation, name] as const,
	),
	...Object.entries(dumdictNamedValidationTransforms).map(
		([name, implementation]) =>
			[implementation as Operation, name] as const,
	),
	[retainCommitChangesRequest as Operation, "dumdict.retain-commit-request"],
	[retainDumdictPlan as Operation, "dumdict.retain-plan"],
]);

function operationBaseName(operation: CollectedOperation): string {
	const localName = localOperationNames.get(operation.implementation);
	if (localName !== undefined) return localName;
	const functionName = operation.implementation.name || "anonymous";
	return `dumdict.transitive.${operation.construct}.${functionName}`;
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
	const discriminatorNameCounts = new Map<string, number>();
	const seenSchemas = new WeakSet<object>();
	const walkDiscriminators = (unchecked: unknown): void => {
		if (
			unchecked === null ||
			typeof unchecked !== "object" ||
			seenSchemas.has(unchecked)
		)
			return;
		seenSchemas.add(unchecked);
		const schema = unchecked as SchemaInternals;
		const definition = schema._zod?.def;
		if (definition === undefined) return;
		if (
			definition.type === "union" &&
			definition.discriminator !== undefined
		) {
			const options = (definition.options ?? []).map((option) => {
				const optionDefinition = (option as SchemaInternals)._zod.def;
				const shape =
					typeof optionDefinition.shape === "function"
						? optionDefinition.shape()
						: optionDefinition.shape;
				const literal = shape?.[
					definition.discriminator as keyof typeof shape
				] as SchemaInternals | undefined;
				const values = literal?._zod.def.values;
				if (values?.length !== 1 || typeof values[0] !== "string")
					throw new TypeError(
						`Unsupported Dumdict discriminator option for ${definition.discriminator}.`,
					);
				return values[0];
			});
			const baseName = `dumdict.discriminator.${definition.discriminator}`;
			const count = (discriminatorNameCounts.get(baseName) ?? 0) + 1;
			discriminatorNameCounts.set(baseName, count);
			registrations.push({
				construct: "discriminator",
				discriminator: definition.discriminator,
				name: `${baseName}.${String(count)}`,
				options,
				schema: unchecked as z.ZodType,
				version: 1,
			});
		}
		const shape =
			typeof definition.shape === "function"
				? definition.shape()
				: definition.shape;
		for (const key of Object.keys(shape ?? {}).toSorted())
			walkDiscriminators(shape?.[key]);
		walkDiscriminators(definition.element);
		walkDiscriminators(definition.in);
		walkDiscriminators(definition.innerType);
		walkDiscriminators(definition.keyType);
		walkDiscriminators(definition.valueType);
		walkDiscriminators(definition.out);
		for (const option of definition.options ?? [])
			walkDiscriminators(option);
		if (definition.getter !== undefined)
			walkDiscriminators(definition.getter());
	};
	for (const key of Object.keys(allDumdictValidationSchemas).toSorted())
		walkDiscriminators(
			allDumdictValidationSchemas[
				key as keyof typeof allDumdictValidationSchemas
			],
		);
	return registrations;
}

const dumdictValidationOperationRegistrations =
	collectValidationOperationRegistrations();

export function compileDumdictValidationArtifacts() {
	return compileZodValidationArtifacts({
		operations: dumdictValidationOperationRegistrations,
		schemas: allDumdictValidationSchemas,
	});
}

export const dumdictValidationArtifactRecipe = defineCodegen({
	inputs: {
		dumlingSchemas: {
			kind: "text-set",
			root: resolve(packageRoot, "../dumling/src"),
			include: ["schemas/**/*.ts", "validation-semantics.ts"],
			recursive: true,
		},
		dumdictSchemas: {
			kind: "text-set",
			root: resolve(packageRoot, "src"),
			include: ["schema.ts", "types.ts", "validation-semantics.ts"],
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
	build: ({ dumlingSchemas, dumdictSchemas, dumrelSchemas }) => {
		const compiled = compileDumdictValidationArtifacts();
		const routes = keysOf(compiled.roots).toSorted();
		const publicRoutes = keysOf(
			canonicalDumdictValidationSchemas,
		).toSorted();
		const allInternalRoutes = keysOf(
			internalDumdictValidationSchemas,
		).toSorted();
		const compatibilityRoutes = allInternalRoutes.filter((route) =>
			route.startsWith("internal:dumling:"),
		);
		const internalRoutes = allInternalRoutes.filter(
			(route) => !route.startsWith("internal:dumling:"),
		);
		const stringTable = collectCompactConstraintStringTable(
			[
				...Object.values(compiled.definitions),
				...Object.values(compiled.roots),
			],
			[compactEmojiPatternSource],
		);
		const definitionPayloads: string[] = [];
		for (const [reference, constraint] of Object.entries(
			compiled.definitions,
		)) {
			definitionPayloads[definitionIndex(reference)] =
				encodeDumdictConstraintPayload(
					constraint,
					compiled.requiredOperations,
					stringTable,
				);
		}
		const definitions = packIndexedPayloads(definitionPayloads);
		let rootPayloadBlob = "";
		let routeIndexPayload = "";
		for (const route of routes) {
			const constraint = compiled.roots[route];
			if (constraint === undefined) {
				throw new Error(`Missing compiled Dumdict route: ${route}.`);
			}
			const payload = encodeDumdictConstraintPayload(
				constraint,
				compiled.requiredOperations,
				stringTable,
			);
			routeIndexPayload += `\n${route}\0${fixedWidthBase36(rootPayloadBlob.length)}${fixedWidthBase36(payload.length)}`;
			rootPayloadBlob += payload;
		}
		const encoded = {
			definitionIndexPayload: definitions.indexPayload,
			definitionOffsetPayload: definitions.offsetPayload,
			definitionPayloadBlob: definitions.payloadBlob,
			externalStringSignatures: {
				[COMPACT_EMOJI_PATTERN_TOKEN]: compactExternalStringSignature(
					compactEmojiPatternSource,
					compactEmojiPatternFlags,
				),
			},
			offsetWidth: OFFSET_WIDTH,
			operationSignatures: compiled.operationSignatures,
			requiredOperations: compiled.requiredOperations,
			rootPayloadBlob,
			routeIndexPayload,
			stringTable,
			supportedUnitShadowRoutes:
				collectSupportedUnitShadowRoutes().join("\n"),
			version: compiled.version,
		};
		const content = [
			"// Generated by codegen/generate-validation-artifacts.ts. Do not edit.",
			"import type {",
			"\tDumdictValidationRouteKey,",
			"\tInternalDumdictOwnedValidationRouteKey,",
			"\tInternalDumdictValidationRouteKey,",
			'} from "../parsing/validation-route-types.js";',
			"// biome-ignore format: generated compact validation payload",
			`export const encodedDumdictValidationArtifacts = ${JSON.stringify(encoded)} as const satisfies {`,
			"\treadonly definitionOffsetPayload: string;",
			"\treadonly definitionIndexPayload: string;",
			"\treadonly definitionPayloadBlob: string;",
			"\treadonly externalStringSignatures: Readonly<Record<string, string>>;",
			`\treadonly offsetWidth: ${OFFSET_WIDTH};`,
			"\treadonly operationSignatures: Readonly<Record<string, Readonly<{ discriminator?: Readonly<{ branches: readonly unknown[]; key: string; options: readonly string[] }>; errorMessage?: string; version: number }>>>;",
			"\treadonly requiredOperations: readonly string[];",
			"\treadonly rootPayloadBlob: string;",
			"\treadonly routeIndexPayload: string;",
			"\treadonly stringTable: readonly string[];",
			"\treadonly supportedUnitShadowRoutes: string;",
			"\treadonly version: 1;",
			"};",
			"// biome-ignore format: generated exact parser-root proof",
			`export type GeneratedDumdictValidationRouteKey = ${publicRoutes.map((route) => JSON.stringify(route)).join(" | ")};`,
			"// biome-ignore format: generated exact private guard-root proof",
			`export type GeneratedInternalDumdictValidationRouteKey = ${internalRoutes.map((route) => JSON.stringify(route)).join(" | ")};`,
			"// biome-ignore format: generated exact Dumling compatibility-root proof",
			`export type GeneratedDumlingCompatibilityValidationRouteKey = ${compatibilityRoutes.map((route) => JSON.stringify(route)).join(" | ")};`,
			"export type GeneratedDumlingCompatibilityValidationRouteDescriptor<",
			"\tKey extends",
			"\t\tGeneratedDumlingCompatibilityValidationRouteKey = GeneratedDumlingCompatibilityValidationRouteKey,",
			"> = Key extends `internal:dumling:$" +
				"{infer Entity}:$" +
				"{infer Language}/$" +
				"{string}`",
			"\t? Readonly<{ entity: Entity; key: Key; language: Language }>",
			"\t: never;",
			"type Assert<T extends true> = T;",
			"type AssertNever<T extends never> = T;",
			"// biome-ignore format: generated exact parser-root proof",
			"type _GeneratedRoutesMatchCanonicalSchemas = Assert<",
			"\t[GeneratedDumdictValidationRouteKey, DumdictValidationRouteKey] extends",
			"\t[DumdictValidationRouteKey, GeneratedDumdictValidationRouteKey] ? true : false",
			">;",
			"// biome-ignore format: generated exact private guard-root proof",
			"type _GeneratedInternalRoutesAreClosed = AssertNever<Exclude<GeneratedInternalDumdictValidationRouteKey | GeneratedDumlingCompatibilityValidationRouteKey, InternalDumdictValidationRouteKey>>;",
			"type _GeneratedInternalInventoriesDoNotOverlap = AssertNever<",
			"\tExtract<",
			"\t\tGeneratedInternalDumdictValidationRouteKey,",
			"\t\tGeneratedDumlingCompatibilityValidationRouteKey",
			"\t>",
			">;",
			"type _GeneratedInternalRoutesMatchOperationalGuards = Assert<",
			"\t[",
			"\t\tGeneratedInternalDumdictValidationRouteKey,",
			"\t\tInternalDumdictOwnedValidationRouteKey,",
			"\t] extends [",
			"\t\tInternalDumdictOwnedValidationRouteKey,",
			"\t\tGeneratedInternalDumdictValidationRouteKey,",
			"\t]",
			"\t\t? true",
			"\t\t: false",
			">;",
			"",
		].join("\n");
		return [
			{
				id: "dumdict-validation-artifacts",
				to: { target: "generated", path: "validation-artifacts.ts" },
				content,
				provenance: [
					...dumlingSchemas,
					...dumdictSchemas,
					...dumrelSchemas,
				].map((source) => source.source),
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

const OFFSET_WIDTH = 4;

function keysOf<Value extends object>(
	value: Value,
): Array<keyof Value & string> {
	return Object.keys(value) as Array<keyof Value & string>;
}

function packIndexedPayloads(payloads: readonly string[]): {
	indexPayload: string;
	offsetPayload: string;
	payloadBlob: string;
} {
	let indexPayload = "";
	let payloadBlob = "";
	const indexes = new Map<string, number>();
	const uniquePayloads: string[] = [];
	for (let index = 0; index < payloads.length; index += 1) {
		const payload = payloads[index];
		if (payload === undefined) {
			throw new Error(
				`Missing generated definition payload at index ${index}.`,
			);
		}
		let payloadIndex = indexes.get(payload);
		if (payloadIndex === undefined) {
			payloadIndex = uniquePayloads.length;
			indexes.set(payload, payloadIndex);
			uniquePayloads.push(payload);
		}
		indexPayload += fixedWidthBase36(payloadIndex);
	}
	let offsetPayload = fixedWidthBase36(0);
	for (const payload of uniquePayloads) {
		payloadBlob += payload;
		offsetPayload += fixedWidthBase36(payloadBlob.length);
	}
	return { indexPayload, offsetPayload, payloadBlob };
}

function fixedWidthBase36(value: number): string {
	const encoded = value.toString(36);
	if (encoded.length > OFFSET_WIDTH) {
		throw new Error(
			`Generated validation payload exceeds ${OFFSET_WIDTH} base36 digits.`,
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
