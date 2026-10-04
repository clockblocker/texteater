import type { DumgenOptions, OperationTrace } from "dumgen";
import * as Cause from "effect/Cause";
import type * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import * as Tracer from "effect/Tracer";
import type {
	CapturedInspectionStep,
	InspectionStep,
} from "../convex/model/inspection";
import { inspectionJson } from "./inspectionPayload";

const OWNER = "inspection.owner";
const INPUT = "inspection.input";
const FAILED = "inspection.failed";
const DUMGEN = "battery/dumgen";

/**
 * Span options that make a span an inspection step. The input stays a
 * reference on the span: only an installed inspection Tracer serializes it,
 * together with the span's output.
 */
export function inspectionStep(
	owner: string,
	input?: unknown,
): Tracer.SpanOptions {
	return { attributes: { [OWNER]: owner, [INPUT]: input } };
}

/**
 * Runs promise work as spans under the span current where `services` were
 * taken, for callers outside a fiber. A hop rethrows its own error.
 */
export function spanHops(services: Context.Context<never>) {
	const markFailed = () =>
		Effect.runSyncWith(services)(Effect.annotateCurrentSpan(FAILED, true));
	return {
		run: Effect.runPromiseWith(services),
		async hop<T>(
			name: string,
			owner: string,
			input: unknown,
			run: () => Promise<T>,
		): Promise<T> {
			const exit = await Effect.runPromiseExitWith(services)(
				Effect.tryPromise({ try: run, catch: (error) => error }).pipe(
					Effect.withSpan(name, inspectionStep(owner, input)),
				),
			);
			if (Exit.isSuccess(exit)) return exit.value;
			throw Cause.squash(exit.cause);
		},
		/** Fails the enclosing step although its work returns normally. */
		markFailed,
		/** A handled failure: a failed step of its own that fails the enclosing step. */
		failure(name: string, owner: string, input: unknown, error: unknown) {
			markFailed();
			Effect.runSyncExitWith(services)(
				Effect.fail(error).pipe(
					Effect.withSpan(name, inspectionStep(owner, input)),
				),
			);
		},
	};
}
export type SpanHops = ReturnType<typeof spanHops>;

/**
 * Runs `effect` under the inspection Tracer when inspection is on. Without it
 * spans stay with Effect's default tracer and nothing is serialized.
 */
export function inspected<A, E, R>(
	effect: Effect.Effect<A, E, R>,
	inspection?: InspectionCapture,
): Effect.Effect<A, E, R> {
	return inspection ? Effect.withTracer(effect, inspection.tracer) : effect;
}

function statusOf(
	exit: Exit.Exit<unknown, unknown>,
	failed: boolean,
): InspectionStep["status"] {
	if (Exit.isSuccess(exit)) return failed ? "Failure" : "Success";
	return Cause.hasInterruptsOnly(exit.cause) ? "Interrupted" : "Failure";
}

const isStep = (span: Tracer.Span) => span.attributes.has(OWNER);

/** How a Dumgen operation came out, by its calls and its Sentences. */
function operationStatus(trace: OperationTrace): InspectionStep["status"] {
	// A click that came out succeeded, whatever became of the guessed Luna
	// call `resolve.grammar` dropped once jev answered.
	if (trace.resolution) return "Success";
	const failed =
		trace.calls.filter(
			({ failure }) => failure && failure.tag !== "Interrupted",
		).length +
		trace.sentences.filter(({ outcome }) => outcome === "Failed").length;
	if (failed === 0)
		return trace.calls.some(({ failure }) => failure?.tag === "Interrupted")
			? "Interrupted"
			: "Success";
	// A click is all-or-nothing; intake keeps the Sentences that came out and
	// Knowledge the aspects that landed.
	const kept =
		trace.operation === "segment.inUnits"
			? trace.sentences.some(({ outcome }) => outcome === "Segmented")
			: trace.operation === "knowledge.produce" &&
				trace.calls.some(({ failure }) => !failure);
	return kept ? "Partial" : "Failure";
}

