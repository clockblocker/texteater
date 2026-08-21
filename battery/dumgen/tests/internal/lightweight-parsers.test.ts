import { describe, expect, test } from "bun:test";
import { ParsingError } from "common-utils";
import { canonicalDumgenValidationSchemas } from "../../codegen/validation-artifacts";
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
} from "../../src";
import type { DumgenValidationRouteKey } from "../../src/parsing/validation-routes";

const germanSentence = {
	id: "sentence-1",
	language: "de",
	segments: [
		{ kind: "ResolvableText", text: "Banken" },
		{ kind: "OpaqueText", text: "." },
	],
} as const;
const hebrewSentence = {
	id: "sentence-2",
	language: "he",
	segments: [{ kind: "ResolvableText", text: "שלום" }],
} as const;
const germanReading = {
	lemma: {
		language: "de",
		canonicalForm: "Bank",
		family: "Lexeme",
		kind: "NOUN",
		coreFeatures: { gender: "Fem", hyph: null },
	},
	emojiDescription: "🏦",
} as const;
const interaction = {
	segmentedSentenceId: "sentence-1",
	clickedSegmentIndex: 0,
	memberSegmentIndices: [0],
} as const;
const resolvedResult = {
	decision: "Resolved",
	language: "de",
	markedContext: "<TARGET>im</TARGET>",
	attestation: {
		members: [{ attested: "im", orthography: "Standard" }],
		realizationCoverage: "Full",
		surface: {
			language: "de",
			normalizedSurface: "im",
			spelling: "Canonical",
			surfaceKind: "Citation",
			surfaceFeatures: null,
			lemma: {
				language: "de",
				canonicalForm: "im",
				family: "Construction",
				kind: "Fusion",
				coreFeatures: {},
			},
		},
	},
	interaction,
} as const;

type Target = Readonly<{
	key: DumgenValidationRouteKey;
	parse: (input: unknown) => unknown;
	values: readonly unknown[];
}>;

const targets: readonly Target[] = [
	{
		key: "parseAsKnowledgeGenerationRequest",
		parse: parseAsKnowledgeGenerationRequest,
		values: [{}, { translations: { en: null } }, { translations: {} }],
	},
	{
		key: "parseAsKnowledgeGenerationInput:de",
		parse: (input) => parseAsKnowledgeGenerationInput(input, "de"),
		values: [
			{
				markedContext: "Die <TARGET>Bank</TARGET>.",
				reading: germanReading,
				request: {},
			},
			{ markedContext: "", reading: germanReading, request: {} },
			{
				markedContext: "The bank.",
				reading: {
					...germanReading,
					lemma: { ...germanReading.lemma, language: "en" },
				},
				request: {},
			},
		],
	},
	{
		key: "parseAsKnowledgeGenerationResult",
		parse: parseAsKnowledgeGenerationResult,
		values: [
			{ changes: [], pendingRelations: [] },
			{
				changes: [
					{
						kind: "Contribute",
						aspect: "definition",
						value: "Geldinstitut",
					},
				],
				pendingRelations: [],
			},
			{
				changes: [],
				pendingRelations: [
					{
						relation: "hypernym",
						target: {
							language: "en",
							canonicalForm: "bank",
							family: "Lexeme",
							kind: "NOUN",
						},
					},
				],
			},
		],
	},
	{
		key: "parseAsSegmentedSentenceId",
		parse: parseAsSegmentedSentenceId,
		values: ["sentence-1", "", 1],
	},
	{
		key: "parseAsSegment",
		parse: parseAsSegment,
		values: [
			{ kind: "Whitespace", text: " " },
			{ kind: "Whitespace", text: "  " },
			{ kind: "OpaqueText", text: "" },
		],
	},
	{
		key: "parseAsSegmentedSentence:de",
		parse: (input) => parseAsSegmentedSentence(input, "de"),
		values: [
			germanSentence,
			hebrewSentence,
			{ ...germanSentence, segments: [] },
		],
	},
	{
		key: "parseAsSegmentedSentence:he",
		parse: (input) => parseAsSegmentedSentence(input, "he"),
		values: [
			hebrewSentence,
			germanSentence,
			{ ...hebrewSentence, segments: [] },
		],
	},
	{
		key: "parseAsSegmentationDecision",
		parse: parseAsSegmentationDecision,
		values: [
			{ decision: "Accepted", language: "de", sentence: germanSentence },
			{ decision: "UnsupportedLanguage" },
			{ decision: "Accepted", language: "he", sentence: germanSentence },
		],
	},
	{
		key: "parseAsSection1Error",
		parse: parseAsSection1Error,
		values: [
			{ code: "InvalidInput", message: "bad", itemIndex: 0 },
			{ code: "IntakeFailure", reason: "refusal", message: "no" },
			{ code: "InvalidInput", message: "bad", itemIndex: -1 },
		],
	},
	{
		key: "parseAsSegmentationResult",
		parse: parseAsSegmentationResult,
		values: [
			{
				ok: true,
				value: [
					{
						decision: "Accepted",
						language: "he",
						sentence: hebrewSentence,
					},
				],
			},
			{ ok: false, error: { code: "InvalidInput", message: "bad" } },
			{ ok: true, value: [] },
		],
	},
	{
		key: "parseAsGrammaticalRoute:de",
		parse: (input) => parseAsGrammaticalRoute(input, "de"),
		values: [
			{ family: "Construction", kind: "Fusion" },
			{ family: "Lexeme", kind: "NOUN" },
			{ family: "Construction", kind: "NOUN" },
		],
	},
	{
		key: "parseAsGrammaticalInteraction",
		parse: parseAsGrammaticalInteraction,
		values: [
			interaction,
			{ ...interaction, clickedSegmentIndex: 1 },
			{ ...interaction, memberSegmentIndices: [1, 0] },
		],
	},
	{
		key: "parseAsGrammaticalInput:de",
		parse: (input) => parseAsGrammaticalInput(input, "de"),
		values: [
			{ sentence: germanSentence, clickedSegmentIndex: 0 },
			{ sentence: germanSentence, clickedSegmentIndex: 1 },
			{ sentence: hebrewSentence, clickedSegmentIndex: 0 },
		],
	},
	{
		key: "parseAsGrammaticalResult:de",
		parse: (input) => parseAsGrammaticalResult(input, "de"),
		values: [
			resolvedResult,
			{ decision: "Unresolved", language: "de" },
			{
				...resolvedResult,
				attestation: {
					...resolvedResult.attestation,
					surface: {
						...resolvedResult.attestation.surface,
						language: "he",
					},
				},
			},
		],
	},
] as const;

