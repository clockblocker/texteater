/**
 * A cap on fresh jev input tokens that reserves the documented request
 * maximum before dispatch, including concurrent calls.
 */
export class PilotBudget {
	readonly requestTokenLimit = 65_536;
	/** The largest cap a first pilot may set. */
	static readonly maximumCapTokens = 25_000_000;
	readonly capTokens: number;
	#reservedTokens = 0;
	#knownTokens = 0;
	#unknownTokens = 0;
	readonly priorKnownTokens: number;
	readonly priorUnknownUsageReservedTokens: number;
	constructor(
		capTokens: number,
		prior = { knownTokens: 0, unknownUsageReservedTokens: 0 },
	) {
		if (
			!Number.isInteger(capTokens) ||
			capTokens <= 0 ||
			capTokens > PilotBudget.maximumCapTokens
		)
			throw Error(
				`The pilot token budget must be a whole number above zero and at most ${PilotBudget.maximumCapTokens}`,
			);
		this.capTokens = capTokens;
		for (const amount of Object.values(prior))
			if (!Number.isFinite(amount) || amount < 0)
				throw Error(
					"Prior pilot spending must be finite and nonnegative",
				);
		this.priorKnownTokens = prior.knownTokens;
		this.priorUnknownUsageReservedTokens = prior.unknownUsageReservedTokens;
		this.#knownTokens = prior.knownTokens;
		this.#unknownTokens = prior.unknownUsageReservedTokens;
	}
	get snapshot() {
		return {
			capTokens: this.capTokens,
			knownTokens: this.#knownTokens,
			unknownUsageReservedTokens: this.#unknownTokens,
			pendingReservedTokens: this.#reservedTokens,
			priorKnownTokens: this.priorKnownTokens,
			priorUnknownUsageReservedTokens:
				this.priorUnknownUsageReservedTokens,
			incrementalKnownTokens: this.#knownTokens - this.priorKnownTokens,
		};
	}
	reserve(): (inputTokens?: number) => void {
		const maximum = this.requestTokenLimit;
		if (
			this.#knownTokens +
				this.#unknownTokens +
				this.#reservedTokens +
				maximum >
			this.capTokens
		)
			throw Error("Pilot spend cap reached before dispatch");
		this.#reservedTokens += maximum;
		let completed = false;
		return (inputTokens) => {
			if (completed)
				throw Error("A request budget reservation was settled twice");
			completed = true;
			this.#reservedTokens -= maximum;
			if (
				inputTokens === undefined ||
				!Number.isInteger(inputTokens) ||
				inputTokens < 0
			) {
				this.#unknownTokens += maximum;
				return;
			}
			this.#knownTokens += inputTokens;
			if (inputTokens > this.requestTokenLimit)
				throw Error(
					"Reported usage exceeded the documented Jev request limit",
				);
		};
	}
}
