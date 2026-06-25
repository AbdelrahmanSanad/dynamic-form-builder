import closeWithGrace from 'close-with-grace';
import { buildApp } from './app.js';
import { env } from './config/env.js';

/**
 * Process entrypoint. Builds the app, starts listening, and wires up graceful
 * shutdown so in-flight requests drain and the DB connection closes cleanly.
 */
async function main(): Promise<void> {
  const app = await buildApp();

  closeWithGrace({ delay: 10_000 }, async ({ signal, err }) => {
    if (err) {
      app.log.error({ err }, 'Shutting down due to error');
    } else {
      app.log.info({ signal }, 'Shutting down gracefully');
    }
    await app.close();
  });

  try {
    await app.listen({ host: env.HOST, port: env.PORT });
  } catch (err) {
    app.log.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

void main();
