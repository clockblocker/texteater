import { lemmaIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import type { AuthoredMember } from "../member.js";
import { germanSyncretisms } from "./generated/syncretisms.js";

let byIdentity: ReadonlyMap<string, AuthoredMember> | undefined;

function syncretismsByIdentity(): ReadonlyMap<string, AuthoredMember> {
	if (byIdentity === undefined) {
		const index = new Map<string, AuthoredMember>();
		for (const member of germanSyncretisms) {
			const key = lemmaIdentityKey(member.lemma);
			if (!index.has(key)) index.set(key, member);
		}
		byIdentity = index;
	}
	return byIdentity;
}

/**
 * The generated member of the German Syncretism a Lemma names (system ADR
 * 0046), or undefined when it names none. A classifier's answer is a
 * Syncretism's view, without its units, and has the Syncretism's identity
 * (system ADR 0002): the route, the Canonical Form without letter case, the
 * Core and the `syncretic` list. The member holds the whole Syncretism, with
 * its Reading and Knowledge.
 */
export function syncretismFor(
	lemma: Dumling.Lemma,
): AuthoredMember | undefined {
	if (
		!("syncretic" in lemma) ||
		lemma.syncretic === undefined ||
		lemma.language !== "de"
	)
		return undefined;
	return syncretismsByIdentity().get(lemmaIdentityKey(lemma));
}
