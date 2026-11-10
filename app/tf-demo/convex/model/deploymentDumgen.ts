"use node";

import {
	DumgenLive,
	InvalidModelOutput,
	type Jev,
	JevTransport,
	type Luna,
	LunaTransport,
	type OperationTrace,
	operations,
	ProviderFailure,
	TraceSink,
} from "dumgen";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { INTAKE_NOT_CONFIGURED_MESSAGE } from "../../server/intake";
import { joinedSentence, sentenceParts } from "../../server/longSentences";
import { storedUnitOf } from "../../server/storedSegments";
import { env } from "../_generated/server";
import { visitorError } from "./validators";

/*
 * The deployment's Dumgen (Dumgen ADR 0009): its model transports, and the
 * `DumgenLive` each action provides once at its edge, so the operations of
 * one action share one request budget.
 */

/**
 * How an action's model calls are made: each call's deadline (the
 * transport's 120 s when absent), and whether Luna asks OpenAI to cache
 * each request's system prompt. Dumgen's prompts are fixed per operation,
 * so a click or Knowledge run reads most of its input from the cache once
 * an earlier run wrote it (87% of an evaluation's canonical input tokens).
 */
export type CallPolicy = {
	readonly timeoutMs?: number;
	readonly promptCaching?: boolean;
};

/**
 * The model transports a deployment has, each made under a `CallPolicy`:
 * jev through TypeSafe where `TYPESAFE_API_KEY` is set, Luna through OpenAI
 * where `OPENAI_API_KEY` is. jev has no prompt cache to ask for.
 */
export type ModelTransports = {
	readonly jev?: (policy: CallPolicy) => Layer.Layer<JevTransport>;
	readonly luna?: (policy: CallPolicy) => Layer.Layer<LunaTransport>;
};

const deadline = ({ timeoutMs }: CallPolicy) =>
	timeoutMs === undefined ? {} : { timeoutMs };

/** The transports the deployment's keys give. */
function environmentTransports(): ModelTransports {
	const jevKey = env.TYPESAFE_API_KEY;
	const lunaKey = env.OPENAI_API_KEY;
	return {
		...(jevKey
			? {
					jev: (policy: CallPolicy) =>
						JevTransport.typeSafe({
							apiKey: jevKey,
							...deadline(policy),
						}),
				}
			: {}),
		...(lunaKey
			? {
					luna: (policy: CallPolicy) =>
						LunaTransport.openAI({
							apiKey: lunaKey,
							...deadline(policy),
							...(policy.promptCaching
								? { promptCaching: true }
								: {}),
						}),
				}
			: {}),
	};
}

let currentTransports: () => ModelTransports = environmentTransports;

/** The deployment's transports: the environment's, unless a test replaced them. */
export function modelTransports(): ModelTransports {
	return currentTransports();
}

/**
 * Replaces the deployment's transports until the returned function puts
 * the previous ones back: how a test runs a real action over fake
 * transports (`JevTransport.fromAsk`), with no `fetch` or environment to
 * patch.
 */
export function replaceModelTransports(
	transports: ModelTransports,
): () => void {
	const previous = currentTransports;
	currentTransports = () => transports;
	return () => {
		currentTransports = previous;
	};
}

/** A transport the deployment lacks: each call fails as a ProviderFailure that names its key. */
const unset = (key: string) => async (): Promise<never> => {
	throw Error(`${key} is not set on the Convex deployment`);
};

/**
 * `DumgenLive` over the deployment's transports, made under `policy`. A
 * transport the deployment lacks fails each call that needs it, so an
 * action that cannot run without one checks first; intake never asks
 * Luna. Traces go where the action's `TraceSink` says.
 */
