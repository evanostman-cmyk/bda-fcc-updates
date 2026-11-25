#!/usr/bin/env python3
"""Check the deployed Pages bytes and cross-origin access used by local HTML."""
import argparse
import hashlib
import json
import time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urljoin

def get(base, path, cors=False):
    url=urljoin(base.rstrip('/')+'/',path)+'?verify='+str(time.time_ns())
    with urlopen(Request(url,headers={'Origin':'null','Cache-Control':'no-cache','User-Agent':'Batwing-release-verifier'}),timeout=30) as res:
        if cors and res.headers.get('Access-Control-Allow-Origin') not in ('*','null'):
            raise ValueError('Offline HTML cross-origin access not allowed for '+path)
        return res.read()

def check(base, root):
    manifest=json.loads((root/'manifest.json').read_bytes())
    release=json.loads((root/'release.json').read_bytes())
    assert hashlib.sha256(get(base,'index.html')).hexdigest()==release['html_sha256'],'Hosted application mismatch'
    assert hashlib.sha256(get(base,'Batwing_RF_Toolkit_v'+release['version']+'.zip')).hexdigest()==release['zip_sha256'],'Hosted ZIP mismatch'
    assert get(base,'manifest.json',True)==(root/'manifest.json').read_bytes(),'Live manifest mismatch'
    for state in ('FL','CA','NY'):
        entry=manifest['states'][state]
        data=get(base,entry['file'],True)
        assert len(data)==entry['bytes'] and hashlib.sha256(data).hexdigest()==entry['sha256'],state+' live state mismatch'
    print('Live HTML, offline ZIP, manifest, FL/CA/NY checksums and offline CORS verified.')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('base');p.add_argument('--root',type=Path,default=Path('site'));a=p.parse_args()
    for attempt in range(5):
        try:
            check(a.base,a.root);break
        except Exception as err:
            print(f'Live verification attempt {attempt+1}: {err}',flush=True)
            if attempt==4: raise
            time.sleep(20)
