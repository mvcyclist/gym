/** Reset window scroll after in-app screen changes (avoids carrying home scroll into workouts). */
export function scrollToTop(): void {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

/** Scroll after layout — use when new header/content mounts above the viewport (scroll anchoring). */
export function scrollToTopAfterLayout(): void {
  scrollToTop()
  requestAnimationFrame(() => {
    scrollToTop()
    requestAnimationFrame(scrollToTop)
  })
}
