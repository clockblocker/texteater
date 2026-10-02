import { expect, test } from "bun:test";
import type { Answers, Ask } from "../../../src/segment/ask.js";
import { germanFusionTable } from "../../../src/segment/de/fusion-entries.js";
import {
	type PreparedSegments,
	prepareGermanSegments,
	resolveGermanSegments,
	segmentGermanSentence,
	writtenGermanSegments,
} from "../../../src/segment/de/segments.js";
import { validateFusionTable } from "../../../src/segment/fusion-table.js";
import { stitchedText } from "../../../src/segment/stitched-text.js";

function choose(
	prepared: PreparedSegments,
	selection: (text: string, start: number) => string,
	probability = 1,
): Answers {
	return Object.fromEntries(
		Object.keys(prepared.questions).map((id) => {
			const run = prepared.runs[Number(id.slice("source_".length))];
			if (!run) throw Error("Missing written run");
			const picked = selection(run.text, run.start);
			return [
				id,
				{
					type: "choice",
					choice: picked,
					confidence: probability,
					probabilities: { [picked]: probability },
				},
			];
		}),
	);
}

const noCall: Ask = async () => {
	throw Error("An unambiguous Sentence should make no call");
};

test("the German fusion table keeps its invariants", () => {
	expect(() => validateFusionTable(germanFusionTable)).not.toThrow();
});

test("stitching trims and makes each run of horizontal whitespace one space, keeping line breaks", () => {
	expect(stitchedText("  Er kam  heim,\t gut.\nDann ging er. ")).toBe(
		"Er kam heim, gut.\nDann ging er.",
	);
	expect(stitchedText("Rand\r\nmit der Mappe")).toBe("Rand\r\nmit der Mappe");
	expect(stitchedText(" \t ")).toBe("");
});

test("a Sentence with no ambiguous run makes no call, and its Segments give back its Stitched Text", async () => {
	const sentence = await segmentGermanSentence(
		"  Ein\tWald 👩‍💻 und für Haus.\n",
		noCall,
	);
	expect(sentence.text).toBe("Ein Wald 👩‍💻 und für Haus.");
	expect(sentence.language).toBe("de");
	expect(sentence.segments.map(({ text }) => text).join("")).toBe(
		sentence.text,
	);
	expect(sentence.segments.slice(0, 3)).toEqual([
		{ kind: "ResolvableText", text: "Ein" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "Wald" },
	]);
	expect(sentence.segments).toContainEqual({
		kind: "ResolvableText",
		text: "für",
	});
	expect(sentence.unresolved).toEqual([]);
	await expect(segmentGermanSentence(" \n ", noCall)).rejects.toThrow(
		"non-empty",
	);
});

test("fused Am is asked while am before a superlative with no noun after it is code's, one Segment", async () => {
	const text = "Am Fenster ist es am schönsten.";
	const prepared = prepareGermanSegments(text);
	let calls = 0;
	const sentence = await segmentGermanSentence(text, async (request) => {
		calls++;
		expect(request.stage).toBe("segments");
		expect(request.state).toEqual(prepared.state);
		expect(Object.keys(request.questions)).toEqual(["source_0"]);
		return choose(prepared, () => "Fusion");
	});
	expect(calls).toBe(1);
	expect(
		sentence.segments.filter(({ kind }) => kind === "ResolvableText"),
	).toEqual([
		{ kind: "ResolvableText", text: "A", surface: "an" },
		{ kind: "ResolvableText", text: "m", surface: "dem" },
		{ kind: "ResolvableText", text: "Fenster" },
		{ kind: "ResolvableText", text: "ist" },
		{ kind: "ResolvableText", text: "es" },
		{ kind: "ResolvableText", text: "am" },
		{ kind: "ResolvableText", text: "schönsten" },
	]);
});

test("clitics and abbreviations select complete authored plans, keeping apostrophes and dots", () => {
	const text = "Geht’s auf’m Tisch mit 'ne Frage, z.B. i.A.?";
	const prepared = prepareGermanSegments(text);
	const { segments } = resolveGermanSegments(
		prepared,
		choose(prepared, (word) =>
			word === "i.A."
				? "Expansion1"
				: word === "z.B."
					? "Expansion0"
					: "Clitic0",
		),
	);
	expect(Object.keys(prepared.questions)).toHaveLength(5);
	expect(segments).toContainEqual({
		kind: "ResolvableText",
		text: "’s",
		surface: "es",
	});
	expect(segments).toContainEqual({
		kind: "ResolvableText",
		text: "’m",
		surface: "dem",
	});
	expect(segments).toContainEqual({
		kind: "ResolvableText",
		text: "'ne",
		surface: "eine",
	});
	expect(segments).toContainEqual({
		kind: "ResolvableText",
		text: "z.B.",
		surface: "zum Beispiel",
	});
	expect(segments).toContainEqual({
		kind: "ResolvableText",
		text: "i.A.",
		surface: "im Auftrag",
	});
	expect(segments.map(({ text }) => text).join("")).toBe(text);
});

