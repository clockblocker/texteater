import type { output } from "zod";

import type { canonicalInputSchema, canonicalOutputSchema } from "./schemas";

type Input = output<typeof canonicalInputSchema>;
type CanonicalOutput = output<typeof canonicalOutputSchema>;

export type MembershipValidation = {
	readonly pass: boolean;
	readonly nonEmptyPass: boolean;
	readonly integerPass: boolean;
	readonly boundsPass: boolean;
	readonly resolvableTextPass: boolean;
	readonly orderPass: boolean;
	readonly uniquenessPass: boolean;
	readonly clickInclusionPass: boolean;
};

export function validateOriginalIndexMembership(
	input: Input,
	memberSegmentIndices: readonly number[],
): MembershipValidation {
	const nonEmptyPass = memberSegmentIndices.length > 0;
	const integerPass = memberSegmentIndices.every(Number.isInteger);
	const boundsPass = memberSegmentIndices.every(
		(index) => index >= 0 && index < input.segments.length,
	);
	const resolvableTextPass = memberSegmentIndices.every(
		(index) => input.segments[index]?.kind === "ResolvableText",
	);
	const orderPass = memberSegmentIndices.every(
		(index, position) =>
			position === 0 ||
			index > (memberSegmentIndices[position - 1] ?? -1),
	);
	const uniquenessPass =
		new Set(memberSegmentIndices).size === memberSegmentIndices.length;
	const clickInclusionPass =
		memberSegmentIndices.filter(
			(index) => index === input.clickedSegmentIndex,
		).length === 1;
	return Object.freeze({
		pass:
			nonEmptyPass &&
			integerPass &&
			boundsPass &&
			resolvableTextPass &&
			orderPass &&
			uniquenessPass &&
			clickInclusionPass,
		nonEmptyPass,
		integerPass,
		boundsPass,
		resolvableTextPass,
		orderPass,
		uniquenessPass,
		clickInclusionPass,
	});
}

export function assertCanonicalTargetClassificationCase(args: {
	readonly caseId: string;
	readonly input: Input;
	readonly idealOutput: CanonicalOutput;
}): void {
	if (args.idealOutput.decision === "Unresolved") {
		return;
	}
	const result = validateOriginalIndexMembership(
		args.input,
		args.idealOutput.target.memberSegmentIndices,
	);
	if (!result.pass) {
		throw new Error(
			`Canonical Target Classification case "${args.caseId}" has invalid original-index membership: ${JSON.stringify(result)}.`,
		);
	}
}
