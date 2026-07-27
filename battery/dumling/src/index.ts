import {
	dumling as operationsDumling,
	getLanguageApi as operationsGetLanguageApi,
	supportedLanguages as operationsSupportedLanguages,
} from "./operations/index.js";

export type * from "./types.js";

export const dumling: typeof operationsDumling = operationsDumling;
export const getLanguageApi: typeof operationsGetLanguageApi =
	operationsGetLanguageApi;
export const supportedLanguages: typeof operationsSupportedLanguages =
	operationsSupportedLanguages;
