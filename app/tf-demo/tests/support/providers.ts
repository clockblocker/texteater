import type { JevRequest } from "dumgen";
import { fakeJev } from "./jev";

/**
 * Answers the TypeSafe API (`POST /v1/systemone`) from a fake jev, so a real
 * intake action runs its real `segment.inUnits` with no network. A request
 * the jev refuses comes back as a 400, which the TypeSafe ask does not
 * retry; any other URL is refused the same way.
 */
export function fakeTypeSafe(jev: ReturnType<typeof fakeJev> = fakeJev()) {
	const previous = {
		fetch: globalThis.fetch,
		TYPESAFE_API_KEY: process.env.TYPESAFE_API_KEY,
	};
	const requests: string[] = [];
	process.env.TYPESAFE_API_KEY = "fixture";
	globalThis.fetch = (async (url: string | URL | Request, init) => {
		requests.push(String(url));
		if (!String(url).endsWith("/v1/systemone"))
			return new Response("unexpected request", { status: 400 });
		try {
			const request = JSON.parse(String(init?.body)) as JevRequest;
			return Response.json(await jev.ask(request, { stage: "fixture" }));
		} catch (error) {
			return new Response(String(error), { status: 400 });
		}
	}) as typeof fetch;
	return {
		jev,
		requests,
		restore() {
			globalThis.fetch = previous.fetch;
			if (previous.TYPESAFE_API_KEY === undefined)
				delete process.env.TYPESAFE_API_KEY;
			else process.env.TYPESAFE_API_KEY = previous.TYPESAFE_API_KEY;
		},
	};
}

/** Every jev request fails. */
export function unavailableProviders() {
	return fakeTypeSafe(fakeJev({ fail: () => true }));
}
