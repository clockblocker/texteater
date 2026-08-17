import type { Reading as DumlingReading } from "dumling/types";
import type * as Dumdict from "../../src";

declare const canonicalReading: DumlingReading<"en">;
canonicalReading satisfies Dumdict.Reading<"en">;
declare const reexportedReading: Dumdict.Reading<"en">;
reexportedReading satisfies DumlingReading<"en">;

// @ts-expect-error Dumling Attestation is not Dumdict-owned vocabulary.
type Attestation = Dumdict.Attestation;

void (undefined as unknown as Attestation);

declare const inspection: Dumdict.DumlingIdInspection;
const identityBearingKind: "Lemma" | "Surface" = inspection.kind;
void identityBearingKind;

declare const serializedNote: Dumdict.SerializedDictionaryNote<"en">;
const schemaVersion: 1 = serializedNote.schemaVersion;
void schemaVersion;

declare const plan: Dumdict.DumdictPlan<"en">;
// @ts-expect-error Public Dumdict plans are readonly at the host seam.
plan.baseRevision = "changed" as Dumdict.StoreRevision;
// @ts-expect-error Hosts cannot add unvalidated changes to a Dumdict plan.
plan.changes.push();
// @ts-expect-error Hosts cannot alter a planned change after validation.
plan.changes[0]?.preconditions.push();
