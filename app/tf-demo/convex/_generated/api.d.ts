/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as catalogGrowthSignals from "../catalogGrowthSignals.js";
import type * as demoReset from "../demoReset.js";
import type * as dumdictStorage from "../dumdictStorage.js";
import type * as fixedMemberPersistence from "../fixedMemberPersistence.js";
import type * as fixedMembers from "../fixedMembers.js";
import type * as knowledgeGeneration from "../knowledgeGeneration.js";
import type * as knowledgeGenerationActions from "../knowledgeGenerationActions.js";
import type * as knowledgeSettings from "../knowledgeSettings.js";
import type * as model_canonicalJson from "../model/canonicalJson.js";
import type * as model_compiledRelationVerdict from "../model/compiledRelationVerdict.js";
import type * as model_dumdictPendingIndexes from "../model/dumdictPendingIndexes.js";
import type * as model_generatedKnowledgeContainment from "../model/generatedKnowledgeContainment.js";
import type * as model_occurrenceAttestations from "../model/occurrenceAttestations.js";
import type * as model_presentedDumling from "../model/presentedDumling.js";
import type * as model_resolutionSessions from "../model/resolutionSessions.js";
import type * as model_shadows from "../model/shadows.js";
import type * as model_validators from "../model/validators.js";
import type * as model_visitorClicks from "../model/visitorClicks.js";
import type * as modules_knowledge_changes from "../modules/knowledge/changes.js";
import type * as modules_notes_featurePresentation from "../modules/notes/featurePresentation.js";
import type * as modules_notes_pendingRelations from "../modules/notes/pendingRelations.js";
import type * as modules_notes_projections from "../modules/notes/projections.js";
import type * as modules_notes_readingNote from "../modules/notes/readingNote.js";
import type * as modules_notes_relations from "../modules/notes/relations.js";
import type * as modules_notes_routeNotes from "../modules/notes/routeNotes.js";
import type * as modules_notes_shadowNote from "../modules/notes/shadowNote.js";
import type * as modules_notes_unitReadingFamilies from "../modules/notes/unitReadingFamilies.js";
import type * as modules_text_submission from "../modules/text/submission.js";
import type * as orchestration from "../orchestration.js";
import type * as persistence from "../persistence.js";
import type * as pronounFixedPopulationMigration from "../pronounFixedPopulationMigration.js";
import type * as readingNotes from "../readingNotes.js";
import type * as relationPublication from "../relationPublication.js";
import type * as resolutionSessions from "../resolutionSessions.js";
import type * as routeNotes from "../routeNotes.js";
import type * as shadowNotes from "../shadowNotes.js";
import type * as shadowResolution from "../shadowResolution.js";
import type * as shadows from "../shadows.js";
import type * as textViews from "../textViews.js";
import type * as texts from "../texts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  catalogGrowthSignals: typeof catalogGrowthSignals;
  demoReset: typeof demoReset;
  dumdictStorage: typeof dumdictStorage;
  fixedMemberPersistence: typeof fixedMemberPersistence;
  fixedMembers: typeof fixedMembers;
  knowledgeGeneration: typeof knowledgeGeneration;
  knowledgeGenerationActions: typeof knowledgeGenerationActions;
  knowledgeSettings: typeof knowledgeSettings;
  "model/canonicalJson": typeof model_canonicalJson;
  "model/compiledRelationVerdict": typeof model_compiledRelationVerdict;
  "model/dumdictPendingIndexes": typeof model_dumdictPendingIndexes;
  "model/generatedKnowledgeContainment": typeof model_generatedKnowledgeContainment;
  "model/occurrenceAttestations": typeof model_occurrenceAttestations;
  "model/presentedDumling": typeof model_presentedDumling;
  "model/resolutionSessions": typeof model_resolutionSessions;
  "model/shadows": typeof model_shadows;
  "model/validators": typeof model_validators;
  "model/visitorClicks": typeof model_visitorClicks;
  "modules/knowledge/changes": typeof modules_knowledge_changes;
  "modules/notes/featurePresentation": typeof modules_notes_featurePresentation;
  "modules/notes/pendingRelations": typeof modules_notes_pendingRelations;
  "modules/notes/projections": typeof modules_notes_projections;
  "modules/notes/readingNote": typeof modules_notes_readingNote;
  "modules/notes/relations": typeof modules_notes_relations;
  "modules/notes/routeNotes": typeof modules_notes_routeNotes;
  "modules/notes/shadowNote": typeof modules_notes_shadowNote;
  "modules/notes/unitReadingFamilies": typeof modules_notes_unitReadingFamilies;
  "modules/text/submission": typeof modules_text_submission;
  orchestration: typeof orchestration;
  persistence: typeof persistence;
  pronounFixedPopulationMigration: typeof pronounFixedPopulationMigration;
  readingNotes: typeof readingNotes;
  relationPublication: typeof relationPublication;
  resolutionSessions: typeof resolutionSessions;
  routeNotes: typeof routeNotes;
  shadowNotes: typeof shadowNotes;
  shadowResolution: typeof shadowResolution;
  shadows: typeof shadows;
  textViews: typeof textViews;
  texts: typeof texts;
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

export declare const components: {};
