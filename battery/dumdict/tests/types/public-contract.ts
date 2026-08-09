// @ts-expect-error Dumling Attestation is not Dumdict-owned vocabulary.
import type { Attestation, DumlingIdInspection } from "../../src";

void (undefined as unknown as Attestation);

declare const inspection: DumlingIdInspection;
const identityBearingKind: "Lemma" | "Surface" = inspection.kind;
void identityBearingKind;
