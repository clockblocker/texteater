/**
 * `dumdict/inflection`: a Lemma's Inflection Tables as pure projections
 * (system ADR 0049), with no storage, language or labels. A language's
 * Inflection Pack is the only language seam.
 */
export type {
	DerivedForm,
	DerivedProvenance,
	DerivedTable,
	DeriveInput,
	DisplayRun,
	FormCodec,
	InflectionLabels,
	InflectionPack,
	ParadigmSelection,
	VariantRef,
} from "./inflection/pack";
export {
	type Placement,
	placeSurface,
	type SurfaceAxes,
	surfaceAxes,
} from "./inflection/placement";
export { projectLemmaTables } from "./inflection/project";
export type {
	AttestedSource,
	CellView,
	FormView,
	LemmaTablesSlice,
	LemmaTablesView,
	LicenceConflict,
	PanelView,
	SurfaceLine,
	TableGroupView,
} from "./inflection/views";
