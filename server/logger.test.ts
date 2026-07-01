import { describe, it, expect, vi } from "vitest";
import { logger, winstonLogger, loggerStorage } from "./logger.js";
import winston from "winston";

describe("Logger Adapter", () => {
  it("should log info message without arguments", () => {
    const spy = vi.spyOn(winstonLogger, "info");
    logger.info("Test message");
    expect(spy).toHaveBeenCalledWith("Test message");
    spy.mockRestore();
  });

  it("should log info message with basic arguments", () => {
    const spy = vi.spyOn(winstonLogger, "info");
    logger.info("Test message", "arg1", 123);
    expect(spy).toHaveBeenCalledWith("Test message arg1 123");
    spy.mockRestore();
  });

  it("should log info message with object arguments", () => {
    const spy = vi.spyOn(winstonLogger, "info");
    logger.info("Test message", { foo: "bar" });
    expect(spy).toHaveBeenCalledWith('Test message {"foo":"bar"}');
    spy.mockRestore();
  });

  it("should log warn message", () => {
    const spy = vi.spyOn(winstonLogger, "warn");
    logger.warn("Warn message", "arg1");
    expect(spy).toHaveBeenCalledWith("Warn message arg1");
    spy.mockRestore();
  });

  it("should log debug message", () => {
    const spy = vi.spyOn(winstonLogger, "debug");
    logger.debug("Debug message", "arg1");
    expect(spy).toHaveBeenCalledWith("Debug message arg1");
    spy.mockRestore();
  });

  it("should log error message with Error object and regular object", () => {
    const spy = vi.spyOn(winstonLogger, "error");
    const testError = new Error("Test error");
    logger.error("Error message", testError, { detail: "extra" });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("Error: Test error"));
    spy.mockRestore();
  });

  it("should output correctly in consoleFormat and traceFormat", () => {
    let logged = false;
    loggerStorage.run({ requestId: "custom-req-id" }, () => {
      logger.info("Message inside store context");
      logged = true;
    });
    expect(logged).toBe(true);
  });
});
