import { describe, expect, test } from "bun:test";
import {
	type AiSdk,
	buildDumgen,
	type DumgenModelExchange,
	type SegmentedSentence,
} from "dumgen";
import { schemasFor } from "dumling/schema";

import { DUMGEN_GENERATION_MODEL } from "../../src/ai-sdk/model-policy";
import { DE_AUTHORED_GRAMMATICAL_RESOLUTION_PROMPTS } from "../../src/catalog/laboratory/de-authored-grammatical-resolution-prompts";
import { PROMPT_CATALOG } from "../../src/catalog/prompt-catalog";
import type { Prompt } from "../../src/catalog/prompt-definition";
import { isGermanHighLevelTargetClassificationRoute } from "../../src/promptsmith/production/prompt-part/target-classification/de/high-level-whole-unit";
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
		id: crypto.randomUUID() as SegmentedSentence<"de">["id"],
		language: "de",
		segments: [
			{ text: "eins", kind: "ResolvableText" },
			{ text: " ", kind: "Whitespace" },
			{ text: "zwei", kind: "ResolvableText" },
		],
	};
}

function singleSegmentSentence(text: string): SegmentedSentence<"de"> {
	return {
		id: crypto.randomUUID() as SegmentedSentence<"de">["id"],
		language: "de",
		segments: [{ text, kind: "ResolvableText" }],
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

		expect(enabled).toHaveLength(21);
		expect([...new Set([...enabled, ...notImplemented])].sort()).toEqual(
			[...new Set(dumlingRoutes)].sort(),
		);
		expect(enabled).not.toContain("Lexeme/PUNCT");
		expect(notImplemented).toContain("Lexeme/PUNCT");
		expect(notImplemented).toContain("Phraseme/Collocation");
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

		expect(catalog.Lexeme?.PUNCT).toBeUndefined();
		expect(catalog.Phraseme?.Collocation).toBeUndefined();
		for (const family of Object.values(catalog)) {
			for (const { prompt } of Object.values(family)) {
				expect(
					prompt.outputSchema?.safeParse({
						decision: "Unresolved",
						resolution: null,
					}).success,
				).toBe(false);
			}
		}
		expect(
			Object.keys(PROMPT_CATALOG.laboratory.readingResolution),
		).toEqual(["de"]);
	});

	test("dispatches every target-reachable route uniformly through its exact catalog leaf", async () => {
		const targetReachableRoutes =
			DE_ENABLED_GRAMMATICAL_RESOLUTION_ROUTES.filter(
				({ family, kind }) =>
					isGermanHighLevelTargetClassificationRoute(family, kind),
			);
		expect(targetReachableRoutes).toHaveLength(20);
		expect(targetReachableRoutes).not.toContainEqual({
			family: "Lexeme",
			kind: "X",
		});
		expect(targetReachableRoutes).not.toContainEqual({
			family: "Phraseme",
			kind: "Collocation",
		});

		for (const route of targetReachableRoutes) {
			const multipleMembers =
				route.family === "Phraseme" ||
				(route.family === "Lexeme" &&
					["ADV", "CCONJ", "SCONJ", "VERB"].includes(route.kind));
			const grammarOutput = {};
			const { pending, sdk } = queueSdk([
				{
					decision: "Resolved",
					additionalMemberIndices: multipleMembers ? [1] : [],
					target: {
						...route,
					},
				},
				grammarOutput,
			]);
			const exchanges: DumgenModelExchange[] = [];
			const operation = buildDumgen({
				sdk,
				onModelExchange(exchange) {
					exchanges.push(exchange);
				},
			}).resolve.grammatical("de", {
				sentence: sentence(),
				clickedSegmentIndex: 0,
			});

			await expect(operation).rejects.toMatchObject({
				name: "DumgenError",
				code: "invalid-output",
			});
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

	test("constructs a linked Attestation through a newly enabled Construction route", async () => {
		const { pending, sdk } = queueSdk([
			{
				decision: "Resolved",
				additionalMemberIndices: [],
				target: {
					family: "Construction",
					kind: "Fusion",
				},
			},
			{
				memberOrthographies: ["Standard"],
				lemma: { canonicalForm: "im" },
				normalizedMembers: ["im"],
				surface: {
					spelling: "Canonical",
					surfaceFeatures: null,
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
			attestation: {
				members: [{ attested: "im", orthography: "Standard" }],
				realizationCoverage: "Full",
				surface: {
					language: "de",
					lemma: {
						language: "de",
						family: "Construction",
						kind: "Fusion",
					},
				},
			},
			interaction: {
				clickedSegmentIndex: 0,
				memberSegmentIndices: [0],
			},
		});
		expect(pending).toHaveLength(0);
	});

	test("fixed-field codecs reconstruct route identity and linked canonical entities", () => {
		const cconjPrompt =
			DE_AUTHORED_GRAMMATICAL_RESOLUTION_PROMPTS.Lexeme.CCONJ;
		const cconjGenerated = cconjPrompt.outputSchema.parse({
			memberOrthographies: ["Standard", "Standard"],
			normalizedMembers: ["entweder", "oder"],
			surface: {
				spelling: "Canonical",
				surfaceFeatures: null,
			},
			lemma: {
				canonicalForm: "entweder … oder",
				coreFeatures: { conjType: null },
			},
		});
		const cconj = cconjPrompt.projectOutput(
			{
				markedContext:
					"<TARGET>entweder</TARGET> heute <TARGET>oder</TARGET> morgen",
				members: ["entweder", "oder"],
			},
			cconjGenerated,
		);

		expect(cconj).toMatchObject({
			memberOrthographies: ["Standard", "Standard"],
			normalizedMembers: ["entweder", "oder"],
			surface: {
				language: "de",
				normalizedSurface: "entweder oder",
				lemma: {
					language: "de",
					family: "Lexeme",
					kind: "CCONJ",
					canonicalForm: "entweder … oder",
					coreFeatures: { conjType: null },
				},
			},
		});

		const sconjPrompt =
			DE_AUTHORED_GRAMMATICAL_RESOLUTION_PROMPTS.Lexeme.SCONJ;
		const sconj = sconjPrompt.projectOutput(
			{
				markedContext:
					"<TARGET>um</TARGET> das <TARGET>zu</TARGET> prüfen",
				members: ["um", "zu"],
			},
			sconjPrompt.outputSchema.parse({
				memberOrthographies: ["Standard", "Standard"],
				normalizedMembers: ["um", "zu"],
				surface: { spelling: "Canonical", surfaceFeatures: null },
				lemma: {
					canonicalForm: "um zu",
					coreFeatures: { conjType: null },
				},
			}),
		);

		expect(sconj).toMatchObject({
			memberOrthographies: ["Standard", "Standard"],
			normalizedMembers: ["um", "zu"],
			surface: {
				normalizedSurface: "um zu",
				lemma: {
					family: "Lexeme",
					kind: "SCONJ",
					canonicalForm: "um zu",
					coreFeatures: { conjType: null },
				},
			},
		});

		const advPrompt = DE_AUTHORED_GRAMMATICAL_RESOLUTION_PROMPTS.Lexeme.ADV;
		const adv = advPrompt.projectOutput(
			{
				markedContext:
					"<TARGET>einerseits</TARGET> gut, <TARGET>andererseits</TARGET> teuer",
				members: ["einerseits", "andererseits"],
			},
			advPrompt.outputSchema.parse({
				memberOrthographies: ["Standard", "Standard"],
				normalizedMembers: ["einerseits", "andererseits"],
				surface: {
					spelling: "Canonical",
					surfaceKind: "Citation",
					surfaceFeatures: null,
				},
				lemma: {
					canonicalForm: "einerseits … andererseits",
					coreFeatures: {
						foreign: null,
						numType: null,
						pronType: null,
					},
				},
			}),
		);

		expect(adv).toMatchObject({
			memberOrthographies: ["Standard", "Standard"],
			normalizedMembers: ["einerseits", "andererseits"],
			surface: {
				normalizedSurface: "einerseits andererseits",
				lemma: {
					family: "Lexeme",
					kind: "ADV",
					canonicalForm: "einerseits … andererseits",
				},
			},
		});

		const fusionPrompt =
			DE_AUTHORED_GRAMMATICAL_RESOLUTION_PROMPTS.Construction.Fusion;
		const fusionGenerated = fusionPrompt.outputSchema.parse({
			memberOrthographies: ["Standard"],
			lemma: { canonicalForm: "im" },
			normalizedMembers: ["im"],
			surface: {
				spelling: "Canonical",
				surfaceFeatures: { historicalStatus: null },
			},
		});
		const fusion = fusionPrompt.projectOutput(
			{ markedContext: "<TARGET>im</TARGET>", members: ["im"] },
			fusionGenerated,
		);

		expect(fusion).toMatchObject({
			surface: {
				language: "de",
				normalizedSurface: "im",
				surfaceFeatures: null,
				lemma: {
					language: "de",
					family: "Construction",
					kind: "Fusion",
				},
			},
		});

		const proverbPrompt =
			DE_AUTHORED_GRAMMATICAL_RESOLUTION_PROMPTS.Phraseme.Proverb;
		const proverbGenerated = proverbPrompt.outputSchema.parse({
			memberOrthographies: [
				"Standard",
				"Standard",
				"Standard",
				"Standard",
			],
			lemma: {
				canonicalForm: "Ende gut, alles gut",
			},
			realizationCoverage: "Full",
			normalizedMembers: ["Ende", "gut", "alles", "gut"],
			surface: {
				spelling: "Canonical",
				surfaceFeatures: null,
			},
		});
		const proverb = proverbPrompt.projectOutput(
			{
				markedContext:
					"<TARGET>Ende</TARGET> <TARGET>gut</TARGET> <TARGET>alles</TARGET> <TARGET>gut</TARGET>",
				members: ["Ende", "gut", "alles", "gut"],
			},
			proverbGenerated,
		);

		expect(proverb).toMatchObject({
			surface: {
				language: "de",
				normalizedSurface: "Ende gut alles gut",
				lemma: {
					language: "de",
					family: "Phraseme",
					kind: "Proverb",
				},
			},
		});
	});
});
