import { z } from "zod";

import { stableJson } from "../../../../../../lib/stable-json";
import { createGermanHighLevelTargetClassificationProjection } from "../../../../../../target-classification/de/high-level-target-classification-projection";
import type { PromptRepresentationAdapter } from "../../../../../assembly";
import {
	canonicalInputSchema,
	canonicalOutputSchema,
	GERMAN_HIGH_LEVEL_TARGET_CLASSIFICATION_ROUTES,
} from "./corpus/schemas";

const REPRESENTATION_IDS = ["additional-compact-indices"] as const;

export type RepresentationId = (typeof REPRESENTATION_IDS)[number];

const TARGET_OPEN = "<target>";
const TARGET_CLOSE = "</target>";

export const classificationInputSchema = z
	.strictObject({
		markedSentence: z.string().min(1),
		segments: z
			.array(
				z.strictObject({
					s: z.string().min(1),
					i: z.number().int().nonnegative(),
				}),
			)
			.min(1),
		clickedIndex: z.number().int().nonnegative(),
	})
	.superRefine((input, context) => {
		let previousIndex = -1;
		for (const [position, segment] of input.segments.entries()) {
			if (segment.i <= previousIndex) {
				context.addIssue({
					code: "custom",
					path: ["segments", position, "i"],
					message:
						"Candidate indices must be strictly increasing and unique.",
				});
			}
			previousIndex = segment.i;
		}
		if (
			!input.segments.some((segment) => segment.i === input.clickedIndex)
		) {
			context.addIssue({
				code: "custom",
				path: ["clickedIndex"],
				message:
					"clickedIndex must equal the i of a candidate in segments.",
			});
		}
		const openingCount = input.markedSentence.split(TARGET_OPEN).length - 1;
		const closingCount =
			input.markedSentence.split(TARGET_CLOSE).length - 1;
		const openingIndex = input.markedSentence.indexOf(TARGET_OPEN);
		const closingIndex = input.markedSentence.indexOf(TARGET_CLOSE);
		if (
			openingCount !== 1 ||
			closingCount !== 1 ||
			closingIndex < openingIndex + TARGET_OPEN.length
		) {
			context.addIssue({
				code: "custom",
				path: ["markedSentence"],
				message:
					"markedSentence must contain exactly one non-empty <target>...</target> span.",
			});
		}
	});

const classificationTargetSchema = z.discriminatedUnion("family", [
	z.strictObject({
		family: z.literal("Lexeme"),
		kind: z.enum(GERMAN_HIGH_LEVEL_TARGET_CLASSIFICATION_ROUTES.Lexeme),
	}),
	z.strictObject({
		family: z.literal("Phraseme"),
		kind: z.enum(GERMAN_HIGH_LEVEL_TARGET_CLASSIFICATION_ROUTES.Phraseme),
	}),
	z.strictObject({
		family: z.literal("Construction"),
		kind: z.enum(
			GERMAN_HIGH_LEVEL_TARGET_CLASSIFICATION_ROUTES.Construction,
		),
	}),
]);

const memberIndexArray = z.array(z.number().int().nonnegative());

const resolvedAdditionalIndicesOutputSchema = z.strictObject({
	decision: z.literal("Resolved"),
	target: classificationTargetSchema,
	additionalMemberIndices: memberIndexArray,
});

const unresolvedAdditionalIndicesOutputSchema = z.strictObject({
	decision: z.literal("Unresolved"),
	target: z.null(),
	additionalMemberIndices: z.null(),
});

export const additionalIndicesOutputSchema = z
	.strictObject({
		decision: z.enum(["Resolved", "Unresolved"]),
		target: classificationTargetSchema.nullable(),
		additionalMemberIndices: memberIndexArray.nullable(),
	})
	.superRefine((output, context) => {
		const resolvedShape =
			output.target !== null && output.additionalMemberIndices !== null;
		if ((output.decision === "Resolved") !== resolvedShape) {
			context.addIssue({
				code: "custom",
				message:
					"Resolved requires a target and additionalMemberIndices array; Unresolved requires both fields null.",
			});
		}
	});

type CanonicalInput = z.output<typeof canonicalInputSchema>;
type CanonicalOutput = z.output<typeof canonicalOutputSchema>;
type ClassificationInput = z.output<typeof classificationInputSchema>;

export type ClassificationProjection = Readonly<{
	input: ClassificationInput;
}>;

export function projectClassificationInput(
	input: CanonicalInput,
): ClassificationProjection {
	const canonicalInput = canonicalInputSchema.parse(input);
	const projection =
		createGermanHighLevelTargetClassificationProjection(canonicalInput);
	return Object.freeze({
		input: classificationInputSchema.parse(projection.modelInput),
	});
}

function buildAdditionalIndicesOutputCodec(
	canonicalInput: CanonicalInput,
	privateInput: ClassificationInput,
) {
	const parsedCanonicalInput = canonicalInputSchema.parse(canonicalInput);
	const parsedPrivateInput = classificationInputSchema.parse(privateInput);
	const projection =
		createGermanHighLevelTargetClassificationProjection(
			parsedCanonicalInput,
		);
	if (stableJson(projection.modelInput) !== stableJson(parsedPrivateInput)) {
		throw new Error(
			"Private input is not the canonical input's classification projection.",
		);
	}

	return z.codec(additionalIndicesOutputSchema, canonicalOutputSchema, {
		decode: (output) => {
			const canonical = projection.canonicalize(
				output.decision === "Resolved"
					? resolvedAdditionalIndicesOutputSchema.parse(output)
					: unresolvedAdditionalIndicesOutputSchema.parse(output),
			);
			return canonicalOutputSchema.parse(
				"decision" in canonical
					? canonical
					: { decision: "Resolved" as const, target: canonical },
			);
		},
		encode: (canonical) =>
			additionalIndicesOutputSchema.parse(
				projection.materialize(
					canonical.decision === "Resolved"
						? canonical.target
						: canonical,
				),
			),
	});
}

type AdditionalOutput = z.output<typeof additionalIndicesOutputSchema>;

/**
 * The selected compact representation for the canonical target oracle. It
 * sends only the clicked candidate plus compact additional-member indices,
 * then reconstructs and validates ordered original Segment membership.
 */
export const additionalIndicesAdapter = {
	materialize(goldenCase) {
		const input = projectClassificationInput(goldenCase.input).input;
		return {
			input,
			idealOutput: buildAdditionalIndicesOutputCodec(
				goldenCase.input,
				input,
			).encode(goldenCase.idealOutput),
		};
	},
	canonicalize({ canonicalInput, privateInput, output }) {
		return buildAdditionalIndicesOutputCodec(
			canonicalInput,
			privateInput,
		).decode(output);
	},
} satisfies PromptRepresentationAdapter<
	typeof canonicalInputSchema,
	typeof canonicalOutputSchema,
	typeof classificationInputSchema,
	typeof additionalIndicesOutputSchema
>;

export function materializeRepresentation(
	_id: RepresentationId,
	goldenCase: {
		readonly input: CanonicalInput;
		readonly idealOutput: CanonicalOutput;
		readonly explanation?: string;
		readonly contaminationKeys?: readonly string[];
	},
): {
	readonly input: ClassificationInput;
	readonly idealOutput: AdditionalOutput;
} {
	return additionalIndicesAdapter.materialize(goldenCase);
}
