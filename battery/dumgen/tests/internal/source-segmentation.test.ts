import { describe, expect, test } from "bun:test";

import { segmentGerman } from "../../src/source-segmentation/de";
import { segmentHebrew } from "../../src/source-segmentation/he";
import type { Segment, SegmentKind } from "../../src/types";

type Case = readonly [id: string, input: string, expected: string];

const DE: readonly Case[] = [
	[
		"clean",
		"Das Krankenhaus steht im Zentrum.",
		"R:Das¦W¦R:Krankenhaus¦W¦R:steht¦W¦R:im¦W¦R:Zentrum¦P:.",
	],
	[
		"compound",
		"Donaudampfschifffahrt und Staubecken",
		"R:Donaudampfschifffahrt¦W¦R:und¦W¦R:Staubecken",
	],
	["punctuation", "„Wirklich?!“ ...", "P:„¦R:Wirklich¦P:?!¦P:“¦W¦P:..."],
	[
		"abbreviation",
		"Dr. Meier kommt z. B. heute.",
		"R:Dr.¦W¦R:Meier¦W¦R:kommt¦W¦R:z. B.¦W¦R:heute¦P:.",
	],
	[
		"apostrophe",
		"Sie’s auf’m Berg, Hannes’ Rad aus D’dorf.",
		"R:Sie¦P:’¦R:s¦W¦R:auf¦P:’¦R:m¦W¦R:Berg¦P:,¦W¦R:Hannes’¦W¦R:Rad¦W¦R:aus¦W¦R:D’dorf¦P:.",
	],
	[
		"hyphen",
		"Die E‑Mail‑Adresse betrifft Arbeits- und Sozialrecht.",
		"R:Die¦W¦R:E‑Mail‑Adresse¦W¦R:betrifft¦W¦R:Arbeits-¦W¦R:und¦W¦R:Sozialrecht¦P:.",
	],
	[
		"url",
		"Siehe https://example.de/a-b?q=1.",
		"R:Siehe¦W¦O:https://example.de/a-b?q=1¦P:.",
	],
	[
		"email",
		"Mail an anna@example.de oder foo_bar42.",
		"R:Mail¦W¦R:an¦W¦O:anna@example.de¦W¦R:oder¦W¦O:foo_bar42¦P:.",
	],
	[
		"emoji",
		"Hallo 👩‍❤️‍👩 🇩🇪 👍🏽 :-)!",
		"R:Hallo¦W¦O:👩‍❤️‍👩¦W¦O:🇩🇪¦W¦O:👍🏽¦W¦O::-)¦P:!",
	],
	[
		"numbers",
		"Am 12.08.2026 kostet es €50 und 50 kg, aber 50%.",
		"R:Am¦W¦R:12.08.2026¦W¦R:kostet¦W¦R:es¦W¦R:€¦R:50¦W¦R:und¦W¦R:50¦W¦R:kg¦P:,¦W¦R:aber¦W¦O:50%¦P:.",
	],
	[
		"decimal",
		"Pi ist ungefähr 3,14.",
		"R:Pi¦W¦R:ist¦W¦R:ungefähr¦W¦R:3,14¦P:.",
	],
	[
		"typo",
		"Das Kranckenhaus ist groß.",
		"R:Das¦W¦R:Kranckenhaus¦W¦R:ist¦W¦R:groß¦P:.",
	],
	[
		"malformed",
		"Kran ken haus bleibt hier",
		"R:Kran¦W¦R:ken¦W¦R:haus¦W¦R:bleibt¦W¦R:hier",
	],
	[
		"chat-code-mixed",
		"bruh u bist him frfr",
		"R:bruh¦W¦R:u¦W¦R:bist¦W¦R:him¦W¦R:frfr",
	],
	[
		"chat-german",
		"Digga du bist echt der Typ frfr",
		"R:Digga¦W¦R:du¦W¦R:bist¦W¦R:echt¦W¦R:der¦W¦R:Typ¦W¦R:frfr",
	],
	[
		"chat-meme",
		"brooo du bims 1 goat no cap 💀",
		"R:brooo¦W¦R:du¦W¦R:bims¦W¦R:1¦W¦R:goat¦W¦R:no¦W¦R:cap¦W¦O:💀",
	],
	[
		"mixed-script",
		"Deutsch trifft abcאבג123 und #LearnGerman.",
		"R:Deutsch¦W¦R:trifft¦W¦O:abcאבג123¦W¦R:und¦W¦P:#¦O:LearnGerman¦P:.",
	],
	[
		"foreign-latin",
		"Deutsch trifft Hello world.",
		"R:Deutsch¦W¦R:trifft¦W¦R:Hello¦W¦R:world¦P:.",
	],
	["nfd", "Café bleibt Café.", "R:Café¦W¦R:bleibt¦W¦R:Café¦P:."],
	["whitespace", "Ein Wort", "R:Ein¦W¦R:Wort"],
];

