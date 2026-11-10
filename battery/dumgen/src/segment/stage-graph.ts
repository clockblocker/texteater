/**
 * A Sentence's jev stages run by what each reads (#1324). Each stage
 * declares the stages whose values it reads; a code stage computes its
 * value from them, and an asking stage plans one request's questions and
 * how their answers read. `runStageGraph` settles every stage whose reads
 * are settled, and as soon as a request comes back sends the questions of
 * the asking stages it made ready: the order of the requests follows from
 * the declarations, never from the order the stages are listed in.
 *
 * - **Stages ready together share a request when they share its fate.**
 *   They share the judge state and the answers are keyed by question, so
 *   the stages a failure fails the graph for go out as one request, and
 *   the stages a failure degrades as another, side by side; a degradable
 *   stage never fails with a request it did not need. Which stages end up
 *   together can depend on which request came back first; what each
 *   question asks cannot.
 * - **A merged request is named by its stages**, joined with `+` in the
 *   graph's order (`candidates+final`), and its `parts` list each
 *   stage's question ids, so every question stays attributable to its
 *   stage. Two stages asking the same id is a Defect.
 * - **A stage reads only what it declared**: reading another stage, or one
 *   not settled yet, is a Defect, as is a graph whose stages wait on each
 *   other or read a stage it lacks.
 * - **A failed request degrades the stages it asked for, or fails the
 *   graph**: each plan says what its stage's value is without its answers
 *   (`absent`), keeping what earlier stages settled. A request of stages
 *   without one fails the graph with its failure and interrupts the
 *   requests in flight; a request of stages with one gives each its absent
 *   value and lists it in `degraded`. Nothing is asked again (#445, #446).
 *
 * Nothing here knows a language.
 */
import type { EntryType, Questions } from "@typesafe-ai/sdk";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Queue from "effect/Queue";
import {
	type Answers,
	type Ask,
	type AskFailure,
	type AskRequest,
	askAny,
} from "./ask.js";

/** What an asking stage sends and how it reads what comes back. */
export type Plan<A> = {
	/** Its questions; with none, the stage settles without a request. */
	readonly questions: Questions;
	/** Its value from the answers to its own questions. */
	readonly read: (answers: Answers) => A;
	/**
	 * Its value when its request brought no answers, keeping what the
	 * stages before it settled. Without one, that failure fails the graph.
	 */
	readonly absent?: () => A;
};

/** A stage's view of the stages it declared it reads. */
type Read<V> = <K extends keyof V & string>(stage: K) => V[K];

/** One stage of a graph whose stages' values are `V`. */
type Stage<V, K extends keyof V> = {
	/** The stages whose values it reads. */
	readonly reads: readonly (keyof V & string)[];
} & (
	| { readonly code: (read: Read<V>) => V[K] }
	| { readonly ask: (read: Read<V>) => Plan<V[K]> }
);

export type StageGraph<V> = { readonly [K in keyof V & string]: Stage<V, K> };

/** An asking stage whose request failed, and why. */
export type Degraded = {
	readonly stage: string;
	readonly failure: AskFailure;
};

export type GraphRun<V> = {
	readonly values: V;
	/** The stages that took their absent value, in the order they did. */
	readonly degraded: readonly Degraded[];
};

/** `plan`'s answers from `ask`; with no question, none are asked. */
export const askPlan = <A>(
	ask: Ask,
	request: { readonly stage: string; readonly state: StageState },
	plan: Plan<A>,
): Effect.Effect<A, AskFailure> =>
	Effect.map(
		askAny(ask, { ...request, questions: plan.questions }),
		plan.read,
	);

/** The judge state every request of a graph is asked against. */
export type StageState = Readonly<Record<string, EntryType>>;

const pick = (answers: Answers, questions: Questions): Answers =>
	Object.fromEntries(
		Object.keys(questions).flatMap((id) => {
			const answer = answers[id];
			return answer === undefined ? [] : [[id, answer]];
		}),
	);

/** An asking stage whose reads have settled, with its questions. */
type Ready = { readonly name: string; readonly plan: Plan<unknown> };

/** How stage `name` reads the settled `values` of the stages it declared. */
const readerOf =
	<V>(
		values: ReadonlyMap<string, unknown>,
		name: string,
		reads: readonly string[],
	): Read<V> =>
	(stage) => {
		if (!reads.includes(stage))
			throw Error(
				`Stage ${name} reads ${stage}, which it does not declare`,
			);
		if (!values.has(stage))
			throw Error(`Stage ${name} reads ${stage} before it settled`);
		return values.get(stage) as V[typeof stage];
	};

/**
 * Settles every stage the settled `values` allow that needs no request,
 * until none is left, and returns the asking stages that are ready.
 */
