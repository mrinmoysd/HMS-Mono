/**
 * Unit tests for the API. ts-jest was already a devDependency and `pnpm test`
 * already pointed at jest, but no config existed, so `*.spec.ts` files could not
 * actually run. This is the missing piece.
 *
 * E2E tests keep their own config at test/jest-e2e.json.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  moduleNameMapper: {
    '^@smart-hospital/shared$': '<rootDir>/../../../packages/shared/src/index.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { module: 'commonjs', target: 'es2021' } }],
  },
};
