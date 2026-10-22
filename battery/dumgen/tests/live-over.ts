/**
 * `DumgenLive` over a test's fake asks: each becomes its transport through
 * `fromAsk`, as a host's fake does (Dumgen ADR 0009). A test provides it
 * to the operation it runs.
 */
import { DumgenLive, type DumgenOptions } from "../src/dumgen-live.js";
import { JevTransport } from "../src/jev-call.js";
import type { LunaAsk } from "../src/luna.js";
import { LunaTransport } from "../src/luna-call.js";
import type { JevAsk } from "../src/segment/jev.js";

/** `DumgenOptions` with fake asks in place of the transport Layers. */
export type FakeDumgenOptions = Omit<DumgenOptions, "jev" | "luna"> & {
	readonly jev: JevAsk;
	readonly luna: LunaAsk;
};

export function liveOver({ jev, luna, ...options }: FakeDumgenOptions) {
	return DumgenLive({
		...options,
		jev: JevTransport.fromAsk(jev),
		luna: LunaTransport.fromAsk(luna),
	});
}
