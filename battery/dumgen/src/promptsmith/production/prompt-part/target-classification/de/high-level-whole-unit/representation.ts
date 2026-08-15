import { codecBuilder4 } from "codec-builder-library/v4";
import { z } from "zod";

import { stableJson } from "../../../../../../lib/stable-json";
import type { PromptRepresentationAdapter } from "../../../../../assembly";
import {
	canonicalInputSchema,
	canonicalOutputSchema,
	canonicalTargetSchema,
	GERMAN_HIGH_LEVEL_TARGET_CLASSIFICATION_ROUTES,
} from "./corpus/schemas";

const REPRESENTATION_IDS = ["additional-compact-indices"] as const;

export type RepresentationId = (typeof REPRESENTATION_IDS)[number];

const TARGET_OPEN = "<target>";
const TARGET_CLOSE = "</target>";

function escapeXmlText(text: string): string {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");
}

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
type CanonicalTarget = z.output<typeof canonicalTargetSchema>;
type ClassificationInput = z.output<typeof classificationInputSchema>;

export type ClassificationProjection = Readonly<{
	input: ClassificationInput;
	compactToOriginal: readonly number[];
	originalToCompact: ReadonlyMap<number, number>;
}>;

export function projectClassificationInput(
	input: CanonicalInput,
): ClassificationProjection {
	const canonicalInput = canonicalInputSchema.parse(input);
	const markedSentence = canonicalInput.segments
		.map((segment, originalIndex) =>
			originalIndex === canonicalInput.clickedSegmentIndex
				? `${TARGET_OPEN}${escapeXmlText(segment.text)}${TARGET_CLOSE}`
				: escapeXmlText(segment.text),
		)
		.join("");
	const segments: ClassificationInput["segments"] = [];
	const compactToOriginal: number[] = [];
	const originalToCompact = new Map<number, number>();
	for (const [originalIndex, segment] of canonicalInput.segments.entries()) {
		if (segment.kind === "Whitespace") continue;
		const compactIndex = compactToOriginal.length;
		compactToOriginal.push(originalIndex);
		originalToCompact.set(originalIndex, compactIndex);
		if (segment.kind === "ResolvableText") {
			segments.push({ s: segment.text, i: compactIndex });
		}
	}
	const clickedIndex = originalToCompact.get(
		canonicalInput.clickedSegmentIndex,
	);
	if (clickedIndex === undefined) {
		throw new Error(
			"The clicked canonical segment is not a ResolvableText candidate.",
		);
	}
	return Object.freeze({
		input: classificationInputSchema.parse({
			markedSentence,
			segments,
			clickedIndex,
		}),
		compactToOriginal: Object.freeze(compactToOriginal),
		originalToCompact,
	});
}

function canonicalTargetFromAdditionalMembers(args: {
	canonicalInput: CanonicalInput;
	privateInput: ClassificationInput;
	projection: ClassificationProjection;
	route: z.output<typeof classificationTargetSchema>;
	additionalMemberIndices: readonly number[];
}): CanonicalTarget {
	const additional = args.additionalMemberIndices;
	let previous = -1;
	for (const memberIndex of additional) {
		if (!Number.isSafeInteger(memberIndex) || memberIndex <= previous) {
			throw new Error(
				"Additional membership must be ordered and unique before click insertion.",
			);
		}
		previous = memberIndex;
	}
	if (additional.includes(args.privateInput.clickedIndex)) {
		throw new Error(
			"Additional membership must exclude the clicked index.",
		);
	}
	const memberIndices = [
		args.privateInput.clickedIndex,
		...additional,
	].toSorted((left, right) => left - right);
	const originalMembers = memberIndices.map((memberIndex) => {
		const originalIndex = args.projection.compactToOriginal[memberIndex];
		if (
			originalIndex === undefined ||
			args.canonicalInput.segments[originalIndex]?.kind !==
				"ResolvableText"
		) {
			throw new Error("Membership must reference ResolvableText.");
		}
		return originalIndex;
	});
	return canonicalTargetSchema.parse({
		...args.route,
		memberSegmentIndices: originalMembers,
	});
}

