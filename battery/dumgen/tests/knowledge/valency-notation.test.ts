import { expect, test } from "bun:test";
import { canonicalJson } from "common-utils";
import { valencyCases } from "../../lab/evaluation/valency-notation/gold.js";
import {
	germanFramePattern,
	parseGermanFrame,
	printGermanFrame,
} from "../../src/knowledge/de/valency-notation.js";
import { valencyExamples } from "../../src/knowledge/de/valency-prompts.js";

const verb = { verb: true };
const adjective = { verb: false };
const pattern = new RegExp(germanFramePattern, "u");

test("every gold frame prints in the notation the pattern holds, and reads back the same", async () => {
	const cases = await valencyCases();
	expect(cases.length).toBeGreaterThan(200);
	const misses: string[] = [];
	for (const { goldCase, frame, context } of cases) {
		const headword = goldCase.reading.lemma.canonicalForm;
		const text = printGermanFrame(frame, context);
		const read = parseGermanFrame(text, context);
		if (!pattern.test(text))
			misses.push(`${headword}: ${text} is outside the pattern`);
		if (!read.ok || canonicalJson(read.frame) !== canonicalJson(frame))
			misses.push(
				`${headword}: ${text} → ${read.ok ? canonicalJson(read.frame) : read.error}`,
			);
	}
	expect(misses).toEqual([]);
});

test("every prompt example is in the pattern and reads back as written", () => {
	for (const { lemma, verb, frame } of valencyExamples) {
		expect({ lemma, inPattern: pattern.test(frame) }).toEqual({
			lemma,
			inPattern: true,
		});
		const read = parseGermanFrame(frame, { verb });
		expect(read.ok && printGermanFrame(read.frame, { verb })).toBe(frame);
	}
});

test("the examples' frames read as the model holds them", () => {
	expect(
		parseGermanFrame("jmd. (etw.|(es) dass|(es) ob|(es) w)", verb),
	).toEqual({
		ok: true,
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
		"jmd. sich(akk) (auf jmdn./etw.|über etw.(akk))",
		verb,
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
	expect(parseGermanFrame("-", adjective)).toEqual({ ok: true, frame: [] });
});

test("a one-case preposition's case holds, and a two-way one's defaults to Acc", () => {
	const mit = parseGermanFrame("mit jmdn.", adjective);
	expect(mit.ok && mit.frame[0]?.complements[0]).toMatchObject({
		governedCase: "Dat",
	});
	const vor = parseGermanFrame("(vor etw.)", adjective);
	expect(vor.ok && vor.frame[0]?.complements[0]).toMatchObject({
		governedCase: "Acc",
	});
});

test("a stray word, an unclosed Slot or a correlate before a noun phrase is a parse failure, and the pattern holds none of them", () => {
	for (const text of [
		"jmd. etwas",
		"jmd. (etw.",
		'{"valency": []}',
		"jmd. den Braten",
	]) {
		expect(parseGermanFrame(text, verb).ok).toBe(false);
		expect(pattern.test(text)).toBe(false);
	}
	// In the pattern, and still no frame: a two-way preposition takes no Nom.
	expect(pattern.test("jmd. an jmd.")).toBe(true);
	expect(parseGermanFrame("jmd. an jmd.", verb).ok).toBe(false);
});
