import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
	CardStack,
	CardView,
	cardKinds,
	germanText,
	hebrewText,
	resolveWord,
	textFromParagraphs,
	WordText,
	wordsOf,
} from ".";

const sentences = germanText.paragraphs.flatMap((paragraph) =>
	paragraph.sentences.map((sentence) => sentence.text),
);
const word = (text: string) => {
	const found = wordsOf(germanText).find(
		(candidate) => candidate.text === text,
	);
	if (!found) throw new Error(`no word ${text}`);
	return found;
};

describe("German text", () => {
	test("holds the words the demos click", () => {
		const prose = sentences.join(" ");
		for (const phrase of [
			"auf der Bank",
			"ging",
			"zum Bahnhof",
			"detaillierte",
		])
			expect(prose).toContain(phrase);
		expect(prose).toMatch(/fängt .+ an\?/);
		expect(germanText.paragraphs.length).toBeGreaterThanOrEqual(3);
	});

	test("marks fängt … an as one unit and keeps each word's sentence", () => {
		const faengt = word("fängt");
		const members = wordsOf(germanText).filter(
			(candidate) => candidate.unitId === faengt.unitId,
		);
		expect(members.map((member) => member.text)).toEqual(["fängt", "an"]);
		expect(faengt.sentence).toBe(
			"„Wann fängt das Konzert heute Abend an?“, fragte er.",
		);
	});

	test("Hebrew is one sentence of words", () => {
		expect(hebrewText.lang).toBe("he");
		expect(wordsOf(hebrewText).map((token) => token.text)).toContain("הלך");
	});
});

describe("textFromParagraphs", () => {
	test("splits sentences and reads {word|unit} marks", () => {
		const text = textFromParagraphs("t", "de", "T", [
			"Sie {ruft|anrufen} ihn {an|anrufen}. Er geht.",
		]);
		const [first, second] = text.paragraphs[0]?.sentences ?? [];
		expect(first?.text).toBe("Sie ruft ihn an.");
		expect(second?.text).toBe("Er geht.");
		expect(
			wordsOf(text)
				.filter((token) => token.unitId === "anrufen")
				.map((token) => token.text),
		).toEqual(["ruft", "an"]);
	});
});

describe("resolveWord", () => {
	test("deals Attestation, Surface, Lemma and Reading with a quote", () => {
		const { cards } = resolveWord(word("ging"));
		expect(cards.map((card) => card.kind)).toEqual([...cardKinds]);
		expect(cards[1]?.caption).toBe("ging · past of");
		expect(cards[0]?.quote).toBe("Am Morgen ging Lena zum Bahnhof.");
		expect(cards[0]?.links).toEqual([{ relation: "lemma", word: "gehen" }]);
	});

	test("a bare lemma finds its entry; an unknown word gets generic Cards", () => {
		expect(resolveWord("anfangen").word).toBe("fängt … an");
		expect(resolveWord(word("Kiosk")).cards[3]?.title).toBe("kiosk");
	});
});

describe("components", () => {
	test("WordText marks every member of the selected unit", () => {
		const html = renderToStaticMarkup(
			<WordText text={germanText} selectedWordId={word("fängt").id} />,
		);
		const selected = html.match(/decoration-\[0\.11em\]/g) ?? [];
		expect(selected.length).toBe(2);
		expect(html).toContain('data-sentence-id="de-p1-s1"');
	});

	test("a collapsed CardView is its one-line tail", () => {
		const surface = resolveWord(word("ging")).cards[1];
		if (!surface) throw new Error("no Surface Card");
		const html = renderToStaticMarkup(
			<CardView card={surface} collapsed />,
		);
		expect(html).toContain("ging · past of");
		expect(html).not.toContain(surface.definition);
	});

	test("CardStack shows the front Card in full and the rest as tails", () => {
		const { cards } = resolveWord(word("ging"));
		const html = renderToStaticMarkup(
			<CardStack cards={cards} frontIndex={2} />,
		);
		expect(html).toContain("ging · past of");
		expect(html).toContain("Strong verb: geht, ging, ist gegangen.");
		expect(html).not.toContain("gehen · to go on foot");
	});
});
