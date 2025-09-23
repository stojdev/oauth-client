import http from 'http';
import { URL } from 'url';
import { logger } from './Logger.js';

export interface CallbackResult {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
  fragment?: string; // For Implicit flow
}

/**
 * Creates a temporary HTTP server to handle OAuth callbacks
 */
export class CallbackServer {
  private server?: http.Server;
  private port: number;
  private hostname: string;
  private path: string;

  private handleFragment: boolean;

  constructor(redirectUri?: string, handleFragment = false) {
    const url = new URL(redirectUri || 'http://localhost:8080/callback');
    this.hostname = url.hostname;
    this.port = parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80);
    this.path = url.pathname;
    this.handleFragment = handleFragment;
  }

  /**
   * Start the callback server and wait for OAuth response
   */
  async waitForCallback(timeout = 300000): Promise<CallbackResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.stop();
        reject(new Error('Callback timeout - no response received'));
      }, timeout);

      this.server = http.createServer((req, res) => {
        const url = new URL(req.url || '/', `http://${req.headers.host}`);

        if (url.pathname !== this.path) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }

        // Extract query parameters
        const params = url.searchParams;
        const result: CallbackResult = {
          code: params.get('code') || undefined,
          state: params.get('state') || undefined,
          error: params.get('error') || undefined,
          error_description: params.get('error_description') || undefined,
        };

        // For Implicit flow, we need to handle fragments via JavaScript
        const fragmentScript = this.handleFragment
          ? `
              <script>
                // Check for fragment (Implicit flow)
                if (window.location.hash) {
                  // Send fragment to server
                  fetch(window.location.pathname + '?fragment=' + encodeURIComponent(window.location.hash.substring(1)))
                    .then(() => {
                      document.getElementById('status').innerHTML = '<h1 class="success">✅ Token Received</h1><p>You can now close this window and return to the terminal.</p>';
                    })
                    .catch(() => {
                      document.getElementById('status').innerHTML = '<h1 class="error">❌ Failed to process token</h1>';
                    });
                }
              </script>
            `
          : '';

        // Check if this is a fragment callback
        if (params.has('fragment')) {
          result.fragment = params.get('fragment') || undefined;
          res.writeHead(200);
          res.end('OK');
          clearTimeout(timeoutId);
          this.stop();
          resolve(result);
          return;
        }

        // Send success response to browser
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>OAuth Callback</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 400px;
              }
              h1 { color: #333; margin-bottom: 10px; }
              p { color: #666; margin: 20px 0; }
              .success { color: #4caf50; }
              .error { color: #f44336; }
              .close-btn {
                background: #667eea;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                margin-top: 20px;
              }
              .close-btn:hover { background: #5a67d8; }
            </style>
          </head>
          <body>
            <div class="container" id="status">
              ${
                result.error
                  ? `
                <h1 class="error">❌ Authorization Failed</h1>
                <p>${result.error_description || result.error}</p>
              `
                  : `
                <h1 class="success">✅ Authorization Successful</h1>
                <p>You can now close this window and return to the terminal.</p>
              `
              }
              <button class="close-btn" onclick="window.close()">Close Window</button>
              <script>
                setTimeout(() => window.close(), 5000);
              </script>
            </div>
            ${fragmentScript}
          </body>
          </html>
        `;

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);

        clearTimeout(timeoutId);
        this.stop();
        resolve(result);
      });

      this.server.listen(this.port, this.hostname, () => {
        logger.debug(
          `Callback server listening on http://${this.hostname}:${this.port}${this.path}`,
        );
      });

      this.server.on('error', (err) => {
        clearTimeout(timeoutId);
        this.stop();
        reject(err);
      });
    });
  }

  /**
   * Stop the callback server
   */
  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = undefined;
    }
  }

  /**
   * Get the redirect URI for this server
   */
  get redirectUri(): string {
    return `http://${this.hostname}:${this.port}${this.path}`;
  }
}
