#!/usr/bin/env python3
"""Publish the exact reviewed standalone release, without executing ZIP contents."""
import argparse
import hashlib
import json
import re
import subprocess
import tempfile
import zipfile
from pathlib import Path
from html.parser import HTMLParser

class Audit(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.scripts=[]
        self.ids=set()
        self.active=None
        self.catalog=None
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if a.get('id'):
            if a['id'] in self.ids: raise ValueError('Duplicate HTML ID: '+a['id'])
            self.ids.add(a['id'])
        if tag=='script':
            if 'src' in a: raise ValueError('Unexpected external script')
            self.active=(a,[])
        if tag=='link' and 'stylesheet' in a.get('rel','').lower().split():
            raise ValueError('Unexpected external stylesheet')
    def handle_data(self, data):
        if self.active is not None: self.active[1].append(data)
    def handle_endtag(self, tag):
        if tag=='script' and self.active is not None:
            a,parts=self.active
            data=''.join(parts)
            if a.get('type')=='application/json':
                if a.get('id')=='batwingBundledCatalog': self.catalog=json.loads(data)
            elif a.get('type','') in ('','text/javascript','application/javascript'):
                self.scripts.append(data)
            else: raise ValueError('Unexpected script type')
            self.active=None

def digest(data): return hashlib.sha256(data).hexdigest()

def prepare(root, output):
    lock=json.loads((root/'release-lock.json').read_text(encoding='utf-8'))
    version=lock['version']
    if not re.fullmatch(r'\d+\.\d+',version): raise ValueError('Invalid release version')
    stem='Batwing_RF_Toolkit_v'+version
    archive=root/(stem+'.zip')
    blob=archive.read_bytes()
    if digest(blob)!=lock['zip_sha256']: raise ValueError('Release ZIP checksum mismatch')
    with zipfile.ZipFile(archive) as z:
        if z.namelist()!=[stem+'.html'] or z.testzip(): raise ValueError('Invalid single-file release ZIP')
        if z.infolist()[0].file_size>50*1024*1024: raise ValueError('HTML exceeds release size limit')
        html=z.read(stem+'.html')
    if digest(html)!=lock['html_sha256']: raise ValueError('Release HTML checksum mismatch')
    source=html.decode('utf-8')
    if not re.search(r'<title>[^<]*v'+re.escape(version)+r'\b',source): raise ValueError('HTML title version mismatch')
    parser=Audit();parser.feed(source);parser.close()
    if len(parser.scripts)!=lock['script_count'] or not parser.catalog: raise ValueError('Missing scripts or component catalog')
    with tempfile.TemporaryDirectory() as tmp:
        for i,script in enumerate(parser.scripts):
            p=Path(tmp)/f'script{i}.js';p.write_text(script,encoding='utf-8')
            subprocess.run(['node','--check',str(p)],check=True)
    output.mkdir(parents=True,exist_ok=True)
    (output/'index.html').write_bytes(html)
    (output/(stem+'.zip')).write_bytes(blob)
    (output/'release.json').write_text(json.dumps(lock,indent=2)+'\n',encoding='utf-8')
    print(f'Validated {stem}: {len(parser.scripts)} executable scripts; hosted HTML and offline ZIP match pinned hashes.')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--root',type=Path,default=Path('.'));p.add_argument('--output',type=Path,default=Path('site'));a=p.parse_args();prepare(a.root,a.output)
