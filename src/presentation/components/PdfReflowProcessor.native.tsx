import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import * as FileSystem from "expo-file-system/legacy";
import { PdfReflowDocument, PdfReflowPageData } from "@/src/domain/types/pdfReader";
import { buildPdfReflowDocument } from "@/src/data/local/PdfReflowDocumentBuilder";
import { PdfReflowProgress, PdfReflowProcessorProps } from "@/src/presentation/components/PdfReflowProcessorProps";

export function PdfReflowProcessor({ uri, onProgress, onComplete, onError, onCancel }: PdfReflowProcessorProps) {
  const webView = useRef<WebView>(null);
  const pages = useRef<PdfReflowPageData[]>([]);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [progress, setProgress] = useState<PdfReflowProgress>({ currentPage: 0, totalPages: 0 });
  const source = useMemo(() => ({ html: getProcessorHtml(), baseUrl: "https://kindle-reader.local/" }), []);

  useEffect(() => {
    let active = true;
    pages.current = [];
    setProgress({ currentPage: 0, totalPages: 0 });
    setPdfBase64(null);

    void (async () => {
      try {
        const base64 = uri.startsWith("data:application/pdf;base64,")
          ? uri.split(",", 2)[1]
          : uri.startsWith("file://") || uri.startsWith("content://") || !uri.includes("://")
          ? await FileSystem.readAsStringAsync(uri, { encoding: "base64" } as never)
          : await readRemotePdf(uri);
        if (active) setPdfBase64(base64);
      } catch (failure) {
        if (active) onError(failure instanceof Error ? failure.message : "Não foi possível ler o PDF neste dispositivo.");
      }
    })();

    return () => {
      active = false;
    };
  }, [uri, onError]);

  const handleWebViewLoaded = () => {
    if (pdfBase64) {
      webView.current?.injectJavaScript(
        `window.processPdf && window.processPdf(${JSON.stringify(pdfBase64)}); true;`
      );
    }
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        page?: PdfReflowPageData;
        currentPage?: number;
        totalPages?: number;
        imageCount?: number;
        message?: string;
      };
      if (message.type === "page" && message.page) {
        pages.current.push(message.page);
      } else if (message.type === "progress") {
        const nextProgress = {
          currentPage: message.currentPage ?? 0,
          totalPages: message.totalPages ?? 0,
          imageCount: message.imageCount ?? 0,
        };
        setProgress(nextProgress);
        onProgress(nextProgress);
      } else if (message.type === "complete" && message.totalPages) {
        const document = buildPdfReflowDocument(pages.current, message.totalPages);
        onComplete(document);
      } else if (message.type === "error") {
        onError(message.message ?? "Não foi possível extrair o conteúdo deste PDF.");
      }
    } catch {
      onError("O processador PDF retornou dados inválidos.");
    }
  };

  const percentage = progress.totalPages > 0
    ? Math.round((progress.currentPage / progress.totalPages) * 100)
    : 0;

  return (
    <View style={styles.overlay}>
      {pdfBase64 ? (
        <WebView
          ref={webView}
          source={source}
          style={styles.webView}
          originWhitelist={["*"]}
          javaScriptEnabled
          onLoadEnd={handleWebViewLoaded}
          onMessage={handleMessage}
        />
      ) : null}
      <View style={styles.panel}>
        <ActivityIndicator size="large" color="#B65F42" />
        <Text style={styles.title}>Preparando leitura livre</Text>
        <Text style={styles.description}>
          {progress.totalPages > 0
            ? `Analisando página ${progress.currentPage} de ${progress.totalPages} (${percentage}%) · ${progress.imageCount ?? 0} ilustrações`
            : "Abrindo PDF para análise..."}
        </Text>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
      </View>
    </View>
  );
}

async function readRemotePdf(uri: string): Promise<string> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error("Não foi possível baixar o PDF para análise.");
  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler o PDF."));
    reader.readAsDataURL(blob);
  });
  return dataUrl.split(",", 2)[1] ?? "";
}

function getProcessorHtml(): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script></head><body>
<script>
(function(){
  function post(value){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(value));}
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
  window.processPdf=function(base64){
    try{
      pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      var raw=window.atob(base64);var bytes=new Uint8Array(raw.length);for(var i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
      pdfjsLib.getDocument({data:bytes,cMapUrl:"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",cMapPacked:true}).promise.then(async function(pdf){
        for(var pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){
          var page=await pdf.getPage(pageNumber);var text=await page.getTextContent();var operators=await page.getOperatorList();var viewport=page.getViewport({scale:1});
          var images=await extractImages(page,operators,viewport.width,viewport.height);
          post({type:"page",page:{pageNumber:pageNumber,pageWidth:viewport.width,pageHeight:viewport.height,textItems:toTextItems(text.items),images:images}});
          post({type:"progress",currentPage:pageNumber,totalPages:pdf.numPages,imageCount:images.length});
        }
        post({type:"complete",totalPages:pdf.numPages});
      }).catch(function(error){post({type:"error",message:error.message});});
    }catch(error){post({type:"error",message:error.message});}
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
});