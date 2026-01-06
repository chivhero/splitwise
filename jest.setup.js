// Добавляем дополнительные matchers от jest-dom
import '@testing-library/jest-dom'

// Mock Telegram WebApp
global.Telegram = {
  WebApp: {
    ready: jest.fn(),
    expand: jest.fn(),
    close: jest.fn(),
    initDataUnsafe: {
      user: {
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
      },
    },
    initData: 'mock_init_data',
    MainButton: {
      show: jest.fn(),
      hide: jest.fn(),
      setText: jest.fn(),
      onClick: jest.fn(),
      offClick: jest.fn(),
      enable: jest.fn(),
      disable: jest.fn(),
      showProgress: jest.fn(),
      hideProgress: jest.fn(),
    },
    HapticFeedback: {
      impactOccurred: jest.fn(),
      notificationOccurred: jest.fn(),
      selectionChanged: jest.fn(),
    },
    openLink: jest.fn(),
    openTelegramLink: jest.fn(),
    showPopup: jest.fn(),
    showAlert: jest.fn(),
    showConfirm: jest.fn(),
  },
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})










