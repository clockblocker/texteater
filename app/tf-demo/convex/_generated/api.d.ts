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
import type * as model_linguisticKeys from "../model/linguisticKeys.js";
import type * as model_validators from "../model/validators.js";
import type * as orchestration from "../orchestration.js";
import type * as persistence from "../persistence.js";
import type * as presentation from "../presentation.js";
import type * as texts from "../texts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  demoReset: typeof demoReset;
  dumdictStorage: typeof dumdictStorage;
  "model/linguisticKeys": typeof model_linguisticKeys;
  "model/validators": typeof model_validators;
  orchestration: typeof orchestration;
  persistence: typeof persistence;
  presentation: typeof presentation;
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
