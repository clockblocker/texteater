import { expect, test } from "bun:test";
import {
	type PreparedGermanSource,
	prepareGermanSource,
	resolveGermanSource,
	segmentGermanSource,
} from "../../src/segment-in-units/de/source.js";
import type { Answers } from "../../src/segment-in-units/lab/jev.js";

function choose(
	prepared: PreparedGermanSource,
	selection: (text: string, start: number) => string,
	probability = 1,
): Answers {
	return Object.fromEntries(
		Object.keys(prepared.questions).map((id) => {
			const run = prepared.runs[Number(id.slice("source_".length))];
			if (!run) throw Error("Missing source run");
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

test("ordinary runs preserve all source characters and UTF-16 offsets without a call", async () => {
	const text = "Ein\tWald 👩‍💻 und fu\u0308r Haus.\n";
	const source = await segmentGermanSource(text, {
		jev: {
			ask: async () => {
				throw Error("An unambiguous source should make no call");
			},
		},
		repetition: 0,
		calls: [],
	});
	expect(source.input.segments.map(({ text }) => text).join("")).toBe(text);
	expect(source.input.segments.slice(0, 3)).toEqual([
		{ kind: "ResolvableText", text: "Ein" },
		{ kind: "Whitespace", text: "\t" },
		{ kind: "ResolvableText", text: "Wald" },
	]);
	expect(source.input.segments).toContainEqual({
		kind: "ResolvableText",
		text: "fu\u0308r",
	});
	expect(source.unresolved).toEqual([]);
	for (const [index, segment] of source.input.segments.entries()) {
		const span = source.spans[index];
		expect(span).toBeDefined();
		expect(text.slice(span?.start, span?.end)).toBe(segment.text);
	}
	expect(source.spans.at(-1)?.end).toBe(text.length);
});

test("one request distinguishes fused Am from unsplit superlative am by occurrence", async () => {
	const text = "Am Fenster ist es am schönsten.";
	const prepared = prepareGermanSource(text);
	let calls = 0;
	const source = await segmentGermanSource(text, {
		jev: {
			ask: async (request) => {
				calls++;
				expect(request.stage).toBe("source");
				expect(request.state).toEqual(prepared.state);
				expect(Object.keys(request.questions)).toHaveLength(2);
				return choose(prepared, (_text, start) =>
					start === 0 ? "Fusion" : "AsWritten",
				);
			},
		},
		repetition: 0,
		calls: [],
	});
	expect(calls).toBe(1);
	expect(
		source.input.segments.filter(({ kind }) => kind === "ResolvableText"),
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
	const prepared = prepareGermanSource(text);
	const source = resolveGermanSource(
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
	expect(source.input.segments).toContainEqual({
		kind: "ResolvableText",
		text: "’s",
		surface: "es",
	});
	expect(source.input.segments).toContainEqual({
		kind: "ResolvableText",
		text: "’m",
		surface: "dem",
	});
	expect(source.input.segments).toContainEqual({
		kind: "ResolvableText",
		text: "'ne",
		surface: "eine",
	});
	expect(source.input.segments).toContainEqual({
		kind: "ResolvableText",
		text: "z.B.",
		surface: "zum Beispiel",
	});
	expect(source.input.segments).toContainEqual({
		kind: "ResolvableText",
		text: "i.A.",
		surface: "im Auftrag",
	});
	expect(source.input.segments.map(({ text }) => text).join("")).toBe(text);
});

test("authored Fusion recovery still preserves original Unicode spans after a contextual choice", async () => {
	const text = "Im\tWald und fu\u0308rs Haus 👩‍💻.\n";
	const prepared = prepareGermanSource(text);
	let calls = 0;
	const source = await segmentGermanSource(text, {
		jev: {
			ask: async () => {
				calls++;
				return choose(prepared, () => "Fusion");
			},
		},
		repetition: 0,
		calls: [],
	});
	expect(calls).toBe(1);
	expect(Object.keys(prepared.questions)).toHaveLength(2);
	expect(source.input.segments.slice(0, 3)).toEqual([
		{ kind: "ResolvableText", text: "I", surface: "in" },
		{ kind: "ResolvableText", text: "m", surface: "dem" },
		{ kind: "Whitespace", text: "\t" },
	]);
	expect(source.input.segments).toContainEqual({
		kind: "ResolvableText",
		text: "fu\u0308r",
		surface: "für",
	});
	for (const [index, segment] of source.input.segments.entries()) {
		const span = source.spans[index];
		expect(text.slice(span?.start, span?.end)).toBe(segment.text);
	}
	expect(source.input.segments.map(({ text }) => text).join("")).toBe(text);
});

test("table spellings retain intact name, Foreign and literal-abbreviation alternatives", () => {
	const text =
		"Im schrieb: „I'm late“, dann blieb er im Wald; „z.B.“ stand auf dem Schild.";
	const prepared = prepareGermanSource(text);
	expect(Object.keys(prepared.questions)).toHaveLength(4);
	for (const run of prepared.runs.filter((run) =>
		["Im", "I'm", "im", "z.B."].includes(run.text),
	))
		expect(run.plans.map((plan) => plan.key)).toContain("AsWritten");
	const source = resolveGermanSource(
		prepared,
		choose(prepared, (word) => (word === "im" ? "Fusion" : "AsWritten")),
	);
	expect(source.input.segments[0]).toEqual({
		kind: "ResolvableText",
		text: "Im",
	});
	expect(source.input.segments).toContainEqual({
		kind: "ResolvableText",
		text: "I'm",
	});
	expect(source.input.segments).toContainEqual({
		kind: "ResolvableText",
		text: "z.B.",
	});
	expect(source.input.segments).toContainEqual({
		kind: "ResolvableText",
		text: "i",
		surface: "in",
	});
	expect(source.input.segments).toContainEqual({
		kind: "ResolvableText",
		text: "m",
		surface: "dem",
	});
	expect(source.input.segments.map(({ text }) => text).join("")).toBe(text);
	expect(source.unresolved).toEqual([]);
});

test("unsupported recovery abstains while an intact apostrophe name keeps its spelling", () => {
	const prepared = prepareGermanSource("O'Neill sagte foo'bar.");
	const source = resolveGermanSource(
		prepared,
		choose(prepared, (word) =>
			word === "O'Neill" ? "AsWritten" : "Unresolved",
		),
	);
	expect(source.input.segments[0]).toEqual({
		kind: "ResolvableText",
		text: "O'Neill",
	});
	expect(source.unresolved).toEqual([4]);
	expect(source.input.segments[4]).toEqual({
		kind: "ResolvableText",
		text: "foo'bar",
	});
});

test("a weak or out-of-plan answer keeps the whole source run Unresolved with no retry", () => {
	const prepared = prepareGermanSource("am Fenster");
	for (const answers of [
		choose(prepared, () => "Fusion", 0.6),
		choose(prepared, () => "Invented"),
	]) {
		const source = resolveGermanSource(prepared, answers);
		expect(source.unresolved).toEqual([0]);
		expect(source.input.segments[0]).toEqual({
			kind: "ResolvableText",
			text: "am",
		});
	}
});

test("render kinds and whitespace preserve source rather than silently normalizing it", () => {
	const prepared = prepareGermanSource("  Wort\r\n—字 😀! ");
	const source = resolveGermanSource(prepared, {});
	expect(source.input.segments).toEqual([
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
	expect(() => prepareGermanSource("")).toThrow("non-empty");
});

test("mathematical, currency and standalone lexical signs remain clickable", () => {
	const source = resolveGermanSource(
		prepareGermanSource("drei % + fünf € ≠ vier §."),
		{},
	);
	for (const text of ["%", "+", "€", "≠", "§"])
		expect(source.input.segments).toContainEqual({
			kind: "ResolvableText",
			text,
		});
});
