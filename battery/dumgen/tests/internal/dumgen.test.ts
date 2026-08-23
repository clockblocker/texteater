import { describe, expect, spyOn, test } from "bun:test";
import {
	type AiSdk,
	AiSdkGenerationError,
	buildDumgen,
	DumgenError,
	type DumgenModelExchange,
	type DumgenOptions,
	type SegmentedSentence,
} from "dumgen";
import { fixedMembersFor } from "dumling/fixed";
import { z } from "zod";

import { PROMPT_CATALOG } from "../../src/catalog/prompt-catalog";
import type { PromptTree } from "../../src/catalog/prompt-definition";
import { buildGeneratorCatalog } from "../../src/generator/generator";
import * as lightweightParsers from "../../src/parsing/lightweight-parsers";
import { GERMAN_HIGH_LEVEL_ROUTES } from "../../src/schema/german-high-level-routes";

const modelGrammar = {
	memberOrthographies: ["Standard"],
	normalizedMembers: ["Banken"],
	surface: {
		spelling: "Canonical",
		surfaceKind: "Inflection",
		surfaceFeatures: null,
		inflectionalFeatures: { case: "Nom", number: "Plur" },
	},
	lemma: {
		canonicalForm: "Bank",
		coreFeatures: { gender: "Fem", hyph: null },
	},
} as const;

const bankLemma = {
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	...modelGrammar.lemma,
} as const;

const detCatalog = fixedMembersFor.lemma({
	language: "de",
	family: "Lexeme",
	kind: "DET",
});
if (!detCatalog) throw new Error("Expected fixed DET catalog.");
const derLemma = detCatalog.members.find(
	(lemma) => lemma.canonicalForm === "der",
);
if (!derLemma) throw new Error("Expected fixed der Lemma.");

const auxCatalog = fixedMembersFor.lemma({
	language: "de",
	family: "Lexeme",
	kind: "AUX",
});
if (!auxCatalog) throw new Error("Expected fixed AUX catalog.");
const istLemma = auxCatalog.members.find(
	(lemma) => lemma.canonicalForm === "ist",
);
if (!istLemma) throw new Error("Expected fixed ist Lemma.");

function sentence(
	parts: Array<{
		kind: "ResolvableText" | "OpaqueText" | "Whitespace" | "Punctuation";
		text: string;
	}>,
): SegmentedSentence<"de"> {
	return {
		id: crypto.randomUUID() as SegmentedSentence<"de">["id"],
		language: "de",
		segments: parts,
	};
}

function queueSdk(outputs: unknown[]) {
	const calls: Array<{ input: string; params: unknown; schema: unknown }> =
		[];
	const sdk: AiSdk = {
		async structuredGeneration(input, schema, params) {
			calls.push({ input, params, schema });
			return outputs.shift() as never;
		},
		async unstructuredGeneration() {
			throw new Error("not used");
		},
	};
	return { calls, sdk };
}

