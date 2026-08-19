# Selection removal footprint

Research child [#71](https://github.com/clockblocker/texteater/issues/71) of
wayfinder map [#69](https://github.com/clockblocker/texteater/issues/69), audited
against the repository on 2026-08-08. The audit followed the public Dumling
entrypoints inward and every workspace dependency on `dumling` back toward
Dumling. Counts below exclude `node_modules`, `GOAL.md`, and `VISION.md`.

## Verdict

`Selection` is not one removable DTO. It is a public entity layer threaded
through Dumling's type algebra, concrete and abstract schema registries,
constructors and converters, parsing, descriptors, ID codecs, package examples,
and tests. Dumgen then constructs it from Segmentation state and publishes it;
Laboratory caches, returns, displays, and logs it; Dumdict re-exports its types;
and dumling-docs uses Selection identity as route identity for 258 checked-in
attestation sources.

Most renaming, schema-tree rewiring, fixture conversion, and generated-artifact
refreshes are automatable once the Attestation contract is fixed. Two choices
are not automatable from repository evidence: the final Attestation payload
(especially member-level orthography and normalization) and whether already
documented and publishable `dumling@0.1.12` Selection types/IDs/routes require a
compatibility window. The repository proves exposure and persisted development
artifacts, but contains no production Selection datastore, backward decoder, or
explicit compatibility guarantee.

The accepted ADR and current context documentation explicitly establish the
old `Selection -> Surface -> Lemma` topology and click-local identity. They must
be superseded rather than silently edited around
([ADR 0002:9-33](../../../../docs/adr/0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md#L9-L33),
[ADR 0002:60-66](../../../../docs/adr/0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md#L60-L66),
[Dumling context:38-68](../../CONTEXT.md#L38-L68)).

## Dependency graph

```text
SegmentedSentence + clickedSegmentIndex                 (Dumgen interaction state)
              |
              v
Target Classification -> memberSegmentIndices          (Dumgen target state)
              |
              v
Grammatical Resolution -> Surface payload + Lemma
              |
              v
Dumgen constructSelection()
  +-- SegmentedSentenceId / clicked index
  +-- Surface member indices / reconstructed attested text
  +-- clicked-member orthography
  `-- linked persistent Surface -> Lemma
              |
              +-----------------------------+
              v                             v
       GrammaticalResult.selection     Dumling Selection schema/API
              |                             |
              v                             +-- descriptors
       Laboratory resolver                  +-- readable CSV ID
  +-- per-member Selection cache             +-- v3 tiny/base64url ID
  +-- HTTP EntityRepresentation              +-- parse/create/convert/extract
  +-- client rendering                       `-- package types/examples/tests
  `-- ignored JSONL session logs
              |
              v
       dumling-docs fixture/generator pipeline
  +-- 258 full Selection source objects
  +-- 258 Selection-ID logbook rows
  +-- Selection-ID route slugs
  `-- 258 ignored generated Markdown pages

Dumdict <- re-exported Selection / SelectionIdentity and copied test fixtures
```

Dumgen's source implements the upper half directly: `SegmentedSentence` owns
the branded ID and Segments, `GrammaticalInput` owns the clicked index, and a
resolved `GrammaticalResult` returns a Dumling `Selection`
([Dumgen types:16-37](../../../dumgen/src/types.ts#L16-L37),
[Dumgen types:60-82](../../../dumgen/src/types.ts#L60-L82)). The implementation
validates target membership against Segments, builds marked context and attested
text, and then selects a concrete Dumling Selection schema
([implementation:370-400](../../../dumgen/src/dumgen/implementation.ts#L370-L400),
[implementation:430-515](../../../dumgen/src/dumgen/implementation.ts#L430-L515),
[implementation:518-533](../../../dumgen/src/dumgen/implementation.ts#L518-L533)).

## Field ownership classification

This table distinguishes current storage location from the ownership implied by
the map. It does not choose any unresolved Attestation product policy.

| Current field or wrapper | Current evidence | Classification for removal | Mechanical consequence |
| --- | --- | --- | --- |
| `Selection` wrapper and `surface` link | The abstract type is five local fields plus linked `Surface`; concrete language unions replicate it for Citation and Inflection ([entities:81-93](../../src/types/abstract/entities.ts#L81-L93), [concrete types:98-116](../../src/types/concrete-language/concrete-language-types.ts#L98-L116)). | Occurrence evidence linked to persistent grammar | Replace the wrapper with Attestation after its cardinality and linked-Surface contract are selected. Preserve `Surface -> Lemma` unchanged. |
| `segmentedSentenceId` | Branded in Dumling and validated only as a non-empty normalized string ([entities:18-20](../../src/types/abstract/entities.ts#L18-L20), [builder:157-167](../../src/schemas/shared/builders.ts#L157-L167)). Dumgen creates it for its sentence aggregate ([implementation:143-148](../../../dumgen/src/dumgen/implementation.ts#L143-L148)). | Interaction / Segmentation state | Remove the brand, constructor, schema field, identity field, and Dumling ID dependency; retain a sentence identifier only at the Dumgen/application seam if the caller needs it. |
| `clickedSegmentIndex` | It is half of Selection identity and must be a non-negative index included in the member indices ([public types:166-180](../../src/types/public-types.ts#L166-L180), [builder:168-197](../../src/schemas/shared/builders.ts#L168-L197)). | Interaction state | Remove from Dumling/Attestation. Keep request validation and click routing in Dumgen/Laboratory. |
| `surfaceSegmentIndices` | Dumling validates shape/order/inclusion but cannot validate Segment kinds or bounds; Dumgen performs those checks ([create:16-38](../../src/operations/shared/create/create.ts#L16-L38), [implementation:383-399](../../../dumgen/src/dumgen/implementation.ts#L383-L399)). | Segmentation / target-membership state | Remove from Dumling. Project ordered member strings or other selected Attestation input in Dumgen after the human contract choice. |
| `attestedSurface` | Dumling checks only non-empty text ([builder:169-174](../../src/schemas/shared/builders.ts#L169-L174)); Dumgen reconstructs it from member indices and whitespace gaps ([implementation:496-515](../../../dumgen/src/dumgen/implementation.ts#L496-L515)). | Occurrence evidence, but construction owned upstream | Preserve the evidence in Attestation only in the selected normalized/member shape; construct it in Dumgen. |
| `selectedOrthography` | Current enum is click-local `Standard | Typo`; discontinuous fixtures prove different clicked members of one occurrence can disagree ([English fixtures:33-51](../../tests/helpers/attested-entities/eng/selections.ts#L33-L51)). Dumgen's private prompt result already returns one orthography per member ([Dumgen types:122-132](../../../dumgen/src/types.ts#L122-L132)). | Occurrence evidence | Move typo evidence to Attestation. Aggregate versus per-member representation is a human decision; the existing per-member evidence must not be collapsed mechanically. |
| `Surface.realizationCoverage` | It currently lives in both Surface variants and schemas ([entities:66-79](../../src/types/abstract/entities.ts#L66-L79), [builders:59-141](../../src/schemas/shared/builders.ts#L59-L141)). Surface IDs deliberately omit it and reconstruct decoded identities as `Full` ([readable CSV:244-253](../../src/operations/shared/id/id-codec/readable-csv.ts#L244-L253), [readable CSV:362-390](../../src/operations/shared/id/id-codec/readable-csv.ts#L362-L390)). | Occurrence evidence under map #69 | Remove from persistent Surface types/schemas/constructors and prompt Surface DTOs; add selected Attestation validation and convert every Surface fixture. Existing Surface IDs do not change solely because this metadata moves. |
| `Surface.language`, `normalizedSurface`, `surfaceKind`, `inflectionalFeatures`, `lemma` | These form the structural Surface identity ([public types:324-330](../../src/types/public-types.ts#L324-L330)); readable IDs serialize them ([readable CSV:244-253](../../src/operations/shared/id/id-codec/readable-csv.ts#L244-L253)). | Persistent Surface / Lemma data | Preserve. Update only wrapper paths such as `selection.surface.lemma`. |
| `Surface.spelling`, `surfaceFeatures` | Persistent Surface metadata validated by Surface schemas but excluded from Surface identity ([builders:76-85](../../src/schemas/shared/builders.ts#L76-L85), [ID test:99-127](../../tests/external/ling-id/ling-id-public.test.ts#L99-L127)). | Persistent Surface data | Preserve licensed variant and historical metadata. Do not mistake `selectedOrthography: Typo` for `spelling: Variant`. |
| `Lemma` fields | Language, Canonical Form, Family, Kind, and Core Features constitute the stable grammatical node ([entities:42-52](../../src/types/abstract/entities.ts#L42-L52), [ADR 0002:14-30](../../../../docs/adr/0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md#L14-L30)). | Persistent Lemma data | Preserve type/schema/identity and verified inventories. |
| `AttestedSelection` | A legacy docs wrapper contains `selection`, `sentenceMarkdown`, notes, mistakes, and verification ([public types:210-225](../../src/types/public-types.ts#L210-L225)). | Compatibility/docs material around occurrence evidence | Rename and reshape after Attestation is fixed. `sentenceMarkdown` is already documented as legacy display evidence, not authoritative occurrence input. |

## Complete Dumling footprint

### Public types and schema topology

The exported type surface includes `SegmentedSentenceId`, `Selection`,
`AttestedSelection`, `SelectionOptionsFor`, `SelectionIdentity`,
`AbstractSelection`, `EntityKind = "... | Selection"`, `EntityValue`, and the
Selection arms of `EntityForKind` and `IdDecodeSuccess`
([public types:33-53](../../src/types/public-types.ts#L33-L53),
[public types:166-225](../../src/types/public-types.ts#L166-L225),
[public types:308-339](../../src/types/public-types.ts#L308-L339),
[API shape:56-72](../../src/operations/api-shape.ts#L56-L72)). Concrete
language type maps independently materialize Citation/Inflection Selection
families for every supported language and kind
([concrete types:161-200](../../src/types/concrete-language/concrete-language-types.ts#L161-L200)).

The schema footprint is also a third top-level entity tree, not just one leaf:

- `buildSelectionSchema` owns strict runtime validation and is used for every
  concrete language/kind and both abstract Surface variants
  ([builders:144-207](../../src/schemas/shared/builders.ts#L144-L207),
  [abstract registry:26-67](../../src/schemas/abstract/registry.ts#L26-L67)).
- `buildLanguageSchema` populates `Selection.Citation` and
  `Selection.Inflection` in parallel with Surface
  ([builders:318-385](../../src/schemas/shared/builders.ts#L318-L385)).
- Public `schemasFor.<language>.entity.Selection...`, abstract entity and
  descriptor schemas, schema helper maps, and concrete Selection descriptor
  trees all expose that topology
  ([public schemas:12-35](../../src/schemas/public-schemas.ts#L12-L35),
  [abstract schemas:40-80](../../src/schemas/abstract-schemas.ts#L40-L80),
  [schema helper types:39-87](../../src/schemas/shared/schema-helper-types.ts#L39-L87),
  [descriptor schemas:97-176](../../src/schemas/descriptor-schemas.ts#L97-L176)).

### Operations, descriptors, and identities

Every language API exposes these Selection-specific operations:

- `create.segmentedSentenceId` and `create.selection`;
- `convert.lemma.toSelection` and `convert.surface.toSelection`;
- `parse.selection`;
- `describe.as.selection` and `describe.asCsv.selection`;
- Selection acceptance by `extract.lemma`, both ID encoders and `decode.any`;
- `id.decode.asSelectionIdentity`.

The exact public signatures are centralized in
[API shape:74-150](../../src/operations/api-shape.ts#L74-L150) and
[API shape:151-240](../../src/operations/api-shape.ts#L151-L240). Implementations
also special-case Selection by structural inspection (`"surface" in value`),
so removing names from the API shape alone is insufficient
([entity accessors:20-49](../../src/operations/shared/entity-accessors.ts#L20-L49),
[converter:10-58](../../src/operations/shared/convert/convert.ts#L10-L58),
[parser:12-44](../../src/operations/shared/parse/parse.ts#L12-L44)).

Selection descriptors reuse the linked Surface's language/kind/family and emit
`Selection,<language>,<surfaceKind>,<family>,<kind>`; both object and CSV
operations have distinct Selection entrypoints
([describe:17-37](../../src/operations/shared/describe/describe.ts#L17-L37),
[describe:53-84](../../src/operations/shared/describe/describe.ts#L53-L84)).

Selection identity is exactly `(segmentedSentenceId, clickedSegmentIndex)`.
Readable CSV is `Selection,<opaque sentence id>,<index>` and excludes every
other Selection and Surface field
([readable CSV:230-253](../../src/operations/shared/id/id-codec/readable-csv.ts#L230-L253),
[readable CSV:286-317](../../src/operations/shared/id/id-codec/readable-csv.ts#L286-L317)).
The v3 compact codec assigns Selection token `x`; the public decoder detects
Selection prefixes and has a dedicated identity result
([tiny tokens:14-18](../../src/operations/shared/id/id-codec/tiny-tokens.ts#L14-L18),
[tiny CSV:32-69](../../src/operations/shared/id/id-codec/tiny-csv.ts#L32-L69),
[ID operations:97-125](../../src/operations/shared/id/id.ts#L97-L125),
[ID operations:258-278](../../src/operations/shared/id/id.ts#L258-L278)).

### Dumling tests, fixtures, docs, and builds

Current Dumling tests cover Selection in 22 checked-in files spanning external
contract tests, three-language fixtures, internal schema/operation tests,
package-entrypoint compilation, and type tests. These are migration guards, not
independent policy. Representative fixtures cover discontinuous targets,
click-local typo status, and multiple click identities over one Surface
([English fixtures:13-51](../../tests/helpers/attested-entities/eng/selections.ts#L13-L51),
[German fixtures:17-35](../../tests/helpers/attested-entities/de/selections.ts#L17-L35),
[identity tests:12-97](../../tests/external/ling-id/ling-id-public.test.ts#L12-L97)).

The README and its generated source teach Selection construction, identity,
package imports, descriptor, parser, ID, and schema access
([README:88-113](../../README.md#L88-L113),
[README:123-195](../../README.md#L123-L195)). The publishable package is version
`0.1.12` and exports root, `/types`, and `/schema`; its `prepack` regenerates the
README and build artifacts
([package:1-36](../../package.json#L1-L36)). Local ignored `dist` currently has
297 files, 13 of which match Selection/its fields; it must be rebuilt but is not
a source-of-truth migration target.

## Downstream footprint

### Dumgen

Dumgen publicly imports `SegmentedSentenceId` and `Selection`, returns
`selection` from resolved grammar, and still asks callers for a clicked Segment
([types:1-5](../../../dumgen/src/types.ts#L1-L5),
[types:60-82](../../../dumgen/src/types.ts#L60-L82)). Its private prompt DTO is
already closer to the intended boundary: it carries per-member orthographies,
a Surface-without-Lemma payload, and a Lemma, while Target Classification owns
member indices
([types:108-132](../../../dumgen/src/types.ts#L108-L132)).

`constructSelection` is the central seam. It combines prompt grammar with
Segmentation-owned ID, clicked/member indices, projected attested text, and
clicked-member orthography, then locates a Dumling Selection schema dynamically
([implementation:430-493](../../../dumgen/src/dumgen/implementation.ts#L430-L493)).
The migration should replace this one seam with Attestation construction; route
prompt schemas still need a mechanical `realizationCoverage` move because their
Surface payloads currently include it. Dumgen tests assert the complete public
Selection result and click input
([Dumgen test:215-293](../../../dumgen/tests/internal/dumgen.test.ts#L215-L293)).

Besides source/tests, Dumgen has human-authored prompt sources, golden corpora,
prototype records, generated system prompts, and persistent prompt docs that
mention Selection or place `realizationCoverage` on Surface. A current scan
finds 234 Dumgen files containing `realizationCoverage`; most are repetitive
golden/prototype/generated cases and should be changed by generator/builder
migration, not hand editing. `check:system-prompts` is the drift guard declared
by the package scripts ([Dumgen package:8-30](../../../dumgen/package.json#L8-L30)).

### Laboratory

Laboratory re-exports a concrete German `Selection`, embeds it in the resolved
HTTP entity, and separately retains `target.memberSegmentIndices` and
`memberOrthographies`
([contract:7-29](../../../../app/laboratory/src/shared/contract.ts#L7-L29),
[contract:88-99](../../../../app/laboratory/src/shared/contract.ts#L88-L99)). Its
resolver derives targets through `selection.surface` and
`selection.surfaceSegmentIndices`, creates/caches one Selection per clicked
member, and validates repeated member resolutions
([classification:138-145](../../../../app/laboratory/src/classification.ts#L138-L145),
[classification:172-210](../../../../app/laboratory/src/classification.ts#L172-L210),
[classification:392-467](../../../../app/laboratory/src/classification.ts#L392-L467)).
The client displays clicked Selection fields and a canonical Selection JSON
panel, so UI copy and inspection snapshots also migrate.

The server appends the full `applicationResult` as JSONL and does not delete
earlier logs on session reset
([session log:13-27](../../../../app/laboratory/src/session-log.ts#L13-L27),
[session log:48-63](../../../../app/laboratory/src/session-log.ts#L48-L63),
[Laboratory README:58-62](../../../../app/laboratory/README.md#L58-L62)). In this
checkout, 13 ignored session files exist; seven files/14 records contain a
serialized `selection` key. That is real historical local persistence, but the
directory is explicitly ignored and no reader or migration path exists
([Dumgen gitignore:1-6](../../../dumgen/.gitignore#L1-L6)). Treat these logs as
disposable diagnostics unless a human explicitly promotes them to compatibility
data.

### dumling-docs

The checked-in corpus contains exactly 258 full Selection source fixtures:
161 German, 50 English, and 47 Hebrew under
`src/to-generate/attestations/<language>/selection/`. There are matching
language CSV logbooks with 258 rows whose `sectionId` is a readable Selection
ID. The fixtures and logbooks are persisted repository data. The generator
uses a
reversible base64url Selection ID as the route slug, while Lemma and Surface
routes use hashes
([slug:7-18](../../../../app/dumling-docs/scripts/generate-content/attestations/entity/attestation-slug.ts#L7-L18),
[slug test:21-33](../../../../app/dumling-docs/tests/attestation-slug.test.ts#L21-L33),
[logbook:178-270](../../../../app/dumling-docs/scripts/generate-content/attestations/selection/logbook.ts#L178-L270)).
Consequently, removing Selection IDs changes all occurrence route slugs unless
a redirect/alias policy is selected.

The generator has Selection-specific guards, helpers, validation, source-path
renaming, type-expression rendering, logbook generation, typed docs wrappers,
and entity-kind routing. The generated Markdown body also imports and renders
the concrete entity type and current identity CSV
([guards:43-60](../../../../app/dumling-docs/scripts/generate-content/attestations/entity/guards.ts#L43-L60),
[generator:29-83](../../../../app/dumling-docs/scripts/generate-content/attestations/generate-attestations.ts#L29-L83),
[body renderer:13-45](../../../../app/dumling-docs/scripts/generate-content/attestations/render/render-attestation-body.ts#L13-L45)).
Typed rule docs depend on the `AttestedSelection` wrapper for examples
([document shapes:29-44](../../../../app/dumling-docs/src/lib/docs/document-shapes.ts#L29-L44)).
The ignored site `dist` currently contains matching 161/50/47 Selection route
pages; regenerate it after source migration rather than editing it.

### Dumdict and architectural docs

Dumdict's private package publicly re-exports Dumling `Selection` and
`SelectionIdentity`, although its production persistence uses Surface IDs and
does not store Selection DTOs
([Dumdict bridge:1-31](../../../dumdict/src/dumling.ts#L1-L31),
[Dumdict bridge:34-46](../../../dumdict/src/dumling.ts#L34-L46)). Its Selection
footprint is copied multilingual attestation fixtures, an indexing test, and
legacy architecture/docs examples; the indexing test specifically asserts
clicked and member indices
([indexing test:1-23](../../../dumdict/tests/internal/attested-selection-indexing.test.ts#L1-L23)).
Its serialized dictionary fixtures persist Lemmas, Readings, and Surfaces, but
not Selections. The repository contains no evidence that Dumdict needs a
storage migration
([serialized notes:86-103](../../../dumdict/tests/fixtures/en-notes.ts#L86-L103)).

System-wide ADR 0002 and Dumling/Dumgen context plus README documentation form
the remaining narrative footprint. The migration contradicts accepted ADR 0002
only in its Selection clauses; the Lemma identity and Surface-to-Lemma clauses
remain evidence to preserve.

## Compatibility and persistence evidence

| Evidence | What it proves | What it does not prove |
| --- | --- | --- |
| Publishable `dumling@0.1.12`, `npm install dumling`, exported `/types` and `/schema` ([README:115-134](../../README.md#L115-L134), [package:1-22](../../package.json#L1-L22)) | Selection is an external package API, not only monorepo internals. | No stated semver/backward-support policy or known external consumer inventory. |
| Readable Selection CSV plus versioned v3 tiny/base64url token ([tiny CSV:32-50](../../src/operations/shared/id/id-codec/tiny-csv.ts#L32-L50), [tiny CSV:72-103](../../src/operations/shared/id/id-codec/tiny-csv.ts#L72-L103)) | Selection IDs are serializable and current generated routes/logbooks use them. | The decoder rejects unsupported versions; there is no historical compatibility adapter. |
| 258 checked-in full Selection fixtures and 258 checked-in ID logbook rows | Repository persistence must be migrated mechanically and reviewed for semantic preservation. | They are corpus/dev documentation, not proof of production user records. |
| 13 ignored Laboratory JSONL files, seven containing Selection results | Historical local Selection payloads really can exist. | Ignored diagnostics with no reader do not establish a required migration obligation. |
| Dumdict storage fixtures omit Selection ([serialized notes:86-96](../../../dumdict/tests/fixtures/en-notes.ts#L86-L96)) | The learner dictionary persistence boundary does not currently store Selection. | Other external consumers of the published Dumling package remain unknown. |

Therefore the safe evidence-based default is: migrate all tracked corpus and
generated routes; rebuild ignored artifacts; do not create a production data
migrator without evidence of a production store; and leave public ID/API alias
duration plus route redirects as an explicit release/product decision.

## Automatable migration slices

The slices are ordered by dependency, but independent fixture/generator work can
run in parallel once a compile-time Attestation contract exists.

1. **Introduce the selected Attestation core while preserving Lemma and Surface.**
   Add abstract/concrete Attestation types and validators, move
   `realizationCoverage` off Surface, and add the Attestation schema tree. This
   slice is automatable only after the human choices for members,
   normalization, orthography, identity, and serialization are recorded.
2. **Replace the Dumling public Selection algebra.** Mechanically replace
   `Selection`, `AttestedSelection`, Selection schema/descriptor trees, entity
   unions, API operation signatures, constructors/converters/parsers/accessors,
   and package type tests. Remove Segmentation-owned brands and fields. Keep
   Lemma and Surface identities byte-stable except where the chosen contract
   explicitly says otherwise.
3. **Handle IDs and descriptors as a separately reviewable slice.** Remove or
   alias Selection descriptor methods/tokens/decoders and add only the selected
   Attestation behavior. Existing Selection CSV/base64url route aliases or
   redirects require the compatibility decision; codec deletion itself should
   not silently invalidate checked-in URLs.
4. **Move Dumgen projection to the correct seam.** Replace
   `constructSelection`/`selectionSchemaFor` with Attestation construction;
   leave clicked indices, target membership validation, marked-context
   construction, and member-string projection in Dumgen. Change resolved result
   types and tests to return Attestation plus Surface/Lemma without exposing
   Segmentation mechanics through Dumling.
5. **Mechanically migrate prompt schemas and corpora.** Update shared
   grammatical-resolution builders before leaf schemas, move coverage into the
   selected Attestation DTO, regenerate system prompts, then repair the small
   number of route-specific golden boundaries. Avoid 234 independent hand edits.
6. **Migrate Laboratory application state.** Change the shared HTTP contract,
   per-member cache, response projection, reading lookup path, client copy/JSON
   panels, and tests. Keep request click state and target member indices in the
   application. Decide separately whether old ignored JSONL is discarded or a
   best-effort reader is warranted.
7. **Bulk-convert the 258 dumling-docs sources.** A codemod can rename the
   directory/entity/type wrapper, move coverage, preserve Lemma/Surface data and
   notes, and construct occurrence member evidence. Then migrate guards,
   renderers, validators, typed-doc example wrappers, semantic paths, and
   logbook headers. Regenerate the 258 CSV rows and 258 ignored route pages.
   Route redirects wait on the compatibility decision.
8. **Clean downstream compatibility material.** Remove Dumdict Selection
   re-exports and copied Selection fixtures/tests (or replace with Attestation
   fixtures if still useful), update README/context/accepted ADR status and
   generated Dumling README, then rebuild all ignored `dist` directories.

## Exact verification commands

Run from the repository root after migration. The first scan is an inventory
gate: any remaining old name must be an explicitly documented compatibility
adapter, not an accidental consumer.

```sh
rg -n --hidden -S '\bSelection\b|AttestedSelection|SelectionIdentity|SelectionOptionsFor|Selection,sentence_|entity\.Selection|descriptor\.Selection' \
  battery/dumling battery/dumgen battery/dumdict app/laboratory app/dumling-docs docs \
  --glob '!**/node_modules/**' --glob '!**/GOAL.md' --glob '!**/VISION.md'

bun --cwd battery/dumling run check
bun --cwd battery/dumling run check:types
bun --cwd battery/dumling test
bun --cwd battery/dumling run test:package
bun --cwd battery/dumling run build

bun --cwd battery/dumgen run check
bun --cwd battery/dumgen run check:system-prompts
bun --cwd battery/dumgen test
bun --cwd battery/dumgen run build

bun --cwd battery/dumdict run check
bun --cwd battery/dumdict test
bun --cwd battery/dumdict run build

bun --cwd app/laboratory run check
bun --cwd app/laboratory test
bun --cwd app/laboratory run build

bun --cwd app/dumling-docs run generate:content
bun --cwd app/dumling-docs run check
bun --cwd app/dumling-docs test
bun --cwd app/dumling-docs run build

bun run check
bun run lint
bun run test
bun run validate
```

The current baseline has a pre-existing Dumling type-check failure: two external
tests use the typo property `lemmaIdentityEncodingentity` instead of
`lemmaIdentity` ([English ID test:41-51](../../tests/external/ling-id/ling-id-public.test.ts#L41-L51),
[Hebrew entity test:102-112](../../tests/external/hebrew-attested-entities.test.ts#L102-L112)).
Record that separately when comparing migration results; it is not part of the
Selection-to-Attestation refactor.
