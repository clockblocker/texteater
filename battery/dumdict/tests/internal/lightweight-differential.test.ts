import { describe, expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { knowledgeChangeSchema } from "dumrel/schema";
import type { z } from "zod";
import { canonicalDumdictValidationSchemas } from "../../codegen/validation-artifacts";
import {
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
} from "../../src/parsing/lightweight-parsers";
import type { DumdictValidationRouteKey } from "../../src/parsing/validation-route-types";
import { germanGehenLemma } from "../fixtures/de-notes";
import {
	englishRunReading,
	englishWalkLemma,
	englishWalkReading,
} from "../fixtures/en-notes";

type CanonicalSchema = z.ZodType;

function parseRoute(route: DumdictValidationRouteKey, input: unknown): unknown {
	if (route === "parseAsCommitChangesResult")
		return parseAsCommitChangesResult(input);
	const [name, language] = route.split(":") as [
		excludeGlobal: Exclude<
			DumdictValidationRouteKey,
			"parseAsCommitChangesResult"
		> extends `${infer Name}:${Dumling.Language}`
			? Name
			: never,
		language: Dumling.Language,
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
	language: Dumling.Language,
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

import {
	fixturesFor,
	languageFixtures,
	successfulInputs,
} from "./differential-fixtures";

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
				aspect: "breakdown",
				part: "constituents",
				value: [{ letters: "Haus", target: shadow }],
			},
			{ kind: "Retract", aspect: "breakdown", part: "morphemes" },
			{
				kind: "Correct",
				aspect: "source",
				value: { target: shadow },
			},
			{ kind: "Retract", aspect: "source" },
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
		expect(parsed.reading).toHaveProperty("emojiDescription", "🚶");
		for (const emojiDescription of [" text ", "😀😀😀😀😀"])
			expectParity("parseAsReadingEntry:en", {
				...base,
				reading: { ...base.reading, emojiDescription },
			});
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
						aspect: "breakdown",
						kind: "Contribute",
						part: "constituents",
						value: [
							{ letters: "wa", target: sharedShadow },
							{ letters: "lk", target: sharedShadow },
						],
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