describe("Dumgen module interface", () => {
	test("exposes exactly the deep public operations", () => {
		const { sdk } = queueSdk([]);
		const dumgen = buildDumgen({ sdk });

		expect(Object.keys(dumgen)).toEqual(["segment", "resolve", "generate"]);
		expect(Object.keys(dumgen.resolve)).toEqual(["grammatical", "reading"]);
		expect(Object.keys(dumgen.generate)).toEqual(["knowledge"]);
		expect("laboratory" in dumgen).toBe(false);
		expect("promptCatalog" in dumgen).toBe(false);
		expect("de" in dumgen.resolve).toBe(false);
		expect(Object.isFrozen(dumgen)).toBe(true);
		expect(Object.isFrozen(dumgen.resolve)).toBe(true);
		expect(Object.isFrozen(dumgen.generate)).toBe(true);
	});

	test("segments an ordered German/Hebrew batch after one Intake call", async () => {
		const { calls, sdk } = queueSdk([
			{
				language: "de",
				items: [
					{
						id: "item-0",
						decision: "Accepted",
						language: "de",
						stitchedText: "Die Banken",
					},
					{
						id: "item-1",
						decision: "Unintelligible",
						language: null,
						stitchedText: "%%%",
					},
				],
			},
		]);
		const exchanges: DumgenModelExchange[] = [];
		const dumgen = buildDumgen({
			sdk,
			onModelExchange(exchange) {
				exchanges.push(exchange);
			},
		});

		const result = await dumgen.segment(["Die Banken", "%%%"]);

		expect(result).toMatchObject({
			ok: true,
			value: [
				{
					decision: "Accepted",
					language: "de",
					sentence: {
						language: "de",
						segments: [
							{ kind: "ResolvableText", text: "Die" },
							{ kind: "Whitespace", text: " " },
							{ kind: "ResolvableText", text: "Banken" },
						],
					},
				},
				{ decision: "Unintelligible" },
			],
		});
		if (!result.ok || result.value[0]?.decision !== "Accepted") return;
		expect(typeof result.value[0].sentence.id).toBe("string");
		expect(Object.isFrozen(result.value[0].sentence)).toBe(true);
		expect(Object.isFrozen(result.value[0].sentence.segments)).toBe(true);
		expect(calls).toHaveLength(1);
		expect(
			exchanges
				.filter(({ phase }) => phase === "accepted")
				.map(({ promptPath }) => promptPath),
		).toEqual(["laboratory.intake"]);
	});

	test("returns rejected Intake decisions in place", async () => {
		const { calls, sdk } = queueSdk([
			{
				language: null,
				items: [
					{
						id: "item-0",
						decision: "UnsupportedLanguage",
						language: null,
						stitchedText: "Bonjour",
					},
				],
			},
		]);
		await expect(
			buildDumgen({ sdk }).segment(["Bonjour"]),
		).resolves.toEqual({
			ok: true,
			value: [{ decision: "UnsupportedLanguage" }],
		});
		expect(calls).toHaveLength(1);
	});

	test("rejects invalid batches before a model call", async () => {
		const { calls, sdk } = queueSdk([]);
		await expect(buildDumgen({ sdk }).segment([])).resolves.toMatchObject({
			ok: false,
			error: { code: "InvalidInput" },
		});
		expect(calls).toHaveLength(0);
	});

	test("returns a typed Intake failure", async () => {
		const promptPaths: string[] = [];
		const sdk: AiSdk = {
			async structuredGeneration() {
				throw new Error("intake provider unavailable");
			},
			async unstructuredGeneration() {
				throw new Error("not used");
			},
		};
		const dumgen = buildDumgen({
			sdk,
			onModelExchange(exchange) {
				if (exchange.phase === "attempted") {
					promptPaths.push(exchange.promptPath);
				}
			},
		});

		await expect(dumgen.segment(["Die Bank"])).resolves.toMatchObject({
			ok: false,
			error: { code: "IntakeFailure", reason: "provider-error" },
		});
		expect(promptPaths).toEqual(["laboratory.intake"]);
	});

	test("segments Hebrew with surface evidence and defers ambiguous morphology", async () => {
		const { calls, sdk } = queueSdk([
			{
				language: "he",
				items: [
					{
						id: "item-0",
						decision: "Accepted",
						language: "he",
						stitchedText: "בַּבַּיִת בבית",
					},
				],
			},
		]);

		const result = await buildDumgen({ sdk }).segment(["בַּבַּיִת בבית"]);

		expect(result).toMatchObject({
			ok: true,
			value: [
				{
					decision: "Accepted",
					language: "he",
					sentence: {
						segments: [
							{ kind: "ResolvableText", text: "בַּ" },
							{ kind: "ResolvableText", text: "בַּיִת" },
							{ kind: "Whitespace", text: " " },
							{ kind: "ResolvableText", text: "בבית" },
						],
					},
				},
			],
		});
		expect(calls).toHaveLength(1);
	});

	test("enforces measured Intake boundaries without a model call", async () => {
		const { calls, sdk } = queueSdk([]);
		const dumgen = buildDumgen({ sdk });
		for (const input of [
			Array.from({ length: 10 }, () => "Hallo"),
			["a".repeat(206)],
			[Array.from({ length: 35 }, () => "Wort").join(" ")],
		]) {
			await expect(dumgen.segment(input)).resolves.toMatchObject({
				ok: false,
				error: { code: "InvalidInput" },
			});
		}
		expect(calls).toHaveLength(0);
	});

	test("rejects Intake boundary contamination and non-whitespace edits", async () => {
		for (const output of [
			{
				language: "de",
				items: [
					{
						id: "item-1",
						decision: "Accepted",
						language: "de",
						stitchedText: "Die Bank",
					},
					{
						id: "item-0",
						decision: "Accepted",
						language: "de",
						stitchedText: "Hallo",
					},
				],
			},
			{
				language: "de",
				items: [
					{
						id: "item-0",
						decision: "Accepted",
						language: "de",
						stitchedText: "Hullo",
					},
					{
						id: "item-1",
						decision: "Accepted",
						language: "de",
						stitchedText: "Die Bank",
					},
				],
			},
		]) {
			const { sdk } = queueSdk([output]);
			await expect(
				buildDumgen({ sdk }).segment(["Hallo", "Die Bank"]),
			).resolves.toMatchObject({
				ok: false,
				error: { code: "IntakeFailure", reason: "invalid-output" },
			});
		}
	});
});