/**
 * One Dumgen operation's inspection rows, built from its OperationTrace
 * alone (#559, #885): the operation, and under it each call (stage,
 * Sentence, `jev | luna`, tokens, timing, failure, and the prompt and
 * answer when the host asked for payloads) and each wait for the request
 * budget. Sentence outcomes, the click's resolution and the operation's
 * events ride on the operation row. The `dumgen.*` spans carry no payloads
 * and render no row.
 */
export function operationSteps(
	trace: OperationTrace,
	parentId?: string,
): CapturedInspectionStep[] {
	const operationId = crypto.randomUUID();
	const waits = new Map(
		trace.waits.map(({ call, waitMs }) => [call, waitMs]),
	);
	const steps: CapturedInspectionStep[] = [
		{
			id: operationId,
			...(parentId === undefined ? {} : { parentId }),
			name: trace.operation,
			owner: DUMGEN,
			kind: "Code",
			startedAt: trace.startedAt,
			durationMs: trace.durationMs,
			status: operationStatus(trace),
			payloadJson: inspectionJson({
				calls: trace.calls.length,
				inputTokens: trace.calls.reduce(
					(sum, call) => sum + call.inputTokens,
					0,
				),
				outputTokens: trace.calls.reduce(
					(sum, call) => sum + call.outputTokens,
					0,
				),
				sentences: trace.sentences,
				...(trace.resolution ? { resolution: trace.resolution } : {}),
				...(trace.events ? { events: trace.events } : {}),
				waits: trace.waits,
			}),
		},
	];
	for (const [index, call] of trace.calls.entries()) {
		const waitMs = waits.get(index);
		if (waitMs !== undefined)
			steps.push({
				id: crypto.randomUUID(),
				parentId: operationId,
				name: "Wait for the request budget",
				owner: DUMGEN,
				kind: "Code",
				startedAt: call.startedAt - waitMs,
				durationMs: waitMs,
				status: "Success",
				payloadJson: inspectionJson({ call: index, stage: call.stage }),
			});
		steps.push({
			id: crypto.randomUUID(),
			parentId: operationId,
			name:
				call.sentence === undefined
					? call.stage
					: `${call.stage} · Sentence ${call.sentence}`,
			owner: `${DUMGEN} · ${call.executor}`,
			kind: call.executor === "jev" ? "TypeSafe" : "LLM",
			startedAt: call.startedAt,
			durationMs: call.durationMs,
			status: !call.failure
				? "Success"
				: call.failure.tag === "Interrupted"
					? "Interrupted"
					: "Failure",
			payloadJson: inspectionJson({
				input: call.payload?.request,
				output: call.payload?.response,
				stage: call.stage,
				...(call.sentence === undefined
					? {}
					: { sentence: call.sentence }),
				executor: call.executor,
				tokens: {
					input: call.inputTokens,
					output: call.outputTokens,
					...(call.cachedInputTokens === undefined
						? {}
						: { cachedInput: call.cachedInputTokens }),
					...(call.cacheWriteTokens === undefined
						? {}
						: { cacheWrite: call.cacheWriteTokens }),
				},
				...(waitMs === undefined ? {} : { budgetWaitMs: waitMs }),
				...(call.failure ? { failure: call.failure } : {}),
			}),
		});
	}
	return steps;
}

/** A trace without its prompts and answers, as evidence stores it. */
export function withoutPayloads(trace: OperationTrace): OperationTrace {
	return {
		...trace,
		calls: trace.calls.map(({ payload: _, ...call }) => call),
	};
}

/**
 * The `createDumgen` trace options for one action. Payloads are on only
 * under DEV inspection, which renders every operation as rows; production
 * keeps them off (#858 point 6). `sink` receives each trace too, payloads
 * included when they are on.
 */
