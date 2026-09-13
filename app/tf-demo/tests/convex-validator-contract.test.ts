import { expect, test } from "bun:test";
import { directSemanticRelationValues } from "dumrel";

const semanticRelationValues = [
	...directSemanticRelationValues,
	"hyponym",
	"meronym",
];
const enabledSegmentationLanguageValues = ["de", "he"];
const grammaticalResolutionLanguageValues = ["de"];
const segmentKindValues = [
	"ResolvableText",
	"OpaqueText",
	"Whitespace",
	"Punctuation",
];
const memberOrthographyValues = ["Standard", "Typo"];
const realizationCoverageValues = ["Full", "Partial"];
const surfaceSpellingValues = ["Canonical", "Variant"];

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
	grundformValidator,
	languageValidator,
	orthographyValidator,
	realizationCoverageValidator,
	recordedClickValidator,
	reusableAttestationValidator,
	segmentInputValidator,
	segmentKindValidator,
	semanticRelationValidator,
	surfaceSpellingValidator,
} from "../convex/model/validators";
import { readingNoteValidator } from "../convex/modules/notes/readingNote";
import { routeNoteValidator } from "../convex/modules/notes/routeNotes";
import { shadowNoteValidator } from "../convex/modules/notes/shadowNote";
import { get as getRouteNote } from "../convex/routeNotes";

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
	expect(grundformValidator.json.type).toBe("union");
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
		unitKind: "Lemma",
		language: "de",
		canonicalForm: "Bank",
		family: "Lexeme",
		kind: "NOUN",
		coreFeatures: { gender: "Fem", hyph: null },
	});
	expect(Object.keys(projected.coreFeatures)).toEqual(["gender", "hyph"]);

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

test("Note validators expose five exact kinds and keep presented entities nested", () => {
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
	expect(fieldType(readingNoteValidator, "kind")).toEqual({
		type: "literal",
		value: "Reading",
	});
	expect(fieldType(shadowNoteValidator, "kind")).toEqual({
		type: "literal",
		value: "Shadow",
	});
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
	const variantsByKind = new Map(
		routeUnion.value.map((variant) => [
			variant.value.kind?.fieldType.value as string,
			variant,
		]),
	);
	expect([...variantsByKind.keys()]).toEqual([
		"Attestation",
		"Surface",
		"Lemma",
	]);
	for (const [noteKind, variant] of variantsByKind) {
		expect(variant.type).toBe("object");
		if (noteKind === "Surface") {
			expect(variant.value.presented).toBeUndefined();
			expect(variant.value.analyses?.fieldType.type).toBe("array");
		} else {
			expect(variant.value.presented?.optional).not.toBe(true);
			expect(variant.value.presented?.fieldType.type).toBe("object");
		}
		for (const field of duplicatedEntityFields[
			noteKind as keyof typeof duplicatedEntityFields
		]) {
			expect(variant.value[field]).toBeUndefined();
		}
	}
});

test("Route Note query locators retain table-specific Convex IDs", () => {
	const args = getRouteNote.exportArgs();
	expect(args).toContain('"attestationId"');
	expect(args).toContain('"tableName":"attestations"');
	expect(args).toContain('"lemmaId"');
	expect(args).toContain('"tableName":"lemmas"');
	expect(args).toContain('"activeAnalysisKey"');
	expect(args).toContain('"tableName":"surfaces"');
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

test("the current Dumgen factory executes without package-relative file I/O", async () => {
	const child = Bun.spawn(
		[
			process.execPath,
			"-e",
			`
 const original = process.getBuiltinModule.bind(process);
 process.getBuiltinModule = id => id === "node:fs" ? {...original(id), readFileSync() {throw Error("filesystem unavailable");}} : original(id);
 const {createDumgen} = await import("dumgen");
 const Effect = await import("effect/Effect");
 const dumgen = createDumgen({execute: async () => {throw Error("controlled provider failure");}});
 const result = await Effect.runPromiseExit(dumgen.segment({sourceSentences: ["Die Banken sind geöffnet."]}));
 if (result._tag !== "Failure") throw Error("Expected controlled failure");
 `,
		],
		{
			cwd: new URL("..", import.meta.url).pathname,
			stdout: "pipe",
			stderr: "pipe",
		},
	);
	const [code, stderr] = await Promise.all([
		child.exited,
		new Response(child.stderr).text(),
	]);
	expect(stderr).toBe("");
	expect(code).toBe(0);
});
