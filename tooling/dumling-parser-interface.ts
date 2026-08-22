import type { ParsingError } from "../battery/common-utils/src/index";
import type {
	Attestation,
	Lemma,
	LemmaFamilyFor,
	LemmaFamilyForSurfaceKind,
	LemmaKindFor,
	Reading,
	SupportedLanguage,
	Surface,
	SurfaceKindFor,
} from "../battery/dumling/src/types";

type Parsed<Value> = Value | ParsingError<Value>;

/** Frozen package-root parser contract for Dumling. */
export interface DumlingParserInterface {
	readonly ParsingError: typeof import("../battery/common-utils/src/index").ParsingError;
	readonly parseAsLemma: <
		const L extends SupportedLanguage,
		const F extends LemmaFamilyFor<L>,
		const K extends LemmaKindFor<L, F>,
	>(
		input: unknown,
		language: L,
		family: F,
		kind: K,
	) => Parsed<Lemma<L, F, K>>;
	readonly parseAsSurface: <
		const L extends SupportedLanguage,
		const SK extends SurfaceKindFor<L>,
		const F extends LemmaFamilyForSurfaceKind<L, SK>,
		const K extends LemmaKindFor<L, F>,
	>(
		input: unknown,
		language: L,
		surfaceKind: SK,
		family: F,
		kind: K,
	) => Parsed<Surface<L, SK, F, K>>;
	readonly parseAsAttestation: <
		const L extends SupportedLanguage,
		const SK extends SurfaceKindFor<L>,
		const F extends LemmaFamilyForSurfaceKind<L, SK>,
		const K extends LemmaKindFor<L, F>,
	>(
		input: unknown,
		language: L,
		surfaceKind: SK,
		family: F,
		kind: K,
	) => Parsed<Attestation<L, SK, F, K>>;
	readonly parseAsReading: <
		const L extends SupportedLanguage,
		const F extends LemmaFamilyFor<L>,
		const K extends LemmaKindFor<L, F>,
	>(
		input: unknown,
		language: L,
		family: F,
		kind: K,
	) => Parsed<Reading<L, F, K>>;
}
