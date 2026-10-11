import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import * as FileSystem from "expo-file-system/legacy";
import { PdfReflowPageData, PdfTextProcessingState } from "@/src/domain/types/pdfReader";
import { buildPdfReflowDocumentAsync } from "@/src/data/local/PdfReflowDocumentBuilder";
import { isValidatedReflowDocument, CORRUPT_PDF_TEXT } from "@/src/data/local/pdfReflowQuality";
import { createPdfOcrPlan, createReflowDerivation, isSufficientOcrText, PdfOcrPlan, replacePageWithOcr } from "@/src/data/local/pdfOcrPolicy";
import { beginPdfOcr, cancelPdfOcr, recognizePdfPage } from "@/src/data/local/pdfOcr.native";
import { PdfReflowProgress, PdfReflowProcessorProps, reflowProgressLabel } from "@/src/presentation/components/PdfReflowProcessorProps";
import { createReflowOperation } from "./reflowOperation";
import { reflowDiagnostic } from "@/src/utils/reflowDiagnostics";

export function PdfReflowProcessor({ uri, onProgress, onComplete, onError, onCancel }: PdfReflowProcessorProps) {
  const webView = useRef<WebView>(null);
  const pages = useRef<PdfReflowPageData[]>([]);
  const generation = useRef(0);
  const operation = useRef<ReturnType<typeof createReflowOperation> | null>(null);
  const started = useRef(false);
  const assembling = useRef(false);
  const temporaryOcrUri = useRef<string | null>(null);
  const callbacks = useRef({ onComplete, onError, onProgress, onCancel });
  callbacks.current = { onComplete, onError, onProgress, onCancel };
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [progress, setProgress] = useState<PdfReflowProgress>({ currentPage: 0, totalPages: 0 });
  const [ocrPlan, setOcrPlan] = useState<PdfOcrPlan | null>(null);
  const [processingState, setProcessingState] = useState<PdfTextProcessingState>("TEXT_VALID");
  const source = useMemo(() => ({ html: getProcessorHtml(), baseUrl: "https://aldus-reader.local/" }), []);

  useEffect(() => {
    const run = createReflowOperation();
    operation.current = run;
    generation.current++;
    reflowDiagnostic("START", { operationId: generation.current, phase: "reading", engine: "WebView/PDF.js 3.11.174" });
    started.current = false;
    assembling.current = false;
    pages.current = [];
    temporaryOcrUri.current = null;
    setOcrPlan(null);
    setProcessingState("TEXT_VALID");
    setProgress({ currentPage: 0, totalPages: 0 });
    setPdfBase64(null);

    void (async () => {
      try {
        const base64 = uri.startsWith("data:application/pdf;base64,")
          ? uri.split(",", 2)[1]
          : uri.startsWith("file://") || uri.startsWith("content://") || !uri.includes("://")
          ? await FileSystem.readAsStringAsync(uri, { encoding: "base64" } as never)
          : await readRemotePdf(uri, run.signal);
        if (!base64) throw new Error("Arquivo PDF vazio.");
        if (run.active) setPdfBase64(base64);
      } catch (failure) {
        if (run.finish()) callbacks.current.onError("Não foi possível ler o PDF neste dispositivo.");
      }
    })();

    return () => {
      run.finish();
      void cancelPdfOcr(generation.current);
      webView.current?.injectJavaScript("window.cancelPdf && window.cancelPdf(); true;");
      pages.current = [];
      if (temporaryOcrUri.current) void FileSystem.deleteAsync(temporaryOcrUri.current, { idempotent: true }).catch(() => undefined);
    };
  }, [uri]);

  const fail = (message: string) => {
    if (operation.current?.finish()) {
      setProcessingState(message.includes("OCR não encontrou") ? "OCR_INSUFFICIENT" : "PROCESSING_ERROR");
      reflowDiagnostic("ERROR", { operationId: generation.current });
      void cancelPdfOcr(generation.current);
      webView.current?.injectJavaScript("window.cancelPdf && window.cancelPdf(); true;");
      pages.current = [];
      callbacks.current.onError(message);
    }
  };
  const cancel = () => {
    if (operation.current?.finish()) {
      reflowDiagnostic("CANCEL", { operationId: generation.current });
      webView.current?.injectJavaScript("window.cancelPdf && window.cancelPdf(); true;");
      void cancelPdfOcr(generation.current);
      pages.current = [];
      callbacks.current.onCancel();
    }
  };

  const buildAndFinish = async (extracted: PdfReflowPageData[], totalPages: number, ocrPages: number[]) => {
    const run = operation.current;
    if (!run?.active) return;
    update({ stage: "building", currentPage: totalPages, totalPages });
    const document = await buildPdfReflowDocumentAsync(
      extracted,
      totalPages,
      run.signal,
      createReflowDerivation(totalPages, ocrPages)
    );
    if (!run.active) return;
    update({ stage: "validating", currentPage: document.pageCount, totalPages: document.pageCount });
    if (!isValidatedReflowDocument(document) || document.classification === "image-based") {
      throw new Error(ocrPages.length > 0 ? "OCR não encontrou texto legível suficiente neste PDF." : CORRUPT_PDF_TEXT);
    }
    update({ stage: "finalizing", currentPage: document.pageCount, totalPages: document.pageCount });
    pages.current = [];
    setProcessingState(ocrPages.length > 0 ? "OCR_VALID" : "TEXT_VALID");
    if (run.finish()) {
      reflowDiagnostic("SUCCESS", { operationId: generation.current, phase: ocrPages.length > 0 ? "ocr" : "extraction" });
      callbacks.current.onComplete(document);
    }
  };

  const startOcr = async () => {
    const plan = ocrPlan;
    const run = operation.current;
    if (!plan || !run?.active) return;
    setOcrPlan(null);
    setProcessingState("OCR_PROCESSING");
    try {
      await beginPdfOcr(generation.current);
      if (!run.active) return;
      const localUri = await ensureLocalOcrUri(uri, pdfBase64, generation.current);
      if (localUri !== uri) temporaryOcrUri.current = localUri;
      const pageMap = new Map(pages.current.map(page => [page.pageNumber, page]));
      for (let index = 0; index < plan.pageNumbers.length; index += 1) {
        if (!run.active) return;
        const pageNumber = plan.pageNumbers[index];
        const page = pageMap.get(pageNumber);
        if (!page) throw new Error("A página solicitada para OCR não está disponível.");
        update({ stage: "ocr", currentPage: index, totalPages: plan.pageNumbers.length });
        const textItems = await recognizePdfPage(localUri, page, generation.current);
        if (!run.active) return;
        if (!isSufficientOcrText(textItems)) throw new Error(`OCR não encontrou texto legível suficiente na página ${pageNumber}.`);
        pageMap.set(pageNumber, replacePageWithOcr(page, textItems));
        update({ stage: "ocr", currentPage: index + 1, totalPages: plan.pageNumbers.length });
      }
      const recognized = pages.current.map(page => pageMap.get(page.pageNumber) ?? page);
      pages.current = recognized;
      await buildAndFinish(recognized, plan.totalPages, plan.pageNumbers);
    } catch (failure) {
      if (run.active) fail(failure instanceof Error ? failure.message : "Falha no reconhecimento local de texto.");
    }
  };
  const update = (next: PdfReflowProgress) => {
    if (operation.current?.active) { setProgress(next); callbacks.current.onProgress(next); }
  };

  const handleWebViewLoaded = () => {
    if (pdfBase64 && operation.current?.active && !started.current) {
      started.current = true;
      webView.current?.injectJavaScript(
        `window.processPdf && window.processPdf(${JSON.stringify(pdfBase64)},${generation.current}); true;`
      );
    }
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as {
        operationId?: number;
        type?: string;
        page?: PdfReflowPageData;
        currentPage?: number;
        totalPages?: number;
        imageCount?: number;
        message?: string;
        phase?: string; pageNumber?: number; engine?: string; stack?: string;
        file?: string; line?: number; column?: number; errorName?: string;
      };
      const run = operation.current;
      if (!run?.active || message.operationId !== generation.current) return;
      if (message.type === "stage" || message.type === "error") {
        reflowDiagnostic(message.type === "stage" ? "STAGE" : "RENDERER_ERROR", {
          operationId: generation.current, phase: message.phase, pageNumber: message.pageNumber,
          engine: message.engine, file: message.file, line: message.line, column: message.column,
          error: { name: message.errorName, message: message.message, stack: message.stack },
        });
      }
      if (assembling.current && message.type !== "error") return;
      if (message.type === "page" && message.page) {
        pages.current.push(message.page);
      } else if (message.type === "progress") {
        const nextProgress = {
          currentPage: message.currentPage ?? 0,
          totalPages: message.totalPages ?? 0,
          imageCount: message.imageCount ?? 0,
        };
        update({ ...nextProgress, stage: "extracting" });
      } else if (message.type === "complete" && message.totalPages) {
        assembling.current = true;
        const extracted = pages.current;
        const plan = createPdfOcrPlan(extracted);
        setProcessingState(plan.state);
        if (plan.state === "OCR_REQUIRED") {
          const required = new Set(plan.pageNumbers);
          pages.current = extracted.map(page => required.has(page.pageNumber)
            ? replacePageWithOcr(page, page.textItems)
            : page);
          setOcrPlan(plan);
          update({ stage: "awaiting-ocr", currentPage: 0, totalPages: plan.pageNumbers.length });
        } else {
          void buildAndFinish(extracted, message.totalPages, []).catch(error => {
            if (run.active) fail(error instanceof Error ? error.message : "Falha ao montar o documento PDF.");
          });
        }
      } else if (message.type === "error") {
        fail("Não foi possível extrair o conteúdo deste PDF. O PDF Original continua disponível.");
      }
    } catch {
      fail("O processador PDF retornou dados inválidos.");
    }
  };

  return (
    <View style={styles.overlay}>
      {pdfBase64 ? (
        <WebView
          ref={webView}
          source={source}
          style={styles.webView}
          originWhitelist={["*"]}
          javaScriptEnabled
          pointerEvents="none"
          onLoadEnd={handleWebViewLoaded}
          onMessage={handleMessage}
          onError={() => fail("Falha ao carregar o processador PDF.")}
          onHttpError={() => fail("Falha de rede ao carregar o processador PDF.")}
          onRenderProcessGone={() => fail("O processo de renderização PDF foi encerrado.")}
          onContentProcessDidTerminate={() => fail("O processo de renderização PDF foi encerrado.")}
        />
      ) : null}
      <View style={styles.panel}>
        {ocrPlan ? (
          <>
            <Text accessibilityRole="header" style={styles.title}>Este PDF precisa de OCR</Text>
            <Text style={styles.description}>
              {ocrPlan.pageNumbers.length === 1 ? "1 página precisa" : `${ocrPlan.pageNumbers.length} páginas precisam`} de reconhecimento local de texto. O processo ocorre neste aparelho e pode demorar.
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void startOcr()} style={styles.primaryAction}>
              <Text style={styles.primaryActionText}>Reconhecer texto</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={cancel} style={styles.cancel}>
              <Text style={styles.cancelText}>Continuar no PDF Original</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color="#B65F42" />
            <Text style={styles.title}>{processingState === "OCR_PROCESSING" ? "Reconhecendo texto" : "Preparando leitura livre"}</Text>
            <Text style={styles.description}>{reflowProgressLabel(progress)}</Text>
            <Pressable accessibilityRole="button" onPress={cancel} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

async function ensureLocalOcrUri(uri: string, base64: string | null, operationId: number): Promise<string> {
  if (uri.startsWith("file://") || uri.startsWith("content://") || !uri.includes("://")) return uri;
  if (!base64 || !FileSystem.cacheDirectory) throw new Error("O OCR requer uma cópia local deste PDF.");
  const target = `${FileSystem.cacheDirectory}aldus-ocr-${operationId}.pdf`;
  await FileSystem.writeAsStringAsync(target, base64, { encoding: "base64" } as never);
  return target;
}

async function readRemotePdf(uri: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(uri, { signal });
  if (!response.ok) throw new Error("Não foi possível baixar o PDF para análise.");
  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    const abort = () => { reader.abort(); reject(new Error("Leitura cancelada.")); };
    const finish = () => signal.removeEventListener("abort", abort);
    signal.addEventListener("abort", abort, { once: true });
    reader.onload = () => { finish(); resolve(String(reader.result ?? "")); };
    reader.onerror = () => { finish(); reject(reader.error ?? new Error("Falha ao ler o PDF.")); };
    reader.onabort = finish;
    if (signal.aborted) { abort(); return; }
    reader.readAsDataURL(blob);
  });
  return dataUrl.split(",", 2)[1] ?? "";
}

