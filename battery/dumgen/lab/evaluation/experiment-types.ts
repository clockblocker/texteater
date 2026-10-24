/**
 * The types the evaluation table shares (`experiments.ts`): the arguments
 * every experiment's run takes, what it gives back, and one table entry.
 */
import type { JsonValue } from "@typesafe-ai/sdk";
import type { OperationEvaluationRun } from "promptsmith/evaluation";
import type { LunaAsk } from "../../src/luna.js";
import type { JevAsk } from "../../src/segment/jev.js";
import type { TransportRecord } from "../segmentation/harness/jev-cache.js";
import type { Spend } from "../segmentation/harness/ledger.js";
import type { PricedProjection } from "../segmentation/harness/round.js";
import type { LabRuntime } from "./lab-runtime.js";
import type { LunaBatch } from "./luna-batch.js";
import type { RequestRun } from "./request-diff.js";
import type {
	GrammarEvaluated,
	GrammarPrice,
} from "./resolve-grammar/experiment.js";
import type { GrammarCaps, LunaBatchEvent } from "./resolve-grammar/models.js";
import type { Splitter } from "./split-text.js";

/**
 * The unit stage a segment.inUnits experiment runs: production's, or the
 * #762 reference at its adopted floors, kept for comparison.
 */
export type UnitConfig = "production" | "reference";
export const unitConfigs: readonly UnitConfig[] = ["production", "reference"];

/** A run's case list: its ids in the set's order and the hash of the sorted ids. */
export type CaseList = { readonly hash: string; readonly ids: string[] };

export type EvaluateArgs = {
	readonly experimentId: string;
	/** A pinned jev version; the lab's by default. */
	readonly judgmentModel?: string;
	readonly offline?: boolean;
	readonly sourceRevision: string;
	readonly outputDirectory?: string;
	/** Interrupts the run: every attempt in flight, and its model calls. */
	readonly signal?: AbortSignal;
	/**
	 * The runtime the run's Effects run on, whose request budget all its
	 * attempts share (`lab-runtime.ts`); a fresh one for the run by default.
	 */
	readonly runtime?: LabRuntime;
	readonly units?: UnitConfig;
	/** Cases run at once while a live run fills the cache. */
	readonly concurrency?: number;
	/** The lab's answer cache; `.runs/segment-in-units-lab` by default. */
	readonly labRoot?: string;
	/** The lab's frozen sets; the tracked ones by default. */
	readonly setsRoot?: string;
	/** Price the run and stop: nothing is asked and no run is saved. */
	readonly estimate?: boolean;
	/** resolve.grammar, resolve.reading and knowledge.produce, with `estimate` only: price every request, cached ones included. */
	readonly wholeRound?: boolean;
	/** Receives a live run's price before anything is asked; throw to refuse. */
	readonly beforeLive?: (priced: PricedProjection) => void | Promise<void>;
	/** Called before every fresh request; throw to stop spending. */
	readonly beforeSpend?: () => void;
	/** Receives the input tokens of every fresh request. */
	readonly onSpend?: (inputTokens: number) => void;
	/** Recorded in the run manifest's settings, beside the experiment's own. */
	readonly settings?: Readonly<Record<string, JsonValue>>;
	/** Text mode's splitter; production's `splitText` by default. */
	readonly split?: Splitter;
	/**
	 * A live run's transports, asked on a cache miss: jev for every
	 * experiment that asks it, Luna for resolve.grammar, resolve.reading
	 * and knowledge.produce. segment.inUnits wraps jev in the lab's cache,
	 * which retries a rate limit or a server error (`lab/segmentation/harness/jev-cache.ts`).
	 */
	readonly jev?: JevAsk;
	readonly luna?: LunaAsk;
	/** resolve.grammar, resolve.reading and knowledge.produce: Luna's misses through the Batch API instead (#891). */
	readonly lunaBatch?: LunaBatch;
	/** Receives each Luna batch as it is sent and settled, for the port's ledger. */
	readonly onLunaBatch?: (event: LunaBatchEvent) => void | Promise<void>;
	/** Receives a live resolve.grammar, resolve.reading and knowledge.produce run's price before anything is asked; throw to refuse. */
	readonly beforeGrammarLive?: (price: GrammarPrice) => void | Promise<void>;
	/** The hard caps on fresh tokens of a live resolve.grammar, resolve.reading and knowledge.produce run. */
	readonly grammarCaps?: GrammarCaps;
	/** resolve.grammar, resolve.reading and knowledge.produce: only the first this many cases, for a smoke run. */
	readonly limit?: number;
	/**
	 * segment.inUnits: only these cases of the set run (`--cases`), such as
	 * those a request diff moved; the manifest names the list (`CaseList`).
	 */
	readonly caseIds?: readonly string[];
	/** resolve.grammar, resolve.reading and knowledge.produce: a frozen subset's file; only its cases run. */
	readonly grammarSubset?: string;
	/** knowledge.produce: only the cases with gold Knowledge. */
	readonly goldOnly?: boolean;
	/** resolve.grammar, resolve.reading and knowledge.produce: attempts per case, 1 to 3. */
	readonly repetitions?: number;
	/** resolve.grammar's answer cache. */
	readonly grammarRoot?: string;
	/** resolve.grammar's frozen sets; the tracked ones by default. */
	readonly grammarSetsRoot?: string;
	/** resolve.reading's answer cache. */
	readonly readingRoot?: string;
	/** resolve.reading's frozen sets; the tracked ones by default. */
	readonly readingSetsRoot?: string;
	/** knowledge.produce's answer cache. */
	readonly knowledgeRoot?: string;
	/** knowledge.produce's frozen sets; the tracked ones by default. */
	readonly knowledgeSetsRoot?: string;
};

export type Evaluated = {
	/** Absent when only estimated. */
	readonly run?: OperationEvaluationRun;
	readonly projection?: PricedProjection;
	/** The jev calls of the run, the cache fill included; none for text mode. */
	readonly spend?: Spend;
	/**
	 * segment.inUnits: what the fresh jev requests met, the cache fill
	 * included: retries and requests that still failed, by cause. Kept
	 * apart from the accuracy.
	 */
	readonly transport?: TransportRecord;
	readonly set?: { readonly name: string; readonly hash: string };
	/** segment.inUnits: the case list the run took, when it took one. */
	readonly caseList?: CaseList;
	/** resolve.grammar's projected spend. */
	readonly price?: GrammarPrice;
	/** resolve.grammar's spend, jev and Luna. */
	readonly grammarSpend?: GrammarEvaluated["spend"];
};

/** What a request run of an experiment holds, before it is named (`request-diff.ts`). */
export type BuiltRequests = Pick<RequestRun, "answers" | "cases">;

export type Experiment = {
	readonly id: string;
	readonly caseCount: () => number;
	readonly evaluate: (args: EvaluateArgs) => Promise<Evaluated>;
	readonly metrics: (run: OperationEvaluationRun) => unknown;
	/** Every case's requests, built offline; absent when the experiment has no request diff. */
	readonly requests?: (args: EvaluateArgs) => Promise<BuiltRequests>;
};
