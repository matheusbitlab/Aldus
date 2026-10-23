/** Runs inside the existing reader closure; commands never replace the document. */
export function readerAnchorDocumentScript(): string {
  return `
  // Literal WebView source: Hermes Function.toString() is not executable source.
  // Domain parity is verified by test-reader-bytecode.cjs.
  function resolveStudyAnchor(text, anchor) {
    function fits(start) {
      return text.slice(start, start + anchor.quote.length) === anchor.quote &&
        (!anchor.prefix || text.slice(Math.max(0, start - anchor.prefix.length), start) === anchor.prefix) &&
        (!anchor.suffix || text.slice(start + anchor.quote.length, start + anchor.quote.length + anchor.suffix.length) === anchor.suffix);
    }
    var matches = [];
    if (!anchor.quote) return { status: "missing" };
    var offset = text.indexOf(anchor.quote);
    while (offset !== -1) {
      if (fits(offset)) matches.push(offset);
      if (matches.length > 1) return { status: "ambiguous" };
      offset = text.indexOf(anchor.quote, offset + 1);
    }
    if (!matches.length) return { status: "missing" };
    var start = matches[0];
    return { status: start === anchor.start ? "exact" : "relocated", start: start, end: start + anchor.quote.length };
  }
  function parseStudyAnchor(value) {
    if (!value || typeof value !== "object") throw new Error("Localização inválida.");
    var a = value;
    if (a.version !== 1) throw new Error("Versão de localização não suportada.");
    if (a.kind === "pdf-page") {
      if (!Number.isSafeInteger(a.sourcePage) || a.sourcePage < 1 || a.sourcePage > 1000000) throw new Error("Página fonte inválida.");
      return { version: 1, kind: "pdf-page", sourcePage: a.sourcePage };
    }
    if (a.kind !== "epub-text" || typeof a.chapterId !== "string" || !a.chapterId || a.chapterId.length > 2000 ||
        !Number.isSafeInteger(a.start) || a.start < 0 || !Number.isSafeInteger(a.end) || a.end <= a.start ||
        typeof a.quote !== "string" || !a.quote.trim() || a.quote.length > 10000 || a.end - a.start !== a.quote.length ||
        typeof a.prefix !== "string" || a.prefix.length > 128 || typeof a.suffix !== "string" || a.suffix.length > 128 ||
        !Array.isArray(a.path) || a.path.length > 100 || a.path.some(function(v) { return !Number.isSafeInteger(v) || v < 0; })) throw new Error("Localização textual inválida.");
    return { version: 1, kind: "epub-text", chapterId: a.chapterId, start: a.start, end: a.end, quote: a.quote, prefix: a.prefix, suffix: a.suffix, path: a.path };
  }
  function studyReply(request, extra) {
    var payload = JSON.stringify(Object.assign({type:'study', id:request.id}, extra));
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(payload);
    if (window.parent !== window) window.parent.postMessage(payload, '*');
  }
  var studyTextCache = null;
  function studyText(section) {
    if (studyTextCache && studyTextCache.section === section) return studyTextCache.model;
    var walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
    var nodes = [], text = '', node;
    while ((node = walker.nextNode())) {
      if (node.parentElement.closest('style,script')) continue;
      nodes.push({node:node, start:text.length}); text += node.textContent;
    }
    var model = {text:text,nodes:nodes};
    // The reader's text DOM is immutable; retain only the current chapter model.
    studyTextCache = {section:section,model:model};
    return model;
  }
  function studyRange(model, start, end) {
    var range=document.createRange(), first, last;
    for(var i=0;i<model.nodes.length;i++) {
      var entry=model.nodes[i], limit=entry.start+entry.node.length;
      if(!first && start>=entry.start && start<limit) first={node:entry.node,offset:start-entry.start};
      if(end>entry.start && end<=limit) {last={node:entry.node,offset:end-entry.start}; break;}
    }
    if(!first || !last) return null;
    range.setStart(first.node,first.offset);range.setEnd(last.node,last.offset);return range;
  }
  function studyVisibleAnchor() {
    if(isAnimating || restorationPending || getPageWidth()<=0) throw new Error('Aguarde a página terminar de carregar.');
    var sections=content.querySelectorAll('.epub-chapter'), width=getPageWidth(), height=getPageHeight();
    for(var s=0;s<sections.length;s++) {
      var section=sections[s], bounds=section.getBoundingClientRect();
      if (bounds.right<=0 || bounds.left>=width) continue;
      var model=studyText(section);
      for(var n=0;n<model.nodes.length;n++) {
        var entry=model.nodes[n];if(!entry.node.textContent.trim()) continue;
        var full=document.createRange();full.selectNodeContents(entry.node);
        var visible=Array.from(full.getClientRects()).some(function(r){return r.right>0 && r.left<width && r.bottom>0 && r.top<height;});
        if(!visible) continue;
        var low=0,high=entry.node.length;
        while(low<high){var mid=Math.floor((low+high)/2),r=document.createRange();r.setStart(entry.node,mid);r.setEnd(entry.node,mid+1);var rect=r.getBoundingClientRect();if(rect.right<=0)low=mid+1;else high=mid;}
        var start=entry.start+low;
        while(start<model.text.length && !model.text[start].trim())start++;
        var quote=model.text.slice(start,start+160);if(!quote.trim())continue;
        var path=[],node=entry.node;while(node && node!==section){path.unshift(Array.prototype.indexOf.call(node.parentNode.childNodes,node));node=node.parentNode;}
        return {version:1,kind:'epub-text',chapterId:section.getAttribute('data-chapter-id'),start:start,end:start+quote.length,quote:quote,prefix:model.text.slice(Math.max(0,start-64),start),suffix:model.text.slice(start+quote.length,start+quote.length+64),path:path};
      }
    }
    throw new Error('Não há texto localizável nesta página. Use outra página para criar o marcador.');
  }
  window.readerStudy = function(request) {
    try {
      if(request.type==='studySelection') {
        window.__studySelectionRequest=request.enabled?request:null;
        var selectionStyle=document.getElementById('reader-study-selection');
        if(!selectionStyle){selectionStyle=document.createElement('style');selectionStyle.id='reader-study-selection';document.head.appendChild(selectionStyle);}
        selectionStyle.textContent=request.enabled?'html,body,#reader-content,#reader-content * { user-select:text!important; -webkit-user-select:text!important; }':'';
        return;
      }
      if(request.type==='studyRenderHighlights') {
        if(!window.CSS || !CSS.highlights || !window.Highlight){studyReply(request,{status:'unsupported',message:'Este motor não exibe grifos sobre o texto. Seus grifos e notas continuam disponíveis no painel.'});return;}
        var colors={yellow:'#ffdd6680',green:'#70d59080',blue:'#7ac5ff80',pink:'#ff9ecb80',purple:'#c7a0ff80'}, rules='',missing=0,ambiguous=0;
        (window.__studyHighlightKeys||[]).forEach(function(key){CSS.highlights.delete(key);});window.__studyHighlightKeys=[];
        (request.highlights||[]).forEach(function(h,index){
          var location,a;try{location=JSON.parse(h.startCfi);a=parseStudyAnchor(location.anchor);}catch(error){missing++;return;}
          if(location.format!=='kindle-study-highlight'||location.version!==1||a.kind!=='epub-text'||a.chapterId!==h.chapterId||a.quote!==h.highlightedText){missing++;return;}
          var section=Array.from(content.querySelectorAll('.epub-chapter')).find(function(s){return s.getAttribute('data-chapter-id')===a.chapterId;});
          if(!section){missing++;return;}var model=studyText(section),resolved=resolveStudyAnchor(model.text,a);
          if(resolved.status==='ambiguous'){ambiguous++;return;}if(resolved.status==='missing'){missing++;return;}
          var range=studyRange(model,resolved.start,resolved.end);if(!range){missing++;return;}
          var key='aldus-study-'+index;CSS.highlights.set(key,new Highlight(range));window.__studyHighlightKeys.push(key);rules+='::highlight('+key+'){background-color:'+(colors[h.colorLabel]||colors.yellow)+';}';
        });
        var style=document.getElementById('reader-study-highlights');if(!style){style=document.createElement('style');style.id='reader-study-highlights';document.head.appendChild(style);}style.textContent=rules;
        studyReply(request,{status:'rendered',missing:missing,ambiguous:ambiguous});return;
      }
      if(request.type==='studyCapture'){studyReply(request,{status:'captured',anchor:studyVisibleAnchor()});return;}
      if(request.type!=='studyNavigate')return;
      if(isAnimating || restorationPending || getPageWidth()<=0)throw new Error('Aguarde a página terminar de carregar.');
      var a=parseStudyAnchor(request.anchor);
      if(a.kind!=='epub-text')throw new Error('Esta localização não é um trecho de texto.');
      var section=Array.from(content.querySelectorAll('.epub-chapter')).find(function(s){return s.getAttribute('data-chapter-id')===a.chapterId;});
      if(!section){studyReply(request,{status:'missing'});return;}
      var model=studyText(section),resolved=resolveStudyAnchor(model.text,a);
      if(resolved.status==='missing'||resolved.status==='ambiguous'){studyReply(request,resolved);return;}
      var range=studyRange(model,resolved.start,resolved.end);
      if(!range){studyReply(request,{status:'missing'});return;}
      var rect=range.getClientRects()[0],page=Math.floor((rect.left+(currentPage-1)*getPageWidth())/getPageWidth())+1;
      studyReply(request,{status:resolved.status,pageNumber:page});window.goToPage(page);
    }catch(error){studyReply(request,{status:'error',message:error.message});}
  };
  window.addEventListener('message',function(event){
    if(window.parent!==window && event.source!==window.parent)return;
    try{var request=typeof event.data==='string'?JSON.parse(event.data):event.data;if(request && /^study/.test(request.type))window.readerStudy(request);}catch(error){}
  });
  document.addEventListener('pointerup',function(){
    var request=window.__studySelectionRequest;if(!request)return;
    requestAnimationFrame(function(){
      if(window.__studySelectionRequest!==request)return;
      var selection=window.getSelection();if(!selection || selection.isCollapsed || !selection.rangeCount)return;
      try {
        var range=selection.getRangeAt(0),startNode=range.startContainer,endNode=range.endContainer;
        if(startNode.nodeType!==3 || endNode.nodeType!==3)throw new Error('Selecione um trecho de texto dentro do capítulo.');
        var section=startNode.parentElement.closest('.epub-chapter');
        if(!section || section!==endNode.parentElement.closest('.epub-chapter'))throw new Error('Selecione um trecho dentro de um único capítulo.');
        var model=studyText(section),first=model.nodes.find(function(e){return e.node===startNode;}),last=model.nodes.find(function(e){return e.node===endNode;});
        if(!first || !last)throw new Error('Este trecho não pode ser selecionado.');
        var start=first.start+range.startOffset,end=last.start+range.endOffset,quote=model.text.slice(start,end);
        if(!quote.trim()||quote.length>10000)throw new Error('Selecione de 1 a 10 mil caracteres.');
        var path=[],node=startNode;while(node && node!==section){path.unshift(Array.prototype.indexOf.call(node.parentNode.childNodes,node));node=node.parentNode;}
        window.__studySelectionRequest=null;
        studyReply(request,{status:'captured',anchor:{version:1,kind:'epub-text',chapterId:section.getAttribute('data-chapter-id'),start:start,end:end,quote:quote,prefix:model.text.slice(Math.max(0,start-64),start),suffix:model.text.slice(end,end+64),path:path}});
      }catch(error){studyReply(request,{status:'error',message:error.message});}
    });
  });
  `;
}
