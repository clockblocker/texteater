import { describe, expect, test } from "bun:test";
import { readingFingerprint } from "dumling";
import type { SupportedLanguage } from "dumling/types";
import { knowledgeChangeSchema } from "dumrel/schema";
import type { z } from "zod";
import { canonicalDumdictValidationSchemas } from "../../codegen/validation-artifacts";
import {
	makeSurfaceId,
	ParsingError,
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
} from "../../src";
import {
	parseKnowledgeChangeForDumdictRuntime,
	parseReadingForDumdictRuntime,
	parseReadingKnowledgeForDumdictRuntime,
	routeCanContainMorphologicalTree,
} from "../../src/parsing/lightweight-parsers";
import type { DumdictValidationRouteKey } from "../../src/parsing/validation-route-types";
import { germanHausLemma } from "../attested-entities/de/lemmas";
import { germanHausCitationSurface } from "../attested-entities/de/surfaces";
import { englishWalkCitationSurface } from "../attested-entities/eng/surfaces";
import { hebrewKatvuPastThirdPluralInflectionSurface } from "../attested-entities/heb/surfaces";
import { germanGehenLemma, germanGehenReading } from "../fixtures/de-notes";
import {
	englishRunReading,
	englishWalkLemma,
	englishWalkReading,
} from "../fixtures/en-notes";
import { hebrewKatavLemma, hebrewKatavReading } from "../fixtures/he-notes";

type CanonicalSchema = z.ZodType;

function parseRoute(route: DumdictValidationRouteKey, input: unknown): unknown {
	if (route === "parseAsCommitChangesResult")
		return parseAsCommitChangesResult(input);
	const [name, language] = route.split(":") as [
		excludeGlobal: Exclude<
			DumdictValidationRouteKey,
			"parseAsCommitChangesResult"
		> extends `${infer Name}:${SupportedLanguage}`
			? Name
			: never,
		language: SupportedLanguage,
	];
	switch (name) {
		case "parseAsChangePrecondition":
			return parseAsChangePrecondition(input, language);
		case "parseAsCommitChangesRequest":
			return parseAsCommitChangesRequest(input, language);
		case "parseAsDumdictPlan":
			return parseAsDumdictPlan(input, language);
		case "parseAsLemmaRecord":
			return parseAsLemmaRecord(input, language);
		case "parseAsPendingSemanticRelationLocator":
			return parseAsPendingSemanticRelationLocator(input, language);
		case "parseAsPendingSemanticRelationRecord":
			return parseAsPendingSemanticRelationRecord(input, language);
		case "parseAsPlannedChangeOp":
			return parseAsPlannedChangeOp(input, language);
		case "parseAsReadingEntry":
			return parseAsReadingEntry(input, language);
		case "parseAsReadingPatchOp":
			return parseAsReadingPatchOp(input, language);
		case "parseAsSurfaceEntry":
			return parseAsSurfaceEntry(input, language);
	}
}

function expectParity(route: DumdictValidationRouteKey, input: unknown): void {
	const schema = canonicalDumdictValidationSchemas[route] as CanonicalSchema;
	const expected = schema.safeParse(input);
	let actual: unknown;
	expect(() => {
		actual = parseRoute(route, input);
	}).not.toThrow();
	if (expected.success) {
		expect(actual).not.toBeInstanceOf(ParsingError);
		expect(actual).toEqual(expected.data);
		return;
	}
	if (!(actual instanceof ParsingError))
		throw new Error(`Expected ${route} to return ParsingError.`);
	expect(actual.issues).toEqual(expected.error.issues);
}

function expectReadingGuardParity(
	language: SupportedLanguage,
	input: unknown,
): void {
	const schema = canonicalDumdictValidationSchemas[
		`parseAsReadingEntry:${language}`
	].shape.reading as CanonicalSchema;
	const expected = schema.safeParse(input);
	const actual = parseReadingForDumdictRuntime(input, language);
	if (expected.success) {
		expect(actual).toEqual(expected.data as typeof actual);
		return;
	}
	if (!(actual instanceof ParsingError)) {
		throw new Error(`Expected ${language} Reading guard to fail.`);
	}
	expect(actual.issues).toEqual(expected.error.issues);
}

