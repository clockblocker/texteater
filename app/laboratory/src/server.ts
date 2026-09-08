import {
	type DumTraceEvent,
	type DumTraceSink,
	withTraceRecorder,
} from "common-utils/workflow";
import type { DumgenModelExchange, DumgenSection1Trace } from "dumgen";
import { buildDumgen } from "dumgen";
import { buildOpenAiFetchModelGenerator } from "dumgen/openai-fetch";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Runtime from "effect/Runtime";
import { GermanClassificationResolver } from "./classification";
import {
	attemptedPromptPaths,
	LaboratorySegmentationError,
	segmentForLaboratory,
} from "./segmentation";
import {
	appendSessionEvent,
	describeErrors,
	type LaboratoryOperation,
	type LoggedError,
} from "./session-log";
import type {
	ClickResolutionRequest,
	ClickResolutionResponse,
	SegmentationRequest,
	SegmentationResponse,
	SegmentedSentence,
} from "./shared/contract";

function buildLaboratoryDumgen() {
	return buildDumgen({
		modelGenerator: buildOpenAiFetchModelGenerator({
			apiKey: process.env.OPENAI_API_KEY,
		}),
	});
}
function recorder(
	events: DumTraceEvent[],
	exchanges: DumgenModelExchange[],
	section1: DumgenSection1Trace[] = [],
): DumTraceSink {
	const artifacts = new Map<string, unknown>();
	return {
		record: (event) =>
			Effect.sync(() => {
				events.push(event);
				if (event.event === "artifact") {
					const artifact = event.payload as {
						artifactId: string;
						value: unknown;
					};
					artifacts.set(artifact.artifactId, artifact.value);
					return;
				}
				const link = event.payload as
					| { artifactId?: string }
					| undefined;
				const payload = link?.artifactId
					? artifacts.get(link.artifactId)
					: event.payload;
				if (event.event === "model.exchange")
					exchanges.push(payload as DumgenModelExchange);
				if (event.event === "section1")
					section1.push(payload as DumgenSection1Trace);
			}),
		diagnostic: (message, cause) => {
			console.error(message, cause);
		},
	};
}

const generate = buildLaboratoryDumgen();
let resolver = new GermanClassificationResolver(buildLaboratoryDumgen);
const model = "gpt-5.6-luna" as const;
const sentences = new Map<
	string,
	{ sessionId: string; sentence: SegmentedSentence }
>();
let currentSessionId = crypto.randomUUID();

type ApplicationResult = {
	status: number;
	body: unknown;
};

function errorResult(error: unknown): ApplicationResult {
	if (Runtime.isFiberFailure(error))
		error = Cause.squash(error[Runtime.FiberFailureCauseId]);
	const message =
		error instanceof Error ? error.message : "Generation failed.";
	const details = describeErrors(error).map(
		({ name, message: detail }) => `${name}: ${detail}`,
	);
	return {
		status:
			(error instanceof LaboratorySegmentationError &&
				error.section1Error.code === "InvalidInput") ||
			(error instanceof Error &&
				"code" in error &&
				error.code === "invalid-input")
				? 400
				: 502,
		body: { error: message, details },
	};
}

async function logAttempt(input: {
	timestamp: string;
	sessionId: string;
	operation: LaboratoryOperation;
	requestInput: unknown;
	trace: unknown;
	promptNames: string[];
	modelExchanges: readonly DumgenModelExchange[];
	applicationResult: ApplicationResult | null;
	startedAt: number;
	errors: LoggedError[];
}): Promise<void> {
	try {
		await appendSessionEvent({
			timestamp: input.timestamp,
			sessionId: input.sessionId,
			operation: input.operation,
			input: input.requestInput,
			promptNames: input.promptNames,
			model,
			trace: {
				stages: input.trace,
				modelExchanges: input.modelExchanges,
			},
			applicationResult: input.applicationResult,
			latencyMs: Number((performance.now() - input.startedAt).toFixed(1)),
			errors: input.errors,
		});
	} catch (error) {
		console.error("Failed to append laboratory session event.", error);
	}
}

