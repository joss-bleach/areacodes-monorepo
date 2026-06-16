export default class PostHog {
  capture(_event: string, _properties?: Record<string, unknown>) {}
  screen(_name: string, _properties?: Record<string, unknown>) {
    return Promise.resolve();
  }
  identify(_id: string, _properties?: Record<string, unknown>) {}
  flush() {
    return Promise.resolve();
  }
  shutdown() {
    return Promise.resolve();
  }
}
