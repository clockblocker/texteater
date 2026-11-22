import { expect, test } from "bun:test";
import {
	analyzeQuotationFlow,
	needsParagraphRecovery,
	needsStructureRecovery,
	rebuildScrollParagraphs,
	recoverParagraphsDeterministic,
} from "../src/dialogue.js";
import {
	extractPastedText,
	type Scroll,
} from "../src/extracted-text/extracted-text.js";
import { parseScroll } from "../src/extracted-text/parse.js";
import { scrollSchema } from "../src/extracted-text/schema.js";
import { splitScroll } from "../src/extracted-text/split.js";
import { splitText } from "../src/split-text.js";

test("tracks open quotations and direct speaker switches across German guillemets", () => {
	const sentences = splitText(
		"»Zoey, hörst du zu? Er hatte vier Bier. Bestimmt.« »Ja«, murmelte ich. »Schon okay.« »Egal!«",
	).paragraphs.flatMap(({ sentences }) => sentences);

	const flow = analyzeQuotationFlow(sentences);
	expect(sentences).toEqual([
		"»Zoey, hörst du zu?",
		"Er hatte vier Bier.",
		"Bestimmt.«",
		"»Ja«, murmelte ich.",
		"»Schon okay.«",
		"»Egal!«",
	]);
	expect(flow.map((f) => f.endsInsideQuote)).toEqual([
		true,
		true,
		false,
		false,
		false,
		false,
	]);
	expect(flow.map((f) => f.directSpeakerSwitchBefore)).toEqual([
		false,
		false,
		false,
		true, // Bestimmt.« -> »Ja«, murmelte ich.
		false, // murmelte ich. -> »Schon okay.« (tag in between, not direct quote-to-quote)
		true, // »Schon okay.« -> »Egal!«
	]);
});

test("tracks German curly quotes and straight ASCII quotes", () => {
	const curly = analyzeQuotationFlow([
		"„Warte hier.",
		"Ich bin gleich zurück.“",
		"„Okay!“",
	]);
	expect(curly.map((f) => f.endsInsideQuote)).toEqual([true, false, false]);
	expect(curly.map((f) => f.directSpeakerSwitchBefore)).toEqual([
		false,
		false,
		true,
	]);

	const ascii = analyzeQuotationFlow(['"Hello."', '"Hi!"']);
	expect(ascii[1]?.directSpeakerSwitchBefore).toBe(true);
});

test("needsParagraphRecovery skips well-formatted paragraphs and flags flattened ones", () => {
	// Short / well-formatted paragraphs stay untouched.
	expect(needsParagraphRecovery(["Die Banken."])).toBe(false);
	expect(needsParagraphRecovery(["Er gibt auf.", "Er wohnt im Haus."])).toBe(
		false,
	);
	expect(
		needsParagraphRecovery([
			"»Also echt, Zoey«, sagte Kayla, »er war nicht betrunken.",
			"Jetzt verurteil ihn nicht.«",
		]),
	).toBe(false);
	expect(
		needsParagraphRecovery([
			"Cast, P.C.; Cast, Kristin.",
			"Gezeichnet: House of Night (German Edition) (pp. 11-14).",
			"(Function).",
			"Kindle Edition.",
		]),
	).toBe(false);

	// Direct quote-to-quote turn always flags.
	expect(needsParagraphRecovery(["»Hallo!«", "»Wie geht's?«"])).toBe(true);

	// 3+ distinct dialogue turns in one paragraph flags even with tags between them.
	expect(
		needsParagraphRecovery([
			"»Eins«, sagte er.",
			"»Zwei«, sagte sie.",
			"»Drei«, rief er.",
		]),
	).toBe(true);

	// Long prose wall without quotes flags.
	const proseWall = Array.from(
		{ length: 9 },
		(_, i) =>
			`In Absatz Nummer ${i + 1} geht es um ein sehr ausführliches Thema mit vielen Wörtern und Gedanken, die eigentlich getrennt gehören.`,
	);
	expect(needsParagraphRecovery(proseWall)).toBe(true);
	expect(needsStructureRecovery([{ sentences: proseWall }])).toBe(true);
});

test("recoverParagraphsDeterministic splits direct quote-to-quote speaker turns in code", () => {
	const sentences = splitText(
		"»Ey, dein Freund –« »Fast-Freund«, stellte ich richtig. »Egal!« »Sechzehn.«",
	).paragraphs;
	expect(recoverParagraphsDeterministic(sentences)).toEqual({
		paragraphs: [
			{ sentences: ["»Ey, dein Freund –«"] },
			{
				sentences: ["»Fast-Freund«, stellte ich richtig.", "»Egal!«"],
			},
			{ sentences: ["»Sechzehn.«"] },
		],
	});
});

test("rebuildScrollParagraphs replaces only flattened Paragraph blocks and preserves headings, scene breaks and untouched paragraphs", () => {
	const scroll: Scroll = {
		kind: "Scroll",
		heading: { runs: [{ kind: "Run", text: "Kapitel 1" }] },
		blocks: [
			{
				kind: "Paragraph",
				inlines: [
					{
						kind: "Run",
						text: "Er kam herein. »Hallo!« »Wie geht's?«",
					},
				],
			},
			{ kind: "SceneBreak" },
			{
				kind: "Paragraph",
				inlines: [{ kind: "Run", text: "Kursiv.", styles: ["Italic"] }],
			},
		],
	};

	const recovered = [
		{ sentences: ["Kapitel 1"] },
		{ sentences: ["Er kam herein."] },
		{ sentences: ["»Hallo!«"] },
		{ sentences: ["»Wie geht's?«"] },
		{ sentences: ["Kursiv."] },
	];

	const rebuilt = rebuildScrollParagraphs(scroll, recovered);
	expect(rebuilt.heading).toEqual(scroll.heading);
	expect(rebuilt.blocks).toEqual([
		{
			kind: "Paragraph",
			inlines: [{ kind: "Run", text: "Er kam herein." }],
		},
		{
			kind: "Paragraph",
			inlines: [{ kind: "Run", text: "»Hallo!«" }],
		},
		{
			kind: "Paragraph",
			inlines: [{ kind: "Run", text: "»Wie geht's?«" }],
		},
		{ kind: "SceneBreak" },
		{
			kind: "Paragraph",
			inlines: [{ kind: "Run", text: "Kursiv.", styles: ["Italic"] }],
		},
	]);
	// Round-trips cleanly through parseScroll, scrollSchema and splitScroll.
	expect(parseScroll(rebuilt)).toEqual(rebuilt);
	expect(scrollSchema.parse(rebuilt)).toEqual(rebuilt);
	expect(splitScroll(rebuilt).paragraphs).toEqual(recovered);

	// Pasted text round-trip.
	const pasted = extractPastedText("»Hallo!« »Tschüss!«\n\nEnde.");
	const pastedRecovered = [
		{ sentences: ["»Hallo!«"] },
		{ sentences: ["»Tschüss!«"] },
		{ sentences: ["Ende."] },
	];
	const rebuiltPasted = rebuildScrollParagraphs(pasted, pastedRecovered);
	expect(splitScroll(rebuiltPasted).paragraphs).toEqual(pastedRecovered);
});
