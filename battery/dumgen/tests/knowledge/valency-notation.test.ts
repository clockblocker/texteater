import { expect, test } from "bun:test";
import { canonicalJson } from "common-utils";
import { valencyCases } from "../../lab/evaluation/valency-notation/gold.js";
import {
	germanPatternRegex,
	type ProposedComplement,
	parseGermanPattern,
	printGermanPattern,
} from "../../src/knowledge/de/valency-notation.js";
import { valencyExamples } from "../../src/knowledge/de/valency-prompts.js";

const pattern = new RegExp(germanPatternRegex, "u");

test("every gold pattern prints in the notation the regex holds, and reads back the same", async () => {
	const cases = await valencyCases();
	expect(cases.length).toBeGreaterThan(100);
	const misses: string[] = [];
	for (const { goldCase, pattern: goldPattern, context } of cases) {
		const headword = goldCase.reading.lemma.canonicalForm;
		const text = printGermanPattern(goldPattern, context);
		const read = parseGermanPattern(text);
		if (!pattern.test(text))
			misses.push(`${headword}: ${text} is outside the pattern`);
		if (
			!read.ok ||
			canonicalJson(read.pattern) !== canonicalJson(goldPattern)
		)
			misses.push(
				`${headword}: ${text} → ${read.ok ? canonicalJson(read.pattern) : read.error}`,
			);
	}
	expect(misses).toEqual([]);
});

test("every prompt example is in the pattern and reads back as written", () => {
	for (const { lemma, verb, pattern: text } of valencyExamples) {
		expect({ lemma, inPattern: pattern.test(text) }).toEqual({
			lemma,
			inPattern: true,
		});
		const read = parseGermanPattern(text);
		expect(read.ok && printGermanPattern(read.pattern, { verb })).toBe(
			text,
		);
	}
});

test("concrete patterns read as the model holds them", () => {
	expect(parseGermanPattern("N A nach D")).toEqual({
		ok: true,
		pattern: [
			{ kind: "Case", governedCase: "Nom" },
			{ kind: "Case", governedCase: "Acc" },
			{ kind: "Preposition", preposition: "nach", governedCase: "Dat" },
		],
	});
	expect(parseGermanPattern("N sich(A) auf zu+Inf")).toEqual({
		ok: true,
		pattern: [
			{ kind: "Case", governedCase: "Nom" },
			{ kind: "Reflexive", governedCase: "Acc" },
			{ kind: "Clause", form: "ZuInfinitive", preposition: "auf" },
		],
	});
	expect(parseGermanPattern("N A für ADJ")).toEqual({
		ok: true,
		pattern: [
			{ kind: "Case", governedCase: "Nom" },
			{ kind: "Case", governedCase: "Acc" },
			{ kind: "Predicative", marker: "Für" },
		],
	});
	expect(parseGermanPattern("es D irgendwie")).toEqual({
		ok: true,
		pattern: [
			{ kind: "Case", governedCase: "Dat" },
			{ kind: "Adverbial", standIn: "Irgendwie" },
		],
	});
	expect(parseGermanPattern("N außer sich(D)")).toEqual({
		ok: true,
		pattern: [
			{ kind: "Case", governedCase: "Nom" },
			{ kind: "Reflexive", governedCase: "Dat", preposition: "außer" },
		],
	});
	expect(parseGermanPattern("-")).toEqual({ ok: true, pattern: [] });
});

test("a double accusative writes A twice and reads back as two Acc complements", () => {
	const fragen = "N A A";
	const read = parseGermanPattern(fragen);
	expect(read.ok && read.pattern).toEqual([
		{ kind: "Case", governedCase: "Nom" },
		{ kind: "Case", governedCase: "Acc" },
		{ kind: "Case", governedCase: "Acc" },
	]);
	expect(read.ok && printGermanPattern(read.pattern, { verb: true })).toBe(
		fragen,
	);
});

