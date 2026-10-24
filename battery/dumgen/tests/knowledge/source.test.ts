import { describe, expect, test } from "bun:test";
import {
	isConversionOf,
	isShorteningOf,
} from "../../src/knowledge/de/source-letters.js";
import {
	knowledgeInput,
	knowledgeJev,
	knowledgeLuna,
	produceOnce,
} from "./support.js";

/**
 * A single word's Source (system ADR 0050): jev judges the formation, Luna
 * writes a conversion's, clipping's or acronym's base, code checks its
 * letters and jev confirms it. Participles are `structure.test.ts`'s.
 */

const noun = (canonicalForm: string, gender = "Masc") => ({
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm,
	coreFeatures: { gender },
});

/** The change that names `base` as Source, as a Unit Shadow. */
const sourceOf = (base: string, kind: string) =>
	expect.objectContaining({
		kind: "Contribute",
		aspect: "source",
		value: {
			target: {
				language: "de",
				family: "Lexeme",
				kind,
				canonicalForm: base,
			},
		},
	});

const empty = {
	changes: [],
	paradigmChanges: [],
	pendingRelations: [],
	failures: [],
};

const unresolved = [
	expect.objectContaining({ aspect: "source", code: "Unresolved" }),
];

/** One `source` run on a noun, with jev's picks and Luna's base. */
function run(
	lemma: ReturnType<typeof noun>,
	picks: Readonly<Record<string, string>>,
	base?: unknown,
) {
	const jev = knowledgeJev(picks);
	const luna = knowledgeLuna(base === undefined ? {} : { sourceBase: base });
	return {
		jev,
		luna,
		produced: produceOnce(
			{ jev: jev.ask, luna: luna.ask },
			knowledgeInput(
				lemma,
				"🏃",
				`Ein ${lemma.canonicalForm}.`,
				lemma.canonicalForm.split(" "),
				{ request: { source: null } },
			),
		),
	};
}

describe("a conversion's Source", () => {
	test("is the base Luna writes once jev confirms its direction", async () => {
		const { jev, produced } = run(
			noun("Lauf"),
			{ formation: "Conversion", direction: "Formed" },
			{ base: "laufen", kind: "VERB" },
		);
		expect((await produced).result.changes).toEqual([
			sourceOf("laufen", "VERB"),
		]);
		expect(jev.stages()).toEqual(["sourceFormation", "sourceJudgment"]);
		expect(Object.keys(jev.sent[1]?.questions ?? {})).toEqual([
			"direction",
		]);
	});

	test("is none when jev says the base came from the word, or the letters show a derivation", async () => {
		const reverse = run(
			noun("Lauf"),
			{ formation: "Conversion", direction: "Reverse" },
			{ base: "laufen", kind: "VERB" },
		);
		expect((await reverse.produced).result).toEqual(empty);

		// Entspannung is entspannen + -ung: Constituents, no Source.
		const derived = run(
			noun("Entspannung", "Fem"),
			{ formation: "Conversion" },
			{ base: "entspannen", kind: "VERB" },
		);
		expect((await derived.produced).result).toEqual(empty);
		expect(derived.jev.stages()).toEqual(["sourceFormation"]);
	});
});

describe("a clipping's or acronym's Source", () => {
	test("is the base jev confirms the word is short for", async () => {
		const { produced } = run(
			noun("Uni", "Fem"),
			{ formation: "Clipping", shortening: "Short" },
			{ base: "Universität", kind: "NOUN" },
		);
		expect((await produced).result.changes).toEqual([
			sourceOf("Universität", "NOUN"),
		]);
	});

	test("is Unresolved, never none, when no base passes, so no split is invented", async () => {
		const refused = run(
			noun("Kita", "Fem"),
			{ formation: "Acronym", shortening: "NotShort" },
			{ base: "Kindertagesstätte", kind: "NOUN" },
		);
		expect((await refused.produced).result.failures).toEqual(unresolved);

		const unwritten = run(
			noun("Kita", "Fem"),
			{ formation: "Acronym" },
			{ base: null },
		);
		expect((await unwritten.produced).result.failures).toEqual(unresolved);
		expect(unwritten.jev.stages()).toEqual(["sourceFormation"]);
	});
});

test("a word formed from no other asks Luna nothing, and an undecided formation is Unresolved", async () => {
	const plain = run(noun("Tisch"), { formation: "None" });
	expect((await plain.produced).result).toEqual(empty);
	expect(plain.luna.sent).toEqual([]);

	const undecided = run(noun("Tisch"), { formation: "Unresolved" });
	expect((await undecided.produced).result.failures).toEqual(unresolved);
});

test("a multiword Lexeme has no Source and asks nothing", async () => {
	const { jev, produced } = run(noun("Frankfurter Würstchen", "Neut"), {});
	expect((await produced).result).toEqual(empty);
	expect(jev.sent).toEqual([]);
});

test("the formation judge offers Participle only to an adjective", async () => {
	const { jev, produced } = run(noun("Tisch"), { formation: "None" });
	await produced;
	const formation = jev.sent[0]?.questions.formation;
	expect(
		formation?.type === "choice"
			? Object.keys(formation.criteria ?? {})
			: [],
	).toEqual(["Conversion", "Clipping", "Acronym", "None", "Unresolved"]);
});

describe("the letter checks (source-letters.ts)", () => {
	const verb = (canonicalForm: string) => ({ canonicalForm, kind: "VERB" });
	const nounBase = (canonicalForm: string) => ({
		canonicalForm,
		kind: "NOUN",
	});

	test("a conversion changes the Kind, keeps the stem's start and adds no listed affix", () => {
		for (const [word, base] of [
			["Lauf", "laufen"],
			["Wurf", "werfen"],
			["Ausgang", "ausgehen"],
			["Aufgabe", "aufgeben"],
			["Schuss", "schießen"],
		] as const)
			expect(isConversionOf(word, "NOUN", verb(base))).toBe(true);
		expect(isConversionOf("fischen", "VERB", nounBase("Fisch"))).toBe(true);
		expect(isConversionOf("Entspannung", "NOUN", verb("entspannen"))).toBe(
			false,
		);
		expect(isConversionOf("Fahrer", "NOUN", verb("fahren"))).toBe(false);
		expect(isConversionOf("Lauf", "NOUN", nounBase("Läufer"))).toBe(false);
		expect(isConversionOf("Lauf", "NOUN", verb("gehen"))).toBe(false);
	});

	test("a shortening keeps the Kind and is the base's letters in order", () => {
		for (const [word, base] of [
			["Uni", "Universität"],
			["Kita", "Kindertagesstätte"],
			["Lkw", "Lastkraftwagen"],
			["Kripo", "Kriminalpolizei"],
			["Bus", "Omnibus"],
		] as const)
			expect(isShorteningOf(word, "NOUN", nounBase(base))).toBe(true);
		expect(isShorteningOf("Uni", "NOUN", verb("unifizieren"))).toBe(false);
		expect(isShorteningOf("Kita", "NOUN", nounBase("Kindergarten"))).toBe(
			false,
		);
		expect(isShorteningOf("Haus", "NOUN", nounBase("Haus"))).toBe(false);
	});
});
