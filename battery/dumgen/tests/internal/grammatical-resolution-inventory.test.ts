import { describe, expect, test } from "bun:test";
import {
	type AiSdk,
	buildDumgen,
	type DumgenModelExchange,
	type SegmentedSentence,
} from "dumgen";
import { dumling } from "dumling";
import { schemasFor } from "dumling/schema";

import { DUMGEN_GENERATION_MODEL } from "../../src/ai-sdk/model-policy";
import { DE_AUTHORED_GRAMMATICAL_RESOLUTION_PROMPTS } from "../../src/catalog/laboratory/de-authored-grammatical-resolution-prompts";
import { PROMPT_CATALOG } from "../../src/catalog/prompt-catalog";
import type { Prompt } from "../../src/catalog/prompt-definition";
import {
	DE_ENABLED_GRAMMATICAL_RESOLUTION_ROUTES,
	DE_NOT_IMPLEMENTED_GRAMMATICAL_RESOLUTION_ROUTES,
} from "../../src/schema/de-grammatical-resolution-inventory";

type CatalogEntry = { readonly prompt: Prompt };

function routeKey(route: { readonly family: string; readonly kind: string }) {
	return `${route.family}/${route.kind}`;
}

function sentence(): SegmentedSentence<"de"> {
	return {
		id: dumling.de.create.segmentedSentenceId(crypto.randomUUID()),
		language: "de",
		sourceText: "eins zwei",
		segments: [
			{
				index: 0,
				text: "eins",
				kind: "ResolvableText",
				start: 0,
				end: 4,
			},
			{ index: 1, text: " ", kind: "Whitespace", start: 4, end: 5 },
			{
				index: 2,
				text: "zwei",
				kind: "ResolvableText",
				start: 5,
				end: 9,
			},
		],
	};
}

function singleSegmentSentence(text: string): SegmentedSentence<"de"> {
	return {
		id: dumling.de.create.segmentedSentenceId(crypto.randomUUID()),
		language: "de",
		sourceText: text,
		segments: [
			{
				index: 0,
				text,
				kind: "ResolvableText",
				start: 0,
				end: text.length,
			},
		],
	};
}

function queueSdk(outputs: readonly unknown[]) {
	const pending = [...outputs];
	const sdk: AiSdk = {
		async structuredGeneration() {
			return pending.shift() as never;
		},
		async unstructuredGeneration() {
			throw new Error("not used");
		},
	};
	return { pending, sdk };
}