test("authored Fusion recovery keeps combining marks with their letters", async () => {
	const text = "Im\tWald und fürs Haus 👩‍💻.\n";
	let calls = 0;
	const sentence = await segmentGermanSentence(text, async (request) => {
		calls++;
		return choose(
			prepareGermanSegments(String(request.state.sentence)),
			() => "Fusion",
		);
	});
	expect(calls).toBe(1);
	expect(sentence.text).toBe("Im Wald und fürs Haus 👩‍💻.");
	expect(sentence.segments.slice(0, 3)).toEqual([
		{ kind: "ResolvableText", text: "I", surface: "in" },
		{ kind: "ResolvableText", text: "m", surface: "dem" },
		{ kind: "Whitespace", text: " " },
	]);
	expect(sentence.segments).toContainEqual({
		kind: "ResolvableText",
		text: "für",
		surface: "für",
	});
	expect(sentence.segments.map(({ text }) => text).join("")).toBe(
		sentence.text,
	);
});

test("table spellings retain intact name, Foreign and literal-abbreviation alternatives", () => {
	const text =
		"Im schrieb: „I'm late“, dann blieb er im Wald; „z.B.“ stand auf dem Schild.";
	const prepared = prepareGermanSegments(text);
	expect(Object.keys(prepared.questions)).toHaveLength(4);
	for (const run of prepared.runs.filter((run) =>
		["Im", "I'm", "im", "z.B."].includes(run.text),
	))
		expect(run.plans.map((plan) => plan.key)).toContain("AsWritten");
	const { segments, unresolved } = resolveGermanSegments(
		prepared,
		choose(prepared, (word) => (word === "im" ? "Fusion" : "AsWritten")),
	);
	expect(segments[0]).toEqual({ kind: "ResolvableText", text: "Im" });
	expect(segments).toContainEqual({ kind: "ResolvableText", text: "I'm" });
	expect(segments).toContainEqual({ kind: "ResolvableText", text: "z.B." });
	expect(segments).toContainEqual({
		kind: "ResolvableText",
		text: "i",
		surface: "in",
	});
	expect(segments).toContainEqual({
		kind: "ResolvableText",
		text: "m",
		surface: "dem",
	});
	expect(segments.map(({ text }) => text).join("")).toBe(text);
	expect(unresolved).toEqual([]);
});

test("unsupported recovery abstains while an intact apostrophe name keeps its spelling", () => {
	const prepared = prepareGermanSegments("O'Neill sagte foo'bar.");
	const { segments, unresolved } = resolveGermanSegments(
		prepared,
		choose(prepared, (word) =>
			word === "O'Neill" ? "AsWritten" : "Unresolved",
		),
	);
	expect(segments[0]).toEqual({ kind: "ResolvableText", text: "O'Neill" });
	expect(unresolved).toEqual([4]);
	expect(segments[4]).toEqual({ kind: "ResolvableText", text: "foo'bar" });
});

test("a weak or out-of-plan answer keeps the whole written run unresolved with no retry", () => {
	const prepared = prepareGermanSegments("z.B. hier");
	for (const answers of [
		choose(prepared, () => "Expansion0", 0.6),
		choose(prepared, () => "Invented"),
	]) {
		const { segments, unresolved } = resolveGermanSegments(
			prepared,
			answers,
		);
		expect(unresolved).toEqual([0]);
		expect(segments[0]).toEqual({ kind: "ResolvableText", text: "z.B." });
	}
});

test("a fused word splits unless jev confidently keeps it whole (de/fused-word-pieces)", () => {
	const prepared = prepareGermanSegments("Im Chat stand es");
	const split = [
		{ kind: "ResolvableText" as const, text: "I", surface: "in" },
		{ kind: "ResolvableText" as const, text: "m", surface: "dem" },
	];
	for (const answers of [
		choose(prepared, () => "Fusion", 0.55),
		choose(prepared, () => "AsWritten", 0.55),
		choose(prepared, () => "Unresolved"),
		choose(prepared, () => "Invented"),
	]) {
		const { segments, unresolved } = resolveGermanSegments(
			prepared,
			answers,
		);
		expect(unresolved).toEqual([]);
		expect(segments.slice(0, 2)).toEqual(split);
	}
	const kept = resolveGermanSegments(
		prepared,
		choose(prepared, () => "AsWritten", 0.8),
	);
	expect(kept.segments[0]).toEqual({ kind: "ResolvableText", text: "Im" });
	expect(kept.unresolved).toEqual([]);
});

