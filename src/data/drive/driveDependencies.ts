import { DriveAuthorization } from "./DriveAuthorization";
import { drivePlatformAuth } from "./drivePlatformAuth";
import { GoogleDriveService } from "./GoogleDriveService";
import { libraryAccountScope } from "@/src/data/library/LibraryAccountScope";
export const googleDrive = new GoogleDriveService(new DriveAuthorization(drivePlatformAuth));
// Synchronous Auth scope revocation drops grants/indexes before another account can use them.
libraryAccountScope.subscribe(() => googleDrive.clearSession());
