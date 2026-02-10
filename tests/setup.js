/**
 * Jest setup file - runs before all tests
 * Suppresses console.log and console.warn output in tests for cleaner output
 */

// Store original methods
const originalWarn = console.warn;
const originalLog = console.log;

// Suppress console.warn globally, except for explicit test assertions
global.console = {
    ...console,
    warn: jest.fn((...args) => {
        // Optionally, you can filter specific warnings here
        // For now, we suppress all warnings in tests
    }),
    log: jest.fn((...args) => {
        // Suppress all logs in tests for cleaner output
    })
};

// Export originals if tests need to restore them
global.__originalConsole = {
    warn: originalWarn,
    log: originalLog
};