test("a preposition takes only the letters of the cases it governs before its complement", () => {
	const mit = parseGermanPattern("mit D");
	expect(mit.ok && mit.pattern[0]).toMatchObject({ governedCase: "Dat" });
	const vor = parseGermanPattern("vor A");
	expect(vor.ok && vor.pattern[0]).toMatchObject({ governedCase: "Acc" });
	const an = parseGermanPattern("an D");
	expect(an.ok && an.pattern[0]).toMatchObject({ governedCase: "Dat" });
	for (const text of ["mit A", "für D", "auf G", "N an N", "wegen G"]) {
		expect({ text, read: parseGermanPattern(text).ok }).toEqual({
			text,
			read: false,
		});
		expect({ text, inPattern: pattern.test(text) }).toEqual({
			text,
			inPattern: false,
		});
	}
});

test("optional parentheses, alternatives, stray words or referent words are rejected", () => {
	for (const text of [
		"N (A)",
		"N A|dass",
		"N (es) dass",
		"N etwas",
		'{"valency": []}',
		"N den Braten",
		"jmd. etw.",
		"N auf",
		"N es A",
		"es",
		"",
		"N A ADJ(obj)",
		"N wegen dass",
	]) {
		expect(parseGermanPattern(text).ok).toBe(false);
		expect(pattern.test(text)).toBe(false);
	}
});

const clause = (
	form: "Dass" | "W",
	preposition?: string,
): ProposedComplement => ({
	kind: "Clause",
	form,
	...(preposition === undefined ? {} : { preposition }),
});
const nom: ProposedComplement = { kind: "Case", governedCase: "Nom" };
const dat: ProposedComplement = { kind: "Case", governedCase: "Dat" };

test("a verb pattern with no Nom opens with es, and correlated clauses print with their preposition", () => {
	const patterns: [readonly ProposedComplement[], string][] = [
		[[clause("Dass")], "es dass"],
		[[clause("Dass"), dat], "es dass D"],
		[[dat, clause("W")], "es D w"],
		[[clause("Dass", "auf")], "es auf dass"],
		[[nom, clause("Dass", "auf")], "N auf dass"],
	];
	for (const [value, text] of patterns) {
		expect(printGermanPattern(value, { verb: true })).toBe(text);
		expect(parseGermanPattern(text)).toEqual({
			ok: true,
			pattern: [...value],
		});
	}
	expect(printGermanPattern([clause("Dass", "auf")], { verb: false })).toBe(
		"auf dass",
	);
});

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
			word === from
				? tos.map((to) =>
						words
							.map((other, i) => (i === at ? to : other))
							.join(" "),
					)
				: [],
		),
	);
	return [
		...swapped,
		`${text} auf dass`,
		`es ${text}`,
		`${text} `,
		` ${text}`,
		text.replace(" ", "  "),
		`${text} es`,
		`(${text})`,
		`${text}|A`,
	];
}

test("the parser reads exactly the patterns the regex holds: every gold pattern and its near misses", async () => {
	const cases = await valencyCases();
	const texts = new Set<string>(
		valencyExamples.map(({ pattern: text }) => text),
	);
	for (const { pattern: goldPattern, context } of cases)
		texts.add(printGermanPattern(goldPattern, context));
	for (const text of [...texts])
		for (const mutated of mutations(text)) texts.add(mutated);
	expect(texts.size).toBeGreaterThan(400);
	const disagreements = [...texts].filter(
		(text) => parseGermanPattern(text).ok !== pattern.test(text),
	);
	expect(disagreements).toEqual([]);
});

test("the parser reads exactly the patterns the regex holds: random strings of the notation's pieces", () => {
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
		const read = parseGermanPattern(text).ok;
		if (read) accepted += 1;
		if (read !== pattern.test(text)) disagreements.push(text);
	}
	expect(disagreements).toEqual([]);
	expect(accepted).toBeGreaterThan(500);
});