function expectParity(target: Target, input: unknown): void {
	const expected =
		canonicalDumgenValidationSchemas[target.key].safeParse(input);
	let actual: unknown;
	expect(() => {
		actual = target.parse(input);
	}).not.toThrow();
	if (expected.success) {
		expect(actual).toEqual(expected.data);
		expect(frozenShape(actual)).toEqual(frozenShape(expected.data));
		return;
	}
	expect(actual).toBeInstanceOf(ParsingError);
	if (!(actual instanceof ParsingError))
		throw new Error("expected ParsingError");
	expect(actual.issues).toEqual(expected.error.issues);
}

function frozenShape(value: unknown): unknown {
	if (value === null || typeof value !== "object") return false;
	return {
		frozen: Object.isFrozen(value),
		children: Object.fromEntries(
			Object.entries(value).map(([key, child]) => [
				key,
				frozenShape(child),
			]),
		),
	};
}

describe("Dumgen lightweight parsers", () => {
	test("perform no module or file I/O on first and repeated parser calls", () => {
		const originalGetBuiltinModule = process.getBuiltinModule;
		const loadedModules: string[] = [];
		Object.defineProperty(process, "getBuiltinModule", {
			configurable: true,
			value(specifier: string) {
				loadedModules.push(specifier);
				return originalGetBuiltinModule(specifier);
			},
		});
		try {
			for (const target of targets) {
				target.parse(target.values[0]);
				target.parse(target.values[0]);
			}
		} finally {
			Object.defineProperty(process, "getBuiltinModule", {
				configurable: true,
				value: originalGetBuiltinModule,
			});
		}
		expect(loadedModules).toEqual([]);
	});

	for (const target of targets) {
		test(`${target.key} matches canonical representatives and never throws ordinary failures`, () => {
			for (const value of [
				...target.values,
				null,
				{},
				[],
				"unexpected",
				42,
			])
				expectParity(target, value);
		});
	}

	test("guards the only public root that can reach recursive morphology", () => {
		const cyclicChildren: unknown[] = [];
		const cyclicNode = { children: cyclicChildren, nodeKind: "structure" };
		cyclicChildren.push(cyclicNode);
		const cyclic = parseAsKnowledgeGenerationResult({
			changes: [
				{
					kind: "Contribute",
					aspect: "morphologicalTree",
					value: { root: cyclicNode },
				},
			],
			pendingRelations: [],
		});
		expect(cyclic).toBeInstanceOf(ParsingError);
		if (!(cyclic instanceof ParsingError))
			throw new Error("expected failure");
		expect(cyclic.issues[0]).toMatchObject({
			code: "custom",
			message: "Cyclic input is not supported",
			path: ["changes", 0, "value", "root", "children", 0],
		});

		let deepest: unknown = {
			nodeKind: "unitShadow",
			unitShadow: {
				canonicalForm: "Bank",
				family: "Lexeme",
				kind: "NOUN",
				language: "de",
			},
		};
		for (let depth = 0; depth < 140; depth += 1) {
			deepest = {
				children: [deepest],
				nodeKind: "structure",
			};
		}
		const deeplyNestedInput = {
			changes: [
				{
					kind: "Contribute",
					aspect: "morphologicalTree",
					value: { root: deepest },
				},
			],
			pendingRelations: [],
		};
		expectParity(
			{
				key: "parseAsKnowledgeGenerationResult",
				parse: parseAsKnowledgeGenerationResult,
				values: [],
			},
			deeplyNestedInput,
		);

		const repeated = {
			nodeKind: "unitShadow",
			unitShadow: {
				canonicalForm: "Bank",
				family: "Lexeme",
				kind: "NOUN",
				language: "de",
			},
		};
		const repeatedAliasInput = {
			changes: [
				{
					kind: "Contribute",
					aspect: "morphologicalTree",
					value: {
						root: {
							children: [repeated, repeated],
							nodeKind: "structure",
						},
					},
				},
			],
			pendingRelations: [],
		};
		expectParity(
			{
				key: "parseAsKnowledgeGenerationResult",
				parse: parseAsKnowledgeGenerationResult,
				values: [],
			},
			repeatedAliasInput,
		);
	});
});
