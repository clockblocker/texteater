import { type RunMode, runCodegen } from "codegen";
import { definePagesCodegen } from "./codegen";
import { discoverTypedDocs } from "./typed/generate-typed-docs";

export async function generateDocs(mode: RunMode = "write"): Promise<void> {
	// Generated docs are ignored build outputs, so check mode plans them without
	// comparing against whatever an earlier run left in this working tree.
	await runCodegen(definePagesCodegen("docs", await discoverTypedDocs()), {
		mode,
	});
}
