/**
 * Every text `knowledge.accumulateValency` sends to jev (ADR 0034), each a
 * paragraph that cites the dumcorpus Rules it states at the statement hash
 * it was last checked against (ADR 0037, #695).
 *
 * - jev judges first, as it judges translations (ADR 0047): it sees the
 *   Reading's stored concrete Valency Patterns beside the marked Sentence
 *   and picks the pattern that matches what `<TARGET>` realizes in this
 *   occurrence, or answers NoMatch.
 * - Only after NoMatch (or when no pattern is stored yet) does Luna extract
 *   the concrete pattern from the Reading and marked Sentence alone, never
 *   seeing the stored patterns.
 */
import type { CitingPrompt } from "dumcorpus/types";
import { type Cite, paragraphRegistry } from "../../prompt-paragraphs.js";

const rules = {
	meaning: ["de/emoji-description-names-the-meaning", "5532d94dbbc3bb71"],
	valency: ["de/valency-frame-follows-e-valbu", "bb0916c5f324dcf2"],
} as const satisfies Readonly<Record<string, Cite>>;

const registry = paragraphRegistry("de/valency-accumulation");
const { paragraph } = registry;

export const valencyCoveragePolicy = {
	task: paragraph(
		"judge.task",
		"`reading` names one Reading of a German Lemma: `lemma` is its Canonical Form, and its `emojiDescription` names the Reading's one meaning. `markedSentence` marks one occurrence of it with <TARGET>…</TARGET>. Each option is one concrete Valency Pattern already recorded for this Reading, written in German case-letter notation (N = Nom subject, A = Acc, D = Dat, G = Gen, sich(A)/sich(D) = lexical reflexive, `<prep> A|D|G` = governed preposition, `<prep> dass|ob|w|zu+Inf|Inf` = clause with da(r)- correlate, `irgendwo/irgendwohin/irgendwie` = governed adverbial, `ADJ/als ADJ/für ADJ` = predicative, `es ...` = subjectless verb).",
		rules.valency,
		rules.meaning,
	),
	matches: paragraph(
		"judge.matches",
		"Look only at the governed complements `<TARGET>` actually realizes in `markedSentence` (converting a passive subject back to its active A or D case, and ignoring free adjuncts of time, place, manner or cause). An option matches when it lists the exact same set of governed complements realized in this sentence — neither missing a realized complement nor adding one absent from the sentence.",
		rules.valency,
	),
	noMatch: paragraph(
		"judge.noMatch",
		"When `<TARGET>` realizes a different complement combination — for instance an extra object, a different governed preposition, a subordinate clause, or fewer complements than every listed option — answer NoMatch rather than picking the nearest option.",
		rules.valency,
	),
} as const;

export const valencyCoverageQuestion = {
	question: paragraph(
		"judge.question",
		"Which recorded Valency Pattern matches the exact governed complements `<TARGET>` realizes in `markedSentence`? Answer NoMatch if this occurrence realizes a different pattern or no governed complements.",
		rules.valency,
	),
	noMatch: paragraph(
		"judge.question.NoMatch",
		"This occurrence realizes a different pattern than every listed option, or no governed complements",
		rules.valency,
	),
} as const;

/** Every registered paragraph, as dumcorpus's citation check reads it. */
export function valencyAccumulationPromptTexts(): readonly CitingPrompt[] {
	return registry.texts();
}
