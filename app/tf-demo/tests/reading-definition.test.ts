import { expect, test } from "bun:test";

import {
	normalizeReadingDefinition,
	readingDefinitionChange,
} from "../src/lib/reading-definition";

test("normalizes a Reading definition before autosaving", () => {
	expect(normalizeReadingDefinition("  o\u0308ffentlich  ")).toBe(
		"öffentlich",
	);
});

test("selects the Dumrel change that matches the definition transition", () => {
	expect(readingDefinitionChange("", "open to access")).toEqual({
		kind: "Contribute",
		aspect: "definition",
		value: "open to access",
	});
	expect(readingDefinitionChange("open", "not closed")).toEqual({
		kind: "Correct",
		aspect: "definition",
		value: "not closed",
	});
	expect(readingDefinitionChange("open", "")).toEqual({
		kind: "Retract",
		aspect: "definition",
	});
	expect(readingDefinitionChange("open", "open")).toBeNull();
});