describe("grammatical resolution", () => {
	test("parses fresh, cached, and unresolved public results through the lightweight boundary", async () => {
		const parse = spyOn(lightweightParsers, "parseAsGrammaticalResult");
		try {
			const source = sentence([
				{ kind: "ResolvableText", text: "Bnak" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "Bank" },
			]);
			const resolved = queueSdk([
				{
					decision: "Resolved",
					additionalMemberIndices: [1],
					target: { family: "Lexeme", kind: "NOUN" },
				},
				{
					...modelGrammar,
					memberOrthographies: ["Typo", "Standard"],
					normalizedMembers: ["Bank", "Bank"],
					surface: {
						...modelGrammar.surface,
						inflectionalFeatures: {
							case: "Nom",
							number: "Sing",
						},
					},
				},
			]);
			const dumgen = buildDumgen({ sdk: resolved.sdk });

			await dumgen.resolve.grammatical("de", {
				sentence: source,
				clickedSegmentIndex: 0,
			});
			await dumgen.resolve.grammatical("de", {
				sentence: source,
				clickedSegmentIndex: 2,
			});

			const unresolved = queueSdk([
				{
					decision: "Unresolved",
					target: null,
					additionalMemberIndices: null,
				},
			]);
			await buildDumgen({ sdk: unresolved.sdk }).resolve.grammatical(
				"de",
				{
					sentence: sentence([
						{ kind: "ResolvableText", text: "Bank" },
					]),
					clickedSegmentIndex: 0,
				},
			);

			expect(parse).toHaveBeenCalledTimes(3);
		} finally {
			parse.mockRestore();
		}
	});

	test("reports lightweight public-result rejection as invalid output", async () => {
		const parse = spyOn(
			lightweightParsers,
			"parseAsGrammaticalResult",
		).mockImplementation(() => {
			return new lightweightParsers.ParsingError([
				{
					code: "custom",
					message: "forced public-result rejection",
					path: [],
				},
			]);
		});
		try {
			const unresolved = queueSdk([
				{
					decision: "Unresolved",
					target: null,
					additionalMemberIndices: null,
				},
			]);

			await expect(
				buildDumgen({ sdk: unresolved.sdk }).resolve.grammatical("de", {
					sentence: sentence([
						{ kind: "ResolvableText", text: "Bank" },
					]),
					clickedSegmentIndex: 0,
				}),
			).rejects.toMatchObject({
				code: "invalid-output",
				message:
					"Grammatical Resolution produced an invalid public result.",
			});
		} finally {
			parse.mockRestore();
		}
	});

	test("returns an Attestation with Dumgen-owned interaction context", async () => {
		const { calls, sdk } = queueSdk([
			{
				decision: "Resolved",
				additionalMemberIndices: [],
				target: {
					family: "Lexeme",
					kind: "NOUN",
				},
			},
			modelGrammar,
		]);
		const exchanges: DumgenModelExchange[] = [];
		const dumgen = buildDumgen({
			sdk,
			onModelExchange: (exchange) => exchanges.push(exchange),
		});
		const bankSentence = sentence([
			{ kind: "ResolvableText", text: "Die" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "Banken" },
		]);

		const result = await dumgen.resolve.grammatical("de", {
			sentence: bankSentence,
			clickedSegmentIndex: 2,
		});

		expect(result).toMatchObject({
			decision: "Resolved",
			language: "de",
			markedContext: "Die <TARGET>Banken</TARGET>",
			attestation: {
				members: [{ attested: "Banken", orthography: "Standard" }],
				realizationCoverage: "Full",
				surface: {
					language: "de",
					lemma: {
						language: "de",
						family: "Lexeme",
						kind: "NOUN",
						canonicalForm: "Bank",
					},
				},
			},
			interaction: {
				segmentedSentenceId: bankSentence.id,
				clickedSegmentIndex: 2,
				memberSegmentIndices: [2],
			},
		});
		expect("selection" in result).toBe(false);
		if (result.decision !== "Resolved") {
			throw new Error("Expected grammatical resolution to succeed.");
		}
		expect(Object.keys(result.attestation)).toEqual([
			"members",
			"realizationCoverage",
			"surface",
		]);
		expect("realizationCoverage" in result.attestation.surface).toBe(false);
		expect("clickedSegmentIndex" in result.attestation).toBe(false);
		expect("segmentedSentenceId" in result.attestation).toBe(false);
		expect("target" in result).toBe(false);
		expect("memberOrthographies" in result).toBe(false);
		expect(calls).toHaveLength(2);
		expect(JSON.parse(calls[0]?.input ?? "{}")).toEqual({
			markedSentence: "Die <target>Banken</target>",
			segments: [
				{ s: "Die", i: 0 },
				{ s: "Banken", i: 1 },
			],
			clickedIndex: 1,
		});
		expect(calls[1]?.input).toBe(
			'{"markedContext":"Die <TARGET>Banken</TARGET>","members":["Banken"]}',
		);
		expect(exchanges).toContainEqual(
			expect.objectContaining({
				phase: "attempted",
				promptPath: "laboratory.grammaticalResolution.de.Lexeme.NOUN",
				modelInput: {
					markedContext: "Die <TARGET>Banken</TARGET>",
					members: ["Banken"],
				},
			}),
		);
		expect(
			exchanges
				.filter(({ phase }) => phase === "accepted")
				.map(({ promptPath }) => promptPath),
		).toEqual([
			"laboratory.targetClassification.de.highLevelWholeUnit",
			"laboratory.grammaticalResolution.de.Lexeme.NOUN",
		]);
		const targetExchange = exchanges.find(
			(exchange) =>
				exchange.phase === "accepted" &&
				exchange.promptPath ===
					"laboratory.targetClassification.de.highLevelWholeUnit",
		);
		expect(targetExchange).toMatchObject({
			phase: "accepted",
			result: {
				family: "Lexeme",
				kind: "NOUN",
				memberSegmentIndices: [2],
			},
		});
	});

	test("keeps projected instrumentation diagnostic-only", async () => {
		const { sdk } = queueSdk([
			{
				decision: "Resolved",
				additionalMemberIndices: [],
				target: {
					family: "Lexeme",
					kind: "NOUN",
				},
			},
			modelGrammar,
		]);
		const source = sentence([{ kind: "ResolvableText", text: "Banken" }]);
		const dumgen = buildDumgen({
			sdk,
			onModelExchange(exchange) {
				if (
					exchange.phase === "accepted" &&
					exchange.promptPath ===
						"laboratory.grammaticalResolution.de.Lexeme.NOUN"
				) {
					const diagnostic = exchange.result as {
						lemma?: { canonicalForm?: string };
					};
					if (diagnostic.lemma) {
						diagnostic.lemma.canonicalForm = "mutated trace";
					}
				}
			},
		});

		const result = await dumgen.resolve.grammatical("de", {
			sentence: source,
			clickedSegmentIndex: 0,
		});

		expect(result).toMatchObject({
			decision: "Resolved",
			attestation: {
				surface: { lemma: { canonicalForm: "Bank" } },
			},
		});
	});

	test("escapes literal source markers and marks every target member", async () => {
		const { calls, sdk } = queueSdk([
			{
				decision: "Resolved",
				additionalMemberIndices: [2],
				target: {
					family: "Lexeme",
					kind: "NOUN",
				},
			},
			{
				...modelGrammar,
				memberOrthographies: ["Standard", "Standard"],
				normalizedMembers: ["sage", "auf&"],
			},
		]);
		const source = sentence([
			{ kind: "ResolvableText", text: "sage" },
			{ kind: "Whitespace", text: " " },
			{ kind: "OpaqueText", text: "<TARGET>" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "auf&" },
		]);

		const result = await buildDumgen({ sdk }).resolve.grammatical("de", {
			sentence: source,
			clickedSegmentIndex: 0,
		});

		expect(calls[1]?.input).toBe(
			'{"markedContext":"<TARGET>sage</TARGET> &lt;TARGET&gt; <TARGET>auf&amp;</TARGET>","members":["sage","auf&"]}',
		);
		expect(result).toMatchObject({
			decision: "Resolved",
			attestation: {
				members: [{ attested: "sage" }, { attested: "auf&" }],
				surface: { normalizedSurface: "sage auf&" },
			},
		});
	});

	test("keeps target Unresolved public before Grammatical Resolution", async () => {
		const source = sentence([{ kind: "ResolvableText", text: "Bank" }]);
		const targetUnresolved = queueSdk([
			{
				decision: "Unresolved",
				target: null,
				additionalMemberIndices: null,
			},
		]);
		await expect(
			buildDumgen({ sdk: targetUnresolved.sdk }).resolve.grammatical(
				"de",
				{ sentence: source, clickedSegmentIndex: 0 },
			),
		).resolves.toEqual({ decision: "Unresolved", language: "de" });
		expect(targetUnresolved.calls).toHaveLength(1);
	});

	test("validates sentence language, aggregate, and click before dispatch", async () => {
		const { calls, sdk } = queueSdk([]);
		const dumgen = buildDumgen({ sdk });
		const source = sentence([
			{ kind: "ResolvableText", text: "Bank" },
			{ kind: "Whitespace", text: " " },
		]);

		for (const invalid of [
			{ sentence: { ...source, language: "en" }, clickedSegmentIndex: 0 },
			{ sentence: source, clickedSegmentIndex: -1 },
			{ sentence: source, clickedSegmentIndex: 1 },
			{ sentence: source, clickedSegmentIndex: 9 },
		]) {
			await expect(
				dumgen.resolve.grammatical("de", invalid as never),
			).rejects.toMatchObject({ code: "invalid-input" });
		}
		expect(calls).toHaveLength(0);
	});

	test("rejects invalid target membership and orthography counts", async () => {
		const source = sentence([
			{ kind: "ResolvableText", text: "Die" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "Banken" },
		]);
		const invalidTarget = queueSdk([
			{
				decision: "Resolved",
				additionalMemberIndices: [2],
				target: {
					family: "Lexeme",
					kind: "NOUN",
				},
			},
		]);
		await expect(
			buildDumgen({ sdk: invalidTarget.sdk }).resolve.grammatical("de", {
				sentence: source,
				clickedSegmentIndex: 0,
			}),
		).rejects.toMatchObject({ code: "invalid-output" });
		expect(invalidTarget.calls).toHaveLength(1);

		const invalidCount = queueSdk([
			{
				decision: "Resolved",
				additionalMemberIndices: [1],
				target: {
					family: "Lexeme",
					kind: "NOUN",
				},
			},
			modelGrammar,
		]);
		await expect(
			buildDumgen({ sdk: invalidCount.sdk }).resolve.grammatical("de", {
				sentence: source,
				clickedSegmentIndex: 0,
			}),
		).rejects.toMatchObject({ code: "invalid-output" });
		expect(invalidCount.calls).toHaveLength(2);

		const invalidNormalization = queueSdk([
			{
				decision: "Resolved",
				additionalMemberIndices: [1],
				target: {
					family: "Lexeme",
					kind: "NOUN",
				},
			},
			{
				...modelGrammar,
				memberOrthographies: ["Standard", "Standard"],
			},
		]);
		await expect(
			buildDumgen({ sdk: invalidNormalization.sdk }).resolve.grammatical(
				"de",
				{ sentence: source, clickedSegmentIndex: 0 },
			),
		).rejects.toMatchObject({ code: "invalid-output" });
		expect(invalidNormalization.calls).toHaveLength(2);
	});

	test("keeps repeated fixed members positionally aligned and click-invariant", async () => {
		const source = sentence([
			{ kind: "ResolvableText", text: "Pass" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "auf" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "dich" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "auf" },
			{ kind: "Punctuation", text: "." },
		]);
		const { calls, sdk } = queueSdk([
			{
				decision: "Resolved",
				additionalMemberIndices: [1, 3],
				target: {
					family: "Lexeme",
					kind: "VERB",
				},
			},
			{
				memberOrthographies: ["Standard", "Standard", "Standard"],
				normalizedMembers: ["pass", "auf", "auf"],
				surface: {
					spelling: "Canonical",
					surfaceKind: "Inflection",
					surfaceFeatures: null,
					inflectionalFeatures: {
						mood: "Imp",
						number: "Sing",
						person: "2",
						tense: null,
						verbForm: "Fin",
						voice: null,
					},
				},
				lemma: {
					canonicalForm: "aufpassen",
					coreFeatures: {
						hasGovPrep: "auf",
						hasSepPrefix: "auf",
						lexicallyReflexive: null,
					},
				},
			},
		]);
		const dumgen = buildDumgen({ sdk });
		const first = await dumgen.resolve.grammatical("de", {
			sentence: source,
			clickedSegmentIndex: 0,
		});
		const governedClick = await dumgen.resolve.grammatical("de", {
			sentence: source,
			clickedSegmentIndex: 2,
		});
		const prefixClick = await dumgen.resolve.grammatical("de", {
			sentence: source,
			clickedSegmentIndex: 6,
		});

		expect(calls).toHaveLength(2);
		expect(first).toMatchObject({
			decision: "Resolved",
			markedContext:
				"<TARGET>Pass</TARGET> <TARGET>auf</TARGET> dich <TARGET>auf</TARGET>.",
			interaction: { memberSegmentIndices: [0, 2, 6] },
			attestation: {
				members: [
					{ attested: "Pass", orthography: "Standard" },
					{ attested: "auf", orthography: "Standard" },
					{ attested: "auf", orthography: "Standard" },
				],
				realizationCoverage: "Full",
				surface: {
					lemma: { canonicalForm: "aufpassen" },
				},
			},
		});
		if (
			first.decision !== "Resolved" ||
			governedClick.decision !== "Resolved" ||
			prefixClick.decision !== "Resolved"
		) {
			throw new Error("Expected every fixed-member click to resolve.");
		}
		expect(governedClick.attestation).toBe(first.attestation);
		expect(prefixClick.attestation).toBe(first.attestation);
		expect(governedClick.interaction.memberSegmentIndices).toEqual([
			0, 2, 6,
		]);
		expect(prefixClick.interaction.memberSegmentIndices).toEqual([0, 2, 6]);
	});

	test("reuses a resolved unit for another member within one instance", async () => {
		const source = sentence([
			{ kind: "ResolvableText", text: "Bnak" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "Bank" },
		]);
		const { calls, sdk } = queueSdk([
			{
				decision: "Resolved",
				additionalMemberIndices: [1],
				target: {
					family: "Lexeme",
					kind: "NOUN",
				},
			},
			{
				...modelGrammar,
				memberOrthographies: ["Typo", "Standard"],
				normalizedMembers: ["Bank", "Bank"],
				surface: {
					...modelGrammar.surface,
					inflectionalFeatures: {
						case: "Nom",
						number: "Sing",
					},
				},
			},
		]);
		const dumgen = buildDumgen({ sdk });

		const first = await dumgen.resolve.grammatical("de", {
			sentence: source,
			clickedSegmentIndex: 0,
		});
		const second = await dumgen.resolve.grammatical("de", {
			sentence: source,
			clickedSegmentIndex: 2,
		});

		expect(calls).toHaveLength(2);
		expect(first).toMatchObject({
			decision: "Resolved",
			attestation: {
				members: [
					{ attested: "Bnak", orthography: "Typo" },
					{ attested: "Bank", orthography: "Standard" },
				],
			},
			interaction: {
				clickedSegmentIndex: 0,
				memberSegmentIndices: [0, 2],
			},
		});
		expect(second).toMatchObject({
			decision: "Resolved",
			interaction: {
				clickedSegmentIndex: 2,
				memberSegmentIndices: [0, 2],
			},
		});
		if (first.decision !== "Resolved" || second.decision !== "Resolved") {
			throw new Error("Expected both clicks to resolve.");
		}
		expect(second.attestation).toBe(first.attestation);
		expect(first.attestation.members).toHaveLength(
			first.interaction.memberSegmentIndices.length,
		);
		for (
			let position = 0;
			position < first.attestation.members.length;
			position += 1
		) {
			const segmentIndex =
				first.interaction.memberSegmentIndices[position];
			if (segmentIndex === undefined) {
				throw new Error("Missing aligned member Segment index.");
			}
			expect(first.attestation.members[position]?.attested).toBe(
				source.segments[segmentIndex]?.text,
			);
		}
	});

	test("rejects generated grammatical route fields instead of accepting drift", async () => {
		const source = sentence([{ kind: "ResolvableText", text: "Bank" }]);
		const drifting = queueSdk([
			{
				decision: "Resolved",
				additionalMemberIndices: [],
				target: {
					family: "Lexeme",
					kind: "NOUN",
				},
			},
			{
				...modelGrammar,
				lemma: {
					...modelGrammar.lemma,
					language: "en",
					family: "Phraseme",
					kind: "Idiom",
				},
			},
		]);

		await expect(
			buildDumgen({ sdk: drifting.sdk }).resolve.grammatical("de", {
				sentence: source,
				clickedSegmentIndex: 0,
			}),
		).rejects.toMatchObject({ code: "invalid-output" });
		expect(drifting.calls).toHaveLength(2);
	});
});

