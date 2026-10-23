import type { Rule } from "../corpus-types.js";
import { attestations } from "./rules/attestations.js";
import { conjunctionsAndParticles } from "./rules/conjunctions-and-particles.js";
import { fusedWords } from "./rules/fused-words.js";
import { knowledge } from "./rules/knowledge.js";
import { locutionsAndSayings } from "./rules/locutions-and-sayings.js";
import { nouns } from "./rules/nouns.js";
import { participles } from "./rules/participles.js";
import { pronounsAndAdjectives } from "./rules/pronouns-and-adjectives.js";
import { readings } from "./rules/readings.js";
import { units } from "./rules/units.js";
import { verbs } from "./rules/verbs.js";

export { lexeme, locution } from "./rules/routes.js";

/**
 * The German classification Rules (ADR 0037), grouped by topic. A Rule with
 * no routes applies to every German route. A Rule with no records still needs
 * a Spec Record that shows it.
 */
export const germanRules: readonly Rule[] = [
	...units,
	...verbs,
	...participles,
	...nouns,
	...fusedWords,
	...pronounsAndAdjectives,
	...conjunctionsAndParticles,
	...locutionsAndSayings,
	...attestations,
	...readings,
	...knowledge,
];
