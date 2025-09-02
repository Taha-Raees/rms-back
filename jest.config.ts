import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'node', // Changed from 'jsdom' to 'node'
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you based on your tsconfig.json paths)
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Test files
  testMatch: [
    '<rootDir>/app/api/**/__tests__/**/*.(ts|tsx|js)',
    '<rootDir>/app/api/**/*.(test|spec).(ts|tsx|js)',
    '<rootDir>/backend/src/**/__tests__/**/*.(ts|tsx|js)',
    '<rootDir>/backend/src/**/*.(test|spec).(ts|tsx|js)',
  ],
  // Module file extensions for importing
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  // Transform files
  transform: {
    '^.+\\.(ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!@prisma/client)',
  ],
  // Collect coverage from these files
  collectCoverageFrom: [
    'app/api/**/*.ts',
    'backend/src/**/*.ts',
    '!app/api/**/*.d.ts',
    '!app/api/**/__tests__/**',
    '!backend/src/**/*.d.ts',
    '!backend/src/**/__tests__/**',
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
