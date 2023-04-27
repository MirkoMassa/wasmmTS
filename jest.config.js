/** @type {import('ts-jest').JestConfigWithTsJest} */
console.log("DIRECTORY", __dirname);
console.log("CWD", process.cwd());
module.exports = {
  testPathIgnorePatterns: [".js"],
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ["./src/*.ts"]
};