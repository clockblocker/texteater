import type { EvaluationExecutor } from "./evaluation.js";
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
	return async (request) => {
		const textOutput = request.outputFormat === "text";
		const { $defs, $schema, ...outputSchema } = request.outputSchema ?? {};
		const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
		if (!apiKey) throw Error("OPENAI_API_KEY is not configured");
		const started = performance.now();
		const response = await (options.fetch ?? globalThis.fetch)(
			`${options.baseUrl ?? "https://api.openai.com/v1"}/responses`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
				signal: request.signal,
				body: JSON.stringify({
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
				}),
			},
		);
		const headersMs = performance.now() - started;
		const processingHeader = response.headers.get("openai-processing-ms");
		const processingMs =
			processingHeader === null ? null : Number(processingHeader);
		if (!response.ok)
			throw Error(
				`OpenAI HTTP ${response.status}: ${await response.text()}`,
			);
		const payload = (await response.json()) as {
			status?: string;
			output?: { content?: { type?: string; text?: string }[] }[];
			usage?: unknown;
			id?: string;
			model?: string;
		};
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
		return {
			output: textOutput ? outputText : JSON.parse(outputText).value,
			metadata: {
				requestId: response.headers.get("x-request-id"),
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
				},
				responseId: payload.id ?? null,
				model: payload.model ?? null,
				usage: payload.usage ?? null,
			},
		};
	};
}
