/**
 * TRANSITIONAL — delete with the Compass wiring step.
 *
 * The Locked Sheet and Card Layer model and its renderer, kept only so
 * tf-demo's main app and lego's styled Workspace run until they move to the
 * Pane reducer in `../model.ts`. ADR 0008 retired these terms; do not extend
 * this module.
 */
export * from "./locked-model";
export {
	Workspace,
	type WorkspaceClassNames,
	type WorkspaceProps,
	type WorkspaceRenderContext,
} from "./Workspace";
