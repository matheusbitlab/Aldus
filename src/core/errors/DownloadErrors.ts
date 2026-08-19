import { AppError } from "@/src/core/errors/AppError";
export class StorageFullError extends AppError { constructor() { super("STORAGE_FULL", "Não há espaço suficiente para iniciar este download."); this.name = "StorageFullError"; } }
export class DownloadError extends AppError { constructor(message: string, cause?: unknown) { super("DOWNLOAD_ERROR", message, cause); this.name = "DownloadError"; } }