function settleWithoutAsking<V>(
	graph: StageGraph<V>,
	values: Map<string, unknown>,
	sent: ReadonlySet<string>,
): Ready[] {
	const names = Object.keys(graph) as (keyof V & string)[];
	const ready: Ready[] = [];
	const waiting = (name: string) =>
		!values.has(name) &&
		!sent.has(name) &&
		!ready.some((entry) => entry.name === name);
	let moved = true;
	while (moved) {
		moved = false;
		for (const name of names) {
			const stage: Stage<V, typeof name> = graph[name];
			if (
				!waiting(name) ||
				!stage.reads.every((read) => values.has(read))
			)
				continue;
			const read = readerOf<V>(values, name, stage.reads);
			const plan: Plan<unknown> =
				"code" in stage
					? { questions: {}, read: () => stage.code(read) }
					: stage.ask(read);
			if (Object.keys(plan.questions).length > 0)
				ready.push({ name, plan });
			else {
				values.set(name, plan.read({}));
				moved = true;
			}
		}
	}
	return ready;
}

/** The one request of the ready stages, or why they cannot share one. */
function requestOf(ready: readonly Ready[], state: StageState): AskRequest {
	const questions: Record<string, Questions[string]> = {};
	for (const { name, plan } of ready)
		for (const [id, question] of Object.entries(plan.questions)) {
			if (id in questions)
				throw Error(
					`Stage ${name} asks ${id}, which another stage asks`,
				);
			questions[id] = question;
		}
	return {
		stage: ready.map(({ name }) => name).join("+"),
		state,
		questions,
		...(ready.length > 1
			? {
					parts: Object.fromEntries(
						ready.map(({ name, plan }) => [
							name,
							Object.keys(plan.questions),
						]),
					),
				}
			: {}),
	};
}

/** The ready stages as requests: those a failure fails the graph for, then those it degrades. */
const requestGroups = (ready: readonly Ready[]): Ready[][] =>
	[
		ready.filter(({ plan }) => plan.absent === undefined),
		ready.filter(({ plan }) => plan.absent !== undefined),
	].filter((group) => group.length > 0);

/** A request that came back, with the stages it asked for. */
type Settled = {
	readonly group: readonly Ready[];
	readonly exit: Exit.Exit<Answers, AskFailure>;
};

/**
 * Settles the stages of a request that came back: from its answers, or
 * each with its absent value. A failure of a stage without one fails the
 * graph, and leaving the graph's scope interrupts the requests still in
 * flight; a Defect or an interruption ends the graph as it came.
 */
function settle(
	{ group, exit }: Settled,
	values: Map<string, unknown>,
	degraded: Degraded[],
): Effect.Effect<void, AskFailure> {
	if (Exit.isSuccess(exit)) {
		for (const { name, plan } of group)
			values.set(name, plan.read(pick(exit.value, plan.questions)));
		return Effect.void;
	}
	const [failed] = exit.cause.reasons.filter(Cause.isFailReason);
	if (!failed) return Effect.failCause(exit.cause);
	if (group.some(({ plan }) => plan.absent === undefined))
		return Effect.fail(failed.error);
	for (const { name, plan } of group) {
		values.set(name, plan.absent?.());
		degraded.push({ stage: name, failure: failed.error });
	}
	return Effect.void;
}

/**
 * Settles every stage of `graph`, asking through `ask` against `state`:
 * whenever a request comes back, it settles what that allows and sends the
 * requests of the asking stages that became ready.
 */
export function runStageGraph<V>(
	graph: StageGraph<V>,
	state: StageState,
	ask: Ask,
): Effect.Effect<GraphRun<V>, AskFailure> {
	return Effect.scoped(
		Effect.gen(function* () {
			const names = Object.keys(graph) as (keyof V & string)[];
			const unknown = names.flatMap((name) =>
				graph[name].reads
					.filter((read) => !names.includes(read))
					.map(
						(read) =>
							`Stage ${name} reads ${read}, which the graph lacks`,
					),
			);
			if (unknown[0]) return yield* Effect.die(Error(unknown[0]));
			const values = new Map<string, unknown>();
			const sent = new Set<string>();
			const degraded: Degraded[] = [];
			const settled = yield* Queue.unbounded<Settled>();
			let inFlight = 0;
			for (;;) {
				for (const group of requestGroups(
					settleWithoutAsking(graph, values, sent),
				)) {
					// Two stages asking one id throw here: a Defect.
					const request = yield* Effect.sync(() =>
						requestOf(group, state),
					);
					for (const { name } of group) sent.add(name);
					inFlight++;
					yield* Effect.forkScoped(
						Effect.flatMap(Effect.exit(ask(request)), (exit) =>
							Queue.offer(settled, { group, exit }),
						),
					);
				}
				if (inFlight === 0) break;
				yield* settle(yield* Queue.take(settled), values, degraded);
				inFlight--;
			}
			if (values.size < names.length)
				return yield* Effect.die(
					Error(
						`Stages ${names.filter((name) => !values.has(name)).join(", ")} wait on each other`,
					),
				);
			return { values: Object.fromEntries(values) as V, degraded };
		}),
	);
}
