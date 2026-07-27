export type DumgenPrompt = {
	readonly kind: "prompt";
	readonly content: string;
};

export type DumgenRuntime = {
	readonly de: {
		readonly classify: (
			sentence: string,
			selection: string,
		) => Promise<never>;
	};
};

export function createPrompt(content: string): DumgenPrompt {
	return {
		kind: "prompt",
		content,
	};
}

export function buildDumgen(_llmCaller: unknown): DumgenRuntime {
	return {
		de: {
			async classify() {
				throw new Error(
					"buildDumgen() runtime wiring is not implemented yet; use the internal prompt infra module for v0 work.",
				);
			},
		},
	};
}
