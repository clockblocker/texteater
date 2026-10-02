import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { internal } from "../convex/_generated/api";
import type { TableNames } from "../convex/_generated/dataModel";
import {
	createDumdictTransaction,
	type DumdictTransaction,
} from "../convex/dumdictTransaction";
import { shadowKeyFor } from "../convex/model/shadows";
import {
	lemmaIdentityKey,
	readingIdentityKey,
} from "../server/linguisticIdentity";
import { createTestConvex, type TestConvexDb } from "./support/convex";

beforeEach(() => {
	// Scheduled work, such as Definition Text materialization, never runs here.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

const interjection = (canonicalForm: string) =>
	({
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "INTJ",
		canonicalForm,
		coreFeatures: { partType: null },
	}) satisfies Dumling.Lemma<"de", "Lexeme", "INTJ">;
const morgenNoun = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Morgen",
	coreFeatures: { gender: "Masc" },
} satisfies Dumling.Lemma<"de", "Lexeme", "NOUN">;
const morgenAdverb = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "ADV",
	canonicalForm: "morgen",
	coreFeatures: { comparable: null },
} satisfies Dumling.Lemma<"de", "Lexeme", "ADV">;

const reading = (lemma: Dumling.Lemma<"de">, emojiDescription: string) =>
	({ unitKind: "Reading", lemma, emojiDescription }) as Dumling.Reading<"de">;
const note = { attestedTranslations: [], attestations: [], notes: "" };

function inTransaction<Result>(
	t: TestConvexDb,
	run: (dictionary: DumdictTransaction) => Promise<Result>,
) {
	return t.run((ctx) => run(createDumdictTransaction(ctx)));
}

function addNote(t: TestConvexDb, value: Dumling.Reading<"de">) {
	return inTransaction(t, (dictionary) =>
		dictionary.addNewNote({ draft: { reading: value, note } }),
	);
}

function rows<Table extends TableNames>(t: TestConvexDb, table: Table) {
	return t.run((ctx) => ctx.db.query(table).collect());
}

describe("case-folded Lemma identity (system ADR 0002)", () => {
	test("INTJ LOL and lol resolve to one Lemma", async () => {
		const t = createTestConvex();
		const laughing = reading(interjection("LOL"), "😂");
		expect(await addNote(t, laughing)).toMatchObject({
			status: "committed",
		});

		expect(
			await t.query(internal.dumdictStorage.queries.findStoredReadings, {
				lemmaKey: lemmaIdentityKey(interjection("lol")),
			}),
		).toEqual([laughing]);
		expect(
			await addNote(t, reading(interjection("lol"), "😂")),
		).toMatchObject({ status: "rejected", code: "readingAlreadyExists" });
		expect(
			await addNote(t, reading(interjection("lol"), "🤣")),
		).toMatchObject({ status: "committed" });

		const lemmas = await rows(t, "lemmas");
		expect(
			lemmas.map(({ canonicalForm, foldedCanonicalForm }) => ({
				canonicalForm,
				foldedCanonicalForm,
			})),
		).toEqual([{ canonicalForm: "LOL", foldedCanonicalForm: "lol" }]);
		expect(
			(await rows(t, "readings")).map(
				({ lemmaId, emojiDescription }) => ({
					lemmaId,
					emojiDescription,
				}),
			),
		).toEqual([
			{ lemmaId: lemmas[0]?._id, emojiDescription: "😂" },
			{ lemmaId: lemmas[0]?._id, emojiDescription: "🤣" },
		]);
	});

	test("a pending INTJ lol Shadow resolves when LOL is stored", async () => {
		const t = createTestConvex();
		const giggling = reading(interjection("haha"), "😆");
		await inTransaction(t, (dictionary) =>
			dictionary.addNewNote({
				draft: {
					reading: giggling,
					note,
					relations: [
						{
							target: {
								kind: "pending",
								pending: {
									relation: "nearSynonym",
									target: {
										language: "de",
										canonicalForm: "lol",
										family: "Lexeme",
										kind: "INTJ",
									},
								},
							},
						},
					],
				},
			}),
		);
		expect(
			(await rows(t, "pendingSemanticRelations")).map(
				({ targetFoldedCanonicalForm }) => targetFoldedCanonicalForm,
			),
		).toEqual(["lol"]);
		expect(
			(await rows(t, "shadows")).map(({ shadowKey }) => shadowKey),
		).toEqual([
			shadowKeyFor({
				language: "de",
				canonicalForm: "LOL",
				family: "Lexeme",
				kind: "INTJ",
			}),
		]);

		expect(
			await addNote(t, reading(interjection("LOL"), "😂")),
		).toMatchObject({ status: "committed" });
		expect(await rows(t, "pendingSemanticRelations")).toEqual([]);
		const [laughingLemma] = await rows(t, "lemmas").then((stored) =>
			stored.filter(({ canonicalForm }) => canonicalForm === "LOL"),
		);
		const [gigglingReading] = await rows(t, "readings").then((stored) =>
			stored.filter(
				({ readingKey }) => readingKey === readingIdentityKey(giggling),
			),
		);
		expect(
			(await rows(t, "semanticRelationEdges")).map(
				({ sourceReadingId, targetLemmaId, relation }) => ({
					sourceReadingId,
					targetLemmaId,
					relation,
				}),
			),
		).toEqual([
			{
				sourceReadingId: gigglingReading?._id,
				targetLemmaId: laughingLemma?._id,
				relation: "nearSynonym",
			},
		]);
	});

	test("NOUN Morgen and ADV morgen stay two Lemmas", async () => {
		const t = createTestConvex();
		await addNote(t, reading(morgenNoun, "🌅"));

		expect(
			await t.query(internal.dumdictStorage.queries.findStoredReadings, {
				lemmaKey: lemmaIdentityKey(morgenAdverb),
			}),
		).toEqual([]);
		expect(await addNote(t, reading(morgenAdverb, "📅"))).toMatchObject({
			status: "committed",
		});
		expect(
			(await rows(t, "lemmas")).map(({ kind, foldedCanonicalForm }) => ({
				kind,
				foldedCanonicalForm,
			})),
		).toEqual([
			{ kind: "NOUN", foldedCanonicalForm: "morgen" },
			{ kind: "ADV", foldedCanonicalForm: "morgen" },
		]);
	});
});
