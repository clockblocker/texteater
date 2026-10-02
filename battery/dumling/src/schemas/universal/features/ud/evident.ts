import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/Evident.html
export const EvidentSchema = z.enum(["Fh", "Nfh"]);
