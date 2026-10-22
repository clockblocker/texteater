/**
 * `DumgenLive(options)`, the Layer that provides Dumgen's operations
 * (Dumgen ADR 0009): `Jev` and `Luna` over the host's transports and one
 * request budget, with the settings every operation reads beside them.
 * Each build makes a fresh budget, so the operations it serves share one.
 */
import * as Layer from "effect/Layer";
import { RequestBudget, TracePayloads, TraceSink } from "./call.js";
import { Jev, JevModel, JevTransport } from "./jev-call.js";
import { Languages, languageModules } from "./languages.js";
import {
	defaultLunaConfiguration,
	type LunaAsk,
	LunaConfiguration,
} from "./luna.js";
import { Luna, LunaTransport } from "./luna-call.js";
import type { OperationTrace } from "./operation-trace.js";
import type { GermanInventory } from "./segment/de/inventory.js";
import { type JevAsk, pinnedJevModel } from "./segment/jev.js";

export type DumgenOptions = {
	/** jev (TypeSafe System One): `createTypeSafeAsk` in production. */
	readonly jev: JevAsk;
	/**
	 * Luna, for the operations that write: `resolve.grammar` writes Canonical
	 * Forms and spelling corrections with it and drafts Emoji Descriptions
	 * in the same call, `resolve.reading` writes those no draft supplies
	 * (#862), `translate.sentence` a Sentence's translation, and
	 * `knowledge.produce` Knowledge text, plural and Präteritum forms,
	 * frames and relation candidates. Segmentation never
	 * receives it. `createOpenAILuna` in production.
	 */
	readonly luna: LunaAsk;
	/** The Luna model and settings; `defaultLunaConfiguration` unless given. */
	readonly lunaConfiguration?: LunaConfiguration;
	/**
	 * The model calls one build keeps in flight, jev and Luna together;
	 * 16 by default. A call holds its permit for its transport only.
	 */
	readonly requestBudget?: number;
	/** Receives each operation's trace once the operation exits. */
	readonly onOperation?: (trace: OperationTrace) => void;
	/** Keeps every call's request and answer in its trace; off by default. */
	readonly tracePayloads?: boolean;
	/** The jev version every request names; a floating alias is refused. */
	readonly jevModel?: string;
	/** The German Authored Inventories the unit stage reads; dumcorpus's by default. */
	readonly inventory?: GermanInventory;
};

export function DumgenLive(options: DumgenOptions): Layer.Layer<Jev | Luna> {
	const settings = Layer.mergeAll(
		Layer.succeed(JevModel, options.jevModel ?? pinnedJevModel),
		Layer.succeed(
			LunaConfiguration,
			options.lunaConfiguration ?? defaultLunaConfiguration,
		),
		Layer.succeed(TracePayloads, options.tracePayloads ?? false),
		Layer.succeed(TraceSink, options.onOperation),
		Layer.succeed(Languages, languageModules(options)),
	);
	const transports = Layer.mergeAll(
		Layer.succeed(JevTransport, { ask: options.jev }),
		Layer.succeed(LunaTransport, { ask: options.luna }),
		RequestBudget.layer(options.requestBudget ?? 16),
	);
	return Layer.mergeAll(Jev.layer, Luna.layer).pipe(
		Layer.provide(transports),
		Layer.provideMerge(settings),
	);
}
