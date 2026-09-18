import { makeSurfaceId } from "dumdict/runtime";
import { nounArticleReference } from "dumgen";
import { parseGermanSurface } from "../../server/operationalParsing";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { materializeNounArticle } from "../dumdictStorage/transaction";
import { surfaceValue } from "./occurrenceAttestations";

/** Corrects the article owner while preserving the noun Surface ID and all occurrence links. */
export async function migrateNounArticle(ctx: MutationCtx, stored: Doc<"surfaces">) {
	if (stored.language !== "de" || !stored.articleReference) return;
	const lemma = await ctx.db.get(stored.lemmaId);
	if (!lemma || lemma.family !== "Lexeme" || lemma.kind !== "NOUN") return;
	const value = parseGermanSurface(surfaceValue(stored, lemma));
	if (!("articleReference" in value) || !value.articleReference || !value.inflectionalFeatures) return;
	const { article, case: caseValue, number } = value.inflectionalFeatures;
	if (!article || !caseValue || !number) return;
	const reference = nounArticleReference({ article, case: caseValue, number, gender: value.lemma.coreFeatures.gender, spelled: value.articleReference.surface.normalizedSurface });
	const surfaceKey = makeSurfaceId("de", { ...value, articleReference: reference });
	if (surfaceKey === stored.surfaceKey) return;
	const existing = await ctx.db.query("surfaces").withIndex("by_surface_key", (q) => q.eq("surfaceKey", surfaceKey)).unique();
	if (existing && existing._id !== stored._id) throw new Error("Noun article migration requires merging duplicate Surface records before proceeding.");
	await materializeNounArticle(ctx, reference);
	await ctx.db.patch(stored._id, { surfaceKey, articleReference: reference });
	const state = await ctx.db.query("dictionaryState").withIndex("by_key", (q) => q.eq("key", "global")).unique();
	if (state) await ctx.db.patch(state._id, { revision: state.revision + 1 });
	else await ctx.db.insert("dictionaryState", { key: "global", revision: 1 });
}