export function getProcessorHtml(): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script></head><body>
<script>
(function(){
  var operationId=0,cancelled=false,loadingTask=null,phase="opening",currentPage=0;
  function post(value){value.operationId=operationId;if(!cancelled&&window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(value));}
  function stage(value){phase=value;post({type:"stage",phase:phase,pageNumber:currentPage,engine:"WebView/PDF.js 3.11.174"});}
  function report(error,event){post({type:"error",message:String(error&&error.message||error),errorName:error&&error.name,stack:error&&error.stack,file:event&&event.filename,line:event&&event.lineno,column:event&&event.colno,phase:phase,pageNumber:currentPage,engine:"WebView/PDF.js 3.11.174"});}
  window.addEventListener("error",function(event){report(event.error||new Error("Renderer script error"),event);});
  window.addEventListener("unhandledrejection",function(event){report(event.reason);});
  window.cancelPdf=function(){cancelled=true;if(loadingTask)loadingTask.destroy().catch(function(){});};
  function check(){if(cancelled)throw new Error("cancelled");}
  function toTextItems(items){
    return items.filter(function(item){return item&&typeof item.str==="string"&&item.str.length>0&&item.transform;}).map(function(item){return {text:item.str,direction:item.dir||"ltr",x:item.transform[4],y:item.transform[5],width:item.width||0,height:item.height||0,fontName:item.fontName||"",hasEOL:!!item.hasEOL};});
  }
  function multiplyTransform(first,second){
    var a=first[0],b=first[1],c=first[2],d=first[3],e=first[4],f=first[5];
    var g=second[0],h=second[1],i=second[2],j=second[3],k=second[4],l=second[5];
    return [a*g+c*h,b*g+d*h,a*i+c*j,b*i+d*j,a*k+c*l+e,b*k+d*l+f];
  }
  function imageBounds(matrix,pageWidth,pageHeight){
    var a=matrix[0],b=matrix[1],c=matrix[2],d=matrix[3],e=matrix[4],f=matrix[5];
    var xs=[e,a+e,c+e,a+c+e],ys=[f,b+f,d+f,b+d+f];
    var x=Math.max(0,Math.min(pageWidth,Math.min.apply(null,xs)));
    var right=Math.max(0,Math.min(pageWidth,Math.max.apply(null,xs)));
    var top=Math.max(0,Math.min(pageHeight,pageHeight-Math.max.apply(null,ys)));
    var bottom=Math.max(0,Math.min(pageHeight,pageHeight-Math.min.apply(null,ys)));
    return {x:x,y:top,width:Math.max(0,right-x),height:Math.max(0,bottom-top)};
  }
  function readImageObject(page,id){
    return new Promise(function(resolve){
      var done=false;
      var timer;
      function finish(value){if(done)return;done=true;clearTimeout(timer);resolve(value);}
      timer=setTimeout(function(){try{var common=page.commonObjs.get(id,finish);if(common)finish(common);else finish(null);}catch(e){finish(null);}},1500);
      try{var local=page.objs.get(id,finish);if(local)finish(local);}catch(e){try{var fallback=page.commonObjs.get(id,finish);if(fallback)finish(fallback);else finish(null);}catch(error){finish(null);}}
    });
  }
  function imageDataUri(image){
    if(!image||!image.width||!image.height||!image.data)return null;
    var width=image.width,height=image.height,data=image.data;
    var source=document.createElement("canvas");source.width=width;source.height=height;
    var sourceContext=source.getContext("2d");if(!sourceContext)return null;
    var pixels=sourceContext.createImageData(width,height);
    var imageKind=pdfjsLib.ImageKind||{};
    if(image.kind===imageKind.RGBA_32BPP||data.length>=width*height*4){pixels.data.set(data.subarray(0,width*height*4));}
    else if(image.kind===imageKind.RGB_24BPP||data.length>=width*height*3){for(var p=0,s=0;p<width*height;p++,s+=3){var t=p*4;pixels.data[t]=data[s];pixels.data[t+1]=data[s+1];pixels.data[t+2]=data[s+2];pixels.data[t+3]=255;}}
    else if(image.kind===imageKind.GRAYSCALE_1BPP){for(var n=0;n<width*height;n++){var gray=data[n>>3]&(1<<(7-(n&7)))?0:255;var at=n*4;pixels.data[at]=gray;pixels.data[at+1]=gray;pixels.data[at+2]=gray;pixels.data[at+3]=255;}}
    else{source.width=0;source.height=0;return null;}
    sourceContext.putImageData(pixels,0,0);
    var scale=Math.min(1,1400/Math.max(width,height));var output=document.createElement("canvas");output.width=Math.max(1,Math.round(width*scale));output.height=Math.max(1,Math.round(height*scale));
    var context=output.getContext("2d");if(!context)return null;context.fillStyle="#fff";context.fillRect(0,0,output.width,output.height);context.drawImage(source,0,0,output.width,output.height);
    var result=output.toDataURL("image/jpeg",.82);source.width=0;source.height=0;output.width=0;output.height=0;return result;
  }
  async function extractImages(page,list,width,height){
    var imageOps=[pdfjsLib.OPS.paintImageXObject,pdfjsLib.OPS.paintInlineImageXObject,pdfjsLib.OPS.paintImageMaskXObject,pdfjsLib.OPS.paintXObject];
    var matrix=[1,0,0,1,0,0],stack=[],candidates=[];
    for(var i=0;i<list.fnArray.length;i++){
      var op=list.fnArray[i],args=list.argsArray[i]||[];
      if(op===pdfjsLib.OPS.save){stack.push(matrix);matrix=matrix.slice();}
      else if(op===pdfjsLib.OPS.restore){matrix=stack.pop()||matrix;}
      else if(op===pdfjsLib.OPS.transform&&args.length>=6){matrix=multiplyTransform(matrix,args.slice(0,6).map(Number));}
      else if(imageOps.indexOf(op)>=0){
        var bounds=imageBounds(matrix,width,height);
        if(bounds.width<28||bounds.height<28)continue;
        candidates.push({source:typeof args[0]==="string"?readImageObject(page,args[0]):args[0],bounds:bounds});
      }
    }
    var resolved=await Promise.all(candidates.map(async function(candidate){var image=candidate.source instanceof Promise?await candidate.source:candidate.source;if(!image)return null;var src=imageDataUri(image);return src?Object.assign({src:src},candidate.bounds):null;}));
    return resolved.filter(function(image){return !!image;});
  }
  window.processPdf=async function(base64,id){
    operationId=id;cancelled=false;
    try{
      pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      var raw=window.atob(base64);var bytes=new Uint8Array(raw.length);for(var i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
      loadingTask=pdfjsLib.getDocument({data:bytes,cMapUrl:"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",cMapPacked:true});
      var pdf=await loadingTask.promise;check();
        for(var pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){
          check();currentPage=pageNumber;stage("getPage");
          var page=await pdf.getPage(pageNumber);
          try{check();stage("getTextContent");var text=await page.getTextContent();check();stage("getOperatorList");var operators=await page.getOperatorList();check();var viewport=page.getViewport({scale:1});
          stage("extractImages");
          var images=await extractImages(page,operators,viewport.width,viewport.height);
          check();stage("bridge");
          post({type:"page",page:{pageNumber:pageNumber,pageWidth:viewport.width,pageHeight:viewport.height,textItems:toTextItems(text.items),images:images}});
          post({type:"progress",currentPage:pageNumber,totalPages:pdf.numPages,imageCount:images.length});
          }finally{page.cleanup();}
        }
        check();stage("complete");
        post({type:"complete",totalPages:pdf.numPages});
    }catch(error){if(!cancelled)report(error);}
    finally{if(loadingTask){await loadingTask.destroy().catch(function(){});loadingTask=null;}}
  };
})();
</script></body></html>`;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 30, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(21,25,24,0.88)" },
  webView: { ...StyleSheet.absoluteFill, opacity: 0 },
  panel: { alignItems: "center", gap: 14, padding: 24, maxWidth: 360 },
  title: { color: "#F3E5C8", fontSize: 18, fontWeight: "600" },
  description: { color: "#D4C5A9", fontSize: 14, textAlign: "center" },
  cancel: { marginTop: 8, paddingVertical: 10, paddingHorizontal: 18 },
  cancelText: { color: "#F3E5C8", fontSize: 14, fontWeight: "600" },
  primaryAction: { marginTop: 10, borderRadius: 8, backgroundColor: "#B65F42", paddingVertical: 12, paddingHorizontal: 20 },
  primaryActionText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
