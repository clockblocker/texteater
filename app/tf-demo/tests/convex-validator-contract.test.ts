import { expect, test } from "bun:test";

import {
	dictionaryPlanValidator,
	recordedClickValidator,
	reusableAttestationValidator,
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

test("Dumdict plans validate a discriminated change union", () => {
	const changes = fieldType(dictionaryPlanValidator, "changes") as {
		value?: { type?: string };
	};
	expect(changes.type).toBe("array");
	expect(changes.value?.type).toBe("union");
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
