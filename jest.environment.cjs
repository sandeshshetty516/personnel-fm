const { TestEnvironment } = require('jest-environment-jsdom');

/**
 * jsdom lacks the Fetch API that React Router uses for navigations, so expose Node's built-ins.
 * AbortController/AbortSignal must come from Node too: Node's Request rejects jsdom's signals.
 */
class JsdomWithFetchEnvironment extends TestEnvironment {
  constructor(...args) {
    super(...args);
    Object.assign(this.global, {
      fetch,
      Request,
      Response,
      Headers,
      FormData,
      ReadableStream,
      AbortController,
      AbortSignal,
      TextEncoder,
      TextDecoder,
    });
  }
}

module.exports = JsdomWithFetchEnvironment;
