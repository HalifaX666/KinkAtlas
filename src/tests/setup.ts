import '@testing-library/jest-dom/vitest'

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'scrollTo', { configurable: true, value: () => undefined })
}
if (typeof HTMLElement !== 'undefined') {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: () => undefined })
}
