import type {
	EntityKind,
	LemmaKindFor,
	LemmaKindForSurfaceKind,
	LemmaSubKindFor,
	SupportedLanguage,
	SurfaceKindFor,
} from "./public-types";

export type Descriptor<
	K extends EntityKind = EntityKind,
	L extends SupportedLanguage = SupportedLanguage,
	LK extends LemmaKindFor<L> = LemmaKindFor<L>,
	LSK extends LemmaSubKindFor<L, LK> = LemmaSubKindFor<L, LK>,
	SK extends SurfaceKindFor<L> = SurfaceKindFor<L>,
> = K extends "Lemma"
	? {
			language: L;
			lemmaKind: LK;
			lemmaSubKind: LSK;
		}
	: K extends "Surface"
		? {
				language: L;
				surfaceKind: SK;
				lemmaKind: LK & LemmaKindForSurfaceKind<L, SK>;
				lemmaSubKind: LSK &
					LemmaSubKindFor<L, LK & LemmaKindForSurfaceKind<L, SK>>;
			}
		: {
				language: L;
				surfaceKind: SK;
				lemmaKind: LK & LemmaKindForSurfaceKind<L, SK>;
				lemmaSubKind: LSK &
					LemmaSubKindFor<L, LK & LemmaKindForSurfaceKind<L, SK>>;
			};
