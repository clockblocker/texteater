import type {
	EntityKind,
	LemmaFamilyFor,
	LemmaFamilyForSurfaceKind,
	LemmaKindFor,
	SupportedLanguage,
	SurfaceKindFor,
} from "./public-types.js";

export type Descriptor<
	K extends EntityKind = EntityKind,
	L extends SupportedLanguage = SupportedLanguage,
	LK extends LemmaFamilyFor<L> = LemmaFamilyFor<L>,
	LSK extends LemmaKindFor<L, LK> = LemmaKindFor<L, LK>,
	SK extends SurfaceKindFor<L> = SurfaceKindFor<L>,
> = K extends "Lemma"
	? {
			language: L;
			family: LK;
			kind: LSK;
		}
	: K extends "Surface"
		? {
				language: L;
				surfaceKind: SK;
				family: LK & LemmaFamilyForSurfaceKind<L, SK>;
				kind: LSK &
					LemmaKindFor<L, LK & LemmaFamilyForSurfaceKind<L, SK>>;
			}
		: {
				language: L;
				surfaceKind: SK;
				family: LK & LemmaFamilyForSurfaceKind<L, SK>;
				kind: LSK &
					LemmaKindFor<L, LK & LemmaFamilyForSurfaceKind<L, SK>>;
			};
