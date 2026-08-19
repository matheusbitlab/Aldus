import * as FileSystem from "expo-file-system";
import { StorageFullError } from "@/src/core/errors/DownloadErrors";
export const MINIMUM_FREE_STORAGE = 200 * 1024 * 1024;
export async function assertStorageAvailable(requiredBytes = 0): Promise<void> { const free = await FileSystem.getFreeDiskStorageAsync(); if (free - requiredBytes < MINIMUM_FREE_STORAGE) throw new StorageFullError(); }
