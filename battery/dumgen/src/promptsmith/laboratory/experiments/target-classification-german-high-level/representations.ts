import { z } from "zod";

import { stableJson } from "../../../../lib/stable-json";
import { GERMAN_REACHABLE_HIGH_LEVEL_ROUTES } from "../../../../schema/german-high-level-routes";
import type { PromptRepresentationAdapter } from "../../../assembly";
import {
	canonicalInputSchema,
	canonicalOutputSchema,
} from "../../canonical-classification-corpus/target-classification/de/high-level-whole-unit/schemas";

export const REPRESENTATION_IDS = [
	"full-compact-indices",
	"additional-compact-indices",
	"fixed-length-mask",
] as const;

export type RepresentationId = (typeof REPRESENTATION_IDS)[number];

export const compactInputSchema = z
	.strictObject({
		clickedCompactIndex: z.number().int().nonnegative(),
		segments: z
			.array(
				z.strictObject({
					compactIndex: z.number().int().nonnegative(),
					clicked: z.boolean(),
					kind: z.enum([
						"ResolvableText",
						"OpaqueText",
						"Punctuation",
					]),
					text: z.string().min(1),
				}),
			)
			.min(1),
	})
	.superRefine((input, context) => {
		const clickedSegments = input.segments.filter(({ clicked }) => clicked);
		for (const [arrayIndex, segment] of input.segments.entries()) {
			if (segment.compactIndex !== arrayIndex) {
				context.addIssue({
					code: "custom",
					path: ["segments", arrayIndex, "compactIndex"],
					message:
						"compactIndex must equal the segment's array position.",
				});
			}
		}
		if (clickedSegments.length !== 1) {
			context.addIssue({
				code: "custom",
				path: ["segments"],
				message: "Exactly one compact segment must be clicked.",
			});
			return;
		}
		const clickedSegment = clickedSegments[0];
		if (clickedSegment?.compactIndex !== input.clickedCompactIndex) {
			context.addIssue({
				code: "custom",
				path: ["clickedCompactIndex"],
				message:
					"clickedCompactIndex must identify the segment marked clicked.",
			});
		}
		if (clickedSegment?.kind !== "ResolvableText") {
			context.addIssue({
				code: "custom",
				path: ["segments", clickedSegment?.compactIndex ?? 0, "kind"],
				message: "The clicked compact segment must be ResolvableText.",
			});
		}
	});

const routeTarget = <Membership extends z.ZodType>(membership: Membership) =>
	z.discriminatedUnion("family", [
		z.strictObject({
			family: z.literal("Lexeme"),
			kind: z.enum(GERMAN_REACHABLE_HIGH_LEVEL_ROUTES.Lexeme),
			membership,
		}),
		z.strictObject({
			family: z.literal("Phraseme"),
			kind: z.enum(GERMAN_REACHABLE_HIGH_LEVEL_ROUTES.Phraseme),
			membership,
		}),
		z.strictObject({
			family: z.literal("Construction"),
			kind: z.enum(GERMAN_REACHABLE_HIGH_LEVEL_ROUTES.Construction),
			membership,
		}),
	]);

const privateOutput = <Membership extends z.ZodType>(membership: Membership) =>
	z
		.strictObject({
			decision: z.enum(["Resolved", "Unresolved"]),
			target: routeTarget(membership).nullable(),
		})
		.superRefine((output, context) => {
			if ((output.decision === "Resolved") !== (output.target !== null)) {
				context.addIssue({
					code: "custom",
					message:
						"Resolved requires target; Unresolved requires target null.",
				});
			}
		});

const compactIndexArray = z.array(z.number().int().nonnegative());

export const fullCompactIndicesOutputSchema = privateOutput(
	z.strictObject({ memberCompactIndices: compactIndexArray.min(1) }),
);

export const additionalCompactIndicesOutputSchema = privateOutput(
	z.strictObject({ additionalMemberCompactIndices: compactIndexArray }),
);

export const fixedLengthMaskOutputSchema = privateOutput(
	z.strictObject({ memberMask: z.array(z.boolean()).min(1) }),
);

type CanonicalInput = z.output<typeof canonicalInputSchema>;
type CanonicalOutput = z.output<typeof canonicalOutputSchema>;
type CompactInput = z.output<typeof compactInputSchema>;

