import { describe, expect, test } from "bun:test";

import type { SourceSegment } from "./link-members";
import { excerptSourceSentence } from "./source-excerpt";

/** Segments as the reader stores them: words, single spaces, single marks. */
function segmentsOf(sentence: string): SourceSegment[] {
	return [...sentence.matchAll(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]/gu)].map(
		([text]) => ({
			kind: /^\s+$/.test(text)
				? "Whitespace"
				: /^[\p{L}\p{N}]/u.test(text)
					? "ResolvableText"
					: "Punctuation",
			text,
		}),
	);
}

/** The excerpt for the given member words, with members in brackets. */
function excerpt(sentence: string, members: readonly string[]): string {
	const segments = segmentsOf(sentence);
	const indices: number[] = [];
	for (const member of members) {
		const index = segments.findIndex(
			(segment, at) =>
				segment.text === member && at > (indices.at(-1) ?? -1),
		);
		if (index < 0) throw new Error(`No member ${member}`);
		indices.push(index);
	}
	const result = excerptSourceSentence(segments, indices);
	const lit = new Set(result.memberSegmentIndices);
	return result.segments
		.map((segment, index) =>
			lit.has(index) ? `[${segment.text}]` : segment.text,
		)
		.join("");
}

const zauberberg =
	"Hans Castorp – dies der Name des jungen Mannes – befand sich allein mit seiner krokodilsledernen Handtasche, einem Geschenk seines Onkels und Pflegevaters, Konsul Tienappel, um auch diesen Namen hier gleich zu nennen –, seinem Wintermantel, der an einem Haken schaukelte, und seiner Plaidrolle in einem kleinen grau gepolsterten Abteil; er saß bei niedergelassenem Fenster, und da der Nachmittag sich mehr und mehr verkühlte, so hatte er, Familiensöhnchen und Zärtling, den Kragen seines modisch weiten, auf Seide gearbeiteten Sommerüberziehers aufgeschlagen.";

describe("excerptSourceSentence", () => {
	test("quotes a sentence of at most 30 words whole", () => {
		expect(
			excerpt(
				"Er grüßte höflich, blieb jedoch unschlüssig zwischen den Tischen stehen, als suche er etwas, dessen Namen er vergessen hatte.",
				["Tischen"],
			),
		).toBe(
			"Er grüßte höflich, blieb jedoch unschlüssig zwischen den [Tischen] stehen, als suche er etwas, dessen Namen er vergessen hatte.",
		);
	});

	test("keeps whole Clause Pieces around the member, within the clause first", () => {
		expect(excerpt(zauberberg, ["gepolsterten"])).toBe(
			"… seinem Wintermantel, der an einem Haken schaukelte, und seiner Plaidrolle in einem kleinen grau [gepolsterten] Abteil …",
		);
		expect(excerpt(zauberberg, ["Hans", "Castorp"])).toBe(
			"[Hans] [Castorp] – dies der Name des jungen Mannes – befand sich allein mit seiner krokodilsledernen Handtasche …",
		);
	});

	test("keeps every piece a unit's members span", () => {
		expect(excerpt(zauberberg, ["da", "so"])).toBe(
			"… und [da] der Nachmittag sich mehr und mehr verkühlte, [so] hatte er, Familiensöhnchen und Zärtling …",
		);
	});

	test("elides the pieces between members too far apart", () => {
		expect(
			excerpt(
				"Er reichte, nachdem er lange und gründlich über alles nachgedacht hatte, was man ihm am Vortag in der Kanzlei gesagt und geschrieben hatte, und nachdem er mit seiner Frau, seinem Bruder und dem alten Pfarrer gesprochen hatte, schließlich seinen Abschied ein.",
				["reichte", "ein"],
			),
		).toBe("Er [reichte] … schließlich seinen Abschied [ein].");
	});

	test("cuts a piece without breaks by words around the member", () => {
		expect(
			excerpt(
				"Das Haus stand am Ende einer langen Allee von Linden deren Kronen sich über dem Weg zu einem grünen Gewölbe schlossen und in deren Schatten selbst an den heißesten Tagen des Sommers eine angenehme Kühle herrschte die den Wanderer zum Verweilen einlud.",
				["Gewölbe"],
			),
		).toBe(
			"… deren Kronen sich über dem Weg zu einem grünen [Gewölbe] schlossen und in deren Schatten selbst an den …",
		);
	});

	test("lengthens a short excerpt into the next piece", () => {
		expect(
			excerpt(
				"Seit Wochen schon hatte es nicht geregnet, und die Bauern, die sonntags nach der Messe vor der Kirche zusammenstanden, sprachen von nichts anderem als von der Dürre, den vertrockneten Rüben, dem Vieh, das man bald würde verkaufen müssen, und von den Preisen, die im Herbst gewiß ins Unerhörte steigen würden.",
				["geregnet"],
			),
		).toBe("Seit Wochen schon hatte es nicht [geregnet], und die Bauern …");
	});

	test("keeps a quote's opening mark and drops an empty unpaired one", () => {
		expect(
			excerpt(
				"„Ich weiß nicht, was du dir eigentlich dabei gedacht hast“, sagte die Mutter, indem sie die Tasse abstellte und ihn über den Rand ihrer Brille hinweg ansah, „aber eines kann ich dir sagen: so geht es nicht weiter.“",
				["geht", "weiter"],
			),
		).toBe(
			"… „aber eines kann ich dir sagen: so [geht] es nicht [weiter].“",
		);
		expect(
			excerpt(
				"Der Professor (ein hagerer Mann mit grauem Spitzbart, der seine Vorlesungen stets mit einem Zitat aus dem Faust zu beginnen pflegte) blieb an der Tür stehen und musterte die Studenten, die sich in den vorderen Reihen drängten, mit unverhohlener Neugier.",
				["hagerer"],
			),
		).toBe(
			"Der Professor (ein [hagerer] Mann mit grauem Spitzbart, der seine Vorlesungen stets mit einem Zitat aus dem Faust …",
		);
	});
});
