// jest.setup.js
import { render as rtlRender } from '@testing-library/react'
import { LanguageProvider } from './contexts/LanguageContext' // Correct path
import { SDKProvider } from '@twa-dev/sdk/react'

function render(ui, { ...renderOptions } = {}) {
  const Wrapper = ({ children }) => (
    <LanguageProvider>
      <SDKProvider>
        {children}
      </SDKProvider>
    </LanguageProvider>
  )
  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions })
}

export * from '@testing-library/react'
export { render }
