/**
 * A `.txt` file's size (#1191): 16 MB of text holds the Bible or Worm
 * (about 10 MB) and keeps the Node action that reads it well inside its
 * memory. The browser checks it before uploading, and intake again.
 */
export const MAX_TEXT_FILE_BYTES = 16 * 1024 * 1024;

/** What a Learner reads when a `.txt` file is over `MAX_TEXT_FILE_BYTES`. */
export const TEXT_FILE_TOO_LARGE_MESSAGE = "A .txt file can be at most 16 MB.";
