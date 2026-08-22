import { z } from "zod";
import {
	type Constraint,
	ParsingError,
	parseValidationArtifact,
	type ValidationArtifact,
	type ValidationOperations,
} from "../../battery/common-utils/dist/index.js";
import { canonicalDumdictValidationSchemas } from "../../battery/dumdict/codegen/validation-artifacts";
import {
	makeSurfaceId,
	parseAsChangePrecondition,
	parseAsCommitChangesRequest,
	parseAsCommitChangesResult,
	parseAsDumdictPlan,
	parseAsLemmaRecord,
	parseAsPendingSemanticRelationLocator,
	parseAsPendingSemanticRelationRecord,
	parseAsPlannedChangeOp,
	parseAsReadingEntry,
	parseAsReadingPatchOp,
	parseAsSurfaceEntry,
} from "../../battery/dumdict/src";
import type { encodedDumdictValidationArtifacts } from "../../battery/dumdict/src/generated/validation-artifacts";
import type { DumdictValidationRouteKey } from "../../battery/dumdict/src/parsing/validation-route-types";
import { canonicalDumgenValidationSchemas } from "../../battery/dumgen/codegen/validation-artifacts";
import {
	parseAsGrammaticalInput,
	parseAsGrammaticalInteraction,
	parseAsGrammaticalResult,
	parseAsGrammaticalRoute,
	parseAsKnowledgeGenerationInput,
	parseAsKnowledgeGenerationRequest,
	parseAsKnowledgeGenerationResult,
	parseAsSection1Error,
	parseAsSegment,
	parseAsSegmentationDecision,
	parseAsSegmentationResult,
	parseAsSegmentedSentence,
	parseAsSegmentedSentenceId,
} from "../../battery/dumgen/src";
import type { DumgenValidationRouteKey } from "../../battery/dumgen/src/parsing/validation-routes";
import { collectDumlingValidationSchemas } from "../../battery/dumling/codegen/validation-artifacts";
import {
	dumling,
	parseAsAttestation,
	parseAsLemma,
	parseAsReading,
	parseAsSurface,
	readingFingerprint,
} from "../../battery/dumling/src";
import { decodeDumlingValidationArtifactForRouteKey } from "../../battery/dumling/src/operations/parsing/lightweight-parsers";
import { dumlingValidationOperations } from "../../battery/dumling/src/operations/parsing/validation-operations";
import type { CanonicalDumlingValidationRouteKey } from "../../battery/dumling/src/operations/parsing/validation-routes";
import type { SupportedLanguage } from "../../battery/dumling/src/types";
import { canonicalDumrelValidationSchemas } from "../../battery/dumrel/codegen/validation-artifacts";
import {
	parseAsDirectSemanticRelationGraphEdge,
	parseAsKnowledgeChange,
	parseAsKnowledgeRequestMask,
	parseAsKnowledgeSettings,
	parseAsLexemeUnitShadow,
	parseAsLexicalBreakdown,
	parseAsLexicalUnitShadow,
	parseAsMorphemeReadingReference,
	parseAsMorphologicalTree,
	parseAsMorphologicalTreeNode,
	parseAsMorphologicalTreeStructure,
	parseAsPendingSemanticRelation,
	parseAsReadingKnowledge,
	parseAsSemanticRelationGraph,
	parseAsSemanticRelationGraphReading,
	parseAsSemanticRelations,
	parseAsUnitShadow,
} from "../../battery/dumrel/src";
import { encodedDumrelValidationArtifacts } from "../../battery/dumrel/src/generated/validation-artifacts";
import type { DumrelValidationRouteKey } from "../../battery/dumrel/src/parsing/validation-routes";
import type { DifferentialTarget } from "./differential";

const profileSchema = z
	.object({
		active: z.boolean(),
		name: z.string().min(2),
		nickname: z.string().optional(),
	})
	.strict();
type Profile = z.output<typeof profileSchema>;
const profileArtifact: ValidationArtifact<Profile> = {
	version: 1,
	root: [
		"object",
		{
			active: ["boolean"],
			name: ["string", [["min", 2]]],
			nickname: ["optional", ["string"]],
		},
		"strict",
	],
};

const settingsSchema = z.object({
	mode: z.enum(["auto", "manual"]),
	tags: z.array(z.string()).min(1).max(2),
	threshold: z.union([z.null(), z.number().int().min(1).max(5)]),
});
type Settings = z.output<typeof settingsSchema>;
const settingsArtifact: ValidationArtifact<Settings> = {
	version: 1,
	root: [
		"object",
		{
			mode: ["enum", ["auto", "manual"]],
			tags: [
				"array",
				["string"],
				[
					["min", 1],
					["max", 2],
				],
			],
			threshold: [
				"union",
				[
					["null"],
					["number", [["int"], ["min", 1, true], ["max", 5, true]]],
				],
			],
		},
		"strip",
	],
};

const unionBranchSchema = z.union([
	z.null(),
	z.number().min(1).max(5),
	z.string().min(2),
	z.string().max(0),
	z.object({
		kind: z.literal("text"),
		nested: z.object({
			label: z.string().min(2),
			count: z.number().min(1),
		}),
	}),
	z.object({
		kind: z.literal("count"),
		nested: z.object({
			label: z.number(),
			count: z.string(),
		}),
	}),
]);
type UnionBranch = z.output<typeof unionBranchSchema>;
const unionBranchArtifact: ValidationArtifact<UnionBranch> = {
	version: 1,
	root: [
		"union",
		[
			["null"],
			[
				"number",
				[
					["min", 1, true],
					["max", 5, true],
				],
			],
			["string", [["min", 2]]],
			["string", [["max", 0]]],
			[
				"object",
				{
					kind: ["literal", "text"],
					nested: [
						"object",
						{
							label: ["string", [["min", 2]]],
							count: ["number", [["min", 1, true]]],
						},
						"strip",
					],
				},
				"strip",
			],
			[
				"object",
				{
					kind: ["literal", "count"],
					nested: [
						"object",
						{ label: ["number"], count: ["string"] },
						"strip",
					],
				},
				"strip",
			],
		],
	],
};

function profilePropertyValues(): unknown[] {
	return Array.from({ length: 64 }, (_, index) => ({
		...(index % 3 === 0 ? { extra: index } : {}),
		active: index % 5 === 0 ? index : index % 2 === 0,
		name: index % 7 === 0 ? "x" : `name-${index}`,
		...(index % 4 === 0
			? { nickname: index % 8 === 0 ? false : `nick-${index}` }
			: {}),
	}));
}

function settingsPropertyValues(): unknown[] {
	return Array.from({ length: 64 }, (_, index) => ({
		mode: index % 6 === 0 ? "other" : index % 2 === 0 ? "auto" : "manual",
		tags:
			index % 7 === 0
				? []
				: index % 5 === 0
					? ["a", "b", "c"]
					: [`tag-${index}`],
		threshold:
			index % 4 === 0 ? null : index % 9 === 0 ? true : (index % 5) + 1,
		stripped: index,
	}));
}

function unionBranchPropertyValues(): unknown[] {
	return Array.from({ length: 64 }, (_, index) => {
		switch (index % 8) {
			case 0:
				return 0;
			case 1:
				return 6;
			case 2:
				return "x";
			case 3:
				return null;
			case 4:
				return {
					kind: "text",
					nested: { label: "", count: 0 },
				};
			case 5:
				return {
					kind: "text",
					nested: { label: `label-${index}`, count: 1 },
					stripped: index,
				};
			case 6:
				return {
					kind: "count",
					nested: { label: index, count: `count-${index}` },
				};
			default:
				return { kind: "unknown", nested: null };
		}
	});
}

export const COMMON_UTILS_DIFFERENTIAL_TARGETS: readonly DifferentialTarget<unknown>[] =
	[
		{
			canonical: profileSchema,
			id: "common-utils:strict-profile-artifact",
			lightweight: (input) =>
				parseValidationArtifact(profileArtifact, input),
			propertyValues: profilePropertyValues(),
			representativeValues: [
				{ active: true, name: "Ada" },
				{ active: 1, name: "A", surprise: true },
			],
		},
		{
			canonical: settingsSchema,
			id: "common-utils:nested-settings-artifact",
			lightweight: (input) =>
				parseValidationArtifact(settingsArtifact, input),
			propertyValues: settingsPropertyValues(),
			representativeValues: [
				{ mode: "auto", tags: ["one"], threshold: 3 },
				{ mode: "other", tags: [], threshold: true },
			],
		},
		{
			canonical: unionBranchSchema,
			id: "common-utils:union-best-branch-artifact",
			lightweight: (input) =>
				parseValidationArtifact(unionBranchArtifact, input),
			propertyValues: unionBranchPropertyValues(),
			representativeValues: [
				0,
				"x",
				{
					kind: "text",
					nested: { label: "", count: 0 },
				},
				{
					kind: "text",
					nested: { label: "valid", count: 1 },
					stripped: true,
				},
			],
		},
	];

type DumlingEntity = "Attestation" | "Lemma" | "Reading" | "Surface";
type DumlingDifferentialCase = Readonly<{
	coverage?: readonly DumlingDifferentialCoverage[];
	input: unknown;
	route: string;
}>;

export const REQUIRED_DUMLING_DIFFERENTIAL_COVERAGE = [
	"array-bounds",
	"attestation-members",
	"distinct-pair",
	"enum-literal-null",
	"german-aux-branch",
	"german-verb-branch",
	"inflection-marked",
	"issue-order-and-fields",
	"missing-key",
	"nested-path",
	"normalize-nfc",
	"normalize-reading-lemma",
	"primitive-input",
	"reading-emoji",
	"route-mismatch",
	"string-bounds",
	"surface-marked",
	"trim-string",
	"union-branches",
	"unknown-key",
] as const;

export type DumlingDifferentialCoverage =
	(typeof REQUIRED_DUMLING_DIFFERENTIAL_COVERAGE)[number];

const dumlingCanonicalSchemas = collectDumlingValidationSchemas();

function dumlingCanonicalSchemaFor(route: string): z.ZodType | undefined {
	if (!Object.hasOwn(dumlingCanonicalSchemas, route)) return undefined;
	return dumlingCanonicalSchemas[route as CanonicalDumlingValidationRouteKey];
}

