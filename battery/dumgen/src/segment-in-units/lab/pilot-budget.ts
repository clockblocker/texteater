import { jevUsdPerToken } from "./ledger.js";

/** Reserve the documented request maximum before dispatch, including concurrent calls. */
export class PilotBudget {
	readonly requestTokenLimit = 65_536;
	readonly capUsd: number;
	#reservedUsd = 0;
	#knownUsd = 0;
	#unknownUsd = 0;
	readonly priorKnownUsd: number;
	readonly priorUnknownUsageReservedUsd: number;
	constructor(
		capUsd: number,
		prior = { knownUsd: 0, unknownUsageReservedUsd: 0 },
	) {
		if (!Number.isFinite(capUsd) || capUsd <= 0 || capUsd > 1)
			throw Error(
				"The initial pilot budget must be above zero and at most $1",
			);
		this.capUsd = capUsd;
		for (const amount of Object.values(prior))
			if (!Number.isFinite(amount) || amount < 0)
				throw Error(
					"Prior pilot spending must be finite and nonnegative",
				);
		this.priorKnownUsd = prior.knownUsd;
		this.priorUnknownUsageReservedUsd = prior.unknownUsageReservedUsd;
		this.#knownUsd = prior.knownUsd;
		this.#unknownUsd = prior.unknownUsageReservedUsd;
	}
	get snapshot() {
		return {
			capUsd: this.capUsd,
			knownUsd: this.#knownUsd,
			unknownUsageReservedUsd: this.#unknownUsd,
			pendingReservedUsd: this.#reservedUsd,
			priorKnownUsd: this.priorKnownUsd,
			priorUnknownUsageReservedUsd: this.priorUnknownUsageReservedUsd,
			incrementalKnownUsd: this.#knownUsd - this.priorKnownUsd,
		};
	}
	reserve(): (inputTokens?: number) => void {
		const maximum = this.requestTokenLimit * jevUsdPerToken;
		if (
			this.#knownUsd + this.#unknownUsd + this.#reservedUsd + maximum >
			this.capUsd
		)
			throw Error("Pilot spend cap reached before dispatch");
		this.#reservedUsd += maximum;
		let completed = false;
		return (inputTokens) => {
			if (completed)
				throw Error("A request budget reservation was settled twice");
			completed = true;
			this.#reservedUsd -= maximum;
			if (
				inputTokens === undefined ||
				!Number.isInteger(inputTokens) ||
				inputTokens < 0
			) {
				this.#unknownUsd += maximum;
				return;
			}
			this.#knownUsd += inputTokens * jevUsdPerToken;
			if (inputTokens > this.requestTokenLimit)
				throw Error(
					"Reported usage exceeded the documented Jev request limit",
				);
		};
	}
}
