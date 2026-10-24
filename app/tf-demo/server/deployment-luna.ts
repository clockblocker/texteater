import { type DumgenOptions, LunaTransport } from "dumgen";

/** The deployment supplies configuration, never a process environment lookup. */
type LunaEnvironment = {
	readonly OPENAI_API_KEY?: string;
	readonly OPENAI_BASE_URL?: string;
	readonly LUNA_MODEL?: string;
};

/** Luna's transport and model travel together into every host Dumgen instance. */
export function deploymentLuna(
	environment: LunaEnvironment,
	timeoutMs?: number,
): Pick<DumgenOptions, "luna" | "lunaConfiguration"> {
	const apiKey = environment.OPENAI_API_KEY;
	const baseUrl = environment.OPENAI_BASE_URL;
	const model = environment.LUNA_MODEL;
	const configured = baseUrl !== undefined || model !== undefined;
	if (configured) {
		// Never include supplied values: URLs may accidentally contain secrets.
		const invalid = () =>
			new Error(
				"OPENAI_BASE_URL and LUNA_MODEL must configure a local Luna bridge together.",
			);
		if (!baseUrl || !model || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(model))
			throw invalid();
		let url: URL;
		try {
			url = new URL(baseUrl);
		} catch {
			throw invalid();
		}
		if (
			baseUrl !== baseUrl.trim() ||
			url.protocol !== "http:" ||
			!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
			!url.port ||
			!/^\/v1\/?$/.test(url.pathname) ||
			url.username ||
			url.password ||
			url.search ||
			url.hash
		)
			throw invalid();
	}
	return {
		...(model === undefined
			? {}
			: { lunaConfiguration: { model, settings: {} } }),
		luna: apiKey
			? LunaTransport.openAI({
					apiKey,
					...(baseUrl === undefined ? {} : { baseUrl }),
					...(timeoutMs === undefined ? {} : { timeoutMs }),
				})
			: LunaTransport.fromAsk(async () => {
					throw new Error(
						"OPENAI_API_KEY is not set on the Convex deployment",
					);
				}),
	};
}