function dumlingRepresentativeCases(
	entity: DumlingEntity,
): DumlingDifferentialCase[] {
	const cases: DumlingDifferentialCase[] = [];
	for (const route of Object.keys(dumlingCanonicalSchemas).toSorted()) {
		if (!route.startsWith(`${entity}:`)) continue;
		const artifact = decodeDumlingValidationArtifactForRouteKey(
			route as CanonicalDumlingValidationRouteKey,
		);
		if (artifact === undefined) {
			throw new Error(`Missing generated Dumling artifact for ${route}.`);
		}
		const definitions = artifact.definitions ?? {};
		const input = exampleForConstraint(artifact.root, definitions);
		const schema = dumlingCanonicalSchemaFor(route);
		if (schema === undefined || !schema.safeParse(input).success) {
			throw new Error(
				`Could not build a valid Dumling differential fixture for ${route}.`,
			);
		}
		cases.push({ input, route });
	}
	return [...cases, ...focusedDumlingCases(entity, cases)];
}

function focusedDumlingCases(
	entity: DumlingEntity,
	baseCases: readonly DumlingDifferentialCase[],
): DumlingDifferentialCase[] {
	const fixture = (route: string): DumlingDifferentialCase => {
		const found = baseCases.find((candidate) => candidate.route === route);
		if (found === undefined)
			throw new Error(`Missing focused route ${route}.`);
		return found;
	};
	const focused = (
		base: DumlingDifferentialCase,
		input: unknown,
		...coverage: DumlingDifferentialCoverage[]
	): DumlingDifferentialCase => ({ coverage, input, route: base.route });
	const clone = <Value>(value: Value): Value => structuredClone(value);

	if (entity === "Lemma") {
		const noun = fixture("Lemma:de/Lexeme/NOUN");
		const normalized = clone(noun.input) as Record<string, unknown>;
		normalized.canonicalForm = "Ha\u0308user";
		const ordered = clone(noun.input) as Record<string, unknown>;
		delete ordered.canonicalForm;
		ordered.kind = "PROPN";
		ordered.unexpected = true;
		const nested = clone(noun.input) as Record<string, unknown>;
		nested.coreFeatures = {
			...(nested.coreFeatures as Record<string, unknown>),
			gender: "Wrong",
		};
		return [
			focused(noun, normalized, "normalize-nfc"),
			focused(
				noun,
				ordered,
				"missing-key",
				"route-mismatch",
				"unknown-key",
				"issue-order-and-fields",
			),
			focused(noun, nested, "enum-literal-null", "nested-path"),
			focused(noun, null, "primitive-input"),
		];
	}

	if (entity === "Surface") {
		const citation = fixture("Surface:de/Citation/Lexeme/NOUN");
		const marked = clone(citation.input) as Record<string, unknown>;
		marked.surfaceFeatures = { historicalStatus: "Archaic" };
		const unmarked = clone(citation.input) as Record<string, unknown>;
		unmarked.surfaceFeatures = { historicalStatus: null };
		const normalized = clone(citation.input) as Record<string, unknown>;
		normalized.normalizedSurface = "Ha\u0308user";
		const nestedMismatch = clone(citation.input) as Record<string, unknown>;
		nestedMismatch.lemma = {
			...(nestedMismatch.lemma as Record<string, unknown>),
			language: "en",
		};

		const determiner = fixture("Surface:de/Inflection/Lexeme/DET");
		const emptyInflection = clone(determiner.input) as Record<
			string,
			unknown
		>;
		emptyInflection.inflectionalFeatures = Object.fromEntries(
			Object.keys(
				emptyInflection.inflectionalFeatures as Record<string, unknown>,
			).map((key) => [key, null]),
		);
		const distinct = clone(determiner.input) as Record<string, unknown>;
		distinct.inflectionalFeatures = {
			...(distinct.inflectionalFeatures as Record<string, unknown>),
			gender: ["Masc", "Fem"],
		};
		const duplicate = clone(distinct) as Record<string, unknown>;
		duplicate.inflectionalFeatures = {
			...(duplicate.inflectionalFeatures as Record<string, unknown>),
			gender: ["Masc", "Masc"],
		};
		const shortPair = clone(distinct) as Record<string, unknown>;
		shortPair.inflectionalFeatures = {
			...(shortPair.inflectionalFeatures as Record<string, unknown>),
			gender: ["Masc"],
		};

		const emptyGermanBranch = (
			route: "AUX" | "VERB",
		): DumlingDifferentialCase => {
			const base = fixture(`Surface:de/Inflection/Lexeme/${route}`);
			const input = clone(base.input) as Record<string, unknown>;
			input.inflectionalFeatures = {
				number: null,
				tense: null,
				verbForm: null,
				voice: null,
			};
			return focused(
				base,
				input,
				route === "AUX" ? "german-aux-branch" : "german-verb-branch",
				"union-branches",
			);
		};
		const verbAlternative = clone(
			fixture("Surface:de/Inflection/Lexeme/VERB").input,
		) as Record<string, unknown>;
		verbAlternative.inflectionalFeatures = {
			mood: "Imp",
			number: null,
			person: null,
			tense: null,
			verbForm: "Fin",
			voice: null,
		};

		return [
			focused(citation, marked, "surface-marked"),
			focused(citation, unmarked, "surface-marked"),
			focused(citation, normalized, "normalize-nfc"),
			focused(citation, nestedMismatch, "route-mismatch", "nested-path"),
			focused(determiner, emptyInflection, "inflection-marked"),
			focused(determiner, distinct, "distinct-pair"),
			focused(determiner, duplicate, "distinct-pair"),
			focused(determiner, shortPair, "array-bounds"),
			emptyGermanBranch("VERB"),
			emptyGermanBranch("AUX"),
			focused(
				fixture("Surface:de/Inflection/Lexeme/VERB"),
				verbAlternative,
				"union-branches",
			),
		];
	}

	if (entity === "Attestation") {
		const noun = fixture("Attestation:de/Citation/Lexeme/NOUN");
		const empty = clone(noun.input) as Record<string, unknown>;
		empty.members = [];
		const invalidMember = clone(noun.input) as Record<string, unknown>;
		invalidMember.members = [
			{ attested: "", orthography: "Wrong", unexpected: true },
		];
		return [
			focused(noun, empty, "array-bounds", "attestation-members"),
			focused(
				noun,
				invalidMember,
				"attestation-members",
				"string-bounds",
				"enum-literal-null",
				"unknown-key",
				"nested-path",
				"issue-order-and-fields",
			),
		];
	}

	const reading = fixture("Reading:de/Lexeme/NOUN");
	const normalized = clone(reading.input) as Record<string, unknown>;
	normalized.lemma = {
		...(normalized.lemma as Record<string, unknown>),
		canonicalForm: "  Ha\u0308user  ",
	};
	normalized.emojiDescription = "  \u{1F3E0}  ";
	const prose = clone(reading.input) as Record<string, unknown>;
	prose.emojiDescription = "prose";
	const tooMany = clone(reading.input) as Record<string, unknown>;
	tooMany.emojiDescription = "\u{1F3E0}\u{1F3E0}\u{1F3E0}\u{1F3E0}\u{1F3E0}";
	const empty = clone(reading.input) as Record<string, unknown>;
	empty.emojiDescription = "   ";
	const mismatch = clone(reading.input) as Record<string, unknown>;
	mismatch.lemma = {
		...(mismatch.lemma as Record<string, unknown>),
		kind: "PROPN",
	};
	return [
		focused(
			reading,
			normalized,
			"normalize-reading-lemma",
			"normalize-nfc",
			"trim-string",
		),
		focused(reading, prose, "reading-emoji"),
		focused(reading, tooMany, "reading-emoji"),
		focused(reading, empty, "string-bounds", "trim-string"),
		focused(reading, mismatch, "route-mismatch", "nested-path"),
	];
}

function exampleForConstraint(
	constraint: Constraint,
	definitions: Readonly<Record<string, Constraint>>,
	operations: ValidationOperations = dumlingValidationOperations,
): unknown {
	const resolved = resolveGeneratedConstraint(constraint, definitions);
	switch (resolved[0]) {
		case "array": {
			const minimum = resolved[2].reduce(
				(current, [kind, size]) =>
					kind === "min" || kind === "length"
						? Math.max(current, size)
						: current,
				0,
			);
			return Array.from({ length: minimum }, () =>
				exampleForConstraint(resolved[1], definitions, operations),
			);
		}
		case "boolean":
			return true;
		case "enum":
			return resolved[1][0];
		case "literal":
			return resolved[1];
		case "null":
			return null;
		case "nullable":
			return null;
		case "object":
			return Object.fromEntries(
				Object.entries(resolved[1]).map(([key, child]) => [
					key,
					exampleForConstraint(child, definitions, operations),
				]),
			);
		case "optional":
			return undefined;
		case "pipe":
			return applyExampleEffects(
				resolved[1],
				exampleForConstraint(resolved[1], definitions, operations),
				resolved[2],
				definitions,
				operations,
			);
		case "preprocess":
			return exampleForConstraint(resolved[2], definitions, operations);
		case "string":
			return "value";
		case "union": {
			for (const option of resolved[1]) {
				const candidate = exampleForConstraint(
					option,
					definitions,
					operations,
				);
				const parsed = parseValidationArtifact(
					{
						definitions,
						root: option,
						version: 1,
					},
					candidate,
					operations,
				);
				if (!(parsed instanceof ParsingError)) return candidate;
			}
			throw new Error(
				"No generated union option produced a valid example.",
			);
		}
		default:
			throw new Error(
				`Unsupported generated example constraint: ${resolved[0]}.`,
			);
	}
}

function applyExampleEffects(
	base: Constraint,
	initialValue: unknown,
	effects: Extract<Constraint, readonly ["pipe", unknown, unknown]>[2],
	definitions: Readonly<Record<string, Constraint>>,
	operations: ValidationOperations,
): unknown {
	let value = initialValue;
	for (const effect of effects) {
		if (effect[0] === "string") {
			const [kind, size] = effect[1];
			if (kind === "min" || kind === "length") {
				value = "x".repeat(size);
			}
			continue;
		}
		if (effect[0] === "array") {
			const [kind, size] = effect[1];
			if (kind === "min" || kind === "length") {
				const arrayConstraint = resolveGeneratedConstraint(
					base,
					definitions,
				);
				if (arrayConstraint[0] !== "array") {
					throw new Error("Array effect is attached to a non-array.");
				}
				value = Array.from({ length: size }, () =>
					exampleForConstraint(
						arrayConstraint[1],
						definitions,
						operations,
					),
				);
			}
			continue;
		}
		if (effect[0] === "regex") {
			value = "\u{1F3E0}";
			continue;
		}
		if (effect[1] === "dumling.distinct-pair") {
			const arrayConstraint = resolveGeneratedConstraint(
				base,
				definitions,
			);
			if (arrayConstraint[0] !== "array") {
				throw new Error(
					"Distinct-pair operation is attached to a non-array.",
				);
			}
			const element = resolveGeneratedConstraint(
				arrayConstraint[1],
				definitions,
			);
			if (element[0] !== "enum" || element[1].length < 2) {
				throw new Error(
					"Distinct-pair operation needs two enum values.",
				);
			}
			value = [element[1][0], element[1][1]];
		}
		if (
			effect[1] === "dumling.inflectional-features.non-empty" ||
			effect[1] === "dumling.german-verb-inflection.non-empty" ||
			effect[1] === "dumling.surface-features.non-empty"
		) {
			value = markFirstNullableProperty(base, value, definitions);
		}
	}
	return value;
}