export function deploymentDumgen(
	policy: CallPolicy = {},
): Layer.Layer<Jev | Luna> {
	const transports = modelTransports();
	return DumgenLive({
		jev:
			transports.jev?.(policy) ??
			JevTransport.fromAsk(unset("TYPESAFE_API_KEY")),
		luna:
			transports.luna?.(policy) ??
			LunaTransport.fromAsk(unset("OPENAI_API_KEY")),
	});
}

/**
 * Fails with the coded intake error that tells the Visitor how to fix it
 * when the deployment has no TypeSafe key: intake checks it before it
 * runs, and a click's operations when they run.
 */
export function requireJev(): void {
	if (!modelTransports().jev)
		throw visitorError("NotConfigured", INTAKE_NOT_CONFIGURED_MESSAGE);
}

/**
 * Each model call's deadline on a click when `CLICK_CALL_DEADLINE_MS`
 * does not set one. The slowest of the first measured clicks' calls took
 * 3.1 s (Luna's Grammar; jev's took at most 0.33 s), so 15 s leaves a slow
 * provider about five times that before the click fails (#858, #1327).
 */
const DEFAULT_CLICK_CALL_DEADLINE_MS = 15_000;

/** Each model call's deadline on a click: `CLICK_CALL_DEADLINE_MS`, or 15 s. */
export function clickCallDeadlineMs(
	value: string | undefined = env.CLICK_CALL_DEADLINE_MS,
): number {
	const deadline =
		value === undefined ? DEFAULT_CLICK_CALL_DEADLINE_MS : Number(value);
	if (!Number.isInteger(deadline) || deadline <= 0)
		throw new Error("CLICK_CALL_DEADLINE_MS is a positive whole number");
	return deadline;
}

/**
 * The click's Dumgen: jev and Luna at the click deadline, read when the
 * Layer is built, so a bad deadline fails the click's run, with Luna's
 * prompts cached. A click that needs no model needs no key: its
 * operations `requireJev` when they run.
 */
export const clickDumgen: Layer.Layer<Jev | Luna> = Layer.suspend(() =>
	deploymentDumgen({
		timeoutMs: clickCallDeadlineMs(),
		promptCaching: true,
	}),
);

/**
 * A Knowledge run's Dumgen: the transports' own deadlines, with Luna's
 * prompts cached, built when the run starts.
 */
export const knowledgeDumgen: Layer.Layer<Jev | Luna> = Layer.suspend(() =>
	deploymentDumgen({ promptCaching: true }),
);

/**
 * Segments one failed Sentence again for its first click (#861), under
 * the click's Dumgen. When it fails again, the click fails with what its
 * trace says, read through the action's `TraceSink`: a ProviderFailure or
 * an InvalidModelOutput.
 */
export const resegment = (stitchedText: string) =>
	Effect.gen(function* () {
		requireJev();
		const sink = yield* TraceSink;
		let failure: OperationTrace["sentences"][number] | undefined;
		// A long Sentence is read in parts, as intake read it.
		const parts = sentenceParts(stitchedText);
		const text = yield* operations.segment
			.inUnits({
				language: "de",
				paragraphs: [{ sentences: [...parts.parts] }],
			})
			.pipe(
				Effect.provideService(TraceSink, (trace) => {
					sink?.(trace);
					failure = trace.sentences.find(
						({ outcome }) => outcome === "Failed",
					);
				}),
			);
		const sentence = joinedSentence(
			text.paragraphs[0]?.sentences ?? [],
			parts,
		);
		if (!sentence.failed)
			return {
				segments: sentence.segments.map(({ kind, text, surface }) =>
					surface === undefined
						? { kind, text }
						: { kind, text, surface },
				),
				units: sentence.units.map(storedUnitOf),
			};
		const reason =
			failure?.outcome === "Failed" ? failure.failure : undefined;
		const fields = {
			stage: "segment.inUnits",
			message: reason?.message ?? "The Sentence was not segmented",
		};
		return yield* reason?.tag === "InvalidModelOutput"
			? new InvalidModelOutput(fields)
			: new ProviderFailure(fields);
	});
