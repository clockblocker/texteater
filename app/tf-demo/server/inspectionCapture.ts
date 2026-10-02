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

/**
 * A per-action Effect Tracer that builds DEV inspection steps. Every span
 * carrying an inspection owner becomes a step, and an action's steps hang
 * directly under its outermost one, the root the Resolution Inspector reads.
 */
export function createInspectionCapture() {
	const steps: CapturedInspectionStep[] = [];
	const spans = new WeakSet<Tracer.Span>();

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
			? Cause.squash(exit.cause)
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
							error: Cause.isUnknownError(failure)
								? failure.cause
								: failure,
						}),
			}),
		});
	}

	const tracer = Tracer.make({
		span({ name, parent, annotations, links, startTime, kind }) {
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
					if (isStep(span)) record(span, startTime, endTime, exit);
				},
			};
			spans.add(span);
			return span;
		},
	});

	return {
		steps,
		tracer,
	};
}
export type InspectionCapture = ReturnType<typeof createInspectionCapture>;