function markFirstNullableProperty(
	constraint: Constraint,
	value: unknown,
	definitions: Readonly<Record<string, Constraint>>,
): unknown {
	const resolved = resolveGeneratedConstraint(constraint, definitions);
	if (
		resolved[0] !== "object" ||
		value === null ||
		typeof value !== "object" ||
		Array.isArray(value)
	) {
		return value;
	}
	const result = { ...(value as Record<string, unknown>) };
	for (const [key, child] of Object.entries(resolved[1])) {
		const childResolved = resolveGeneratedConstraint(child, definitions);
		if (childResolved[0] !== "nullable") continue;
		result[key] = exampleForConstraint(childResolved[1], definitions);
		return result;
	}
	return result;
}

function resolveGeneratedConstraint(
	constraint: Constraint,
	definitions: Readonly<Record<string, Constraint>>,
): Exclude<Constraint, readonly ["ref", string]> {
	if (constraint[0] !== "ref") return constraint;
	const referenced = definitions[constraint[1]];
	if (referenced === undefined) {
		throw new ReferenceError(
			`Unknown generated Dumling reference: ${constraint[1]}.`,
		);
	}
	return resolveGeneratedConstraint(referenced as Constraint, definitions);
}

function mutateDumlingCase(
	fixture: DumlingDifferentialCase,
	index: number,
): DumlingDifferentialCase {
	if (index % 6 === 0) return fixture;
	if (index % 6 === 1) return { ...fixture, input: null };
	if (
		fixture.input === null ||
		typeof fixture.input !== "object" ||
		Array.isArray(fixture.input)
	) {
		return fixture;
	}
	const input = fixture.input as Record<string, unknown>;
	if (index % 6 === 2) {
		return { ...fixture, input: { ...input, unexpected: true } };
	}
	if (index % 6 === 3) {
		const [firstKey] = Object.keys(input);
		if (firstKey === undefined) return fixture;
		const copy = { ...input };
		delete copy[firstKey];
		return { ...fixture, input: copy };
	}
	if (index % 6 === 4) {
		if ("language" in input) {
			return { ...fixture, input: { ...input, language: "xx" } };
		}
		if ("lemma" in input) {
			return {
				...fixture,
				input: {
					...input,
					lemma: {
						...(input.lemma as Record<string, unknown>),
						kind: "<wrong>",
					},
				},
			};
		}
	}
	if ("emojiDescription" in input) {
		return { ...fixture, input: { ...input, emojiDescription: "prose" } };
	}
	if ("members" in input) {
		return { ...fixture, input: { ...input, members: [] } };
	}
	return fixture;
}

function parseDumlingDifferentialCase(
	entity: DumlingEntity,
	value: unknown,
): unknown {
	if (
		value === null ||
		typeof value !== "object" ||
		!("route" in value) ||
		!("input" in value)
	) {
		return new ParsingError([
			{ code: "custom", message: "Invalid differential case", path: [] },
		]);
	}
	const fixture = value as DumlingDifferentialCase;
	const [routeEntity, coordinates = ""] = fixture.route.split(":");
	if (routeEntity !== entity) {
		return new ParsingError([
			{ code: "custom", message: "Wrong differential entity", path: [] },
		]);
	}
	const parts = coordinates.split("/");
	if (entity === "Lemma") {
		return parseAsLemma(
			fixture.input,
			parts[0] as never,
			parts[1] as never,
			parts[2] as never,
		);
	}
	if (entity === "Reading") {
		return parseAsReading(
			fixture.input,
			parts[0] as never,
			parts[1] as never,
			parts[2] as never,
		);
	}
	const parser = entity === "Surface" ? parseAsSurface : parseAsAttestation;
	return parser(
		fixture.input,
		parts[0] as never,
		parts[1] as never,
		parts[2] as never,
		parts[3] as never,
	);
}

function dumlingTarget(entity: DumlingEntity): DifferentialTarget<unknown> {
	const representativeValues = dumlingRepresentativeCases(entity);
	const propertyValues = Array.from({ length: 64 }, (_, index) =>
		mutateDumlingCase(
			representativeValues[
				index % representativeValues.length
			] as DumlingDifferentialCase,
			index,
		),
	);
	return {
		canonical: {
			safeParse(value: unknown) {
				const fixture = value as DumlingDifferentialCase;
				const schema = dumlingCanonicalSchemaFor(fixture.route);
				if (schema === undefined) {
					return {
						error: { issues: [] },
						success: false as const,
					};
				}
				return schema.safeParse(fixture.input);
			},
		},
		id: `dumling:parseAs${entity}`,
		lightweight: (value) => parseDumlingDifferentialCase(entity, value),
		propertyValues,
		representativeValues,
	};
}

export const DUMLING_DIFFERENTIAL_TARGETS: readonly DifferentialTarget<unknown>[] =
	[
		dumlingTarget("Lemma"),
		dumlingTarget("Surface"),
		dumlingTarget("Attestation"),
		dumlingTarget("Reading"),
	];

export const COVERED_DUMLING_DIFFERENTIAL_BEHAVIORS = [
	...new Set(
		DUMLING_DIFFERENTIAL_TARGETS.flatMap((target) =>
			target.representativeValues.flatMap((value) =>
				value !== null &&
				typeof value === "object" &&
				"coverage" in value &&
				Array.isArray(value.coverage)
					? (value.coverage as DumlingDifferentialCoverage[])
					: [],
			),
		),
	),
].toSorted();

const dumrelNounLemma = dumling.de.create.lemma({
	canonicalForm: "Haus",
	coreFeatures: { gender: "Neut", hyph: null },
	family: "Lexeme",
	kind: "NOUN",
});
const dumrelMorphemeReading = {
	emojiDescription: "🧩",
	lemma: dumling.de.create.lemma({
		canonicalForm: "ab",
		coreFeatures: { hasSepPrefix: null },
		family: "Morpheme",
		kind: "Prefix",
	}),
};
const dumrelNounReading = {
	emojiDescription: "🏠",
	lemma: dumrelNounLemma,
};
const dumrelNounShadow = {
	canonicalForm: "Haus",
	family: "Lexeme",
	kind: "NOUN",
	language: "de",
} as const;
const dumrelStructure = {
	children: [{ nodeKind: "unitShadow", unitShadow: dumrelNounShadow }],
	nodeKind: "structure",
} as const;
const dumrelSettings = {
	definition: true,
	lexicalBreakdown: true,
	morphologicalTree: true,
	semanticRelations: {
		antonym: true,
		holonym: true,
		hypernym: true,
		hyponym: true,
		meronym: true,
		nearAntonym: true,
		nearSynonym: true,
		synonym: true,
	},
	transcription: true,
	translations: { en: true },
} as const;

export const DUMREL_OPERATION_DIFFERENTIAL_COVERAGE = {
	"dumrel.bind-lemma-reference": "dumrel.bind-lemma-reference",
	"dumrel.bind-lexeme-unit-shadow": "dumrel.bind-lexeme-unit-shadow",
	"dumrel.bind-lexical-unit-shadow": "dumrel.bind-lexical-unit-shadow",
	"dumrel.bind-morpheme-reading-reference":
		"dumrel.bind-morpheme-reading-reference",
	"dumrel.bind-supported-unit-shadow": "dumrel.bind-supported-unit-shadow",
	"dumrel.lexeme-unit-shadow": "dumrel.lexeme-unit-shadow",
	"dumrel.lexical-unit-shadow": "dumrel.lexical-unit-shadow",
	"dumrel.morpheme-reading": "dumrel.morpheme-reading",
	"dumrel.normalize-lemma-canonical-form":
		"dumrel.normalize-lemma-canonical-form",
	"dumrel.normalize-nfc": "dumrel.normalize-nfc",
	"dumrel.reading.compact-emoji-sequence":
		"dumrel.reading.compact-emoji-sequence",
	"dumrel.reading.normalize-lemma": "dumrel.reading.normalize-lemma",
	"dumrel.reading.normalize-nfc": "dumrel.reading.normalize-nfc",
	"dumrel.reading.trim-string": "dumrel.reading.trim-string",
	"dumrel.retain-at-least-two": "dumrel.retain-at-least-two",
	"dumrel.retain-non-empty-array": "dumrel.retain-non-empty-array",
	"dumrel.semantic-relation-graph.integrity":
		"dumrel.semantic-relation-graph.integrity",
	"dumrel.semantic-relation-request.non-empty":
		"dumrel.semantic-relation-request.non-empty",
	"dumrel.translation-request.non-empty":
		"dumrel.translation-request.non-empty",
	"dumrel.trim-string": "dumrel.trim-string",
	"dumrel.unit-shadow.supported-route": "dumrel.unit-shadow.supported-route",
} as const satisfies Record<
	(typeof encodedDumrelValidationArtifacts.requiredOperations)[number],
	string
>;

export const REQUIRED_DUMREL_DIFFERENTIAL_COVERAGE = [
	...encodedDumrelValidationArtifacts.requiredOperations,
	"nested-morpheme-reading-issue-path-order",
	"nested-unit-shadow-issue-path-order",
	"padded-decomposed-lemma-normalization",
	"padded-decomposed-reading-normalization",
] as const;

type DumrelDifferentialCoverage =
	(typeof REQUIRED_DUMREL_DIFFERENTIAL_COVERAGE)[number];
type DumrelDifferentialCase = Readonly<{
	coverage?: readonly DumrelDifferentialCoverage[];
	input: unknown;
}>;

