import type {
	PendingEntryId,
	PendingEntryIdentity,
	PendingEntryRef,
} from "../../dto";
import type { SupportedLanguage } from "../../dumling";

export function derivePendingEntryId<L extends SupportedLanguage>(
	identity: PendingEntryIdentity<L>,
): PendingEntryId<L> {
	const description = [
		identity.language,
		identity.family,
		identity.kind,
		identity.canonicalForm,
	].map(encodeURIComponent);
	return `pending-entry:v2:${description.join(":")}` as PendingEntryId<L>;
}

export function makePendingEntryRef<L extends SupportedLanguage>(
	identity: PendingEntryIdentity<L>,
): PendingEntryRef<L> {
	return {
		...identity,
		pendingId: derivePendingEntryId(identity),
	};
}
