import type { OperationTrace } from "dumgen/types";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import * as Runtime from "effect/Runtime";
import * as Tracer from "effect/Tracer";
import type {
	CapturedInspectionStep,
	InspectionStep,
} from "../convex/model/inspection";
import { inspectionJson } from "./inspectionPayload";

const OWNER = "inspection.owner";
const INPUT = "inspection.input";
const FAILED = "inspection.failed";

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
 * Runs promise work as spans under the span `runtime` was taken in, for
 * callers outside a fiber. A hop rethrows its own error.
 */
export function spanHops(runtime: Runtime.Runtime<never>) {
	const markFailed = () =>
		Runtime.runSync(runtime, Effect.annotateCurrentSpan(FAILED, true));
	return {
		run: Runtime.runPromise(runtime),
		async hop<T>(
			name: string,
			owner: string,
			input: unknown,
			run: () => Promise<T>,
		): Promise<T> {
			const exit = await Runtime.runPromiseExit(
				runtime,
				Effect.tryPromise({ try: run, catch: (error) => error }).pipe(
					Effect.withSpan(name, inspectionStep(owner, input)),
				),
			);
			if (Exit.isSuccess(exit)) return exit.value;
			throw Cause.originalError(Cause.squash(exit.cause));
		},
		/** Fails the enclosing step although its work returns normally. */
		markFailed,
		/** A handled failure: a failed step of its own that fails the enclosing step. */
		failure(name: string, owner: string, input: unknown, error: unknown) {
			markFailed();
			Runtime.runSyncExit(
				runtime,
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
	return Cause.isInterruptedOnly(exit.cause) ? "Interrupted" : "Failure";
}

const isStep = (span: Tracer.Span) =>
	!span.name.startsWith("dumgen.") && span.attributes.has(OWNER);

/**
 * A per-action Effect Tracer that builds DEV inspection steps. Every span
 * carrying an inspection owner becomes a step, and an action's steps hang
 * directly under its outermost one, the root the Resolution Inspector reads.
 * Dumgen steps come from each OperationTrace alone: `dumgen.*` spans render
 * nothing, and a `dumgen.operation` span only places its operation's steps
 * under the root that ran it, so every Dumgen call appears once.
 */
export function createInspectionCapture() {
	const steps: CapturedInspectionStep[] = [];
	const spans = new WeakSet<Tracer.Span>();
	const operationRoots = new Map<string, string | undefined>();

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
		startTime: bigint,
		endTime: bigint,
		exit: Exit.Exit<unknown, unknown>,
	) {
		const root = rootOf(span);
		const failure = Exit.isFailure(exit)
			? Cause.originalError(Cause.squash(exit.cause))
			: undefined;
		steps.push({
			id: span.spanId,
			...(root === undefined ? {} : { parentId: root }),
			name: span.name,
			owner: String(span.attributes.get(OWNER)),
			kind: "Code",
			startedAt: Number(startTime / 1000n) / 1000,
			durationMs: Number(endTime - startTime) / 1_000_000,
			status: statusOf(exit, span.attributes.get(FAILED) === true),
			payloadJson: inspectionJson({
				input: span.attributes.get(INPUT),
				output: Exit.isSuccess(exit) ? exit.value : undefined,
				...(failure === undefined
					? {}
					: {
							error: Cause.isUnknownException(failure)
								? failure.error
								: failure,
						}),
			}),
		});
	}

	const tracer = Tracer.make({
		span(name, parent, context, links, startTime, kind) {
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
				context,
				links: allLinks,
				sampled: true,
				kind,
				attributes,
				get status() {
					return status;
				},
				attribute(key, value) {
					attributes.set(key, value);
					if (
						name === "dumgen.operation" &&
						key === "dumgen.operation.id"
					)
						operationRoots.set(String(value), rootOf(span));
				},
				event() {},
				addLinks(more) {
					allLinks.push(...more);
				},
				end(endTime, exit) {
					status = { _tag: "Ended", startTime, endTime, exit };
					if (isStep(span)) record(span, startTime, endTime, exit);
				},
			};
			spans.add(span);
			return span;
		},
		context: (execute) => execute(),
	});

	return {
		steps,
		tracer,
		operation(trace: OperationTrace) {
			// Old traces have no absolute timestamps and cannot form a truthful waterfall.
			if (trace.startedAt === undefined) return;
			const parentId = operationRoots.get(trace.id);
			operationRoots.delete(trace.id);
			steps.push({
				id: trace.id,
				...(parentId === undefined ? {} : { parentId }),
				name: trace.operation,
				owner: "battery/dumgen",
				kind: "Code",
				startedAt: trace.startedAt,
				durationMs: trace.durationMs,
				status: trace.outcome,
				payloadJson: inspectionJson({
					input: trace.input,
					output: trace.output,
					failure: trace.failure,
					events: trace.events,
					generationConfiguration: trace.generationConfiguration,
					judgmentConfiguration: trace.judgmentConfiguration,
				}),
			});
			for (const call of trace.calls) {
				if (call.startedAt === undefined) continue;
				steps.push({
					id: call.id,
					parentId: trace.id,
					name: call.request.stage,
					kind: call.executor === "TypeSafe" ? "TypeSafe" : "LLM",
					owner: `battery/promptsmith · ${call.request.configuration.model}`,
					startedAt: call.startedAt,
					durationMs: call.durationMs,
					status:
						call.transport === "Interrupted"
							? "Interrupted"
							: call.transport === "Failure" ||
									call.validation === "Invalid"
								? "Failure"
								: "Success",
					payloadJson: inspectionJson({
						input: call.request,
						output: call.output,
						metadata: call.metadata,
						failure: call.failure,
						validation: call.validation,
						dependsOn: call.dependsOn,
						fingerprint: call.fingerprint,
					}),
				});
			}
		},
	};
}
export type InspectionCapture = ReturnType<typeof createInspectionCapture>;