const DUMREL_VALID_VALUES = {
	parseAsDirectSemanticRelationGraphEdge: {
		relation: "synonym",
		sourceReading: "a",
		targetLemma: "b",
	},
	parseAsKnowledgeChange: {
		aspect: "definition",
		kind: "Contribute",
		value: "building",
	},
	parseAsKnowledgeRequestMask: {},
	parseAsKnowledgeSettings: dumrelSettings,
	parseAsLexemeUnitShadow: dumrelNounShadow,
	parseAsLexicalBreakdown: [dumrelNounShadow, dumrelNounShadow],
	parseAsLexicalUnitShadow: dumrelNounShadow,
	parseAsMorphemeReadingReference: dumrelMorphemeReading,
	parseAsMorphologicalTree: { root: dumrelStructure },
	parseAsMorphologicalTreeNode: dumrelStructure,
	parseAsMorphologicalTreeStructure: dumrelStructure,
	parseAsPendingSemanticRelation: {
		relation: "synonym",
		target: dumrelNounShadow,
	},
	parseAsReadingKnowledge: {},
	parseAsSemanticRelationGraph: {
		edges: [{ relation: "synonym", sourceReading: "a", targetLemma: "b" }],
		readings: [
			{ lemma: "a-lemma", reading: "a" },
			{ lemma: "b", reading: "b-reading" },
		],
	},
	parseAsSemanticRelationGraphReading: { lemma: "a-lemma", reading: "a" },
	parseAsSemanticRelations: { synonym: [dumrelNounLemma] },
	parseAsUnitShadow: dumrelNounShadow,
} as const satisfies Record<DumrelValidationRouteKey, unknown>;

const DUMREL_PARSERS = {
	parseAsDirectSemanticRelationGraphEdge,
	parseAsKnowledgeChange,
	parseAsKnowledgeRequestMask,
	parseAsKnowledgeSettings,
	parseAsLexemeUnitShadow,
	parseAsLexicalBreakdown,
	parseAsLexicalUnitShadow,
	parseAsMorphemeReadingReference,
	parseAsMorphologicalTree,
	parseAsMorphologicalTreeNode,
	parseAsMorphologicalTreeStructure,
	parseAsPendingSemanticRelation,
	parseAsReadingKnowledge,
	parseAsSemanticRelationGraph,
	parseAsSemanticRelationGraphReading,
	parseAsSemanticRelations,
	parseAsUnitShadow,
} as const satisfies Record<
	DumrelValidationRouteKey,
	(input: unknown) => unknown
>;

function dumrelFocusedValues(key: DumrelValidationRouteKey): unknown[] {
	switch (key) {
		case "parseAsKnowledgeSettings":
			return [{ ...dumrelSettings, unexpected: true }];
		case "parseAsKnowledgeRequestMask":
			return [
				{ translations: {} },
				{ semanticRelations: {} },
				{ translations: { en: null }, transcription: null },
			];
		case "parseAsMorphemeReadingReference":
			return [
				dumrelNounReading,
				{
					emojiDescription: " 🧩 ",
					lemma: {
						...dumrelMorphemeReading.lemma,
						canonicalForm: "  a\u0301b  ",
					},
				},
			];
		case "parseAsUnitShadow":
			return [
				{ ...dumrelNounShadow, kind: "NotAKind" },
				{ ...dumrelNounShadow, canonicalForm: "  Ha\u0308user  " },
			];
		case "parseAsLexicalUnitShadow":
			return [
				{
					canonicalForm: "ab",
					family: "Morpheme",
					kind: "Prefix",
					language: "de",
				},
			];
		case "parseAsLexemeUnitShadow":
			return [
				{
					canonicalForm: "auf jeden Fall",
					family: "Phraseme",
					kind: "DiscourseFormula",
					language: "de",
				},
			];
		case "parseAsMorphologicalTreeStructure":
			return [
				{ children: [], nodeKind: "structure" },
				{
					children: [
						{
							nodeKind: "unitShadow",
							unitShadow: {
								...dumrelNounShadow,
								kind: "NotAKind",
							},
						},
						{
							nodeKind: "morphemeReading",
							reading: dumrelNounReading,
						},
					],
					nodeKind: "structure",
				},
			];
		case "parseAsMorphologicalTreeNode":
			return [
				{ children: [], nodeKind: "structure" },
				{
					nodeKind: "unitShadow",
					unitShadow: {
						...dumrelNounShadow,
						kind: "NotAKind",
					},
				},
				{
					nodeKind: "morphemeReading",
					reading: {
						...dumrelNounReading,
					},
				},
			];
		case "parseAsMorphologicalTree":
			return [
				{
					root: {
						children: [
							{
								nodeKind: "morphemeReading",
								reading: dumrelMorphemeReading,
							},
							dumrelStructure,
						],
						nodeKind: "structure",
					},
				},
			];
		case "parseAsLexicalBreakdown":
			return [[dumrelNounShadow]];
		case "parseAsSemanticRelations":
			return [
				{ hyponym: [dumrelNounLemma] },
				{
					synonym: [
						{
							...dumrelNounLemma,
							canonicalForm: "  Ha\u0308user  ",
						},
					],
				},
				{ synonym: [dumrelNounReading] },
				{ other: [] },
			];
		case "parseAsDirectSemanticRelationGraphEdge":
			return [
				{ relation: "hyponym", sourceReading: "a", targetLemma: "b" },
			];
		case "parseAsSemanticRelationGraphReading":
			return [{ lemma: "  le\u0301mma ", reading: " reading " }];
		case "parseAsSemanticRelationGraph":
			return [
				{
					edges: [
						{
							relation: "synonym",
							sourceReading: "missing",
							targetLemma: "b",
						},
					],
					readings: [
						{ lemma: "one", reading: "same" },
						{ lemma: "one", reading: "same" },
						{ lemma: "other", reading: "same" },
					],
				},
			];
		case "parseAsPendingSemanticRelation":
			return [{ relation: "hyponym", target: dumrelNounShadow }];
		case "parseAsReadingKnowledge":
			return [
				{
					definition: "  cafe\u0301  ",
					semanticRelations: { synonym: [dumrelNounLemma] },
					translations: { de: [" Haus "] },
				},
			];
		case "parseAsKnowledgeChange":
			return [
				{
					aspect: "transcription",
					kind: "Contribute",
					value: " text ",
				},
				{ aspect: "transcription", kind: "Correct", value: "text" },
				{ aspect: "transcription", kind: "Retract" },
				{
					aspect: "translations",
					kind: "Contribute",
					language: "de",
					value: [" Haus "],
				},
				{
					aspect: "translations",
					kind: "Correct",
					language: "de",
					value: ["Haus"],
				},
				{ aspect: "translations", kind: "Retract", language: "de" },
				{
					aspect: "semanticRelations",
					kind: "Contribute",
					relation: "synonym",
					value: [dumrelNounLemma],
				},
				{
					aspect: "semanticRelations",
					kind: "Correct",
					relation: "synonym",
					value: [dumrelNounLemma],
				},
				{
					aspect: "semanticRelations",
					kind: "Retract",
					relation: "synonym",
				},
				{
					aspect: "definition",
					kind: "Correct",
					value: " definition ",
				},
				{ aspect: "definition", kind: "Retract" },
				{
					aspect: "morphologicalTree",
					kind: "Contribute",
					value: { root: dumrelStructure },
				},
				{ aspect: "morphologicalTree", kind: "Retract" },
				{
					aspect: "lexicalBreakdown",
					kind: "Correct",
					value: [dumrelNounShadow, dumrelNounShadow],
				},
				{ aspect: "lexicalBreakdown", kind: "Retract" },
			];
	}
}

function dumrelCoverageForRoute(
	key: DumrelValidationRouteKey,
): readonly DumrelDifferentialCoverage[] {
	switch (key) {
		case "parseAsKnowledgeRequestMask":
			return [
				"dumrel.semantic-relation-request.non-empty",
				"dumrel.translation-request.non-empty",
			];
		case "parseAsMorphemeReadingReference":
			return [
				"dumrel.bind-morpheme-reading-reference",
				"dumrel.morpheme-reading",
				"dumrel.reading.compact-emoji-sequence",
				"dumrel.reading.normalize-lemma",
				"dumrel.reading.normalize-nfc",
				"dumrel.reading.trim-string",
				"padded-decomposed-reading-normalization",
			];
		case "parseAsUnitShadow":
			return [
				"dumrel.bind-supported-unit-shadow",
				"dumrel.normalize-nfc",
				"dumrel.trim-string",
				"dumrel.unit-shadow.supported-route",
			];
		case "parseAsLexicalUnitShadow":
			return [
				"dumrel.bind-lexical-unit-shadow",
				"dumrel.bind-supported-unit-shadow",
				"dumrel.lexical-unit-shadow",
			];
		case "parseAsLexemeUnitShadow":
			return [
				"dumrel.bind-lexeme-unit-shadow",
				"dumrel.bind-supported-unit-shadow",
				"dumrel.lexeme-unit-shadow",
			];
		case "parseAsLexicalBreakdown":
			return ["dumrel.retain-at-least-two"];
		case "parseAsMorphologicalTreeStructure":
			return [
				"dumrel.retain-non-empty-array",
				"nested-morpheme-reading-issue-path-order",
				"nested-unit-shadow-issue-path-order",
			];
		case "parseAsMorphologicalTreeNode":
			return [
				"nested-morpheme-reading-issue-path-order",
				"nested-unit-shadow-issue-path-order",
			];
		case "parseAsSemanticRelations":
			return [
				"dumrel.bind-lemma-reference",
				"dumrel.normalize-lemma-canonical-form",
				"padded-decomposed-lemma-normalization",
			];
		case "parseAsSemanticRelationGraph":
			return ["dumrel.semantic-relation-graph.integrity"];
		default:
			return [];
	}
}

function mutateDumrelValue(value: unknown, index: number): unknown {
	if (index % 8 === 0) return structuredClone(value);
	if (index % 8 === 1) return null;
	if (index % 8 === 2) return `primitive-${index}`;
	if (Array.isArray(value)) {
		if (index % 8 === 3) return [];
		if (index % 8 === 4) return value.slice(0, 1);
		return [...value, index % 2 === 0 ? null : structuredClone(value[0])];
	}
	if (value !== null && typeof value === "object") {
		const clone = structuredClone(value) as Record<string, unknown>;
		const [firstKey] = Object.keys(clone);
		if (index % 8 === 3) return { ...clone, unexpected: index };
		if (index % 8 === 4 && firstKey !== undefined) {
			delete clone[firstKey];
			return clone;
		}
		if (firstKey !== undefined) clone[firstKey] = index;
		return clone;
	}
	return { unexpected: index };
}

