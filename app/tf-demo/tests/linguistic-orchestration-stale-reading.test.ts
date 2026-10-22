import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { emojiDescriptionOf } from "../server/linguisticIdentity";
import { fakeResolution, grammar, setup } from "./support/click-orchestration";

// A New refused as stale is judged again (ADR 0031 decision 6, #596).

test("a New the commit refuses as stale is judged again over the Lemma's Readings now, keeping its written description on a second NoMatch", async () => {
	const fake = fakeResolution({
		reading: (input) =>
			Effect.succeed({
				decision: "New" as const,
				emojiDescription: input.written ?? "🏦",
				candidates: input.candidates,
			}),
	});
	let commits = 0;
	const run = setup({
		resolution: fake.resolution,
		persistence: {
			async persistResolvedClick(input) {
				commits++;
				if (commits === 1)
					return { status: "StaleReading", candidates: ["🪑"] };
				return {
					status: "Committed",
					encounterId: "click-1",
					attestationId: "attestation-1",
					readingId: "reading-1",
					deduplicated: false,
					occurrence: {
						attestationId: "attestation-1",
						grammatical: grammar,
						reading: input.reading,
					},
				};
			},
		},
	});
	const result = await run.resolve();
	expect(
		fake.readingInputs.map(({ candidates, written }) => ({
			candidates,
			written,
		})),
	).toEqual([
		{ candidates: [], written: undefined },
		{ candidates: ["🪑"], written: "🏦" },
	]);
	expect(commits).toBe(2);
	expect(result).toMatchObject({
		readingResolution: {
			decision: "New",
			emojiDescription: "🏦",
			candidates: ["🪑"],
		},
		persisted: { status: "Committed" },
	});
});

test("a stale New's re-judge passes its written description, not Grammar's draft, and each commit carries its own Reading and record", async () => {
	const fake = fakeResolution({
		grammar: () => Effect.succeed({ ...grammar, drafted: "🏦" }),
		reading: (input) =>
			Effect.succeed({
				decision: "New" as const,
				emojiDescription: input.written ?? input.drafted ?? "🧩",
				candidates: input.candidates,
			}),
	});
	const progress: unknown[] = [];
	let commits = 0;
	const run = setup({
		resolution: fake.resolution,
		observer: {
			async grammarAvailable() {},
			committing: (input) => ({
				...input,
				succeeded: { phase: "Commit", generationEvents: [] },
			}),
		},
		persistence: {
			async persistResolvedClick(input) {
				progress.push(input.progress);
				commits++;
				if (commits === 1)
					return { status: "StaleReading", candidates: ["🪑"] };
				return {
					status: "Committed",
					encounterId: "click-1",
					attestationId: "attestation-1",
					readingId: "reading-1",
					deduplicated: false,
					occurrence: {
						attestationId: "attestation-1",
						grammatical: grammar,
						reading: input.reading,
					},
				};
			},
		},
	});
	await run.resolve();
	expect(
		fake.readingInputs.map(({ written, drafted }) => ({
			written,
			drafted,
		})),
	).toEqual([
		{ written: undefined, drafted: "🏦" },
		{ written: "🏦", drafted: undefined },
	]);
	expect(progress).toEqual([
		expect.objectContaining({
			readingAvailable: expect.objectContaining({
				readingResolution: expect.objectContaining({ candidates: [] }),
			}),
			succeeded: { phase: "Commit", generationEvents: [] },
		}),
		expect.objectContaining({
			readingAvailable: expect.objectContaining({
				readingResolution: expect.objectContaining({
					candidates: ["🪑"],
				}),
			}),
			succeeded: { phase: "Commit", generationEvents: [] },
		}),
	]);
});

test("judged again, a stale New may reuse the Reading stored since, and commits it as a Reuse", async () => {
	const fake = fakeResolution({
		reading: (input) =>
			Effect.succeed(
				input.written === undefined
					? {
							decision: "New" as const,
							emojiDescription: "🏦",
							candidates: [],
						}
					: { decision: "Reuse" as const, emojiDescription: "🪑" },
			),
	});
	const decisions: unknown[] = [];
	let commits = 0;
	const run = setup({
		resolution: fake.resolution,
		persistence: {
			async persistResolvedClick(input) {
				decisions.push([
					input.readingDecision,
					emojiDescriptionOf(input.reading),
					input.readingCandidates,
				]);
				commits++;
				if (commits === 1)
					return { status: "StaleReading", candidates: ["🪑"] };
				return {
					status: "Committed",
					encounterId: "click-1",
					attestationId: "attestation-1",
					readingId: "reading-1",
					deduplicated: false,
					occurrence: {
						attestationId: "attestation-1",
						grammatical: grammar,
						reading: input.reading,
					},
				};
			},
		},
	});
	await run.resolve();
	expect(decisions).toEqual([
		["New", "🏦", []],
		["Reuse", "🪑", undefined],
	]);
});

test("a click whose Lemma keeps gaining Readings stops after judging twice more", async () => {
	const fake = fakeResolution({
		reading: (input) =>
			Effect.succeed({
				decision: "New" as const,
				emojiDescription: "🏦",
				candidates: input.candidates,
			}),
	});
	const run = setup({
		resolution: fake.resolution,
		persistence: {
			async persistResolvedClick() {
				return { status: "StaleReading", candidates: ["🪑"] };
			},
		},
	});
	await expect(run.resolve()).rejects.toThrow("kept gaining Readings");
	expect(fake.readingInputs).toHaveLength(3);
});
