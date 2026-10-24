import { DumgenLive, JevTransport, LunaTransport } from "dumgen";
import { replaceModelTransports } from "../../convex/model/deploymentDumgen";
import { fakeJev } from "./jev";

/**
 * Gives the deployment a fake jev for its TypeSafe transport
 * (`JevTransport.fromAsk`), so a real intake action runs its real
 * `segment.inUnits` with no network, and no Luna, as a deployment without
 * an OpenAI key. `requests` are the requests jev was sent, each once, since
 * nothing retries. `restore` puts the deployment's own transports back.
 */
export function fakeTypeSafe(jev: ReturnType<typeof fakeJev> = fakeJev()) {
	const restore = replaceModelTransports({
		jev: () => JevTransport.fromAsk(jev.ask),
	});
	return { jev, requests: jev.sent, restore };
}

/** Every jev request fails. */
export function unavailableProviders() {
	return fakeTypeSafe(fakeJev({ fail: () => true }));
}

/**
 * Transports that fail any test that reaches a model: every request to jev
 * or Luna is recorded by its stage, then refused.
 */
export function noModelCalls() {
	const requests: string[] = [];
	const refuse = async (_: unknown, { stage }: { stage: string }) => {
		requests.push(stage);
		throw new Error("No model call is expected.");
	};
	const restore = replaceModelTransports({
		jev: () => JevTransport.fromAsk(refuse),
		luna: () => LunaTransport.fromAsk(refuse),
	});
	return { requests, restore };
}

/**
 * `DumgenLive` over a fake jev, for a test that runs intake's own code:
 * what an action provides, with no Luna, which intake never asks.
 */
export function intakeDumgen(jev: ReturnType<typeof fakeJev> = fakeJev()) {
	return DumgenLive({
		jev: JevTransport.fromAsk(jev.ask),
		luna: LunaTransport.fromAsk(async () => {
			throw Error("intake asked Luna");
		}),
	});
}