test("without jev, a fused word keeps its spelling and is listed unresolved", () => {
	const { segments, unresolved } = writtenGermanSegments(
		"Er ist im Wald und versucht abzuspannen.",
	);
	expect(segments[4]).toEqual({ kind: "ResolvableText", text: "im" });
	expect(unresolved).toEqual([4]);
	expect(segments).toContainEqual({
		kind: "ResolvableText",
		text: "spannen",
		surface: "spannen",
	});
});

const resolvable = (text: string) =>
	resolveGermanSegments(prepareGermanSegments(text), {}).segments.filter(
		({ kind }) => kind !== "Whitespace",
	);

test("am stays one Segment before a superlative with no noun after it, and is asked before one that may have a noun", () => {
	for (const [text, asked] of [
		["Wer steht am nächsten?", false],
		["Mina reist am liebsten im Frühling.", false],
		[
			"Ihnen kann es keiner recht machen und am wenigsten die Kinder.",
			false,
		],
		["Sie lacht am besten, glaub mir.", false],
		["Am nächsten Morgen kam er.", true],
		["Er wohnt am höchsten gelegenen Punkt.", true],
		["Wir treffen uns am ersten.", true],
		["I am fine, sagte er.", true],
	] as const) {
		const prepared = prepareGermanSegments(text);
		const written = Object.values(
			prepared.state.written as Record<string, string>,
		);
		expect(written.filter((word) => /^am$/iu.test(word))).toHaveLength(
			asked ? 1 : 0,
		);
	}
	expect(resolvable("Wer steht am nächsten?")).toContainEqual({
		kind: "ResolvableText",
		text: "am",
	});
});

test("an infinitive's infixed zu is a piece, decided by code (de/fused-word-pieces)", async () => {
	const sentence = await segmentGermanSentence(
		"Er fing an, abzuspannen, hinauszulaufen und hinzuzufügen.",
		noCall,
	);
	const pieces = sentence.segments.filter(
		({ kind }) => kind === "ResolvableText",
	);
	const infixed = (...texts: string[]) =>
		texts.map((text) => ({
			kind: "ResolvableText" as const,
			text,
			surface: text,
		}));
	expect(pieces.slice(3)).toEqual([
		...infixed("ab", "zu", "spannen", "hinaus", "zu", "laufen"),
		{ kind: "ResolvableText", text: "und" },
		...infixed("hinzu", "zu", "fügen"),
	]);
	for (const whole of [
		"die auszubildenden Lehrlinge",
		"die anzuwendenden Regeln",
		"die Wolle abzupfen",
		"wird dazugehören",
		"wird hinzufügen",
		"abzugsfähigen Aufwand",
		"Abzuspannen ist schwer",
	])
		expect(resolvable(whole).map(({ text }) => text)).toEqual(
			whole.split(" "),
		);
});

test("a short word's period inside the Sentence is its own: K., u., aff.", () => {
	expect(
		resolvable(
			"K. wartete, Josef K. kam, Brot u. Käse, mit aff. abgekürzt.",
		),
	).toEqual([
		{ kind: "ResolvableText", text: "K." },
		{ kind: "ResolvableText", text: "wartete" },
		{ kind: "Punctuation", text: "," },
		{ kind: "ResolvableText", text: "Josef" },
		{ kind: "ResolvableText", text: "K." },
		{ kind: "ResolvableText", text: "kam" },
		{ kind: "Punctuation", text: "," },
		{ kind: "ResolvableText", text: "Brot" },
		{ kind: "ResolvableText", text: "u." },
		{ kind: "ResolvableText", text: "Käse" },
		{ kind: "Punctuation", text: "," },
		{ kind: "ResolvableText", text: "mit" },
		{ kind: "ResolvableText", text: "aff." },
		{ kind: "ResolvableText", text: "abgekürzt" },
		{ kind: "Punctuation", text: "." },
	]);
	expect(resolvable("Das sagte Josef K.").slice(-2)).toEqual([
		{ kind: "ResolvableText", text: "K" },
		{ kind: "Punctuation", text: "." },
	]);
	expect(resolvable("Er wartet. Dann geht er.")[1]).toEqual({
		kind: "ResolvableText",
		text: "wartet",
	});
});

