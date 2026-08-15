/**
 * Canonical JSON used for demo-owned compound identities.
 *
 * Lemma and Reading keys intentionally match Dumdict's identity comparison.
 * Surfaces use Dumling's public CSV ID and are passed through unchanged.
 */
export function stableValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(stableValue);
	if (value !== null && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, member]) => [key, stableValue(member)]),
		);
	}
	return value;
}

export function lemmaKeyFor(lemma: unknown): string {
	return JSON.stringify(stableValue(lemma));
}

export function readingKeyFor(reading: {
	lemma: unknown;
	emojiDescription: string;
}): string {
	return JSON.stringify([
		stableValue(reading.lemma),
		reading.emojiDescription.trim().normalize("NFC"),
	]);
}

export function resolutionKeyFor(
	segmentedSentenceId: string,
	memberSegmentIndices: readonly number[],
): string {
	return JSON.stringify([segmentedSentenceId, memberSegmentIndices]);
}

export function resolvedContextKeyFor(
	segmentedSentenceId: string,
	clickedSegmentIndex: number,
): string {
	return JSON.stringify([segmentedSentenceId, clickedSegmentIndex]);
}

export function visitorResolvedClickKeyFor(
	visitorId: string,
	resolvedContextKey: string,
): string {
	return JSON.stringify([visitorId, resolvedContextKey]);
}
