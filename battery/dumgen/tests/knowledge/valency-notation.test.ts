import { expect, test } from "bun:test";
import { canonicalJson } from "common-utils";
import { valencyCases } from "../../lab/evaluation/valency-notation/gold.js";
import {
	germanFramePattern,
	parseGermanFrame,
	printGermanFrame,
} from "../../src/knowledge/de/valency-notation.js";
import { valencyExamples } from "../../src/knowledge/de/valency-prompts.js";

const pattern = new RegExp(germanFramePattern, "u");

test("every gold frame prints in the notation the pattern holds, and reads back the same", async () => {
	const cases = await valencyCases();
	expect(cases.length).toBeGreaterThan(200);
	const misses: string[] = [];
	for (const { goldCase, frame, context } of cases) {
		const headword = goldCase.reading.lemma.canonicalForm;
		const text = printGermanFrame(frame, context);
		const read = parseGermanFrame(text);
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
		const read = parseGermanFrame(frame);
		expect(read.ok && printGermanFrame(read.frame, { verb })).toBe(frame);
	}
});

test("the examples' frames read as the model holds them", () => {
	expect(parseGermanFrame("N (A|(es) dass|(es) ob|(es) w)")).toEqual({
		ok: true,
		frame: [
			{
				status: "Required",
				complements: [{ kind: "Case", governedCase: "Nom" }],
			},
			{
				status: "Optional",
				complements: [
					{ kind: "Case", governedCase: "Acc" },
					{ kind: "Clause", form: "Dass", correlate: "Optional" },
					{ kind: "Clause", form: "Ob", correlate: "Optional" },
					{ kind: "Clause", form: "W", correlate: "Optional" },
				],
			},
		],
	});
	const freuen = parseGermanFrame("N sich(A) (auf A|über A)");
	expect(freuen.ok && freuen.frame[1]?.complements).toEqual([
		{ kind: "Reflexive", governedCase: "Acc" },
	]);
	expect(freuen.ok && freuen.frame[2]?.complements).toEqual([
		{ kind: "Preposition", preposition: "auf", governedCase: "Acc" },
		{ kind: "Preposition", preposition: "über", governedCase: "Acc" },
	]);
	const halten = parseGermanFrame("N A für ADJ");
	expect(halten.ok && halten.frame[2]?.complements).toEqual([
		{ kind: "Predicative", of: "Object", marker: "Für" },
	]);
	const gehen = parseGermanFrame("es D irgendwie");
	expect(gehen.ok && gehen.frame).toEqual([
		{
			status: "Required",
			complements: [{ kind: "Case", governedCase: "Dat" }],
		},
		{
			status: "Required",
			complements: [{ kind: "Adverbial", standIn: "Irgendwie" }],
		},
	]);
	const ausser = parseGermanFrame("N außer sich(D)");
	expect(ausser.ok && ausser.frame[1]?.complements).toEqual([
		{ kind: "Reflexive", governedCase: "Dat", preposition: "außer" },
	]);
	expect(parseGermanFrame("-")).toEqual({ ok: true, frame: [] });
});

test("a double accusative writes A in two Slots and reads back as two Acc Slots", () => {
	const fragen = "N (A) (A|ob|w)";
	const read = parseGermanFrame(fragen);
	expect(
		read.ok && read.frame.map(({ complements }) => complements[0]),
	).toEqual([
		{ kind: "Case", governedCase: "Nom" },
		{ kind: "Case", governedCase: "Acc" },
		{ kind: "Case", governedCase: "Acc" },
	]);
	expect(read.ok && printGermanFrame(read.frame, { verb: true })).toBe(
		fragen,
	);
});

test("a one-case preposition's case holds whatever letter follows it, and a two-way one's is its letter", () => {
	const mit = parseGermanFrame("mit A");
	expect(mit.ok && mit.frame[0]?.complements[0]).toMatchObject({
		governedCase: "Dat",
	});
	const vor = parseGermanFrame("(vor A)");
	expect(vor.ok && vor.frame[0]?.complements[0]).toMatchObject({
		governedCase: "Acc",
	});
	const an = parseGermanFrame("(an D)");
	expect(an.ok && an.frame[0]?.complements[0]).toMatchObject({
		governedCase: "Dat",
	});
});

test("a stray word, an unclosed Slot, a referent word or a correlate before a noun phrase is a parse failure, and the pattern holds none of them", () => {
	for (const text of [
		"N etwas",
		"N (A",
		'{"valency": []}',
		"N den Braten",
		"jmd. (etw.)",
		"N auf",
	]) {
		expect(parseGermanFrame(text).ok).toBe(false);
		expect(pattern.test(text)).toBe(false);
	}
	// In the pattern, and still no frame: a two-way preposition takes no Nom.
	expect(pattern.test("N an N")).toBe(false);
	expect(parseGermanFrame("N an N").ok).toBe(false);
});
