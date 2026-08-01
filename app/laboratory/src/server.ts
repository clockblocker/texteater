import { AsyncLocalStorage } from "node:async_hooks";
import type { DumgenModelExchange } from "dumgen";
import { buildDumgen } from "dumgen";
import { GermanClassificationResolver } from "./classification";
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
	SegmentKind,
} from "./shared/contract";

const modelExchangeContext = new AsyncLocalStorage<DumgenModelExchange[]>();
const generate = buildDumgen({
	onModelExchange(exchange) {
		modelExchangeContext.getStore()?.push(exchange);
	},
});
let resolver = new GermanClassificationResolver(generate);
const model = "gpt-5-nano" as const;
const intakePrompt = "laboratory.intake";
const segmentationPrompt = "laboratory.segmentation.de";
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
	const message =
		error instanceof Error ? error.message : "Generation failed.";
	const details = describeErrors(error).map(
		({ name, message: detail }) => `${name}: ${detail}`,
	);
	return { status: 502, body: { error: message, details } };
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

function acceptedStage(
	prompt: string,
	result: unknown,
	modelExchanges: readonly DumgenModelExchange[],
): SegmentationResponse["stages"]["intake"] {
	const exchange = modelExchanges.find(
		(candidate) =>
			candidate.phase === "accepted" && candidate.promptPath === prompt,
	);
	if (exchange?.phase !== "accepted") {
		throw new Error(
			`No accepted model exchange was captured for ${prompt}.`,
		);
	}
	return {
		prompt,
		traceOrigin: "generated",
		input: exchange.modelInput,
		output: exchange.validatedModelOutput,
		result,
	};
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
				resolver = new GermanClassificationResolver(generate);
				return Response.json({ sessionId: currentSessionId });
			},
		},
		"/api/segment": {
			async POST(request) {
				const timestamp = new Date().toISOString();
				const startedAt = performance.now();
				const sessionId = currentSessionId;
				let requestInput: unknown = null;
				const trace: Record<string, unknown> = {};
				const promptNames: string[] = [];
				const modelExchanges: DumgenModelExchange[] = [];
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

					const intakeInput = { text: input.text };
					promptNames.push(intakePrompt);
					const intakeOutput = await modelExchangeContext.run(
						modelExchanges,
						() => generate.laboratory.intake(intakeInput),
					);
					trace.intake = acceptedStage(
						intakePrompt,
						intakeOutput,
						modelExchanges,
					);
					if (intakeOutput.decision !== "Accepted") {
						const body: SegmentationResponse = {
							decision: intakeOutput.decision,
							sentence: null,
							stages: {
								intake: trace.intake as SegmentationResponse["stages"]["intake"],
							},
							generation: { model, prompts: promptNames },
						};
						applicationResult = { status: 200, body };
						return Response.json(body);
					}

					const segmentationInput = { text: input.text };
					promptNames.push(segmentationPrompt);
					const segmentationOutput = await modelExchangeContext.run(
						modelExchanges,
						() =>
							generate.laboratory.segmentation.de(
								segmentationInput,
							),
					);
					trace.segmentation = acceptedStage(
						segmentationPrompt,
						segmentationOutput,
						modelExchanges,
					);
					let offset = 0;
					const sentence: SegmentedSentence = {
						id: crypto.randomUUID(),
						language: "de",
						sourceText: input.text,
						segments: segmentationOutput.segments.map(
							(
								segment: { kind: SegmentKind; text: string },
								index: number,
							) => {
								const start = offset;
								offset += segment.text.length;
								return {
									...segment,
									index,
									start,
									end: offset,
								};
							},
						),
					};
					if (sessionId !== currentSessionId) {
						throw new Error(
							"Laboratory session was reset during segmentation.",
						);
					}
					sentences.set(sentence.id, { sessionId, sentence });
					const body: SegmentationResponse = {
						decision: "Accepted",
						sentence,
						stages: trace as SegmentationResponse["stages"],
						generation: { model, prompts: promptNames },
					};
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
						trace,
						promptNames,
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
					result = await modelExchangeContext.run(
						modelExchanges,
						() =>
							resolver.resolve(
								sentence,
								input.clickedSegmentIndex,
								modelExchanges,
								attemptedPrompts,
							),
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
						trace: result?.stages ?? {},
						promptNames:
							result?.generation.prompts ?? attemptedPrompts,
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
