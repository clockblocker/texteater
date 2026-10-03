/**
 * What `onOperation` receives once a Dumgen operation finishes, failed and
 * interrupted ones included: every model call it started, the waits for the
 * request budget, and how each Sentence came out. It keeps no prompt, state
 * or answer unless the host asked for payloads (`tracePayloads`). The
 * `dumgen.operation` and `dumgen.call` spans carry the same calls without
 * payloads.
 */

/** Why a call brought nothing usable back. */
export type CallFailure = {
	readonly tag: "ProviderFailure" | "InvalidModelOutput" | "Interrupted";
	readonly message: string;
};

/** One model call, from the moment it held a permit of the request budget. */
export type CallTrace = {
	/** The operation's request (`segments`, `route`, `grammar`, …). */
	readonly stage: string;
	/** The Sentence it asked about, counted across the Text from 0. */
	readonly sentence?: number;
	readonly executor: "jev" | "luna";
	/** Zero when no answer came back. */
	readonly inputTokens: number;
	readonly outputTokens: number;
	/**
	 * Luna only: of `inputTokens`, those read from OpenAI's prompt cache
	 * and those written to it (#891); zero unless prompt caching is on.
	 */
	readonly cachedInputTokens?: number;
	readonly cacheWriteTokens?: number;
	/** Epoch milliseconds; `durationMs` reads the monotonic clock. */
	readonly startedAt: number;
	readonly durationMs: number;
	/** Absent when the call's answer was used. */
	readonly failure?: CallFailure;
	/** Only with `tracePayloads`: what was sent, and the answer when one came. */
	readonly payload?: {
		readonly request: unknown;
		readonly response?: unknown;
	};
};

/** A call that waited for a permit of the request budget before it was sent. */
export type BudgetWait = {
	/** The call's index in `calls`. */
	readonly call: number;
	readonly waitMs: number;
};

/**
 * How one Sentence of `segment.inUnits` came out. A Failed one is marked
 * `failed` on its Segmented Sentence; only this trace says why.
 */
export type SentenceOutcome =
	| { readonly sentence: number; readonly outcome: "Segmented" }
	| {
			readonly sentence: number;
			readonly outcome: "Failed";
			readonly failure: CallFailure;
	  };

/**
 * How a click came out, with why. For `resolve.grammar`: why it came back
 * Unresolved or a Catalog Miss, `UnresolvedUnit` when intake left the unit
 * Unresolved, otherwise the question or check that decided. For
 * `resolve.reading`: what decided its Reuse or New (`Authored`,
 * `AuthoredJudged`, `Judged`, `Written`, `Collision`, `WrittenStored`,
 * `Rejudged`) or its Catalog Miss. The value the host receives carries
 * only the outcome; the evaluation buckets by reason.
 */
export type ResolutionOutcome = {
	readonly outcome:
		| "Resolved"
		| "Unresolved"
		| "CatalogMiss"
		| "Reuse"
		| "New";
	readonly reason?: string;
};

/**
 * Something an operation decided that its value does not show, such as
 * the Valency Slots `knowledge.produce` dropped (`DroppedValencySlots`,
 * #675).
 */
export type OperationEvent = {
	readonly name: string;
	readonly data?: unknown;
};

export type OperationTrace = {
	readonly operation:
		| "segment.inUnits"
		| "resolve.grammar"
		| "resolve.reading"
		| "knowledge.produce";
	/** Epoch milliseconds; `durationMs` reads the monotonic clock. */
	readonly startedAt: number;
	readonly durationMs: number;
	/** In the order they were sent; every one had settled. */
	readonly calls: readonly CallTrace[];
	readonly waits: readonly BudgetWait[];
	/** In the order they finished; a Sentence the operation never finished is absent. */
	readonly sentences: readonly SentenceOutcome[];
	/** `resolve.grammar` and `resolve.reading` only, once the click came out. */
	readonly resolution?: ResolutionOutcome;
	/** In the order they happened; absent when there were none. */
	readonly events?: readonly OperationEvent[];
};
