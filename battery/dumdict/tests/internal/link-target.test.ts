import { describe, expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import {
	linkTargetKey,
	makeSurfaceId,
	pendingRelationTarget,
	resolveShadow,
	spellingTarget,
} from "../../src";
import {
	derSee,
	derSeeReading,
	dieSee,
	gehen,
	gehenSurface,
	meerSeePendingRecord,
	seeShadow,
} from "../../src/testing/storage-conformance/fixtures";

describe("resolveShadow", () => {
	test("gives the one matching Lemma", () => {
		expect(resolveShadow(seeShadow, [derSee, gehen])).toEqual({
			kind: "Lemma",
			lemma: derSee,
		});
	});

	test("gives the Shadow's Spelling when no Lemma or several match", () => {
		const see = spellingTarget("de", "See");
		expect(see).toEqual({ kind: "Spelling", language: "de", key: "see" });
		expect(resolveShadow(seeShadow, [])).toEqual(see);
		expect(resolveShadow(seeShadow, [gehen])).toEqual(see);
		expect(resolveShadow(seeShadow, [derSee, dieSee])).toEqual(see);
	});

	test("counts a Lemma once by identity and ignores order", () => {
		const lowerCased = { ...derSee, canonicalForm: "see" };
		expect(resolveShadow(seeShadow, [derSee, lowerCased])).toEqual({
			kind: "Lemma",
			lemma: lowerCased,
		});
		expect(resolveShadow(seeShadow, [dieSee, derSee])).toEqual(
			resolveShadow(seeShadow, [derSee, dieSee]),
		);
	});

	test("matches the Canonical Form as Lemma identity does, and only on its route", () => {
		expect(
			resolveShadow({ ...seeShadow, canonicalForm: "SEE" }, [derSee]),
		).toEqual({ kind: "Lemma", lemma: derSee });
		expect(
			resolveShadow({ ...seeShadow, kind: "PROPN" }, [derSee]),
		).toEqual(spellingTarget("de", "See"));
	});
});

describe("spellingTarget", () => {
	test("keys a Crossroad by canonicalFormKey, so variant spellings stay apart", () => {
		expect(spellingTarget("de", "KUSS")).toEqual(
			spellingTarget("de", "Kuss"),
		);
		expect(spellingTarget("de", "Kuß").key).not.toBe(
			spellingTarget("de", "Kuss").key,
		);
	});
});

describe("linkTargetKey", () => {
	test("gives equal targets one key and different targets different keys", () => {
		const surfaceId = makeSurfaceId("de", gehenSurface);
		const targets = [
			spellingTarget("de", "See"),
			{ kind: "Lemma", lemma: derSee },
			{ kind: "Lemma", lemma: dieSee },
			{ kind: "Reading", reading: derSeeReading },
			{ kind: "Surface", surfaceId },
		] as const;
		expect(new Set(targets.map(linkTargetKey)).size).toBe(targets.length);
		const lowerCased: Dumling.Lemma<"de"> = {
			...derSee,
			canonicalForm: "see",
		};
		expect(linkTargetKey({ kind: "Lemma", lemma: lowerCased })).toBe(
			linkTargetKey({ kind: "Lemma", lemma: derSee }),
		);
	});
});

describe("pendingRelationTarget", () => {
	test("gives a stored relation's resolved Lemma, or else its Shadow's Spelling", () => {
		expect(pendingRelationTarget(meerSeePendingRecord)).toEqual(
			spellingTarget("de", "See"),
		);
		expect(
			pendingRelationTarget({
				...meerSeePendingRecord,
				resolvedLemma: derSee,
			}),
		).toEqual({ kind: "Lemma", lemma: derSee });
	});
});
