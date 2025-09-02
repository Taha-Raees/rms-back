// Mock Next.js Request and Response
global.Request = class Request {
  constructor(input, init) {
    this.url = typeof input === 'string' ? input : input.url;
    this.method = init?.method || 'GET';
    // Ensure headers are handled correctly, even if init is undefined
    this.headers = new Map(
      (init && init.headers && Array.isArray(init.headers)) ? init.headers : []
    );
    this.body = init?.body ? JSON.parse(init.body) : null;
  }
  json() {
    return Promise.resolve(this.body);
  }
};

global.Response = class Response {
  constructor(body, init) {
    this.body = body;
    this.status = init?.status || 200;
    this.statusText = init?.statusText || 'OK';
    // Ensure headers are handled correctly
    this.headers = new Map(
      (init && init.headers && Array.isArray(init.headers)) ? init.headers : []
    );
  }
  json() {
    // Ensure body is a string before parsing
    const bodyStr = typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    return Promise.resolve(JSON.parse(bodyStr));
  }
};

// Mock NextRequest and NextResponse specifically for Next.js API routes
// This is a simplified mock. You might need to expand it based on your usage.
const { NextRequest, NextResponse } = require('next/server');

// Since Next.js might have its own internal Request/Response,
// we ensure our global mocks are used if NextRequest/NextResponse
// try to access the global ones.
jest.mock('next/server', () => ({
  ...jest.requireActual('next/server'),
  NextRequest: jest.fn().mockImplementation((url, init) => new global.Request(url, init)),
  NextResponse: {
    json: jest.fn((body, init) => new global.Response(JSON.stringify(body), init)),
    // Add other NextResponse methods if your routes use them (e.g., redirect, etc.)
  }
}));
