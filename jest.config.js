const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Путь к Next.js приложению
  dir: './',
})

const customJestConfig = {
  // Файл настройки окружения
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Тестовое окружение
  testEnvironment: 'jest-environment-jsdom',
  
  // Mapping для импортов
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  
  // Паттерны для поиска тестов
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  
  // Собирать coverage с этих файлов
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  
  // Игнорировать эти папки при поиске тестов
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
  ],
  
}

module.exports = createJestConfig(customJestConfig)

