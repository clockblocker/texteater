/**
 * Luna, the generation model, as Dumgen reaches it: one Responses request
 * of a system prompt and an input, answered with its output. The host
 * supplies the transport, `createOpenAILuna` in production, which sends
 * each request once.
 *
 * Only the operations that write reach Luna. Segmentation never receives
 * this port (no Luna in segmentation): nothing under `src/segment/` may
 * import it.
 */

/**
 * One generation request: the model and its settings, the prompt and the
 * input, and either free text or JSON under a schema back, as promptsmith's
 * executors take it.
 */
export type LunaRequest = (
	| { readonly outputFormat: "text"; readonly outputSchema?: never }
	| {
			readonly outputFormat?: "json";
			readonly outputSchema: Readonly<Record<string, unknown>>;
	  }
) & {
	readonly systemPrompt: string;
	readonly input: unknown;
	readonly cachePrompt?: boolean;
	readonly configuration: {
		readonly model: string;
		readonly settings: Readonly<Record<string, unknown>>;
	};
};

/**
 * A Luna request before its configuration. `Omit` on the union itself
 * would merge the text and JSON shapes, so each is omitted from apart.
 */
export type LunaDraft = LunaRequest extends infer R
	? R extends unknown
		? Omit<R, "configuration">
		: never
	: never;

/** What Luna answered: its output, and whatever the transport reports beside it. */
export type LunaResponse = {
	readonly output: unknown;
	readonly metadata?: unknown;
};

/**
 * Sends one request to Luna. Like `JevAsk`, it must settle promptly once
 * `signal` aborts, and anything it throws is a `ProviderFailure`.
 */
export type LunaAsk = (
	request: LunaRequest,
	context: { readonly stage: string; readonly signal: AbortSignal },
) => Promise<LunaResponse>;

/** The model and settings of a Luna request. */
export type LunaConfiguration = LunaRequest["configuration"];

/**
 * The Luna configuration Dumgen's writing calls use unless the host passes
 * another: the generation model the legacy pipeline wrote with, reasoning
 * off (no reasoning models in resolution) and the fast service tier.
 */
export const defaultLunaConfiguration: LunaConfiguration = {
	model: "gpt-5.6-luna",
	settings: { reasoning: { effort: "none" }, service_tier: "fast" },
};
