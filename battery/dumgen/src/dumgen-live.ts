/**
 * `DumgenLive(options)`, the one way to build Dumgen (Dumgen ADR 0009): a
 * Layer of `Jev` and `Luna` over the host's transports and one request
 * budget, with the settings every operation reads beside them. A host
 * provides it once per action to the operations in `operations`; each
 * build makes a fresh budget, so the operations it serves share one.
 * `TraceSink` and `TracePayloads` are References: a host sets them here,
 * or provides them per program, around one operation or an action.
 *
 * `DumgenCore(options)` is the same Layer without its budget: it takes the
 * `RequestBudget` from its context, so builds over different transports
 * can share one. The lab builds one per attempt, over that attempt's
 * cached transports, on its run's budget (`lab/evaluation/lab-runtime.ts`).
 */
import * as Layer from "effect/Layer";
import { RequestBudget, TracePayloads, TraceSink } from "./call.js";
import { Jev, JevModel, type JevTransport } from "./jev-call.js";
import { Languages, languageModules } from "./languages.js";
import { defaultLunaConfiguration, LunaConfiguration } from "./luna.js";
import { Luna, type LunaTransport } from "./luna-call.js";
import type { OperationTrace } from "./operation-trace.js";
import type { GermanInventory } from "./segment/de/inventory.js";
import { pinnedJevModel } from "./segment/jev.js";

export type DumgenOptions = {
	/**
	 * jev (TypeSafe System One): `JevTransport.typeSafe` in production,
	 * `JevTransport.fromAsk` over the lab's cache or a test's fake.
	 */
	readonly jev: Layer.Layer<JevTransport>;
	/**
	 * Luna, for the operations that write: `resolve.grammar` writes Canonical
	 * Forms and spelling corrections with it and drafts Emoji Descriptions
	 * in the same call, `resolve.reading` writes those no draft supplies
	 * (#862), `translate.sentence` a Sentence's translation, and
	 * `knowledge.produce` Knowledge text, plural and Präteritum forms,
	 * frames and relation candidates. Segmentation never
	 * receives it. `LunaTransport.openAI` in production,
	 * `LunaTransport.fromAsk` elsewhere.
	 */
	readonly luna: Layer.Layer<LunaTransport>;
	/** The Luna model and settings; `defaultLunaConfiguration` unless given. */
	readonly lunaConfiguration?: LunaConfiguration;
	/**
	 * The model calls one build keeps in flight, jev and Luna together;
	 * 16 by default. A call holds its permit for its transport only.
	 */
	readonly requestBudget?: number;
	/**
	 * Receives each operation's trace once the operation exits: `TraceSink`.
	 * Left out, the Layer sets none, so a sink provided around it applies.
	 */
	readonly onOperation?: (trace: OperationTrace) => void;
	/**
	 * Keeps every call's request and answer in its trace: `TracePayloads`,
	 * off by default. Left out, the Layer sets none, as for `onOperation`.
	 */
	readonly tracePayloads?: boolean;
	/** The jev version every request names; a floating alias is refused. */
	readonly jevModel?: string;
	/** The German Authored Inventories the unit stage reads; dumcorpus's by default. */
	readonly inventory?: GermanInventory;
};

/** `DumgenLive`'s options without its budget, which `DumgenCore` reads from its context. */
type DumgenCoreOptions = Omit<DumgenOptions, "requestBudget">;

/** `Jev` and `Luna` over the host's transports, on the `RequestBudget` its context holds. */
export function DumgenCore(
	options: DumgenCoreOptions,
): Layer.Layer<Jev | Luna, never, RequestBudget> {
	const settings = Layer.mergeAll(
		Layer.succeed(JevModel, options.jevModel ?? pinnedJevModel),
		Layer.succeed(
			LunaConfiguration,
			options.lunaConfiguration ?? defaultLunaConfiguration,
		),
		Layer.succeed(Languages, languageModules(options)),
		options.tracePayloads === undefined
			? Layer.empty
			: Layer.succeed(TracePayloads, options.tracePayloads),
		options.onOperation === undefined
			? Layer.empty
			: Layer.succeed(TraceSink, options.onOperation),
	);
	return Layer.mergeAll(Jev.layer, Luna.layer).pipe(
		Layer.provide(Layer.mergeAll(options.jev, options.luna)),
		Layer.provideMerge(settings),
	);
}

/** `DumgenCore` on a fresh budget of `requestBudget`, 16 by default. */
export function DumgenLive(options: DumgenOptions): Layer.Layer<Jev | Luna> {
	return DumgenCore(options).pipe(
		Layer.provide(RequestBudget.layer(options.requestBudget ?? 16)),
	);
}