export const DUMREL_DIFFERENTIAL_TARGETS: readonly DifferentialTarget<unknown>[] =
	(Object.keys(DUMREL_VALID_VALUES) as DumrelValidationRouteKey[]).map(
		(key) => {
			const valid = DUMREL_VALID_VALUES[key];
			const focused = dumrelFocusedValues(key);
			const representatives: DumrelDifferentialCase[] = [
				{ coverage: dumrelCoverageForRoute(key), input: valid },
				...focused.map((input) => ({ input })),
				{ input: null },
				{ input: { unexpected: true } },
			];
			return {
				canonical: {
					safeParse(value: unknown) {
						return canonicalDumrelValidationSchemas[key].safeParse(
							(value as DumrelDifferentialCase).input,
						);
					},
				},
				id: `dumrel:${key}`,
				lightweight: (value) =>
					DUMREL_PARSERS[key](
						(value as DumrelDifferentialCase).input,
					),
				propertyValues: Array.from({ length: 64 }, (_, index) => ({
					input: mutateDumrelValue(
						representatives[index % representatives.length]?.input,
						index,
					),
				})),
				representativeValues: representatives,
			};
		},
	);

export const COVERED_DUMREL_DIFFERENTIAL_BEHAVIORS = [
	...new Set(
		DUMREL_DIFFERENTIAL_TARGETS.flatMap((target) =>
			target.representativeValues.flatMap((value) =>
				value !== null &&
				typeof value === "object" &&
				"coverage" in value &&
				Array.isArray(value.coverage)
					? (value.coverage as DumrelDifferentialCoverage[])
					: [],
			),
		),
	),
].toSorted();

const DUMGEN_PARSER_NAMES = [
	"parseAsKnowledgeGenerationRequest",
	"parseAsKnowledgeGenerationInput",
	"parseAsKnowledgeGenerationResult",
	"parseAsSegmentedSentenceId",
	"parseAsSegment",
	"parseAsSegmentedSentence",
	"parseAsSegmentationDecision",
	"parseAsSection1Error",
	"parseAsSegmentationResult",
	"parseAsGrammaticalRoute",
	"parseAsGrammaticalInteraction",
	"parseAsGrammaticalInput",
	"parseAsGrammaticalResult",
] as const;

type DumgenParserName = (typeof DUMGEN_PARSER_NAMES)[number];
type DumgenDifferentialCase = Readonly<{
	input: unknown;
	route: DumgenValidationRouteKey;
}>;

const dumgenGermanSentence = {
	id: "sentence-1",
	language: "de",
	segments: [
		{ kind: "ResolvableText", text: "Banken" },
		{ kind: "Punctuation", text: "." },
	],
} as const;
const dumgenHebrewSentence = {
	id: "sentence-2",
	language: "he",
	segments: [{ kind: "ResolvableText", text: "שלום" }],
} as const;
const dumgenGermanReading = {
	emojiDescription: "🏦",
	lemma: {
		canonicalForm: "Bank",
		coreFeatures: { gender: "Fem", hyph: null },
		family: "Lexeme",
		kind: "NOUN",
		language: "de",
	},
} as const;
const dumgenInteraction = {
	clickedSegmentIndex: 0,
	memberSegmentIndices: [0],
	segmentedSentenceId: "sentence-1",
} as const;
const dumgenResolvedResult = {
	attestation: {
		members: [{ attested: "im", orthography: "Standard" }],
		realizationCoverage: "Full",
		surface: {
			language: "de",
			lemma: {
				canonicalForm: "im",
				coreFeatures: {},
				family: "Construction",
				kind: "Fusion",
				language: "de",
			},
			normalizedSurface: "im",
			spelling: "Canonical",
			surfaceFeatures: null,
			surfaceKind: "Citation",
		},
	},
	decision: "Resolved",
	interaction: dumgenInteraction,
	language: "de",
	markedContext: "<TARGET>im</TARGET>",
} as const;

const DUMGEN_VALUES_BY_ROUTE = {
	parseAsKnowledgeGenerationRequest: [
		{},
		{ translations: { en: null } },
		{ translations: {} },
		{ semanticRelations: { synonym: null } },
		{ semanticRelations: {} },
	],
	"parseAsKnowledgeGenerationInput:de": [
		{
			markedContext: "Die <TARGET>Bank</TARGET>.",
			reading: dumgenGermanReading,
			request: {},
		},
		{ markedContext: "", reading: dumgenGermanReading, request: {} },
	],
	parseAsKnowledgeGenerationResult: [
		{ changes: [], pendingRelations: [] },
		{
			decision: "CatalogMiss",
			reason: "MemberNotCatalogued",
			language: "de",
			route: { family: "Lexeme", kind: "NOUN" },
			stage: "ReadingKnowledge",
			reading: dumgenGermanReading,
			missingRequest: { definition: null },
		},
		{
			changes: [
				{
					aspect: "definition",
					kind: "Contribute",
					value: "  Geldinstitut  ",
				},
			],
			pendingRelations: [],
		},
		{
			changes: [],
			pendingRelations: [
				{
					relation: "synonym",
					target: {
						canonicalForm: "  Ha\u0308user  ",
						family: "Lexeme",
						kind: "NOUN",
						language: "de",
					},
				},
			],
		},
		{
			changes: [
				{
					aspect: "morphologicalTree",
					kind: "Contribute",
					value: {
						root: {
							children: [
								{
									nodeKind: "morphemeReading",
									reading: {
										emojiDescription: "🧩",
										lemma: {
											canonicalForm: "  a\u0301b  ",
											coreFeatures: {
												hasSepPrefix: null,
											},
											family: "Morpheme",
											kind: "Prefix",
											language: "de",
										},
									},
								},
							],
							nodeKind: "structure",
						},
					},
				},
			],
			pendingRelations: [],
		},
		{
			changes: [
				{
					aspect: "lexicalBreakdown",
					kind: "Contribute",
					value: [
						dumgenGermanReading.lemma,
						dumgenGermanReading.lemma,
					].map(({ coreFeatures: _, ...lemma }) => lemma),
				},
			],
			pendingRelations: [],
		},
		{
			changes: [
				{
					aspect: "semanticRelations",
					kind: "Contribute",
					relation: "synonym",
					value: [dumgenGermanReading.lemma],
				},
			],
			pendingRelations: [],
		},
	],
	parseAsSegmentedSentenceId: ["sentence-1", "", 1],
	parseAsSegment: [
		{ kind: "Whitespace", text: " " },
		{ kind: "Whitespace", text: "  " },
		{ kind: "OpaqueText", text: "" },
	],
	"parseAsSegmentedSentence:de": [
		dumgenGermanSentence,
		dumgenHebrewSentence,
		{ ...dumgenGermanSentence, segments: [] },
	],
	"parseAsSegmentedSentence:he": [
		dumgenHebrewSentence,
		dumgenGermanSentence,
		{ ...dumgenHebrewSentence, segments: [] },
	],
	parseAsSegmentationDecision: [
		{
			decision: "Accepted",
			language: "de",
			sentence: dumgenGermanSentence,
		},
		{ decision: "UnsupportedLanguage" },
		{ decision: "Unintelligible" },
		{
			decision: "Accepted",
			language: "he",
			sentence: dumgenGermanSentence,
		},
	],
	parseAsSection1Error: [
		{ code: "InvalidInput", itemIndex: 0, message: "bad" },
		{ code: "IntakeFailure", message: "no", reason: "refusal" },
		{ code: "InvalidInput", itemIndex: -1, message: "bad" },
	],
	parseAsSegmentationResult: [
		{
			ok: true,
			value: [
				{
					decision: "Accepted",
					language: "he",
					sentence: dumgenHebrewSentence,
				},
			],
		},
		{ error: { code: "InvalidInput", message: "bad" }, ok: false },
		{ ok: true, value: [] },
	],
	"parseAsGrammaticalRoute:de": [
		{ family: "Construction", kind: "Fusion" },
		{ family: "Lexeme", kind: "NOUN" },
		{ family: "Phraseme", kind: "Idiom" },
		{ family: "Morpheme", kind: "Prefix" },
		{ family: "Construction", kind: "NOUN" },
	],
	parseAsGrammaticalInteraction: [
		dumgenInteraction,
		{ ...dumgenInteraction, clickedSegmentIndex: 1 },
		{ ...dumgenInteraction, memberSegmentIndices: [1, 0] },
	],
	"parseAsGrammaticalInput:de": [
		{ clickedSegmentIndex: 0, sentence: dumgenGermanSentence },
		{ clickedSegmentIndex: 1, sentence: dumgenGermanSentence },
		{ clickedSegmentIndex: 0, sentence: dumgenHebrewSentence },
	],
	"parseAsGrammaticalResult:de": [
		dumgenResolvedResult,
		{
			decision: "CatalogMiss",
			reason: "MemberNotCatalogued",
			language: "de",
			route: { family: "Lexeme", kind: "NOUN" },
			stage: "Lemma",
			candidate: dumgenGermanReading.lemma,
		},
		{
			attestation: {
				members: [{ attested: "Banken", orthography: "Standard" }],
				realizationCoverage: "Full",
				surface: {
					inflectionalFeatures: { case: "Nom", number: "Plur" },
					language: "de",
					lemma: dumgenGermanReading.lemma,
					normalizedSurface: "Banken",
					spelling: "Canonical",
					surfaceFeatures: null,
					surfaceKind: "Inflection",
				},
			},
			decision: "Resolved",
			interaction: dumgenInteraction,
			language: "de",
			markedContext: "<TARGET>Banken</TARGET>",
		},
		{
			attestation: {
				members: [{ attested: "der", orthography: "Standard" }],
				realizationCoverage: "Full",
				surface: {
					inflectionalFeatures: {
						case: null,
						degree: null,
						gender: ["Masc", "Neut"],
						"gender[psor]": null,
						number: null,
						"number[psor]": null,
					},
					language: "de",
					lemma: {
						canonicalForm: "der",
						coreFeatures: {
							definite: null,
							extPos: null,
							foreign: null,
							numType: null,
							person: null,
							polite: null,
							poss: null,
							pronType: null,
						},
						family: "Lexeme",
						kind: "DET",
						language: "de",
					},
					normalizedSurface: "der",
					spelling: "Canonical",
					surfaceFeatures: null,
					surfaceKind: "Inflection",
				},
			},
			decision: "Resolved",
			interaction: dumgenInteraction,
			language: "de",
			markedContext: "<TARGET>der</TARGET>",
		},
		{
			attestation: {
				members: [{ attested: "der", orthography: "Standard" }],
				realizationCoverage: "Full",
				surface: {
					inflectionalFeatures: {
						case: null,
						degree: null,
						gender: ["Masc", "Masc"],
						"gender[psor]": null,
						number: null,
						"number[psor]": null,
					},
					language: "de",
					lemma: {
						canonicalForm: "der",
						coreFeatures: {
							definite: null,
							extPos: null,
							foreign: null,
							numType: null,
							person: null,
							polite: null,
							poss: null,
							pronType: null,
						},
						family: "Lexeme",
						kind: "DET",
						language: "de",
					},
					normalizedSurface: "der",
					spelling: "Canonical",
					surfaceFeatures: null,
					surfaceKind: "Inflection",
				},
			},
			decision: "Resolved",
			interaction: dumgenInteraction,
			language: "de",
			markedContext: "<TARGET>der</TARGET>",
		},
		{
			attestation: {
				members: [{ attested: "ging", orthography: "Standard" }],
				realizationCoverage: "Full",
				surface: {
					inflectionalFeatures: {
						number: "Sing",
						tense: null,
						verbForm: null,
						voice: null,
					},
					language: "de",
					lemma: {
						canonicalForm: "gehen",
						coreFeatures: {
							hasGovPrep: null,
							hasSepPrefix: null,
							lexicallyReflexive: null,
							verbType: null,
						},
						family: "Lexeme",
						kind: "VERB",
						language: "de",
					},
					normalizedSurface: "ging",
					spelling: "Canonical",
					surfaceFeatures: null,
					surfaceKind: "Inflection",
				},
			},
			decision: "Resolved",
			interaction: dumgenInteraction,
			language: "de",
			markedContext: "<TARGET>ging</TARGET>",
		},
		{
			attestation: {
				members: [{ attested: "ging", orthography: "Standard" }],
				realizationCoverage: "Full",
				surface: {
					inflectionalFeatures: {
						number: null,
						tense: null,
						verbForm: null,
						voice: null,
					},
					language: "de",
					lemma: {
						canonicalForm: "gehen",
						coreFeatures: {
							hasGovPrep: null,
							hasSepPrefix: null,
							lexicallyReflexive: null,
							verbType: null,
						},
						family: "Lexeme",
						kind: "VERB",
						language: "de",
					},
					normalizedSurface: "ging",
					spelling: "Canonical",
					surfaceFeatures: null,
					surfaceKind: "Inflection",
				},
			},
			decision: "Resolved",
			interaction: dumgenInteraction,
			language: "de",
			markedContext: "<TARGET>ging</TARGET>",
		},
		{
			...dumgenResolvedResult,
			attestation: {
				...dumgenResolvedResult.attestation,
				surface: {
					...dumgenResolvedResult.attestation.surface,
					surfaceFeatures: { historicalStatus: "Archaic" },
				},
			},
		},
		{
			...dumgenResolvedResult,
			attestation: {
				...dumgenResolvedResult.attestation,
				surface: {
					...dumgenResolvedResult.attestation.surface,
					surfaceFeatures: { historicalStatus: null },
				},
			},
		},
		{
			decision: "NotImplemented",
			language: "de",
			route: { family: "Lexeme", kind: "NOUN" },
		},
		{
			decision: "NotImplemented",
			language: "de",
			route: { family: "Phraseme", kind: "Idiom" },
		},
		{
			decision: "NotImplemented",
			language: "de",
			route: { family: "Morpheme", kind: "Prefix" },
		},
		{ decision: "Unresolved", language: "de" },
		{ ...dumgenResolvedResult, language: "he" },
	],
} as const satisfies Record<DumgenValidationRouteKey, readonly unknown[]>;

