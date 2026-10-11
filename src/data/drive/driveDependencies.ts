import { DriveAuthorization } from "./DriveAuthorization";
import { drivePlatformAuth } from "./drivePlatformAuth";
import { GoogleDriveService } from "./GoogleDriveService";
export const googleDrive = new GoogleDriveService(new DriveAuthorization(drivePlatformAuth));
