import { describe, expect, test } from "bun:test";
import { readingIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";

import { migrateV1toV2, ParsingError } from "../../../src";
import {
	bank,
	bankSingular,
	bench,
	moneyBank,
	surfaceEntry,
} from "../../../src/testing/storage-conformance/occurrence-fixtures";

const verb: Dumling.Lemma<"de", "Lexeme", "VERB"> = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "VERB",
	canonicalForm: "senden",
	coreFeatures: { lexicallyReflexive: null, hasSepPrefix: null },
};
const mail = {
	unitKind: "Reading",
	lemma: verb,
	emojiDescription: "📨",
} as const;
const radio = {
	unitKind: "Reading",
	lemma: verb,
	emojiDescription: "📡",
} as const;
const plain = {
	unitKind: "Reading",
	lemma: verb,
	emojiDescription: "🙂",
} as const;

const entry = (
	reading: Dumling.Reading<"de">,
	knowledge: unknown,
	attestations: string[] = [],
) => ({
	reading,
	knowledge,
	attestedTranslations: [],
	attestations,
	notes: "",
});

const sendenV1 = (readings: ReturnType<typeof entry>[]) => ({
	schemaVersion: 1,
	lemmaRecord: { lemma: verb },
	readingEntries: readings,
	ownedSurfaceEntries: [],
	pendingRelations: [],
});

describe("migrateV1toV2", () => {
	const readings = [
		entry(mail, {
			preterite: ["sandte", "sendete"],
			conjugationClass: "Mixed",
			definition: "schicken",
		}),
		entry(radio, { preterite: ["sendete"] }),
		entry(plain, {}),
	];

	test("pools principal parts into the Lemma Paradigm, with explicit and Unstated Licences", () => {
		const note = migrateV1toV2(sendenV1(readings), "de");
		if (note instanceof ParsingError) throw note;
		expect(note.schemaVersion).toBe(2);
		expect(note.lemmaRecord.paradigm).toEqual({
			dimensions: {
				preterite: {
					variants: [
						{
							id: "sandte",
							value: "sandte",
							provenance: "Migrated",
						},
						{
							id: "sendete",
							value: "sendete",
							provenance: "Migrated",
						},
					],
					licences: Object.fromEntries(
						[
							[readingIdentityKey(mail), ["sandte", "sendete"]],
							[readingIdentityKey(radio), ["sendete"]],
						].sort(([left], [right]) =>
							String(left) < String(right) ? -1 : 1,
						),
					),
				},
			},
		});
		// The class is derived from forms, so it is dropped; the rest stays.
		expect(note.readingEntries.map(({ knowledge }) => knowledge)).toEqual([
			{ definition: "schicken" },
			undefined,
			undefined,
		]);
	});

	test("is deterministic whatever the Readings' order", () => {
		const forward = migrateV1toV2(sendenV1(readings), "de");
		const backward = migrateV1toV2(sendenV1([...readings].reverse()), "de");
		if (forward instanceof ParsingError || backward instanceof ParsingError)
			throw new Error("Expected both notes to migrate.");
		expect(backward.lemmaRecord).toEqual(forward.lemmaRecord);
		expect([...backward.readingEntries].reverse()).toEqual(
			forward.readingEntries,
		);
	});

	test("turns attestation strings into links, each ref once, naming the one Surface that lists it", () => {
		const note = migrateV1toV2(
			{
				schemaVersion: 1,
				lemmaRecord: { lemma: bank },
				readingEntries: [
					entry(bench, {}, [
						"Auf der Bank.",
						"Am Ufer.",
						"Auf der Bank.",
					]),
					entry(moneyBank, {}, ["Am Ufer."]),
				],
				ownedSurfaceEntries: [
					{
						...surfaceEntry(bankSingular),
						attestations: ["Auf der Bank."],
					},
				],
				pendingRelations: [],
			},
			"de",
		);
		if (note instanceof ParsingError) throw note;
		const shared = { ref: "Am Ufer.", surfaceId: null };
		const sharedKeptBy =
			readingIdentityKey(bench) < readingIdentityKey(moneyBank)
				? "bench"
				: "moneyBank";
		expect(
			note.readingEntries.map(({ attestationLinks }) => attestationLinks),
		).toEqual([
			[
				{
					ref: "Auf der Bank.",
					surfaceId: surfaceEntry(bankSingular).id,
					reading: bench,
				},
				...(sharedKeptBy === "bench"
					? [{ ...shared, reading: bench }]
					: []),
			],
			sharedKeptBy === "moneyBank"
				? [{ ...shared, reading: moneyBank }]
				: [],
		]);
		expect(note.lemmaRecord).toEqual({ lemma: bank });
	});

	test("refuses what is no version 1 note, or a principal part the Paradigm refuses", () => {
		expect(migrateV1toV2({ schemaVersion: 2 }, "de")).toBeInstanceOf(
			ParsingError,
		);
		expect(
			migrateV1toV2(
				sendenV1([entry(mail, { pastParticiple: ["gesend"] })]),
				"de",
			),
		).toBeInstanceOf(ParsingError);
		expect(
			migrateV1toV2(
				{
					...sendenV1([]),
					lemmaRecord: { lemma: { ...verb, language: "en" } },
				},
				"de",
			),
		).toBeInstanceOf(ParsingError);
	});
});
