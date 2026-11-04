import { RegistryProvider } from "@effect/atom-react";
import {
	type RenderOptions,
	type RenderResult,
	render,
} from "@testing-library/react";
import type { ComponentProps, ReactElement, ReactNode } from "react";

type InitialValues = ComponentProps<typeof RegistryProvider>["initialValues"];

/**
 * Renders `ui` under its own atom registry, as `AppProvider` does for the app
 * (tf-demo ADR 0014), so no atom state leaks between tests. `initialValues`
 * seeds atoms; `rerender` keeps the same registry.
 */
export function renderWithAtoms(
	ui: ReactElement,
	{
		initialValues,
		...options
	}: Omit<RenderOptions, "wrapper"> & {
		readonly initialValues?: InitialValues;
	} = {},
): RenderResult {
	function Registry({ children }: { readonly children: ReactNode }) {
		return (
			<RegistryProvider initialValues={initialValues}>
				{children}
			</RegistryProvider>
		);
	}
	return render(ui, { ...options, wrapper: Registry });
}
