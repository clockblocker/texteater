/**
 * X2 of #851: one answer per question pooled from the cache's repetitions,
 * as intake would pool three calls of each request.
 *
 * A request built from pooled answers (the `expressions` pairs of the
 * pooled fixedness, the route groups of the pooled partition) need not be
 * one any repetition sent. So the pool reads each question's answer from
 * whatever request of its repetition asked it, which assumes jev answers a
 * question the same whatever else its request holds. A question no
 * repetition asked gets a stand-in that adds nothing: a Noul 0, `none` or
 * `Other` when the Choice offers it, else an `Unresolved` Choice with no
 * shares, which routes its group `Unresolved`.
 */

import type { Question } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import type { Answer, Ask } from "../../../src/segment/ask.js";

/**
 * `mean` averages every share; `median` takes each share's median, which
 * for three repetitions clears a floor exactly when two of them do.
 */
export type Pooling = "mean" | "median";
export const poolings: readonly Pooling[] = ["mean", "median"];

const mean = (values: readonly number[]) =>
	values.reduce((total, value) => total + value, 0) / values.length;

function median(values: readonly number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 1
		? (sorted[middle] ?? 0)
		: mean(sorted.slice(middle - 1, middle + 1));
}

/** One answer from several answers to the same question. */
export function poolAnswer(
	samples: readonly Answer[],
	pooling: Pooling,
): Answer {
	const [first] = samples;
	if (!first) throw Error("Pooling needs at least one answer");
	const reduce = pooling === "mean" ? mean : median;
	if (first.type === "noul")
		return {
			type: "noul",
			noul: reduce(
				samples.map((sample) =>
					sample.type === "noul" ? sample.noul : 0,
				),
			),
		};
	const shared = samples.flatMap((sample) =>
		sample.type === "noul" ? [] : [sample],
	);
	const keys = [
		...new Set(
			shared.flatMap((sample) => Object.keys(sample.probabilities)),
		),
	];
	const probabilities = Object.fromEntries(
		keys.map((key) => [
			key,
			reduce(shared.map((sample) => sample.probabilities[key] ?? 0)),
		]),
	);
	const confidence = reduce(shared.map((sample) => sample.confidence));
	if (first.type === "score")
		return {
			type: "score",
			score: reduce(
				shared.map((sample) =>
					sample.type === "score" ? sample.score : 0,
				),
			),
			confidence,
			probabilities,
		};
	let choice = first.choice;
	let best = -1;
	for (const [key, share] of Object.entries(probabilities))
		if (share > best) {
			best = share;
			choice = key;
		}
	return { type: "choice", choice, confidence, probabilities };
}

/** The answer of a question no repetition asked: it adds nothing. */
export function standIn(question: Question): Answer {
	if (question.type === "noul") return { type: "noul", noul: 0 };
	const keys =
		question.type === "choice" ? Object.keys(question.criteria) : [];
	const empty = ["none", "Other"].find((key) => keys.includes(key));
	return empty
		? {
				type: "choice",
				choice: empty,
				confidence: 1,
				probabilities: { [empty]: 1 },
			}
		: {
				type: "choice",
				choice: "Unresolved",
				confidence: 0,
				probabilities: {},
			};
}

/** Every answer one repetition gave, by question id. */
export type Heard = Map<string, Answer>;

/** `ask`, keeping every answer it hears in `heard`. */
export const recording =
	(ask: Ask, heard: Heard): Ask =>
	(request) =>
		Effect.map(ask(request), (answers) => {
			for (const [id, answer] of Object.entries(answers))
				if (!heard.has(id)) heard.set(id, answer);
			return answers;
		});

/** How many repetitions answered each pooled question: index 0 to 3. */
export type PoolTally = number[];

/**
 * An `ask` that sends nothing: each question's answer is pooled from the
 * repetitions that heard it, or a stand-in when none did.
 */
export const pooledAsk =
	(heard: readonly Heard[], pooling: Pooling, tally?: PoolTally): Ask =>
	({ questions }) =>
		Effect.sync(() =>
			Object.fromEntries(
				Object.entries(questions).map(([id, question]) => {
					const samples = heard.flatMap((answers) => {
						const answer = answers.get(id);
						return answer ? [answer] : [];
					});
					if (tally)
						tally[samples.length] =
							(tally[samples.length] ?? 0) + 1;
					return [
						id,
						samples.length === 0
							? standIn(question)
							: poolAnswer(samples, pooling),
					];
				}),
			),
		);
