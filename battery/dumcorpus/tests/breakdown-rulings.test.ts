import { describe, expect, test } from "bun:test";
import { checkBreakdownRecord } from "../src/check-breakdown.js";
import {
	germanLexemePartTargets,
	germanSeparableParticles,
} from "../src/inventories/de/verb-prefixes.js";
import { loadBreakdownRecords } from "../src/load.js";
import { seedJson } from "./negative-fixtures.js";

// The user's Breakdown rulings of 2026-10-24 on #1241.

const breakdowns = loadBreakdownRecords();

/** Every check a Breakdown Record's JSON fails, Draft issues included. */
const failures = (id: string, json: unknown) => {
	const checked = checkBreakdownRecord(id, json);
	return [...checked.errors, ...checked.issues].map(
		({ check, path }) => `${check} ${path}`,
	);
};
const constituents = (name: string) => {
	const record = breakdowns.find(({ id }) => id === `breakdown/de/${name}`);
	if (!record) throw Error(`Expected breakdown/de/${name} to load`);
	return record.knowledge.breakdown?.constituents?.map(
		({ letters, target }) =>
			target
				? `${letters} → ${target.family} ${target.kind} ${target.canonicalForm}`
				: letters,
	);
};

describe("Breakdown rulings of 2026-10-24", () => {
	test("link a cranberry piece to its Root Morpheme", () => {
		expect(constituents("himbeere")).toEqual([
			"Him → Morpheme Root him",
			"beere → Lexeme NOUN Beere",
		]);
	});

	test("link E in E-Mail to the prefix e-, its hyphen as filler", () => {
		expect(constituents("e-mail")).toEqual([
			"E → Morpheme Prefix e-",
			"-",
			"Mail → Lexeme NOUN Mail",
		]);
	});

	test("break a phrasal compound down flat, unless its front phrase is a Locution", () => {
		expect(constituents("trimm-dich-pfad")).toEqual([
			"Trimm → Lexeme VERB trimmen",
			"-",
			"dich → Lexeme PRON sich",
			"-",
			"Pfad → Lexeme NOUN Pfad",
		]);
		expect(constituents("rund-um-die-uhr-betreuung")).toEqual([
			"Rund-um-die-Uhr → Locution ADV rund um die Uhr",
			"-",
			"Betreuung → Lexeme NOUN Betreuung",
		]);
	});

	test("leave an optional intensifier out of the Canonical Form", () => {
		expect(constituents("aus-dem-haeuschen-sein")).toEqual([
			"aus → Lexeme ADP aus",
			" ",
			"dem Häuschen → Lexeme NOUN Häuschen",
			" ",
			"sein → Lexeme VERB sein",
		]);
	});

	test("make the adverbs with no DWDS affix entry and the rare first parts true particles", () => {
		for (const particle of "dabei dazwischen entzwei gegenüber vorweg zuvor rückwärts aufwärts abwärts vorwärts beiseite inne umhin überein vorher zuwider zugute zunichte zuteil zustatten vonstatten vorlieb überhand bevor voneinander zueinander rum draus drum drunter".split(
			" ",
		))
			expect(
				`${particle} ${germanSeparableParticles.has(particle)}`,
			).toBe(`${particle} true`);
		expect(constituents("zunichtemachen")).toEqual([
			"zunichte → Morpheme Prefix zunichte-",
			"machen → Lexeme VERB machen",
		]);
	});

	test("link leid in leidtun to ADJ leid, never NOUN Leid", () => {
		expect(germanLexemePartTargets.leid).toEqual({
			kind: "ADJ",
			canonicalForm: "leid",
		});
		expect(constituents("leidtun")).toEqual([
			"leid → Lexeme ADJ leid",
			"tun → Lexeme VERB tun",
		]);
		const id = "breakdown/de/leidtun";
		const json = seedJson(id);
		json.knowledge.breakdown.constituents[0].target = {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Leid",
			coreFeatures: { gender: "Neut" },
		};
		expect(failures(id, json)).toEqual([
			"Breakdown knowledge.breakdown.constituents.0.target",
		]);
	});

	test("accept a reflexive form only for the reflexivity unit sich", () => {
		const id = "breakdown/de/trimm-dich-pfad";
		const json = seedJson(id);
		json.knowledge.breakdown.constituents[2].target.canonicalForm = "du";
		expect(failures(id, json)).toEqual([
			"Breakdown knowledge.breakdown.constituents.2.letters",
		]);
	});
});
