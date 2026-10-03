/**
 * What `knowledge.produce` takes and returns (#883). It runs once a click's
 * Reading has resolved: the Reading, the occurrence's Attestation and its
 * Sentence come in, with `origin` saying whether this occurrence created
 * the Reading (`New`) or reused a stored one (`TopUp`), and `request`, the
 * aspects tf-demo's coverage says the stored Reading still lacks. Out come
 * Knowledge changes, Pending Semantic Relations and per-aspect failures.
 *
 * Every failure is a value: a failed aspect leaves its siblings standing,
 * and the error channel carries only the `E` of the host's
 * `onContribution`. Bad input is a Defect.
 */
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import type * as Effect from "effect/Effect";

/**
 * Whether the occurrence created the Reading (`New`) or reused a stored
 * one (`TopUp`). Only a `New` occurrence's attested government joins the
 * proposed frame (#677).
 */
export type KnowledgeOrigin = "New" | "TopUp";

/** The aspects `knowledge.produce` fills, in Dumrel's names. */
export type KnowledgeAspect =
	| "transcription"
	| "definition"
	| "translations"
	| "semanticRelations"
	| "valency"
	| "participleSource"
	| "plural"
	| "conjugationClass"
	| "locutionType"
	| "sayingType"
	| "formulaRole";

/**
 * One aspect, or one leaf of it (a translation language, a relation), that
 * produced nothing usable (#883 point 3). A later click asks for it again;
 * nothing is retried.
 *
 * - `ProviderFailure`: a call brought no answer.
 * - `InvalidModelOutput`: an answer Dumgen or Dumrel cannot use.
 * - `Unresolved`: the judges or the writer left the aspect undecided, or
 *   the occurrence attests government Knowledge cannot hold.
 * - `CatalogMiss`: a Closed Route, or an exact authored Reading, lacks the
 *   reviewed value (ADR 0021); tf-demo attaches authored Knowledge itself.
 */
export type KnowledgeFailure = {
	readonly aspect: KnowledgeAspect;
	readonly leaf?: string;
	readonly code:
		| "ProviderFailure"
		| "InvalidModelOutput"
		| "Unresolved"
		| "CatalogMiss";
	readonly message: string;
};

/** A Knowledge change on a German Reading, as Dumrel checks it. */
export type GermanKnowledgeChange = Dumrel.KnowledgeChange<
	Dumling.Reading<"de">
>;

/** A Semantic Relation to a German Unit Shadow tf-demo resolves later. */
export type GermanPendingRelation = Dumrel.PendingSemanticRelation & {
	readonly target: { readonly language: "de" };
};

/** What one run produced, the shape tf-demo's port returns. */
export type KnowledgeProduction = {
	readonly changes: readonly GermanKnowledgeChange[];
	readonly pendingRelations: readonly GermanPendingRelation[];
	readonly failures: readonly KnowledgeFailure[];
};

/**
 * The occurrence's Sentence: its Segments as intake stored them, and the
 * Segments its Attestation's target covers, in order. Prompts mark the
 * target; the Sentence is evidence only (#623).
 */
export type KnowledgeSentence = {
	readonly segments: readonly { readonly text: string }[];
	readonly target: readonly number[];
};

export type ProduceKnowledgeInput<E = never> = {
	readonly language: "de";
	/**
	 * The resolved Reading. Its Emoji Description is the sense boundary of
	 * every prompt (#623); a Foreign Reading has none (ADR 0045).
	 */
	readonly reading: Dumling.Reading<"de">;
	/** The occurrence's Attestation, of the Reading's Lemma. */
	readonly attestation: Dumling.Attestation<"de">;
	readonly sentence: KnowledgeSentence;
	readonly origin: KnowledgeOrigin;
	/**
	 * The aspects to produce. An aspect the Reading's route does not apply,
	 * and the deferred `morphologicalTree`, are skipped (Dumgen ADR 0003).
	 */
	readonly request: Dumrel.KnowledgeRequestMask;
	/**
	 * Receives each aspect's changes as soon as it has them, one at a time
	 * and in the order the aspects finish; Dumgen waits for its Effect
	 * before it hands over the next. Its failure fails the run with `E` and
	 * interrupts the aspects still running.
	 */
	readonly onContribution?: (
		changes: readonly GermanKnowledgeChange[],
	) => Effect.Effect<void, E>;
};
