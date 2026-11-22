import { expect } from "bun:test";
import { createHash } from "node:crypto";
import type { Question } from "@typesafe-ai/sdk";
import { testEffect } from "common-utils/effect-test";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { ProviderFailure } from "../../src/errors.js";
import type { Answer, Ask, AskRequest } from "../../src/segment/ask.js";
import { proposalOf } from "../../src/segment/de/nomination.js";
import {
	germanUnitGraph,
	productionUnitSettings,
	segmentGermanUnits,
} from "../../src/segment/de/units.js";
import {
	type Plan,
	runStageGraph,
	type StageGraph,
} from "../../src/segment/stage-graph.js";
import { segmentsOf } from "../lab/evaluation/spec-corpus/fixtures.js";
import { noul } from "./de/fake-judge.js";

const question = (instructions: string): Question => ({
	type: "noul",
	instructions,
});

/** A plan asking `ids`, whose value is the sum of their Nouls plus `base`. */
const summing = (ids: readonly string[], base = 0): Plan<number> => ({
	questions: Object.fromEntries(ids.map((id) => [id, question(id)])),
	read: (answers) =>
		ids.reduce((sum, id) => {
			const answer = answers[id];
			return sum + (answer?.type === "noul" ? answer.noul : 0);
		}, base),
});

/** A judge answering every Noul 1, whose requests `fail` picks fail with a `ProviderFailure`. */
function judge(fail: (request: AskRequest) => boolean = () => false) {
	const requests: AskRequest[] = [];
	const ask: Ask = (request) => {
		requests.push(request);
		return fail(request)
			? Effect.fail(
					new ProviderFailure({
						stage: request.stage,
						message: "down",
					}),
				)
			: Effect.succeed(
					Object.fromEntries(
						Object.keys(request.questions).map((id) => [
							id,
							noul(1),
						]),
					),
				);
	};
	return { requests, ask };
}

type Chain = {
	readonly last: number;
	readonly middle: number;
	readonly sum: number;
	readonly first: number;
	readonly beside: number;
};

/** Listed against the order they can run in. */
const chain: StageGraph<Chain> = {
	last: {
		reads: ["middle"],
		ask: (read) => summing(["l1"], read("middle")),
	},
	middle: { reads: ["sum"], ask: (read) => summing(["m1"], read("sum")) },
	sum: {
		reads: ["first", "beside"],
		code: (read) => read("first") + read("beside"),
	},
	first: { reads: [], ask: () => summing(["f1", "f2"]) },
	beside: { reads: [], ask: () => summing(["b1"]) },
};

testEffect(
	"the requests follow what each stage reads, not the order they are listed in, and stages ready together go out as one request",
	() =>
		Effect.gen(function* () {
			const jev = judge();
			const run = yield* runStageGraph(chain, {}, jev.ask);
			expect(jev.requests.map(({ stage }) => stage)).toEqual([
				"first+beside",
				"middle",
				"last",
			]);
			// A merged request names each stage's questions.
			expect(jev.requests[0]?.parts).toEqual({
				first: ["f1", "f2"],
				beside: ["b1"],
			});
			expect(jev.requests[1]?.parts).toBeUndefined();
			expect(run.values).toEqual({
				first: 2,
				beside: 1,
				sum: 3,
				middle: 4,
				last: 5,
			});
			expect(run.degraded).toEqual([]);
		}),
);

testEffect("a stage with no question settles without a request", () =>
	Effect.gen(function* () {
		const jev = judge();
		const run = yield* runStageGraph<Chain>(
			{
				...chain,
				beside: { reads: [], ask: () => summing([], 7) },
			},
			{},
			jev.ask,
		);
		expect(jev.requests.map(({ stage }) => stage)).toEqual([
			"first",
			"middle",
			"last",
		]);
		expect(run.values.sum).toBe(9);
	}),
);

testEffect(
	"a failed request degrades stages that say what their absence means, and later stages read that",
	() =>
		Effect.gen(function* () {
			const degradable: StageGraph<Chain> = {
				...chain,
				middle: {
					reads: ["sum"],
					ask: (read) => ({
						...summing(["m1"], read("sum")),
						absent: () => -1,
					}),
				},
			};
			const jev = judge(({ stage }) => stage === "middle");
			const run = yield* runStageGraph(degradable, {}, jev.ask);
			expect(run.values.middle).toBe(-1);
			expect(run.values.last).toBe(0);
			expect(run.degraded).toEqual([
				{
					stage: "middle",
					failure: new ProviderFailure({
						stage: "middle",
						message: "down",
					}),
				},
			]);
			// Nothing is asked again.
			expect(jev.requests.map(({ stage }) => stage)).toEqual([
				"first+beside",
				"middle",
				"last",
			]);
		}),
);

testEffect(
	"a stage whose failure only degrades never shares a request with one whose failure fails the graph",
	() =>
		Effect.gen(function* () {
			const graph: StageGraph<Chain> = {
				...chain,
				beside: {
					reads: [],
					ask: () => ({ ...summing(["b1"]), absent: () => 0 }),
				},
			};
			const degrading = judge(({ stage }) => stage === "beside");
			const run = yield* runStageGraph(graph, {}, degrading.ask);
			expect(degrading.requests.map(({ stage }) => stage)).toEqual([
				"first",
				"beside",
				"middle",
				"last",
			]);
			expect(run.values.last).toBe(4);
			expect(run.degraded.map(({ stage }) => stage)).toEqual(["beside"]);
			// A failure of first fails the graph, beside or not.
			const failing = judge(({ stage }) => stage === "first");
			const exit = yield* Effect.exit(
				runStageGraph(graph, {}, failing.ask),
			);
			expect(exit).toStrictEqual(
				yield* Effect.exit(
					Effect.fail(
						new ProviderFailure({
							stage: "first",
							message: "down",
						}),
					),
				),
			);
		}),
);