test("Closed grammar returns a terminal safe miss for an uncatalogued Lemma", async () => {
	const source = sentence([{ kind: "ResolvableText", text: "le" }]);
	const { calls, sdk } = queueSdk([
		{
			decision: "Resolved",
			additionalMemberIndices: [],
			target: { family: "Lexeme", kind: "DET" },
		},
		{
			memberOrthographies: ["Standard"],
			normalizedMembers: ["le"],
			surface: {
				spelling: "Canonical",
				surfaceKind: "Citation",
				surfaceFeatures: null,
			},
			lemma: {
				canonicalForm: "le",
				coreFeatures: derLemma.coreFeatures,
			},
		},
	]);

	const result = await buildDumgen({ sdk }).resolve.grammatical("de", {
		sentence: source,
		clickedSegmentIndex: 0,
	});

	expect(result).toMatchObject({
		decision: "CatalogMiss",
		reason: "MemberNotCatalogued",
		language: "de",
		route: { family: "Lexeme", kind: "DET" },
		stage: "Lemma",
		candidate: { canonicalForm: "le" },
	});
	expect(calls).toHaveLength(2);
	expect(JSON.stringify(result)).not.toContain("markedContext");
});

test("Closed AUX grammar preserves a promoted sein-peer Lemma", async () => {
	const source = sentence([{ kind: "ResolvableText", text: "ist" }]);
	const { calls, sdk } = queueSdk([
		{
			decision: "Resolved",
			additionalMemberIndices: [],
			target: { family: "Lexeme", kind: "AUX" },
		},
		{
			memberOrthographies: ["Standard"],
			normalizedMembers: ["ist"],
			surface: {
				spelling: "Canonical",
				surfaceKind: "Inflection",
				surfaceFeatures: null,
				inflectionalFeatures: {
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Pres",
					verbForm: "Fin",
					voice: null,
				},
			},
			lemma: {
				canonicalForm: "ist",
				coreFeatures: { verbType: null },
			},
		},
	]);

	const result = await buildDumgen({ sdk }).resolve.grammatical("de", {
		sentence: source,
		clickedSegmentIndex: 0,
	});

	expect(result).toMatchObject({
		decision: "Resolved",
		attestation: { surface: { lemma: istLemma } },
	});
	expect(calls).toHaveLength(2);
});

