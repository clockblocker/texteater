import type { CellView, LemmaTablesView } from "../../src/inflection";
import type { ToyForm } from "./toy-inflection-pack";

export type View = LemmaTablesView<"de", ToyForm>;

/** A cell's forms as `letters` lists, by panel, row and column. */
export function lettersAt(
	view: View,
	group: number,
	panel: string,
	row: number,
	column: number,
): string[] {
	return cellAt(view, group, panel, row, column).forms.map(
		(form) => form.form.letters,
	);
}

export function cellAt(
	view: View,
	group: number,
	panel: string,
	row: number,
	column: number,
): CellView<"de", ToyForm> {
	const cell = view.groups[group]?.panels.find((each) => each.id === panel)
		?.cells[row]?.[column];
	if (!cell)
		throw Error(`No cell ${panel} ${row} ${column} in group ${group}`);
	return cell;
}
