/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: '<rootDir>/jest.environment.cjs',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  transform: {
    // ts-jest transpiles each file to CommonJS; typechecking is done separately by `npm run typecheck`.
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json', diagnostics: false }],
  },
  moduleNameMapper: {
    // import.meta.env is Vite-only; tests use a plain stub.
    '^(\\.{1,2}/)*config/env$': '<rootDir>/src/config/__mocks__/env.ts',
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    '\\.(svg|png|jpg|jpeg|gif|webp)$': '<rootDir>/src/test/fileMock.ts',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/main.tsx', '!src/**/*.d.ts', '!src/test/**'],
  // Avoid depending on a system watchman install.
  watchman: false,
};
