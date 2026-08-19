import { AppError } from "@/src/core/errors/AppError";
export class InvalidEpubError extends AppError { constructor(message: string, cause?: unknown) { super("INVALID_EPUB", message, cause); this.name = "InvalidEpubError"; } }
export class EpubParsingError extends AppError { constructor(message: string, cause?: unknown) { super("EPUB_PARSING_ERROR", message, cause); this.name = "EpubParsingError"; } }
