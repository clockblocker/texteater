import type {
	LemmaFamilyFor,
	LemmaKindFor,
	SupportedLanguage,
} from "dumling/types";
import type { PendingEntryId } from "../../dto";

type PendingEntryIdentity<L extends SupportedLanguage> = {
	language: L;
	canonicalForm: string;
	family: LemmaFamilyFor<L>;
	kind: LemmaKindFor<L, LemmaFamilyFor<L>>;
};

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
