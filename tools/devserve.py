"""Dev-only static server that forbids caching.

The stock http.server sends Last-Modified and honours conditional requests, so
a browser (and especially an <iframe>) will happily keep serving a stale
styles.css after an edit. That produced several misleading measurements during
development. This sends Cache-Control: no-store on everything.

    python tools/devserve.py [port]
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, *a):
        pass


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ThreadingHTTPServer(('127.0.0.1', port), NoCache).serve_forever()