const HE: readonly Case[] = [
	[
		"prefix-context-deferred",
		"הילד נמצא בבית הגדול",
		"R:הילד¦W¦R:נמצא¦W¦R:בבית¦W¦R:הגדול",
	],
	["prefix-chain-deferred", "וכשהגעתי הביתה", "R:וכשהגעתי¦W¦R:הביתה"],
	["oversplit-guard", "שלום בית לילה", "R:שלום¦W¦R:בית¦W¦R:לילה"],
	["pointed-surface", "בַּבַּיִת", "R:בַּ¦R:בַּיִת"],
	["unpointed-deferred", "בבית", "R:בבית"],
	["covert-deferred", "אני בבית", "R:אני¦W¦R:בבית"],
	["possessive-deferred", "זה ספרו", "R:זה¦W¦R:ספרו"],
	["verbal-whole", "הם ספרו עד עשר", "R:הם¦W¦R:ספרו¦W¦R:עד¦W¦R:עשר"],
	["pointed-whole", "הם סָפְרוּ", "R:הם¦W¦R:סָפְרוּ"],
	["suffixes-deferred", "הבית שלנו לימודיו", "R:הבית¦W¦R:שלנו¦W¦R:לימודיו"],
	["niqqud-maqaf", "שָׁלוֹם בית־ספר יום-יום", "R:שָׁלוֹם¦W¦R:בית־ספר¦W¦R:יום-יום"],
	["abbreviations", 'צה״ל צה"ל ג׳ון', 'R:צה״ל¦W¦R:צה"ל¦W¦R:ג׳ון'],
	["malformed-quote", "אב״ג״", "O:אב״ג״"],
	["punctuation", "״שלום?!״ באמת...", "P:״¦R:שלום¦P:?!¦P:״¦W¦R:באמת¦P:..."],
	[
		"numbers",
		"50 3,14 12.08.2026 50%",
		"R:50¦W¦R:3,14¦W¦R:12.08.2026¦W¦O:50%",
	],
	["currency", "₪50", "R:₪¦R:50"],
	[
		"mixed-script",
		"abcאבג123 ב־DNA id_אבג-42",
		"O:abcאבג123¦W¦O:ב־DNA¦W¦O:id_אבג-42",
	],
	["foreign-local", "שלום world היום", "R:שלום¦W¦O:world¦W¦R:היום"],
	["typo-noise", "שלוווום גכצזץ חבר", "R:שלוווום¦W¦O:גכצזץ¦W¦R:חבר"],
	["emoji", "שלום 👨‍👩‍👧‍👦!", "R:שלום¦W¦O:👨‍👩‍👧‍👦¦P:!"],
	[
		"url",
		"https://example.org/שלום?q=בית.",
		"O:https://example.org/שלום?q=בית¦P:.",
	],
	["hashtag", "#שלום", "P:#¦O:שלום"],
];

describe("production Source Segmentation corpora", () => {
	for (const [language, cases, segment] of [
		["de", DE, segmentGerman],
		["he", HE, segmentHebrew],
	] as const) {
		test(`${language} matches every accepted prototype expectation`, () => {
			for (const [id, input, expected] of cases) {
				const first = segment(input);
				const second = segment(input);
				expect(render(first.segments), id).toBe(expected);
				expect(first.segments, `${id}: deterministic`).toEqual(
					second.segments,
				);
				expect(first.trace, `${id}: aligned trace`).toHaveLength(
					first.segments.length,
				);
				expect(
					first.segments.map(({ text }) => text).join(""),
					`${id}: lossless`,
				).toBe(input);
				expect(
					graphemeSafe(input, first.segments),
					`${id}: grapheme safe`,
				).toBe(true);
			}
		});
	}

	test("rejects broken Intake invariants instead of repairing them", () => {
		for (const invalid of [
			"",
			" ",
			"Nicht  normalisiert",
			"Nicht\tnormalisiert",
		]) {
			expect(() => segmentGerman(invalid)).toThrow(/Stitched Text/);
			expect(() => segmentHebrew(invalid)).toThrow(/Stitched Text/);
		}
	});
});

const marker: Readonly<Record<SegmentKind, string>> = {
	ResolvableText: "R",
	OpaqueText: "O",
	Whitespace: "W",
	Punctuation: "P",
};

function render(segments: readonly Segment[]): string {
	return segments
		.map((segment) =>
			segment.kind === "Whitespace"
				? "W"
				: `${marker[segment.kind]}:${segment.text}`,
		)
		.join("¦");
}

function graphemeSafe(input: string, segments: readonly Segment[]): boolean {
	const boundaries = new Set<number>([0, input.length]);
	for (const part of new Intl.Segmenter(undefined, {
		granularity: "grapheme",
	}).segment(input)) {
		boundaries.add(part.index);
	}
	let offset = 0;
	for (const segment of segments) {
		if (!boundaries.has(offset)) return false;
		offset += segment.text.length;
		if (!boundaries.has(offset)) return false;
	}
	return offset === input.length;
}
