import { describe, expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import type { ClickEncounter } from "../server/clickResolution";
import {
	lemmaIdentityKey,
	readingIdentityKey,
} from "../server/linguisticIdentity";
import {
	type PersistedSentence,
	resolvedClickCommit,
} from "../server/linguisticOrchestration";
import { parseResolvedGrammar } from "../server/resolutionGrammar";

/*
 * The pure phases of the click orchestrator (#987). The workflow around
 * them is covered end to end by linguistic-orchestration.test.ts.
 */

const lemma: Dumling.Lemma<"de", "Lexeme", "NOUN"> = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem" },
};
const reading: Dumling.Reading<"de", "Lexeme", "NOUN"> = {
	unitKind: "Reading",
	lemma,
	emojiDescription: "🏦",
};

/** An Encounter on `Banken` in `Die Banken`, naming the given Segments. */
function encounterOn(memberSegmentIndices: readonly number[]): ClickEncounter {
	return {
		sentence: {
			id: "sentence-1",
			language: "de",
			segments: [
				{ kind: "ResolvableText", text: "Die" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "Banken" },
			],
		},
		target: { family: "Lexeme", kind: "NOUN", memberSegmentIndices },
	};
}

const attestation: Dumling.Attestation<"de", "Lexeme", "NOUN"> = {
	unitKind: "Attestation",
	surface: {
		unitKind: "Surface",
		language: "de",
		lemma,
		normalizedSurface: "Banken",
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		inflectionalFeatures: { case: "Nom", number: "Plur", gender: null },
	},
	realizationCoverage: "Full",
	articleEvidence: null,
	valencyEvidence: [],
	members: [{ attested: "Banken", orthography: "Standard" }],
};

const sentence: PersistedSentence = {
	sentenceId: "sentence-1",
	textId: "text-1",
	segmentedSentenceId: "sentence-1",
	language: "de",
	stitchedText: "Die Banken",
	segments: [
		{ index: 0, kind: "ResolvableText", text: "Die" },
		{ index: 1, kind: "Whitespace", text: " " },
		{ index: 2, kind: "ResolvableText", text: "Banken" },
	],
};

const selection = {
	requestId: "request-1",
	visitorId: "visitor-1",
	sentenceId: "sentence-1",
	clickedSegmentIndex: 2,
};

function scopeOn(
	memberSegmentIndices: readonly number[],
	stored: PersistedSentence | null = sentence,
) {
	return {
		input: selection,
		sentence: stored,
		grammatical: parseResolvedGrammar({
			encounter: encounterOn(memberSegmentIndices),
			attestation,
		}),
		surfaceKey: "surface-key",
		lemmaKey: lemmaIdentityKey(lemma),
	};
}

describe("resolvedClickCommit", () => {
	test("commits the occurrence on the stored Segments the Encounter names", () => {
		const scope = scopeOn([2]);
		expect(
			resolvedClickCommit(scope, reading, {
				decision: "Reuse",
				emojiDescription: "🏦",
			}),
		).toEqual({
			...selection,
			occurrence: {
				memberSegmentIndices: [2],
				attestation: scope.grammatical.attestation,
				surfaceKey: "surface-key",
				lemmaKey: lemmaIdentityKey(lemma),
			},
			reading,
			readingKey: readingIdentityKey(reading),
			readingDecision: "Reuse",
		});
	});

	test("carries the candidates a New's judge saw, so the commit can refuse it as stale", () => {
		const commit = resolvedClickCommit(scopeOn([2]), reading, {
			decision: "New",
			emojiDescription: "🏦",
			candidates: ["🪑"],
		});
		expect(commit.readingDecision).toBe("New");
		expect(commit.readingCandidates).toEqual(["🪑"]);
	});

	test("carries no candidates for a New no judge decided, nor for a Reuse", () => {
		const fresh = resolvedClickCommit(scopeOn([2]), reading, {
			decision: "New",
			emojiDescription: "🏦",
		});
		const reused = resolvedClickCommit(scopeOn([2]), reading, {
			decision: "Reuse",
			emojiDescription: "🏦",
			candidates: ["🏦"],
		});
		expect("readingCandidates" in fresh).toBe(false);
		expect("readingCandidates" in reused).toBe(false);
	});

	test("leaves the progress to the commit that sends it", () => {
		const commit = resolvedClickCommit(scopeOn([2]), reading, {
			decision: "Reuse",
			emojiDescription: "🏦",
		});
		expect("progress" in commit).toBe(false);
	});

	test("refuses a member the stored Sentence has no Segment for", () => {
		const truncated: PersistedSentence = {
			...sentence,
			stitchedText: "Die",
			segments: [{ index: 0, kind: "ResolvableText", text: "Die" }],
		};
		expect(() =>
			resolvedClickCommit(scopeOn([2], truncated), reading, {
				decision: "Reuse",
			}),
		).toThrow("An Encounter member is not a stored Segment.");
	});

	test("refuses to commit membership without the stored Sentence", () => {
		expect(() =>
			resolvedClickCommit(scopeOn([2], null), reading, {
				decision: "Reuse",
			}),
		).toThrow("The stored Sentence is needed to commit membership.");
	});
});
