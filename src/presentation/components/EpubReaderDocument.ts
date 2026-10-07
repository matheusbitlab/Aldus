import { StoredChapter } from "@/src/domain/entities/LibraryBook";
import { readerAnchorDocumentScript } from "@/src/presentation/components/ReaderAnchorDocument";

export interface ReaderDocumentOptions {
  initialRestorePending?: boolean;
  fontSize: number;
  fontFamily: string;
  marginSize: number;
  lineHeight?: number;
  paragraphSpacing?: number;
  maxWidth?: number;
  alignment?: "left" | "justify";
  allowTextSelection?: boolean;
  textColor: string;
  backgroundColor: string;
}

export function createEpubReaderDocument(chapters: StoredChapter[], options: ReaderDocumentOptions): string {
  const sections = chapters.map((chapter, index) => {
    const rawBody = chapter.html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? chapter.html.replace(/<\/?(?:html|head|body|\?xml)[^>]*>/gi, "");
    const chapterStyles = [...chapter.html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => `<style>${match[1]}</style>`).join("");
    const safeBody = rawBody
      .replace(/<(?:script|iframe|form|object|embed|meta|base)\b[^>]*>[\s\S]*?<\/(?:script|iframe|form|object|embed|meta|base)>/gi, "")
      .replace(/<(?:script|iframe|form|object|embed|meta|base|link)\b[^>]*\/?\s*>/gi, "")
      .replace(/\s+on[a-z][\w:-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .replace(/\s+(?:href|src|xlink:href|action|formaction)\s*=\s*(["']?)\s*(?:javascript:|vbscript:|data:text\/html)[^\s>]*\1/gi, "")
      .replace(/<img\b([^>]*?)>/gi, (_match, attrs) => {
        const inlinePdfImage = /\bdata-pdf-reflow-image(?:\s|=|$)/i.test(attrs);
        const loading = inlinePdfImage ? "eager" : "lazy";
        return `<img ${attrs} onerror="this.dataset.epubError='true'" loading="${loading}" />`;
      });
    return `<section id="epub-chapter-${index}" class="epub-chapter" data-chapter-id="${escapeAttribute(chapter.id)}" data-chapter-index="${index}" data-chapter-title="${escapeAttribute(chapter.title)}">${chapterStyles}${safeBody}</section>`;
  }).join("\n");

  const pagePadding = Math.max(16, Math.min(48, Math.round(options.marginSize)));
  const safeFont = readerCssFontFamily(options.fontFamily);
  const safeTextColor = /^#[\da-f]{3,8}$/i.test(options.textColor) ? options.textColor : "#2b2b2b";
  const safeBackgroundColor = /^#[\da-f]{3,8}$/i.test(options.backgroundColor) ? options.backgroundColor : "#f5ebd9";
  const lineHeight = Math.max(1.1, Math.min(2.4, options.lineHeight ?? 1.65));
  const paragraphSpacing = Math.max(0, Math.min(2, options.paragraphSpacing ?? 1));
  const maxWidth = Math.max(320, Math.min(1200, options.maxWidth ?? 900));
  const alignment = options.alignment === "justify" ? "justify" : "left";
  const textSelection = options.allowTextSelection ? "text" : "none";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; frame-src 'none'; form-action 'none'">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<style id="base-reader-styles">
  *, *::before, *::after {
    box-sizing: border-box !important;
  }
  html, body {
    width: 100% !important;
    height: 100% !important;
    min-width: 100% !important;
    min-height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
    user-select: ${textSelection};
    -webkit-user-select: ${textSelection};
    background-color: ${safeBackgroundColor} !important;
    color: ${safeTextColor} !important;
    touch-action: pan-y;
  }
  #reader-viewport {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    min-width: 100% !important;
    min-height: 100% !important;
    overflow: hidden !important;
    box-sizing: border-box !important;
  }
  #reader-content {
    width: 100% !important;
    height: 100% !important;
    min-width: 100% !important;
    min-height: 100% !important;
    box-sizing: border-box !important;
    column-width: 100vw !important;
    column-gap: 0px !important;
    column-fill: auto !important;
    overflow: visible !important;
    transition: none;
    transform: translateX(0);
  }
  #reader-content.is-transitioning {
    transition: transform 0.24s cubic-bezier(0.25, 1, 0.5, 1);
  }
  .epub-chapter {
    width: 100% !important;
    max-width: 100% !important;
    display: block !important;
    box-sizing: border-box !important;
    padding: 24px ${pagePadding}px 32px ${pagePadding}px !important;
    break-inside: auto !important;
    color: inherit !important;
    background: transparent !important;
    background-color: transparent !important;
  }
  .epub-chapter > * {
    max-width: min(100%, ${maxWidth}px) !important;
    margin-left: auto !important;
    margin-right: auto !important;
    text-align: ${alignment} !important;
  }
  .reader-toc {
    width: 100%;
    margin: 0 auto 1.5em auto;
    padding: 0;
  }
  .reader-toc ol {
    padding-left: 1.4em;
  }
  .reader-toc li {
    margin: 0 0 0.55em 0;
    break-inside: avoid;
  }
  figure {
    width: 100%;
    margin: 1em auto;
    padding: 0;
    text-align: center;
    break-inside: avoid;
  }
  figure.pdf-reflow-drop-cap {
    float: left;
    width: 3.3em !important;
    max-width: 24% !important;
    margin: 0.12em 0.55em 0.12em 0 !important;
    text-align: left;
    break-inside: auto;
  }
  figure.pdf-reflow-drop-cap img {
    display: block;
    width: 100% !important;
    max-width: 100% !important;
    max-height: 10em !important;
    height: auto !important;
    margin: 0 !important;
    object-fit: contain !important;
  }
  .epub-chapter *,
  .epub-chapter p,
  .epub-chapter div,
  .epub-chapter span,
  .epub-chapter li,
  .epub-chapter a,
  .epub-chapter h1,
  .epub-chapter h2,
  .epub-chapter h3,
  .epub-chapter h4,
  .epub-chapter h5,
  .epub-chapter h6 {
    color: inherit !important;
    background: transparent !important;
    background-color: transparent !important;
    box-sizing: border-box !important;
  }
  p, div, span, li, blockquote {
    word-break: break-word !important;
    overflow-wrap: break-word !important;
    hyphens: auto;
  }
  img, svg, picture {
    max-width: 100% !important;
      max-height: min(80vh, calc(var(--reader-page-height, 100vh) * 0.88)) !important;
      width: auto;
      height: auto;
    object-fit: contain !important;
    display: block;
    margin: 12px auto;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  table, pre {
    max-width: 100% !important;
    overflow-x: auto;
    break-inside: avoid;
  }
  h1, h2, h3, h4, h5, h6 {
      column-width: 100% !important;
    page-break-after: avoid;
    line-height: 1.3;
  }
  p {
    margin: 0 0 ${paragraphSpacing}em 0;
    orphans: 2;
    widows: 2;
  }
  a {
    color: inherit;
    text-decoration: underline;
    opacity: 0.85;
  }
</style>
<style id="dynamic-typography">
  *, body, p, div, span, li, blockquote, h1, h2, h3, h4, h5, h6 {
    font-family: ${safeFont} !important;
    color: ${safeTextColor} !important;
  }
  p, div, span, li, blockquote {
    font-size: ${options.fontSize}px !important;
    line-height: ${Math.round(options.fontSize * lineHeight)}px !important;
  }
  body, html, #reader-viewport {
    background-color: ${safeBackgroundColor} !important;
  }
</style>
</head>
<body>
<div id="reader-viewport">
  <div id="reader-content">${sections}</div>
</div>
<script>
(function() {
  var readerCssFontFamily = ${readerCssFontFamily.toString()};
  // Keep the high-volume forensic trace opt-in.
  var console = {
    log: function() {
      try {
        if (window.localStorage.getItem("epubCenterResetDiagnostics") === "1") {
          window.console.log.apply(window.console, arguments);
        }
      } catch {}
    }
  };
  var content = document.getElementById("reader-content");
  var viewport = document.getElementById("reader-viewport");
  var currentPage = 1;
  var totalPages = 1;
  var currentChapterIndex = 0;
  var currentChapterTitle = "";
  var lastReportedKey = "";
  var isAnimating = false;
  var transitionDirection = 0;
  var targetPage = 1;
  var deferredPage = null;
  var recalculateAfterTransition = false;
  var layoutFrame = 0;
  var initialLayoutReady = false;
  var initialLayoutReadinessScheduled = false;
  var restorationPending = ${options.initialRestorePending ? "true" : "false"};
  console.log('[FORENSIC:iframe:init] t=' + (performance.timeOrigin + performance.now()) + ' initial currentPage=' + currentPage + ' targetPage=' + targetPage + ' totalPages=' + totalPages + ' width=' + getPageWidth() + ' height=' + getPageHeight());

  function getPageWidth() {
    return viewport && viewport.clientWidth || document.documentElement.clientWidth || window.innerWidth || 360;
  }

  ${readerAnchorDocumentScript()}

  function getPageHeight() {
    return viewport && viewport.clientHeight || document.documentElement.clientHeight || window.innerHeight || 640;
  }

  function syncPageDimensions() {
    if (!content || !viewport) return;
    content.style.setProperty("--reader-page-height", getPageHeight() + "px");
  }

  function calculateTotalPages() {
    var width = getPageWidth();
    if (!content || width <= 0) return 1;
    var scrollW = content.scrollWidth;
    return Math.max(1, Math.ceil(scrollW / width));
  }

  function sendPageState() {
    var pageBeforeClamp = currentPage;
    var widthBeforeMeasure = getPageWidth();
    totalPages = calculateTotalPages();
    currentPage = Math.max(1, Math.min(totalPages, currentPage));
    console.log('[FORENSIC:iframe:sendPageState] t=' + (performance.timeOrigin + performance.now()) + ' pageBeforeClamp=' + pageBeforeClamp + ' pageAfterClamp=' + currentPage + ' totalPages=' + totalPages + ' layoutReady=' + initialLayoutReady + ' restorePending=' + restorationPending + ' width=' + widthBeforeMeasure + ' scrollWidth=' + content.scrollWidth);

    var width = getPageWidth();
    var offset = (currentPage - 1) * width;

    // Detect active chapter
    var chapters = document.querySelectorAll(".epub-chapter");
    var chapterLocations = [];
    chapters.forEach(function(section, index) {
      var rect = section.getBoundingClientRect();
      var startPage = Math.max(1, Math.min(totalPages, Math.floor(Math.max(0, rect.left + offset) / width) + 1));
      chapterLocations.push({
        chapterIndex: index,
        pageNumber: startPage,
        title: section.getAttribute("data-chapter-title") || ""
      });
      if (rect.left <= width * 0.5) {
        currentChapterIndex = index;
        currentChapterTitle = section.getAttribute("data-chapter-title") || "";
      }
    });

    var state = {
      type: "page",
      pageNumber: currentPage,
      totalPages: totalPages,
      chapterIndex: currentChapterIndex,
      chapterTitle: currentChapterTitle,
      layoutReady: initialLayoutReady,
      chapterLocations: chapterLocations
    };

    var key = JSON.stringify(state);
    if (key === lastReportedKey) return;
    lastReportedKey = key;

    var message = JSON.stringify(state);
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(message);
    }
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, "*");
    }
  }

  function recalculateLayout() {
    var reason = arguments.length ? arguments[0] : 'unspecified';
    if (!content) return;
    if (isAnimating) {
      recalculateAfterTransition = true;
      console.log('[FORENSIC:iframe:recalculateLayout] t=' + (performance.timeOrigin + performance.now()) + ' deferred during animation reason=' + reason + ' currentPage=' + currentPage + ' targetPage=' + targetPage);
      return;
    }
    var currentLayoutFrame = ++layoutFrame;
    console.log('[FORENSIC:iframe:recalculateLayout] t=' + (performance.timeOrigin + performance.now()) + ' reason=' + reason + ' pageAtSchedule=' + currentPage + ' totalBefore=' + totalPages + ' width=' + getPageWidth() + ' scrollWidth=' + content.scrollWidth);
    requestAnimationFrame(function() {
      if (currentLayoutFrame !== layoutFrame) return;
      if (isAnimating) {
        recalculateAfterTransition = true;
        console.log('[FORENSIC:iframe:recalculateLayout:raf] deferred reason=' + reason + ' currentPage=' + currentPage + ' targetPage=' + targetPage);
        return;
      }
      // Read the logical page when the new layout is committed. Capturing it
      // when scheduling the frame can replay page 1 after initial restoration.
      var pageToPreserve = currentPage;
      totalPages = calculateTotalPages();
      var targetPage = Math.max(1, Math.min(totalPages, pageToPreserve));
      console.log('[FORENSIC:iframe:recalculateLayout:raf] t=' + (performance.timeOrigin + performance.now()) + ' reason=' + reason + ' totalPages=' + totalPages + ' pageToPreserve=' + pageToPreserve + ' → targetPage=' + targetPage);
      window.goToPage(targetPage);
    });
  }

  window.goToPage = function(page) {
    totalPages = calculateTotalPages();
    var requestedPage = Math.max(1, Math.min(totalPages, page));
    console.log('[FORENSIC:iframe:goToPage] t=' + (performance.timeOrigin + performance.now()) + ' requested=' + page + ' actual=' + requestedPage + ' totalPages=' + totalPages + ' currentPage=' + currentPage + ' targetPage=' + targetPage + ' width=' + getPageWidth() + ' scrollWidth=' + content.scrollWidth + ' stack=' + (new Error().stack || '').replace(/\\n/g, ' | '));
    if (isAnimating) {
      deferredPage = requestedPage;
      return;
    }
    currentPage = requestedPage;
    targetPage = currentPage;
    transitionDirection = 0;
    content.classList.remove("is-transitioning");
    var width = getPageWidth();
    content.style.transform = "translateX(-" + ((currentPage - 1) * width) + "px)";
    sendPageState();
  };

  function finishNavigation() {
    if (!isAnimating) return;
    console.log('[FORENSIC:iframe:transitionend] t=' + (performance.timeOrigin + performance.now()) + ' currentPage=' + currentPage + ' targetPage=' + targetPage);
    content.classList.remove("is-transitioning");
    currentPage = targetPage;
    targetPage = currentPage;
    transitionDirection = 0;
    isAnimating = false;
    sendPageState();

    if (deferredPage !== null) {
      var page = deferredPage;
      deferredPage = null;
      window.goToPage(page);
    } else if (recalculateAfterTransition) {
      recalculateAfterTransition = false;
      recalculateLayout('deferred-after-transitionend');
    }
  }

  content.addEventListener("transitionend", function(event) {
    if (event.target === content && event.propertyName === "transform") finishNavigation();
  });

  window.navigatePage = function(direction) {
    if (isAnimating || (direction !== -1 && direction !== 1)) return;
    totalPages = calculateTotalPages();
    transitionDirection = direction;
    targetPage = Math.max(1, Math.min(totalPages, currentPage + transitionDirection));
    console.log('[FORENSIC:iframe:navigatePage] t=' + (performance.timeOrigin + performance.now()) + ' direction=' + direction + ' currentPage=' + currentPage + ' targetPage=' + targetPage + ' totalPages=' + totalPages);
    if (targetPage === currentPage) {
      transitionDirection = 0;
      return;
    }

    isAnimating = true;
    content.classList.add("is-transitioning");
    content.style.transform = "translateX(-" + ((targetPage - 1) * getPageWidth()) + "px)";

    var duration = getComputedStyle(content).transitionDuration.split(",")[0].trim();
    if (duration === "0s" || duration === "0ms") finishNavigation();
  };

  window.display = function() {
    var width = getPageWidth();
    console.log('[FORENSIC:iframe:display] t=' + (performance.timeOrigin + performance.now()) + ' called, width=' + width + ' currentPage=' + currentPage);
    if (!width || width <= 0) {
      requestAnimationFrame(window.display);
      return;
    }
    syncPageDimensions();
    totalPages = calculateTotalPages();
    window.goToPage(currentPage);
  };

  window.searchText = function(query) {
    var term = String(query || "").trim();
    if (!term) return;
    var found = window.find(term, false, false, true, false, false, false);
    if (found) {
      var selection = window.getSelection();
      var rect = selection && selection.rangeCount ? selection.getRangeAt(0).getBoundingClientRect() : null;
      var page = rect ? Math.floor(Math.max(0, rect.left + (currentPage - 1) * getPageWidth()) / getPageWidth()) + 1 : currentPage;
      window.goToPage(page);
    }
    var result = JSON.stringify({ type: "searchResult", found: found });
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) window.ReactNativeWebView.postMessage(result);
    if (window.parent && window.parent !== window) window.parent.postMessage(result, "*");
  };

  window.updateTypography = function(options) {
    if (!options) return;
    console.log('[FORENSIC:iframe:updateTypography] t=' + (performance.timeOrigin + performance.now()) + ' currentPage=' + currentPage + ' totalPages=' + totalPages);
    var dynamicStyle = document.getElementById("dynamic-typography");
    if (!dynamicStyle) {
      dynamicStyle = document.createElement("style");
      dynamicStyle.id = "dynamic-typography";
      document.head.appendChild(dynamicStyle);
    }

    var font = readerCssFontFamily(options.fontFamily || "Georgia");
    var size = options.fontSize || 16;
    var lineH = Math.round(size * Math.max(1.1, Math.min(2.4, options.lineHeight || 1.65)));
    var color = options.textColor || "#2b2b2b";
    var bg = options.backgroundColor || "#f5ebd9";
    var margin = Math.max(16, Math.min(48, Math.round(options.marginSize || 20)));
    var paragraphSpacing = Math.max(0, Math.min(2, options.paragraphSpacing ?? 1));
    var maxWidth = Math.max(320, Math.min(1200, options.maxWidth || 900));
    var alignment = options.alignment === "justify" ? "justify" : "left";
    var textSelection = options.allowTextSelection ? "text" : "none";

    dynamicStyle.innerHTML =
      "*, body, p, div, span, li, blockquote, h1, h2, h3, h4, h5, h6 { " +
        "font-family: " + font + " !important; " +
        "color: " + color + " !important; " +
      "} " +
      "p, div, span, li, blockquote { " +
        "font-size: " + size + "px !important; " +
        "line-height: " + lineH + "px !important; " +
        "text-align: " + alignment + " !important; " +
      "} " +
      "p { margin-bottom: " + paragraphSpacing + "em !important; } " +
      ".epub-chapter > * { max-width: min(100%, " + maxWidth + "px) !important; margin-left: auto !important; margin-right: auto !important; " +
      "} " +
      "html, body { user-select: " + textSelection + " !important; -webkit-user-select: " + textSelection + " !important; } " +
      "::selection { background: " + color + " !important; color: " + bg + " !important; } " +
      "body, html, #reader-viewport { " +
        "background-color: " + bg + " !important; " +
      "} " +
      ".epub-chapter { " +
        "padding: 24px " + margin + "px 32px " + margin + "px !important; " +
        "color: inherit !important; " +
        "background: transparent !important; " +
      "} " +
      ".epub-chapter * { " +
        "color: inherit !important; " +
        "background: transparent !important; " +
      "}";

    // Keep the established typography path for normal reading. During the
    // restore handshake, wait for fonts/layout and never replay a page captured
    // before the saved position was applied.
    if (!restorationPending) {
      var pageToPreserve = currentPage;
      console.log('[FORENSIC:iframe:updateTypography] scheduled layout update t=' + (performance.timeOrigin + performance.now()) + ' pageToPreserve=' + pageToPreserve);
      setTimeout(function() {
        if (isAnimating) {
          recalculateAfterTransition = true;
          console.log('[FORENSIC:iframe:updateTypography] deferred during animation currentPage=' + currentPage + ' targetPage=' + targetPage);
          return;
        }
        syncPageDimensions();
        totalPages = calculateTotalPages();
        var typographyTargetPage = Math.max(1, Math.min(totalPages, pageToPreserve));
        console.log('[FORENSIC:iframe:updateTypography:apply] t=' + (performance.timeOrigin + performance.now()) + ' pageToPreserve=' + pageToPreserve + ' measuredTotal=' + totalPages + ' target=' + typographyTargetPage);
        window.goToPage(typographyTargetPage);
      }, 60);
      return;
    }

    console.log('[FORENSIC:iframe:updateTypography] waiting for fonts/layout t=' + (performance.timeOrigin + performance.now()) + ' currentPage=' + currentPage + ' restorePending=true');
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fontsReady.then(function() {
      requestAnimationFrame(function() {
        if (isAnimating) {
          recalculateAfterTransition = true;
          console.log('[FORENSIC:iframe:updateTypography] deferred during animation currentPage=' + currentPage + ' targetPage=' + targetPage);
          return;
        }
        syncPageDimensions();
        if (restorationPending) {
          recalculateLayout('typography-during-restore');
          return;
        }
        var pageToPreserve = currentPage;
        totalPages = calculateTotalPages();
        var typographyTargetPage = Math.max(1, Math.min(totalPages, pageToPreserve));
        console.log('[FORENSIC:iframe:updateTypography:apply] t=' + (performance.timeOrigin + performance.now()) + ' pageToPreserve=' + pageToPreserve + ' measuredTotal=' + totalPages + ' target=' + typographyTargetPage);
        window.goToPage(typographyTargetPage);
      });
    });
  };

  function handleMessage(event) {
    var data = event.data;
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch(e) { return; }
    }
    if (!data) return;
    console.log('[FORENSIC:iframe:message] t=' + (performance.timeOrigin + performance.now()) + ' type=' + data.type + ' pageNumber=' + (data.pageNumber === undefined ? '' : data.pageNumber) + ' direction=' + (data.direction === undefined ? '' : data.direction));
    if (data.type === "beginInitialRestore") {
      restorationPending = true;
      console.log('[FORENSIC:iframe:restore] t=' + (performance.timeOrigin + performance.now()) + ' began; currentPage=' + currentPage + ' totalPages=' + totalPages);
      lastReportedKey = "";
      sendPageState();
    } else if (data.type === "completeInitialRestore") {
      restorationPending = false;
      console.log('[FORENSIC:iframe:restore] t=' + (performance.timeOrigin + performance.now()) + ' confirmed; currentPage=' + currentPage + ' totalPages=' + totalPages);
    } else if (data.type === "goToPage" && typeof data.pageNumber === "number") {
      window.goToPage(data.pageNumber);
    } else if (data.type === "navigatePage" && typeof data.direction === "number") {
      window.navigatePage(data.direction);
    } else if (data.type === "search" && typeof data.query === "string") {
      window.searchText(data.query);
    } else if (data.type === "display") {
      window.display();
    } else if (data.type === "updateTypography") {
      window.updateTypography(data);
    }
  }

  document.addEventListener("click", function(event) {
    var target = event.target;
    var link = target && target.closest ? target.closest('a[href^="#epub-chapter-"]') : null;
    if (!link) return;
    var chapter = document.getElementById(link.getAttribute("href").slice(1));
    if (!chapter) return;
    event.preventDefault();
    var width = getPageWidth();
    var baseLeft = chapter.getBoundingClientRect().left + (currentPage - 1) * width;
    window.goToPage(Math.floor(baseLeft / width) + 1);
  });

  document.addEventListener("load", function(event) {
    if (event.target && event.target.tagName === "IMG") recalculateLayout("image-load");
  }, true);

  window.addEventListener("error", function(event) {
    var message = JSON.stringify({ type: "error", message: event.message || "Erro ao renderizar o EPUB." });
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(message);
    }
    if (window.parent && window.parent !== window) window.parent.postMessage(message, "*");
  });

  window.addEventListener("message", handleMessage);

  window.addEventListener("resize", function() {
    console.log('[FORENSIC:iframe:resize] t=' + (performance.timeOrigin + performance.now()) + ' window resize event, width=' + getPageWidth() + ' height=' + getPageHeight());
    syncPageDimensions();
    recalculateLayout("window-resize");
  });

  if (window.ResizeObserver) {
    new ResizeObserver(function() {
      console.log('[FORENSIC:iframe:ResizeObserver] t=' + (performance.timeOrigin + performance.now()) + ' viewport resized, width=' + getPageWidth() + ' height=' + getPageHeight());
      syncPageDimensions();
      recalculateLayout("resize-observer");
    }).observe(viewport);
  }

  function waitForImage(image) {
    if (image.complete) return Promise.resolve();
    return new Promise(function(resolve) {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    });
  }

  function signalInitialLayoutReady() {
    if (initialLayoutReadinessScheduled) return;
    initialLayoutReadinessScheduled = true;
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var imagesReady = Promise.all(Array.prototype.map.call(document.images, waitForImage));
    Promise.all([fontsReady, imagesReady]).then(function() {
      requestAnimationFrame(function() {
        initialLayoutReady = true;
        console.log('[FORENSIC:iframe:layoutReady] t=' + (performance.timeOrigin + performance.now()) + ' resources settled; totalBefore=' + totalPages + ' currentPage=' + currentPage + ' restorePending=' + restorationPending);
        recalculateLayout('initial-resources-ready');
      });
    });
  }
  signalInitialLayoutReady();

  // Execute display only after full DOM mounting
  if (document.readyState === "complete" || document.readyState === "interactive") {
    requestAnimationFrame(function() {
      setTimeout(window.display, 30);
    });
  } else {
    document.addEventListener("DOMContentLoaded", function() {
      requestAnimationFrame(function() {
        setTimeout(window.display, 30);
      });
    });
  }

})();
</script>
</body>
</html>`;
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** React Native's System token is not a CSS font; keep initial and dynamic lists equal. */
export function readerCssFontFamily(font: string): string {
  if (font === "System") return "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif";
  if (font === "Verdana") return "Verdana, sans-serif";
  const family = font.replace(/[<>";]/g, "");
  return family.includes("serif") ? family : `${family || "Georgia"}, serif`;
}
