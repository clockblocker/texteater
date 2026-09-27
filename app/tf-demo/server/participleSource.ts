import type * as Dumling from "dumling/types";
import { selectKnowledge } from "dumrel";

/**
 * Whether one Knowledge run asks for the Reading's Participle Source (ADR
 * 0036). Only a base run of an applicable Reading that stores none asks. The
 * aspect stays outside the coverage request: a plain adjective answers with no
 * contribution and must still reach Full.
 */
export function asksParticipleSource(
	reading: { readonly lemma: Dumling.Lemma<"de"> },
	options: { readonly topUpOnly: boolean; readonly knowledge: unknown },
): boolean {
	if (options.topUpOnly) return false;
	const stored =
		options.knowledge && typeof options.knowledge === "object"
			? Reflect.get(options.knowledge, "participleSource")
			: undefined;
	if (stored) return false;
	const { language, family, kind } = reading.lemma;
	const selected = selectKnowledge({
		route: { language, family, kind } as never,
	});
	return selected.success && selected.value.participleSource === null;
}
