import { expect, test } from "bun:test";
import {
	enabledSegmentationLanguageValues,
	grammaticalResolutionLanguageValues,
	segmentKindValues,
} from "dumgen/vocabulary";
import {
	memberOrthographyValues,
	realizationCoverageValues,
	surfaceKindValues,
	surfaceSpellingValues,
} from "dumling/vocabulary";
import { semanticRelationValues } from "dumrel/vocabulary";

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

test("the persistence adapter does not load exhaustive domain schemas", async () => {
	const storageSources = await Promise.all(
		[
			"../convex/model/validators.ts",
			"../convex/dumdictStorage.ts",
			"../convex/persistence.ts",
		].map((path) => Bun.file(new URL(path, import.meta.url)).text()),
	);
	const storageSource = storageSources.join("\n");

	expect(storageSource).not.toContain('from "dumgen/schema"');
	expect(storageSource).not.toContain('from "dumdict/schema"');
	expect(storageSource).not.toContain('from "dumdict"');
	expect(storageSource).not.toContain("zodOutputToConvex");
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
