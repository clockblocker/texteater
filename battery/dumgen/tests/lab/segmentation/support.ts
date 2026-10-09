import type { Questions } from "@typesafe-ai/sdk";
import type { Answer, Answers } from "../../../src/segment/ask.js";

/** How a fake jev answers: a Noul's probability, and a Choice's key among the keys it offers. */
export type Picks = {
	readonly noul: (id: string) => number;
	readonly choice: (
		id: string,
		keys: readonly string[],
	) => string | undefined;
};

/**
 * Answers each of `questions` by `picks`: a Noul its probability, a Choice
 * its picked key at probability 1 and every other key it offers at 0. A
 * Choice with no key to pick throws.
 */
export function answerEach(questions: Questions, picks: Picks): Answers {
	return Object.fromEntries(
		Object.entries(questions).map(([id, question]): [string, Answer] => {
			if (question.type === "noul")
				return [id, { type: "noul", noul: picks.noul(id) }];
			const keys = Object.keys(
				question.type === "choice" ? question.criteria : {},
			);
			const wanted = picks.choice(id, keys);
			if (wanted === undefined) throw Error(`${id} offers no option`);
			return [
				id,
				{
					type: "choice",
					choice: wanted,
					confidence: 1,
					probabilities: Object.fromEntries(
						keys.map((key) => [key, key === wanted ? 1 : 0]),
					),
				},
			];
		}),
	);
}

/**
 * The gold of "Er zog sich an, zum Glück." with zum split into zu + m: sich
 * and an take zog as host, zu, m and Glück are fixed words of one
 * expression, and each gold group gets its gold route. `known` adds picks by
 * question id. Everything else is answered no: a Noul 0.1, a Choice its last
 * option (`none`, `Other`, …).
 */
export function zogSichAnGold(
	known: Readonly<Record<string, string>> = {},
): Picks {
	const picks: Readonly<Record<string, string>> = {
		...known,
		s_reflexive_3: "p2",
		s_particle_4: "p2",
		r_1: "Lexeme/PRON",
		r_2_3_4: "Lexeme/VERB",
		r_5_6_7: "Locution/ADV",
	};
	const fixed = new Set(["f_5", "f_6", "f_7", "e_5_6", "e_5_7", "e_6_7"]);
	return {
		noul: (id) => (fixed.has(id) ? 0.9 : 0.1),
		choice: (id, keys) => picks[id] ?? keys.at(-1),
	};
}
