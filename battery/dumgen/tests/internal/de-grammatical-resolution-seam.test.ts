import { describe, expect, test } from "bun:test";
import { z } from "zod";

import {
	createDeGrammaticalResolutionPrompt,
	grammaticalResolutionInputSchema,
	type NormalizedSurfaceProjector,
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
const modernPhrasemeOutputSchema = modernOutputSchema.extend({
	realizationCoverage: z.enum(["Full", "Partial"]).optional(),
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

describe("German Grammatical Resolution projection", () => {
	test("keeps the modern DTO flat and invokes the normalization projector exactly once", () => {
		const projectorCalls: Parameters<NormalizedSurfaceProjector>[0][] = [];
		const normalizedSurfaceProjector: NormalizedSurfaceProjector = (
			args,
		) => {
			projectorCalls.push(args);
			return "hooked-normalized-surface";
		};
		const prompt = createDeGrammaticalResolutionPrompt({
			family: "Construction",
			kind: "Fusion",
			systemPrompt: "test",
			inputSchema: grammaticalResolutionInputSchema,
			outputSchema: modernOutputSchema,
			normalizedSurfaceProjector,
		});
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

		expect(projectorCalls).toHaveLength(1);
		expect(projectorCalls[0]).toEqual({
			input,
			memberOrthographies: ["Standard"],
			normalizedMembers: ["im"],
			lemma: {
				language: "de",
				family: "Construction",
				kind: "Fusion",
				canonicalForm: "im",
				coreFeatures: {},
			},
			surface: {
				spelling: "Canonical",
				surfaceKind: "Citation",
				surfaceFeatures: null,
			},
		});
		expect(result.surface).toMatchObject({
			language: "de",
			normalizedSurface: "hooked-normalized-surface",
			lemma: projectorCalls[0]?.lemma,
		});
	});

	test("injects route identity, normalized Surface linkage, and Full coverage", () => {
		const prompt = fusionPrompt();
		const result = prompt.projectOutput(
			{ markedContext: "<TARGET>im</TARGET>", members: ["im"] },
			{
				memberOrthographies: ["Standard"],
				normalizedMembers: ["im"],
				lemma: { canonicalForm: "im" },
				surface: {
					spelling: "Canonical",
					surfaceFeatures: null,
				},
			},
		);

		expect(result).toMatchObject({
			realizationCoverage: "Full",
			surface: {
				language: "de",
				normalizedSurface: "im",
				lemma: {
					language: "de",
					family: "Construction",
					kind: "Fusion",
				},
			},
		});
	});

	test("preserves Phraseme coverage and rejects its omission", () => {
		const prompt = createDeGrammaticalResolutionPrompt({
			family: "Phraseme",
			kind: "Proverb",
			systemPrompt: "test",
			inputSchema: grammaticalResolutionInputSchema,
			outputSchema: modernPhrasemeOutputSchema,
		});
		const input = {
			markedContext: "<TARGET>Ende</TARGET> <TARGET>gut</TARGET>",
			members: ["Ende", "gut"],
		};
		const generated = {
			memberOrthographies: ["Standard" as const, "Standard" as const],
			normalizedMembers: ["Ende", "gut"],
			lemma: { canonicalForm: "Ende gut" },
			surface: { spelling: "Canonical" as const, surfaceFeatures: null },
		};

		expect(
			prompt.projectOutput(input, {
				...generated,
				realizationCoverage: "Partial",
			}),
		).toMatchObject({ realizationCoverage: "Partial" });
		expect(() => prompt.projectOutput(input, generated)).toThrow(
			/Phraseme.*realizationCoverage/,
		);
	});
});
