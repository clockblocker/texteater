import { defineTable } from "convex/server";
import { v } from "convex/values";
import { intakeRunValidator } from "../intakeRuns";
import {
	codexPlacementValidator,
	definitionTextStateValidator,
	detectedLanguageValidator,
	fusionValidator,
	orthographyValidator,
	scrollOriginValidator,
	segmentResolutionStateValidator,
	storedSegmentValidator,
	storedUnitValidator,
} from "../validators";

/** A requested Folio's processing: running, done, or failed until asked again. */
const folioStateValidator = v.union(
	v.literal("Processing"),
	v.literal("Processed"),
	v.literal("Failed"),
);

/**
 * The Library and its text: intake runs, Sections, Scrolls, hidden Definition
 * Texts, Sentences and Segments.
 */
export const scrollTables = {
	intakeRuns: defineTable(intakeRunValidator)
		.index("by_run_id", ["runId"])
		.index("by_submission_key", ["submissionKey"]),

	/**
	 * A Section: a container, at any depth, of Sections and Scrolls (#1189).
	 * Its Codex is the Sections and Scrolls placed in it, in order. Status
	 * lives on its Scrolls. Write Sections and place Scrolls through
	 * `model/codex.ts`, which keeps `scrollCount` true.
	 */
	sections: defineTable({
		title: v.string(),
		placement: v.optional(codexPlacementValidator),
		/**
		 * The Scrolls anywhere under it. A Section is done for a Visitor once
		 * that many are, so its status never walks the tree (#1192).
		 */
		scrollCount: v.number(),
		/** The Submission it came from; `e2e:` marks a fixture the Library shelves apart. */
		submissionKey: v.optional(v.string()),
		/** The submitted file, kept as the Original (#1191); on a top Section only. */
		originalId: v.optional(v.id("_storage")),
	})
		.index("by_placement", ["placement.sectionId", "placement.order"])
		.index("by_submission_key", ["submissionKey"]),

	scrolls: defineTable({
		title: v.optional(v.string()),
		submissionKey: v.string(),
		/** What was submitted: the pasted text, or the link a Scroll came from. */
		sourceText: v.string(),
		/**
		 * The Visitor whose private Scroll it is, listed and opened only for
		 * them: a Scroll from a link (#1196). Absent for a shared Scroll.
		 */
		owner: v.optional(v.string()),
		/**
		 * A Scroll from a link: the page's URL after redirects, the reader's
		 * way back to it, and the fetched page kept as its Original.
		 */
		link: v.optional(
			v.object({ url: v.string(), originalId: v.id("_storage") }),
		),
		/**
		 * The Scroll's Extracted Text, Dumgen's `Scroll` (checked with
		 * `parseScroll` when read): what intake re-runs from. Absent for a
		 * Definition Text.
		 */
		extractedText: v.optional(v.any()),
		/** Absent for a Visitor-submitted Scroll; set for a hidden Definition Text. */
		origin: v.optional(scrollOriginValidator),
		/** Absent for a loose Scroll, such as a one-off paste. */
		placement: v.optional(codexPlacementValidator),
		/**
		 * The paragraphs a Scene Break stands before, by Sentence
		 * `paragraph`, for the reader to draw (#1191).
		 */
		sceneBreaks: v.optional(v.array(v.number())),
	})
		.index("by_submission_key", ["submissionKey"])
		/**
		 * Visitor Scrolls are the range whose `origin.kind` is absent, and
		 * loose ones, the Library's, are those with no `placement` either;
		 * a Visitor's Library adds their own private ones to the shared.
		 */
		.index("by_origin_kind_and_placement_and_owner", [
			"origin.kind",
			"placement.sectionId",
			"owner",
		])
		.index("by_placement", ["placement.sectionId", "placement.order"]),

	/**
	 * A Folio of a book's Scroll (#1193): the Sentences from position
	 * `start` up to `end`. Intake processes a Folio only when a Learner
	 * asks for it (#1216); until then it reads as plain text. Only a
	 * book's Scrolls have Folios; a paste is processed whole.
	 */
	folios: defineTable({
		scrollId: v.id("scrolls"),
		start: v.number(),
		end: v.number(),
		/** Absent until a Learner asks for the Folio. */
		state: v.optional(folioStateValidator),
		/** The latest request's run; an earlier run changes nothing. */
		run: v.optional(v.number()),
		/** When the run last checked in, for the watchdog. */
		updatedAt: v.optional(v.number()),
	}).index("by_scroll_id_and_start", ["scrollId", "start"]),

	/**
	 * One row per Reading whose Knowledge definition is being turned into a
	 * hidden Definition Text. It is the single live Definition Text pointer and
	 * the source of the Definition block's loading state.
	 */
	definitionTexts: defineTable({
		ownerReadingKey: v.string(),
		/** The definition Knowledge currently asks for; absent once Retracted. */
		definition: v.optional(v.string()),
		/** The definition the live Definition Text was segmented from. */
		materializedDefinition: v.optional(v.string()),
		state: definitionTextStateValidator,
		/** The last materialization run claimed; a late run cannot settle a newer one. */
		runNumber: v.optional(v.number()),
		/** Runs in a row the watchdog found dead; cleared when a run settles. */
		interruptedRuns: v.optional(v.number()),
		scrollId: v.optional(v.id("scrolls")),
		sentenceId: v.optional(v.id("sentences")),
		failureMessage: v.optional(v.string()),
		updatedAt: v.number(),
	}).index("by_owner_reading_key", ["ownerReadingKey"]),

	sentences: defineTable({
		heading: v.optional(v.string()),
		segmentedSentenceId: v.string(),
		scrollId: v.id("scrolls"),
		position: v.number(),
		/**
		 * Sentences sharing a paragraph run together in the reader. Absent for
		 * Sentences stored before paragraphs were kept; each reads alone.
		 */
		paragraph: v.optional(v.number()),
		/**
		 * The Detected Language, absent when undetermined. Any but the Scroll's
		 * target language makes it a Plain Sentence: no Segments, no units.
		 */
		language: v.optional(detectedLanguageValidator),
		/** The Sentence's normalized text; its Segments concatenate to it. */
		stitchedText: v.string(),
		/**
		 * The Sentence's biggest units, as intake's `segment.inUnits` gave
		 * them: Segments by index, each unit's route or Unresolved, and its
		 * route variants. Analysis Stripping removes them with the Segments.
		 */
		units: v.optional(v.array(storedUnitValidator)),
		/**
		 * Present when intake's `segment.inUnits` failed for the Sentence:
		 * it stores no units, and the reader shows it as not segmented.
		 */
		segmentationFailed: v.optional(v.literal(true)),
	})
		.index("by_segmented_sentence_id", ["segmentedSentenceId"])
		.index("by_scroll_id_and_position", ["scrollId", "position"]),

	segments: defineTable({
		sentenceId: v.id("sentences"),
		...storedSegmentValidator.fields,
		resolutionState: v.optional(segmentResolutionStateValidator),
		/**
		 * The member this Segment realizes. A `Fused` member also stores its
		 * Fusion and the component it realizes (ADR 0035).
		 */
		attestationMembership: v.optional(
			v.object({
				attestationId: v.id("attestations"),
				orthography: orthographyValidator,
				fusion: v.optional(fusionValidator),
				component: v.optional(v.number()),
			}),
		),
	})
		.index("by_sentence_id_and_index", ["sentenceId", "index"])
		.index("by_attestation_id", ["attestationMembership.attestationId"]),
};
