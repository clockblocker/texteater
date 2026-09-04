export const PLAYGROUND_PATH = "/playground";

export type PlaygroundRoute =
	| { readonly kind: "Index" }
	| {
			readonly kind: "Experiment";
			readonly experimentId: string;
			readonly detailId?: string;
	  };

export function playgroundRouteFromPathname(
	pathname: string,
): PlaygroundRoute | null {
	if (pathname === PLAYGROUND_PATH || pathname === `${PLAYGROUND_PATH}/`) {
		return { kind: "Index" };
	}
	if (!pathname.startsWith(`${PLAYGROUND_PATH}/`)) return null;

	const encodedPath = pathname
		.slice(PLAYGROUND_PATH.length + 1)
		.replace(/\/$/, "");
	const encodedParts = encodedPath.split("/");
	if (encodedPath === "" || encodedParts.some((part) => part === "")) {
		return null;
	}

	try {
		const [encodedExperimentId, ...encodedDetailParts] = encodedParts;
		if (!encodedExperimentId) return null;
		const experimentId = decodeURIComponent(encodedExperimentId);
		const detailId =
			encodedDetailParts.length > 0
				? encodedDetailParts.map(decodeURIComponent).join("/")
				: undefined;
		return experimentId === ""
			? null
			: {
					kind: "Experiment",
					experimentId,
					...(detailId ? { detailId } : {}),
				};
	} catch {
		return null;
	}
}

export function playgroundExperimentHref(
	experimentId: string,
	detailId?: string,
): string {
	const experimentHref = `${PLAYGROUND_PATH}/${encodeURIComponent(experimentId)}`;
	return detailId
		? `${experimentHref}/${detailId.split("/").map(encodeURIComponent).join("/")}`
		: experimentHref;
}