export type CompactProjection = Readonly<{
	input: CompactInput;
	compactToOriginal: readonly number[];
	originalToCompact: ReadonlyMap<number, number>;
}>;

export function projectCompactInput(input: CanonicalInput): CompactProjection {
	const segments: CompactInput["segments"] = [];
	const compactToOriginal: number[] = [];
	const originalToCompact = new Map<number, number>();
	for (const [originalIndex, segment] of input.segments.entries()) {
		if (segment.kind === "Whitespace") continue;
		const compactIndex = segments.length;
		segments.push({
			compactIndex,
			clicked: originalIndex === input.clickedSegmentIndex,
			kind: segment.kind,
			text: segment.text,
		});
		compactToOriginal.push(originalIndex);
		originalToCompact.set(originalIndex, compactIndex);
	}
	const clickedCompactIndex = originalToCompact.get(
		input.clickedSegmentIndex,
	);
	if (clickedCompactIndex === undefined) {
		throw new Error(
			"The clicked canonical segment was removed by compaction.",
		);
	}
	return Object.freeze({
		input: compactInputSchema.parse({ clickedCompactIndex, segments }),
		compactToOriginal: Object.freeze(compactToOriginal),
		originalToCompact,
	});
}

function compactIdealMembers(
	input: CanonicalInput,
	output: CanonicalOutput,
): readonly number[] {
	if (output.decision === "Unresolved") return [];
	const projection = projectCompactInput(input);
	return output.target.memberSegmentIndices.map((originalIndex) => {
		const compactIndex = projection.originalToCompact.get(originalIndex);
		if (compactIndex === undefined) {
			throw new Error(
				`Canonical member ${originalIndex} was removed by compaction.`,
			);
		}
		return compactIndex;
	});
}

function privateRoute(
	output: Extract<CanonicalOutput, { decision: "Resolved" }>,
) {
	return { family: output.target.family, kind: output.target.kind } as const;
}

function canonicalizeMembership(args: {
	canonicalInput: CanonicalInput;
	privateInput: CompactInput;
	family: "Lexeme" | "Phraseme" | "Construction";
	kind: string;
	compactMembers: readonly number[];
}): CanonicalOutput {
	const projection = projectCompactInput(args.canonicalInput);
	if (stableJson(projection.input) !== stableJson(args.privateInput)) {
		throw new Error(
			"Private input is not the canonical input's compact projection.",
		);
	}
	if (args.compactMembers.length === 0) {
		throw new Error("Resolved compact membership must be non-empty.");
	}
	let previous = -1;
	const originalMembers = args.compactMembers.map((compactIndex) => {
		if (!Number.isSafeInteger(compactIndex) || compactIndex <= previous) {
			throw new Error("Compact membership must be ordered and unique.");
		}
		previous = compactIndex;
		const originalIndex = projection.compactToOriginal[compactIndex];
		if (
			originalIndex === undefined ||
			args.canonicalInput.segments[originalIndex]?.kind !==
				"ResolvableText"
		) {
			throw new Error(
				"Compact membership must reference ResolvableText.",
			);
		}
		return originalIndex;
	});
	if (!args.compactMembers.includes(args.privateInput.clickedCompactIndex)) {
		throw new Error("Compact membership must include the clicked member.");
	}
	return canonicalOutputForRoute({
		family: args.family,
		kind: args.kind,
		memberSegmentIndices: originalMembers,
	});
}

function canonicalOutputForRoute(args: {
	family: "Lexeme" | "Phraseme" | "Construction";
	kind: string;
	memberSegmentIndices: readonly number[];
}): CanonicalOutput {
	return canonicalOutputSchema.parse({
		decision: "Resolved",
		target: {
			family: args.family,
			kind: args.kind,
			memberSegmentIndices: [...args.memberSegmentIndices],
		},
	});
}

type FullOutput = z.output<typeof fullCompactIndicesOutputSchema>;
type AdditionalOutput = z.output<typeof additionalCompactIndicesOutputSchema>;
type MaskOutput = z.output<typeof fixedLengthMaskOutputSchema>;

