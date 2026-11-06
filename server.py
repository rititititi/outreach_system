"""Local Orbit server: serves app assets and extracts PDF/DOCX text in memory."""
import base64
import binascii
import io
import json
import zipfile
from discovery import configured, search, DiscoveryError
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parent
MAX_FILE = 8 * 1024 * 1024
MAX_TEXT = 120000
ASSETS = {'/': 'index.html', '/index.html': 'index.html', '/style.css': 'style.css', '/app.js': 'app.js', '/engine.js': 'engine.js', '/pdf-reader.js': 'pdf-reader.js', '/creator-data.js': 'creator-data.js'}


def extract_text(name, data):
    if not data or len(data) > MAX_FILE:
        raise ValueError('Choose a nonempty file smaller than 8 MB.')
    suffix = Path(name).suffix.lower()
    if suffix in {'.txt', '.md'}:
        text = data.decode('utf-8-sig')
    elif suffix == '.docx':
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            info = archive.getinfo('word/document.xml')
            if info.file_size > 4 * 1024 * 1024:
                raise ValueError('Word document is too large when expanded.')
            root = ElementTree.fromstring(archive.read(info))
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            text = '\n'.join(''.join(p.itertext()) for p in root.findall('.//w:p', ns))
    elif suffix == '.pdf':
        try:
            from pypdf import PdfReader
        except ImportError as exc:
            raise ValueError('PDF support needs: python -m pip install -r requirements.txt') from exc
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise ValueError('Use an unencrypted PDF.')
        if len(reader.pages) > 60:
            raise ValueError('Use a portfolio with 60 pages or fewer.')
        chunks = []
        for page in reader.pages:
            chunks.append(page.extract_text() or '')
            if sum(map(len, chunks)) > MAX_TEXT:
                raise ValueError('Use a shorter portfolio (up to 120,000 text characters).')
        text = '\n'.join(chunks)
    else:
        raise ValueError('Supported files: PDF, DOCX, TXT, and Markdown.')
    text = text.strip()
    if len(text) < 40:
        raise ValueError('Not enough readable text. For scanned PDFs, paste OCR text instead.')
    if len(text) > MAX_TEXT:
        raise ValueError('Use a shorter portfolio (up to 120,000 text characters).')
    return text


class Handler(BaseHTTPRequestHandler):
    def respond(self, status, body, content_type='application/json'):
        if not isinstance(body, bytes):
            body = json.dumps(body).encode()
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split('?')[0]
        if path == '/api/discovery/status':
            return self.respond(200, {'configured': configured(), 'provider': 'Modash', 'note': 'Configured does not verify provider access or credits.'})
        if path not in ASSETS:
            return self.respond(404, {'error': 'Not found'})
        file = ROOT / ASSETS[path]
        content_type = {'.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8'}[file.suffix]
        self.respond(200, file.read_bytes(), content_type)

    def do_POST(self):
        if self.path == '/api/discovery/search':
            return self.discover()
        if self.path != '/api/extract':
            return self.respond(404, {'error': 'Not found'})
        # Restrict cross-site browser requests to this local origin.
        expected = 'http://' + self.headers.get('Host', '')
        if self.headers.get('Origin') not in (None, expected):
            return self.respond(403, {'error': 'Open the app from this server.'})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 12 * 1024 * 1024:
                return self.respond(413, {'error': 'Request too large or empty.'})
            if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                return self.respond(415, {'error': 'Expected JSON.'})
            payload = json.loads(self.rfile.read(size))
            if not isinstance(payload, dict) or not isinstance(payload.get('name'), str) or not isinstance(payload.get('data'), str):
                raise ValueError('Expected a file name and base64 file content.')
            data = base64.b64decode(payload['data'], validate=True)
            text = extract_text(payload['name'], data)
            self.respond(200, {'text': text})
        except (ValueError, UnicodeError, binascii.Error, KeyError, zipfile.BadZipFile, ElementTree.ParseError):
            self.respond(400, {'error': 'Cannot read this file. Use a text-based PDF, DOCX, or UTF-8 text file; check file size and contents.'})
        except Exception:
            self.respond(422, {'error': 'Document extraction failed. Try exporting to text or pasting the content.'})

    def discover(self):
        expected = 'http://' + self.headers.get('Host', '')
        if self.headers.get('Origin') not in (None, expected):
            return self.respond(403, {'error': 'Open discovery from this server.'})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 16384:
                return self.respond(413, {'error': 'Search request must be 16 KB or smaller.'})
            if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                return self.respond(415, {'error': 'Expected JSON.'})
            self.respond(200, search(json.loads(self.rfile.read(size))))
        except ValueError as exc:
            self.respond(400, {'error': str(exc)[:250]})
        except DiscoveryError as exc:
            self.respond(exc.status, {'error': str(exc)})
        except Exception:
            self.respond(502, {'error': 'Discovery failed. Check server setup and provider availability.'})

    def log_message(self, fmt, *args):
        # Avoid logging document contents or user filenames.
        pass


if __name__ == '__main__':
    print('Orbit running at http://127.0.0.1:8000 (local development only)')
    ThreadingHTTPServer(('127.0.0.1', 8000), Handler).serve_forever()