function dumgenParserNameForRoute(
	route: DumgenValidationRouteKey,
): DumgenParserName {
	const separator = route.indexOf(":");
	return (
		separator < 0 ? route : route.slice(0, separator)
	) as DumgenParserName;
}

function parseDumgenDifferentialCase(fixture: DumgenDifferentialCase): unknown {
	switch (fixture.route) {
		case "parseAsKnowledgeGenerationRequest":
			return parseAsKnowledgeGenerationRequest(fixture.input);
		case "parseAsKnowledgeGenerationInput:de":
			return parseAsKnowledgeGenerationInput(fixture.input, "de");
		case "parseAsKnowledgeGenerationResult":
			return parseAsKnowledgeGenerationResult(fixture.input);
		case "parseAsSegmentedSentenceId":
			return parseAsSegmentedSentenceId(fixture.input);
		case "parseAsSegment":
			return parseAsSegment(fixture.input);
		case "parseAsSegmentedSentence:de":
			return parseAsSegmentedSentence(fixture.input, "de");
		case "parseAsSegmentedSentence:he":
			return parseAsSegmentedSentence(fixture.input, "he");
		case "parseAsSegmentationDecision":
			return parseAsSegmentationDecision(fixture.input);
		case "parseAsSection1Error":
			return parseAsSection1Error(fixture.input);
		case "parseAsSegmentationResult":
			return parseAsSegmentationResult(fixture.input);
		case "parseAsGrammaticalRoute:de":
			return parseAsGrammaticalRoute(fixture.input, "de");
		case "parseAsGrammaticalInteraction":
			return parseAsGrammaticalInteraction(fixture.input);
		case "parseAsGrammaticalInput:de":
			return parseAsGrammaticalInput(fixture.input, "de");
		case "parseAsGrammaticalResult:de":
			return parseAsGrammaticalResult(fixture.input, "de");
	}
}

function dumgenCasesFor(name: DumgenParserName): DumgenDifferentialCase[] {
	const cases: DumgenDifferentialCase[] = [];
	for (const route of Object.keys(
		DUMGEN_VALUES_BY_ROUTE,
	) as DumgenValidationRouteKey[]) {
		if (dumgenParserNameForRoute(route) !== name) continue;
		for (const input of DUMGEN_VALUES_BY_ROUTE[route])
			cases.push({ input, route });
		cases.push(
			{ input: null, route },
			{ input: { unexpected: true }, route },
		);
	}
	return cases;
}

export const DUMGEN_DIFFERENTIAL_TARGETS: readonly DifferentialTarget<unknown>[] =
	DUMGEN_PARSER_NAMES.map((name) => {
		const representatives = dumgenCasesFor(name);
		return {
			canonical: {
				safeParse(value: unknown) {
					const sample = value as DumgenDifferentialCase;
					return canonicalDumgenValidationSchemas[
						sample.route
					].safeParse(sample.input);
				},
			},
			id: `dumgen:${name}`,
			lightweight: (value) =>
				parseDumgenDifferentialCase(value as DumgenDifferentialCase),
			propertyValues: Array.from({ length: 64 }, (_, index) => {
				const representative =
					representatives[index % representatives.length];
				if (representative === undefined)
					throw new Error(
						`Missing Dumgen representative for ${name}.`,
					);
				return {
					input: mutateDumrelValue(representative.input, index),
					route: representative.route,
				};
			}),
			representativeValues: representatives,
		};
	});

const DUMDICT_PARSER_NAMES = [
	"parseAsChangePrecondition",
	"parseAsCommitChangesRequest",
	"parseAsCommitChangesResult",
	"parseAsDumdictPlan",
	"parseAsLemmaRecord",
	"parseAsPendingSemanticRelationLocator",
	"parseAsPendingSemanticRelationRecord",
	"parseAsPlannedChangeOp",
	"parseAsReadingEntry",
	"parseAsReadingPatchOp",
	"parseAsSurfaceEntry",
] as const;

type DumdictParserName = (typeof DUMDICT_PARSER_NAMES)[number];

export const DUMDICT_OPERATION_FOCUSED_CASES = {
	"dumdict.discriminator.kind.1": "invalid-discriminator",
	"dumdict.discriminator.kind.2": "invalid-discriminator",
	"dumdict.discriminator.kind.3": "invalid-discriminator",
	"dumdict.discriminator.kind.4": "invalid-discriminator",
	"dumdict.discriminator.kind.5": "invalid-discriminator",
	"dumdict.discriminator.kind.6": "invalid-discriminator",
	"dumdict.discriminator.status.1": "invalid-discriminator",
	"dumdict.discriminator.type.1": "invalid-discriminator",
	"dumdict.discriminator.type.2": "invalid-discriminator",
	"dumdict.discriminator.type.3": "invalid-discriminator",
	"dumdict.knowledge-change.language.de": "knowledge-change-language",
	"dumdict.knowledge-change.language.en": "knowledge-change-language",
	"dumdict.knowledge-change.language.he": "knowledge-change-language",
	"dumdict.knowledge-change.reading-matches-patched": "patched-reading-match",
	"dumdict.pending-entry-id.he": "pending-id-transform",
	"dumdict.pending.locator-matches-relation": "pending-locator-relation",
	"dumdict.pending.locator-source": "pending-locator-source",
	"dumdict.pending.target-language.de": "pending-target-language",
	"dumdict.pending.target-language.en": "pending-target-language",
	"dumdict.pending.target-language.he": "pending-target-language",
	"dumdict.reading-entry.no-same-lemma": "reading-entry-no-same-lemma",
	"dumdict.reading-knowledge.language.de": "reading-knowledge-language",
	"dumdict.reading-knowledge.language.en": "reading-knowledge-language",
	"dumdict.reading-knowledge.language.he": "reading-knowledge-language",
	"dumdict.reading.language.de": "canonical-success",
	"dumdict.reading.language.en": "canonical-success",
	"dumdict.reading.language.he": "canonical-success",
	"dumdict.retain-commit-request": "commit-request-transform",
	"dumdict.retain-plan": "dumdict-plan-transform",
	"dumdict.surface.id-matches": "surface-id-match",
	"dumdict.surface.owner-matches": "surface-owner-match",
	"dumdict.transitive.contextual.anonymous": "transitive-lexical-unit-shadow",
	"dumdict.transitive.custom.hasDistinctPair":
		"transitive-dumling-surface-semantics",
	"dumdict.transitive.custom.hasGermanVerbInflectionSignal":
		"transitive-dumling-surface-semantics",
	"dumdict.transitive.custom.hasMarkedInflectionFeature":
		"transitive-dumling-surface-semantics",
	"dumdict.transitive.custom.hasMarkedSurfaceFeature":
		"transitive-dumling-surface-semantics",
	"dumdict.transitive.custom.isCompactEmojiSequence": "canonical-success",
	"dumdict.transitive.custom.isCompactEmojiSequence.2":
		"transitive-morpheme-reading",
	"dumdict.transitive.custom.isLexemeUnitShadow":
		"transitive-lexeme-breakdown",
	"dumdict.transitive.custom.isLexicalUnitShadow":
		"transitive-lexical-unit-shadow",
	"dumdict.transitive.custom.isMorphemeReading":
		"transitive-morpheme-reading",
	"dumdict.transitive.overwrite.dumrelNormalizeNfc":
		"transitive-lexical-unit-shadow",
	"dumdict.transitive.overwrite.dumrelTrimString":
		"transitive-lexical-unit-shadow",
	"dumdict.transitive.overwrite.normalizeNfc": "nested-nfc-normalization",
	"dumdict.transitive.overwrite.normalizeNfc.2": "reading-nfc-normalization",
	"dumdict.transitive.overwrite.normalizeNfc.3":
		"transitive-dumling-surface-semantics",
	"dumdict.transitive.overwrite.trimString": "reading-trim",
	"dumdict.transitive.overwrite.trimString.2": "transitive-morpheme-reading",
	"dumdict.transitive.transform.bindLemmaReference":
		"reading-knowledge-language",
	"dumdict.transitive.transform.bindLexemeUnitShadow":
		"transitive-lexeme-breakdown",
	"dumdict.transitive.transform.bindLexicalUnitShadow":
		"transitive-lexical-unit-shadow",
	"dumdict.transitive.transform.bindMorphemeReadingReference":
		"transitive-morpheme-reading",
	"dumdict.transitive.transform.bindSupportedUnitShadow":
		"transitive-lexical-unit-shadow",
	"dumdict.transitive.transform.normalizeLemmaCanonicalForm":
		"reading-knowledge-language",
	"dumdict.transitive.transform.normalizeReadingLemma":
		"reading-nfc-normalization",
	"dumdict.transitive.transform.normalizeReadingLemma.2":
		"transitive-morpheme-reading",
	"dumdict.transitive.transform.retainAtLeastTwo":
		"transitive-lexeme-breakdown",
	"dumdict.transitive.transform.retainNonEmptyArray":
		"transitive-morpheme-reading",
} as const satisfies Record<
	(typeof encodedDumdictValidationArtifacts.requiredOperations)[number],
	string
