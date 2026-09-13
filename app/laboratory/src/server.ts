import { createDumgen, DumgenFailure } from "dumgen";
import type {
	ModelConfiguration,
	ModelExchange,
	ModelExecutor,
} from "dumgen/types";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Runtime from "effect/Runtime";
import { createOpenAIExecutor } from "promptsmith/openai";
import { configurationSchema } from "promptsmith/schemas";
import { GermanClassificationResolver } from "./classification";
import { createEvaluationService } from "./evaluations";
import { attemptedPromptPaths, segmentForLaboratory } from "./segmentation";
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
			error instanceof DumgenFailure && error._tag === "InvalidInput"
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
	modelExchanges: readonly ModelExchange[];
	applicationResult: ApplicationResult | null;
	startedAt: number;
	errors: LoggedError[];
	logDirectory?: string;
}): Promise<void> {
	try {
		await appendSessionEvent(
			{
				timestamp: input.timestamp,
				sessionId: input.sessionId,
				operation: input.operation,
				input: input.requestInput,
				promptNames: input.promptNames,
				model:
					input.modelExchanges.at(-1)?.request.configuration.model ??
					"authored or cached",
				trace: {
					stages: input.trace,
					modelExchanges: input.modelExchanges,
				},
				applicationResult: input.applicationResult,
				latencyMs: Number(
					(performance.now() - input.startedAt).toFixed(1),
				),
				errors: input.errors,
			},
			input.logDirectory,
		);
	} catch (error) {
		console.error("Failed to append laboratory session event.", error);
	}
}

export function startLaboratoryServer(
	options: {
		sessionDirectory?: string;
		port?: number;
		execute?: ModelExecutor;
		configuration?: Partial<ModelConfiguration>;
	} = {},
) {
	const evaluations = createEvaluationService();
	const transport = createOpenAIExecutor();
	const execute: ModelExecutor =
		options.execute ??
		(async (request) =>
			(
				await transport({
					...request,
					configuration: configurationSchema.parse(
						request.configuration,
					),
				})
			).output);
	const buildLaboratoryDumgen = (
		onModelExchange?: (exchange: ModelExchange) => void,
	) =>
		createDumgen({
			execute,
			configuration: options.configuration,
			onModelExchange,
		});
	let resolver = new GermanClassificationResolver(buildLaboratoryDumgen);
	const sentences = new Map<
		string,
		{ sessionId: string; sentence: SegmentedSentence }
	>();
	let currentSessionId = crypto.randomUUID();
	const model = options.configuration?.model ?? "Dumgen route policy";
	const server = Bun.serve({
		hostname: "127.0.0.1",
		port: options.port ?? 3100,
		routes: {
			"/api/evaluations/experiments": {
				GET() {
					return Response.json(evaluations.experiments());
				},
			},
			"/api/evaluations/runs": {
				async GET(request) {
					try {
						const url = new URL(request.url);
						return Response.json(
							await evaluations.list(
								url.searchParams.get("directory") || undefined,
							),
						);
					} catch (error) {
						return Response.json(
							{ error: String(error) },
							{ status: 400 },
						);
					}
				},
				async POST(request) {
					try {
						return Response.json(
							await evaluations.run(
								await request.json(),
								request.signal,
							),
						);
					} catch (error) {
						return Response.json(
							{ error: String(error) },
							{ status: 400 },
						);
					}
				},
			},
			"/api/evaluations/runs/:id": {
				async GET(request) {
					try {
						return Response.json(
							await evaluations.open(
								request.params.id,
								new URL(request.url).searchParams.get(
									"directory",
								) || undefined,
							),
						);
					} catch (error) {
						return Response.json(
							{ error: String(error) },
							{ status: 400 },
						);
					}
				},
			},
			"/api/evaluations/compare": {
				async GET(request) {
					try {
						const url = new URL(request.url);
						return Response.json(
							await evaluations.compare(
								url.searchParams.get("left") ?? "",
								url.searchParams.get("right") ?? "",
								url.searchParams.get("directory") || undefined,
							),
						);
					} catch (error) {
						return Response.json(
							{ error: String(error) },
							{ status: 400 },
						);
					}
				},
			},
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
					const modelExchanges: ModelExchange[] = [];
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
							segmentForLaboratory(
								buildLaboratoryDumgen((exchange) =>
									modelExchanges.push(exchange),
								),
								input.text,
								modelExchanges,
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
							logDirectory: options.sessionDirectory,
							timestamp,
							sessionId,
							operation: "segmentation-chain",
							requestInput,
							trace: { stages: trace },
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
					const modelExchanges: ModelExchange[] = [];
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
							sentence.segments[input.clickedSegmentIndex]
								?.kind !== "ResolvableText"
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
							resolver.resolve(
								sentence,
								input.clickedSegmentIndex,
								modelExchanges,
								attemptedPrompts,
								input.target,
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
							logDirectory: options.sessionDirectory,
							timestamp,
							sessionId,
							operation: "click-resolution",
							requestInput,
							trace: {
								stages: result?.stages ?? {},
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

	return server;
}
if (import.meta.main) {
	const server = startLaboratoryServer();
	console.log(`Laboratory API listening on ${server.url}`);
}
