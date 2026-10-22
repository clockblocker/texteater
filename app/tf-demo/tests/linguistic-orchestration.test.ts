import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { applyTrustedReadingKnowledgeChange } from "../convex/model/readingKnowledge";
import type { ClickEncounter } from "../server/clickResolution";
import { parseResolvedGrammar } from "../server/resolutionGrammar";
import {
	attestation,
	context,
	encounter,
	fakeResolution,
	grammar,
	lemma,
	providerFailure,
	reading,
	selection,
	setup,
	unit,
} from "./support/click-orchestration";

/*
 * The click orchestrator behind the ClickResolution port (#848): reuse,
 * checkpoints, commits and conflicts on its side, Grammar and the Reading's
 * Emoji Description on the port's. A fake port stands in for resolution;
 * production runs `dumgenClickResolution`.
 */

test("a click resolved through the port reaches one atomic commit, and a repeat click reuses it", async () => {
	const run = setup();
	const result = await run.resolve();
	expect(run.writes).toHaveLength(1);
	expect(run.writes[0]?.reading).toEqual(reading);
	expect(run.writes[0]?.occurrence.attestation).toEqual(attestation);
	expect(run.writes[0]?.occurrence.memberSegmentIndices).toEqual([0]);
	expect(run.writes[0]?.readingDecision).toBe("New");
	expect(result).toMatchObject({
		grammatical: { encounter },
		persisted: { status: "Committed" },
	});
	expect(run.fake.grammarInputs).toHaveLength(1);
	expect(run.fake.readingInputs).toHaveLength(1);

	await run.resolve();
	expect(run.writes).toHaveLength(1);
	expect(run.fake.grammarInputs).toHaveLength(1);
});

test("Grammar receives the clicked Sentence, its stored unit, the Lemma candidates and the neighbouring Sentences", async () => {
	const neighbours = { before: "Maria kommt.", after: "Sie winkt." };
	const run = setup({
		context: context({
			lemmaCandidates: [{ lemma, foundUnder: ["Banken"] }],
			neighbours,
		}),
	});
	await run.resolve();
	expect(run.fake.grammarInputs).toEqual([
		{
			sentence: {
				id: "sentence-1",
				language: "de",
				segments: [{ kind: "ResolvableText", text: "Banken" }],
			},
			clickedSegmentIndex: 0,
			unit,
			lemmaCandidates: [{ lemma, foundUnder: ["Banken"] }],
			neighbours,
		},
	]);
});

test("retry uses its exact Grammar checkpoint and asks only for the Reading", async () => {
	const run = setup();
	await run.resolve({ grammatical: grammar });
	expect(run.fake.grammarInputs).toEqual([]);
	expect(run.fake.readingInputs).toHaveLength(1);
	expect(run.writes[0]?.reading).toEqual(reading);
});

test("Grammar's draft reaches the Reading, and a checkpointed Grammar has none to pass", async () => {
	const drafting = fakeResolution({
		grammar: () => Effect.succeed({ ...grammar, drafted: "🏦" }),
	});
	const run = setup({ resolution: drafting.resolution });
	await run.resolve();
	expect(drafting.readingInputs[0]?.drafted).toBe("🏦");
	const resumed = setup();
	await resumed.resolve({ grammatical: grammar });
	expect(resumed.fake.readingInputs[0]).not.toHaveProperty("drafted");
});

test("stored Reading candidates reach the port and a match is reused without a new Reading plan", async () => {
	const run = setup({ candidates: [reading] });
	const result = await run.resolve({ grammatical: grammar });
	expect(run.fake.readingInputs[0]?.candidates).toEqual(["🏦"]);
	expect(result).toMatchObject({ readingResolution: { decision: "Reuse" } });
	expect(run.writes[0]?.readingDecision).toBe("Reuse");
});

test("a globally resolved occurrence is reused without asking the port", async () => {
	const run = setup({
		context: context({
			sentence: null,
			reusable: {
				attestationId: "attestation-1",
				grammatical: grammar,
				reading,
			},
		}),
	});
	expect(await run.resolve()).toMatchObject({
		reused: true,
		persisted: { status: "Reused" },
	});
	expect(run.fake.grammarInputs).toEqual([]);
	expect(run.writes).toEqual([]);
});

test("Unresolved is durable; a late committed occurrence still wins", async () => {
	const unresolvedPort = fakeResolution({
		grammar: () =>
			Effect.succeed({
				decision: "Unresolved" as const,
				language: "de" as const,
			}),
	});
	const run = setup({ resolution: unresolvedPort.resolution });
	expect(await run.resolve()).toMatchObject({
		grammatical: { decision: "Unresolved" },
		persisted: { status: "Unresolved" },
	});
	expect(run.unresolved).toEqual([selection]);
	expect(run.writes).toEqual([]);

	const late = setup({
		resolution: unresolvedPort.resolution,
		persistence: {
			async persistUnresolvedClick() {
				return {
					status: "Reused",
					encounterId: "click-1",
					attestationId: "attestation-1",
					readingId: "reading-1",
					deduplicated: false,
					occurrence: {
						attestationId: "attestation-1",
						grammatical: grammar,
						reading,
					},
				};
			},
		},
	});
	expect(await late.resolve()).toMatchObject({ reused: true, reading });
});

