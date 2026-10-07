import type { Answer, JevAsk, JevRequest } from "dumgen";

type Question = JevRequest["questions"][string];

/** A certain answer to a Choice. */
const picked = (choice: string): Answer => ({
	type: "choice",
	choice,
	confidence: 1,
	probabilities: { [choice]: 1 },
});

/**
 * A jev for `segment.inUnits` with no network: it answers by question id
 * from `answers` and otherwise says no (a Noul 0.1, a Choice its last
 * option). `fail` makes a request throw. Each request costs 10 input
 * tokens per question and 1 output token, so a test can sum them.
 *
 * `"Er gibt auf."` with `germanAnswers` comes back as `Er` (Lexeme PRON) and
 * `gibt … auf` (Lexeme VERB); `"Er wohnt im Haus."` cuts `im` into `i` + `m`.
 */
export function fakeJev(
	options: {
		readonly answers?: Readonly<Record<string, Answer>>;
		readonly fail?: (request: JevRequest, stage: string) => boolean;
	} = {},
) {
	const sent: (JevRequest & { readonly stage: string })[] = [];
	const ask: JevAsk = async (request, { stage }) => {
		sent.push({ ...request, stage });
		if (options.fail?.(request, stage)) throw Error("jev is down");
		const answers: Record<string, Answer> = {};
		for (const [id, question] of Object.entries(request.questions) as [
			string,
			Question,
		][]) {
			const known = options.answers?.[id];
			if (known) answers[id] = known;
			else if (question.type === "noul")
				answers[id] = { type: "noul", noul: 0.1 };
			else
				answers[id] = picked(
					Object.keys(
						question.type === "choice" ? question.criteria : {},
					).at(-1) ?? "",
				);
		}
		return {
			model: request.model,
			answers,
			usage: {
				input_tokens: 10 * Object.keys(request.questions).length,
				output_tokens: 1,
			},
		};
	};
	return { ask, sent };
}

/** Answers that route `Er gibt auf.` and split the `im` of `Er wohnt im Haus.`. */
export const germanAnswers: Readonly<Record<string, Answer>> = {
	source_4: picked("Fusion"),
	s_particle_3: picked("p2"),
	r_1: picked("Lexeme/PRON"),
	r_2_3: picked("Lexeme/VERB"),
};

/** Whether a jev request is about the Sentence `text`. */
export const asksAbout = (request: JevRequest, text: string) =>
	JSON.stringify(request.state).includes(text);
