import { describe, expect, test } from "bun:test";
import {
	allFixedLemmaCatalogs,
	FIXED_CATALOG_SCOPE_DE_LEXEME_AUX_V1,
	fixedMembersFor,
} from "dumling/fixed";
import type { Lemma, Reading } from "dumling/types";
import { fixedKnowledgeFor } from "dumrel/fixed";
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

function fixedSeinPeerNotes(): SerializedDictionaryNote<"de">[] {
	const catalog = allFixedLemmaCatalogs().find(
		({ scope }) => scope === FIXED_CATALOG_SCOPE_DE_LEXEME_AUX_V1,
	);
	if (!catalog) throw new Error("Expected the fixed German AUX catalog.");
	return catalog.members
		.filter(
			(lemma): lemma is Lemma<"de", "Lexeme", "AUX"> =>
				lemma.language === "de" &&
				lemma.family === "Lexeme" &&
				lemma.kind === "AUX" &&
				["sein", "bin", "bist", "ist", "sind", "seid"].includes(
					lemma.canonicalForm,
				),
		)
		.map((lemma) => {
			const reading = fixedMembersFor.reading(lemma)?.members[0];
			if (!reading) {
				throw new Error(
					`Expected one fixed Reading for ${lemma.canonicalForm}.`,
				);
			}
			return {
				schemaVersion: 1,
				lemmaRecord: { lemma },
				readingEntries: [
					{
						reading: reading as unknown as Reading<"de">,
						attestedTranslations: [],
						attestations: [],
						notes: "",
					},
				],
				ownedSurfaceEntries: [],
				pendingRelations: [],
			};
		});
}

describe("applyGeneratedKnowledge", () => {
	test("admits only the reviewed exact Reading set for fixed closed-class Knowledge", async () => {
		const notes = fixedSeinPeerNotes();
		const source = notes
			.flatMap(({ readingEntries }) => readingEntries)
			.find(
				({ reading }) => reading.lemma.canonicalForm === "bin",
			)?.reading;
		if (!source) throw new Error("Expected the fixed bin Reading.");
		const fixed = fixedKnowledgeFor(source as Reading);
		if (
			fixed.decision !== "Found" ||
			fixed.knowledge.semanticRelations?.targetKind !== "reading"
		) {
			throw new Error(
				"Expected reviewed Reading-targeted fixed Knowledge.",
			);
		}
		const synonyms = (fixed.knowledge.semanticRelations.synonym ??
			[]) as Reading<"de">[];
		const { service, storage } = serviceFor(notes);
		const result = await service.applyGeneratedKnowledge({
			reading: source,
			changes: [
				{
					kind: "Contribute",
					aspect: "semanticRelations",
					relation: "synonym",
					targetKind: "reading",
					value: synonyms,
				},
			],
			pendingRelations: [],
		});

		expect(result.status).toBe("applied");
		expect(
			storage
				.loadAll()
				.flatMap(({ readingEntries }) => readingEntries)
				.find(({ reading }) => reading.lemma.canonicalForm === "bin")
				?.knowledge?.semanticRelations,
		).toEqual({ targetKind: "reading", synonym: synonyms });
	});

	test("rejects an unreviewed generated Reading-targeted relation", async () => {
		const { service } = serviceFor();
		const result = await service.applyGeneratedKnowledge({
			reading: germanGehenReading,
			changes: [
				{
					kind: "Contribute",
					aspect: "semanticRelations",
					relation: "synonym",
					targetKind: "reading",
					value: [germanRennenReading],
				},
			],
			pendingRelations: [],
		});

		expect(result).toMatchObject({
			status: "rejected",
			code: "invalidRequest",
		});
	});

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
