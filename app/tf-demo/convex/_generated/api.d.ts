/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as demoReset from "../demoReset.js";
import type * as dumdictStorage from "../dumdictStorage.js";
import type * as knowledgeGeneration from "../knowledgeGeneration.js";
import type * as knowledgeGenerationActions from "../knowledgeGenerationActions.js";
import type * as knowledgeSettings from "../knowledgeSettings.js";
import type * as model_compiledRelationVerdict from "../model/compiledRelationVerdict.js";
import type * as model_generatedKnowledgeContainment from "../model/generatedKnowledgeContainment.js";
import type * as model_occurrenceAttestations from "../model/occurrenceAttestations.js";
import type * as model_resolutionSessions from "../model/resolutionSessions.js";
import type * as model_shadows from "../model/shadows.js";
import type * as model_validators from "../model/validators.js";
import type * as model_visitorClicks from "../model/visitorClicks.js";
import type * as modules_knowledge_changes from "../modules/knowledge/changes.js";
import type * as modules_notes_featurePresentation from "../modules/notes/featurePresentation.js";
import type * as modules_notes_projections from "../modules/notes/projections.js";
import type * as modules_notes_routeNotes from "../modules/notes/routeNotes.js";
import type * as modules_text_submission from "../modules/text/submission.js";
import type * as orchestration from "../orchestration.js";
import type * as persistence from "../persistence.js";
import type * as presentation from "../presentation.js";
import type * as relationPublication from "../relationPublication.js";
import type * as resolutionSessions from "../resolutionSessions.js";
import type * as shadowResolution from "../shadowResolution.js";
import type * as shadows from "../shadows.js";
import type * as texts from "../texts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  demoReset: typeof demoReset;
  dumdictStorage: typeof dumdictStorage;
  knowledgeGeneration: typeof knowledgeGeneration;
  knowledgeGenerationActions: typeof knowledgeGenerationActions;
  knowledgeSettings: typeof knowledgeSettings;
  "model/compiledRelationVerdict": typeof model_compiledRelationVerdict;
  "model/generatedKnowledgeContainment": typeof model_generatedKnowledgeContainment;
  "model/occurrenceAttestations": typeof model_occurrenceAttestations;
  "model/resolutionSessions": typeof model_resolutionSessions;
  "model/shadows": typeof model_shadows;
  "model/validators": typeof model_validators;
  "model/visitorClicks": typeof model_visitorClicks;
  "modules/knowledge/changes": typeof modules_knowledge_changes;
  "modules/notes/featurePresentation": typeof modules_notes_featurePresentation;
  "modules/notes/projections": typeof modules_notes_projections;
  "modules/notes/routeNotes": typeof modules_notes_routeNotes;
  "modules/text/submission": typeof modules_text_submission;
  orchestration: typeof orchestration;
  persistence: typeof persistence;
  presentation: typeof presentation;
  relationPublication: typeof relationPublication;
  resolutionSessions: typeof resolutionSessions;
  shadowResolution: typeof shadowResolution;
  shadows: typeof shadows;
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
