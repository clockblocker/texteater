import type { GrammaticalResolutionInput, Segment } from "../types";

export class NormalizedSurfaceProjectionError extends Error {
	override readonly name = "NormalizedSurfaceProjectionError";
}

/**
 * Projects the canonical prompt input from the original Segmented Sentence and
 * ordered Analysis Target indices. `members` never comes from reparsing the
 * markup; TARGET parsing is reserved for validation at the model boundary.
 */
export function projectGrammaticalResolutionInput(args: {
	readonly segments: readonly Segment[];
	readonly memberSegmentIndices: readonly [number, ...number[]];
}): GrammaticalResolutionInput {
	const { segments, memberSegmentIndices } = args;
	const memberIndices = new Set(memberSegmentIndices);
	const members = memberSegmentIndices.map((segmentIndex) => {
		const member = segments[segmentIndex]?.text;
		if (member === undefined) {
			throw new NormalizedSurfaceProjectionError(
				"A target member index does not identify a Segment.",
			);
		}
		return member;
	}) as [string, ...string[]];
	const markedContext = segments
		.map((segment, index) => {
			const escapedText = segment.text
				.replaceAll("&", "&amp;")
				.replaceAll("<", "&lt;")
				.replaceAll(">", "&gt;");
			return memberIndices.has(index)
				? `<TARGET>${escapedText}</TARGET>`
				: escapedText;
		})
		.join("");

	return Object.freeze({
		markedContext,
		members: Object.freeze(members) as readonly [string, ...string[]],
	}) satisfies GrammaticalResolutionInput;
}

export function extractMarkedContextMembers(
	markedContext: string,
): readonly string[] {
	const openingCount = markedContext.match(/<TARGET>/gu)?.length ?? 0;
	const closingCount = markedContext.match(/<\/TARGET>/gu)?.length ?? 0;
	const members = [
		...markedContext.matchAll(/<TARGET>([^<>]*)<\/TARGET>/gu),
	].map((match) => decodeOwnedMarkedContextEntities(match[1] ?? ""));
	if (
		openingCount === 0 ||
		openingCount !== closingCount ||
		members.length !== openingCount
	) {
		throw new NormalizedSurfaceProjectionError(
			"Marked context must contain balanced, non-nested TARGET members.",
		);
	}
	return Object.freeze(members);
}

function decodeOwnedMarkedContextEntities(member: string): string {
	return member
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&amp;", "&");
}
