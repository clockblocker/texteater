import {
	dumling as operationsDumling,
	getLanguageApi as operationsGetLanguageApi,
	supportedLanguages as operationsSupportedLanguages,
} from "./operations/index.js";
import { parseAs as presentationParseAs } from "./operations/presentation/parse-as.js";
import { toPresented as presentationToPresented } from "./operations/presentation/to-presented.js";
import { readingFingerprint as operationsReadingFingerprint } from "./operations/reading-fingerprint.js";

export {
	ParsingError,
	parseAsAttestation,
	parseAsLemma,
	parseAsReading,
	parseAsSurface,
} from "./operations/parsing/lightweight-parsers.js";
export { isClosedRouteFor } from "./route-closure.js";

export type * from "./types.js";

export const dumling: typeof operationsDumling = operationsDumling;
export const getLanguageApi: typeof operationsGetLanguageApi =
	operationsGetLanguageApi;
export const supportedLanguages: typeof operationsSupportedLanguages =
	operationsSupportedLanguages;
export const readingFingerprint: typeof operationsReadingFingerprint =
	operationsReadingFingerprint;
export const parseAs: typeof presentationParseAs = presentationParseAs;
export const toPresented: typeof presentationToPresented =
	presentationToPresented;