function additionalMembersFromCanonicalTarget(args: {
	canonicalInput: CanonicalInput;
	privateInput: ClassificationInput;
	projection: ClassificationProjection;
	target: CanonicalTarget;
}) {
	const compactMembers = args.target.memberSegmentIndices.map(
		(originalIndex) => {
			if (
				args.canonicalInput.segments[originalIndex]?.kind !==
				"ResolvableText"
			) {
				throw new Error(
					`Canonical member ${originalIndex} must reference ResolvableText.`,
				);
			}
			const compactIndex =
				args.projection.originalToCompact.get(originalIndex);
			if (compactIndex === undefined) {
				throw new Error(
					`Canonical member ${originalIndex} was removed by compaction.`,
				);
			}
			return compactIndex;
		},
	);
	let previous = -1;
	for (const memberIndex of compactMembers) {
		if (memberIndex <= previous) {
			throw new Error("Canonical membership must be ordered and unique.");
		}
		previous = memberIndex;
	}
	if (!compactMembers.includes(args.privateInput.clickedIndex)) {
		throw new Error(
			"Canonical membership must include the clicked member.",
		);
	}
	return compactMembers.filter(
		(memberIndex) => memberIndex !== args.privateInput.clickedIndex,
	);
}

const unresolvedCanonicalToPrivateCodec = codecBuilder4.buildFixedFieldsCodec(
	unresolvedAdditionalIndicesOutputSchema,
	{
		target: null,
		additionalMemberIndices: null,
	},
);

function buildAdditionalIndicesOutputCodec(
	canonicalInput: CanonicalInput,
	privateInput: ClassificationInput,
) {
	const projection = projectClassificationInput(canonicalInput);
	if (stableJson(projection.input) !== stableJson(privateInput)) {
		throw new Error(
			"Private input is not the canonical input's classification projection.",
		);
	}

	const extractRouteCodec = codecBuilder4.buildReshapeCodec(
		resolvedAdditionalIndicesOutputSchema,
		{
			fieldName: "route",
			fieldSchema: classificationTargetSchema,
			dropFields: ["target"],
			construct: (input) => input.target,
			reconstruct: (route) => ({ target: route }),
		},
	);
	const restoreCanonicalTargetCodec = codecBuilder4.buildReshapeCodec(
		extractRouteCodec.out,
		{
			fieldName: "target",
			fieldSchema: canonicalTargetSchema,
			dropFields: ["route", "additionalMemberIndices"],
			construct: (input) =>
				canonicalTargetFromAdditionalMembers({
					canonicalInput,
					privateInput,
					projection,
					route: input.route,
					additionalMemberIndices: input.additionalMemberIndices,
				}),
			reconstruct: (target) => ({
				route: classificationTargetSchema.parse({
					family: target.family,
					kind: target.kind,
				}),
				additionalMemberIndices: additionalMembersFromCanonicalTarget({
					canonicalInput,
					privateInput,
					projection,
					target,
				}),
			}),
		},
	);
	const resolvedCodec = codecBuilder4.helpers.pipeCodecs(
		extractRouteCodec,
		restoreCanonicalTargetCodec,
	);

	return z.codec(additionalIndicesOutputSchema, canonicalOutputSchema, {
		decode: (output) =>
			output.decision === "Resolved"
				? resolvedCodec.decode(
						resolvedAdditionalIndicesOutputSchema.parse(output),
					)
				: unresolvedCanonicalToPrivateCodec.encode(
						unresolvedAdditionalIndicesOutputSchema.parse(output),
					),
		encode: (canonical) =>
			canonical.decision === "Resolved"
				? resolvedCodec.encode(canonical)
				: unresolvedCanonicalToPrivateCodec.decode(canonical),
	});
}

type AdditionalOutput = z.output<typeof additionalIndicesOutputSchema>;

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
