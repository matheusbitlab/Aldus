// Actual app palette. Reader palettes have separate contracts and are not changed here.
const assert = require('node:assert/strict');
const { appThemeTokens } = require('./community-test-loader.cjs')()('src/theme/tokens.ts');
const luminance = hex => {
  const rgb = hex.slice(1).match(/../g).map(part => parseInt(part, 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
};
const contrast = (a, b) => {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
};
for (const [mode, palette] of Object.entries(appThemeTokens)) {
  for (const surface of ['background', 'surface', 'surfaceSecondary', 'panel', 'input']) {
    for (const ink of ['text', 'secondaryText', 'accent']) {
      assert(contrast(palette[ink], palette[surface]) >= 4.5, `${mode}: ${ink}/${surface} must meet normal text contrast`);
    }
  }
  assert(contrast(palette.onAccent, palette.accent) >= 4.5, `${mode}: primary button text contrast`);
  for (const ink of ["text", "accent"]) assert(contrast(palette[ink], palette.accentSoft) >= 4.5, `${mode}: ${ink}/accentSoft (selected chip) contrast`);
  assert(contrast(palette.onDanger, palette.danger) >= 4.5, `${mode}: destructive button text contrast`);
  for (const surface of ["background", "surface", "panel"]) {
    assert(contrast(palette.danger, palette[surface]) >= 4.5, `${mode}: danger/${surface} text contrast`);
    assert(contrast(palette.success, palette[surface]) >= 4.5, `${mode}: success/${surface} text contrast`);
    assert(contrast(palette.focus, palette[surface]) >= 3, `${mode}: focus ring/${surface} non-text contrast`);
  }
}
console.log('PASS actual light/dark app palette: body, secondary/link text and primary action ink, selected chip, danger/success >= 4.5:1; focus >= 3:1. Does not prove physical display or disabled controls.');
