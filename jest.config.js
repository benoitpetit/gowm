module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.js'],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/browser.js'
    ],
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 60,
            lines: 55,
            statements: 55
        }
    },
    verbose: true
};
