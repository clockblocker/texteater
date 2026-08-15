import { definePromptSource } from "../../assembly";
import { corpus } from "./golden-corpus/corpus";
import {
	inputSchema,
	outputSchema,
	UNIT_SHADOW_CLASSIFICATION_ROUTES,
} from "./schemas";

function routeKinds(family: string): string {
	const kinds = UNIT_SHADOW_CLASSIFICATION_ROUTES[family];
	if (kinds === undefined) {
		throw new Error(`Dumling exposes no ${family} route inventory.`);
	}
	return kinds.join(", ");
}

const body = `<task>
Classify the shallow grammar of one proposed Unit Shadow. The proposal already
supplies language, canonicalForm, and a concise intendedUse preserved by its
containing relation or structure. Return only whether one exact Dumling Family
and Kind is defensible.

This is deliberately not Lemma Resolution or Reading Resolution. Never create
or infer Core Features, an opaque identity, a Reading, an emoji description,
Knowledge, relations, definitions, translations, components, or a revised
canonical form.
</task>

<evidence_policy>
Use canonicalForm and intendedUse together. canonicalForm alone cannot resolve
homographs. intendedUse may establish grammatical behavior, conventionalized
multiword status, morphological boundary role, or constructional shape. It is
not permission to guess a category merely because one would be plausible.

Return Resolved only when both Family and Kind are defensible. Return
Unresolved when evidence is missing, conflicting, invalid, or supports several
Kinds; when a multiword string is only a freshly composed free phrase; when a
fragment is proposed as a whole Phraseme or Construction; or when the proposal
has plausible semantics but no defensible grammatical unit. Never pick a broad
or residual Kind to hide uncertainty. X is Resolved only when intendedUse
explicitly establishes an intentionally unanalyzed lexical item.
</evidence_policy>

<families>
- Lexeme: one word-like grammatical unit. Kind is its Universal-Dependencies-
  style part of speech: ${routeKinds("Lexeme")}.
- Phraseme: one conventionalized multiword unit. Aphorism is a concise authored
  maxim; Proverb is a traditional complete saying; DiscourseFormula performs a
  conventional communicative act; Idiom has a conventional non-compositional
  meaning; Collocation has restricted lexical choices while its overall
  meaning remains compositional. Collocation is currently a German route only.
  A free phrase and a merely transparent compound word are not Phrasemes.
- Morpheme: a bound or internal minimal grammatical element. Choose one of
  ${routeKinds("Morpheme")} only when intendedUse establishes that exact
  boundary role. Orthographic hyphens and ellipses may display boundaries but
  do not prove them by themselves. A Duplifix is an echo-reduplicative element
  whose form or placement depends on a copied base, such as dismissive shm- in
  fancy-shmancy; it is not an ordinary Prefix merely because its displayed
  portion precedes the echo base. A Suffixoid is a productive bound final
  element that remains more word-like than an ordinary suffix, such as
  scandal-forming -gate; explicit evidence of that intermediate status is
  sufficient and must not be downgraded to Unresolved.
- Construction: a productive grammatical pattern rather than one fixed lexical
  expression. Fusion is a grammatical combination whose form collapses
  components; PairedFrame is a linked multi-slot frame such as je … desto … or
  the more … the more … .
</families>

<language_and_homographs>
Classify the supplied language; never translate canonicalForm. German (de),
English (en), and Hebrew (he) are supported. Unpointed Hebrew and ordinary
German or English spellings may be homographic. Resolve them only when
intendedUse selects one grammatical analysis. Semantic difference alone does
not create a new Kind. Under the supported Hebrew annotation policy,
existential יש meaning "there is/are" is VERB, while modal יש meaning "it is
possible/one can" is ADV; do not reinterpret the modal use as AUX.
</language_and_homographs>

<output_contract>
Return exactly {decision,target}. For Resolved, target is exactly {family,kind}.
For Unresolved, target is null. Never return language, canonicalForm,
intendedUse, coreFeatures, Lemma or Reading identity, confidence, alternatives,
or explanation.
</output_contract>

<final_check>
Before returning Resolved, ask: does the evidence prove this exact Family and
Kind, and is the proposed text a complete unit of that Family? If either answer
is no, return Unresolved.
</final_check>`;

export const demonstrations = corpus.collections.demonstrations;

export const promptSource = definePromptSource({
	route: "unit-shadow-classification",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
