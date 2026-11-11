import { segmentSelectionDeckCards } from "@/views/resolution-deck";
import type { WorkspaceCardTarget } from "@/workspace/workspace-controller";
import {
	attestationSaysSomething,
	lemmaSaysSomething,
	surfaceSaysSomething,
} from "../../../shared/click-story";
import type { PlaygroundSnapshot } from "../../../tooling/playground-snapshot";

/**
 * A stored click's Deck, dealt from the fake db as the app deals it (tf-demo
 * ADR 0011). The fake db has no Segment Selection to answer a click, so
 * this reads what its fast path would answer off the fixture Notes, with
 * the same rules for which steps say something (`shared/click-story.ts`),
 * and hands it to the app's own `segmentSelectionDeckCards`: the Cards,
 * their order and what each is told of the click are the app's.
 */

type Catalog = PlaygroundSnapshot["catalog"];
type AttestationId = NonNullable<Catalog["entries"][number]["attestationId"]>;
type Available = Extract<
	Parameters<typeof segmentSelectionDeckCards>[1],
	{ kind: "Available" }
>;

/** The occurrence `attestationId` committed, as `loadCanonicalOccurrence` reads it. */
function canonicalOccurrence(
	snapshot: PlaygroundSnapshot,
	attestationId: AttestationId,
): { canonical: Available["canonical"]; clickedSegmentIndex: number } | null {
	const attestation = snapshot.notes[`Attestation:${attestationId}`];
	if (attestation?.kind !== "Attestation") return null;
	const { readingId } = attestation.reading.target;
	const reading = snapshot.notes[`Reading:${readingId}`];
	const surface =
		snapshot.notes[
			`Surface:${attestation.surfaceTarget.normalizedSurface}`
		];
	if (reading?.kind !== "Reading" || surface?.kind !== "Surface") return null;
	const { lemmaId } = reading.reading.lemma;
	const lemma = snapshot.notes[`Lemma:${lemmaId}`];
	/* the Surface Note gathers every analysis of the spelling; the click
	   took the one its Attestation presents */
	const attested = JSON.stringify(attestation.presented.surface);
	const analysis = surface.analyses.find(
		(candidate) => JSON.stringify(candidate.presented) === attested,
	);
	const clickedSegmentIndex = attestation.source.memberSegmentIndices.at(-1);
	if (
		lemma?.kind !== "Lemma" ||
		!analysis ||
		clickedSegmentIndex === undefined
	)
		return null;
	return {
		canonical: {
			readingId,
			lemmaId,
			surfaceId: analysis.surfaceId,
			surfaceLanguage: "de",
			normalizedSurface: attestation.surfaceTarget.normalizedSurface,
			attestationId,
			steps: {
				attestation: attestationSaysSomething(
					attestation.presented.members,
				),
				surface: surfaceSaysSomething(attestation.presented.surface),
				lemma: lemmaSaysSomething(lemma.connections.readings.length),
			},
		},
		/* the click landed on the unit's head, its last member */
		clickedSegmentIndex,
	};
}

/**
 * The Cards a click on `attestationId`'s occurrence deals, back to front:
 * the Attestation at the back, the Reading in front, and only the Cards
 * whose step says something. Empty when the fake db lacks the occurrence.
 */
export function clickDeck(
	snapshot: PlaygroundSnapshot,
	attestationId: AttestationId,
): readonly WorkspaceCardTarget[] {
	const occurrence = canonicalOccurrence(snapshot, attestationId);
	if (!occurrence) return [];
	return segmentSelectionDeckCards(
		"playground",
		{ kind: "Available", canonical: occurrence.canonical },
		occurrence.clickedSegmentIndex,
	).toReversed();
}

/**
 * The fake db's click whose Deck tells the longest story: the one a
 * surface that studies a Deck deals. The first of the longest wins.
 */
export function longestClickDeck(
	snapshot: PlaygroundSnapshot,
): readonly WorkspaceCardTarget[] {
	let longest: readonly WorkspaceCardTarget[] = [];
	for (const { attestationId } of snapshot.catalog.entries) {
		if (!attestationId) continue;
		const deck = clickDeck(snapshot, attestationId);
		if (deck.length > longest.length) longest = deck;
	}
	return longest;
}
