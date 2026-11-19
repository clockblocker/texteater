/**
 * The system prompts a valency round can ask under, by name, so a run's
 * records name the prompt they were asked under and rescore with it.
 * `production` is the prompt `produceValency` sends. A round tries a
 * revision by adding one here, built from production's paragraphs
 * (`valencyPrompt`'s parts in `prompts.ts` and `valency-prompts.ts`);
 * everything else, the input, the strict pattern, the transport and the
 * check, stays production's, unless the revision names its own input
 * (`revisionInput`) or its own notation, whose answers are read back into
 * production's (`revisionAnswer`).
 *
 * The prompt rounds of 2026-11-19 (r1 to r5): targeted rules (r1, r2)
 * beat production; worked examples (r1, r5), a procedural rewrite (r1)
 * and a sentence-free input (r3) lost; with no referent, case letters
 * (r4) tied Duden's pronouns and beat E-VALBU's codes and person forms.
 *
 * The notation's own rounds (r1 to r3, 2026-11-19) chose production's
 * prompt; their runs, scores and spend stay under
 * evidence/valency-notation/, read by this directory's code as the third
 * round left it (its git history).
 */

import { shared, valency } from "../../../src/knowledge/de/prompts.js";
import { valencyPrompt } from "../../../src/knowledge/de/valency.js";
import { examplesParagraph } from "../../../src/knowledge/de/valency-prompts.js";
import { r1ExamplesBlock, r1Rules } from "./r1-examples.js";
import { r1NativePrompt } from "./r1-native.js";
import { r2Rules } from "./r2-rules.js";
import { r3NoSentence, r3Rules, withoutSentence } from "./r3-rules.js";
import {
	type CaseWords,
	casePattern,
	casePrompt,
	grammisWords,
	letterWords,
	locutionPrompt,
	personWords,
	toProduction,
} from "./r4-case.js";

/** Production's prompt with its examples line replaced by `lines`. */
const productionWith = (...lines: string[]) => {
	if (!valencyPrompt.endsWith(examplesParagraph))
		throw Error("Production's prompt no longer ends with its examples");
	return `${valencyPrompt.slice(0, -examplesParagraph.length)}${lines.join("\n")}`;
};

/** A prompt with production's referent paragraph replaced by `referent`. */
function withReferent(referent: string, prompt: string) {
	if (!prompt.includes(valency.referent))
		throw Error("Production's referent paragraph is gone");
	return prompt.replace(valency.referent, referent);
}

const r3Prompt = withReferent(
	r3Rules.referent,
	productionWith(...r3Rules.added, examplesParagraph),
);

export const revisions: Readonly<Record<string, string>> = {
	production: valencyPrompt,
	// Round 1 (2026-11-19): targeted rules, worked examples, both, a rewrite.
	"rules@r1": productionWith(...r1Rules, examplesParagraph),
	"examples@r1": productionWith(r1ExamplesBlock),
	"rules-examples@r1": productionWith(...r1Rules, r1ExamplesBlock),
	"native@r1": r1NativePrompt,
	// Round 2: r1's rules refined (referents, Collocations, governed cases).
	"rules@r2": withReferent(
		r2Rules.referent,
		productionWith(...r2Rules.added, examplesParagraph),
	),
	"rules-r1ref@r2": productionWith(
		...r2Rules.added,
		r1Rules[3] as string,
		examplesParagraph,
	),
	"rules-noref@r2": productionWith(...r2Rules.added, examplesParagraph),
	// Round 3: r2 with objects kept out of the Optional default, and
	// Collocations told the sentence seldom shows their complements; then
	// the same without the sentence.
	"rules@r3": r3Prompt,
	"nosentence@r3": r3Prompt.replace(shared.evidence, r3NoSentence),
	// Round 4: no referent, each noun phrase named by its case alone, in
	// three notations; scored with --ignore-referent.
	"person@r4": casePrompt(personWords),
	"letters@r4": casePrompt(letterWords),
	"grammis@r4": casePrompt(grammisWords),
	// Round 5: letters, with Locution examples, and with the fixed-noun rule too.
	"letters-ex@r5": locutionPrompt(letterWords, false),
	"letters-exfix@r5": locutionPrompt(letterWords, true),
};

/** Each case-only revision's words, for its schema and for reading its answers. */
const caseNotations: Readonly<Record<string, CaseWords>> = {
	"person@r4": personWords,
	"letters@r4": letterWords,
	"grammis@r4": grammisWords,
	"letters-ex@r5": letterWords,
	"letters-exfix@r5": letterWords,
};

/** What a revision makes of production's input, for the revisions that change it. */
const inputs: Readonly<Record<string, (input: unknown) => unknown>> = {
	"nosentence@r3": withoutSentence,
};

/** A revision's input transform and answer schema, when it has its own. */
export const revisionInput = (
	name: string,
): {
	readonly input?: (input: unknown) => unknown;
	readonly schema?: Readonly<Record<string, unknown>>;
} => {
	const input = inputs[name];
	const words = caseNotations[name];
	return {
		...(input ? { input } : {}),
		...(words
			? { schema: { type: "string", pattern: casePattern(words) } }
			: {}),
	};
};

/** How a revision's answer reads in production's notation. */
export const revisionAnswer = (
	name: string,
): { readonly adapt: (output: unknown) => unknown } => {
	const words = caseNotations[name];
	return {
		adapt: (output) =>
			words && typeof output === "string"
				? toProduction(output, words)
				: output,
	};
};

/** A revision's system prompt; an unknown name throws. */
export function revisionPrompt(name: string): string {
	const prompt = revisions[name];
	if (prompt === undefined)
		throw Error(
			`${name} is no revision (${Object.keys(revisions).join(", ")})`,
		);
	return prompt;
}
