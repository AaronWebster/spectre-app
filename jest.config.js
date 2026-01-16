module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    '*.cjs',
    '!node_modules/**',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
};