test("a sign that stands for a word is clickable, alone or repeated; an emoji is not", () => {
	const segments = resolvable(
		"Ein © und ® vor № und ※ oder ٪ und ﹪, ein *, §§ und ‰‰, 10–12, fünf µm, mit ;-) und 😀.",
	);
	for (const text of [
		"©",
		"®",
		"№",
		"※",
		"٪",
		"﹪",
		"*",
		"§§",
		"‰‰",
		"–",
		"µ",
		"m",
		";-)",
	])
		expect(segments).toContainEqual({ kind: "ResolvableText", text });
	expect(segments).toContainEqual({ kind: "OpaqueText", text: "😀" });
	expect(resolvable("Lehrer*innen und Berlin – Hamburg")).toEqual([
		{ kind: "ResolvableText", text: "Lehrer" },
		{ kind: "Punctuation", text: "*" },
		{ kind: "ResolvableText", text: "innen" },
		{ kind: "ResolvableText", text: "und" },
		{ kind: "ResolvableText", text: "Berlin" },
		{ kind: "Punctuation", text: "–" },
		{ kind: "ResolvableText", text: "Hamburg" },
	]);
});

test("three full stops and ?! are one mark each; other runs of marks are one Segment per mark (de/one-segment-per-mark)", () => {
	const marks = (text: string) =>
		resolvable(text)
			.filter(({ kind }) => kind === "Punctuation")
			.map(({ text }) => text);
	expect(marks("Er ruhte aus ...")).toEqual(["..."]);
	expect(marks("Wie bitte?!")).toEqual(["?!"]);
	expect(marks("„Wie bitte?!“, rief er.")).toEqual([
		"„",
		"?!",
		"“",
		",",
		".",
	]);
	expect(marks("Wer war das...?!")).toEqual(["...", "?!"]);
	expect(marks("Was nun…?")).toEqual(["…", "?"]);
	expect(marks("Wie bitte!?")).toEqual(["!", "?"]);
	expect(marks("Echt?? Nein!!")).toEqual(["?", "?", "!", "!"]);
});

test("an emoticon written apart is one clickable Segment; marks glued to a word stay marks (de/one-segment-per-mark)", () => {
	for (const emoticon of [";-)", ":-)", ":)", ";)", ":-(", ":D"]) {
		expect(resolvable(`Bis morgen ${emoticon}.`).slice(-2)).toEqual([
			{ kind: "ResolvableText", text: emoticon },
			{ kind: "Punctuation", text: "." },
		]);
		expect(resolvable(`${emoticon} bis morgen`)[0]).toEqual({
			kind: "ResolvableText",
			text: emoticon,
		});
	}
	// A parenthesis may close right after a word and its mark.
	expect(resolvable("Er nannte (etwa so:) nichts.").slice(2, 7)).toEqual([
		{ kind: "Punctuation", text: "(" },
		{ kind: "ResolvableText", text: "etwa" },
		{ kind: "ResolvableText", text: "so" },
		{ kind: "Punctuation", text: ":" },
		{ kind: "Punctuation", text: ")" },
	]);
	expect(resolvable("Brot (und Käse;) dazu").slice(3, 6)).toEqual([
		{ kind: "ResolvableText", text: "Käse" },
		{ kind: "Punctuation", text: ";" },
		{ kind: "Punctuation", text: ")" },
	]);
});

test("a clitic's host is a piece standing for itself, a Sentence's opening capital aside", async () => {
	const text = "Das Radio? Geht's wieder, wie geht's?";
	const sentence = await segmentGermanSentence(text, async (request) =>
		choose(
			prepareGermanSegments(String(request.state.sentence)),
			() => "Clitic0",
		),
	);
	const pieces = sentence.segments.filter(
		({ kind }) => kind === "ResolvableText",
	);
	expect(pieces).toContainEqual({
		kind: "ResolvableText",
		text: "Geht",
		surface: "geht",
	});
	expect(pieces).toContainEqual({
		kind: "ResolvableText",
		text: "geht",
		surface: "geht",
	});
	expect(
		pieces.filter(({ text, surface }) => text === "'s" && surface === "es"),
	).toHaveLength(2);
});

test("scanning keeps render kinds and whitespace as given; stitching is the caller's", () => {
	const prepared = prepareGermanSegments("  Wort\r\n—字 😀! ");
	expect(resolveGermanSegments(prepared, {}).segments).toEqual([
		{ kind: "Whitespace", text: "  " },
		{ kind: "ResolvableText", text: "Wort" },
		{ kind: "Whitespace", text: "\r\n" },
		{ kind: "Punctuation", text: "—" },
		{ kind: "ResolvableText", text: "字" },
		{ kind: "Whitespace", text: " " },
		{ kind: "OpaqueText", text: "😀" },
		{ kind: "Punctuation", text: "!" },
		{ kind: "Whitespace", text: " " },
	]);
	expect(() => prepareGermanSegments("")).toThrow("non-empty");
});

test("mathematical, currency and standalone lexical signs remain clickable", () => {
	const { segments } = resolveGermanSegments(
		prepareGermanSegments("drei % + fünf € ≠ vier §."),
		{},
	);
	for (const text of ["%", "+", "€", "≠", "§"])
		expect(segments).toContainEqual({ kind: "ResolvableText", text });
});
