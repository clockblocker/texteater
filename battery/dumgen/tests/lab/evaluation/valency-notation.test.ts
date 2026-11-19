import { expect, test } from "bun:test";
import { canonicalJson } from "common-utils";
import {
	parseGermanFrame,
	printGermanFrame,
} from "../../../lab/evaluation/valency-notation/german.js";
import { valencyCases } from "../../../lab/evaluation/valency-notation/gold.js";

const verb = { verb: true };
const adjective = { verb: false };

test("every gold frame prints and reads back the same, with and without its headword", async () => {
	const cases = await valencyCases();
	expect(cases.length).toBeGreaterThan(200);
	const misses: string[] = [];
	for (const { goldCase, frame, context } of cases) {
		const headword = goldCase.reading.lemma.canonicalForm;
		for (const options of [{}, { headword }]) {
			const text = printGermanFrame(frame, context, options);
			const read = parseGermanFrame(text, context, options);
			if (!read.ok || canonicalJson(read.frame) !== canonicalJson(frame))
				misses.push(
					`${headword}: ${text} → ${read.ok ? canonicalJson(read.frame) : read.error}`,
				);
		}
	}
	expect(misses).toEqual([]);
});

test("the brief's frames read as the model holds them", () => {
	expect(
		parseGermanFrame("jmd. (etw.|(es) dass|(es) ob|(es) w)", verb),
	).toEqual({
		ok: true,
		lenient: [],
		frame: [
			{
				status: "Required",
				complements: [
					{ kind: "Case", governedCase: "Nom", referent: "Someone" },
				],
			},
			{
				status: "Optional",
				complements: [
					{
						kind: "Case",
						governedCase: "Acc",
						referent: "Something",
					},
					{ kind: "Clause", form: "Dass", correlate: "Optional" },
					{ kind: "Clause", form: "Ob", correlate: "Optional" },
					{ kind: "Clause", form: "W", correlate: "Optional" },
				],
			},
		],
	});
	const freuen = parseGermanFrame(
		"jmd. sich(akk) (auf jmdn./etw.|über etw.(akk)) freuen",
		verb,
		{ headword: "freuen" },
	);
	expect(freuen.ok && freuen.frame[2]?.complements).toEqual([
		{
			kind: "Preposition",
			preposition: "auf",
			governedCase: "Acc",
			referent: "Either",
		},
		{
			kind: "Preposition",
			preposition: "über",
			governedCase: "Acc",
			referent: "Something",
		},
	]);
	const halten = parseGermanFrame("jmd. jmdn./etw. für ADJ", verb);
	expect(halten.ok && halten.frame[2]?.complements).toEqual([
		{ kind: "Predicative", of: "Object", marker: "Für" },
	]);
	const gehen = parseGermanFrame("es jmdm. irgendwie", verb);
	expect(gehen.ok && gehen.frame).toEqual([
		{
			status: "Required",
			complements: [
				{ kind: "Case", governedCase: "Dat", referent: "Someone" },
			],
		},
		{
			status: "Required",
			complements: [{ kind: "Adverbial", standIn: "Irgendwie" }],
		},
	]);
	const ausser = parseGermanFrame("jmd. außer sich(dat)", verb);
	expect(ausser.ok && ausser.frame[1]?.complements).toEqual([
		{ kind: "Reflexive", governedCase: "Dat", preposition: "außer" },
	]);
	expect(parseGermanFrame("-", adjective)).toEqual({
		ok: true,
		frame: [],
		lenient: [],
	});
	expect(
		parseGermanFrame("- Scham", adjective, { headword: "Scham" }),
	).toEqual({ ok: true, frame: [], lenient: [] });
});

test("a one-case preposition's case holds, and a two-way one's defaults to Acc", () => {
	const mit = parseGermanFrame("mit jmdn.", adjective);
	expect(mit.ok && mit.frame[0]?.complements[0]).toMatchObject({
		governedCase: "Dat",
	});
	expect(mit.ok && mit.lenient).toEqual(["PrepositionCaseRepaired"]);
	const vor = parseGermanFrame("(vor etw.)", adjective);
	expect(vor.ok && vor.lenient).toEqual(["TwoWayPrepositionCase"]);
});

test("a stray word or an unclosed Slot is a parse failure", () => {
	expect(parseGermanFrame("jmd. etwas", verb).ok).toBe(false);
	expect(parseGermanFrame("jmd. (etw.", verb).ok).toBe(false);
	expect(parseGermanFrame('{"valency": []}', verb).ok).toBe(false);
});
