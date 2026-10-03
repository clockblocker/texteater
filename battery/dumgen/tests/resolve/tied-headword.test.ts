import { expect, test } from "bun:test";
import { InvalidModelOutput } from "../../src/errors.js";
import { targetOf } from "../../src/resolve/de/target.js";
import { assembleTied } from "../../src/resolve/de/tied-headword.js";
import type { Route } from "../../src/segment/segmented-sentence.js";
import { sentenceOf, unitOf } from "./support.js";

const targetAt = (
	text: string,
	segments: readonly number[],
	family: string,
	kind: string,
) => {
	const sentence = sentenceOf(text);
	const unit = unitOf(segments, family, kind);
	return targetOf(sentence, unit, unit.route as Route);
};
const word = (member: string, text = "", comma = false) => ({
	member,
	text,
	comma,
});
const full = { coverage: "Full" as const, outside: new Set<number>() };

test("a verbal Locution's words take the dictionary's order and the verb's infinitive; a placeholder or a missing word of a Full unit is dropped", () => {
	const target = targetAt(
		"Er schlägt zwei Fliegen mit einer Klappe.",
		[2, 4, 6, 8, 10, 12],
		"Locution",
		"VERB",
	);
	const spelled = ["schlägt", "zwei", "Fliegen", "mit", "einer", "Klappe"];
	expect(
		assembleTied(
			target,
			[
				word("", "jemandem"),
				word("m1"),
				word("m2"),
				word("m3"),
				word("m4"),
				word("m5"),
				word("m0", "schlagen"),
				word("", "gern"),
			],
			spelled,
			full,
		),
	).toBe("zwei Fliegen mit einer Klappe schlagen");
});

test("a missing word counts only for a Partial unit or a Locution's article, and members outside the headword never enter it", () => {
	const target = targetAt(
		"Sie bedankt sich: Vielen Dank für alles.",
		[7, 9, 11],
		"Locution",
		"INTJ",
	);
	const spelled = ["vielen", "Dank", "für"];
	const words = [word("m0"), word("m1"), word("m2")];
	expect(
		assembleTied(target, words, spelled, {
			coverage: "Full",
			outside: new Set([2]),
		}),
	).toBe("vielen Dank");
	const partial = targetAt(
		"Er schloss mit freundlichen.",
		[4, 6],
		"Locution",
		"INTJ",
	);
	const tied = [word("m0"), word("m1"), word("", "Grüßen")];
	expect(assembleTied(partial, tied, ["mit", "freundlichen"], full)).toBe(
		"mit freundlichen",
	);
	expect(
		assembleTied(partial, tied, ["mit", "freundlichen"], {
			...full,
			coverage: "Partial",
		}),
	).toBe("mit freundlichen Grüßen");
	const article = targetAt(
		"Sie treffen Entscheidungen.",
		[2, 4],
		"Locution",
		"VERB",
	);
	expect(
		assembleTied(
			article,
			[
				word("", "eine"),
				word("m1", "Entscheidung"),
				word("m0", "treffen"),
			],
			["treffen", "Entscheidungen"],
			full,
		),
	).toBe("eine Entscheidung treffen");
});

test("an adpositional or conjunctional Locution gets … exactly where its members leave a gap", () => {
	const gap = targetAt(
		"Er sprach so leise, dass keiner es hörte.",
		[4, 9],
		"Locution",
		"SCONJ",
	);
	expect(
		assembleTied(
			gap,
			[word("m0"), word("m1", "dass")],
			["so", "daß"],
			full,
		),
	).toBe("so … dass");
	const together = targetAt(
		"Sie mag Äpfel oder Ähnliches.",
		[6, 8],
		"Locution",
		"ADV",
	);
	expect(
		assembleTied(
			together,
			[word("m0"), word("m1")],
			["oder", "Ähnliches"],
			full,
		),
	).toBe("oder Ähnliches");
});

test("a Saying keeps every member it holds, in order and as written, with its commas, unless judged Partial", () => {
	const target = targetAt(
		"Wer rastet der rostet",
		[0, 2, 4, 6],
		"Saying",
		"Saying",
	);
	const spelled = ["Wer", "rastet", "der", "rostet"];
	expect(
		assembleTied(
			target,
			[word("m0"), word("m1", "rastet", true), word("m2"), word("m3")],
			spelled,
			full,
		),
	).toBe("Wer rastet, der rostet");
	expect(
		assembleTied(
			target,
			[word("m0"), word("m1", "", true), word("m3")],
			spelled,
			full,
		),
	).toBeInstanceOf(InvalidModelOutput);
	// A changed word is restored only where the Saying is Partial.
	const changed = [
		word("m0"),
		word("m1", "rastet", true),
		word("m2"),
		word("m3", "rostet nie"),
	];
	expect(assembleTied(target, changed, spelled, full)).toBe(
		"Wer rastet, der rostet",
	);
	expect(
		assembleTied(target, changed, spelled, {
			...full,
			coverage: "Partial",
		}),
	).toBe("Wer rastet, der rostet nie");
});
