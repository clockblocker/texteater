import { describe, expect, test } from "bun:test";
import { readingFingerprint } from "dumling/id";
import type { UnitShadow } from "dumrel/types";
import type {
	DumdictPendingSemanticRelation,
	PendingSemanticRelationRecord,
} from "../../src/dto";
import {
	assertPendingSemanticRelationRecordIdentity,
	createPendingSemanticRelationRecord,
	deduplicatePendingSemanticRelationRecords,
	derivePendingEntryId,
	derivePendingSemanticRelationLocator,
	pendingSemanticRelationLocatorKey,
	samePendingSemanticRelationLocator,
} from "../../src/pending";
import { englishRunReading, englishWalkReading } from "../fixtures/en-notes";

const pending = (
	overrides: Partial<DumdictPendingSemanticRelation<"en">> = {},
): DumdictPendingSemanticRelation<"en"> => ({
	relation: "nearSynonym",
	target: {
		language: "en",
		canonicalForm: "swim",
		family: "Lexeme",
		kind: "VERB",
	},
	...overrides,
});

describe("Pending Semantic Relation identity", () => {
	test("constructs the canonical record and complete locator", () => {
		const value = pending({
			target: {
				language: "en",
				canonicalForm: "  cafe\u0301  ",
				family: "Lexeme",
				kind: "NOUN",
			},
		});

		const record = createPendingSemanticRelationRecord(
			englishWalkReading,
			value,
		);

		expect(record.pending.target.canonicalForm).toBe("caf\u00e9");
		expect(record.locator).toEqual({
			sourceReadingKey: readingFingerprint(englishWalkReading),
			relation: "nearSynonym",
			targetPendingId: derivePendingEntryId(record.pending.target),
		});
		expect(record.locator).toEqual(
			derivePendingSemanticRelationLocator(
				englishWalkReading,
				record.pending,
			),
		);
	});

	test("derives identity from every normalized Unit Shadow field", () => {
		const normalized = {
			language: "en",
			canonicalForm: "caf\u00e9",
			family: "Lexeme",
			kind: "NOUN",
		} satisfies UnitShadow<"en">;
		const equivalent = {
			...normalized,
			canonicalForm: "  cafe\u0301 ",
		};
		const distinct = [
			{ ...normalized, language: "de" },
			{ ...normalized, canonicalForm: "Kaffee" },
			{ ...normalized, family: "Morpheme" },
			{ ...normalized, kind: "VERB" },
		] as UnitShadow[];

		expect(derivePendingEntryId(equivalent)).toBe(
			derivePendingEntryId(normalized),
		);
		expect(
			new Set([
				derivePendingEntryId(normalized),
				...distinct.map(derivePendingEntryId),
			]).size,
		).toBe(5);
	});

	test("compares, keys, and deduplicates by the exact locator", () => {
		const first = createPendingSemanticRelationRecord(
			englishWalkReading,
			pending(),
		);
		const repeated = structuredClone(first);
		const differentSource = createPendingSemanticRelationRecord(
			englishRunReading,
			pending(),
		);
		const differentRelation = createPendingSemanticRelationRecord(
			englishWalkReading,
			pending({ relation: "antonym" }),
		);
		const differentTarget = createPendingSemanticRelationRecord(
			englishWalkReading,
			pending({ target: { ...pending().target, kind: "NOUN" } }),
		);

		expect(
			samePendingSemanticRelationLocator(first.locator, repeated.locator),
		).toBe(true);
		expect(pendingSemanticRelationLocatorKey(first.locator)).toBe(
			pendingSemanticRelationLocatorKey(repeated.locator),
		);
		expect(
			deduplicatePendingSemanticRelationRecords([
				first,
				repeated,
				differentSource,
				differentRelation,
				differentTarget,
			]),
		).toEqual([first, differentSource, differentRelation, differentTarget]);
	});

	test.each([
		[
			"source Reading key",
			(record: PendingSemanticRelationRecord<"en">) => ({
				...record,
				locator: { ...record.locator, sourceReadingKey: "forged" },
			}),
			"wrong source Reading key",
		],
		[
			"relation",
			(record: PendingSemanticRelationRecord<"en">) => ({
				...record,
				locator: { ...record.locator, relation: "antonym" as const },
			}),
			"wrong relation",
		],
		[
			"target Pending Entry ID",
			(record: PendingSemanticRelationRecord<"en">) => ({
				...record,
				locator: { ...record.locator, targetPendingId: "forged" },
			}),
			"wrong target Pending Entry ID",
		],
	] as const)(
		"rejects a locator with the wrong %s",
		(_field, forge, error) => {
			const record = createPendingSemanticRelationRecord(
				englishWalkReading,
				pending(),
			);
			expect(() =>
				assertPendingSemanticRelationRecordIdentity(forge(record)),
			).toThrow(error);
		},
	);
});
