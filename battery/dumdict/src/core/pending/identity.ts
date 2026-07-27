import type {
	PendingLemmaId,
	PendingLemmaIdentity,
	PendingLemmaRef,
} from "../../dto";
import {
	getLanguageApi,
	type Lemma,
	makeDumlingIdFor,
	type SupportedLanguage,
} from "../../dumling";

const pendingLemmaMeaning = "pending";

function makePendingIdentityLemma<L extends SupportedLanguage>(
	identity: PendingLemmaIdentity<L>,
): Lemma<L> {
	const languageApi = getLanguageApi(identity.language);
	const parsed = languageApi.parse.lemma({
		language: identity.language,
		canonicalLemma: identity.canonicalLemma,
		lemmaKind: identity.lemmaKind,
		lemmaSubKind: identity.lemmaSubKind,
		inherentFeatures: {},
		meaningInEmojis: pendingLemmaMeaning,
	});

	if (!parsed.success) {
		throw new Error(`Invalid pending lemma identity: ${parsed.error.message}`);
	}

	return parsed.data as Lemma<L>;
}

export function derivePendingLemmaId<L extends SupportedLanguage>(
	identity: PendingLemmaIdentity<L>,
): PendingLemmaId<L> {
	return `pending:v1:${makeDumlingIdFor(
		identity.language,
		makePendingIdentityLemma(identity),
	)}` as PendingLemmaId<L>;
}

export function makePendingLemmaRef<L extends SupportedLanguage>(
	identity: PendingLemmaIdentity<L>,
): PendingLemmaRef<L> {
	return {
		...identity,
		pendingId: derivePendingLemmaId(identity),
	};
}

export function samePendingLemmaIdentity<L extends SupportedLanguage>(
	left: PendingLemmaIdentity<L>,
	right: PendingLemmaIdentity<L>,
) {
	return derivePendingLemmaId(left) === derivePendingLemmaId(right);
}
