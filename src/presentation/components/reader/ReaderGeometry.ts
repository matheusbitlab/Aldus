export function documentSafeInsets(platform: string, insets: { top: number; bottom: number; left: number; right: number }) {
  return platform === "web" ? { top: 0, bottom: 0, left: 0, right: 0 } : insets;
}

export function readerFeedbackTop(topInset: number, controlsVisible: boolean, measuredHeaderHeight: number) {
  // Header intrinsic geometry: safe padding + 40px buttons + 14px bottom padding.
  const headerHeight = measuredHeaderHeight || Math.max(topInset, 16) + 40 + 14;
  return (controlsVisible ? headerHeight : Math.max(topInset, 12)) + 12;
}
