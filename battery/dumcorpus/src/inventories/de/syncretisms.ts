import type * as Dumling from "dumling/types";
import { germanSyncretisms } from "./generated/syncretisms.js";
import type { AuthoredMember } from "./member.js";

type Core = Readonly<Record<string, unknown>>;
type SyncreticFields = { readonly syncretic?: readonly string[] };

/** Core Features count by their set values: a missing one equals a null one. */
function sameCore(left: Core, right: Core): boolean {
	return [...new Set([...Object.keys(left), ...Object.keys(right)])].every(
		(name) => (left[name] ?? null) === (right[name] ?? null),
	);
}

/**
 * The generated member of the German Syncretism a Lemma names (system ADR
 * 0046), or undefined when it names none. A classifier's answer is a
 * Syncretism's view, without its units, and has the Syncretism's identity
 * (system ADR 0002): the route, the Canonical Form without letter case, the
 * Core and the `syncretic` list. The member holds the whole Syncretism, with
 * its Reading and Knowledge. This compares identities itself, so the
 * inventories entry loads no Zod (ADR 0025).
 */
export function syncretismFor(
	lemma: Dumling.Lemma,
): AuthoredMember | undefined {
	const { syncretic } = lemma as SyncreticFields;
	if (syncretic === undefined || lemma.language !== "de") return undefined;
	const form = lemma.canonicalForm.toLocaleLowerCase("de");
	return germanSyncretisms.find((member) => {
		const generated = member.lemma as typeof member.lemma & SyncreticFields;
		return (
			generated.family === lemma.family &&
			generated.kind === lemma.kind &&
			generated.canonicalForm.toLocaleLowerCase("de") === form &&
			generated.syncretic?.length === syncretic.length &&
			syncretic.every(
				(name, index) => generated.syncretic?.[index] === name,
			) &&
			sameCore(generated.coreFeatures, lemma.coreFeatures)
		);
	});
}
