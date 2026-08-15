import type * as Dumdict from "../../src";

// @ts-expect-error Dumling Attestation is not Dumdict-owned vocabulary.
type Attestation = Dumdict.Attestation;

void (undefined as unknown as Attestation);

declare const inspection: Dumdict.DumlingIdInspection;
const identityBearingKind: "Lemma" | "Surface" = inspection.kind;
void identityBearingKind;

declare const serializedNote: Dumdict.SerializedDictionaryNote<"en">;
const schemaVersion: 1 = serializedNote.schemaVersion;
void schemaVersion;
