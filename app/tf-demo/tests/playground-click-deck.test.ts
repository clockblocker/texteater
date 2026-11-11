import { afterEach, beforeAll, beforeEach, expect, jest, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderFixtureNoteParts } from "../src/notes";
import {
	clickDeck,
	longestClickDeck,
} from "../src/playground/entries/click-deck";
import { fixtureNoteKey } from "../src/playground/entries/playground-note";
import { createPlaygroundSnapshot } from "../tooling/build-playground-snapshot";
import type { PlaygroundSnapshot } from "../tooling/playground-snapshot";
import { PLAYGROUND_FIXTURE_TIMEOUT_MS } from "./support/convex";

/**
 * The Deck a Playground surface deals from the fake db is the app's (tf-demo
 * ADR 0011): the Cards whose step says something, in the app's order, each
 * told what the click tells it. `zur Bank` is the fake db's click that
 * deals all four.
 */

let snapshot: PlaygroundSnapshot;

beforeAll(async () => {
	// Seeded Definition Texts may schedule work; nothing here runs it.
	jest.useFakeTimers();
	snapshot = await createPlaygroundSnapshot();
	jest.useRealTimers();
}, PLAYGROUND_FIXTURE_TIMEOUT_MS);

beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

const roleOf = (key: string) => key.split(":").at(-1);

function headingText(card: ReturnType<typeof clickDeck>[number]): string {
	const key = fixtureNoteKey(card.target);
	const noteData = key ? snapshot.notes[key] : undefined;
	if (!noteData) throw new Error(`Missing fixture Note ${key ?? ""}`);
	const { heading } = renderFixtureNoteParts({
		noteData,
		presentation: "Card",
		follow: () => {},
		context: card.presentationContext,
	});
	/* the words as they read, whatever elements hold them */
	return renderToStaticMarkup(heading)
		.replaceAll(/<[^>]+>/g, "")
		.replaceAll(/\s+/g, " ")
		.trim();
}

test("the longest click in the fake db deals all four Cards, back to front, the Reading in front", () => {
	const deck = longestClickDeck(snapshot);
	expect(deck.map(({ key }) => roleOf(key))).toEqual([
		"Attestation",
		"Surface",
		"Lemma",
		"Reading",
	]);
	expect(deck.map(({ target }) => target.kind)).toEqual([
		"Attestation",
		"Surface",
		"Lemma",
		"Reading",
	]);
});

test("each Card is told what the click tells it, and its tail tells the click's story", () => {
	const [attestation, surface, lemma, reading] = longestClickDeck(snapshot);
	if (!attestation || !surface || !lemma || !reading)
		throw new Error("Expected four Cards.");
	if (reading.target.kind !== "Reading")
		throw new Error("Expected a Reading.");
	const { readingId } = reading.target;
	/* the click landed on the noun, not on the fused article it owns */
	expect(attestation.presentationContext).toEqual({
		clickedSegmentIndex: 17,
	});
	expect<unknown>(surface.presentationContext).toMatchObject({
		activeReadingId: readingId,
	});
	expect<unknown>(lemma.presentationContext).toEqual({
		activeReadingId: readingId,
	});

	expect([attestation, surface, lemma, reading].map(headingText)).toEqual([
		"zur Bank·zur = zu der",
		"Bank·dative of",
		"Bank·2 readings: 🏦 🪑",
		"🏦 Bank",
	]);
});

test("a click on a plain word deals its Reading alone", () => {
	const plain = snapshot.catalog.entries.find(
		({ canonicalForm }) => canonicalForm === "ruhig",
	);
	if (!plain?.attestationId) throw new Error("Expected ruhig's occurrence.");
	expect(
		clickDeck(snapshot, plain.attestationId).map(({ key }) => roleOf(key)),
	).toEqual(["Reading"]);
});

test("a split verb deals its Attestation behind its Reading", () => {
	const split = snapshot.catalog.entries.find(
		({ canonicalForm }) => canonicalForm === "anrufen",
	);
	if (!split?.attestationId)
		throw new Error("Expected anrufen's occurrence.");
	expect(
		clickDeck(snapshot, split.attestationId).map(({ key }) => roleOf(key)),
	).toEqual(["Attestation", "Reading"]);
});
