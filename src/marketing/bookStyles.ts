export const bookCss = `
.al-book-story{--story-dark:0;--story-intro:1;--story-caption:1;position:relative;background:#f6f3ec}
.al-book-sticky{position:relative;max-width:1920px;margin:auto;min-height:670px;display:grid;grid-template-columns:1fr 1fr;align-items:center;padding:50px max(24px,5vw);gap:30px}
.al-story-intro{position:relative;z-index:3;min-width:0;max-width:520px}
[data-aldus-landing] .al-story-intro h1{font:400 clamp(48px,5.5vw,83px)/1.04 Georgia,serif;letter-spacing:-.055em}
.al-story-intro .al-lead{max-width:400px}
.al-book-presentation{position:relative;min-width:0;height:460px}
.al-book-scene{position:relative;width:100%;height:100%;contain:layout paint style;pointer-events:none}
.al-book-scene canvas{mask-image:linear-gradient(transparent,#000 6%,#000 91%,transparent);-webkit-mask-image:linear-gradient(transparent,#000 6%,#000 91%,transparent)}
.al-book-static{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:230px;aspect-ratio:1/1.4;padding:25px 20px 24px 33px;display:flex;align-items:center;flex-direction:column;justify-content:space-around;border:1px solid #143a2c;border-radius:3px 8px 8px 3px;color:#e9d8af;background:linear-gradient(90deg,#102d22,#2e5340 8%,#193d2e 15%,#204331 80%,#153727);box-shadow:5px 4px 0 #ddd1b9,8px 7px 0 #eee3ca,11px 10px 0 #183e2e,15px 24px 42px #263d3526}
.al-book-static::before{content:'';position:absolute;inset:15px 14px 15px 24px;border:1px solid #c6ad706b;pointer-events:none}
.al-static-edition{font-size:8px;letter-spacing:.12em}
.al-static-emblem{font:32px Georgia,serif}
.al-static-name{font:47px/1.05 Georgia,serif;text-align:center;letter-spacing:-.04em}
.al-static-rule{font-size:16px;position:relative}
.al-book-static small{font-size:7px;letter-spacing:.1em}
.al-book-caption{grid-column:1/-1;text-align:center;max-width:640px;margin:auto}
.al-book-caption-kicker{font-size:11px;text-transform:uppercase;letter-spacing:.16em;color:#936747}
[data-aldus-landing] .al-book-caption h2{font:400 clamp(32px,3.6vw,52px)/1.08 Georgia,serif;letter-spacing:-.045em;margin:14px 0}
.al-book-caption p{font-size:15px;line-height:1.65;max-width:490px;margin-inline:auto!important}
.al-book-caption .al-button{margin-top:20px}
.al-story-controls{grid-column:1/-1;text-align:center;z-index:4;position:relative}
.al-book-navigation{display:flex;align-items:center;justify-content:center;gap:22px}
.al-book-navigation button{width:44px;height:44px;min-width:44px;border-radius:50%;border:1px solid #83917c6b;background:transparent;color:inherit;font-size:21px;cursor:pointer}
.al-book-navigation button:hover:not(:disabled){background:#889b7120}
.al-book-navigation button:disabled{opacity:.3;cursor:default}
.al-book-navigation>span{font:13px/1.3 system-ui,sans-serif;letter-spacing:.08em;min-width:215px}
.al-book-navigation i{font-style:normal;opacity:.5}
.al-book-navigation small{display:block;letter-spacing:0;font-size:11px;margin-top:6px;opacity:.72}
.al-book-skip{display:inline-flex;gap:12px;align-items:center;min-height:44px;font-size:12px;border-bottom:1px solid #a1835b60;margin-top:5px}
.al-story-static-note,.al-book-noscript{font:12px/1.6 system-ui,sans-serif;color:#6e7965;max-width:500px;margin:15px auto 0!important;padding-inline:20px}
.al-book-outline{max-width:1280px;margin:0 auto;padding:35px 48px 65px;list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:32px}
.al-book-outline li{border-top:1px solid #c9c8b6;padding-top:20px}
.al-book-outline li>span{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#906847}
[data-aldus-landing] .al-book-outline h3{font:25px/1.15 Georgia,serif;letter-spacing:-.02em;margin:10px 0}
.al-book-outline p{font-size:13px;line-height:1.65;color:#67735f}
.al-book-story:not([data-enhanced]) .al-book-navigation{display:none}
.al-book-story[data-enhanced=true][data-motion=scroll]{height:610svh;min-height:3000px}
.al-book-story[data-enhanced=true] .al-book-sticky{position:sticky;top:var(--book-header-height,85px);height:calc(var(--book-viewport-height,100svh) - var(--book-header-height,85px));min-height:0;max-width:none;display:block;padding:0;overflow:hidden;background:rgb(calc(246 - 228 * var(--story-dark)),calc(243 - 207 * var(--story-dark)),calc(236 - 205 * var(--story-dark)))}
.al-book-story[data-enhanced=true] .al-story-intro{position:absolute;left:max(32px,calc((100vw - 1280px)/2));top:46%;transform:translateY(-50%);width:39%;opacity:var(--story-intro)}
.al-book-story[data-enhanced=true]:not([data-chapter="0"]) .al-story-intro{visibility:hidden;pointer-events:none}
.al-book-story[data-enhanced=true] .al-book-presentation{position:absolute;inset:10px 0 100px;height:auto;pointer-events:none}
.al-book-story[data-enhanced=true] .al-book-scene canvas{clip-path:inset(0 0 0 calc(44% * var(--story-intro)))}
.al-book-story[data-enhanced=true] .al-book-scene[data-render-state=ready] .al-book-static{display:none}
.al-book-story[data-enhanced=true] .al-book-caption{position:absolute;left:50%;top:25px;transform:translateX(-50%);width:min(86%,750px);max-width:none;margin:0;z-index:3;opacity:var(--story-caption);color:rgb(calc(36 + 204 * var(--story-dark)),calc(61 + 171 * var(--story-dark)),calc(48 + 160 * var(--story-dark)))}
.al-book-story[data-enhanced=true] .al-book-caption h2{color:inherit}
.al-book-story[data-enhanced=true] .al-book-caption-kicker{color:rgb(calc(147 + 58 * var(--story-dark)),calc(103 + 74 * var(--story-dark)),calc(71 + 54 * var(--story-dark)))}
.al-book-story[data-enhanced=true][data-chapter="0"] .al-book-caption{visibility:hidden}
.al-book-story[data-enhanced=true] .al-story-controls{position:absolute;bottom:14px;left:0;right:0;color:rgb(calc(36 + 204 * var(--story-dark)),calc(61 + 171 * var(--story-dark)),calc(48 + 160 * var(--story-dark)))}
.al-book-story[data-enhanced=true] .al-book-outline{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);padding:0;margin:0;display:block}
.al-book-story[data-chapter="6"][data-enhanced=true] .al-book-caption{top:20px}
.al-book-story[data-chapter="6"] .al-book-caption h2{font-size:clamp(30px,3.8vw,54px)}
.al-book-story button:focus-visible,.al-book-story a:focus-visible{outline:3px solid #b8754e;outline-offset:5px}
@media(min-width:1600px){.al-book-story[data-enhanced=true] .al-story-intro{left:calc((100vw - 1370px)/2)}}
@media(max-width:1100px){[data-aldus-landing] .al-story-intro h1{font-size:clamp(43px,5.6vw,64px)}.al-story-intro .al-lead{font-size:14px}.al-story-intro .al-hero-actions{gap:14px}.al-story-intro .al-button{padding-inline:18px}.al-book-story[data-enhanced=true] .al-story-intro{left:32px;width:41%}.al-book-caption p{font-size:14px}}
@media(max-width:850px){
 .al-book-sticky{grid-template-columns:1fr;padding:32px 24px;min-height:0;gap:22px;text-align:center}
 .al-story-intro{max-width:530px;margin:auto}.al-story-intro .al-lead{max-width:390px;margin-inline:auto!important}
 .al-story-intro .al-hero-actions{justify-content:center;margin-top:20px}
 [data-aldus-landing] .al-story-intro h1{font-size:clamp(38px,8vw,56px)}
 .al-story-intro h1 br{display:none}.al-story-intro .al-hero-note{display:none}
 .al-book-presentation{height:350px}.al-book-static{width:195px}
 .al-static-name{font-size:40px}.al-book-outline{padding:20px 24px 45px;gap:25px}
 .al-book-story[data-enhanced=true] .al-story-intro{top:28px;left:24px;right:24px;transform:none;width:auto;text-align:center}
 .al-book-story[data-enhanced=true] .al-story-intro h1{font-size:clamp(35px,8.6vw,52px)}
 .al-book-story[data-enhanced=true] .al-story-intro .al-eyebrow{font-size:9px;margin-bottom:14px!important}
 .al-book-story[data-enhanced=true] .al-story-intro .al-lead{font-size:13px;line-height:1.5;max-width:340px;margin-top:14px!important}
 .al-book-story[data-enhanced=true] .al-hero-actions{margin-top:16px;gap:14px}
 .al-book-story[data-enhanced=true] .al-hero-actions .al-button{font-size:12px;padding:12px 17px;min-height:44px}
 .al-book-story[data-enhanced=true] .al-hero-actions .al-text-link{font-size:11px}
 .al-book-story[data-enhanced=true] .al-book-presentation{top:235px;bottom:125px}
 .al-book-story[data-enhanced=true] .al-book-scene canvas{clip-path:none}
 .al-book-story[data-enhanced=true] .al-book-caption{top:25px;width:calc(100% - 42px)}
 [data-aldus-landing] .al-book-caption h2{font-size:clamp(29px,7.2vw,40px);margin:10px 0}
 .al-book-caption p{font-size:13px;max-width:440px}.al-book-caption-kicker{font-size:9px}
 .al-book-navigation>span{min-width:195px;font-size:12px}.al-book-navigation{gap:13px}
 .al-book-navigation small{font-size:10px}.al-book-skip{font-size:11px}
 .al-book-story[data-chapter="6"] .al-book-caption h2{font-size:31px}
 .al-book-caption .al-button{font-size:12px;min-height:44px;padding:11px 17px;margin-top:13px}
}
@media(max-height:700px){
 .al-book-story[data-enhanced=true] .al-book-caption{top:14px}.al-book-story[data-enhanced=true] .al-book-caption h2{font-size:32px;margin:8px 0}
 .al-book-story[data-enhanced=true] .al-book-caption p{font-size:12px;max-width:480px;line-height:1.4}
 .al-book-story[data-enhanced=true] .al-book-caption-kicker{font-size:9px}
 .al-book-story[data-enhanced=true] .al-story-controls{bottom:6px}.al-book-navigation small{font-size:10px}
 .al-book-story[data-enhanced=true] .al-story-intro .al-lead{display:none}
}
@media(max-height:620px) and (max-width:850px){
 .al-book-story[data-enhanced=true] .al-story-intro{top:15px}.al-book-story[data-enhanced=true] .al-story-intro h1{font-size:31px}
 .al-book-story[data-enhanced=true] .al-story-intro .al-eyebrow{display:none}.al-book-story[data-enhanced=true] .al-hero-actions{margin-top:12px}
 .al-book-story[data-enhanced=true] .al-book-presentation{top:175px;bottom:110px}
 .al-book-story[data-enhanced=true] .al-book-caption{top:14px}.al-book-story[data-enhanced=true] .al-book-caption h2{font-size:27px}
 .al-book-story[data-enhanced=true] .al-book-caption p{font-size:11px}
}
@media(max-height:480px) and (min-width:600px){
 .al-book-story[data-enhanced=true] .al-story-intro{top:50%;width:42%;left:25px;right:auto;margin:0;transform:translateY(-50%);text-align:left}
 .al-book-story[data-enhanced=true] .al-story-intro h1{font-size:34px;text-align:left}
 .al-book-story[data-enhanced=true] .al-book-presentation{top:85px;bottom:80px}
 .al-book-story[data-enhanced=true] .al-book-caption{width:75%;top:10px}.al-book-story[data-enhanced=true] .al-book-caption p{display:none}
 .al-book-story[data-enhanced=true] .al-book-caption h2{font-size:26px}.al-book-story[data-enhanced=true] .al-book-caption-kicker{display:none}
 .al-book-story[data-enhanced=true] .al-story-controls{bottom:0}.al-book-navigation small{display:none}.al-book-skip{min-height:32px}
 .al-book-story[data-chapter="6"][data-enhanced=true] .al-book-caption{width:42%;left:25px;transform:none;top:20px;text-align:left}
}
@media(prefers-reduced-motion:reduce){
 .al-book-story[data-enhanced=true][data-motion=scroll]{height:auto!important;min-height:0!important}
 .al-book-story .al-book-sticky{position:relative!important;top:auto!important;height:auto!important;min-height:0!important}
 .al-book-scene canvas{display:none!important}.al-book-story .al-book-static{display:flex!important}
 .al-book-story .al-book-outline{position:static!important;width:auto!important;height:auto!important;clip-path:none!important;display:grid!important;padding:30px 24px!important}
}
`;