export const fullCompactIndicesAdapter = {
	materialize(goldenCase) {
		const input = projectCompactInput(goldenCase.input).input;
		if (goldenCase.idealOutput.decision === "Unresolved") {
			return {
				input,
				idealOutput: fullCompactIndicesOutputSchema.parse({
					decision: "Unresolved",
					target: null,
				}),
			};
		}
		return {
			input,
			idealOutput: fullCompactIndicesOutputSchema.parse({
				decision: "Resolved" as const,
				target: {
					...privateRoute(goldenCase.idealOutput),
					membership: {
						memberCompactIndices: [
							...compactIdealMembers(
								goldenCase.input,
								goldenCase.idealOutput,
							),
						],
					},
				},
			}),
		};
	},
	canonicalize({ canonicalInput, privateInput, output }) {
		if (output.decision === "Unresolved") {
			return canonicalOutputSchema.parse({ decision: "Unresolved" });
		}
		if (output.target === null) {
			throw new Error("Resolved output requires a target.");
		}
		return canonicalizeMembership({
			canonicalInput,
			privateInput,
			family: output.target.family,
			kind: output.target.kind,
			compactMembers: output.target.membership.memberCompactIndices,
		});
	},
} satisfies PromptRepresentationAdapter<
	typeof canonicalInputSchema,
	typeof canonicalOutputSchema,
	typeof compactInputSchema,
	typeof fullCompactIndicesOutputSchema
>;

export const additionalCompactIndicesAdapter = {
	materialize(goldenCase) {
		const input = projectCompactInput(goldenCase.input).input;
		if (goldenCase.idealOutput.decision === "Unresolved") {
			return {
				input,
				idealOutput: additionalCompactIndicesOutputSchema.parse({
					decision: "Unresolved",
					target: null,
				}),
			};
		}
		const members = compactIdealMembers(
			goldenCase.input,
			goldenCase.idealOutput,
		);
		return {
			input,
			idealOutput: additionalCompactIndicesOutputSchema.parse({
				decision: "Resolved" as const,
				target: {
					...privateRoute(goldenCase.idealOutput),
					membership: {
						additionalMemberCompactIndices: members.filter(
							(index) => index !== input.clickedCompactIndex,
						),
					},
				},
			}),
		};
	},
	canonicalize({ canonicalInput, privateInput, output }) {
		if (output.decision === "Unresolved") {
			return canonicalOutputSchema.parse({ decision: "Unresolved" });
		}
		if (output.target === null) {
			throw new Error("Resolved output requires a target.");
		}
		const additional =
			output.target.membership.additionalMemberCompactIndices;
		let previous = -1;
		for (const compactIndex of additional) {
			if (
				!Number.isSafeInteger(compactIndex) ||
				compactIndex <= previous
			) {
				throw new Error(
					"Additional membership must be ordered and unique before click insertion.",
				);
			}
			previous = compactIndex;
		}
		if (additional.includes(privateInput.clickedCompactIndex)) {
			throw new Error(
				"Additional membership must exclude the clicked index.",
			);
		}
		return canonicalizeMembership({
			canonicalInput,
			privateInput,
			family: output.target.family,
			kind: output.target.kind,
			compactMembers: [
				privateInput.clickedCompactIndex,
				...additional,
			].toSorted((a, b) => a - b),
		});
	},
} satisfies PromptRepresentationAdapter<
	typeof canonicalInputSchema,
	typeof canonicalOutputSchema,
	typeof compactInputSchema,
	typeof additionalCompactIndicesOutputSchema
>;

export const fixedLengthMaskAdapter = {
	materialize(goldenCase) {
		const input = projectCompactInput(goldenCase.input).input;
		if (goldenCase.idealOutput.decision === "Unresolved") {
			return {
				input,
				idealOutput: fixedLengthMaskOutputSchema.parse({
					decision: "Unresolved",
					target: null,
				}),
			};
		}
		const members = new Set(
			compactIdealMembers(goldenCase.input, goldenCase.idealOutput),
		);
		return {
			input,
			idealOutput: fixedLengthMaskOutputSchema.parse({
				decision: "Resolved" as const,
				target: {
					...privateRoute(goldenCase.idealOutput),
					membership: {
						memberMask: input.segments.map((_, index) =>
							members.has(index),
						),
					},
				},
			}),
		};
	},
	canonicalize({ canonicalInput, privateInput, output }) {
		if (output.decision === "Unresolved") {
			return canonicalOutputSchema.parse({ decision: "Unresolved" });
		}
		if (output.target === null) {
			throw new Error("Resolved output requires a target.");
		}
		const mask = output.target.membership.memberMask;
		if (mask.length !== privateInput.segments.length) {
			throw new Error(
				"Member mask length must equal compact segment length.",
			);
		}
		return canonicalizeMembership({
			canonicalInput,
			privateInput,
			family: output.target.family,
			kind: output.target.kind,
			compactMembers: mask.flatMap((member, index) =>
				member ? [index] : [],
			),
		});
	},
} satisfies PromptRepresentationAdapter<
	typeof canonicalInputSchema,
	typeof canonicalOutputSchema,
	typeof compactInputSchema,
	typeof fixedLengthMaskOutputSchema
