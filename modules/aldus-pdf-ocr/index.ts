import { requireNativeModule } from "expo-modules-core";

export interface NativeOcrLine {
  text: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface NativeOcrPage {
  pageIndex: number;
  bitmapWidth: number;
  bitmapHeight: number;
  lines: NativeOcrLine[];
}

interface AldusPdfOcrModule {
  beginOperation(operationId: number): Promise<void>;
  cancelOperation(operationId: number): Promise<void>;
  recognizePage(uri: string, pageIndex: number, maxDimension: number, operationId: number): Promise<NativeOcrPage>;
}

export default requireNativeModule<AldusPdfOcrModule>("AldusPdfOcr");
