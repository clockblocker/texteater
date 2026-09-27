/**
 * Step 3 of Hebrew intake segmentation (#645): the words that keep more than
 * one reading after the grammar and the word list are settled in one
 * TypeSafe call per Sentence, with the Sentence as context and one bounded
 * Choice per open word, as Dumgen's sentence analysis asks one Choice per
 * occurrence in one call.
 */
import type { Questions, SystemOneResult } from "promptsmith/typesafe";
import { choice } from "../../../universal/questions.js";
import { describeReading, type HebrewReading } from "./prefixes.js";
import type { OpenHebrewWord } from "./segment.js";

const key = (word: OpenHebrewWord) => `word_${word.offset}`;

export function prefixChoiceState(stitchedText: string) {
	return {
		sentence: stitchedText,
		criteria:
			"Hebrew writes ו (and), ש (that, which), ב (in), כ (like), ל (to), מ (from) and the article ה (the) joined to the next word. After ב, כ or ל the article is not written: בבית is ba-bayit 'in the house' or be-vayit 'in a house'. A word may also simply begin with one of these letters (ברית, בקשה). Choose the reading the sentence means.",
	};
}

export function prefixQuestions(words: readonly OpenHebrewWord[]): Questions {
	const questions: Questions = {};
	for (const word of words)
		questions[key(word)] = choice(
			`Under \`criteria\`, how does the written word "${word.text}" at character ${word.offset} of \`sentence\` split?`,
			{
				...Object.fromEntries(
					word.readings.map((reading, position) => [
						`r${position}`,
						describeReading(reading),
					]),
				),
				Unresolved: "The sentence cannot decide between these readings",
			},
		);
	return questions;
}

/**
 * The reading each open word's Choice picked, keyed by the word's offset. An
 * Unresolved word is left out, so segmentation keeps it whole unless every
 * reading cuts it alike.
 */
export function chosenReadings(
	words: readonly OpenHebrewWord[],
	result: SystemOneResult<Questions>,
): ReadonlyMap<number, HebrewReading> {
	const chosen = new Map<number, HebrewReading>();
	for (const word of words) {
		const answer = result.answers[key(word)];
		const position =
			answer?.type === "choice"
				? /^r(\d+)$/u.exec(answer.choice)?.[1]
				: undefined;
		const reading =
			position === undefined
				? undefined
				: word.readings[Number(position)];
		if (reading) chosen.set(word.offset, reading);
	}
	return chosen;
}
