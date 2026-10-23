/**
 * What `knowledge.produce` takes and returns (#883). It runs once a click's
 * Reading has resolved: the Reading, the occurrence's Attestation and its
 * Sentence come in, with `origin` saying whether this occurrence created
 * the Reading (`New`) or reused a stored one (`TopUp`), and `request`, the
 * aspects tf-demo's coverage says the stored Reading still lacks, and
 * `paradigm`, the Variation Dimensions to write. Out come Knowledge changes,
 * Paradigm Changes, Pending Semantic Relations and per-aspect failures.
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

/** The aspects `knowledge.produce` fills, in Dumrel's names. */
export type KnowledgeAspect =
	| "transcription"
	| "definition"
	| "translations"
	| "semanticRelations"
	| "valency"
	| "source"
	| "locutionType"
	| "sayingType"
	| "formulaRole";

/**
 * One aspect, or one leaf of it (a translation language, a relation), or one
 * Variation Dimension, that produced nothing usable (#883 point 3). A later
 * click asks for it again; nothing is retried.
 *
 * - `ProviderFailure`: a call brought no answer.
 * - `InvalidModelOutput`: an answer Dumgen or Dumrel cannot use.
 * - `Unresolved`: the judges or the writer left the aspect undecided, or
 *   the occurrence attests government Knowledge cannot hold.
 * - `CatalogMiss`: a Closed Route, or an exact authored Reading, lacks the
 *   reviewed value (ADR 0021); tf-demo attaches authored Knowledge itself.
 */
export type KnowledgeFailure = {
	readonly aspect: KnowledgeAspect | Dumrel.DimensionId;
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
	/**
	 * The Paradigm Changes of the requested dimensions (ADR 0048), in
	 * dimension order: per dimension a Contribute per new variant, then a
	 * License that gives the Reading an explicit Licence over the variants
	 * it takes, stored or new.
	 */
	readonly paradigmChanges: readonly Dumrel.ParadigmChange[];
	readonly pendingRelations: readonly GermanPendingRelation[];
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
	 * The aspects to produce. An aspect the Reading's route does not apply
	 * is skipped (Dumgen ADR 0003).
	 */
	readonly request: Dumrel.KnowledgeRequestMask;
	/**
	 * The Variation Dimensions of the Reading's Lemma Paradigm to write
	 * (ADR 0048, Dumgen ADR 0003), with the Lemma's stored Paradigm and its
	 * other Readings. A dimension the route's Paradigm Policy doesn't name
	 * is skipped.
	 *
	 * - A dimension with no stored variant is written as for a Lemma's
	 *   first Reading: Luna writes the forms of the sense, and code turns
	 *   each into a variant the Reading licenses explicitly.
	 * - A dimension with stored variants, for a `New` Reading: Luna writes
	 *   its forms first, without seeing the stored ones. Forms that are the
	 *   stored variants exactly license them. Otherwise the licence judge,
	 *   one jev request for every such dimension, sees the stored and new
	 *   forms together and picks the ones the sense takes; the Reading
	 *   licenses those, and each new one becomes a variant.
	 * - A dimension with stored variants, for a `TopUp` Reading or one the
	 *   stored Paradigm already licenses, is skipped: its Licence, stated or
	 *   Unstated, stays as it is.
	 *
	 * Only this Reading is licensed; the Paradigm Changes apply to `stored`
	 * with `readings` and this Reading.
	 */
	readonly paradigm?: {
		readonly dimensions: readonly Dumrel.DimensionId[];
		/**
		 * The Lemma's stored Paradigm, as Dumdict's Lemma Record holds it;
		 * none, or an empty one, for a Lemma's first Reading.
		 */
		readonly stored?: Dumrel.LemmaParadigm;
		/**
		 * The Lemma's other Readings, every Reading `stored`'s Licences name
		 * among them; this Reading may be listed too.
		 */
		readonly readings?: readonly Dumling.Reading<"de">[];
	};
	readonly onContribution?: (
		changes: readonly GermanKnowledgeChange[],
	) => Effect.Effect<void, E>;
};

/**
 * What `knowledge.accumulateTranslations` takes (ADR 0047): a click's
 * occurrence of a Reading that already has translations, and those
 * translations. Only a language given a non-empty set is checked; a
 * language with none is Knowledge Production's to fill.
 */
export type AccumulateTranslationsInput = {
	readonly language: "de";
	/** The Reading the click resolved to, stored or authored. */
	readonly reading: Dumling.Reading<"de">;
	/** The occurrence's Attestation, of the Reading's Lemma. */
	readonly attestation: Dumling.Attestation<"de">;
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
export type TranslationAccumulation = {
	readonly changes: readonly GermanKnowledgeChange[];
	readonly failures: readonly KnowledgeFailure[];
};
