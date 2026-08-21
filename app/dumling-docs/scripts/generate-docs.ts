import { generateDocs, runDocsHousekeeping } from "./generate-content/index.ts";

await runDocsHousekeeping();
await generateDocs(process.argv.includes("--check") ? "check" : "write");