const languageFixtures = {
	de: {
		lemma: germanGehenLemma,
		reading: germanGehenReading,
		surface: germanHausCitationSurface,
		surfaceOwner: germanHausLemma,
	},
	en: {
		lemma: englishWalkLemma,
		reading: englishWalkReading,
		surface: englishWalkCitationSurface,
		surfaceOwner: englishWalkLemma,
	},
	he: {
		lemma: hebrewKatavLemma,
		reading: hebrewKatavReading,
		surface: hebrewKatvuPastThirdPluralInflectionSurface,
		surfaceOwner: hebrewKatavLemma,
	},
} as const;

function fixturesFor(language: SupportedLanguage) {
	const fixture = languageFixtures[language];
	const lemmaRecord = { lemma: fixture.lemma };
	const readingEntry = {
		reading: fixture.reading,
		attestedTranslations: [],
		attestations: [],
		notes: "",
	};
	const pending = {
		relation: "nearSynonym" as const,
		target: {
			language,
			canonicalForm: "target",
			family: "Lexeme",
			kind: "VERB",
		},
	};
	const locator = {
		sourceReadingKey: readingFingerprint(fixture.reading),
		relation: pending.relation,
		targetPendingId: `pending:${language}`,
	};
	const pendingRecord = {
		sourceReading: fixture.reading,
		pending,
		locator,
	};
	const changePrecondition = {
		kind: "revisionMatches" as const,
		revision: "revision-1",
	};
	const readingPatch = { kind: "addAttestation" as const, value: "text" };
	const plannedChange = {
		type: "createLemma" as const,
		record: lemmaRecord,
		preconditions: [],
	};
	const request = { baseRevision: "revision-1", changes: [plannedChange] };
	const surfaceEntry = {
		id: makeSurfaceId(language, fixture.surface),
		surface: fixture.surface,
		ownerLemma: fixture.surfaceOwner,
		attestedTranslations: [],
		attestations: [],
		notes: "",
	};
	return {
		changePrecondition,
		lemmaRecord,
		locator,
		pendingRecord,
		plannedChange,
		readingEntry,
		readingPatch,
		request,
		surfaceEntry,
	};
}

function successfulInputs(): Record<DumdictValidationRouteKey, unknown> {
	const inputs = {
		parseAsCommitChangesResult: {
			status: "committed",
			nextRevision: "revision-2",
		},
	} as Record<DumdictValidationRouteKey, unknown>;
	for (const language of ["de", "en", "he"] as const) {
		const fixture = fixturesFor(language);
		inputs[`parseAsChangePrecondition:${language}`] =
			fixture.changePrecondition;
		inputs[`parseAsCommitChangesRequest:${language}`] = fixture.request;
		inputs[`parseAsDumdictPlan:${language}`] = fixture.request;
		inputs[`parseAsLemmaRecord:${language}`] = fixture.lemmaRecord;
		inputs[`parseAsPendingSemanticRelationLocator:${language}`] =
			fixture.locator;
		inputs[`parseAsPendingSemanticRelationRecord:${language}`] =
			fixture.pendingRecord;
		inputs[`parseAsPlannedChangeOp:${language}`] = fixture.plannedChange;
		inputs[`parseAsReadingEntry:${language}`] = fixture.readingEntry;
		inputs[`parseAsReadingPatchOp:${language}`] = fixture.readingPatch;
		inputs[`parseAsSurfaceEntry:${language}`] = fixture.surfaceEntry;
	}
	return inputs;
}

