# `dumrel`

Shared relation vocabulary for Textfresser modules.

`dumrel` owns lexical and morphological relation names, their runtime schemas,
their inverse/family rules, and reusable relation payload types. It deliberately
does not own dictionary storage, pending-entry lifecycle, or relation cleanup
workflows.

```ts
import {
	inverseRelationFor,
	lexicalRelationSchema,
	type LexicalRelations,
} from "dumrel";

lexicalRelationSchema.parse("nearSynonym");
inverseRelationFor("lexical", "hypernym"); // "hyponym"

declare const relations: LexicalRelations<"en">;
void relations;
```

Schema builders accept endpoint schemas from their owning modules, so Dumrel
can validate relation structure without taking ownership of Lemmas, Readings,
or persistence identities.
