import { describe, expect, test } from "bun:test";

import { grammaticalResolutionMarkedContextSchema } from "../../src/promptsmith/assembly";

describe("Grammatical Resolution marked-context preflight", () => {
	test.each([
		"Ein <TARGET>Wort</TARGET>.",
		"<TARGET>Guten</TARGET> <TARGET>Morgen</TARGET>!",
		"Sie bringt es <TARGET>in</TARGET> <TARGET>Gang</TARGET>.",
		"Das <TARGET>E-Mail</TARGET> kommt an.",
	])("accepts exact word-like TARGET members: %s", (markedContext) => {
		expect(
			grammaticalResolutionMarkedContextSchema.safeParse(markedContext)
				.success,
		).toBe(true);
	});

	test.each([
		"Kein markiertes Mitglied.",
		"Ein <TARGET>offenes Mitglied.",
		"Ein </TARGET>verkehrtes<TARGET> Mitglied.",
		"<TARGET><TARGET>verschachtelt</TARGET></TARGET>",
		"<TARGET>zwei Wörter</TARGET>",
		"<TARGET>!</TARGET>",
		"<TARGET>foo!</TARGET>",
		"<TARGET>a/b</TARGET>",
		"<TARGET>.x</TARGET>",
		"<TARGET>🙂Wort</TARGET>",
		"<TARGET class=x>Wort</TARGET>",
	])("rejects mechanically invalid TARGET markup: %s", (markedContext) => {
		expect(
			grammaticalResolutionMarkedContextSchema.safeParse(markedContext)
				.success,
		).toBe(false);
	});
});
