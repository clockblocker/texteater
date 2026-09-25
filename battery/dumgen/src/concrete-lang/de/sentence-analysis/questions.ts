/**
 * The one jev call per sentence (Dumgen ADR 0006), as questions over the
 * input sentence's ResolvableText Segments tagged by index. The Lexeme layer
 * asks membership from every anchor, one route Choice unless an
 * abbreviation's reviewed Kind fixes it, one role Choice and, for a spelling
 * with authored candidates, one identity Choice, all under `criteria`. The
 * Phraseme layer asks one fixedness Score and one Kind Choice per occurrence
 * and one Noul per unordered pair, under `fixedness`.
 * Government questions (`government.ts`) join the same call.
 */

import type { Questions } from "promptsmith/typesafe";
import type { SegmentedSentence } from "../../../types.js";
import { choice, noul, score } from "../../../universal/questions.js";
import { indexedContext } from "../../../universal/validation.js";
import {
	fixednessCriteria,
	fixednessLevels,
	lexemeRoutes,
	notation,
	phrasemeKindOptions,
	realizationCriteria,
	roles,
} from "./criteria.js";
import { governmentCriteria } from "./government.js";
import { candidatesFor, identityInstructions, rubricOf } from "./identity.js";
import type { Placement } from "./placement.js";

/** `government` joins the state only when the call asks government questions. */
export function analysisState(
	sentence: SegmentedSentence<"de">,
	governs = false,
) {
	return {
		sentence: indexedContext(sentence),
		criteria: `${notation} ${realizationCriteria}`,
		fixedness: fixednessCriteria,
		...(governs ? { government: governmentCriteria } : {}),
	};
}

const label = (sentence: SegmentedSentence<"de">, index: number) =>
	`<s${index}> "${sentence.segments[index]?.text ?? ""}"`;

export function lexemeQuestions(
	sentence: SegmentedSentence<"de">,
	resolvable: readonly number[],
	routes: Placement["routes"],
): Questions {
	const questions: Questions = {};
	for (const anchor of resolvable)
		for (const other of resolvable) {
			if (other === anchor) continue;
			questions[`m_${anchor}_${other}`] = choice(
				`Under \`criteria\`, does occurrence <s${other}> in \`sentence\` belong to the same complete fixed unit as occurrence <s${anchor}>?`,
				{
					Include: "It is a fixed member of that same unit",
					Exclude:
						"It belongs to another unit or is free contextual material",
					Unresolved: "Its membership cannot be defensibly decided",
				},
			);
		}
	for (const index of resolvable) {
		if (!routes.has(index))
			questions[`route_${index}`] = choice(
				`Under \`criteria\`, what is the Family/Kind of the complete fixed unit that contains occurrence <s${index}> in \`sentence\`? Classify the whole unit, not the standalone part of speech of this word alone.`,
				lexemeRoutes,
			);
		questions[`role_${index}`] = choice(
			`What is the role of occurrence ${label(sentence, index)} inside the complete fixed unit that contains it in \`sentence\`? Choose Free when that unit is this single occurrence.`,
			roles,
		);
		const text = sentence.segments[index]?.text ?? "";
		const candidates = candidatesFor(text);
		if (candidates.length)
			questions[`id_${index}`] = choice(
				identityInstructions(index, text),
				{
					...Object.fromEntries(
						candidates.map((member, position) => [
							`c${position}`,
							rubricOf(member, text),
						]),
					),
					NoMatch:
						"None of the listed identities is this word in this sentence",
					Unresolved:
						"The sentence cannot decide between listed identities",
				},
			);
	}
	return questions;
}

export function phrasemeQuestions(
	sentence: SegmentedSentence<"de">,
	resolvable: readonly number[],
): Questions {
	const questions: Questions = {};
	for (const index of resolvable) {
		questions[`fix_${index}`] = score(
			`Under \`fixedness\`, how fixed is the word realized by occurrence ${label(sentence, index)} in \`sentence\` inside the wording around it?`,
			fixednessLevels,
		);
		questions[`pk_${index}`] = choice(
			`Under \`fixedness\`, if the word realized by occurrence ${label(sentence, index)} in \`sentence\` is a fixed lexical member of an established multiword expression, which Kind is that expression?`,
			phrasemeKindOptions,
		);
	}
	for (const [position, a] of resolvable.entries())
		for (const b of resolvable.slice(position + 1))
			questions[`same_${a}_${b}`] = noul(
				`Under \`fixedness\`, are the words realized by occurrences ${label(sentence, a)} and ${label(sentence, b)} in \`sentence\` both fixed lexical members of the same one established multiword expression?`,
				{
					true: "Both words are fixed lexical members of the same expression",
					false: "At least one is free material, or they belong to different expressions",
				},
			);
	return questions;
}

/** Questions per call; the request budget is about 32k tokens shared by state and questions. */
export const questionsPerCall = 220;

export function chunk(questions: Questions): Questions[] {
	const entries = Object.entries(questions);
	if (entries.length <= questionsPerCall) return [questions];
	const parts: Questions[] = [];
	for (let start = 0; start < entries.length; start += questionsPerCall)
		parts.push(
			Object.fromEntries(entries.slice(start, start + questionsPerCall)),
		);
	return parts;
}
