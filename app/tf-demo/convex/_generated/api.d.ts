/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analysisStripping from "../analysisStripping.js";
import type * as catalogGrowthSignals from "../catalogGrowthSignals.js";
import type * as crons from "../crons.js";
import type * as definitionTextActions from "../definitionTextActions.js";
import type * as definitionTexts from "../definitionTexts.js";
import type * as demoReset from "../demoReset.js";
import type * as deploymentFlags from "../deploymentFlags.js";
import type * as dumdictStorage_contextRequest from "../dumdictStorage/contextRequest.js";
import type * as dumdictStorage_dictionaryPlan from "../dumdictStorage/dictionaryPlan.js";
import type * as dumdictStorage_queries from "../dumdictStorage/queries.js";
import type * as dumdictStorage_storage from "../dumdictStorage/storage.js";
import type * as dumdictStorage_transaction from "../dumdictStorage/transaction.js";
import type * as folioProcessing from "../folioProcessing.js";
import type * as folios from "../folios.js";
import type * as intakeRuns from "../intakeRuns.js";
import type * as knowledgeGeneration from "../knowledgeGeneration.js";
import type * as knowledgeGenerationActions from "../knowledgeGenerationActions.js";
import type * as knowledgeSettings from "../knowledgeSettings.js";
import type * as library from "../library.js";
import type * as libraryFixtures from "../libraryFixtures.js";
import type * as model_clickOrchestrator from "../model/clickOrchestrator.js";
import type * as model_codex from "../model/codex.js";
import type * as model_definitionTexts from "../model/definitionTexts.js";
import type * as model_deploymentDumgen from "../model/deploymentDumgen.js";
import type * as model_dumdictPendingIndexes from "../model/dumdictPendingIndexes.js";
import type * as model_dumdictTransaction from "../model/dumdictTransaction.js";
import type * as model_folios from "../model/folios.js";
import type * as model_generatedKnowledgeContainment from "../model/generatedKnowledgeContainment.js";
import type * as model_grammarCheckpoint from "../model/grammarCheckpoint.js";
import type * as model_inspection from "../model/inspection.js";
import type * as model_inspectionAction from "../model/inspectionAction.js";
import type * as model_intakeRuns from "../model/intakeRuns.js";
import type * as model_knowledgeAttempts from "../model/knowledgeAttempts.js";
import type * as model_knowledgeCoverage from "../model/knowledgeCoverage.js";
import type * as model_knowledgeProductionRuns from "../model/knowledgeProductionRuns.js";
import type * as model_knowledgeScheduling from "../model/knowledgeScheduling.js";
import type * as model_occurrenceAttestations from "../model/occurrenceAttestations.js";
import type * as model_occurrenceCommit from "../model/occurrenceCommit.js";
import type * as model_ownedRowCleanup from "../model/ownedRowCleanup.js";
import type * as model_presentedDumling from "../model/presentedDumling.js";
import type * as model_readingKnowledge from "../model/readingKnowledge.js";
import type * as model_relationPublicationChunks from "../model/relationPublicationChunks.js";
import type * as model_resolutionLookup from "../model/resolutionLookup.js";
import type * as model_resolutionSessionLifecycle from "../model/resolutionSessionLifecycle.js";
import type * as model_resolutionSessions from "../model/resolutionSessions.js";
import type * as model_resolvedClickCommit from "../model/resolvedClickCommit.js";
import type * as model_resolvedClickDictionary from "../model/resolvedClickDictionary.js";
import type * as model_scrollAnalysis from "../model/scrollAnalysis.js";
import type * as model_scrollAnalysisStripping from "../model/scrollAnalysisStripping.js";
import type * as model_shadows from "../model/shadows.js";
import type * as model_storedSegments from "../model/storedSegments.js";
import type * as model_tables_dictionary from "../model/tables/dictionary.js";
import type * as model_tables_inspection from "../model/tables/inspection.js";
import type * as model_tables_knowledge from "../model/tables/knowledge.js";
import type * as model_tables_relationPublication from "../model/tables/relationPublication.js";
import type * as model_tables_resolution from "../model/tables/resolution.js";
import type * as model_tables_scrolls from "../model/tables/scrolls.js";
import type * as model_tables_visitors from "../model/tables/visitors.js";
import type * as model_validators from "../model/validators.js";
import type * as model_visitorEncounters from "../model/visitorEncounters.js";
import type * as modules_notes_featurePresentation from "../modules/notes/featurePresentation.js";
import type * as modules_notes_pendingRelations from "../modules/notes/pendingRelations.js";
import type * as modules_notes_projections from "../modules/notes/projections.js";
import type * as modules_notes_readingKnowledgeValidator from "../modules/notes/readingKnowledgeValidator.js";
import type * as modules_notes_readingNote from "../modules/notes/readingNote.js";
import type * as modules_notes_relationNeighborhood from "../modules/notes/relationNeighborhood.js";
import type * as modules_notes_relations from "../modules/notes/relations.js";
import type * as modules_notes_resolutionNote from "../modules/notes/resolutionNote.js";
import type * as modules_notes_routeNotes from "../modules/notes/routeNotes.js";
import type * as modules_notes_shadowNote from "../modules/notes/shadowNote.js";
import type * as modules_notes_sourceContext from "../modules/notes/sourceContext.js";
import type * as modules_notes_unitReadingFamilies from "../modules/notes/unitReadingFamilies.js";
import type * as modules_scroll_resegmentation from "../modules/scroll/resegmentation.js";
import type * as modules_scroll_sentenceView from "../modules/scroll/sentenceView.js";
import type * as modules_scroll_submission from "../modules/scroll/submission.js";
import type * as orchestration from "../orchestration.js";
import type * as persistence from "../persistence.js";
import type * as personalAnnotations from "../personalAnnotations.js";
import type * as rateLimits from "../rateLimits.js";
import type * as readingBlockLayouts from "../readingBlockLayouts.js";
import type * as readingNotes from "../readingNotes.js";
import type * as relationPublication from "../relationPublication.js";
import type * as resolutionContext from "../resolutionContext.js";
import type * as resolutionInspection from "../resolutionInspection.js";
import type * as resolutionSessions from "../resolutionSessions.js";
import type * as reviewedNavigation from "../reviewedNavigation.js";
import type * as routeNotes from "../routeNotes.js";
import type * as scrollViews from "../scrollViews.js";
import type * as shadowNotes from "../shadowNotes.js";
import type * as shadowResolution from "../shadowResolution.js";
import type * as shadows from "../shadows.js";
import type * as textFileIntake from "../textFileIntake.js";
import type * as textFiles from "../textFiles.js";
import type * as visitorEncounters from "../visitorEncounters.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analysisStripping: typeof analysisStripping;
  catalogGrowthSignals: typeof catalogGrowthSignals;
  crons: typeof crons;
  definitionTextActions: typeof definitionTextActions;
  definitionTexts: typeof definitionTexts;
  demoReset: typeof demoReset;
  deploymentFlags: typeof deploymentFlags;
  "dumdictStorage/contextRequest": typeof dumdictStorage_contextRequest;
  "dumdictStorage/dictionaryPlan": typeof dumdictStorage_dictionaryPlan;
  "dumdictStorage/queries": typeof dumdictStorage_queries;
  "dumdictStorage/storage": typeof dumdictStorage_storage;
  "dumdictStorage/transaction": typeof dumdictStorage_transaction;
  folioProcessing: typeof folioProcessing;
  folios: typeof folios;
  intakeRuns: typeof intakeRuns;
  knowledgeGeneration: typeof knowledgeGeneration;
  knowledgeGenerationActions: typeof knowledgeGenerationActions;
  knowledgeSettings: typeof knowledgeSettings;
  library: typeof library;
  libraryFixtures: typeof libraryFixtures;
  "model/clickOrchestrator": typeof model_clickOrchestrator;
  "model/codex": typeof model_codex;
  "model/definitionTexts": typeof model_definitionTexts;
  "model/deploymentDumgen": typeof model_deploymentDumgen;
  "model/dumdictPendingIndexes": typeof model_dumdictPendingIndexes;
  "model/dumdictTransaction": typeof model_dumdictTransaction;
  "model/folios": typeof model_folios;
  "model/generatedKnowledgeContainment": typeof model_generatedKnowledgeContainment;
  "model/grammarCheckpoint": typeof model_grammarCheckpoint;
  "model/inspection": typeof model_inspection;
  "model/inspectionAction": typeof model_inspectionAction;
  "model/intakeRuns": typeof model_intakeRuns;
  "model/knowledgeAttempts": typeof model_knowledgeAttempts;
  "model/knowledgeCoverage": typeof model_knowledgeCoverage;
  "model/knowledgeProductionRuns": typeof model_knowledgeProductionRuns;
  "model/knowledgeScheduling": typeof model_knowledgeScheduling;
  "model/occurrenceAttestations": typeof model_occurrenceAttestations;
  "model/occurrenceCommit": typeof model_occurrenceCommit;
  "model/ownedRowCleanup": typeof model_ownedRowCleanup;
  "model/presentedDumling": typeof model_presentedDumling;
  "model/readingKnowledge": typeof model_readingKnowledge;
  "model/relationPublicationChunks": typeof model_relationPublicationChunks;
  "model/resolutionLookup": typeof model_resolutionLookup;
  "model/resolutionSessionLifecycle": typeof model_resolutionSessionLifecycle;
  "model/resolutionSessions": typeof model_resolutionSessions;
  "model/resolvedClickCommit": typeof model_resolvedClickCommit;
  "model/resolvedClickDictionary": typeof model_resolvedClickDictionary;
  "model/scrollAnalysis": typeof model_scrollAnalysis;
  "model/scrollAnalysisStripping": typeof model_scrollAnalysisStripping;
  "model/shadows": typeof model_shadows;
  "model/storedSegments": typeof model_storedSegments;
  "model/tables/dictionary": typeof model_tables_dictionary;
  "model/tables/inspection": typeof model_tables_inspection;
  "model/tables/knowledge": typeof model_tables_knowledge;
  "model/tables/relationPublication": typeof model_tables_relationPublication;
  "model/tables/resolution": typeof model_tables_resolution;
  "model/tables/scrolls": typeof model_tables_scrolls;
  "model/tables/visitors": typeof model_tables_visitors;
  "model/validators": typeof model_validators;
  "model/visitorEncounters": typeof model_visitorEncounters;
  "modules/notes/featurePresentation": typeof modules_notes_featurePresentation;
  "modules/notes/pendingRelations": typeof modules_notes_pendingRelations;
  "modules/notes/projections": typeof modules_notes_projections;
  "modules/notes/readingKnowledgeValidator": typeof modules_notes_readingKnowledgeValidator;
  "modules/notes/readingNote": typeof modules_notes_readingNote;
  "modules/notes/relationNeighborhood": typeof modules_notes_relationNeighborhood;
  "modules/notes/relations": typeof modules_notes_relations;
  "modules/notes/resolutionNote": typeof modules_notes_resolutionNote;
  "modules/notes/routeNotes": typeof modules_notes_routeNotes;
  "modules/notes/shadowNote": typeof modules_notes_shadowNote;
  "modules/notes/sourceContext": typeof modules_notes_sourceContext;
  "modules/notes/unitReadingFamilies": typeof modules_notes_unitReadingFamilies;
  "modules/scroll/resegmentation": typeof modules_scroll_resegmentation;
  "modules/scroll/sentenceView": typeof modules_scroll_sentenceView;
  "modules/scroll/submission": typeof modules_scroll_submission;
  orchestration: typeof orchestration;
  persistence: typeof persistence;
  personalAnnotations: typeof personalAnnotations;
  rateLimits: typeof rateLimits;
  readingBlockLayouts: typeof readingBlockLayouts;
  readingNotes: typeof readingNotes;
  relationPublication: typeof relationPublication;
  resolutionContext: typeof resolutionContext;
  resolutionInspection: typeof resolutionInspection;
  resolutionSessions: typeof resolutionSessions;
  reviewedNavigation: typeof reviewedNavigation;
  routeNotes: typeof routeNotes;
  scrollViews: typeof scrollViews;
  shadowNotes: typeof shadowNotes;
  shadowResolution: typeof shadowResolution;
  shadows: typeof shadows;
  textFileIntake: typeof textFileIntake;
  textFiles: typeof textFiles;
  visitorEncounters: typeof visitorEncounters;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