test("a failure from either side of the port leaves no partial dictionary records", async () => {
	for (const resolution of [
		fakeResolution({
			grammar: () => Effect.fail(providerFailure("grammar failed")),
		}).resolution,
		fakeResolution({
			reading: () => Effect.fail(providerFailure("emoji failed")),
		}).resolution,
	]) {
		const run = setup({ resolution });
		await expect(run.resolve()).rejects.toThrow("failed");
		expect(run.writes).toEqual([]);
	}
});

test("a CatalogMiss from Grammar or Reading is returned without dictionary writes", async () => {
	const miss = {
		decision: "CatalogMiss" as const,
		stage: "resolveGrammar",
		route: "de/Lexeme/DET",
		message: "Missing reviewed DET",
	};
	for (const resolution of [
		fakeResolution({ grammar: () => Effect.succeed(miss) }).resolution,
		fakeResolution({ reading: () => Effect.succeed(miss) }).resolution,
	]) {
		const run = setup({ resolution });
		expect(await run.resolve()).toEqual({ catalogMiss: miss });
		expect(run.writes).toEqual([]);
	}
});

test("a mismatched Reading checkpoint fails before any write", async () => {
	const run = setup();
	await expect(
		run.resolve({
			grammatical: grammar,
			reading: {
				resolution: { decision: "New", emojiDescription: "🏦" },
				reading: { ...reading, emojiDescription: "🪑" },
			},
		}),
	).rejects.toThrow("does not match Grammar");
	expect(run.fake.readingInputs).toEqual([]);
	expect(run.writes).toEqual([]);
});

test("Knowledge changes validate against the exact tagged source Reading", () => {
	const first = applyTrustedReadingKnowledgeChange(reading, undefined, {
		kind: "Contribute",
		aspect: "definition",
		value: "Financial institution",
	});
	expect(first.definition).toBe("Financial institution");
	expect(() =>
		applyTrustedReadingKnowledgeChange(reading, first, {
			kind: "Contribute",
			aspect: "definition",
			value: "Bench",
		}),
	).toThrow("conflicts");
});

test("the commit carries the Reading as its ReadingAvailable progress and the run's record, in one write", async () => {
	const succeeded = { phase: "Commit" as const, generationEvents: [] };
	const asked: unknown[] = [];
	const run = setup({
		observer: {
			async grammarAvailable() {},
			committing(input) {
				asked.push(input);
				return { ...input, succeeded };
			},
		},
	});
	await run.resolve({ grammatical: grammar });
	expect(asked).toEqual([
		{
			readingAvailable: {
				reading,
				readingResolution: {
					decision: "New",
					emojiDescription: "🏦",
				},
			},
		},
	]);
	expect(run.writes).toHaveLength(1);
	expect(run.writes[0]?.progress).toEqual({
		readingAvailable: {
			reading,
			readingResolution: { decision: "New", emojiDescription: "🏦" },
		},
		succeeded,
	});
});

test("a checkpointed Reading commits with the run's record and no ReadingAvailable progress", async () => {
	const run = setup({
		observer: {
			async grammarAvailable() {},
			committing: (input) => ({
				...input,
				succeeded: { phase: "Commit", generationEvents: [] },
			}),
		},
	});
	await run.resolve({
		grammatical: grammar,
		reading: {
			resolution: { decision: "New", emojiDescription: "🏦" },
			reading,
		},
	});
	expect(run.fake.readingInputs).toEqual([]);
	expect(run.writes[0]?.progress).toEqual({
		succeeded: { phase: "Commit", generationEvents: [] },
	});
});
test("a Foreign click asks no Reading: its one Reading has no Emoji Description (ADR 0045)", async () => {
	const foreignLemma = {
		unitKind: "Lemma",
		language: "de",
		family: "Foreign",
		kind: "Foreign",
		// A Foreign Surface is its Lemma's Canonical Form.
		canonicalForm: "Banken",
		coreFeatures: { sourceLang: "en" },
	} as const;
	const foreignEncounter: ClickEncounter = {
		...encounter,
		target: {
			family: "Foreign",
			kind: "Foreign",
			memberSegmentIndices: [0],
		},
	};
	const foreignGrammar = parseResolvedGrammar({
		encounter: foreignEncounter,
		attestation: {
			unitKind: "Attestation",
			members: [{ attested: "Banken", orthography: "Standard" }],
			realizationCoverage: "Full",
			surface: {
				unitKind: "Surface",
				language: "de",
				normalizedSurface: "Banken",
				spelling: { kind: "Canonical" },
				lemma: foreignLemma,
				surfaceFeatures: null,
			},
		},
	});
	const fake = fakeResolution({
		grammar: () => Effect.succeed(foreignGrammar),
	});
	const run = setup({
		resolution: fake.resolution,
		persistence: {
			async persistResolvedClick(input) {
				run.writes.push(input);
				return {
					status: "Committed",
					encounterId: "click-1",
					attestationId: "attestation-1",
					readingId: "reading-1",
					deduplicated: false,
					occurrence: {
						attestationId: "attestation-1",
						grammatical: foreignGrammar,
						reading: input.reading,
					},
				};
			},
		},
	});
	const result = await run.resolve();
	expect(fake.readingInputs).toEqual([]);
	expect(run.writes[0]?.reading).toEqual({
		unitKind: "Reading",
		lemma: foreignLemma,
	});
	expect(run.writes[0]?.readingDecision).toBe("New");
	expect(run.writes[0]?.readingCandidates).toBeUndefined();
	expect(result).toMatchObject({ persisted: { status: "Committed" } });
});
