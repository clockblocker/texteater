import { expect, test } from "bun:test";

import {
	SHEET_WORKSPACE_ACCEPTANCE_SCENARIOS,
	SHEET_WORKSPACE_VARIANT_MECHANICS,
} from "../src/playground/sheet-workspace/sheet-workspace-acceptance";
import { SHEET_WORKSPACE_VARIANTS } from "../src/playground/sheet-workspace/sheet-workspace-contract";

test("holds every adapter to one complete acceptance contract", () => {
	expect(
		new Set(
			SHEET_WORKSPACE_ACCEPTANCE_SCENARIOS.map((scenario) => scenario.id),
		).size,
	).toBe(SHEET_WORKSPACE_ACCEPTANCE_SCENARIOS.length);
	expect(
		new Set(
			SHEET_WORKSPACE_ACCEPTANCE_SCENARIOS.map(
				(scenario) => scenario.gate,
			),
		),
	).toEqual(
		new Set(["algebra", "input", "focus", "preview", "motion", "runtime"]),
	);
	expect(Object.keys(SHEET_WORKSPACE_VARIANT_MECHANICS).sort()).toEqual(
		[...SHEET_WORKSPACE_VARIANTS].sort(),
	);
});
