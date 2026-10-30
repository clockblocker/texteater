import { describe, expect, test } from "bun:test";
import { checkBreakdownRecord } from "../src/check-breakdown.js";
import {
	germanStemCitations,
	isGermanAttributiveForm,
} from "../src/inventories/de/adjective-declension.js";
import {
	germanLexemePartTargets,
	germanSeparableParticles,
} from "../src/inventories/de/verb-prefixes.js";
import { loadBreakdownRecords } from "../src/load.js";
import { seedJson } from "./negative-fixtures.js";

// The user's Breakdown rulings of 2026-10-24 and 2026-10-25 on #1241.

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

	test("break a phrasal compound down flat, its front phrase never one Locution part (2026-10-30)", () => {
		expect(constituents("trimm-dich-pfad")).toEqual([
			"Trimm → Lexeme VERB trimmen",
			"-",
			"dich → Lexeme PRON sich",
			"-",
			"Pfad → Lexeme NOUN Pfad",
		]);
		expect(constituents("rund-um-die-uhr-betreuung")).toEqual([
			"Rund → Lexeme ADJ rund",
			"-",
			"um → Lexeme ADP um",
			"-",
			"die-Uhr → Lexeme NOUN Uhr",
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

describe("Breakdown rulings of 2026-10-25", () => {
	test("let an adjective first part show its frozen attributive ending", () => {
		expect(constituents("langeweile")).toEqual([
			"Lange → Lexeme ADJ lang",
			"weile → Lexeme NOUN Weile",
		]);
		expect(constituents("hohepriester")).toEqual([
			"Hohe → Lexeme ADJ hoch",
			"priester → Lexeme NOUN Priester",
		]);
		expect(constituents("hohen-cremmen")).toEqual([
			"Hohen → Lexeme ADJ hoch",
			"-",
			"Cremmen → Lexeme PROPN Cremmen",
		]);
	});

	test("tolerate the attributive ending on an adjective target only", () => {
		const id = "breakdown/de/langeweile";
		const json = seedJson(id);
		json.knowledge.breakdown.constituents[0].target = {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Lang",
			coreFeatures: { gender: "Fem" },
		};
		expect(failures(id, json)).toEqual([
			"Breakdown knowledge.breakdown.constituents.0.letters",
		]);
	});

	test("build an adjective's attributive forms from its declension stems", () => {
		const fits: [string, string][] = [
			["Hohen", "hoch"],
			["dunkle", "dunkel"],
			["teure", "teuer"],
			["leisen", "leise"],
			["kleines", "klein"],
		];
		for (const [letters, adjective] of fits)
			expect(
				`${letters} ${isGermanAttributiveForm(letters, adjective)}`,
			).toBe(`${letters} true`);
		const misfits: [string, string][] = [
			["Hohe", "hohl"],
			["Langs", "lang"],
			["Lang", "lange"],
		];
		for (const [letters, adjective] of misfits)
			expect(
				`${letters} ${isGermanAttributiveForm(letters, adjective)}`,
			).toBe(`${letters} false`);
		expect(germanStemCitations("hoh")).toEqual(["hoh", "hoch"]);
		expect(germanStemCitations("dunkl")).toEqual(["dunkl", "dunkel"]);
		expect(germanStemCitations("teur")).toEqual(["teur", "teuer"]);
		expect(germanStemCitations("hell")).toEqual(["hell"]);
	});
});
