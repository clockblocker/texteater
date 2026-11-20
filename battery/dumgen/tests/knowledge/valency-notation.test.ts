import { expect, test } from "bun:test";
import { canonicalJson } from "common-utils";
import { valencyCases } from "../../lab/evaluation/valency-notation/gold.js";
import {
	germanFramePattern,
	type ProposedSlot,
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
		{ kind: "Predicative", marker: "Für" },
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

test("a preposition takes only the letters of the cases it governs before its complement", () => {
	const mit = parseGermanFrame("mit D");
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
	for (const text of ["mit A", "für D", "auf G", "N an N", "wegen G"]) {
		expect({ text, read: parseGermanFrame(text).ok }).toEqual({
			text,
			read: false,
		});
		expect({ text, inPattern: pattern.test(text) }).toEqual({
			text,
			inPattern: false,
		});
	}
});

test("a stray word, an unclosed Slot, a referent word or a correlate before a noun phrase is a parse failure, and the pattern holds none of them", () => {
	for (const text of [
		"N etwas",
		"N (A",
		'{"valency": []}',
		"N den Braten",
		"jmd. (etw.)",
		"N auf",
		"N es A",
		"es",
		"",
		"N A ADJ(obj)",
	]) {
		expect(parseGermanFrame(text).ok).toBe(false);
		expect(pattern.test(text)).toBe(false);
	}
});

const lone = (
	form: "Dass" | "W",
	correlate?: "Required" | "Optional",
): ProposedSlot => ({
	status: "Required",
	complements: [
		{
			kind: "Clause",
			form,
			...(correlate === undefined ? {} : { correlate }),
		},
	],
});
const nom: ProposedSlot = {
	status: "Required",
	complements: [{ kind: "Case", governedCase: "Nom" }],
};
const dat: ProposedSlot = {
	status: "Required",
	complements: [{ kind: "Case", governedCase: "Dat" }],
};

test("a verb frame with no Nom in any Slot opens with es, and a lone clause after it reads back as written", () => {
	const frames: [readonly ProposedSlot[], string][] = [
		[[lone("Dass")], "es dass"],
		[[lone("Dass"), dat], "es dass D"],
		[[dat, lone("W")], "es D w"],
		[[lone("Dass", "Required")], "es es dass"],
		[[lone("Dass", "Optional")], "es (es) dass"],
		[[nom, lone("Dass", "Required")], "N es dass"],
		[[nom, lone("Dass", "Optional")], "N (es) dass"],
	];
	for (const [frame, text] of frames) {
		expect(printGermanFrame(frame, { verb: true })).toBe(text);
		expect(parseGermanFrame(text)).toEqual({ ok: true, frame: [...frame] });
	}
	// A non-verb writes no opener, so its lone correlate stands first.
	expect(printGermanFrame([lone("Dass", "Required")], { verb: false })).toBe(
		"es dass",
	);
	// A correlated clause with a sibling keeps its es, first Slot or not.
	const sibling = parseGermanFrame("es dass|A");
	expect(sibling.ok && sibling.frame[0]?.complements[0]).toEqual({
		kind: "Clause",
		form: "Dass",
		correlate: "Required",
	});
});

/**
 * Each printed frame's near misses: every letter swapped, every
 * preposition swapped for a governable, ungovernable or capitalized one,
 * lone correlates, spacing and markers the notation does not write.
 */
function mutations(text: string): string[] {
	const words = text.split(" ");
	const swaps: Record<string, readonly string[]> = {
		N: ["A", "D", "G"],
		A: ["N", "D", "G"],
		D: ["N", "A", "G"],
		G: ["N", "A", "D"],
		auf: ["mit", "wegen", "Auf", "durch", "außer"],
		mit: ["für", "um", "ohne"],
		für: ["an", "trotz"],
		ADJ: ["ADJ(subj)", "ADJ(obj)", "adj"],
		dass: ["daß", "A", "ADJ"],
		"sich(A)": ["sich(D)", "sich(G)", "sich"],
	};
	const swapped = words.flatMap((word, at) =>
		Object.entries(swaps).flatMap(([from, tos]) =>
			word.replace(/[()|]/gu, "") === from || word.includes(from)
				? tos.map((to) =>
						words
							.map((other, i) =>
								i === at ? other.replace(from, to) : other,
							)
							.join(" "),
					)
				: [],
		),
	);
	return [
		...swapped,
		`${text} es dass`,
		`${text} (es) dass`,
		`es ${text}`,
		`${text} `,
		` ${text}`,
		text.replace(" ", "  "),
		text.replace("|", " | "),
		text.replace("(", "( "),
		`${text} es`,
		`(${text})`,
	];
}

test("the parser reads exactly the frames the pattern holds: every gold frame and its near misses", async () => {
	const cases = await valencyCases();
	const texts = new Set<string>(valencyExamples.map(({ frame }) => frame));
	for (const { frame, context } of cases)
		texts.add(printGermanFrame(frame, context));
	for (const text of [...texts])
		for (const mutated of mutations(text)) texts.add(mutated);
	expect(texts.size).toBeGreaterThan(1000);
	const disagreements = [...texts].filter(
		(text) => parseGermanFrame(text).ok !== pattern.test(text),
	);
	expect(disagreements).toEqual([]);
});

test("the parser reads exactly the frames the pattern holds: random strings of the notation's pieces", () => {
	const pieces = [
		"N",
		"A",
		"D",
		"G",
		"auf",
		"mit",
		"an",
		"für",
		"wegen",
		"außer",
		"als",
		"ADJ",
		"es",
		"(es)",
		"dass",
		"w",
		"zu+Inf",
		"sich(A)",
		"sich(D)",
		"irgendwie",
		"lange",
		"irgendwo",
		"-",
		"(",
		")",
		"|",
	];
	const separators = [" ", "", " ", "|", " "];
	let seed = 20261119;
	const next = (below: number) => {
		seed = (seed * 1103515245 + 12345) % 2147483648;
		return seed % below;
	};
	const disagreements: string[] = [];
	let accepted = 0;
	for (let n = 0; n < 20000; n += 1) {
		let text = "";
		const length = 1 + next(6);
		for (let i = 0; i < length; i += 1)
			text +=
				(i === 0 ? "" : (separators[next(separators.length)] ?? " ")) +
				(pieces[next(pieces.length)] ?? "");
		const read = parseGermanFrame(text).ok;
		if (read) accepted += 1;
		if (read !== pattern.test(text)) disagreements.push(text);
	}
	expect(disagreements).toEqual([]);
	expect(accepted).toBeGreaterThan(500);
});
