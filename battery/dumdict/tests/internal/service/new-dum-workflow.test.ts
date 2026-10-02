import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { Effect } from "effect";
import {
	ParsingError,
	parseAsCommitChangesRequest,
	projectSemanticRelations,
} from "../../../src";
import { getBootedUpDumdict } from "../../../src/testing/boot";
import { emojiOf } from "./helpers";

const note = { attestedTranslations: [], attestations: [], notes: "" };
const bank: Dumling.Lemma<"de", "Lexeme", "NOUN"> = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem" },
};
const bankReading: Dumling.Reading<"de", "Lexeme", "NOUN"> = {
	unitKind: "Reading",
	lemma: bank,
	emojiDescription: "💰",
};
// Attestation: "[Bank]"
const bankSurface = {
	unitKind: "Surface",
	language: "de",
	lemma: bank,
	normalizedSurface: "Bank",
	spelling: { kind: "Canonical" },
	surfaceFeatures: null,
	inflectionalFeatures: null,
} satisfies Dumling.Surface<"de", "Lexeme", "NOUN">;

test("a Reading's Surface, Attestation and generated Knowledge reach dictionary storage and pending-target projection", async () => {
	const { dict, storage } = getBootedUpDumdict("de");
	expect(storage.loadAll()).toEqual([]);
	const reading = bankReading;
	await Effect.runPromise(
		dict.ensureReadingEntry({ entry: { reading, ...note } }),
	);
	await Effect.runPromise(
		dict.ensureOwnedSurface({
			reading,
			ownedSurface: { surface: bankSurface, note },
		}),
	);
	await Effect.runPromise(
		dict.ensureOwnedSurface({
			reading,
			ownedSurface: { surface: bankSurface, note },
		}),
	);
	await Effect.runPromise(
		dict.addAttestation({ reading, attestation: "Bank" }),
	);
	const institution: Dumling.Reading<"de", "Lexeme", "NOUN"> = {
		unitKind: "Reading",
		lemma: {
			...bank,
			canonicalForm: "Geldinstitut",
			coreFeatures: { gender: "Neut" },
		},
		emojiDescription: "🏦",
	};
	await Effect.runPromise(
		dict.ensureReadingEntry({ entry: { reading: institution, ...note } }),
	);
	// Generated Knowledge names relation targets by Lemma identity only.
	await Effect.runPromise(
		dict.applyGeneratedKnowledge({
			reading,
			changes: [],
			pendingRelations: [
				{
					relation: "synonym",
					target: {
						language: "de",
						family: "Lexeme",
						kind: "NOUN",
						canonicalForm: "Geldinstitut",
					},
				},
				{
					relation: "synonym",
					target: {
						language: "de",
						family: "Lexeme",
						kind: "PROPN",
						canonicalForm: "Sparkasse",
					},
				},
			],
		}),
	);
	const stored = storage.loadAll();
	const entries = stored.flatMap((value) => value.readingEntries);
	expect(stored.flatMap((value) => value.ownedSurfaceEntries)).toHaveLength(
		1,
	);
	expect(
		entries.find((entry) => emojiOf(entry.reading) === "💰")?.knowledge
			?.semanticRelations,
	).toEqual({ synonym: [institution.lemma] });
	expect(
		stored
			.flatMap((value) => value.pendingRelations)
			.map((value) => value.pending.target),
	).toEqual([
		{
			language: "de",
			family: "Lexeme",
			kind: "PROPN",
			canonicalForm: "Sparkasse",
		},
	]);
	const projected = projectSemanticRelations(entries);
	expect(projected.success).toBe(true);
	if (!projected.success) throw projected.error;
	expect(projected.value).toContainEqual({
		source: institution,
		target: reading.lemma,
		relation: "synonym",
		provenance: "inferred",
	});
	expect(
		entries.find((entry) => emojiOf(entry.reading) === "🏦")?.knowledge,
	).toBeUndefined();
	const candidates = await Effect.runPromise(
		dict.findStoredReadings({ lemma: reading.lemma }),
	);
	expect(candidates.candidates.map((value) => value.reading)).toEqual([
		reading,
	]);
});

test("conflicting Knowledge changes reject the whole batch and competing plans keep revision checks", async () => {
	const { dict, storage } = getBootedUpDumdict("de");
	await Effect.runPromise(
		dict.ensureReadingEntry({ entry: { reading: bankReading, ...note } }),
	);
	const before = storage.loadAll();
	const failed = await Effect.runPromise(
		Effect.result(
			dict.applyGeneratedKnowledge({
				reading: bankReading,
				changes: [
					{
						kind: "Contribute",
						aspect: "definition",
						value: "first",
					},
					{
						kind: "Contribute",
						aspect: "definition",
						value: "second",
					},
				],
				pendingRelations: [],
			}),
		),
	);
	expect(failed._tag).toBe("Failure");
	expect(storage.loadAll()).toEqual(before);
	const request = {
		reading: bankReading,
		changes: [{ kind: "Correct", aspect: "definition", value: "stored" }],
		pendingRelations: [],
	} as const;
	const first = await Effect.runPromise(
		dict.prepare.applyGeneratedKnowledge(request),
	);
	const second = await Effect.runPromise(
		dict.prepare.applyGeneratedKnowledge(request),
	);
	const commit = async (plan: typeof first.plan) => {
		const parsed = parseAsCommitChangesRequest(plan, "de");
		if (parsed instanceof ParsingError) throw parsed;
		return Effect.runPromise(storage.commitChanges(parsed));
	};
	expect((await commit(first.plan)).status).toBe("committed");
	expect(await commit(second.plan)).toMatchObject({
		status: "conflict",
		code: "revisionConflict",
	});
	expect(
		storage.loadAll().flatMap((value) => value.readingEntries),
	).toHaveLength(1);
});

test("pending target planning observes the Knowledge mode selected in the same batch", async () => {
	const { dict, storage } = getBootedUpDumdict("de");
	const target: Dumling.Reading<"de", "Lexeme", "NOUN"> = {
		...bankReading,
		lemma: { ...bank, canonicalForm: "Sparkasse" },
		emojiDescription: "🏦",
	};
	for (const reading of [bankReading, target])
		await Effect.runPromise(
			dict.ensureReadingEntry({ entry: { reading, ...note } }),
		);
	const before = storage.loadAll();
	const result = await Effect.runPromise(
		Effect.result(
			dict.prepare.applyGeneratedKnowledge({
				reading: bankReading,
				changes: [
					{
						kind: "Contribute",
						aspect: "semanticRelations",
						relation: "synonym",
						targetKind: "reading",
						value: [target],
					},
				],
				pendingRelations: [
					{
						relation: "synonym",
						target: {
							language: "de",
							family: "Lexeme",
							kind: "NOUN",
							canonicalForm: "Sparkasse",
						},
					},
				],
			}),
		),
	);
	expect(result._tag).toBe("Failure");
	expect(storage.loadAll()).toEqual(before);
});
