import { sameLemma } from "dumling";
import type * as Dumling from "dumling/types";

import type { InMemoryStorageState } from "./state";

/**
 * Removes a Lemma's note: the Lemma, its Readings, their pending records and
 * its owned Surfaces, as a host removes one outside Dumdict's plans. Claims
 * other Readings hold on it stay until a re-evaluation moves them.
 */
export function removeLemma<L extends Dumling.Language>(
	state: InMemoryStorageState<L>,
	lemma: Dumling.Lemma<L>,
): void {
	state.storedNotes = state.storedNotes.filter(
		({ lemmaRecord }) => !sameLemma(lemmaRecord.lemma, lemma),
	);
	state.revisionNumber += 1;
}
