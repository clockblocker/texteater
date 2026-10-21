import { describe, expect, test } from "bun:test";
import { prepositions } from "../src/inventories/de/prepositions.js";
import {
	authoredFor,
	authoredMembers,
	closedRoute,
} from "../src/inventories.js";

const adp = (canonicalForm: string) => ({
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "ADP",
	canonicalForm,
	coreFeatures: {},
});
const readingsOf = (canonicalForm: string) =>
	authoredFor(adp(canonicalForm)).map(
		({ reading }) => reading.emojiDescription,
	);

describe("the authored German ADP Readings (system ADR 0021)", () => {
	test("stay a Fixed Population: ADP is an Open Route", () => {
		expect(
			closedRoute({ language: "de", family: "Lexeme", kind: "ADP" }),
		).toBe(false);
	});

	test("give each preposition of the pronominal adverbs one generic Reading, labelled as its pronominal adverbs are", () => {
		for (const { text, emoji, vowel } of prepositions) {
			expect(readingsOf(text)[0]).toBe(emoji);
			const daForm = `da${vowel ? "r" : ""}${text}`;
			const pronominal = authoredMembers.find(
				({ lemma }) =>
					lemma.kind === "ADV" && lemma.canonicalForm === daForm,
			);
			expect(pronominal?.reading.emojiDescription).toBe(emoji);
		}
	});

	test("split only the senses gold names apart: temporal an 📅 and zu with a number 👥", () => {
		expect(readingsOf("an")).toEqual(["📌", "📅"]);
		expect(readingsOf("zu")).toEqual(["🎯", "👥"]);
		const split = prepositions.filter(
			({ text }) => readingsOf(text).length > 1,
		);
		expect(split.map(({ text }) => text)).toEqual(["an", "zu"]);
	});

	test("author no adposition outside the table, which stays generated", () => {
		expect(readingsOf("wegen")).toEqual([]);
		expect(readingsOf("ohne")).toEqual([]);
	});

	test("transcribe a vowel-initial preposition without the linking r of daran", () => {
		const [an] = authoredFor(adp("an"));
		expect(an?.knowledge.transcription).toBe("an");
		const [ueber] = authoredFor(adp("über"));
		expect(ueber?.knowledge.transcription).toBe("yːbɐ");
	});
});
