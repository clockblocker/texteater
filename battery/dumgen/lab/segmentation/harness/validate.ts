/**
 * Generic checks on a `segment.inUnits` answer, whatever produced it and
 * whatever the language: the Segments preserve the source, every unit names
 * valid Segments, and every ResolvableText Segment has exactly one owner.
 * A discontinuous unit and each component of a split written word (a
 * Fusion) are checked the same way: per Segment, not per written word.
 */
import type {
	SegmentInUnitsInput,
	SegmentInUnitsOutput,
} from "../../evaluation/spec-corpus/segment-in-units.js";

export type ValidationIssue =
	| { readonly kind: "SourceChanged"; readonly expected: string }
	| { readonly kind: "EmptyUnit"; readonly unit: number }
	| {
			readonly kind: "InvalidReference";
			readonly unit: number;
			readonly segment: number;
	  }
	| {
			readonly kind: "NotResolvable";
			readonly unit: number;
			readonly segment: number;
	  }
	| { readonly kind: "Unordered"; readonly unit: number }
	| { readonly kind: "Unowned"; readonly segment: number }
	| {
			readonly kind: "SharedOwner";
			readonly segment: number;
			readonly units: readonly number[];
	  };

/**
 * Every issue of `output` against `input`. `source`, when given, is the
 * text the Segments must spell exactly, whitespace and punctuation
 * included.
 */
export function validateUnits(
	input: SegmentInUnitsInput,
	output: SegmentInUnitsOutput,
	source?: string,
): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	const { segments } = input;
	if (
		source !== undefined &&
		segments.map(({ text }) => text).join("") !== source
	)
		issues.push({ kind: "SourceChanged", expected: source });
	const owners = new Map<number, number[]>();
	for (const [index, unit] of output.units.entries()) {
		if (unit.segments.length === 0)
			issues.push({ kind: "EmptyUnit", unit: index });
		for (const [position, segment] of unit.segments.entries()) {
			if (
				position > 0 &&
				segment <= (unit.segments[position - 1] ?? Number.NaN)
			) {
				issues.push({ kind: "Unordered", unit: index });
				break;
			}
		}
		for (const segment of new Set(unit.segments)) {
			const entry = segments[segment];
			if (!Number.isInteger(segment) || entry === undefined) {
				issues.push({ kind: "InvalidReference", unit: index, segment });
				continue;
			}
			if (entry.kind !== "ResolvableText") {
				issues.push({ kind: "NotResolvable", unit: index, segment });
				continue;
			}
			owners.set(segment, [...(owners.get(segment) ?? []), index]);
		}
	}
	for (const [index, entry] of segments.entries()) {
		if (entry.kind !== "ResolvableText") continue;
		const units = owners.get(index) ?? [];
		if (units.length === 0)
			issues.push({ kind: "Unowned", segment: index });
		if (units.length > 1)
			issues.push({ kind: "SharedOwner", segment: index, units });
	}
	return issues;
}

/** Throws with every issue when `output` is not a valid answer to `input`. */
export function assertValidUnits(
	input: SegmentInUnitsInput,
	output: SegmentInUnitsOutput,
	source?: string,
): void {
	const issues = validateUnits(input, output, source);
	if (issues.length > 0)
		throw Error(
			`Invalid segment.inUnits answer: ${issues
				.map((issue) => JSON.stringify(issue))
				.join("; ")}`,
		);
}
