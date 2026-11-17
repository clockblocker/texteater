import { expect, test } from "bun:test";
import { authoredRealizations } from "dumcorpus/inventories";
import * as Effect from "effect/Effect";
import { authoredInventory } from "../../../src/segment/de/inventory.js";
import { storedIdentity } from "../../../src/segment/de/routing.js";
import { segmentsOf } from "../../lab/evaluation/spec-corpus/fixtures.js";
import { fakeJudge, germanUnits, noul, picked, route } from "./fake-judge.js";

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
		germanUnits(
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
		germanUnits(
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

test("an identity Choice answered Other still stores the most probable member of the Kind the route Choice gives", async () => {
	const units = await Effect.runPromise(
		germanUnits(
			{ segments: dieserKommt },
			fakeJudge({
				i_1: picked("Other", { Other: 0.5, [pron]: 0.3, [det]: 0.2 }),
				r_1: picked("Lexeme/PRON"),
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

test("the placeholder Es of Der Zauberberg's Ankunft stores PRON es though the identity Choice answered Other", async () => {
	// Es0 _1 geht2 _3 durch4 _5 mehrerer6 _7 Herren8 _9 Länder10 ,11 …
	const segments = segmentsOf(
		"Es geht durch mehrerer Herren Länder, bergauf und bergab, von der süddeutschen Hochebene hinunter zum Gestade des Schwäbischen Meeres und zu Schiff über seine springenden Wellen hin, dahin über Schlünde, die früher für unergründlich galten.",
	);
	const units = await Effect.runPromise(
		germanUnits(
			{ segments },
			fakeJudge({
				// What jev answered at intake (2026-11-17), before the es
				// candidate described the uses that refer to nothing.
				i_1: picked("Other", { c0: 0.44, Other: 0.56 }),
				r_1: picked("Lexeme/PRON", { "Lexeme/PRON": 0.56 }),
				r_2: picked("Lexeme/VERB"),
				i_4: picked("c0", { c0: 0.76, c1: 0.03, Other: 0.21 }),
				tm_4: noul(0.9),
			}).ask,
		),
	);
	expect(units[0]).toEqual({
		segments: [0],
		route: route("Lexeme", "PRON"),
		identity: { kind: "PRON", canonicalForm: "es", pronType: "Prs" },
	});
	expect(units.find((unit) => unit.segments[0] === 6)).toEqual({
		segments: [6],
		route: route("Lexeme", "DET"),
		identity: { kind: "DET", canonicalForm: "mehrere", pronType: "Ind" },
	});
});

test("a DET or PRON route stores an identity whenever the spelling realizes an authored member of its Kind, whatever the identity Choice answered", () => {
	const spellings = new Set(
		authoredRealizations.map(({ spelled }) => spelled.toLowerCase()),
	);
	let checked = 0;
	for (const spelling of spellings) {
		const options = authoredInventory.identityCandidates(spelling);
		if (options.length === 0) continue;
		const choices = [...options.map((_, at) => `c${at}`), "Other"];
		for (const answer of choices)
			for (const kind of ["DET", "PRON"] as const) {
				const stored = storedIdentity(
					{
						candidates: options,
						choice: answer,
						probabilities: { [answer]: 1 },
					},
					`Lexeme/${kind}`,
				);
				const authored = options.filter(
					(option) => option.kind === kind,
				);
				expect(stored === undefined).toBe(authored.length === 0);
				if (stored)
					expect(
						authored.some(
							(option) =>
								option.canonicalForm === stored.canonicalForm &&
								option.pronType === stored.pronType &&
								option.poss === (stored.poss === "Yes"),
						),
					).toBe(true);
				checked += 1;
			}
	}
	expect(checked).toBeGreaterThan(100);
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
		storedIdentity({ ...pick, choice: "Other" }, "Lexeme/DET")?.kind,
	).toBe("DET");
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
