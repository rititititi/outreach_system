"""Start local Orbit with a hidden API-key prompt; does not save the key."""
import getpass
import os
import runpy
from pathlib import Path

if __name__ == '__main__':
    if not os.environ.get('MODASH_API_KEY', '').strip():
        os.environ['MODASH_API_KEY'] = getpass.getpass('Modash Discovery API key (hidden, not saved): ').strip()
    if not os.environ.get('MODASH_API_KEY'):
        raise SystemExit('No key provided. Your PDF uploads and saved catalog still work without discovery.')
    runpy.run_path(str(Path(__file__).with_name('server.py')), run_name='__main__')
