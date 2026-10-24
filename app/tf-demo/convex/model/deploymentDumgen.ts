"use node";

import type { DumgenOptions } from "dumgen";
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
import { deploymentLuna } from "../../server/deployment-luna";
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
 * The model transports a deployment has, each at an optional per-call
 * deadline: jev through TypeSafe where `TYPESAFE_API_KEY` is set, Luna
 * through OpenAI where `OPENAI_API_KEY` is.
 */
export type ModelTransports = {
	readonly lunaConfiguration?: DumgenOptions["lunaConfiguration"];
	readonly jev?: (timeoutMs?: number) => Layer.Layer<JevTransport>;
	readonly luna?: (timeoutMs?: number) => Layer.Layer<LunaTransport>;
};

const deadline = (timeoutMs: number | undefined) =>
	timeoutMs === undefined ? {} : { timeoutMs };

/** The transports the deployment's keys give. */
function environmentTransports(): ModelTransports {
	const jevKey = env.TYPESAFE_API_KEY;
	const lunaKey = env.OPENAI_API_KEY;
	const configuredLuna = deploymentLuna(env);
	return {
		lunaConfiguration: configuredLuna.lunaConfiguration,
		...(jevKey
			? {
					jev: (timeoutMs?: number) =>
						JevTransport.typeSafe({
							apiKey: jevKey,
							...deadline(timeoutMs),
						}),
				}
			: {}),
		...(lunaKey
			? {
					luna: (timeoutMs?: number) =>
						deploymentLuna(env, timeoutMs).luna,
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
 * `DumgenLive` over the deployment's transports, at `timeoutMs` per call
 * when given. A transport the deployment lacks fails each call that needs
 * it, so an action that cannot run without one checks first; intake never
 * asks Luna. Traces go where the action's `TraceSink` says.
 */
export function deploymentDumgen(timeoutMs?: number): Layer.Layer<Jev | Luna> {
	const transports = modelTransports();
	return DumgenLive({
		...(transports.lunaConfiguration
			? { lunaConfiguration: transports.lunaConfiguration }
			: {}),
		jev:
			transports.jev?.(timeoutMs) ??
			JevTransport.fromAsk(unset("TYPESAFE_API_KEY")),
		luna:
			transports.luna?.(timeoutMs) ??
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
 * Each model call's deadline on a click: `CLICK_CALL_DEADLINE_MS`, or
 * intake's 120 s until the first live click measurement sets it (#858).
 */
export function clickCallDeadlineMs(
	value: string | undefined = env.CLICK_CALL_DEADLINE_MS,
): number {
	const deadline = value === undefined ? 120_000 : Number(value);
	if (!Number.isInteger(deadline) || deadline <= 0)
		throw new Error("CLICK_CALL_DEADLINE_MS is a positive whole number");
	return deadline;
}

/**
 * The click's Dumgen: jev and Luna at the click deadline, read when the
 * Layer is built, so a bad deadline fails the click's run. A click that
 * needs no model needs no key: its operations `requireJev` when they run.
 */
export const clickDumgen: Layer.Layer<Jev | Luna> = Layer.suspend(() =>
	deploymentDumgen(clickCallDeadlineMs()),
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
