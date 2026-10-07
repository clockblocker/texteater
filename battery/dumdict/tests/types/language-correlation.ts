import type { Equal, Expect } from "common-utils";
import type * as Dumdict from "../../src";

type Compatible =
	Dumdict.LemmaRecord<"en"> extends Dumdict.LemmaRecord<"de"> ? true : false;
type _LanguageAssignmentIsRejected = Expect<Equal<Compatible, false>>;
