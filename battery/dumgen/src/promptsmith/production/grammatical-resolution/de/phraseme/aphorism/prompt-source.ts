import { definePromptSource } from "../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `<agent_role>
Resolve the German Phraseme/Aphorism Analysis Target to its Citation Surface and
Lemma grammar. The caller has already classified one valid Aphorism target.
Always resolve it.
</agent_role>

<input_contract>
Input is exactly {markedContext,members}. TARGET spans in markedContext and the
members array are authoritative projections of the same valid target. They
already passed syntax, route, occurrence, and membership validation.

Never add, remove, reorder, reject, repair, or reclassify membership. Unmarked
text is context only. It may contain an author or speaker attribution, source
label, punctuation, quotation marks, a Proverb, Idiom, slogan, arbitrary quote,
or ordinary assertion. Resolve only the marked Aphorism members. Return one
memberOrthographies and one normalizedMembers entry per member in source order.
</input_contract>

<fixed_contract>
Return a flat object. This route exposes Citation only, so the application
injects surfaceKind Citation. It also supplies language de, Family Phraseme,
Kind Aphorism, empty Lemma Core Features, Surface-to-Lemma linkage, normalized
Surface scalar, and the successful result wrapper.

Never return decision, resolution, language, family, kind, coreFeatures,
surfaceKind, normalizedSurface, a linked Lemma inside Surface, authorship,
provenance, confidence, candidates, indices, or explanations.
</fixed_contract>

<aphorism_analysis>
Infer the complete normalized conventional wording as canonicalForm. It is the
space-separated lexical wording in canonical order with current German
orthography and appropriate initial and noun capitalization. Punctuation and
quotation marks are not word-like members and do not enter normalizedMembers
or canonicalForm. Serialize canonicalForm as lexical words joined by single
spaces: never insert commas, periods, semicolons, colons, dashes, quotation
marks, or any other punctuation. For Full coverage without historical spelling,
canonicalForm is exactly normalizedMembers joined by single spaces.

Attributions and framing remain unmarked even when they interrupt a split
quotation. Repeated wording elsewhere does not change which occurrence is the
authoritative target. Labels or nearby examples of Proverbs, Idioms, slogans,
quotations, or ordinary assertions do not reopen the upstream route decision.
</aphorism_analysis>

<coverage>
realizationCoverage is Full when this occurrence realizes all entity-owned
lexical material. Use Partial only for an explicitly shortened citation whose
missing tail is genuinely unrealized, normally signaled by an ellipsis, while
the exact full Aphorism remains recoverable from the quoted beginning. Return
only realized supplied members in normalizedMembers and the complete wording
in canonicalForm. Partial never excuses an overt omitted word, an overbroad
target, or a target spanning two units; those are upstream membership matters.
</coverage>

<orthography>
Standard means exact conventional spelling, ordinary sentence-initial
capitalization, or a licensed historical spelling. A licensed historical form
stays unchanged in normalizedMembers, uses Surface spelling Variant, and maps
to current orthography in canonicalForm. Historical spelling alone does not
make surfaceFeatures archaic.

Typo means a real selected-member spelling or casing error. Repair it in
normalizedMembers and canonicalForm and mark only that position Typo. A
lowercase first source member at the beginning of the complete maxim is an
inappropriate-casing Typo: mark that source position Typo and normalize it to
uppercase. Do not call the lowercase source token Standard merely because its
repair is ordinary sentence-initial capitalization. A Typo repair uses Surface
spelling Canonical, not Variant. surfaceFeatures is null unless this grammatical
use itself is archaic, then {historicalStatus:"Archaic"}.
</orthography>

<final_checks>
Return every required field and no extra field. Array lengths equal
members.length. normalizedMembers contain only realized target words in source
order. canonicalForm contains the complete conventional wording. Always
resolve the classified target.
</final_checks>`;

const demonstrations = corpus.select([
	"grammar-de-aphorism-alt-werden",
	"grammar-de-aphorism-typo-hoert",
	"grammar-de-aphorism-historical-muss",
	"grammar-de-aphorism-vertrauen-discontinuous",
	"grammar-de-aphorism-verstehen-partial",
	"grammar-de-aphorism-liebe-rechte",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/phraseme/aphorism",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
