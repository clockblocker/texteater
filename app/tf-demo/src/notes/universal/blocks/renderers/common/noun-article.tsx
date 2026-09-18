import { NoteTitleLink } from "lego";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { nounHeadingArticle } from "../../../../../../shared/grammatical-gender";
import type { NounArticleNavigation } from "../../../note/capabilities";

export function NounArticle({ lemma, lemmaId, navigation }: {
	lemma: { language: string; family: string; kind: string; coreFeatures: unknown };
	lemmaId: Id<"lemmas">;
	navigation?: NounArticleNavigation;
}) {
	const article = nounHeadingArticle(lemma);
	if (!article) return null;
	return <><NoteTitleLink
		aria-label={`${article}, open its authored DET Reading`}
		disabled={!navigation || navigation.pending}
		onClick={() => navigation?.follow(lemmaId)}
	>{article}</NoteTitleLink>{" "}</>;
}
