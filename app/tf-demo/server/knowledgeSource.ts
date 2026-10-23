import { isRecord } from "common-utils";
import { routeOf } from "dumling";
import type * as Dumling from "dumling/types";
import { selectKnowledge } from "dumrel";

/**
 * Whether one Knowledge run asks for the Reading's Source (ADR 0036, ADR
 * 0050): a participle's verb, or a conversion's, clipping's or acronym's
 * base. Only a base run of a Reading whose route requests one and that
 * stores none asks. The aspect stays outside the coverage request: a word
 * formed from no other answers with no contribution and must still reach
 * Full.
 */
export function asksSource(
	reading: { readonly lemma: Dumling.Lemma<"de"> },
	options: { readonly topUpOnly: boolean; readonly knowledge: unknown },
): boolean {
	if (options.topUpOnly) return false;
	const stored = isRecord(options.knowledge)
		? options.knowledge.source
		: undefined;
	if (stored) return false;
	const selected = selectKnowledge({ route: routeOf(reading.lemma) });
	return selected.success && selected.value.source === null;
}
