import { expect, test } from "bun:test";
import { createDumgen } from "dumgen";
import type { Encounter } from "dumgen/types";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { Effect } from "effect";
import { grammarFixture } from "../../../../dumgen/tests/grammar-fixture.js";
import { knowledgeFixture } from "../../../../dumgen/tests/knowledge-fixture.js";
import {
	ParsingError,
	parseAsCommitChangesRequest,
	projectSemanticRelations,
} from "../../../src";
import { getBootedUpDumdict } from "../../../src/testing/boot";

const encounter = {
	sentence: {
		id: "bank",
		language: "de",
		segments: [{ kind: "ResolvableText", text: "Bank" }],
	},
	target: { family: "Lexeme", kind: "NOUN", memberSegmentIndices: [0] },
} as const satisfies Encounter<"de">;
const note = { attestedTranslations: [], attestations: [], notes: "" };
const bank: Dumling.Lemma<"de", "Lexeme", "NOUN"> = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem", hyph: null },
};
const bankReading: Dumling.Reading<"de", "Lexeme", "NOUN"> = {
	unitKind: "Reading",
	lemma: bank,
	emojiDescription: "💰",
};

test("an independently classified encounter reaches dictionary storage and pending-target projection through the new packages", async () => {
	const outputs: unknown[] = [
		{
			memberOrthographies: ["Standard"],
			normalizedMembers: ["Bank"],
			surface: {
				spelling: "Canonical",
				surfaceFeatures: null,
				inflectionalFeatures: null,
			},
			lemma: {
				canonicalForm: "Bank",
				coreFeatures: { gender: "Fem", hyph: null },
			},
			realizationCoverage: "Full",
			articleEvidence: null,
		},
		"💰",
		{
			semanticRelations: {
				synonym: [
					{ canonicalForm: "Geldinstitut", kind: "NOUN" },
					{ canonicalForm: "Sparkasse", kind: "PROPN" },
				],
			},
		},
	];
	const stages: string[] = [];
	const grammarExecutor = grammarFixture(outputs[0]);
	const knowledgeExecutor = knowledgeFixture(outputs[2]);
	const dumgen = createDumgen({
		judge: (request, options) =>
			Object.hasOwn(request.questions, "kind_0")
				? knowledgeExecutor.judge(request, options)
				: grammarExecutor.judge(request, options),
		execute: async (request) => {
			stages.push(request.stage);
			return request.stage === "produceKnowledge"
				? knowledgeExecutor.execute(request)
				: { output: outputs[1] };
		},
	});
	const { dict, storage } = getBootedUpDumdict("de");
	expect(storage.loadAll()).toEqual([]);
	const grammar = await Effect.runPromise(dumgen.resolveGrammar(encounter));
	const parsed = parseUnit(grammar, {
		unitKind: "Attestation",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
	});
	if (!parsed.success) throw parsed.error;
	const surface = parsed.chain.value.surface;
	const { emojiDescription } = await Effect.runPromise(
		dumgen.resolveOrGenerateReadingEmojiDescription({
			candidates: [],
			encounter,
			lemma: surface.lemma,
		}),
	);
	const reading: Dumling.Reading<"de", "Lexeme", "NOUN"> = {
		unitKind: "Reading",
		lemma: surface.lemma,
		emojiDescription,
	};
	await Effect.runPromise(
		dict.ensureReadingEntry({ entry: { reading, ...note } }),
	);
	await Effect.runPromise(
		dict.ensureOwnedSurface({ reading, ownedSurface: { surface, note } }),
	);
	await Effect.runPromise(
		dict.ensureOwnedSurface({ reading, ownedSurface: { surface, note } }),
	);
	await Effect.runPromise(
		dict.addAttestation({ reading, attestation: "Bank" }),
	);
	const institution: Dumling.Reading<"de", "Lexeme", "NOUN"> = {
		unitKind: "Reading",
		lemma: {
			...bank,
			canonicalForm: "Geldinstitut",
			coreFeatures: { gender: "Neut", hyph: null },
		},
		emojiDescription: "🏦",
	};
	await Effect.runPromise(
		dict.ensureReadingEntry({ entry: { reading: institution, ...note } }),
	);
	const knowledge = await Effect.runPromise(
		dumgen.produceKnowledge({
			encounter,
			reading,
			request: { semanticRelations: { synonym: null } },
		}),
	);
	await Effect.runPromise(
		dict.applyGeneratedKnowledge({ reading, ...knowledge }),
	);
	const stored = storage.loadAll();
	const entries = stored.flatMap((value) => value.readingEntries);
	expect(stored.flatMap((value) => value.ownedSurfaceEntries)).toHaveLength(
		1,
	);
	expect(
		entries.find((entry) => entry.reading.emojiDescription === "💰")
			?.knowledge?.semanticRelations,
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
		entries.find((entry) => entry.reading.emojiDescription === "🏦")
			?.knowledge,
	).toBeUndefined();
	const candidates = await Effect.runPromise(
		dict.findStoredReadings({ lemma: reading.lemma }),
	);
	expect(candidates.candidates.map((value) => value.reading)).toEqual([
		reading,
	]);
	expect(stages).toHaveLength(2);
	expect(
		stages.some((stage) => stage.toLowerCase().includes("classif")),
	).toBe(false);
});

test("conflicting Knowledge changes reject the whole batch and competing plans keep revision checks", async () => {
	const { dict, storage } = getBootedUpDumdict("de");
	await Effect.runPromise(
		dict.ensureReadingEntry({ entry: { reading: bankReading, ...note } }),
	);
	const before = storage.loadAll();
	const failed = await Effect.runPromise(
		Effect.either(
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
	expect(failed._tag).toBe("Left");
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
		Effect.either(
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
	expect(result._tag).toBe("Left");
	expect(storage.loadAll()).toEqual(before);
});
