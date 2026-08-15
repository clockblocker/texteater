import { describe, expect, test } from "bun:test";
import {
	derivePendingEntryId,
	englishSwimCitationSurface,
	englishSwimDraft,
	englishSwimReading,
	englishWalkReading,
	enSerializedNotes,
	germanGehenReading,
	getBootedUpDumdict,
} from "./helpers";

const pendingWalkFast = {
	target: {
		kind: "pending" as const,
		pending: {
			relation: "nearSynonym" as const,
			target: {
				language: "en" as const,
				canonicalForm: "walk fast",
				family: "Lexeme" as const,
				kind: "VERB" as const,
			},
		},
	},
};

describe("configured service relation writes", () => {
	test("rejects only a concrete Reading self relation", async () => {
		const direct = getBootedUpDumdict("en", enSerializedNotes);
		expect(
			await direct.dict.addNewNote({
				draft: {
					...englishSwimDraft,
					relations: [
						{
							relation: "nearSynonym",
							target: {
								kind: "existing",
								reading: englishSwimReading,
							},
						},
					],
				},
			}),
		).toMatchObject({ status: "rejected", code: "selfRelation" });
	});

	test("keeps a same-Lemma Unit Shadow pending because it does not identify a Reading", async () => {
		const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);
		expect(
			await dict.addNewNote({
				draft: {
					...englishSwimDraft,
					relations: [
						{
							target: {
								kind: "pending",
								pending: {
									relation: "nearSynonym",
									target: {
										language: "en",
										canonicalForm: "swim",
										family: "Lexeme",
										kind: "VERB",
									},
								},
							},
						},
					],
				},
			}),
		).toMatchObject({ status: "applied" });
		expect(
			storage
				.loadAll()
				.flatMap(({ pendingRelations }) => pendingRelations),
		).toMatchObject([
			{
				sourceReading: englishSwimReading,
				pending: {
					relation: "nearSynonym",
					target: {
						language: "en",
						canonicalForm: "swim",
						family: "Lexeme",
						kind: "VERB",
					},
				},
			},
		]);
	});

	test("materializes forward and inverse Reading Knowledge", async () => {
		const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);
		const result = await dict.addNewNote({
			draft: {
				...englishSwimDraft,
				relations: [
					{
						relation: "nearSynonym",
						target: {
							kind: "existing",
							reading: englishWalkReading,
						},
					},
				],
			},
		});
		const readings = storage
			.loadAll()
			.flatMap(({ readingEntries }) => readingEntries);
		expect(result.status).toBe("applied");
		expect(
			readings.find(({ reading }) => reading.emojiDescription === "🏊")
				?.knowledge?.semanticRelations?.nearSynonym,
		).toEqual([englishWalkReading]);
		expect(
			readings.find(({ reading }) => reading.emojiDescription === "🚶")
				?.knowledge?.semanticRelations?.nearSynonym,
		).toEqual([englishSwimReading]);
	});

	test("rejects cross-language direct and pending endpoints", async () => {
		const direct = getBootedUpDumdict("en", enSerializedNotes);
		expect(
			await direct.dict.addNewNote({
				draft: {
					...englishSwimDraft,
					relations: [
						{
							relation: "synonym",
							target: {
								kind: "existing",
								reading: germanGehenReading,
							},
						},
					] as never,
				},
			}),
		).toMatchObject({ status: "rejected", code: "invalidDraft" });
		const pending = getBootedUpDumdict("en", enSerializedNotes);
		expect(
			await pending.dict.addNewNote({
				draft: {
					...englishSwimDraft,
					relations: [
						{
							target: {
								kind: "pending",
								pending: {
									relation: "synonym",
									target: {
										language: "de",
										canonicalForm: "schwimmen",
										family: "Lexeme",
										kind: "VERB",
									},
								},
							},
						},
					] as never,
				},
			}),
		).toMatchObject({ status: "rejected", code: "invalidDraft" });
	});

	test("schema-normalizes a pending Unit Shadow before persistence", async () => {
		const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);
		await dict.addNewNote({
			draft: {
				...englishSwimDraft,
				relations: [
					{
						target: {
							kind: "pending",
							pending: {
								relation: "nearSynonym",
								target: {
									language: "en",
									canonicalForm: "  walk fast  ",
									family: "Lexeme",
									kind: "VERB",
								},
							},
						},
					},
				],
			},
		});
		const record = storage
			.loadAll()
			.flatMap(({ pendingRelations }) => pendingRelations)[0];
		expect(record?.pending.target.canonicalForm).toBe("walk fast");
	});

	test("stores and deduplicates exact Pending Semantic Relations", async () => {
		const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);
		const result = await dict.addNewNote({
			draft: {
				...englishSwimDraft,
				relations: [pendingWalkFast, pendingWalkFast],
			},
		});
		const records = storage
			.loadAll()
			.flatMap(({ pendingRelations }) => pendingRelations);
		expect(result.status).toBe("applied");
		expect(records).toHaveLength(1);
		expect(records[0]).toMatchObject({
			sourceReading: englishSwimReading,
			pending: pendingWalkFast.target.pending,
			locator: {
				relation: "nearSynonym",
				targetPendingId: derivePendingEntryId(
					pendingWalkFast.target.pending.target,
				),
			},
		});
	});

	test("deduplicates duplicate owned surfaces", async () => {
		const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);
		const owned = {
			surface: englishSwimCitationSurface,
			note: {
				attestedTranslations: ["swim"],
				attestations: ["They swim."],
				notes: "Citation.",
			},
		};
		expect(
			(
				await dict.addNewNote({
					draft: {
						...englishSwimDraft,
						ownedSurfaces: [owned, owned],
					},
				})
			).status,
		).toBe("applied");
		expect(
			storage
				.loadAll()
				.find(
					({ lemmaRecord }) =>
						lemmaRecord.lemma.canonicalForm === "swim",
				)?.ownedSurfaceEntries,
		).toHaveLength(1);
	});
});
