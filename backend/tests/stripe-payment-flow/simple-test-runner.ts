#!/usr/bin/env ts-node

/**
 * Simple test runner for Stripe payment flow tests
 * Executes tests without Jest dependency
 */

import { Logger } from '@vendure/core';

// Mock console for cleaner output
const originalConsole = console;
console.log = (...args) => Logger.info(args.join(' '), 'TestRunner');
console.error = (...args) => Logger.error(args.join(' '), 'TestRunner');
console.warn = (...args) => Logger.warn(args.join(' '), 'TestRunner');

// Test results tracking
interface TestResult {
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    error?: Error;
    duration: number;
}

class SimpleTestRunner {
    private results: TestResult[] = [];
    private currentSuite = '';

    describe(suiteName: string, callback: () => void) {
        this.currentSuite = suiteName;
        Logger.info(`\n📋 Running test suite: ${suiteName}`, 'TestRunner');
        Logger.info('='.repeat(50), 'TestRunner');
        
        try {
            callback();
        } catch (error) {
            Logger.error(`Test suite ${suiteName} failed: ${error}`, 'TestRunner');
        }
    }

    it(testName: string, callback: () => Promise<void> | void) {
        const fullName = `${this.currentSuite} > ${testName}`;
        const startTime = Date.now();
        
        Logger.info(`🧪 ${testName}`, 'TestRunner');
        
        try {
            const result = callback();
            
            if (result instanceof Promise) {
                return result.then(() => {
                    const duration = Date.now() - startTime;
                    this.results.push({ name: fullName, status: 'passed', duration });
                    Logger.info(`  ✅ PASSED (${duration}ms)`, 'TestRunner');
                }).catch((error) => {
                    const duration = Date.now() - startTime;
                    this.results.push({ name: fullName, status: 'failed', error, duration });
                    Logger.error(`  ❌ FAILED (${duration}ms): ${error.message}`, 'TestRunner');
                });
            } else {
                const duration = Date.now() - startTime;
                this.results.push({ name: fullName, status: 'passed', duration });
                Logger.info(`  ✅ PASSED (${duration}ms)`, 'TestRunner');
            }
        } catch (error) {
            const duration = Date.now() - startTime;
            this.results.push({ name: fullName, status: 'failed', error: error as Error, duration });
            Logger.error(`  ❌ FAILED (${duration}ms): ${(error as Error).message}`, 'TestRunner');
        }
    }

    expect(actual: any) {
        return {
            toBe: (expected: any) => {
                if (actual !== expected) {
                    throw new Error(`Expected ${actual} to be ${expected}`);
                }
            },
            toEqual: (expected: any) => {
                if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                    throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
                }
            },
            toBeDefined: () => {
                if (actual === undefined) {
                    throw new Error(`Expected ${actual} to be defined`);
                }
            },
            toThrow: (expectedError?: string | RegExp) => {
                if (typeof actual !== 'function') {
                    throw new Error('Expected a function to test for throwing');
                }
                
                try {
                    actual();
                    throw new Error('Expected function to throw but it did not');
                } catch (error) {
                    if (expectedError) {
                        const message = (error as Error).message;
                        if (typeof expectedError === 'string' && !message.includes(expectedError)) {
                            throw new Error(`Expected error to contain "${expectedError}" but got "${message}"`);
                        }
                        if (expectedError instanceof RegExp && !expectedError.test(message)) {
                            throw new Error(`Expected error to match ${expectedError} but got "${message}"`);
                        }
                    }
                }
            },
            rejects: {
                toThrow: async (expectedError?: string | RegExp) => {
                    if (!(actual instanceof Promise)) {
                        throw new Error('Expected a Promise to test for rejection');
                    }
                    
                    try {
                        await actual;
                        throw new Error('Expected Promise to reject but it resolved');
                    } catch (error) {
                        if (expectedError) {
                            const message = (error as Error).message;
                            if (typeof expectedError === 'string' && !message.includes(expectedError)) {
                                throw new Error(`Expected error to contain "${expectedError}" but got "${message}"`);
                            }
                            if (expectedError instanceof RegExp && !expectedError.test(message)) {
                                throw new Error(`Expected error to match ${expectedError} but got "${message}"`);
                            }
                        }
                    }
                }
            }
        };
    }

    printSummary() {
        const passed = this.results.filter(r => r.status === 'passed').length;
        const failed = this.results.filter(r => r.status === 'failed').length;
        const total = this.results.length;
        const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);

        Logger.info('\n📊 TEST SUMMARY', 'TestRunner');
        Logger.info('='.repeat(50), 'TestRunner');
        Logger.info(`Total Tests: ${total}`, 'TestRunner');
        Logger.info(`✅ Passed: ${passed}`, 'TestRunner');
        Logger.info(`❌ Failed: ${failed}`, 'TestRunner');
        Logger.info(`⏱️  Total Time: ${totalTime}ms`, 'TestRunner');
        Logger.info(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`, 'TestRunner');

        if (failed > 0) {
            Logger.error('\n❌ FAILED TESTS:', 'TestRunner');
            this.results.filter(r => r.status === 'failed').forEach(result => {
                Logger.error(`  • ${result.name}: ${result.error?.message}`, 'TestRunner');
            });
        }

        return { passed, failed, total, success: failed === 0 };
    }
}

// Create global test functions
const testRunner = new SimpleTestRunner();
(global as any).describe = testRunner.describe.bind(testRunner);
(global as any).it = testRunner.it.bind(testRunner);
(global as any).expect = testRunner.expect.bind(testRunner);

// Mock Jest functions
(global as any).jest = {
    fn: () => {
        const mockFn = (...args: any[]) => mockFn.mockReturnValue;
        mockFn.mockReturnValue = undefined;
        mockFn.mockResolvedValue = (value: any) => { mockFn.mockReturnValue = Promise.resolve(value); return mockFn; };
        mockFn.mockRejectedValue = (value: any) => { mockFn.mockReturnValue = Promise.reject(value); return mockFn; };
        mockFn.mockImplementation = (fn: Function) => { mockFn.mockReturnValue = fn; return mockFn; };
        mockFn.mockClear = () => { mockFn.mockReturnValue = undefined; };
        return mockFn;
    },
    clearAllMocks: () => {},
    spyOn: (obj: any, method: string) => {
        const original = obj[method];
        const spy = (global as any).jest.fn();
        obj[method] = spy;
        spy.mockRestore = () => { obj[method] = original; };
        return spy;
    }
};

// Mock beforeAll, afterAll, beforeEach, afterEach
(global as any).beforeAll = (fn: Function) => fn();
(global as any).afterAll = (fn: Function) => fn();
(global as any).beforeEach = (fn: Function) => fn();
(global as any).afterEach = (fn: Function) => fn();

export { testRunner };