describe("reading resolution", () => {
	test("selects the fixed Reading deterministically without an Open call", async () => {
		const { calls, sdk } = queueSdk([]);
		const result = await buildDumgen({ sdk }).resolve.reading("de", {
			markedContext: "<TARGET>der</TARGET> Mann",
			lemma: derLemma,
			existingEmojiDescriptions: [],
		});

		expect(result).toEqual({ decision: "New", emojiDescription: "👉" });
		expect(calls).toHaveLength(0);
	});

	test("returns a terminal safe miss for an uncatalogued Closed Lemma", async () => {
		const { calls, sdk } = queueSdk([
			{ decision: "New", emojiDescription: "🇫🇷" },
		]);
		const foreignLemma = { ...derLemma, canonicalForm: "le" };
		const result = await buildDumgen({ sdk }).resolve.reading("de", {
			markedContext: "<TARGET>le</TARGET> code",
			lemma: foreignLemma,
			existingEmojiDescriptions: [],
		});

		expect(result).toEqual({
			decision: "CatalogMiss",
			reason: "MemberNotCatalogued",
			language: "de",
			route: { family: "Lexeme", kind: "DET" },
			stage: "Reading",
			candidate: { lemma: foreignLemma, emojiDescription: "🇫🇷" },
		});
		expect(calls).toHaveLength(1);
		expect(JSON.stringify(result)).not.toContain("markedContext");
	});

	test("passes only the minimal input and makes membership authoritative", async () => {
		const { calls, sdk } = queueSdk([
			{ decision: "New", emojiDescription: "🏦" },
			{ decision: "Reuse", emojiDescription: "📚" },
		]);
		const dumgen = buildDumgen({ sdk });
		await expect(
			dumgen.resolve.reading("de", {
				markedContext: "Die <TARGET>Bank</TARGET>.",
				lemma: bankLemma,
				existingEmojiDescriptions: ["🏦"],
			}),
		).resolves.toEqual({ decision: "Reuse", emojiDescription: "🏦" });
		await expect(
			dumgen.resolve.reading("de", {
				markedContext: "Die <TARGET>Bibliothek</TARGET>.",
				lemma: { ...bankLemma, canonicalForm: "Bibliothek" },
				existingEmojiDescriptions: [],
			}),
		).resolves.toEqual({ decision: "New", emojiDescription: "📚" });

		expect(JSON.parse(calls[0]?.input ?? "{}")).toEqual({
			markedContext: "Die <TARGET>Bank</TARGET>.",
			lemma: "Bank",
			existingEmojiDescriptions: ["🏦"],
		});
		expect(calls[0]?.input).not.toContain("canonicalForm");
		expect(calls[0]?.input).not.toContain("coreFeatures");
	});

	test("validates its language and minimal input before dispatch", async () => {
		const { calls, sdk } = queueSdk([]);
		const dumgen = buildDumgen({ sdk });
		for (const input of [
			{
				markedContext: "",
				lemma: bankLemma,
				existingEmojiDescriptions: [],
			},
			{
				markedContext: "<TARGET>Bank</TARGET>",
				lemma: { ...bankLemma, canonicalForm: "" },
				existingEmojiDescriptions: [],
			},
		]) {
			await expect(
				dumgen.resolve.reading("de", input),
			).rejects.toMatchObject({ code: "invalid-input" });
		}
		expect(calls).toHaveLength(0);
	});
});