>;

export type RepresentationArm =
	| Readonly<{
			id: "full-compact-indices";
			outputSchema: typeof fullCompactIndicesOutputSchema;
			adapter: typeof fullCompactIndicesAdapter;
	  }>
	| Readonly<{
			id: "additional-compact-indices";
			outputSchema: typeof additionalCompactIndicesOutputSchema;
			adapter: typeof additionalCompactIndicesAdapter;
	  }>
	| Readonly<{
			id: "fixed-length-mask";
			outputSchema: typeof fixedLengthMaskOutputSchema;
			adapter: typeof fixedLengthMaskAdapter;
	  }>;

export const representationArms: readonly RepresentationArm[] = Object.freeze([
	{
		id: "full-compact-indices",
		outputSchema: fullCompactIndicesOutputSchema,
		adapter: fullCompactIndicesAdapter,
	},
	{
		id: "additional-compact-indices",
		outputSchema: additionalCompactIndicesOutputSchema,
		adapter: additionalCompactIndicesAdapter,
	},
	{
		id: "fixed-length-mask",
		outputSchema: fixedLengthMaskOutputSchema,
		adapter: fixedLengthMaskAdapter,
	},
]);

export type AnyPrivateOutput = FullOutput | AdditionalOutput | MaskOutput;

export function materializeRepresentation(
	id: RepresentationId,
	goldenCase: {
		readonly input: CanonicalInput;
		readonly idealOutput: CanonicalOutput;
		readonly explanation?: string;
		readonly contaminationKeys?: readonly string[];
	},
): { readonly input: CompactInput; readonly idealOutput: AnyPrivateOutput } {
	switch (id) {
		case "full-compact-indices":
			return fullCompactIndicesAdapter.materialize(goldenCase);
		case "additional-compact-indices":
			return additionalCompactIndicesAdapter.materialize(goldenCase);
		case "fixed-length-mask":
			return fixedLengthMaskAdapter.materialize(goldenCase);
	}
}

export function parseAndCanonicalizeRepresentation(args: {
	readonly id: RepresentationId;
	readonly canonicalInput: CanonicalInput;
	readonly privateInput: CompactInput;
	readonly output: unknown;
}): CanonicalOutput {
	switch (args.id) {
		case "full-compact-indices":
			return fullCompactIndicesAdapter.canonicalize({
				...args,
				output: fullCompactIndicesOutputSchema.parse(args.output),
			});
		case "additional-compact-indices":
			return additionalCompactIndicesAdapter.canonicalize({
				...args,
				output: additionalCompactIndicesOutputSchema.parse(args.output),
			});
		case "fixed-length-mask":
			return fixedLengthMaskAdapter.canonicalize({
				...args,
				output: fixedLengthMaskOutputSchema.parse(args.output),
			});
	}
}

export function outputSchemaForRepresentation(id: RepresentationId) {
	switch (id) {
		case "full-compact-indices":
			return fullCompactIndicesOutputSchema;
		case "additional-compact-indices":
			return additionalCompactIndicesOutputSchema;
		case "fixed-length-mask":
			return fixedLengthMaskOutputSchema;
	}
}

const postconditionCanonicalInput = canonicalInputSchema.parse({
	clickedSegmentIndex: 2,
	segments: [
		{ kind: "ResolvableText", text: "Pass" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "auf" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "auf" },
		{ kind: "Punctuation", text: "." },
	],
});

const postconditionCanonicalOutput = canonicalOutputSchema.parse({
	decision: "Resolved",
	target: {
		family: "Lexeme",
		kind: "VERB",
		memberSegmentIndices: [0, 2, 4],
	},
});

