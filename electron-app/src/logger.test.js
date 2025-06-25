/**
 * Basic tests for DPS Logger
 */

const os = require('os');
const path = require('path');
const fs = require('fs');

describe('DPS Logger', () => {
  let logger;
  
  beforeEach(() => {
    // Clean require cache to get fresh logger instance
    delete require.cache[require.resolve('./logger')];
    logger = require('./logger');
  });

  test('logger initializes successfully', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
  });

  test('logger creates log file', () => {
    const logFile = logger.getLogFile();
    expect(logFile).toBeDefined();
    if (logFile) {
      expect(fs.existsSync(logFile)).toBe(true);
    }
  });

  test('logger logs messages to memory', () => {
    logger.info('Test message');
    const logs = logger.getLogs();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[logs.length - 1].message).toBe('Test message');
  });

  test('logger handles errors gracefully', () => {
    const testError = new Error('Test error');
    expect(() => {
      logger.error('Test error message', testError);
    }).not.toThrow();
  });

  test('logger serializes data properly', () => {
    const testData = { test: 'value', number: 42 };
    logger.info('Test data message', testData);
    const logs = logger.getLogs();
    const lastLog = logs[logs.length - 1];
    expect(lastLog.data).toEqual(testData);
  });
});