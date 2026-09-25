import type { DumgenOptions, ModelConfiguration } from "../types.js";

export const defaultModelConfiguration: ModelConfiguration = {
	model: "gpt-5.6-luna",
	settings: { reasoning: { effort: "none" }, service_tier: "fast" },
};

/**
 * The configuration a generation call executes with. Without a route, it is
 * the one every call without a route override executes with, which traces
 * and Evaluation Runs record.
 */
export function effectiveConfiguration(
	options: DumgenOptions,
	route?: string,
): ModelConfiguration {
	const overrides =
		route === undefined ? undefined : options.routeOverrides?.[route];
	return {
		model:
			overrides?.model ??
			options.configuration?.model ??
			defaultModelConfiguration.model,
		settings: {
			...defaultModelConfiguration.settings,
			...options.configuration?.settings,
			...overrides?.settings,
		},
	};
}
