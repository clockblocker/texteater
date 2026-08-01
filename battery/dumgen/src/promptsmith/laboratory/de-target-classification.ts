import { z } from "zod";

import type { AnalysisTarget, Unresolved } from "../../types";
import type { Prompt } from "../prompt-definition";
import { GERMAN_HIGH_LEVEL_ROUTES, isGermanHighLevelRoute } from "./de-routes";

const segmentKindSchema = z.enum([
	"ResolvableText",
	"OpaqueText",
	"Whitespace",
	"Punctuation",
]);

const inputSchema = z
	.strictObject({
		clickedSegmentIndex: z.number().int().nonnegative(),
		segments: z
			.array(
				z.strictObject({
					kind: segmentKindSchema,
					text: z.string().min(1),
				}),
			)
			.min(1),
	})
	.superRefine((input, context) => {
		if (
			input.segments[input.clickedSegmentIndex]?.kind !== "ResolvableText"
		) {
			context.addIssue({
				code: "custom",
				path: ["clickedSegmentIndex"],
				message: "The clicked index must reference ResolvableText.",
			});
		}
	});

const resolvedTargetSchema = z.strictObject({
	memberSegmentIndices: z.array(z.number().int().nonnegative()).min(1),
	family: z.enum(
		Object.keys(GERMAN_HIGH_LEVEL_ROUTES) as [
			keyof typeof GERMAN_HIGH_LEVEL_ROUTES,
			...(keyof typeof GERMAN_HIGH_LEVEL_ROUTES)[],
		],
	),
	kind: z.string().min(1),
});
const outputSchema = z.strictObject({
	decision: z.enum(["Resolved", "Unresolved"]),
	target: resolvedTargetSchema.nullable(),
});

export const deHighLevelWholeUnitTargetPrompt = {
	systemPrompt: `You apply the German HighLevelWholeUnit target policy in a
hands-on linguistic laboratory.

The clicked index is an array position. If it is ResolvableText, return exactly
one resolved grammatical unit containing it. Return ordered unique member
indices referencing only ResolvableText. Include all members of a defensible
conventionalized whole: an aphorism, discourse formula such as Guten Morgen,
idiom, proverb, or all lexical members of a phrasal or separable verb. A
multi-member German verb remains Lexeme/VERB. Otherwise select only the clicked
orthographic word and classify its German Lexeme kind.

Construction routes are available only when the clicked material itself is a
Fusion or PairedFrame construction. Never classify a Morpheme under this
policy. Never return candidates, competing levels, confidence, or explanation.
Return Unresolved only when the ResolvableText promise cannot be fulfilled.`,
	inputSchema,
	outputSchema,
	outputPostcondition: {
		assert(input, generated) {
			if (generated.decision === "Unresolved") return;
			if (generated.target === null) {
				throw new Error(
					"Resolved target classification requires a target.",
				);
			}
			if (
				!isGermanHighLevelRoute(
					generated.target.family,
					generated.target.kind,
				)
			) {
				throw new Error(
					"Target must select a reachable German high-level route.",
				);
			}
			const indices = generated.target.memberSegmentIndices;
			if (!indices.includes(input.clickedSegmentIndex)) {
				throw new Error(
					"Target members must include the clicked Segment.",
				);
			}
			for (let position = 0; position < indices.length; position += 1) {
				const index = indices[position];
				if (
					index === undefined ||
					input.segments[index]?.kind !== "ResolvableText"
				) {
					throw new Error(
						"Target members must reference ResolvableText.",
					);
				}
				if (position > 0 && (indices[position - 1] ?? index) >= index) {
					throw new Error(
						"Target members must be ordered and unique.",
					);
				}
			}
		},
	},
	projectOutput(
		_input: z.output<typeof inputSchema>,
		generated: z.output<typeof outputSchema>,
	): AnalysisTarget | Unresolved {
		if (generated.decision === "Unresolved") {
			return { decision: "Unresolved" };
		}
		if (generated.target === null) {
			throw new Error(
				"Resolved target classification requires a target.",
			);
		}
		return {
			memberSegmentIndices: generated.target.memberSegmentIndices,
			family: generated.target.family,
			kind: generated.target.kind,
		} as AnalysisTarget;
	},
	generationParams: { model: "gpt-5-nano", maxOutputTokens: 1024 },
} satisfies Prompt<
	typeof inputSchema,
	typeof outputSchema,
	AnalysisTarget | Unresolved
>;