const server = Bun.serve({
	hostname: "127.0.0.1",
	port: 3100,
	routes: {
		"/api/health": Response.json({
			ok: true,
			service: "laboratory",
			dumgen: true,
			model,
			apiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
		}),
		"/api/session": {
			GET() {
				return Response.json({ sessionId: currentSessionId });
			},
			POST() {
				currentSessionId = crypto.randomUUID();
				sentences.clear();
				resolver = new GermanClassificationResolver(
					buildLaboratoryDumgen,
				);
				return Response.json({ sessionId: currentSessionId });
			},
		},
		"/api/segment": {
			async POST(request) {
				const timestamp = new Date().toISOString();
				const startedAt = performance.now();
				const sessionId = currentSessionId;
				let requestInput: unknown = null;
				const trace: Partial<SegmentationResponse["stages"]> = {};
				const promptNames: string[] = [];
				const modelExchanges: DumgenModelExchange[] = [];
				const traceEvents: DumTraceEvent[] = [];
				const section1Traces: DumgenSection1Trace[] = [];
				let applicationResult: ApplicationResult | null = null;
				let errors: LoggedError[] = [];
				try {
					requestInput = await request.json();
					const input = requestInput as SegmentationRequest;
					if (
						typeof input?.text !== "string" ||
						input.text.length === 0
					) {
						const error = new TypeError(
							"Expected non-empty source text.",
						);
						errors = describeErrors(error);
						applicationResult = {
							status: 400,
							body: { error: error.message },
						};
						return Response.json(applicationResult.body, {
							status: 400,
						});
					}

					const body = await Effect.runPromise(
						withTraceRecorder(
							segmentForLaboratory(
								generate,
								input.text,
								modelExchanges,
								section1Traces,
							),
							recorder(
								traceEvents,
								modelExchanges,
								section1Traces,
							),
						),
						{ signal: request.signal },
					);
					promptNames.push(...body.generation.prompts);
					Object.assign(trace, body.stages);
					if (!body.sentence) {
						applicationResult = { status: 200, body };
						return Response.json(body);
					}

					const sentence = body.sentence;
					if (sessionId !== currentSessionId) {
						throw new Error(
							"Laboratory session was reset during segmentation.",
						);
					}
					sentences.set(sentence.id, { sessionId, sentence });
					applicationResult = { status: 200, body };
					return Response.json(body);
				} catch (error) {
					errors = describeErrors(error);
					applicationResult = errorResult(error);
					return Response.json(applicationResult.body, {
						status: applicationResult.status,
					});
				} finally {
					await logAttempt({
						timestamp,
						sessionId,
						operation: "segmentation-chain",
						requestInput,
						trace: { stages: trace, events: traceEvents },
						promptNames: attemptedPromptPaths(modelExchanges),
						modelExchanges,
						applicationResult,
						startedAt,
						errors,
					});
				}
			},
		},
		"/api/resolve": {
			async POST(request) {
				const timestamp = new Date().toISOString();
				const startedAt = performance.now();
				const sessionId = currentSessionId;
				let requestInput: unknown = null;
				let result: ClickResolutionResponse | null = null;
				const modelExchanges: DumgenModelExchange[] = [];
				const traceEvents: DumTraceEvent[] = [];
				const attemptedPrompts: string[] = [];
				let applicationResult: ApplicationResult | null = null;
				let errors: LoggedError[] = [];
				try {
					requestInput = await request.json();
					const input = requestInput as ClickResolutionRequest;
					if (
						typeof input?.segmentedSentenceId !== "string" ||
						typeof input?.clickedSegmentIndex !== "number"
					) {
						const error = new TypeError(
							"Expected a segmented sentence ID and clicked segment index.",
						);
						errors = describeErrors(error);
						applicationResult = {
							status: 400,
							body: { error: error.message },
						};
						return Response.json(applicationResult.body, {
							status: 400,
						});
					}
					const stored = sentences.get(input.segmentedSentenceId);
					if (!stored || stored.sessionId !== sessionId) {
						const error = new Error(
							"Segmented sentence is no longer in the current session.",
						);
						errors = describeErrors(error);
						applicationResult = {
							status: 404,
							body: { error: error.message },
						};
						return Response.json(applicationResult.body, {
							status: 404,
						});
					}
					const { sentence } = stored;
					if (sentence.language !== "de") {
						const error = new Error(
							"Hebrew Click Resolution is not implemented; ambiguous morphology remains deferred.",
						);
						errors = describeErrors(error);
						applicationResult = {
							status: 422,
							body: { error: error.message },
						};
						return Response.json(applicationResult.body, {
							status: 422,
						});
					}
					if (
						sentence.segments[input.clickedSegmentIndex]?.kind !==
						"ResolvableText"
					) {
						const error = new Error(
							"Only ResolvableText can be resolved.",
						);
						errors = describeErrors(error);
						applicationResult = {
							status: 400,
							body: { error: error.message },
						};
						return Response.json(applicationResult.body, {
							status: 400,
						});
					}
					result = await Effect.runPromise(
						withTraceRecorder(
							resolver.resolve(
								sentence,
								input.clickedSegmentIndex,
								modelExchanges,
								attemptedPrompts,
							),
							recorder(traceEvents, modelExchanges),
						),
						{ signal: request.signal },
					);
					if (sessionId !== currentSessionId) {
						throw new Error(
							"Laboratory session was reset during click resolution.",
						);
					}
					applicationResult = { status: 200, body: result };
					return Response.json(result);
				} catch (error) {
					errors = describeErrors(error);
					applicationResult = errorResult(error);
					return Response.json(applicationResult.body, {
						status: applicationResult.status,
					});
				} finally {
					await logAttempt({
						timestamp,
						sessionId,
						operation: "click-resolution",
						requestInput,
						trace: {
							stages: result?.stages ?? {},
							events: traceEvents,
						},
						promptNames:
							result?.generation.prompts ??
							(attemptedPrompts.length > 0
								? attemptedPrompts
								: attemptedPromptPaths(modelExchanges)),
						modelExchanges,
						applicationResult,
						startedAt,
						errors,
					});
				}
			},
		},
	},
});

console.log(`Laboratory API listening on ${server.url}`);