describe("German Grammatical Resolution inventory", () => {
	test("partitions every Dumling German route into enabled or explicit NotImplemented", () => {
		const dumlingRoutes = Object.entries(
			schemasFor.de.entity.Lemma,
		).flatMap(([family, kinds]) =>
			Object.keys(kinds).map((kind) => `${family}/${kind}`),
		);
		const enabled = DE_ENABLED_GRAMMATICAL_RESOLUTION_ROUTES.map(routeKey);
		const notImplemented =
			DE_NOT_IMPLEMENTED_GRAMMATICAL_RESOLUTION_ROUTES.map(routeKey);

		expect(enabled).toHaveLength(23);
		expect(new Set([...enabled, ...notImplemented])).toEqual(
			new Set(dumlingRoutes),
		);
		expect(enabled).not.toContain("Lexeme/PUNCT");
		expect(
			notImplemented.filter((key) => key.startsWith("Morpheme/")),
		).toHaveLength(11);
	});

	test("catalogs every enabled route with its authored schema, generated prompt, and Luna policy", () => {
		const catalog = PROMPT_CATALOG.laboratory.grammaticalResolution
			.de as unknown as Record<string, Record<string, CatalogEntry>>;
		const authored =
			DE_AUTHORED_GRAMMATICAL_RESOLUTION_PROMPTS as unknown as Record<
				string,
				Record<string, Prompt>
			>;

		for (const {
			family,
			kind,
		} of DE_ENABLED_GRAMMATICAL_RESOLUTION_ROUTES) {
			const catalogPrompt = catalog[family]?.[kind]?.prompt;
			const authoredPrompt = authored[family]?.[kind];
			expect(catalogPrompt).toBe(authoredPrompt);
			expect(
				catalogPrompt?.systemPrompt.startsWith("Legacy disabled"),
			).toBe(false);
			expect(catalogPrompt?.generationParams.model).toBe(
				DUMGEN_GENERATION_MODEL,
			);
		}

		expect(catalog.Lexeme?.PUNCT?.prompt.systemPrompt).toStartWith(
			"Legacy disabled Lexeme/PUNCT",
		);
		expect(
			Object.keys(PROMPT_CATALOG.laboratory.readingResolution),
		).toEqual(["de"]);
	});

	test("dispatches all 23 enabled routes through their exact catalog leaves", async () => {
		for (const route of DE_ENABLED_GRAMMATICAL_RESOLUTION_ROUTES) {
			const multipleMembers =
				route.family === "Phraseme" || route.kind === "PairedFrame";
			const { pending, sdk } = queueSdk([
				{
					decision: "Resolved",
					target: {
						...route,
						additionalMemberSegmentIndices: multipleMembers
							? [2]
							: [],
					},
				},
				{ decision: "Unresolved", resolution: null },
			]);
			const exchanges: DumgenModelExchange[] = [];
			const result = await buildDumgen({
				sdk,
				onModelExchange(exchange) {
					exchanges.push(exchange);
				},
			}).resolve.grammatical("de", {
				sentence: sentence(),
				clickedSegmentIndex: 0,
			});

			expect(result).toEqual({ decision: "Unresolved", language: "de" });
			expect(pending).toHaveLength(0);
			expect(
				exchanges
					.filter(({ phase }) => phase === "attempted")
					.map(({ promptPath }) => promptPath),
			).toEqual([
				"laboratory.targetClassification.de.highLevelWholeUnit",
				`laboratory.grammaticalResolution.de.${route.family}.${route.kind}`,
			]);
		}
	});

	test("keeps Lexeme/PUNCT explicitly NotImplemented without a grammar call", async () => {
		const { pending, sdk } = queueSdk([
			{
				decision: "Resolved",
				target: {
					family: "Lexeme",
					kind: "PUNCT",
					additionalMemberSegmentIndices: [],
				},
			},
		]);

		const result = await buildDumgen({ sdk }).resolve.grammatical("de", {
			sentence: sentence(),
			clickedSegmentIndex: 0,
		});

		expect(result).toEqual({
			decision: "NotImplemented",
			language: "de",
			route: { family: "Lexeme", kind: "PUNCT" },
		});
		expect(pending).toHaveLength(0);
	});

	test("constructs a linked Selection through a newly enabled Construction route", async () => {
		const { pending, sdk } = queueSdk([
			{
				decision: "Resolved",
				target: {
					family: "Construction",
					kind: "Fusion",
					additionalMemberSegmentIndices: [],
				},
			},
			{
				decision: "Resolved",
				resolution: {
					memberOrthographies: ["Standard"],
					lemma: { canonicalForm: "im", coreFeatures: {} },
					surface: {
						normalizedSurface: "im",
						spelling: "Canonical",
						realizationCoverage: "Full",
						surfaceKind: "Citation",
						surfaceFeatures: null,
					},
				},
			},
		]);

		const result = await buildDumgen({ sdk }).resolve.grammatical("de", {
			sentence: singleSegmentSentence("im"),
			clickedSegmentIndex: 0,
		});

		expect(result).toMatchObject({
			decision: "Resolved",
			language: "de",
			markedContext: "<TARGET>im</TARGET>",
			selection: {
				attestedSurface: "im",
				selectedOrthography: "Standard",
				surface: {
					language: "de",
					lemma: {
						language: "de",
						family: "Construction",
						kind: "Fusion",
					},
				},
			},
		});
		expect(pending).toHaveLength(0);
	});

	test("fixed-field codecs reconstruct route identity and linked canonical entities", () => {
		const fusionPrompt =
			DE_AUTHORED_GRAMMATICAL_RESOLUTION_PROMPTS.Construction.Fusion;
		const fusionGenerated = fusionPrompt.outputSchema.parse({
			decision: "Resolved",
			resolution: {
				memberOrthographies: ["Standard"],
				lemma: { canonicalForm: "im", coreFeatures: {} },
				surface: {
					normalizedSurface: "im",
					spelling: "Canonical",
					realizationCoverage: "Full",
					surfaceKind: "Citation",
					surfaceFeatures: { historicalStatus: null },
				},
			},
		});
		const fusion = fusionPrompt.projectOutput(
			{ markedContext: "<TARGET>im</TARGET>" },
			fusionGenerated,
		);

		expect(fusion).toMatchObject({
			decision: "Resolved",
			lemma: {
				language: "de",
				family: "Construction",
				kind: "Fusion",
			},
			surface: { language: "de", surfaceFeatures: null },
		});
		if (fusion.decision === "Resolved") {
			expect("lemma" in fusion.surface).toBe(false);
		}

		const proverbPrompt =
			DE_AUTHORED_GRAMMATICAL_RESOLUTION_PROMPTS.Phraseme.Proverb;
		const proverbGenerated = proverbPrompt.outputSchema.parse({
			decision: "Resolved",
			resolution: {
				memberOrthographies: ["Standard", "Standard"],
				lemma: {
					canonicalForm: "Ende gut, alles gut",
					coreFeatures: {},
				},
				surface: {
					normalizedSurface: "Ende gut alles gut",
					spelling: "Canonical",
					realizationCoverage: "Full",
					surfaceKind: "Citation",
					surfaceFeatures: null,
				},
			},
		});
		const proverb = proverbPrompt.projectOutput(
			{ markedContext: "<TARGET>Ende</TARGET> <TARGET>gut</TARGET>" },
			proverbGenerated,
		);

		expect(proverb).toMatchObject({
			decision: "Resolved",
			lemma: {
				language: "de",
				family: "Phraseme",
				kind: "Proverb",
			},
			surface: { language: "de" },
		});
	});
});
