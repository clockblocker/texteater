import { expect, test } from "bun:test";
import {
	enabledSegmentationLanguageSchema,
	grammaticalResolutionLanguageSchema,
	segmentKindSchema,
	segmentSchema,
} from "dumgen/schema";
import { semanticRelationSchema } from "dumrel";

import {
	dictionaryPlanValidator,
	dumdictPlannedChangeValidator,
	grammaticalLanguageValidator,
	languageValidator,
	recordedClickValidator,
	reusableAttestationValidator,
	segmentInputValidator,
	segmentKindValidator,
	semanticRelationValidator,
} from "../convex/model/validators";
import { zodOutputToConvex } from "../convex/model/zodConvex.js";

function fieldType(
	validator: { json: unknown },
	field: string,
): Record<string, unknown> {
	const json = validator.json as {
		value: Record<string, { fieldType: Record<string, unknown> }>;
	};
	return json.value[field]?.fieldType ?? {};
}

test("Dumdict plans validate a discriminated change union", () => {
	const changes = fieldType(dictionaryPlanValidator, "changes") as {
		value?: { type?: string };
	};
	expect(changes.type).toBe("array");
	expect(changes.value?.type).toBe("union");
});

test("shared Zod contracts generate the corresponding Convex validators", () => {
	expect(languageValidator.json).toEqual(
		zodOutputToConvex(enabledSegmentationLanguageSchema).json,
	);
	expect(grammaticalLanguageValidator.json).toEqual(
		zodOutputToConvex(grammaticalResolutionLanguageSchema).json,
	);
	expect(segmentKindValidator.json).toEqual(
		zodOutputToConvex(segmentKindSchema).json,
	);
	expect(segmentInputValidator.json).toEqual(
		zodOutputToConvex(segmentSchema).json,
	);
	expect(semanticRelationValidator.json).toEqual(
		zodOutputToConvex(semanticRelationSchema).json,
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
