import {
	dumling as operationsDumling,
	getLanguageApi as operationsGetLanguageApi,
	supportedLanguages as operationsSupportedLanguages,
} from "./operations/index.js";
import { readingFingerprint as operationsReadingFingerprint } from "./operations/reading-fingerprint.js";

export type * from "./types.js";

export const dumling: typeof operationsDumling = operationsDumling;
export const getLanguageApi: typeof operationsGetLanguageApi =
	operationsGetLanguageApi;
export const supportedLanguages: typeof operationsSupportedLanguages =
	operationsSupportedLanguages;
export const readingFingerprint: typeof operationsReadingFingerprint =
	operationsReadingFingerprint;