export const ADAPTER_POSTCONDITION_FIXTURES = Object.freeze({
	version: "target-classification-adapter-postconditions-v1",
	canonicalInput: postconditionCanonicalInput,
	privateInput: projectCompactInput(postconditionCanonicalInput).input,
	canonicalOutput: postconditionCanonicalOutput,
	arms: Object.freeze({
		"full-compact-indices": Object.freeze({
			validOutput: {
				decision: "Resolved",
				target: {
					family: "Lexeme",
					kind: "VERB",
					membership: { memberCompactIndices: [0, 1, 2] },
				},
			},
			invalidOutputs: Object.freeze([
				Object.freeze({
					name: "unordered-members",
					output: {
						decision: "Resolved",
						target: {
							family: "Lexeme",
							kind: "VERB",
							membership: { memberCompactIndices: [2, 1, 0] },
						},
					},
					expectedError: "ordered and unique",
				}),
			]),
		}),
		"additional-compact-indices": Object.freeze({
			validOutput: {
				decision: "Resolved",
				target: {
					family: "Lexeme",
					kind: "VERB",
					membership: { additionalMemberCompactIndices: [0, 2] },
				},
			},
			invalidOutputs: Object.freeze([
				Object.freeze({
					name: "unordered-additional-members",
					output: {
						decision: "Resolved",
						target: {
							family: "Lexeme",
							kind: "VERB",
							membership: {
								additionalMemberCompactIndices: [2, 0],
							},
						},
					},
					expectedError: "ordered and unique before click insertion",
				}),
				Object.freeze({
					name: "duplicate-additional-members",
					output: {
						decision: "Resolved",
						target: {
							family: "Lexeme",
							kind: "VERB",
							membership: {
								additionalMemberCompactIndices: [0, 0],
							},
						},
					},
					expectedError: "ordered and unique before click insertion",
				}),
			]),
		}),
		"fixed-length-mask": Object.freeze({
			validOutput: {
				decision: "Resolved",
				target: {
					family: "Lexeme",
					kind: "VERB",
					membership: { memberMask: [true, true, true, false] },
				},
			},
			invalidOutputs: Object.freeze([
				Object.freeze({
					name: "wrong-mask-length",
					output: {
						decision: "Resolved",
						target: {
							family: "Lexeme",
							kind: "VERB",
							membership: { memberMask: [true] },
						},
					},
					expectedError: "mask length",
				}),
			]),
		}),
	}),
});

export function proveAdapterPostconditions(id: RepresentationId) {
	const fixture = ADAPTER_POSTCONDITION_FIXTURES.arms[id];
	const canonicalized = parseAndCanonicalizeRepresentation({
		id,
		canonicalInput: ADAPTER_POSTCONDITION_FIXTURES.canonicalInput,
		privateInput: ADAPTER_POSTCONDITION_FIXTURES.privateInput,
		output: fixture.validOutput,
	});
	if (
		stableJson(canonicalized) !==
		stableJson(ADAPTER_POSTCONDITION_FIXTURES.canonicalOutput)
	) {
		throw new Error(
			`${id} valid postcondition fixture did not round-trip.`,
		);
	}
	const invalidResults = fixture.invalidOutputs.map((invalid) => {
		try {
			parseAndCanonicalizeRepresentation({
				id,
				canonicalInput: ADAPTER_POSTCONDITION_FIXTURES.canonicalInput,
				privateInput: ADAPTER_POSTCONDITION_FIXTURES.privateInput,
				output: invalid.output,
			});
		} catch (cause) {
			const message =
				cause instanceof Error ? cause.message : String(cause);
			if (message.includes(invalid.expectedError)) {
				return Object.freeze({
					name: invalid.name,
					expectedError: message,
				});
			}
			throw new Error(
				`${id}/${invalid.name} failed with unexpected error: ${message}`,
			);
		}
		throw new Error(`${id}/${invalid.name} unexpectedly passed.`);
	});
	return Object.freeze({
		version: ADAPTER_POSTCONDITION_FIXTURES.version,
		id,
		canonicalInput: ADAPTER_POSTCONDITION_FIXTURES.canonicalInput,
		privateInput: ADAPTER_POSTCONDITION_FIXTURES.privateInput,
		validOutput: fixture.validOutput,
		canonicalized,
		invalidResults: Object.freeze(invalidResults),
	});
}
