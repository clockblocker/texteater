import type {
	GermanReachableHighLevelFamily,
	GermanReachableHighLevelKind,
} from "../../schema/german-high-level-routes.js";
import type { Segment, Unresolved } from "../../types.js";

export type GermanHighLevelTargetClassificationRoute = {
	readonly [Family in GermanReachableHighLevelFamily]: {
		readonly family: Family;
		readonly kind: Exclude<
			GermanReachableHighLevelKind<Family>,
			"Collocation"
		>;
	};
}[GermanReachableHighLevelFamily];

export type GermanHighLevelTargetClassificationTarget =
	GermanHighLevelTargetClassificationRoute & {
		readonly memberSegmentIndices: readonly number[];
	};

export type GermanHighLevelTargetClassificationInput = Readonly<{
	clickedSegmentIndex: number;
	segments: readonly Segment[];
}>;

export type GermanHighLevelTargetClassificationModelInput = Readonly<{
	clickedIndex: number;
	markedSentence: string;
	segments: readonly Readonly<{ i: number; s: string }>[];
}>;

export type GermanHighLevelTargetClassificationModelOutput =
	| Readonly<{
			additionalMemberIndices: readonly number[];
			decision: "Resolved";
			target: GermanHighLevelTargetClassificationRoute;
	  }>
	| Readonly<{
			additionalMemberIndices: null;
			decision: "Unresolved";
			target: null;
	  }>;

export type GermanHighLevelTargetClassificationProjection = Readonly<{
	modelInput: GermanHighLevelTargetClassificationModelInput;
	canonicalize(
		output: GermanHighLevelTargetClassificationModelOutput,
	): GermanHighLevelTargetClassificationTarget | Unresolved;
	materialize(
		result: GermanHighLevelTargetClassificationTarget | Unresolved,
	): GermanHighLevelTargetClassificationModelOutput;
}>;

const TARGET_OPEN = "<target>";
const TARGET_CLOSE = "</target>";

/**
 * Projects one German clicked-Segment interaction across the compact prompt
 * seam. Compact occurrence IDs count every non-whitespace Segment, while only
 * ResolvableText Segments are exposed as classification candidates.
 */
export function createGermanHighLevelTargetClassificationProjection(
	input: GermanHighLevelTargetClassificationInput,
): GermanHighLevelTargetClassificationProjection {
	const clickedSegment = input.segments[input.clickedSegmentIndex];
	if (clickedSegment?.kind !== "ResolvableText")
		throw new Error(
			"The clicked canonical segment is not a ResolvableText candidate.",
		);

	const compactToOriginal: number[] = [];
	const originalToCompact = new Map<number, number>();
	const candidates: Array<Readonly<{ i: number; s: string }>> = [];
	const markedSentence = input.segments
		.map((segment, originalIndex) => {
			if (segment.kind !== "Whitespace") {
				const compactIndex = compactToOriginal.length;
				compactToOriginal.push(originalIndex);
				originalToCompact.set(originalIndex, compactIndex);
				if (segment.kind === "ResolvableText")
					candidates.push(
						Object.freeze({ i: compactIndex, s: segment.text }),
					);
			}
			const escaped = escapeXmlText(segment.text);
			return originalIndex === input.clickedSegmentIndex
				? `${TARGET_OPEN}${escaped}${TARGET_CLOSE}`
				: escaped;
		})
		.join("");
	const clickedIndex = originalToCompact.get(input.clickedSegmentIndex);
	if (clickedIndex === undefined)
		throw new Error(
			"The clicked canonical segment is not a ResolvableText candidate.",
		);

	const modelInput = Object.freeze({
		clickedIndex,
		markedSentence,
		segments: Object.freeze(candidates),
	});

	return Object.freeze({
		modelInput,
		canonicalize(output) {
			if (output.decision === "Unresolved")
				return Object.freeze({ decision: "Unresolved" as const });
			return canonicalAnalysisTarget(
				input,
				compactToOriginal,
				clickedIndex,
				output.target,
				output.additionalMemberIndices,
			);
		},
		materialize(result) {
			if ("decision" in result)
				return Object.freeze({
					additionalMemberIndices: null,
					decision: "Unresolved" as const,
					target: null,
				});
			const additionalMemberIndices = compactAdditionalMembers(
				input,
				originalToCompact,
				clickedIndex,
				result.memberSegmentIndices,
			);
			return Object.freeze({
				additionalMemberIndices: Object.freeze(additionalMemberIndices),
				decision: "Resolved" as const,
				target: Object.freeze({
					family: result.family,
					kind: result.kind,
				}) as GermanHighLevelTargetClassificationRoute,
			});
		},
	});
}

function canonicalAnalysisTarget(
	input: GermanHighLevelTargetClassificationInput,
	compactToOriginal: readonly number[],
	clickedIndex: number,
	route: GermanHighLevelTargetClassificationRoute,
	additionalMemberIndices: readonly number[],
): GermanHighLevelTargetClassificationTarget {
	assertOrderedUniqueMembership(
		additionalMemberIndices,
		"Additional membership must be ordered and unique before click insertion.",
	);
	if (additionalMemberIndices.includes(clickedIndex))
		throw new Error(
			"Additional membership must exclude the clicked index.",
		);
	const memberSegmentIndices = [clickedIndex, ...additionalMemberIndices]
		.toSorted((left, right) => left - right)
		.map((compactIndex) => {
			const originalIndex = compactToOriginal[compactIndex];
			if (
				originalIndex === undefined ||
				input.segments[originalIndex]?.kind !== "ResolvableText"
			)
				throw new Error("Membership must reference ResolvableText.");
			return originalIndex;
		});
	return Object.freeze({
		...route,
		memberSegmentIndices: Object.freeze(memberSegmentIndices),
	}) as GermanHighLevelTargetClassificationTarget;
}

function compactAdditionalMembers(
	input: GermanHighLevelTargetClassificationInput,
	originalToCompact: ReadonlyMap<number, number>,
	clickedIndex: number,
	memberSegmentIndices: readonly number[],
): number[] {
	assertOrderedUniqueMembership(
		memberSegmentIndices,
		"Canonical membership must be ordered and unique.",
	);
	const compactMembers = memberSegmentIndices.map((originalIndex) => {
		if (input.segments[originalIndex]?.kind !== "ResolvableText")
			throw new Error(
				`Canonical member ${originalIndex} must reference ResolvableText.`,
			);
		const compactIndex = originalToCompact.get(originalIndex);
		if (compactIndex === undefined)
			throw new Error(
				`Canonical member ${originalIndex} was removed by compaction.`,
			);
		return compactIndex;
	});
	if (!compactMembers.includes(clickedIndex))
		throw new Error(
			"Canonical membership must include the clicked member.",
		);
	return compactMembers.filter((memberIndex) => memberIndex !== clickedIndex);
}

function assertOrderedUniqueMembership(
	indices: readonly number[],
	message: string,
): void {
	let previous = -1;
	for (const index of indices) {
		if (!Number.isSafeInteger(index) || index <= previous)
			throw new Error(message);
		previous = index;
	}
}

function escapeXmlText(text: string): string {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");
}
