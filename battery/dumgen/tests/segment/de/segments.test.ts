import { expect, test } from "bun:test";
import type { Answers, Ask } from "../../../src/segment/ask.js";
import { germanFusionTable } from "../../../src/segment/de/fusion-entries.js";
import {
	type PreparedSegments,
	prepareGermanSegments,
	resolveGermanSegments,
	segmentGermanSentence,
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

test("one request distinguishes fused Am from unsplit superlative am by occurrence", async () => {
	const text = "Am Fenster ist es am schönsten.";
	const prepared = prepareGermanSegments(text);
	let calls = 0;
	const sentence = await segmentGermanSentence(text, async (request) => {
		calls++;
		expect(request.stage).toBe("segments");
		expect(request.state).toEqual(prepared.state);
		expect(Object.keys(request.questions)).toHaveLength(2);
		return choose(prepared, (_text, start) =>
			start === 0 ? "Fusion" : "AsWritten",
		);
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
	const prepared = prepareGermanSegments("am Fenster");
	for (const answers of [
		choose(prepared, () => "Fusion", 0.6),
		choose(prepared, () => "Invented"),
	]) {
		const { segments, unresolved } = resolveGermanSegments(
			prepared,
			answers,
		);
		expect(unresolved).toEqual([0]);
		expect(segments[0]).toEqual({ kind: "ResolvableText", text: "am" });
	}
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
