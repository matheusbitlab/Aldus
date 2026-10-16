export function AdminWebStyles(){return <style>{`
 [data-testid="admin-shell"] [role="button"]:focus-visible,[data-testid="admin-shell"] input:focus-visible,[data-testid="admin-shell"] textarea:focus-visible{outline:3px solid #c66f4b;outline-offset:3px}
 [data-testid="admin-shell"] [role="button"]{transition:background-color .16s,transform .16s}
 [data-testid="admin-shell"] [role="button"]:hover:not([aria-disabled="true"]){filter:brightness(.96)}
 [data-testid="admin-shell"] [role="button"]:active:not([aria-disabled="true"]){transform:translateY(1px)}
 @media(prefers-reduced-motion:reduce){[data-testid="admin-shell"] *{transition:none!important;animation:none!important;scroll-behavior:auto!important}}
 `}</style>;}