>;

export const REQUIRED_DUMDICT_OPERATION_CASE_IDS = [
	...new Set(Object.values(DUMDICT_OPERATION_FOCUSED_CASES)),
].toSorted();

type DumdictDifferentialCase = Readonly<{
	coverage?: readonly string[];
	input: unknown;
	route: DumdictValidationRouteKey;
}>;

const dumdictLemmas = {
	de: dumling.de.create.lemma({
		canonicalForm: "Haus",
		coreFeatures: { gender: "Neut", hyph: null },
		family: "Lexeme",
		kind: "NOUN",
	}),
	en: dumling.en.create.lemma({
		canonicalForm: "house",
		coreFeatures: {
			abbr: null,
			extPos: null,
			foreign: null,
			numForm: null,
			numType: null,
			style: null,
		},
		family: "Lexeme",
		kind: "NOUN",
	}),
	he: dumling.he.create.lemma({
		canonicalForm: "בית",
		coreFeatures: { abbr: null, gender: "Masc" },
		family: "Lexeme",
		kind: "NOUN",
	}),
} as const;

const dumdictReadings = {
	de: { emojiDescription: "🏠", lemma: dumdictLemmas.de },
	en: { emojiDescription: "🏠", lemma: dumdictLemmas.en },
	he: { emojiDescription: "🏠", lemma: dumdictLemmas.he },
} as const;

const dumdictSurfaces = {
	de: dumling.de.create.surface.citation({
		lemma: dumdictLemmas.de,
		normalizedSurface: "Haus",
		spelling: "Canonical",
		surfaceFeatures: null,
	}),
	en: dumling.en.create.surface.citation({
		lemma: dumdictLemmas.en,
		normalizedSurface: "house",
		spelling: "Canonical",
		surfaceFeatures: null,
	}),
	he: dumling.he.create.surface.citation({
		lemma: dumdictLemmas.he,
		normalizedSurface: "בית",
		spelling: "Canonical",
		surfaceFeatures: null,
	}),
} as const;

function dumlingExampleForRoute(route: CanonicalDumlingValidationRouteKey) {
	const artifact = decodeDumlingValidationArtifactForRouteKey(route);
	if (artifact === undefined)
		throw new Error(`Missing generated Dumling artifact for ${route}.`);
	return exampleForConstraint(
		artifact.root,
		artifact.definitions ?? {},
		dumlingValidationOperations,
	);
}

function validDumdictInput(
	name: DumdictParserName,
	language: SupportedLanguage | undefined,
): unknown {
	if (name === "parseAsCommitChangesResult") {
		return { nextRevision: "revision-2", status: "committed" };
	}
	const selectedLanguage = requiredLanguage(language);
	const lemma = dumdictLemmas[selectedLanguage];
	const reading = dumdictReadings[selectedLanguage];
	const surface = dumdictSurfaces[selectedLanguage];
	const changePrecondition = {
		kind: "revisionMatches",
		revision: "revision-1",
	};
	const plannedChange = {
		preconditions: [],
		record: { lemma },
		type: "createLemma",
	};
	switch (name) {
		case "parseAsChangePrecondition":
			return changePrecondition;
		case "parseAsCommitChangesRequest":
		case "parseAsDumdictPlan":
			return { baseRevision: "revision-1", changes: [plannedChange] };
		case "parseAsLemmaRecord":
			return { lemma };
		case "parseAsPendingSemanticRelationLocator":
			return {
				relation: "nearSynonym",
				sourceReadingKey: readingFingerprint(reading),
				targetPendingId: `pending:${selectedLanguage}`,
			};
		case "parseAsPendingSemanticRelationRecord":
			return {
				locator: {
					relation: "nearSynonym",
					sourceReadingKey: readingFingerprint(reading),
					targetPendingId: `pending:${selectedLanguage}`,
				},
				pending: {
					relation: "nearSynonym",
					target: {
						canonicalForm: `target-${selectedLanguage}`,
						family: "Lexeme",
						kind: "NOUN",
						language: selectedLanguage,
					},
				},
				sourceReading: reading,
			};
		case "parseAsPlannedChangeOp":
			return plannedChange;
		case "parseAsReadingEntry":
			return {
				attestations: [],
				attestedTranslations: [],
				notes: "",
				reading,
			};
		case "parseAsReadingPatchOp":
			return { kind: "addAttestation", value: "text" };
		case "parseAsSurfaceEntry":
			return {
				attestations: [],
				attestedTranslations: [],
				id: makeSurfaceId(selectedLanguage, surface),
				notes: "",
				ownerLemma: lemma,
				surface,
			};
	}
}

function parseDumdictDifferentialCase(value: DumdictDifferentialCase): unknown {
	const [name, language] = value.route.split(":") as [
		DumdictParserName,
		SupportedLanguage | undefined,
	];
	switch (name) {
		case "parseAsChangePrecondition":
			return parseAsChangePrecondition(
				value.input,
				requiredLanguage(language),
			);
		case "parseAsCommitChangesRequest":
			return parseAsCommitChangesRequest(
				value.input,
				requiredLanguage(language),
			);
		case "parseAsCommitChangesResult":
			return parseAsCommitChangesResult(value.input);
		case "parseAsDumdictPlan":
			return parseAsDumdictPlan(value.input, requiredLanguage(language));
		case "parseAsLemmaRecord":
			return parseAsLemmaRecord(value.input, requiredLanguage(language));
		case "parseAsPendingSemanticRelationLocator":
			return parseAsPendingSemanticRelationLocator(
				value.input,
				requiredLanguage(language),
			);
		case "parseAsPendingSemanticRelationRecord":
			return parseAsPendingSemanticRelationRecord(
				value.input,
				requiredLanguage(language),
			);
		case "parseAsPlannedChangeOp":
			return parseAsPlannedChangeOp(
				value.input,
				requiredLanguage(language),
			);
		case "parseAsReadingEntry":
			return parseAsReadingEntry(value.input, requiredLanguage(language));
		case "parseAsReadingPatchOp":
			return parseAsReadingPatchOp(
				value.input,
				requiredLanguage(language),
			);
		case "parseAsSurfaceEntry":
			return parseAsSurfaceEntry(value.input, requiredLanguage(language));
	}
}

function requiredLanguage(
	language: SupportedLanguage | undefined,
): SupportedLanguage {
	if (language === undefined) {
		throw new TypeError("Dumdict language route is missing its language.");
	}
	return language;
}

function otherDumdictLanguage(language: SupportedLanguage): SupportedLanguage {
	switch (language) {
		case "de":
			return "en";
		case "en":
			return "he";
		case "he":
			return "de";
	}
}

