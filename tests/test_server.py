import base64
import io
import json
import sys
import threading
import unittest
import urllib.error
import urllib.request
import zipfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import Handler, ThreadingHTTPServer, extract_text

TEXT = 'Company: Test Labs\nProducts: Skincare serum and cleanser for adults in our local market.'

class ExtractionTests(unittest.TestCase):
    def test_text(self):
        self.assertEqual(extract_text('a.txt', TEXT.encode()), TEXT)

    def test_word(self):
        f = io.BytesIO()
        with zipfile.ZipFile(f, 'w') as z:
            z.writestr('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>'+TEXT+'</w:t></w:r></w:p></w:body></w:document>')
        self.assertIn('Company: Test Labs', extract_text('a.docx', f.getvalue()))

    def test_pdf(self):
        # Minimal text-based PDF fixture, generated without another dependency.
        stream = b'BT /F1 12 Tf 50 700 Td (' + TEXT.replace('\n', ' ').encode() + b') Tj ET'
        objs = [b'<< /Type /Catalog /Pages 2 0 R >>', b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>', b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', b'<< /Length '+str(len(stream)).encode()+b' >>\nstream\n'+stream+b'\nendstream']
        data=b'%PDF-1.4\n'; offsets=[0]
        for i, obj in enumerate(objs, 1):
            offsets.append(len(data));data+=f'{i} 0 obj\n'.encode()+obj+b'\nendobj\n'
        xref=len(data);data+=b'xref\n0 6\n0000000000 65535 f \n'
        for n in offsets[1:]:data+=f'{n:010d} 00000 n \n'.encode()
        data+=f'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF'.encode()
        self.assertIn('Company: Test Labs', extract_text('a.pdf',data))

    def test_rejects(self):
        for name,data in [('a.exe',TEXT.encode()),('a.txt',b''),('a.txt',b'short'),('a.txt',b'x'*(8*1024*1024+1)),('a.txt',b'x'*120001)]:
            with self.assertRaises(ValueError):extract_text(name,data)

class APITests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=ThreadingHTTPServer(('127.0.0.1',0),Handler);cls.url='http://127.0.0.1:'+str(cls.server.server_port)
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close();cls.thread.join()
    def request(self,path,body=None,origin=None):
        headers={'Content-Type':'application/json'}
        if origin:headers['Origin']=origin
        req=urllib.request.Request(self.url+path,data=json.dumps(body).encode() if body is not None else None,headers=headers)
        try:
            with urllib.request.urlopen(req) as r:return r.status,r.read()
        except urllib.error.HTTPError as r:return r.code,r.read()
    def test_api(self):
        code,body=self.request('/api/extract',{'name':'test.txt','data':base64.b64encode(TEXT.encode()).decode()},self.url)
        self.assertEqual(code,200);self.assertEqual(json.loads(body)['text'],TEXT)
    def test_origin_and_private_files(self):
        self.assertEqual(self.request('/api/extract',{},'https://other.example')[0],403)
        for p in ['/server.py','/.git/config','/README.md','/../server.py']:self.assertEqual(self.request(p)[0],404)
    def test_invalid_payload(self):
        for body in [{},{'name':'x.txt','data':'%%%INVALID%%%'},['bad']]:self.assertEqual(self.request('/api/extract',body)[0],400)
    def test_app(self):
        self.assertEqual(self.request('/')[0],200)
        self.assertEqual(self.request('/engine.js')[0],200)

if __name__=='__main__':unittest.main()
