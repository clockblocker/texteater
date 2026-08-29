import { expect, test } from "bun:test";
import {
	enabledSegmentationLanguageValues,
	grammaticalResolutionLanguageValues,
	segmentKindValues,
} from "dumgen/vocabulary";
import {
	memberOrthographyValues,
	presentedFeatureNames,
	realizationCoverageValues,
	surfaceKindValues,
	surfaceSpellingValues,
} from "dumling/vocabulary";
import { semanticRelationValues } from "dumrel/vocabulary";

import {
	presentedAttestationValidator,
	presentedFeatureSetValidator,
	presentedLemmaValidator,
	presentedSurfaceValidator,
	presentLemma,
} from "../convex/model/presentedDumling";
import {
	dictionaryPlanValidator,
	dumdictPlannedChangeValidator,
	grammaticalLanguageValidator,
	languageValidator,
	orthographyValidator,
	realizationCoverageValidator,
	recordedClickValidator,
	reusableAttestationValidator,
	segmentInputValidator,
	segmentKindValidator,
	semanticRelationValidator,
	surfaceKindValidator,
	surfaceSpellingValidator,
} from "../convex/model/validators";
import { routeNoteValidator } from "../convex/modules/notes/routeNotes";

function fieldType(
	validator: { json: unknown },
	field: string,
): Record<string, unknown> {
	const json = validator.json as {
		value: Record<string, { fieldType: Record<string, unknown> }>;
	};
	return json.value[field]?.fieldType ?? {};
}

function literalValues(validator: { json: unknown }): unknown[] {
	const json = validator.json as {
		type?: string;
		value?: unknown | Array<{ type?: string; value?: unknown }>;
	};
	if (json.type === "literal") return [json.value];
	if (json.type !== "union" || !Array.isArray(json.value)) return [];
	return json.value.flatMap((member) =>
		member.type === "literal" ? [member.value] : [],
	);
}

test("Dumdict plans validate a discriminated change union", () => {
	const changes = fieldType(dictionaryPlanValidator, "changes") as {
		value?: { type?: string };
	};
	expect(changes.type).toBe("array");
	expect(changes.value?.type).toBe("union");
});

test("Convex validators describe compact storage contracts", () => {
	expect(literalValues(languageValidator)).toEqual(
		enabledSegmentationLanguageValues,
	);
	expect(literalValues(grammaticalLanguageValidator)).toEqual(
		grammaticalResolutionLanguageValues,
	);
	expect(literalValues(segmentKindValidator)).toEqual(segmentKindValues);
	expect(literalValues(orthographyValidator)).toEqual(
		memberOrthographyValues,
	);
	expect(literalValues(realizationCoverageValidator)).toEqual(
		realizationCoverageValues,
	);
	expect(literalValues(surfaceSpellingValidator)).toEqual(
		surfaceSpellingValues,
	);
	expect(literalValues(surfaceKindValidator)).toEqual(surfaceKindValues);
	expect(fieldType(segmentInputValidator, "kind")).toEqual(
		segmentKindValidator.json,
	);
	expect(fieldType(segmentInputValidator, "text")).toEqual({
		type: "string",
	});
	expect(literalValues(semanticRelationValidator)).toEqual(
		semanticRelationValues,
	);
});

test("Presented Dumling validators cover the exact stable presentation branches", () => {
	const featureJson = presentedFeatureSetValidator.json as {
		type: string;
		keys: Record<string, unknown>;
	};
	expect(featureJson.type).toBe("record");
	expect(featureJson.keys).toEqual({ type: "string" });
	const projected = presentLemma({
		language: "de",
		canonicalForm: "Bank",
		family: "Lexeme",
		kind: "NOUN",
		coreFeatures: { gender: "Fem", hyph: null },
	});
	expect(Object.keys(projected.coreFeatures)).toEqual(presentedFeatureNames);

	expect(fieldType(presentedLemmaValidator, "coreFeatures")).toEqual(
		presentedFeatureSetValidator.json,
	);
	const surfaceFeatures = fieldType(
		presentedSurfaceValidator,
		"surfaceFeatures",
	) as {
		type?: string;
		value?: Record<string, { optional?: boolean }>;
	};
	expect(surfaceFeatures.type).toBe("object");
	expect(Object.keys(surfaceFeatures.value ?? {})).toEqual([
		"historicalStatus",
	]);
	expect(surfaceFeatures.value?.historicalStatus?.optional).not.toBe(true);
	expect(fieldType(presentedSurfaceValidator, "lemma")).toEqual(
		presentedLemmaValidator.json,
	);
	expect(
		fieldType(presentedSurfaceValidator, "inflectionalFeatures"),
	).toEqual(presentedFeatureSetValidator.json);
	expect(fieldType(presentedAttestationValidator, "surface")).toEqual(
		presentedSurfaceValidator.json,
	);
});

