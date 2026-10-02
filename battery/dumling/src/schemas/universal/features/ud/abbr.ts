import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/Abbr.html
export const AbbrSchema = z.enum(["Yes"]);
