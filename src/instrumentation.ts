export async function register() {
  // File logging uses fs, so it only runs in the Node.js server runtime.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { installConsoleCapture } = await import('./lib/logging/console-capture');
    installConsoleCapture();
  }
}