describe("lightweight Dumdict parser differential", () => {
	test("preserves private Reading guard paths, ordering, and language failures", () => {
		for (const language of ["de", "en", "he"] as const) {
			const reading = languageFixtures[language].reading;
			expectReadingGuardParity(language, reading);
			expectReadingGuardParity(language, {
				...reading,
				lemma: { ...reading.lemma, language: "wrong-language" },
			});
			expectReadingGuardParity(language, {
				...reading,
				emojiDescription: "not emoji",
				lemma: { ...reading.lemma, canonicalForm: "" },
			});
		}
	});

	test("dispatches every Knowledge Change branch while preserving full-union failures", () => {
		const shadow = {
			canonicalForm: "walk",
			family: "Lexeme",
			kind: "VERB",
			language: "en",
		} as const;
		const branchInputs = [
			{ kind: "Contribute", aspect: "transcription", value: " t " },
			{ kind: "Retract", aspect: "transcription" },
			{
				kind: "Contribute",
				aspect: "translations",
				language: "en",
				value: [" house "],
			},
			{ kind: "Retract", aspect: "translations", language: "en" },
			{
				kind: "Contribute",
				aspect: "semanticRelations",
				relation: "synonym",
				value: [],
			},
			{
				kind: "Retract",
				aspect: "semanticRelations",
				relation: "synonym",
			},
			{ kind: "Correct", aspect: "definition", value: " home " },
			{ kind: "Retract", aspect: "definition" },
			{
				kind: "Contribute",
				aspect: "morphologicalTree",
				value: {
					root: {
						nodeKind: "structure",
						children: [
							{ nodeKind: "unitShadow", unitShadow: shadow },
						],
					},
				},
			},
			{ kind: "Retract", aspect: "morphologicalTree" },
			{
				kind: "Contribute",
				aspect: "lexicalBreakdown",
				value: [shadow, shadow],
			},
			{ kind: "Retract", aspect: "lexicalBreakdown" },
		] as const;

		for (const input of branchInputs) {
			const expected = knowledgeChangeSchema.safeParse(input);
			const actual = parseKnowledgeChangeForDumdictRuntime(input);
			expect(expected.success).toBe(true);
			expect(actual).not.toBeInstanceOf(ParsingError);
			if (expected.success) expect(actual).toEqual(expected.data);
		}

		for (const input of [
			{ kind: "Contribute", aspect: "definition" },
			{ kind: "Unknown", aspect: "definition", value: "home" },
			{ kind: "Correct", aspect: "unknown", value: "home" },
			{ kind: "Retract", aspect: "definition", unexpected: true },
		]) {
			const expected = knowledgeChangeSchema.safeParse(input);
			const actual = parseKnowledgeChangeForDumdictRuntime(input);
			expect(expected.success).toBe(false);
			expect(actual).toBeInstanceOf(ParsingError);
			if (!expected.success && actual instanceof ParsingError)
				expect(actual.issues).toEqual(expected.error.issues);
		}
	});

	test("matches canonical success output for all 31 generated roots", () => {
		for (const [route, input] of Object.entries(successfulInputs()))
			expectParity(route as DumdictValidationRouteKey, input);
	});

	test("ordinary primitive, missing, and unknown-key failures never throw across all roots", () => {
		for (const route of Object.keys(
			canonicalDumdictValidationSchemas,
		) as DumdictValidationRouteKey[]) {
			for (const input of [
				null,
				42,
				"text",
				[],
				{},
				{ unexpected: true },
			]) {
				let parsed: unknown;
				expect(() => {
					parsed = parseRoute(route, input);
				}).not.toThrow();
				expect(parsed).toBeInstanceOf(ParsingError);
			}
		}
	});

	test("preserves structural issue fields on representative object and nested routes", () => {
		for (const route of [
			"parseAsLemmaRecord:de",
			"parseAsReadingEntry:en",
			"parseAsSurfaceEntry:he",
			"parseAsPendingSemanticRelationLocator:de",
			"parseAsPendingSemanticRelationRecord:en",
		] as const) {
			for (const input of [null, {}, { unexpected: true }])
				expectParity(route, input);
		}
	});

	test("preserves exact cross-language issue fields, path, and order", () => {
		const input = {
			...fixturesFor("de").readingEntry,
			knowledge: {
				semanticRelations: {
					nearSynonym: [englishRunReading.lemma],
				},
			},
		};
		expectParity("parseAsReadingEntry:de", input);
		const parsed = parseAsReadingEntry(input, "de");
		if (!(parsed instanceof ParsingError))
			throw new Error("expected failure");
		expect(parsed.issues).toEqual([
			{
				code: "custom",
				message: "Reading Knowledge references must use de.",
				path: ["knowledge"],
			},
		]);
	});

	test("matches every package-owned cross-field semantic failure", () => {
		const de = fixturesFor("de");
		const cases: readonly [DumdictValidationRouteKey, unknown][] = [
			[
				"parseAsReadingEntry:de",
				{
					...de.readingEntry,
					knowledge: {
						semanticRelations: { synonym: [germanGehenLemma] },
					},
				},
			],
			[
				"parseAsSurfaceEntry:de",
				{ ...de.surfaceEntry, ownerLemma: germanGehenLemma },
			],
			["parseAsSurfaceEntry:de", { ...de.surfaceEntry, id: "wrong" }],
			[
				"parseAsPendingSemanticRelationRecord:de",
				{
					...de.pendingRecord,
					locator: { ...de.locator, sourceReadingKey: "wrong" },
				},
			],
			[
				"parseAsPendingSemanticRelationRecord:de",
				{
					...de.pendingRecord,
					locator: { ...de.locator, relation: "synonym" },
				},
			],
			[
				"parseAsPendingSemanticRelationRecord:de",
				{
					...de.pendingRecord,
					pending: {
						...de.pendingRecord.pending,
						target: {
							...de.pendingRecord.pending.target,
							language: "en",
						},
					},
				},
			],
		];
		for (const [route, input] of cases) expectParity(route, input);
	});

	test("preserves trim/NFC normalized outputs through nested Dumling and Dumrel operations", () => {
		const decomposed = "cafe\u0301";
		const lemmaInput = {
			lemma: { ...englishWalkLemma, canonicalForm: decomposed },
		};
		expectParity("parseAsLemmaRecord:en", lemmaInput);
		const pendingInput = {
			...fixturesFor("en").pendingRecord,
			pending: {
				relation: "nearSynonym",
				target: {
					language: "en",
					canonicalForm: `  ${decomposed}  `,
					family: "Lexeme",
					kind: "VERB",
				},
			},
		};
		expectParity("parseAsPendingSemanticRelationRecord:en", pendingInput);
	});

	test("lazily resolves the canonical emoji regex with exact output and ordered issues", () => {
		const base = fixturesFor("en").readingEntry;
		const normalized = {
			...base,
			reading: { ...base.reading, emojiDescription: "  🚶  " },
		};
		expectParity("parseAsReadingEntry:en", normalized);
		const parsed = parseAsReadingEntry(normalized, "en");
		if (parsed instanceof ParsingError) throw new Error("expected success");
		expect(parsed.reading.emojiDescription).toBe("🚶");
		for (const emojiDescription of [" text ", "😀😀😀😀😀"])
			expectParity("parseAsReadingEntry:en", {
				...base,
				reading: { ...base.reading, emojiDescription },
			});
	});

	test("returns deterministic failures for cyclic and excessively deep caller inputs", () => {
		const parseTree = (root: unknown) =>
			parseAsReadingPatchOp(
				{
					envelope: {
						change: {
							aspect: "morphologicalTree",
							kind: "Contribute",
							value: { root },
						},
						reading: englishWalkReading,
					},
					kind: "applyKnowledgeChange",
				},
				"en",
			);

		const cyclicNode: { children: unknown[]; nodeKind: "structure" } = {
			children: [],
			nodeKind: "structure",
		};
		cyclicNode.children.push(cyclicNode);
		let cyclicResult: unknown;
		expect(() => {
			cyclicResult = parseTree(cyclicNode);
		}).not.toThrow();
		expect(cyclicResult).toBeInstanceOf(ParsingError);
		if (!(cyclicResult instanceof ParsingError))
			throw new Error("expected cyclic input failure");
		expect(cyclicResult.issues[0]).toMatchObject({
			code: "custom",
			message: "Cyclic input is not supported",
			path: ["envelope", "change", "value", "root", "children", 0],
		});
		expect(JSON.stringify(cyclicResult.issues)).toContain(
			"Cyclic input is not supported",
		);
		const repeatedCyclicResult = parseTree(cyclicNode);
		expect(repeatedCyclicResult).toBeInstanceOf(ParsingError);
		if (!(repeatedCyclicResult instanceof ParsingError))
			throw new Error("expected repeated cyclic input failure");
		expect(repeatedCyclicResult.issues).toEqual(cyclicResult.issues);

		const recursiveChildren: unknown[] = [];
		const recursiveArrayNode = {
			children: recursiveChildren,
			nodeKind: "structure" as const,
		};
		recursiveChildren.push(recursiveArrayNode);
		expect(parseTree(recursiveArrayNode)).toBeInstanceOf(ParsingError);

		let deepNode: unknown = {
			children: [],
			nodeKind: "structure",
		};
		for (let depth = 0; depth < 200; depth += 1) {
			deepNode = {
				children: [deepNode],
				nodeKind: "structure",
			};
		}
		const deepResult = parseTree(deepNode);
		expect(deepResult).toBeInstanceOf(ParsingError);
		if (!(deepResult instanceof ParsingError))
			throw new Error("expected deep input failure");
		expect(deepResult.issues).toHaveLength(1);
		expect(JSON.stringify(deepResult.issues)).toContain(
			"Input nesting exceeds the supported depth",
		);
	});

	test("guards every generated root that can reach recursive morphology", () => {
		const guardedNames = new Set([
			"parseAsCommitChangesRequest",
			"parseAsDumdictPlan",
			"parseAsPlannedChangeOp",
			"parseAsReadingEntry",
			"parseAsReadingPatchOp",
		]);
		const publicRoutes = Object.keys(
			canonicalDumdictValidationSchemas,
		) as DumdictValidationRouteKey[];
		const expectedGuardedRoutes = publicRoutes.filter((route) =>
			guardedNames.has(route.split(":")[0] ?? route),
		);
		expect(
			publicRoutes.filter((route) =>
				routeCanContainMorphologicalTree(route),
			),
		).toEqual(expectedGuardedRoutes);
		expect(expectedGuardedRoutes).toHaveLength(15);

		const cycle: { children: unknown[]; nodeKind: "structure" } = {
			children: [],
			nodeKind: "structure",
		};
		cycle.children.push(cycle);
		const tree = { root: cycle };
		for (const route of expectedGuardedRoutes) {
			const [name] = route.split(":");
			const readingPatch = {
				envelope: {
					change: {
						aspect: "morphologicalTree",
						kind: "Contribute",
						value: tree,
					},
				},
				kind: "applyKnowledgeChange",
			};
			const input =
				name === "parseAsReadingEntry"
					? { knowledge: { morphologicalTree: tree } }
					: name === "parseAsReadingPatchOp"
						? readingPatch
						: name === "parseAsPlannedChangeOp"
							? { ops: [readingPatch], type: "patchReading" }
							: {
									changes: [
										{
											ops: [readingPatch],
											type: "patchReading",
										},
									],
								};
			const parsed = parseRoute(route, input);
			expect(parsed).toBeInstanceOf(ParsingError);
			if (!(parsed instanceof ParsingError))
				throw new Error(`expected ${route} cycle failure`);
			expect(parsed.issues).toHaveLength(1);
			expect(parsed.issues[0]).toMatchObject({
				code: "custom",
				message: "Cyclic input is not supported",
			});
		}

		const finiteInputs = successfulInputs();
		for (const route of publicRoutes.filter(
			(route) => !expectedGuardedRoutes.includes(route),
		)) {
			expect(routeCanContainMorphologicalTree(route)).toBe(false);
			expect(() => parseRoute(route, finiteInputs[route])).not.toThrow();
		}

		for (const parsed of [
			parseKnowledgeChangeForDumdictRuntime({
				aspect: "morphologicalTree",
				kind: "Contribute",
				value: tree,
			}),
			parseReadingKnowledgeForDumdictRuntime({ morphologicalTree: tree }),
		]) {
			expect(parsed).toBeInstanceOf(ParsingError);
			if (!(parsed instanceof ParsingError))
				throw new Error("expected operational cycle failure");
			expect(parsed.issues[0]).toMatchObject({
				code: "custom",
				message: "Cyclic input is not supported",
			});
		}
	});

	test("allows repeated non-cyclic aliases across structural siblings", () => {
		const sharedShadow = {
			canonicalForm: "walk",
			family: "Lexeme",
			kind: "VERB",
			language: "en",
		} as const;
		const parsed = parseAsReadingPatchOp(
			{
				envelope: {
					change: {
						aspect: "morphologicalTree",
						kind: "Contribute",
						value: {
							root: {
								children: [
									{
										nodeKind: "unitShadow",
										unitShadow: sharedShadow,
									},
									{
										nodeKind: "unitShadow",
										unitShadow: sharedShadow,
									},
								],
								nodeKind: "structure",
							},
						},
					},
					reading: englishWalkReading,
				},
				kind: "applyKnowledgeChange",
			},
			"en",
		);
		expect(parsed).not.toBeInstanceOf(ParsingError);
	});
});