export function dumgenTracing(
	inspection: InspectionCapture | undefined,
	sink?: (trace: OperationTrace) => void,
): Required<Pick<DumgenOptions, "onOperation" | "tracePayloads">> {
	return {
		tracePayloads: inspection !== undefined,
		onOperation: (trace) => {
			inspection?.operation(trace);
			sink?.(trace);
		},
	};
}

/**
 * A per-action Effect Tracer that builds DEV inspection steps. Every span
 * carrying an inspection owner becomes a step, and an action's steps hang
 * directly under its outermost one, the root the Resolution Inspector reads.
 * Dumgen operations become rows through `operation`; a `dumgen.operation`
 * span only places them under the root that ran it.
 */
export function createInspectionCapture() {
	const steps: CapturedInspectionStep[] = [];
	const spans = new WeakSet<Tracer.Span>();
	/**
	 * The roots of the `dumgen.operation` spans that ended, in order. Dumgen
	 * hands over an operation's trace right after its span ends.
	 */
	const operationRoots: (string | undefined)[] = [];

	/** The outermost step above `span`. */
	function rootOf(span: Tracer.Span): string | undefined {
		let root: string | undefined;
		for (
			let parent = span.parent;
			Option.isSome(parent) &&
			parent.value._tag === "Span" &&
			spans.has(parent.value);
			parent = parent.value.parent
		)
			if (isStep(parent.value)) root = parent.value.spanId;
		return root;
	}

	function record(
		span: Tracer.Span,
		startedAt: number,
		durationMs: number,
		exit: Exit.Exit<unknown, unknown>,
	) {
		const root = rootOf(span);
		const failure = Exit.isFailure(exit)
			? Cause.squash(exit.cause)
			: undefined;
		steps.push({
			id: span.spanId,
			...(root === undefined ? {} : { parentId: root }),
			name: span.name,
			owner: String(span.attributes.get(OWNER)),
			kind: "Code",
			startedAt,
			durationMs,
			status: statusOf(exit, span.attributes.get(FAILED) === true),
			payloadJson: inspectionJson({
				input: span.attributes.get(INPUT),
				output: Exit.isSuccess(exit) ? exit.value : undefined,
				...(failure === undefined
					? {}
					: {
							error: Cause.isUnknownError(failure)
								? failure.cause
								: failure,
						}),
			}),
		});
	}

	const tracer = Tracer.make({
		span({ name, parent, annotations, links, startTime, kind }) {
			// Effect's span times are monotonic time anchored to the wall clock
			// once per process, so in a long-lived executor they drift from
			// `Date.now()`, which Dumgen calls and Convex stamp with. A step
			// starts on the wall clock and keeps Effect's monotonic duration.
			const startedAt = Date.now();
			const spanId = crypto.randomUUID();
			const attributes = new Map<string, unknown>();
			const allLinks = [...links];
			let status: Tracer.SpanStatus = { _tag: "Started", startTime };
			const span: Tracer.Span = {
				_tag: "Span",
				name,
				spanId,
				traceId: Option.isSome(parent) ? parent.value.traceId : spanId,
				parent,
				annotations,
				links: allLinks,
				sampled: true,
				kind,
				attributes,
				get status() {
					return status;
				},
				attribute(key, value) {
					attributes.set(key, value);
				},
				event() {},
				addLinks(more) {
					allLinks.push(...more);
				},
				end(endTime, exit) {
					status = { _tag: "Ended", startTime, endTime, exit };
					if (isStep(span))
						record(
							span,
							startedAt,
							Number(endTime - startTime) / 1_000_000,
							exit,
						);
					else if (name === "dumgen.operation")
						operationRoots.push(rootOf(span));
				},
			};
			spans.add(span);
			return span;
		},
	});

	return {
		steps,
		tracer,
		/** `createDumgen`'s `onOperation`: the operation's rows under its root. */
		operation(trace: OperationTrace) {
			steps.push(...operationSteps(trace, operationRoots.shift()));
		},
	};
}
export type InspectionCapture = ReturnType<typeof createInspectionCapture>;
