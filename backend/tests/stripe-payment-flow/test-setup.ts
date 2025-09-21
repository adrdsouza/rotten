/**
 * Test setup for Stripe payment flow tests
 * Configures global test environment and mocks
 */

import { Logger } from '@vendure/core';

// Mock environment variables
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing';
process.env.NODE_ENV = 'test';

// Configure logger for tests
Logger.useLogger({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
});

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};