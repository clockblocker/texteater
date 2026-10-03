import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { authoredInventory } from "../../../src/segment/de/inventory.js";
import { storedIdentity } from "../../../src/segment/de/routing.js";
import { segmentGermanUnits } from "../../../src/segment/de/units.js";
import { segmentsOf } from "../../spec-corpus/fixtures.js";
import { fakeJudge, noul, picked, route } from "./fake-judge.js";

// Dieser0 _1 kommt2 .3
const dieserKommt = segmentsOf("Dieser kommt.");
const candidates = authoredInventory.identityCandidates("Dieser");
const position = (kind: "DET" | "PRON") => {
	const found = candidates.findIndex(
		(candidate) =>
			candidate.kind === kind && candidate.canonicalForm === "dieser",
	);
	if (found < 0) throw Error(`No ${kind} dieser candidate`);
	return `c${found}`;
};
const det = position("DET");
const pron = position("PRON");

test("a one-piece DET or PRON unit stores the identity its Choice picked", async () => {
	const units = await Effect.runPromise(
		segmentGermanUnits(
			{ segments: dieserKommt },
			fakeJudge({
				i_1: picked(pron, { [pron]: 0.8, [det]: 0.2 }),
				tm_1: noul(0.1),
				r_2: picked("Lexeme/VERB"),
			}).ask,
		),
	);
	expect(units[0]).toEqual({
		segments: [0],
		route: route("Lexeme", "PRON"),
		identity: { kind: "PRON", canonicalForm: "dieser", pronType: "Dem" },
	});
	expect(units[1]).toEqual({ segments: [2], route: route("Lexeme", "VERB") });
});

test("when the DET/PRON Rule test flips the Kind, the same Choice's most probable candidate of the final Kind is stored", async () => {
	const units = await Effect.runPromise(
		segmentGermanUnits(
			{ segments: dieserKommt },
			fakeJudge({
				// The pick says DET, but dieser modifies no noun: PRON.
				i_1: picked(det, { [det]: 0.6, [pron]: 0.3, Other: 0.1 }),
				tm_1: noul(0.2),
				r_2: picked("Lexeme/VERB"),
			}).ask,
		),
	);
	expect(units[0]).toEqual({
		segments: [0],
		route: route("Lexeme", "PRON"),
		identity: { kind: "PRON", canonicalForm: "dieser", pronType: "Dem" },
	});
});

test("an identity Choice answered Other stores none, and the open route decides", async () => {
	const units = await Effect.runPromise(
		segmentGermanUnits(
			{ segments: dieserKommt },
			fakeJudge({
				i_1: picked("Other"),
				r_1: picked("Lexeme/PRON"),
				r_2: picked("Lexeme/VERB"),
			}).ask,
		),
	);
	expect(units[0]).toEqual({ segments: [0], route: route("Lexeme", "PRON") });
});

test("storedIdentity keeps only an identity of the final route's Kind", () => {
	const pick = {
		candidates,
		choice: det,
		probabilities: { [det]: 0.7, [pron]: 0.3 },
	};
	expect(storedIdentity(pick, "Lexeme/DET")).toEqual({
		kind: "DET",
		canonicalForm: "dieser",
		pronType: "Dem",
	});
	expect(storedIdentity(pick, "Lexeme/PRON")?.kind).toBe("PRON");
	expect(storedIdentity(pick, "Lexeme/ADV")).toBeUndefined();
	expect(
		storedIdentity({ ...pick, choice: "Other" }, "Lexeme/DET"),
	).toBeUndefined();
	expect(storedIdentity(undefined, "Lexeme/DET")).toBeUndefined();
	const meinem = authoredInventory.identityCandidates("meinem");
	const possessive = meinem.findIndex(
		(candidate) => candidate.kind === "DET" && candidate.poss,
	);
	expect(
		storedIdentity(
			{
				candidates: meinem,
				choice: `c${possessive}`,
				probabilities: { [`c${possessive}`]: 1 },
			},
			"Lexeme/DET",
		),
	).toEqual({
		kind: "DET",
		canonicalForm: "mein",
		pronType: "Prs",
		poss: "Yes",
	});
});