test("preserves typed provider failures and isolates instrumentation", async () => {
	for (const reason of [
		"refusal",
		"max-output-tokens",
		"content-filter",
	] as const) {
		const dumgen = buildDumgen({
			sdk: {
				async structuredGeneration() {
					throw new AiSdkGenerationError(reason, reason);
				},
				async unstructuredGeneration() {
					throw new AiSdkGenerationError(reason, reason);
				},
			},
			onModelExchange() {
				throw new Error("observer failure");
			},
		});
		await expect(dumgen.segment(["Hallo"])).resolves.toMatchObject({
			ok: false,
			error: { code: "IntakeFailure", reason },
		});
	}
});

test("accepts either an API key or an SDK, never both", () => {
	const { sdk } = queueSdk([]);
	// @ts-expect-error The API key and injected SDK are exclusive.
	const invalidOptions: DumgenOptions = { apiKey: "secret", sdk };
	expect(invalidOptions).toBeDefined();
	expect(buildDumgen({ sdk })).toBeDefined();
	expect(buildDumgen({ apiKey: "secret" })).toBeDefined();
});

test("keeps the complete prompt catalog internal for authoring tests", () => {
	const grammatical = PROMPT_CATALOG.laboratory.grammaticalResolution.de;
	const grammaticalPrompts = Object.values(grammatical).flatMap((family) =>
		Object.values(family).map((entry) => entry.prompt),
	);
	expect(grammaticalPrompts).toHaveLength(21);
	expect(new Set(grammaticalPrompts).size).toBe(21);
	expect(GERMAN_HIGH_LEVEL_ROUTES.Lexeme).toContain("NOUN");
});

