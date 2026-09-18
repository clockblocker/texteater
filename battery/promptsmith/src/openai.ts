import type { EvaluationExecutor } from "./evaluation.js";
import {
	createHttpTrace,
	httpTraceMetadata,
	runWithHttpTrace,
} from "./http-tracing.js";
/** Responses transport shared by command-line and app consumers. No linguistic or model policy. */
export function createOpenAIExecutor(
	options: {
		apiKey?: string;
		baseUrl?: string;
		fetch?: (
			input: string | URL | Request,
			init?: RequestInit,
		) => Promise<Response>;
	} = {},
): EvaluationExecutor {
	let executorRequestOrdinal = 0;
	return async (request) => {
		const trace = createHttpTrace(++executorRequestOrdinal);
		return runWithHttpTrace(trace, async () => {
			const textOutput = request.outputFormat === "text";
			const { $defs, $schema, ...outputSchema } =
				request.outputSchema ?? {};
			const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
			if (!apiKey) throw Error("OPENAI_API_KEY is not configured");
			const clientRequestId = crypto.randomUUID();
			const serializationStarted = performance.now();
			const body = JSON.stringify({
				...request.configuration.settings,
				model: request.configuration.model,
				store: false,
				...(request.cachePrompt
					? { prompt_cache_options: { mode: "explicit" } }
					: {}),
				input: [
					request.cachePrompt
						? {
								role: "developer",
								content: [
									{
										type: "input_text",
										text: request.systemPrompt,
										prompt_cache_breakpoint: {
											mode: "explicit",
										},
									},
								],
							}
						: { role: "system", content: request.systemPrompt },
					{
						role: "user",
						content: JSON.stringify(request.input),
					},
				],
				text: {
					format: textOutput
						? { type: "text" }
						: {
								type: "json_schema",
								name: "experiment_output",
								strict: false,
								schema: {
									type: "object",
									properties: { value: outputSchema },
									required: ["value"],
									additionalProperties: false,
									...($defs ? { $defs } : {}),
								},
							},
				},
			});
			const serializationMs = performance.now() - serializationStarted;
			const started = performance.now();
			const response = await (options.fetch ?? globalThis.fetch)(
				`${options.baseUrl ?? "https://api.openai.com/v1"}/responses`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${apiKey}`,
						"Content-Type": "application/json",
						"X-Client-Request-Id": clientRequestId,
					},
					signal: request.signal,
					body,
				},
			);
			const headersMs = performance.now() - started;
			const processingHeader = response.headers.get(
				"openai-processing-ms",
			);
			const processingMs =
				processingHeader === null ? null : Number(processingHeader);
			const bodyReadStarted = performance.now();
			const responseText = await response.text();
			const bodyReadMs = performance.now() - bodyReadStarted;
			if (!response.ok)
				throw Error(`OpenAI HTTP ${response.status}: ${responseText}`);
			const responseParseStarted = performance.now();
			const payload = JSON.parse(responseText) as {
				status?: string;
				output?: { content?: { type?: string; text?: string }[] }[];
				usage?: unknown;
				id?: string;
				model?: string;
				service_tier?: string;
			};
			const responseParseMs = performance.now() - responseParseStarted;
			const bodyMs = performance.now() - started - headersMs;
			if (payload.status !== "completed")
				throw Error(
					`OpenAI response ${payload.status ?? "missing status"}`,
				);
			const outputText = (payload.output ?? [])
				.flatMap((item) => item.content ?? [])
				.filter((content) => content.type === "output_text")
				.map((content) => content.text ?? "")
				.join("");
			const outputParseStarted = performance.now();
			const output = textOutput
				? outputText
				: JSON.parse(outputText).value;
			const outputParseMs = performance.now() - outputParseStarted;
			return {
				output,
				metadata: {
					requestId: response.headers.get("x-request-id"),
					clientRequestId,
					timing: {
						headersMs,
						bodyMs,
						totalMs: performance.now() - started,
						providerProcessingMs:
							processingMs !== null &&
							Number.isFinite(processingMs) &&
							processingMs >= 0
								? processingMs
								: null,
						detailed: {
							...httpTraceMetadata(trace),
							request: {
								serializationMs,
								bodyBytes: new TextEncoder().encode(body)
									.byteLength,
							},
							local: {
								bodyReadMs,
								responseParseMs,
								outputParseMs,
							},
						},
					},
					responseId: payload.id ?? null,
					model: payload.model ?? null,
					serviceTier: payload.service_tier ?? null,
					usage: payload.usage ?? null,
				},
			};
		});
	};
}
