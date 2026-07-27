import { generateDocs, runDocsHousekeeping } from "./generate-content/index.ts";

await runDocsHousekeeping();
await generateDocs();
