import type * as Dumling from "dumling/types";
import type {
	DumgenOptions,
	Encounter,
	ReadingEmojiDescriptionResolution,
} from "../../../types.js";
import { DumgenFailure } from "../../../universal/failure.js";
import { judgmentCaller } from "../../../universal/judgment.js";
import { textModelCaller } from "../../../universal/model.js";
import { choice } from "../../../universal/questions.js";
import { recordEvent } from "../../../universal/trace.js";
import { markedContext } from "../../../universal/validation.js";
import { authoredFor, closedRoute } from "../authored-closed-sets/select.js";

export async function resolveReading(
	options: DumgenOptions,
	input: {
		encounter: Encounter;
		lemma: Dumling.Lemma;
		candidates: readonly string[];
	},
	signal: AbortSignal,
): Promise<ReadingEmojiDescriptionResolution> {
	const stage = "resolveOrGenerateReadingEmojiDescription";
	const route = `${input.lemma.language}/${input.lemma.family}/${input.lemma.kind}`;
	const candidates = [...new Set(input.candidates)];
	const resolveAuthored = (
		emojiDescription: string,
	): ReadingEmojiDescriptionResolution => ({
		decision: candidates.includes(emojiDescription) ? "Reuse" : "New",
		emojiDescription,
	});
	const member = authoredFor(input.lemma);
	if (member) {
		recordEvent(signal, "AuthoredReading", { reading: member.reading });
		return resolveAuthored(member.reading.emojiDescription);
	}
	if (closedRoute(input.lemma))
		throw new DumgenFailure(
			"CatalogMiss",
			stage,
			"Lemma is absent from the Fixed Catalog",
			route,
		);
	if (candidates.length > 253)
		throw new DumgenFailure(
			"Unresolved",
			stage,
			"Complete Reading candidates exceed the judgment budget",
			route,
		);
	if (candidates.length) {
		const result = await judgmentCaller(options)(
			stage,
			route,
			JSON.parse(
				JSON.stringify({
					...markedContext(input.encounter),
					lemma: input.lemma,
					candidates,
				}),
			),
			{
				reading: choice(
					"Select the existing Emoji Description that represents the marked target's learner-facing concept for this exact fixed Lemma. Distinguish homonyms. Related uses share one broad recognizable concept unless reuse would materially mislead a beginner. Ignore incidental participants, scenery, inflection and tense. Do not borrow a neighboring word's meaning. A singleton is not automatically a match. NoMatch means a defensible new concept, not uncertainty between meanings.",
					{
						...Object.fromEntries(
							candidates.map((value, index) => [
								`candidate_${index}`,
								value,
							]),
						),
						NoMatch:
							"None represents this target's learner-facing concept; a new description is needed.",
						Unresolved:
							"The context does not support a defensible selection or no-match judgment.",
					} as Record<string, string>,
				),
			},
			signal,
		);
		const answer = result.answers.reading;
		recordEvent(signal, "ReadingSelection", { candidates, answer });
		if (answer.type !== "choice" || answer.choice === "Unresolved")
			throw new DumgenFailure(
				"Unresolved",
				stage,
				"Reading meaning is uncertain",
				route,
			);
		if (answer.choice !== "NoMatch") {
			const description =
				candidates[Number(answer.choice.slice("candidate_".length))];
			if (description === undefined)
				throw new DumgenFailure(
					"InvalidModelOutput",
					stage,
					"Unknown Reading candidate",
					route,
				);
			return { decision: "Reuse", emojiDescription: description };
		}
	} else recordEvent(signal, "EmptyReadingCandidates", { candidates });
	const context = markedContext(input.encounter);
	const emojiDescription = await textModelCaller(options)<string>(
		stage,
		route,
		"reading-generation/de",
		"emojiGenerationOutput",
		{
			markedContext: context.markedContext,
			lemma: input.lemma.canonicalForm,
		},
		signal,
	);
	if (candidates.includes(emojiDescription))
		throw new DumgenFailure(
			"InvalidModelOutput",
			stage,
			"Generated Reading collides with a candidate rejected by TypeSafe",
			route,
		);
	const resolution = { decision: "New", emojiDescription } as const;
	recordEvent(signal, "GeneratedReading", resolution);
	return resolution;
}
