/**
 * An uploaded book/text file's size (#1191): 16 MB holds large novels and
 * ebooks while keeping the Node action that reads it well inside its memory.
 * The browser checks it before uploading, and intake again.
 */
export const MAX_TEXT_FILE_BYTES = 16 * 1024 * 1024;

/** What a Learner reads when an uploaded file is over `MAX_TEXT_FILE_BYTES`. */
export const TEXT_FILE_TOO_LARGE_MESSAGE = "A file can be at most 16 MB.";

/** File input `accept` attribute covering all supported book and text formats. */
export const ACCEPTED_UPLOAD_FILES =
	".txt,.epub,.mobi,.prc,.azw,.azw3,.kf8,.fb2,.md,.markdown,.html,.htm,.xhtml,text/plain,application/epub+zip,application/x-mobipocket-ebook,text/markdown,text/html";

/** Human-readable list of supported upload formats for labels and errors. */
export const SUPPORTED_FILE_FORMATS_LABEL =
	".epub, .mobi, .azw3, .fb2, .txt, .md, or .html";