test("each Route Note variant has one required Presented entity field", () => {
	const routeUnion = routeNoteValidator.json as {
		type: string;
		value: Array<{
			type: string;
			value: Record<
				string,
				{
					optional?: boolean;
					fieldType: { type?: string; value?: unknown };
				}
			>;
		}>;
	};
	expect(routeUnion.type).toBe("union");
	expect(routeUnion.value).toHaveLength(3);
	const duplicatedEntityFields = {
		Attestation: ["members", "realizationCoverage", "surface"],
		Surface: [
			"language",
			"normalizedSurface",
			"spelling",
			"surfaceKind",
			"surfaceFeatures",
			"inflectionalFeatures",
			"lemma",
		],
		Lemma: [
			"language",
			"canonicalForm",
			"family",
			"lemmaKind",
			"coreFeatures",
		],
	} as const;
	for (const variant of routeUnion.value) {
		expect(variant.type).toBe("object");
		expect(variant.value.presented?.optional).not.toBe(true);
		expect(variant.value.presented?.fieldType.type).toBe("object");
		const routeKind = variant.value.routeKind?.fieldType
			.value as keyof typeof duplicatedEntityFields;
		for (const field of duplicatedEntityFields[routeKind]) {
			expect(variant.value[field]).toBeUndefined();
		}
	}
});

test("the persistence adapter does not load exhaustive domain schemas", async () => {
	const storageSources = await Promise.all(
		[
			"../convex/model/validators.ts",
			"../convex/model/readingKnowledge.ts",
			"../convex/dumdictActionStorage.ts",
			"../convex/dumdictStorage.ts",
			"../convex/dumdictTransaction.ts",
			"../convex/dumdictStorage/adapter.ts",
			"../convex/dumdictStorage/dictionaryPlan.ts",
			"../convex/dumdictStorage/queries.ts",
			"../convex/dumdictStorage/storage.ts",
			"../convex/dumdictStorage/transaction.ts",
			"../convex/persistence.ts",
		].map((path) => Bun.file(new URL(path, import.meta.url)).text()),
	);
	const storageSource = storageSources.join("\n");

	expect(storageSource).not.toContain('from "dumgen/schema"');
	expect(storageSource).not.toContain('from "dumdict/schema"');
	expect(storageSource).not.toContain('from "dumdict"');
	expect(storageSource).not.toContain("zodOutputToConvex");
});

test("operational application modules use package-owned lightweight parsers", async () => {
	const operationalSources = await Promise.all(
		[
			"../convex/modules/notes/projections.ts",
			"../convex/modules/notes/relations.ts",
			"../convex/orchestration.ts",
			"../server/linguisticOrchestration.ts",
		].map((path) => Bun.file(new URL(path, import.meta.url)).text()),
	);
	const operationalSource = operationalSources.join("\n");

	expect(operationalSource).not.toMatch(
		/from ["'](?:dumdict|dumgen|dumling|dumrel)\/(?:schema|dangerously-heavy-schema-tree|model-authoring)["']/u,
	);
});

test("Dumdict's Convex envelope stays compact", () => {
	expect(
		JSON.stringify(dumdictPlannedChangeValidator.json).length,
	).toBeLessThan(10_000);
});

test("persistence result validators retain table-specific Convex IDs", () => {
	expect(fieldType(reusableAttestationValidator, "attestationId")).toEqual({
		type: "id",
		tableName: "attestations",
	});
	const recordedJson = JSON.stringify(recordedClickValidator.json);
	expect(recordedJson).toContain('"tableName":"visitorClicks"');
	expect(recordedJson).not.toContain(
		'"clickId":{"fieldType":{"type":"string"',
	);
});

test("the Convex runtime can inject Dumgen prompt data without package-relative file I/O", async () => {
	const child = Bun.spawn(
		[
			process.execPath,
			"-e",
			`
				const originalGetBuiltinModule = process.getBuiltinModule.bind(process);
				process.getBuiltinModule = (id) => id === "node:fs"
					? { ...originalGetBuiltinModule(id), readFileSync() { throw new Error("filesystem unavailable"); } }
					: originalGetBuiltinModule(id);
				const [
					{ encodedRuntimePromptData },
					{ buildKnowledgeDumgenRuntime },
					{ buildDumgenRuntime },
				] = await Promise.all([
					import("dumgen/runtime-prompt-data"),
					import("dumgen/knowledge-runtime"),
					import("dumgen/runtime"),
				]);
				const sdk = {
					async structuredGeneration() { throw new Error("provider reached"); },
					async unstructuredGeneration() { throw new Error("provider reached"); },
				};
				const knowledgeDumgen = buildKnowledgeDumgenRuntime({
					runtimePromptData: encodedRuntimePromptData,
					sdk,
				});
				try {
					await knowledgeDumgen.generate.knowledge("de", {
						markedContext: "Die <TARGET>Bank</TARGET> genehmigte den Kredit.",
						reading: {
							lemma: {
								canonicalForm: "Bank",
								coreFeatures: { gender: "Fem", hyph: null },
								family: "Lexeme",
								kind: "NOUN",
								language: "de",
							},
							emojiDescription: "🏦",
						},
						request: { definition: null },
					});
					throw new Error("knowledge provider was not reached");
				} catch (error) {
					if (error?.code !== "provider-error") throw error;
				}
				const dumgen = buildDumgenRuntime({
					runtimePromptData: encodedRuntimePromptData,
					sdk,
					async generateKnowledge() { throw new Error("unexpected knowledge generation"); },
				});
				const result = await dumgen.segment(["Die Banken sind geöffnet."]);
				if (result.ok || result.error.reason !== "provider-error") {
					throw new Error(JSON.stringify(result));
				}
			`,
		],
		{
			cwd: new URL("..", import.meta.url).pathname,
			stderr: "pipe",
			stdout: "pipe",
		},
	);
	const [exitCode, stderr] = await Promise.all([
		child.exited,
		new Response(child.stderr).text(),
	]);
	expect(stderr).toBe("");
	expect(exitCode).toBe(0);
});
