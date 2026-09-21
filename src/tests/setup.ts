import '@testing-library/jest-dom/vitest'

Object.defineProperty(window, 'scrollTo', { configurable: true, value: () => undefined })
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: () => undefined })
