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
import type { Segment } from "../segment/segmented-sentence.js";

/**
 * Whether the occurrence created the Reading (`New`) or reused a stored
 * one (`TopUp`). Only a `New` occurrence's attested government joins the
 * proposed frame (#677).
 */
export type KnowledgeOrigin = "New" | "TopUp";

/** The producible aspects in Dumrel's schema; Morphological Tree stays deferred. */
export type KnowledgeAspect =
	| Exclude<keyof Dumrel.KnowledgeRequestMask, "morphologicalTree">
	| "plural"
	| "conjugationClass"
	| "preterite"
	| "presentSingular"
	| "pastParticiple"
	| "subjunctivePast";

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

/** A Knowledge change on the specified language's Reading, as Dumrel checks it. */
export type KnowledgeChange<L extends Dumling.Language = "de"> =
	Dumrel.KnowledgeChange<Dumling.Reading<L>>;
export type GermanKnowledgeChange = KnowledgeChange<"de">;

/** A Semantic Relation to a same-language Unit Shadow tf-demo resolves later. */
export type PendingRelation<L extends Dumling.Language = "de"> =
	Dumrel.PendingSemanticRelation & {
		readonly target: { readonly language: L };
	};
export type GermanPendingRelation = PendingRelation<"de">;

/** What one run produced, the shape tf-demo's port returns. */
export type KnowledgeProduction<L extends Dumling.Language = "de"> = {
	readonly changes: readonly KnowledgeChange<L>[];
	readonly pendingRelations: readonly PendingRelation<L>[];
	readonly failures: readonly KnowledgeFailure[];
};

/**
 * The occurrence's Sentence: its Segments as intake stored them, and the
 * Segments its Attestation's target covers, in order. Prompts mark the
 * target; the Sentence is evidence only (#623). With their kinds, a fused
 * word the target holds one piece of is marked written out (`an dem` for
 * `am`); Knowledge sets frozen without them keep the written word.
 */
export type KnowledgeSentence = {
	readonly segments: readonly {
		readonly kind?: Segment["kind"];
		readonly text: string;
	}[];
	readonly target: readonly number[];
};

export type ProduceKnowledgeInput<
	E = never,
	L extends Dumling.Language = "de",
> = {
	readonly language: L;
	/**
	 * The resolved Reading. Its Emoji Description is the sense boundary of
	 * every prompt (#623); a Foreign Reading has none (ADR 0045).
	 */
	readonly reading: Dumling.Reading<L>;
	/** The occurrence's Attestation, of the Reading's Lemma. */
	readonly attestation: Dumling.Attestation<L>;
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
		changes: readonly KnowledgeChange<L>[],
	) => Effect.Effect<void, E>;
};

/**
 * What `knowledge.accumulateTranslations` takes (ADR 0047): a click's
 * occurrence of a Reading that already has translations, and those
 * translations. Only a language given a non-empty set is checked; a
 * language with none is Knowledge Production's to fill.
 */
export type AccumulateTranslationsInput<L extends Dumling.Language = "de"> = {
	readonly language: L;
	/** The Reading the click resolved to, stored or authored. */
	readonly reading: Dumling.Reading<L>;
	/** The occurrence's Attestation, of the Reading's Lemma. */
	readonly attestation: Dumling.Attestation<L>;
	readonly sentence: KnowledgeSentence;
	/** The Reading's stored translations, by language, as the note holds them. */
	readonly translations: Readonly<
		Partial<Record<Dumrel.TranslationLanguage, readonly string[]>>
	>;
};

/**
 * What one accumulation brought: a Contribute per language that gained
 * translations, holding only the new ones, and a failure per language
 * whose call brought nothing usable, which adds nothing.
 */
export type TranslationAccumulation<L extends Dumling.Language = "de"> = {
	readonly changes: readonly KnowledgeChange<L>[];
	readonly failures: readonly KnowledgeFailure[];
};
