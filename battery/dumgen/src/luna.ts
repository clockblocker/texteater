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
import * as Context from "effect/Context";

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
export type LunaDraft = (LunaRequest extends infer R
	? R extends unknown
		? Omit<R, "configuration">
		: never
	: never) &
	OutputLimit;

/**
 * The most tokens Luna may write in one exchange. Like a deadline, it
 * bounds the exchange, not what is asked: it travels beside the request,
 * so no request, and no answer a cache keys by its request, changes. An
 * answer cut short there comes back incomplete, which the transport
 * throws. A stage sets it well above the longest answer it has had, so no
 * usable answer is cut and a runaway one ends early.
 */
export type OutputLimit = { readonly maxOutputTokens?: number };

/** What Luna answered: its output, and whatever the transport reports beside it. */
export type LunaResponse = {
	readonly output: unknown;
	readonly metadata?: unknown;
};

/**
 * Sends one request to Luna. Like `JevAsk`, it must settle promptly once
 * `signal` aborts, and anything it throws is a `ProviderFailure`. A
 * transport may answer from answers it stored (`storedLunaAsk`) unless
 * `live` asks for the model's own: the `Luna` service asks so when a stored
 * answer failed its check.
 */
export type LunaAsk = (
	request: LunaRequest,
	context: {
		readonly stage: string;
		readonly signal: AbortSignal;
		readonly live?: boolean;
	} & OutputLimit,
) => Promise<LunaResponse>;

/** The model and settings of a Luna request. */
export type LunaConfiguration = LunaRequest["configuration"];

/**
 * The request a draft becomes under `configuration`, and its output limit
 * beside it, as the `Luna` service sends it; a host asking a request ahead
 * of its click builds it the same way (#1351).
 */
export function lunaRequestOf(
	draft: LunaDraft,
	configuration: LunaConfiguration,
): { readonly request: LunaRequest } & OutputLimit {
	const { maxOutputTokens, ...asked } = draft;
	return {
		request: { ...asked, configuration },
		...(maxOutputTokens === undefined ? {} : { maxOutputTokens }),
	};
}

/**
 * The Luna configuration Dumgen's writing calls use unless the host passes
 * another: the generation model the legacy pipeline wrote with, reasoning
 * off (no reasoning models in resolution) and the fast service tier.
 */
export const defaultLunaConfiguration: LunaConfiguration = {
	model: "gpt-5.6-luna",
	settings: { reasoning: { effort: "none" }, service_tier: "fast" },
};

/** The Luna model and settings the `Luna` service writes with. */
export const LunaConfiguration = Context.Reference<LunaConfiguration>(
	"dumgen/LunaConfiguration",
	{ defaultValue: () => defaultLunaConfiguration },
);
