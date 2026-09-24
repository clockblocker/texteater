import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import type {
	DumgenOptions,
	Encounter,
	ReadingEmojiDescriptionResolution,
} from "../../../types.js";
import { DumgenFailure } from "../../../universal/failure.js";
import { judgmentCaller } from "../../../universal/judgment.js";
import { textModelCaller } from "../../../universal/model.js";
import { choice } from "../../../universal/questions.js";
import { type OperationScope, recordEvent } from "../../../universal/trace.js";
import { markedContext } from "../../../universal/validation.js";
import { authoredMembers } from "../authored-closed-sets/inventory.js";
import {
	authoredFor,
	closedRoute,
	sameValue,
} from "../authored-closed-sets/select.js";

export function resolveReading(
	options: DumgenOptions,
	input: {
		encounter: Encounter;
		lemma: Dumling.Lemma;
		candidates: readonly string[];
	},
	scope: OperationScope,
): Effect.Effect<ReadingEmojiDescriptionResolution, DumgenFailure> {
	return Effect.gen(function* () {
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
		const reviewed = authoredMembers.filter((candidate) =>
			sameValue(candidate.lemma, input.lemma),
		);
		if (reviewed.length > 1) {
			const { output: result } = yield* judgmentCaller(options)(
				stage,
				route,
				{
					...markedContext(input.encounter),
					readings: reviewed.map((candidate) => ({
						emojiDescription: candidate.reading.emojiDescription,
						definition: candidate.knowledge.definition ?? "",
					})),
				},
				{
					reading: choice(
						"Choose the reviewed Reading for this exact occurrence; distinguish referential it from nonreferential subject es. Uncertainty is Unresolved.",
						{
							...Object.fromEntries(
								reviewed.map((candidate, index) => [
									`authored_${index}`,
									String(candidate.knowledge.definition),
								]),
							),
							Unresolved: "No defensible reviewed Reading",
						},
					),
				},
				scope,
				[],
			);
			const selected =
				reviewed[
					Number(
						result.answers.reading.choice.replace("authored_", ""),
					)
				];
			if (!selected)
				throw new DumgenFailure(
					"Unresolved",
					stage,
					"Reviewed Reading remains uncertain",
					route,
				);
			return resolveAuthored(selected.reading.emojiDescription);
		}
		if (member) {
			recordEvent(scope, "AuthoredReading", { reading: member.reading });
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
		// Generation follows only a NoMatch selection, so it depends on it.
		let selection: string[] = [];
		if (candidates.length) {
			const judged = yield* judgmentCaller(options)(
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
						"Select the existing Emoji Description that represents the marked target's learner-facing concept for this exact fixed Lemma. Distinguish homonyms. Existential geben in es gibt/es gab means existence or availability and must not reuse its transfer/giving Reading. Related uses share one broad recognizable concept unless reuse would materially mislead a beginner. Ignore incidental participants, scenery, inflection and tense. Do not borrow a neighboring word's meaning. A singleton is not automatically a match. NoMatch means a defensible new concept, not uncertainty between meanings.",
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
				scope,
				[],
			);
			selection = [judged.id];
			const answer = judged.output.answers.reading;
			recordEvent(scope, "ReadingSelection", { candidates, answer });
			if (answer.type !== "choice" || answer.choice === "Unresolved")
				throw new DumgenFailure(
					"Unresolved",
					stage,
					"Reading meaning is uncertain",
					route,
				);
			if (answer.choice !== "NoMatch") {
				const description =
					candidates[
						Number(answer.choice.slice("candidate_".length))
					];
				if (description === undefined)
					throw new DumgenFailure(
						"InvalidModelOutput",
						stage,
						"Unknown Reading candidate",
						route,
					);
				return { decision: "Reuse", emojiDescription: description };
			}
		} else recordEvent(scope, "EmptyReadingCandidates", { candidates });
		const context = markedContext(input.encounter);
		const { output: emojiDescription } = yield* textModelCaller(
			options,
		)<string>(
			scope,
			"generateReadingEmojiDescription",
			route,
			"reading-generation/de",
			"emojiGenerationOutput",
			{
				markedContext: context.markedContext,
				lemma: input.lemma.canonicalForm,
			},
			selection,
		);
		if (candidates.includes(emojiDescription))
			throw new DumgenFailure(
				"InvalidModelOutput",
				stage,
				"Generated Reading collides with a candidate rejected by TypeSafe",
				route,
			);
		const resolution = { decision: "New", emojiDescription } as const;
		recordEvent(scope, "GeneratedReading", resolution);
		return resolution;
	});
}
