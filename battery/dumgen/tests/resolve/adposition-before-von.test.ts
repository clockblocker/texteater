import { expect, test } from "bun:test";
import {
	attested,
	fakeJev,
	fakeLuna,
	resolveOnce,
	sentenceOf,
	space,
	stop,
	unitOf,
	word,
} from "./support.js";

// A genitive preposition right before von or vom realizes no case of its
// own: von governs the phrase (aufgrund von Problemen). Code reads that
// from the Sentence, so no case is asked and none is recorded.

/** Luna answering a description asked alone, and the Canonical Form call with `canonicalForm`. */
const luna = (canonicalForm: string) =>
	fakeLuna((input) =>
		"markedSentence" in input && input.members.length === 0
			? "➕"
			: {
					canonicalForm,
					members: input.members.map(() => canonicalForm),
					emojiDescription: "🔁",
				},
	);

const genitive = {
	member: null,
	complement: { kind: "Case", governedCase: "Gen" },
	realizedCase: "Gen",
};

test("aufgrund before a genitive still records the genitive", async () => {
	// Aufgrund0 _1 des2 _3 Wetters4 _5 fiel6 _7 das8 _9 Spiel10 _11 aus12 .13
	const { result } = await resolveOnce(
		{ jev: fakeJev().ask, luna: luna("aufgrund").ask },
		{
			sentence: sentenceOf("Aufgrund des Wetters fiel das Spiel aus."),
			unit: unitOf([0], "Lexeme/ADP"),
		},
	);
	const attestation = attested(result);
	expect(attestation.surface.lemma.canonicalForm).toBe("aufgrund");
	expect(attestation).toHaveProperty("valencyEvidence", [genitive]);
});

test("a genitive preposition before von records no case, however it is spelled", async () => {
	const clicks = [
		// Aufgrund0 _1 von2 _3 Problemen4 …
		{
			text: "Aufgrund von Problemen fiel das Spiel aus.",
			members: [0],
			headword: "aufgrund",
		},
		// Auf0 _1 Grund2 _3 von4 _5 Problemen6 …
		{
			text: "Auf Grund von Problemen fiel das Spiel aus.",
			members: [0, 2],
			headword: "aufgrund",
		},
		// Mithilfe0 _1 von2 _3 Freunden4 …
		{
			text: "Mithilfe von Freunden zog er um.",
			members: [0],
			headword: "mithilfe",
		},
		// Mit0 _1 Hilfe2 _3 von4 _5 Freunden6 …
		{
			text: "Mit Hilfe von Freunden zog er um.",
			members: [0, 2],
			headword: "mithilfe",
		},
	];
	for (const { text, members, headword } of clicks) {
		const jev = fakeJev();
		const { result } = await resolveOnce(
			{ jev: jev.ask, luna: luna(headword).ask },
			{ sentence: sentenceOf(text), unit: unitOf(members, "Lexeme/ADP") },
		);
		const attestation = attested(result);
		expect(attestation.surface.lemma.canonicalForm).toBe(headword);
		expect(attestation).toHaveProperty("valencyEvidence", []);
	}
});

test("vom counts as von, and a preposition that may also take the dative is not asked its case before von", async () => {
	// Aufgrund0 _1 vo2 m3 _4 Regen5 .6
	const fused = await resolveOnce(
		{ jev: fakeJev().ask, luna: luna("aufgrund").ask },
		{
			sentence: sentenceOf("Aufgrund vom Regen.", [
				word("Aufgrund"),
				space,
				word("vo", "von"),
				word("m", "dem"),
				space,
				word("Regen"),
				stop,
			]),
			unit: unitOf([0], "Lexeme/ADP"),
		},
	);
	expect(attested(fused.result)).toHaveProperty("valencyEvidence", []);
	// Innerhalb0 _1 von2 _3 zwei4 _5 Tagen6 .7
	const jev = fakeJev();
	const within = await resolveOnce(
		{ jev: jev.ask, luna: luna("innerhalb").ask },
		{
			sentence: sentenceOf("Innerhalb von zwei Tagen."),
			unit: unitOf([0], "Lexeme/ADP"),
		},
	);
	expect(attested(within.result)).toHaveProperty("valencyEvidence", []);
	expect(
		jev.sent.flatMap(({ questions }) => Object.keys(questions)),
	).not.toContain("realizedCase");
});
