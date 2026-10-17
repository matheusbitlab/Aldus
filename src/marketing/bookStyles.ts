export const bookCss = `
.al-book-story{position:relative}
.al-book-sticky.al-hero{min-height:720px;gap:32px;padding-block:50px;grid-template-columns:1fr 1.08fr;align-items:center}
.al-book-story[data-enhanced=true][data-motion=scroll]{height:410svh;min-height:2400px}
.al-book-story[data-enhanced=true][data-motion=scroll] .al-book-sticky{position:sticky;top:85px;height:calc(100svh - 85px);min-height:600px}
.al-book-presentation{min-width:0;position:relative;text-align:center}
.al-book-stage{container-type:inline-size;width:100%;height:410px;position:relative;perspective:1400px;perspective-origin:50% 40%}
.al-book-scene{--book-w:min(254px,43cqw);--book-h:calc(var(--book-w)*1.4);--book-open:0;--cover-angle:0deg;--cover-z:20px;--camera-x:11deg;--camera-y:-24deg;--camera-z:-5deg;position:absolute;left:calc(50% - var(--book-w)*.5*(1 - var(--book-open)));top:12px;width:var(--book-w);height:var(--book-h);transform-style:preserve-3d}
.al-book-scene{--leaf-0-angle:0deg;--leaf-1-angle:0deg;--leaf-2-angle:0deg;--leaf-3-angle:0deg;--leaf-0-curl:0deg;--leaf-1-curl:0deg;--leaf-2-curl:0deg;--leaf-3-curl:0deg;--leaf-0-z:14px;--leaf-1-z:11px;--leaf-2-z:8px;--leaf-3-z:5px}
.al-book-geometry{position:relative;width:100%;height:100%;transform:rotateX(var(--camera-x)) rotateY(var(--camera-y)) rotateZ(var(--camera-z));transform-style:preserve-3d}
.al-book-geometry :is(.al-book-front-cover,.al-book-leaf,.al-book-strip,.al-book-page-block){transform-style:preserve-3d}
.al-book-floor{position:absolute;left:12%;right:6%;bottom:25px;height:30px;border-radius:50%;background:#172d231a;box-shadow:0 15px 26px 16px #172d2314;transform:rotate(-4deg)}
.al-book-back-cover{position:absolute;inset:-3px -4px;border:2px solid #15372c;border-radius:2px 6px 6px 2px;background:#173c30;box-shadow:0 3px 0 #102b23;transform:translateZ(-22px)}
.al-book-page-block{position:absolute;inset:4px 4px 4px 1px;background:#eae0cb;transform:translateZ(-17px)}
.al-book-fore-edge{position:absolute;left:100%;top:0;width:34px;height:100%;background:repeating-linear-gradient(90deg,#f1e8d6 0 1px,#bfb49b 1px 1.5px,#efe5d0 1.5px 3px);transform-origin:left;transform:rotateY(-90deg)}
.al-book-bottom-edge,.al-book-top-edge{position:absolute;top:100%;left:0;width:100%;height:34px;background:repeating-linear-gradient(0deg,#f2e8d1 0 1px,#b9ad94 1px 1.5px,#e8ddc4 1.5px 3px);transform-origin:top;transform:rotateX(90deg)}
.al-book-top-edge{top:0;transform:rotateX(90deg)}
.al-book-base-page{position:absolute;inset:5px 4px 5px 2px;transform:translateZ(2px);background:#f8f2e4}
.al-book-front-cover{position:absolute;inset:-3px -4px;transform-origin:0 50%;transform:translateZ(var(--cover-z)) rotateY(var(--cover-angle))}
.al-book-cover-face,.al-book-cover-inside{position:absolute;inset:0;backface-visibility:hidden;border-radius:2px 6px 6px 2px}
.al-book-cover-face{transform:translateZ(2px);color:#e9d6ab;background:linear-gradient(90deg,#102b22,#214a3a 7%,#244a3c 12%,#183a2e 16%,#214333 65%,#18372c);border:1px solid #102c22;box-shadow:inset -5px 0 5px #071c2240,inset 1px 0 0 #e4d6a64d}
.al-book-cover-face::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:repeating-linear-gradient(13deg,#e9d6ab04 0 1px,transparent 1px 3px)}
.al-book-cover-frame{position:absolute;inset:6% 7% 6% 12%;border:1px solid #c4b57f99;outline:1px solid #c4b57f33;outline-offset:5px;display:flex;flex-direction:column;align-items:center;padding:12% 5%;text-align:center}
.al-book-cover-edition{font-size:calc(var(--book-w)*.026);letter-spacing:.19em;white-space:nowrap;color:#c6bd94}
.al-book-cover-emblem{font:italic calc(var(--book-w)*.18)/1 Georgia,serif;margin-top:17%;color:#d4c393;border-block:1px solid #c7b77b77;padding:9% 13% 7%}
.al-book-cover-title{font:calc(var(--book-w)*.17)/.98 Georgia,serif;letter-spacing:-.04em;margin-top:14%;text-shadow:0 1px 0 #071a11}
.al-book-cover-title>span{display:block;font-size:.48em;letter-spacing:.14em;margin-top:12%}
.al-book-cover-ornament{display:flex;gap:12px;align-items:center;margin-top:auto;width:72%;font-size:calc(var(--book-w)*.055)}
.al-book-cover-ornament i{height:1px;background:#c4b57f77;flex:1}
.al-book-cover-bottom{font-size:calc(var(--book-w)*.021);letter-spacing:.15em;margin-top:12%;white-space:nowrap}
.al-book-cover-inside{transform:rotateY(180deg) translateZ(2px);background:linear-gradient(90deg,#dfd7bf,#eee7d3 12%,#eee8d8 96%,#c9bda5);border:7px solid #224636;display:grid;place-items:center}
.al-book-cover-inside>div{font:italic calc(var(--book-w)*.12)/1.2 Georgia,serif;color:#5f6a52;text-align:center}
.al-book-cover-inside em{color:#a45a3b}
.al-book-cover-inside span{display:block;font:calc(var(--book-w)*.025)/1.5 system-ui;letter-spacing:.2em;margin-top:20%}
.al-book-cover-edge{position:absolute;left:100%;top:0;width:4px;height:100%;transform:rotateY(90deg);transform-origin:left;background:#0b2a1d}
.al-book-cover-top,.al-book-cover-bottom-edge{position:absolute;left:0;top:0;width:100%;height:4px;transform:rotateX(90deg);transform-origin:top;background:#345d45}
.al-book-cover-bottom-edge{top:100%;background:#102a1f}
.al-book-spine{position:absolute;left:-2px;top:-3px;width:40px;height:calc(100% + 6px);transform-origin:left;transform:translateZ(-20px) rotateY(-90deg);background:linear-gradient(90deg,#153529,#315340 30%,#17392a 90%);border-radius:5px;color:#ddc999;display:flex;align-items:center;justify-content:center}
.al-book-spine span{writing-mode:vertical-rl;font:calc(var(--book-w)*.06) Georgia,serif;letter-spacing:.06em}
.al-book-spine i{position:absolute;bottom:8%;font-style:normal;font-size:12px}
.al-book-ribbon{position:absolute;top:98%;left:74%;width:calc(var(--book-w)*.07);height:calc(var(--book-w)*.21);background:linear-gradient(90deg,#91452d,#ca7953 45%,#a45434);clip-path:polygon(0 0,100% 0,100% 100%,50% 84%,0 100%);transform:translateZ(-7px) rotateX(-7deg)}
.al-book-leaf{position:absolute;inset:5px 4px 5px 2px;transform-origin:0 50%}
.al-book-leaf-0{--curl:var(--leaf-0-curl,0deg);--bend:var(--leaf-0-bend,0);transform:translateZ(var(--leaf-0-z,14px)) rotateY(var(--leaf-0-angle,0deg))}
.al-book-leaf-1{--curl:var(--leaf-1-curl,0deg);--bend:var(--leaf-1-bend,0);transform:translateZ(var(--leaf-1-z,11px)) rotateY(var(--leaf-1-angle,0deg))}
.al-book-leaf-2{--curl:var(--leaf-2-curl,0deg);--bend:var(--leaf-2-bend,0);transform:translateZ(var(--leaf-2-z,8px)) rotateY(var(--leaf-2-angle,0deg))}
.al-book-leaf-3{--curl:var(--leaf-3-curl,0deg);--bend:var(--leaf-3-bend,0);transform:translateZ(var(--leaf-3-z,5px)) rotateY(var(--leaf-3-angle,0deg))}
.al-book-strip{position:absolute;top:0;left:100%;width:100%;height:100%;transform-origin:0 50%;transform:rotateY(calc(var(--curl)*-.65))}
.al-book-strip-0{left:0;width:25%;transform:none}
.al-book-paper-face{position:absolute;inset:0;background:#f9f3e5;backface-visibility:hidden;overflow:hidden;border-top:1px solid #e7ddc5;border-bottom:1px solid #dfd1b6}
.al-book-paper-front{transform:translateZ(.12px)}
.al-book-paper-back{transform:rotateY(180deg) translateZ(.12px)}
.al-book-paper-face>div{position:absolute;top:0;height:100%;width:400%}
.al-book-paper-front::after,.al-book-paper-back::after{content:'';position:absolute;inset:0;pointer-events:none;opacity:var(--bend,0);background:linear-gradient(90deg,#8d785317,transparent 35%,#fff3 60%,#65552d0a)}
.al-book-print{position:absolute;inset:0;background:linear-gradient(90deg,#dfd4b966,#faf4e8 9%,#f9f3e5 92%,#e7dcc477);padding:7% 7% 7% 8%;color:#344538;text-align:left;font:calc(var(--book-w)*.035)/1.6 system-ui,sans-serif}
.al-book-print h3{font:calc(var(--book-w)*.105)/1.08 Georgia,serif!important;letter-spacing:-.04em!important;margin:6% 0 7%!important}
.al-book-running{display:flex;justify-content:space-between;gap:6px;border-bottom:1px solid #9b9e7b55;padding-bottom:6%;font-size:.62em;letter-spacing:.035em;white-space:nowrap}
.al-book-running>span:last-child{font-size:.7em;align-self:center;letter-spacing:.05em}
.al-book-kicker{display:block;font-size:.63em;letter-spacing:.12em;margin-top:10%;color:#8a694e}
.al-book-folio{position:absolute;bottom:4%;left:8%;right:7%;font-size:.61em;text-align:center;color:#78816d;border-top:1px solid #9b9e7b33;padding-top:3%}
.al-book-filters{display:flex;gap:7%;margin-bottom:8%;font-size:.76em}
.al-book-filters>span:first-child{background:#e2e6d8;border-radius:3px;padding:0 7%}
.al-book-covers{display:grid;grid-template-columns:repeat(3,1fr);gap:7%}
.al-book-mini-cover{aspect-ratio:.67;display:flex;flex-direction:column;padding:11%;border-radius:1px 3px 3px 1px;box-shadow:inset 2px 0 1px #fff3,2px 3px 2px #2e3f3526}
.al-book-mini-cover small{font-size:.4em;letter-spacing:.12em}
.al-book-mini-cover b{font:1.25em/1.05 Georgia,serif;margin-top:24%}
.al-book-mini-cover i{font-size:.45em;font-style:normal;margin-top:auto}
.al-book-mini-0{background:#c49a71;color:#382e21}.al-book-mini-1{background:#b2bea1;color:#34482e}.al-book-mini-2{background:#284e3b;color:#f1e3be}
.al-book-covers>div>span{display:block;font-size:.54em;margin-top:12%;line-height:1.25}
.al-book-reading{margin-top:12%;border-top:1px solid #bdc3ae88;padding-top:7%;display:flex;flex-direction:column;gap:7px}
.al-book-reading>span{font-size:.63em;letter-spacing:.1em;color:#8a694e}.al-book-reading b{font-size:.91em;font-weight:500}
.al-book-reading>div{height:3px;background:#d7dfc9}.al-book-reading i{display:block;width:38%;height:100%;background:#b16e4e}.al-book-reading small{font-size:.65em;color:#7c856c}
.al-book-mini-note{font-size:.84em;margin:7% 0!important;line-height:1.6}
.al-book-print-library h3{margin:5% 0 6%!important}.al-book-print-library .al-book-filters{margin-bottom:6%}.al-book-print-library .al-book-reading{margin-top:6%;padding-top:4%;gap:3px}.al-book-print-library .al-book-reading>span{font-size:.55em}.al-book-print-library .al-book-reading b{font-size:.8em}.al-book-print-library .al-book-mini-note{display:none}
.al-book-reader-tools{display:flex;justify-content:space-between;font-size:.7em;padding:9% 0 4%}
.al-book-prose{font:1.13em/1.8 Georgia,serif;margin-top:7%!important}
.al-book-prose mark{background:#e5dca2;color:inherit}
.al-book-type{display:flex;align-items:center;gap:10%;padding-top:6%;margin-top:7%;border-top:1px solid #9b9e7b33;font:1.6em Georgia,serif}.al-book-type span{font:.4em system-ui}
.al-book-page-progress{position:absolute;bottom:9%;left:8%;right:7%;display:flex;justify-content:space-between;font-size:.6em}
.al-book-deck{font-size:.6em;letter-spacing:.08em;display:flex;justify-content:space-between;margin-bottom:7%}
.al-book-flashcard{border:1px solid #b4bda18c;padding:9%;border-radius:4px;background:#e9ecd9}
.al-book-flashcard small{font-size:.65em;color:#707c5f}.al-book-flashcard h4{font:1.5em/1.3 Georgia,serif;margin:12% 0!important}.al-book-flashcard p{font-size:.76em;line-height:1.7}
.al-book-study-notes{border-left:2px solid #c89c7a;padding-left:6%;margin-top:9%;font-size:.8em}.al-book-study-notes p{margin:5% 0!important}.al-book-study-notes>span{font-size:.7em;color:#758064}
.al-book-plan-list{display:flex;flex-direction:column;gap:12px;margin-top:10%}.al-book-plan-list>div{border:1px solid #c8cfb8;padding:7%;display:grid;grid-template-columns:1fr 1fr;background:#e8edde66;border-radius:3px}.al-book-plan-list b{grid-column:1/-1;font-family:Georgia,serif;font-size:1.5em;margin-bottom:5%}.al-book-plan-list span,.al-book-plan-list strong{font-size:.86em;font-weight:500}.al-book-plan-list>div:last-child{background:#254a39;color:#efe6cf;border-color:#254a39}
.al-book-cloud{margin-top:8%;font-size:1.35em;display:flex;align-items:center;gap:7%}.al-book-cloud b{font-size:.58em;font-weight:500}.al-book-cloud-note{font-size:.66em;line-height:1.7;margin-top:6%!important}
.al-book-print-plans .al-book-kicker{margin-top:7%}.al-book-print-plans h3{margin:4% 0 5%!important}.al-book-print-plans .al-book-mini-note{font-size:.78em;line-height:1.5;margin:4% 0!important}.al-book-print-plans .al-book-plan-list{margin-top:4%;gap:6px}.al-book-print-plans .al-book-plan-list>div{padding:4% 6%}.al-book-print-plans .al-book-plan-list b{font-size:1.3em;line-height:1.25;margin-bottom:3%}.al-book-print-plans .al-book-cloud{margin-top:5%;font-size:1.1em}.al-book-print-plans .al-book-cloud-note{font-size:.63em;line-height:1.5;margin-top:3%!important}
.al-book-ending{height:90%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.al-book-ending>span:first-child{font-size:2.5em;color:#a46c46;margin-bottom:13%}.al-book-ending>small{font-size:.65em;letter-spacing:.13em}.al-book-ending h3{font-size:calc(var(--book-w)*.115)!important;margin-block:9%!important}.al-book-ending em{color:#a56240}.al-book-ending p{font:1.05em/1.6 Georgia,serif}.al-book-ending-brand{margin-top:16%;font:1.4em Georgia,serif}
.al-book-verso{background:linear-gradient(90deg,#f7f0df,#f9f2e4 90%,#c9bca080)}
.al-book-quote{height:85%;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center}.al-book-quote>span{font-size:2.5em;color:#ae744d}.al-book-quote p{font:italic 2.1em/1.35 Georgia,serif;margin:15% 3%!important}.al-book-quote small{font-size:.6em;letter-spacing:.1em}
.al-book-caption{min-height:112px;max-width:440px;margin:0 auto}
.al-book-caption-kicker{font-size:8px;letter-spacing:.13em;color:#8a674e;font-weight:650}
[data-aldus-landing] .al-book-caption h2{font:400 27px/1.2 Georgia,serif;letter-spacing:-.035em;margin:9px 0}
.al-book-caption p{font-size:12px;line-height:1.7;color:var(--al-muted)}
.al-book-navigation{display:flex;justify-content:center;align-items:center;gap:20px;margin-top:13px}
.al-book-navigation button{width:44px;height:44px;border-radius:50%;border:1px solid #a6ac9855;background:transparent;color:var(--al-ink);font-size:20px;transition:background .15s}
.al-book-navigation button:hover:not(:disabled){background:#e8ecdf}.al-book-navigation button:disabled{opacity:.35;cursor:default}
.al-book-navigation>span{font-size:10px;letter-spacing:.05em;min-width:180px}.al-book-navigation small{display:block;font-size:8px;color:var(--al-muted);letter-spacing:0;margin-top:4px}
.al-book-skip{display:inline-block;font-size:10px;border-bottom:1px solid #9a745147;padding:5px 0;min-height:30px;margin-top:8px}
.al-book-outline{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);padding:0;margin:0}
.al-book-static{display:none;position:absolute;inset:0;border:4px solid #284938;box-shadow:4px 7px 0 #ded3bb,4px 9px 0 #173d2c,0 12px 18px #253d3526;transform:rotateX(5deg) rotateY(-5deg)}
.al-book-static-left{position:absolute;right:100%;top:-4px;width:calc(100% + 4px);height:calc(100% + 8px);border:4px solid #284938}
.al-book-static>.al-book-print,.al-book-static-left{overflow:hidden}
.al-book-noscript{font-size:12px;line-height:1.7;color:var(--al-muted);margin-top:14px!important}
.al-book-story:not([data-enhanced=true]) .al-book-navigation{display:none}
.al-book-story[data-motion=reduce] .al-book-geometry{display:none}
.al-book-story[data-motion=reduce] .al-book-scene{left:50%;--book-open:1}
.al-book-story[data-motion=reduce] .al-book-static{display:block}
@media(min-width:1600px){.al-book-stage{height:420px}.al-book-sticky.al-hero{grid-template-columns:1fr 1.12fr}}
@media(max-width:1100px){.al-book-stage{height:350px}.al-book-sticky.al-hero{gap:24px}.al-book-story[data-enhanced=true][data-motion=scroll] .al-book-sticky{top:81px;height:calc(100svh - 81px)}.al-book-caption{min-height:125px}}
@media(max-width:850px){.al-book-sticky.al-hero{grid-template-columns:1fr;gap:12px;padding-block:20px;min-height:0}.al-book-story[data-enhanced=true][data-motion=scroll] .al-book-sticky{top:85px;height:calc(100svh - 85px);min-height:650px;align-content:center}.al-book-sticky .al-hero-copy{width:100%;max-width:640px;margin:auto;text-align:center}.al-book-sticky .al-eyebrow{margin-bottom:9px!important}.al-book-sticky h1{font-size:clamp(36px,6vw,50px)}.al-book-sticky h1 br{display:none}.al-book-sticky .al-lead{font-size:14px;line-height:1.6;max-width:480px;margin:12px auto 0!important}.al-book-sticky .al-hero-actions{justify-content:center;margin-top:16px}.al-book-sticky .al-hero-note{display:none}.al-book-presentation{max-width:560px;width:100%;margin:auto}.al-book-stage{height:275px}.al-book-scene{--book-w:min(176px,42cqw);top:8px}.al-book-floor{bottom:12px}.al-book-caption{min-height:88px;max-width:420px}[data-aldus-landing] .al-book-caption h2{font-size:23px}.al-book-caption p{font-size:11px}.al-book-navigation{margin-top:5px}.al-book-navigation small{font-size:8px}.al-book-skip{margin-top:0}}
@media(max-width:540px){.al-book-story[data-enhanced=true][data-motion=scroll] .al-book-sticky{top:69px;height:calc(100svh - 69px);min-height:580px}.al-book-sticky.al-hero{padding-block:14px;gap:6px}.al-book-sticky h1{font-size:clamp(33px,8.8vw,43px)}.al-book-sticky .al-lead{font-size:12px;max-width:320px;line-height:1.5}.al-book-sticky .al-hero-actions{gap:14px;margin-top:12px}.al-book-sticky .al-hero-actions .al-button{padding:10px 15px;font-size:11px;min-height:44px}.al-book-sticky .al-text-link{font-size:10px}.al-book-stage{height:245px}.al-book-scene{--book-w:min(158px,43cqw);top:6px}.al-book-caption{min-height:90px}.al-book-caption-kicker{font-size:7px}[data-aldus-landing] .al-book-caption h2{font-size:21px;margin:6px 0}.al-book-caption p{font-size:10px;line-height:1.65}.al-book-navigation{gap:16px;margin-top:2px}.al-book-navigation>span{min-width:165px}.al-book-skip{font-size:9px;min-height:25px}}
@media(max-height:740px) and (min-width:851px){.al-book-story[data-enhanced=true][data-motion=scroll] .al-book-sticky{min-height:490px}.al-book-stage{height:300px}.al-book-scene{--book-w:min(188px,35cqw)}.al-book-caption{min-height:100px}.al-book-sticky .al-hero-note{margin-top:18px!important}}
@media(max-height:700px) and (max-width:850px){.al-book-story[data-enhanced=true][data-motion=scroll] .al-book-sticky{min-height:0;gap:5px;padding-block:8px}.al-book-sticky .al-eyebrow,.al-book-sticky .al-lead,.al-book-sticky .al-text-link{display:none}.al-book-sticky h1{font-size:30px}.al-book-sticky .al-hero-actions{margin-top:8px}.al-book-stage{height:205px}.al-book-scene{--book-w:min(126px,34cqw)}.al-book-caption{min-height:77px}[data-aldus-landing] .al-book-caption h2{font-size:19px}.al-book-caption p{font-size:10px}.al-book-caption-kicker{display:none}.al-book-navigation button{width:44px;height:44px}.al-book-skip{min-height:22px;font-size:9px}}
@media(max-height:540px) and (max-width:850px){.al-book-stage{height:150px}.al-book-scene{--book-w:min(95px,30cqw)}.al-book-caption{min-height:39px}.al-book-caption p{display:none}.al-book-sticky h1{font-size:26px}.al-book-navigation{margin-top:0}}
@media(min-height:541px){.al-book-caption p{font-size:13px;line-height:1.55}.al-book-caption{min-height:124px}.al-book-caption-kicker{font-size:8px}.al-book-navigation small{font-size:9px}}
@media(max-width:540px) and (min-height:701px){.al-book-sticky.al-hero{gap:24px}}
@media(max-height:620px) and (max-width:599px){.al-book-story[data-enhanced=true][data-motion=scroll] .al-book-sticky{gap:20px}.al-book-caption{min-height:35px}.al-book-caption p{display:none}.al-book-stage{height:180px}.al-book-scene{--book-w:min(110px,34cqw)}}
@media(max-height:540px) and (min-width:600px) and (max-width:850px){.al-book-story[data-enhanced=true][data-motion=scroll] .al-book-sticky{grid-template-columns:.9fr 1.1fr;gap:24px;padding-block:8px}.al-book-sticky .al-hero-copy{text-align:left}.al-book-sticky .al-hero-actions{justify-content:flex-start}.al-book-sticky h1{font-size:36px}.al-book-stage{height:140px}.al-book-scene{--book-w:min(90px,30cqw)}}
@media(max-height:620px) and (min-width:851px){.al-book-story[data-enhanced=true][data-motion=scroll] .al-book-sticky{min-height:0;padding-block:12px}.al-book-sticky h1{font-size:58px}.al-book-sticky .al-lead,.al-book-sticky .al-hero-note{display:none}.al-book-stage{height:220px}.al-book-scene{--book-w:min(138px,30cqw)}.al-book-caption{min-height:95px}.al-book-caption p{font-size:12px;line-height:1.4}[data-aldus-landing] .al-book-caption h2{font-size:22px}.al-book-navigation{margin-top:5px}.al-book-skip{margin-top:0}}
.al-book-story[data-enhanced=true][data-motion=scroll] .al-book-sticky{top:var(--book-header-height,85px);height:calc(var(--book-viewport-height,100svh) - var(--book-header-height,85px))}
@media(prefers-reduced-motion:reduce){.al-book-story[data-enhanced=true]{height:auto!important;min-height:0!important}.al-book-story .al-book-sticky{position:relative!important;top:auto!important;height:auto!important;min-height:0!important;padding-block:45px}.al-book-story .al-book-geometry{display:none}.al-book-story .al-book-stage{height:410px}.al-book-story .al-book-caption{min-height:112px}.al-book-story .al-book-outline{position:static;width:auto;height:auto;clip-path:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:24px;max-width:1220px;margin:0 auto 50px;padding:24px 48px;list-style:none}.al-book-outline h3{font-size:18px}.al-book-outline p{font-size:12px;margin-top:8px!important;color:var(--al-muted)}}
@media(prefers-reduced-motion:reduce){.al-book-story .al-book-static{display:block}.al-book-story .al-book-scene{left:50%;--book-open:1}}
@media(prefers-reduced-motion:reduce) and (max-width:850px){.al-book-story .al-book-stage{height:280px}.al-book-story .al-book-outline{padding-inline:20px}}
`;
