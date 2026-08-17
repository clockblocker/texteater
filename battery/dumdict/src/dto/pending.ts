import type {
	PendingSemanticRelation,
	SemanticRelation,
	UnitShadow,
} from "dumrel";
import type { Reading, SupportedLanguage } from "../dumling";

export type PendingEntryId<L extends SupportedLanguage> = string & {
	readonly __pendingEntryIdBrand?: unique symbol;
	readonly __language?: L;
};

export type PendingSemanticRelationLocator<L extends SupportedLanguage> = {
	sourceReadingKey: string;
	relation: SemanticRelation;
	targetPendingId: PendingEntryId<L>;
};

export type DumdictPendingSemanticRelation<L extends SupportedLanguage> = Omit<
	PendingSemanticRelation,
	"target"
> & { target: UnitShadow<L> };

export type PendingSemanticRelationRecord<L extends SupportedLanguage> = {
	sourceReading: Reading<L>;
	pending: DumdictPendingSemanticRelation<L>;
	locator: PendingSemanticRelationLocator<L>;
};
