import type { Equal, Expect } from "common-utils";
import type * as Dumling from "dumling/types";
import type * as Dumdict from "../../src";
export type DeLanguage = Dumling.Lemma<"de">["language"];
export type RecordLanguage = Dumdict.LemmaRecord<"de">["lemma"]["language"];
export type Compatible =
	Dumdict.LemmaRecord<"en"> extends Dumdict.LemmaRecord<"de"> ? true : false;
export type LanguageAssignmentIsRejected = Expect<Equal<Compatible, false>>;