testEffect(
	"a stage reads only what it declared, one that is settled, in a graph without cycles or shared question ids",
	() =>
		Effect.gen(function* () {
			const expectDefect = <A, E>(
				effect: Effect.Effect<A, E>,
				expectedMessage: string,
			) =>
				Effect.gen(function* () {
					const exit = yield* Effect.exit(effect);
					expect(Exit.isFailure(exit)).toBe(true);
					if (Exit.isFailure(exit)) {
						const err = Cause.squash(exit.cause);
						expect(
							err instanceof Error ? err.message : String(err),
						).toContain(expectedMessage);
					}
				});

			const run = (graph: StageGraph<Chain>) =>
				runStageGraph(graph, {}, judge().ask);
			yield* expectDefect(
				run({
					...chain,
					// `sum` reads `beside`, which it does not declare.
					sum: {
						reads: ["first"],
						code: (read) => read("first") + read("beside"),
					},
				}),
				"Stage sum reads beside, which it does not declare",
			);
			yield* expectDefect(
				run({
					...chain,
					first: { reads: ["last"], ask: () => summing(["f1"]) },
				}),
				"wait on each other",
			);
			yield* expectDefect(
				run({
					...chain,
					beside: { reads: [], ask: () => summing(["f1"]) },
				}),
				"Stage beside asks f1, which another stage asks",
			);
			yield* expectDefect(
				runStageGraph(
					{ only: { reads: ["missing" as "only"], code: () => 1 } },
					{},
					judge().ask,
				),
				"Stage only reads missing, which the graph lacks",
			);
		}),
);

/** A share in [0, 1) that `text` fixes. */
const shareOf = (text: string) =>
	Number.parseInt(
		createHash("sha256").update(text).digest("hex").slice(0, 8),
		16,
	) / 0x1_00_00_00_00;

/**
 * Answers every question by its id and text, so floors pass for some and
 * fail for others, and keeps each request's round-trip depth: one more than
 * the deepest request that had come back when it was sent.
 */
function hashJudge() {
	const requests: AskRequest[] = [];
	const depths: number[] = [];
	let returned = 0;
	const ask: Ask = (request) =>
		Effect.suspend(() => {
			const depth = returned + 1;
			requests.push(request);
			depths.push(depth);
			return Effect.yieldNow.pipe(
				Effect.andThen(Effect.sync(() => answerOf(request))),
				Effect.tap(() =>
					Effect.sync(() => {
						returned = Math.max(returned, depth);
					}),
				),
			);
		});
	return { requests, depths, ask };
}

/** The hash judge's answers to `request`. */
function answerOf(request: AskRequest): Readonly<Record<string, Answer>> {
	return Object.fromEntries(
		Object.entries(request.questions).map(
			([id, asked]): [string, Answer] => {
				const seed = `${id}|${JSON.stringify(asked)}`;
				if (asked.type === "noul") return [id, noul(shareOf(seed))];
				const keys = Object.keys(
					asked.type === "choice" ? asked.criteria : {},
				);
				const raw = keys.map((key) => shareOf(`${seed}|${key}`) ** 2);
				const total = raw.reduce((sum, share) => sum + share, 0);
				const probabilities = Object.fromEntries(
					keys.map((key, index) => [key, (raw[index] ?? 0) / total]),
				);
				const top = keys.reduce((best, key) =>
					(probabilities[key] ?? 0) > (probabilities[best] ?? 0)
						? key
						: best,
				);
				return [
					id,
					{
						type: "choice",
						choice: top,
						confidence: probabilities[top] ?? 0,
						probabilities,
					},
				];
			},
		),
	);
}

const sentences = [
	"Er hat sich auf den Weg gemacht.",
	"Ich ließ das Auto reparieren und nahm die Kosten in Kauf.",
	"Das war ja eben so, z.B. gestern im Allgemeinen.",
	"Sie hat den Faden verloren, aber er wartet auf sie.",
	"Wer rastet, der rostet, sagt man doch.",
];

testEffect(
	"the German unit stage sends each request as soon as every stage it reads has settled, never sooner",
	() =>
		Effect.gen(function* () {
			const rounds = new Set<number>();
			for (const text of sentences) {
				const segments = segmentsOf(text);
				const jev = hashJudge();
				yield* segmentGermanUnits({ segments }, jev.ask);
				const graph = germanUnitGraph(
					proposalOf({ segments }, productionUnitSettings.inventory),
					productionUnitSettings,
				);
				const roundOf = new Map<string, number>();
				for (const [index, request] of jev.requests.entries())
					for (const stage of Object.keys(
						request.parts ?? { [request.stage]: [] },
					))
						roundOf.set(stage, jev.depths[index] ?? 0);
				const settled = (stage: keyof typeof graph): number =>
					roundOf.get(stage) ??
					Math.max(0, ...graph[stage].reads.map(settled));
				for (const [stage, round] of roundOf) {
					const reads = graph[stage as keyof typeof graph].reads;
					expect(round).toBe(Math.max(0, ...reads.map(settled)) + 1);
				}
				rounds.add(Math.max(...jev.depths));
			}
			// The sentences reach the Choices: some take more round-trips than two.
			expect(Math.max(...rounds)).toBeGreaterThan(2);
			expect(Math.max(...rounds)).toBeLessThanOrEqual(5);
		}),
);
