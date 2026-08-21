import { isDeepStrictEqual } from "node:util";
import {
	ParsingError,
	type ParsingIssue,
} from "../../battery/common-utils/dist/index.js";

type CanonicalResult<Output> =
	| { readonly data: Output; readonly success: true }
	| {
			readonly error: { readonly issues: readonly ParsingIssue[] };
			readonly success: false;
	  };

export interface DifferentialTarget<Output> {
	readonly canonical: {
		safeParse(input: unknown): CanonicalResult<Output>;
	};
	readonly id: string;
	readonly lightweight: (input: unknown) => Output | ParsingError<Output>;
	readonly propertyValues: readonly unknown[];
	readonly representativeValues: readonly unknown[];
}

export interface DifferentialMismatch {
	readonly index: number;
	readonly kind:
		| "acceptance"
		| "failure-constructor"
		| "issues"
		| "normalized-output";
	readonly phase: "property" | "representative";
}

export interface DifferentialResult {
	readonly id: string;
	readonly mismatches: readonly DifferentialMismatch[];
	readonly propertyValueCount: number;
	readonly representativeValueCount: number;
}

function isParsingFailure(value: unknown): value is ParsingError<unknown> {
	return (
		value instanceof ParsingError ||
		(value instanceof Error &&
			value.name === "ParsingError" &&
			Array.isArray(Reflect.get(value, "issues")))
	);
}

export function compareDifferentialTarget<Output>(
	target: DifferentialTarget<Output>,
): DifferentialResult {
	const mismatches: DifferentialMismatch[] = [];
	const groups = [
		["representative", target.representativeValues],
		["property", target.propertyValues],
	] as const;

	for (const [phase, values] of groups) {
		for (const [index, input] of values.entries()) {
			const canonical = target.canonical.safeParse(input);
			const lightweight = target.lightweight(input);
			const lightweightFailed = isParsingFailure(lightweight);
			if (canonical.success === lightweightFailed) {
				mismatches.push({ index, kind: "acceptance", phase });
				continue;
			}
			if (canonical.success) {
				if (!isDeepStrictEqual(lightweight, canonical.data)) {
					mismatches.push({
						index,
						kind: "normalized-output",
						phase,
					});
				}
				continue;
			}
			if (!lightweightFailed) {
				mismatches.push({
					index,
					kind: "failure-constructor",
					phase,
				});
				continue;
			}
			if (
				!isDeepStrictEqual(lightweight.issues, canonical.error.issues)
			) {
				mismatches.push({ index, kind: "issues", phase });
			}
		}
	}

	return {
		id: target.id,
		mismatches,
		propertyValueCount: target.propertyValues.length,
		representativeValueCount: target.representativeValues.length,
	};
}