test("null output schemas create unstructured string generators", async () => {
	const sdk: AiSdk = {
		async structuredGeneration() {
			throw new Error("not used");
		},
		async unstructuredGeneration() {
			return "raw model text";
		},
	};
	const rawPrompt = {
		systemPrompt: "Return raw text.",
		inputSchema: z.string().trim(),
		outputSchema: null,
		generationParams: { model: "test-model", maxOutputTokens: 32 },
	} as const;
	const catalog = {
		laboratory: { raw: { meta: { kind: "prompt" }, prompt: rawPrompt } },
	} as const satisfies PromptTree;

	const generate = buildGeneratorCatalog(catalog, sdk);
	const result: string = await generate.laboratory.raw("  input  ");
	expect(result).toBe("raw model text");
	expect(DumgenError).toBeFunction();
});

test("the generator preserves classified provider failure metadata", async () => {
	const failure = {
		attempts: 3,
		category: "ProviderUnavailable",
		providerCode: "server_error",
		providerRequestId: "provider-request-1",
		retryable: true,
		status: 500,
	} as const;
	const sdk: AiSdk = {
		async structuredGeneration() {
			throw new Error("not used");
		},
		async unstructuredGeneration() {
			throw new AiSdkGenerationError(
				"provider-error",
				"provider unavailable",
				{ failure },
			);
		},
	};
	const rawPrompt = {
		systemPrompt: "Return raw text.",
		inputSchema: z.string(),
		outputSchema: null,
		generationParams: { model: "test-model", maxOutputTokens: 32 },
	} as const;
	const catalog = {
		laboratory: {
			raw: {
				meta: { kind: "prompt" },
				prompt: rawPrompt,
			},
		},
	} as const satisfies PromptTree;

	await expect(
		buildGeneratorCatalog(catalog, sdk).laboratory.raw("input"),
	).rejects.toMatchObject({
		name: "DumgenError",
		code: "provider-error",
		generationFailure: failure,
	});
});
