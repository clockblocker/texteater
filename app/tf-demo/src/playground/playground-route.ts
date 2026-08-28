export const PLAYGROUND_PATH = "/playground";

export type PlaygroundRoute =
	| { readonly kind: "Index" }
	| { readonly kind: "Experiment"; readonly experimentId: string };

export function playgroundRouteFromPathname(
	pathname: string,
): PlaygroundRoute | null {
	if (pathname === PLAYGROUND_PATH || pathname === `${PLAYGROUND_PATH}/`) {
		return { kind: "Index" };
	}
	if (!pathname.startsWith(`${PLAYGROUND_PATH}/`)) return null;

	const encodedId = pathname
		.slice(PLAYGROUND_PATH.length + 1)
		.replace(/\/$/, "");
	if (encodedId === "" || encodedId.includes("/")) return null;

	try {
		const experimentId = decodeURIComponent(encodedId);
		return experimentId === ""
			? null
			: { kind: "Experiment", experimentId };
	} catch {
		return null;
	}
}

export function playgroundExperimentHref(experimentId: string): string {
	return `${PLAYGROUND_PATH}/${encodeURIComponent(experimentId)}`;
}