function focusedDumdictInputs(
	name: DumdictParserName,
	language: SupportedLanguage | undefined,
	valid: unknown,
): readonly Readonly<{ coverage: readonly string[]; input: unknown }>[] {
	if (name === "parseAsCommitChangesResult") {
		return [
			{
				coverage: ["discriminator-branch", "optional-field"],
				input: {
					code: "revisionConflict",
					latestRevision: "revision-1",
					status: "conflict",
				},
			},
			{
				coverage: ["invalid-discriminator", "ordered-object-issues"],
				input: { status: "unknown", unexpected: true },
			},
		];
	}

	const selectedLanguage = requiredLanguage(language);
	const otherLanguage = otherDumdictLanguage(selectedLanguage);
	const selectedLemma = dumdictLemmas[selectedLanguage];
	const otherLemma = dumdictLemmas[otherLanguage];
	const selectedReading = dumdictReadings[selectedLanguage];
	const otherReading = dumdictReadings[otherLanguage];
	const decomposed = "cafe\u0301";

	switch (name) {
		case "parseAsChangePrecondition":
			return [
				{
					coverage: ["discriminator-branch", "reading-language"],
					input: { kind: "readingExists", reading: otherReading },
				},
				{
					coverage: ["invalid-discriminator", "unknown-key"],
					input: { kind: "unknown", unexpected: true },
				},
			];
		case "parseAsCommitChangesRequest":
		case "parseAsDumdictPlan":
			return [
				{
					coverage: [
						"nested-nfc-normalization",
						name === "parseAsCommitChangesRequest"
							? "commit-request-transform"
							: "dumdict-plan-transform",
					],
					input: {
						baseRevision: "revision-1",
						changes: [
							{
								preconditions: [],
								record: {
									lemma: {
										...selectedLemma,
										canonicalForm: decomposed,
									},
								},
								type: "createLemma",
							},
						],
					},
				},
				{
					coverage: ["nested-discriminator", "ordered-object-issues"],
					input: {
						baseRevision: "",
						changes: [{ type: "unknown", unexpected: true }],
					},
				},
			];
		case "parseAsLemmaRecord":
			return [
				{
					coverage: ["nested-nfc-normalization"],
					input: {
						lemma: {
							...selectedLemma,
							canonicalForm: decomposed,
						},
					},
				},
				{
					coverage: ["route-language-mismatch", "unknown-key"],
					input: { lemma: otherLemma, unexpected: true },
				},
			];
		case "parseAsPendingSemanticRelationLocator":
			return [
				{
					coverage: [
						"pending-id-transform",
						"string-minimum",
						"enum",
						"ordered-object-issues",
					],
					input: {
						relation: "unknown",
						sourceReadingKey: "",
						targetPendingId: "",
					},
				},
			];
		case "parseAsPendingSemanticRelationRecord": {
			const wrongLanguage = structuredClone(valid) as {
				pending: { target: { language: string } };
			};
			wrongLanguage.pending.target.language = otherLanguage;
			const wrongLocator = structuredClone(valid) as {
				locator: { relation: string; sourceReadingKey: string };
			};
			wrongLocator.locator.sourceReadingKey = "wrong-source";
			wrongLocator.locator.relation = "synonym";
			return [
				{
					coverage: ["pending-target-language"],
					input: wrongLanguage,
				},
				{
					coverage: [
						"pending-locator-source",
						"pending-locator-relation",
						"ordered-contextual-issues",
					],
					input: wrongLocator,
				},
			];
		}
		case "parseAsPlannedChangeOp": {
			const mismatchedReading = {
				...selectedReading,
				emojiDescription: "🚪",
			};
			return [
				{
					coverage: [
						"knowledge-change-normalization",
						"patched-reading-match",
					],
					input: {
						ops: [
							{
								envelope: {
									change: {
										aspect: "definition",
										kind: "Contribute",
										value: " home ",
									},
									reading: mismatchedReading,
								},
								kind: "applyKnowledgeChange",
							},
						],
						preconditions: [],
						reading: selectedReading,
						type: "patchReading",
					},
				},
				{
					coverage: [
						"invalid-discriminator",
						"ordered-object-issues",
					],
					input: { preconditions: [], type: "unknown" },
				},
			];
		}
		case "parseAsReadingEntry":
			return [
				{
					coverage: ["reading-trim", "reading-nfc-normalization"],
					input: {
						...(valid as Record<string, unknown>),
						reading: {
							...selectedReading,
							emojiDescription: "  🏠  ",
							lemma: {
								...selectedLemma,
								canonicalForm: decomposed,
							},
						},
					},
				},
				{
					coverage: [
						"reading-knowledge-language",
						"cross-language-safe-parse",
					],
					input: {
						...(valid as Record<string, unknown>),
						knowledge: {
							semanticRelations: { nearSynonym: [otherLemma] },
						},
					},
				},
				{
					coverage: ["reading-entry-no-same-lemma"],
					input: {
						...(valid as Record<string, unknown>),
						knowledge: {
							semanticRelations: { synonym: [selectedLemma] },
						},
					},
				},
			];
		case "parseAsReadingPatchOp":
			return [
				{
					coverage: [
						"knowledge-change-normalization",
						"knowledge-change-language",
					],
					input: {
						envelope: {
							change: {
								aspect: "semanticRelations",
								kind: "Contribute",
								relation: "synonym",
								value: [otherLemma],
							},
							reading: selectedReading,
						},
						kind: "applyKnowledgeChange",
					},
				},
				{
					coverage: ["invalid-discriminator"],
					input: { kind: "unknown", value: "text" },
				},
				...(selectedLanguage === "de"
					? [
							{
								coverage: [
									"transitive-morpheme-reading",
									"transitive-lexical-unit-shadow",
								],
								input: {
									envelope: {
										change: {
											aspect: "morphologicalTree",
											kind: "Contribute",
											value: {
												root: {
													children: [
														{
															nodeKind:
																"morphemeReading",
															reading: {
																...dumrelMorphemeReading,
																emojiDescription:
																	"  🧩  ",
																lemma: {
																	...dumrelMorphemeReading.lemma,
																	canonicalForm:
																		"  a\u0301b  ",
																},
															},
														},
														{
															nodeKind:
																"unitShadow",
															unitShadow: {
																canonicalForm:
																	"  a\u0301b  ",
																family: "Phraseme",
																kind: "Idiom",
																language: "de",
															},
														},
													],
													nodeKind: "structure",
												},
											},
										},
										reading: selectedReading,
									},
									kind: "applyKnowledgeChange",
								},
							},
							{
								coverage: [
									"transitive-morpheme-reading",
									"transitive-lexical-unit-shadow",
								],
								input: {
									envelope: {
										change: {
											aspect: "morphologicalTree",
											kind: "Contribute",
											value: {
												root: {
													children: [
														{
															nodeKind:
																"morphemeReading",
															reading:
																dumrelNounReading,
														},
														{
															nodeKind:
																"unitShadow",
															unitShadow: {
																canonicalForm:
																	"ab",
																family: "Lexeme",
																kind: "NOT_A_KIND",
																language: "de",
															},
														},
													],
													nodeKind: "structure",
												},
											},
										},
										reading: selectedReading,
									},
									kind: "applyKnowledgeChange",
								},
							},
							{
								coverage: ["transitive-lexeme-breakdown"],
								input: {
									envelope: {
										change: {
											aspect: "lexicalBreakdown",
											kind: "Contribute",
											value: [
												{
													...dumrelNounShadow,
													canonicalForm:
														"  Ha\u0308user  ",
												},
												dumrelNounShadow,
											],
										},
										reading: selectedReading,
									},
									kind: "applyKnowledgeChange",
								},
							},
							{
								coverage: ["transitive-lexeme-breakdown"],
								input: {
									envelope: {
										change: {
											aspect: "lexicalBreakdown",
											kind: "Contribute",
											value: [
												{
													canonicalForm: "phrase",
													family: "Phraseme",
													kind: "Idiom",
													language: "de",
												},
											],
										},
										reading: selectedReading,
									},
									kind: "applyKnowledgeChange",
								},
							},
						]
					: []),
			];
		case "parseAsSurfaceEntry": {
			const input = structuredClone(valid) as {
				id: string;
				ownerLemma: unknown;
				surface: Record<string, unknown>;
			};
			input.id = "wrong-id";
			input.ownerLemma = otherLemma;
			const transitiveSurfaceCases =
				selectedLanguage === "de"
					? [
							"Surface:de/Citation/Lexeme/NOUN",
							"Surface:de/Inflection/Lexeme/DET",
							"Surface:de/Inflection/Lexeme/VERB",
						].map((route) => {
							let surface = dumlingExampleForRoute(
								route as CanonicalDumlingValidationRouteKey,
							) as Record<string, unknown>;
							if (route.includes("/Citation/")) {
								surface = {
									...surface,
									surfaceFeatures: {
										historicalStatus: "Archaic",
									},
								};
							}
							if (route.endsWith("/DET")) {
								surface = {
									...surface,
									inflectionalFeatures: {
										...(surface.inflectionalFeatures as Record<
											string,
											unknown
										>),
										gender: ["Masc", "Neut"],
									},
								};
							}
							let surfaceId: string;
							try {
								surfaceId = makeSurfaceId(
									"de",
									surface as never,
								);
							} catch (error) {
								const canonical =
									dumlingCanonicalSchemaFor(route);
								const diagnostic =
									canonical?.safeParse(surface);
								throw new Error(
									`Could not build Dumdict SurfaceEntry fixture for ${route}: ${diagnostic?.success === false ? JSON.stringify(diagnostic.error.issues) : "canonical schema accepted input"}.`,
									{ cause: error },
								);
							}
							const wrap = (
								candidate: Record<string, unknown>,
							) => ({
								...(valid as Record<string, unknown>),
								id: surfaceId,
								ownerLemma: candidate.lemma,
								surface: candidate,
							});
							return {
								coverage: [
									"transitive-dumling-surface-semantics",
								],
								input: wrap(surface),
							};
						})
					: [];
			return [
				{
					coverage: [
						"surface-owner-match",
						"surface-id-match",
						"ordered-contextual-issues",
					],
					input,
				},
				...transitiveSurfaceCases,
			];
		}
	}
}

function dumdictCasesFor(name: DumdictParserName): DumdictDifferentialCase[] {
	const cases: DumdictDifferentialCase[] = [];
	for (const route of Object.keys(
		canonicalDumdictValidationSchemas,
	) as DumdictValidationRouteKey[]) {
		if (route !== name && !route.startsWith(`${name}:`)) continue;
		const [, language] = route.split(":") as [
			DumdictParserName,
			SupportedLanguage | undefined,
		];
		const valid = validDumdictInput(name, language);
		if (
			!canonicalDumdictValidationSchemas[route].safeParse(valid).success
		) {
			throw new Error(
				`Could not build a valid Dumdict differential fixture for ${route}.`,
			);
		}
		cases.push(
			{ coverage: ["canonical-success"], input: valid, route },
			...focusedDumdictInputs(name, language, valid).map((value) => ({
				...value,
				route,
			})),
			{ input: null, route },
			{ input: { unexpected: true }, route },
		);
	}
	return cases;
}

export const DUMDICT_DIFFERENTIAL_TARGETS: readonly DifferentialTarget<unknown>[] =
	DUMDICT_PARSER_NAMES.map((name) => {
		const representatives = dumdictCasesFor(name);
		return {
			canonical: {
				safeParse(value: unknown) {
					const sample = value as DumdictDifferentialCase;
					return canonicalDumdictValidationSchemas[
						sample.route
					].safeParse(sample.input);
				},
			},
			id: `dumdict:${name}`,
			lightweight: (value) =>
				parseDumdictDifferentialCase(value as DumdictDifferentialCase),
			propertyValues: Array.from({ length: 64 }, (_, index) => {
				const representative =
					representatives[index % representatives.length];
				if (representative === undefined) {
					throw new Error(
						`Missing Dumdict representative for ${name}.`,
					);
				}
				return {
					input: mutateDumrelValue(representative.input, index),
					route: representative.route,
				};
			}),
			representativeValues: representatives,
		};
	});

export const COVERED_DUMDICT_DIFFERENTIAL_BEHAVIORS = [
	...new Set(
		DUMDICT_DIFFERENTIAL_TARGETS.flatMap((target) =>
			target.representativeValues.flatMap((value) =>
				value !== null &&
				typeof value === "object" &&
				"coverage" in value &&
				Array.isArray(value.coverage)
					? (value.coverage as string[])
					: [],
			),
		),
	),
].toSorted();

export const DUM_DIFFERENTIAL_TARGETS: readonly DifferentialTarget<unknown>[] =
	[
		...COMMON_UTILS_DIFFERENTIAL_TARGETS,
		...DUMLING_DIFFERENTIAL_TARGETS,
		...DUMREL_DIFFERENTIAL_TARGETS,
		...DUMDICT_DIFFERENTIAL_TARGETS,
		...DUMGEN_DIFFERENTIAL_TARGETS,
	];
