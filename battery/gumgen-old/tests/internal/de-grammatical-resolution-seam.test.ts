import { describe, expect, test } from "bun:test";
import { z } from "zod";

import {
	createDeGrammaticalResolutionPrompt,
	grammaticalResolutionInputSchema,
} from "../../src/catalog/laboratory/de-grammatical-resolution-seam";

const modernOutputSchema = z.strictObject({
	memberOrthographies: z.array(z.enum(["Standard", "Typo"])),
	normalizedMembers: z.array(z.string()),
	lemma: z.strictObject({
		canonicalForm: z.string(),
	}),
	surface: z.strictObject({
		spelling: z.enum(["Canonical", "Variant"]),
		surfaceFeatures: z.null(),
	}),
});
function fusionPrompt() {
	return createDeGrammaticalResolutionPrompt({
		family: "Construction",
		kind: "Fusion",
		systemPrompt: "test",
		inputSchema: grammaticalResolutionInputSchema,
		outputSchema: modernOutputSchema,
	});
}

describe("German Grammatical Resolution authoring adapter", () => {
	test("binds schema and codec linkage around the shared projection", () => {
		const prompt = fusionPrompt();
		const input = {
			markedContext: "<TARGET>im</TARGET>",
			members: ["im"],
		};
		const generated = {
			memberOrthographies: ["Standard" as const],
			normalizedMembers: ["im"],
			lemma: { canonicalForm: "im" },
			surface: { spelling: "Canonical" as const, surfaceFeatures: null },
		};

		expect(prompt.projectInput?.(input)).toEqual(input);
		expect(
			modernOutputSchema.safeParse({
				decision: "Resolved",
				resolution: generated,
			}).success,
		).toBe(false);
		const result = prompt.projectOutput(input, generated);

		expect(result).toEqual({
			memberOrthographies: ["Standard"],
			normalizedMembers: ["im"],
			realizationCoverage: "Full",
			surface: {
				language: "de",
				normalizedSurface: "im",
				spelling: "Canonical",
				surfaceFeatures: null,
				surfaceKind: "Citation",
				lemma: {
					canonicalForm: "im",
					coreFeatures: {},
					language: "de",
					family: "Construction",
					kind: "Fusion",
				},
			},
		});
	});
});
