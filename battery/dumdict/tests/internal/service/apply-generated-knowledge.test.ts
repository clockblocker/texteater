import { describe, expect, test } from "bun:test";
import type { SerializedDictionaryNote } from "../../../src";
import { createDumdictService } from "../../../src";
import { createInMemoryTestStorage } from "../../../src/testing/in-memory-storage";
import {
	deSerializedNotes,
	germanGehenLemma,
	germanGehenReading,
} from "../../fixtures/de-notes";

const germanRennenLemma = {
	...germanGehenLemma,
	canonicalForm: "rennen",
} as const;

const germanRennenReading = {
	lemma: germanRennenLemma,
	emojiDescription: "🏃",
} as const;

function serviceFor(
	notes: SerializedDictionaryNote<"de">[] = deSerializedNotes,
) {
	const storage = createInMemoryTestStorage("de", structuredClone(notes));
	return {
		storage,
		service: createDumdictService({ language: "de", storage }),
	};
}

describe("applyGeneratedKnowledge", () => {
	test("applies base changes and preserves an unresolved relation in one commit", async () => {
		const { service, storage } = serviceFor();
		const result = await service.applyGeneratedKnowledge({
			reading: germanGehenReading,
			changes: [
				{
					kind: "Contribute",
					aspect: "transcription",
					value: "ˈɡeːən",
				},
				{
					kind: "Contribute",
					aspect: "translations",
					language: "en",
					value: ["go"],
				},
			],
			pendingRelations: [
				{
					relation: "synonym",
					target: {
						language: "de",
						canonicalForm: "spazieren",
						family: "Lexeme",
						kind: "VERB",
					},
				},
			],
		});

		expect(result.status).toBe("applied");
		const [stored] = storage.loadAll();
		expect(stored?.readingEntries[0]?.knowledge).toMatchObject({
			transcription: "ˈɡeːən",
			translations: { en: ["go"] },
		});
		expect(stored?.pendingRelations).toHaveLength(1);
		expect(stored?.pendingRelations[0]?.pending.target.canonicalForm).toBe(
			"spazieren",
		);
	});

	test("resolves a generated Unit Shadow without persisting its inverse", async () => {
		const notes = structuredClone(deSerializedNotes);
		notes.push({
			schemaVersion: 1,
			lemmaRecord: { lemma: germanRennenLemma },
			readingEntries: [
				{
					reading: germanRennenReading,
					attestedTranslations: [],
					attestations: [],
					notes: "",
				},
			],
			ownedSurfaceEntries: [],
			pendingRelations: [],
		});
		const { service, storage } = serviceFor(notes);
		const result = await service.applyGeneratedKnowledge({
			reading: germanGehenReading,
			changes: [],
			pendingRelations: [
				{
					relation: "synonym",
					target: {
						language: "de",
						canonicalForm: "rennen",
						family: "Lexeme",
						kind: "VERB",
					},
				},
			],
		});

		expect(result.status).toBe("applied");
		const stored = storage.loadAll();
		expect(
			stored[0]?.readingEntries[0]?.knowledge?.semanticRelations,
		).toEqual({ synonym: [germanRennenLemma] });
		expect(
			stored[1]?.readingEntries[0]?.knowledge?.semanticRelations,
		).toBeUndefined();
		expect(
			stored.flatMap(({ pendingRelations }) => pendingRelations),
		).toEqual([]);
	});

	test("treats an empty generated batch as a valid no-op plan", async () => {
		const { service, storage } = serviceFor();
		const before = storage.loadAll();
		const result = await service.applyGeneratedKnowledge({
			reading: germanGehenReading,
			changes: [],
			pendingRelations: [],
		});
		expect(result).toMatchObject({ status: "applied" });
		expect(storage.loadAll()).toEqual(before);
	});

	test("rejects generated Knowledge for a missing Reading", async () => {
		const { service } = serviceFor([]);
		const result = await service.applyGeneratedKnowledge({
			reading: germanGehenReading,
			changes: [],
			pendingRelations: [],
		});
		expect(result).toMatchObject({
			status: "rejected",
			code: "readingMissing",
		});
	});
});
