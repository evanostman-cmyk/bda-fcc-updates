#!/usr/bin/env python3
"""Download the FCC weekly ULS license archives and publish a state-indexed BDA snapshot.
No third-party libraries or login are needed for the FCC data. Source: official FCC ULS.
This converts P25-compatible FCC *licenses*, not verified on-air P25 control channels.
"""
from collections import Counter, defaultdict
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
import argparse
import json
import os
import shutil
import sys
import time
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import zipfile
from fcc_builder import parse_archive

FCC_BASE='https://data.fcc.gov/download/pub/uls/complete/'
ARCHIVES=('l_LMpriv.zip','l_LMcomm.zip','l_LMbcast.zip')

def fetch_archive(name, target):
    address=FCC_BASE+name
    for attempt in range(1,4):
        try:
            req=Request(address,headers={'User-Agent':'BDAChannelPlanner/1.0 (public FCC data backup)', 'Accept':'application/zip,application/octet-stream,*/*'})
            print(f'Fetching {address} (attempt {attempt})',flush=True)
            with urlopen(req,timeout=180) as response, target.open('wb') as out:
                shutil.copyfileobj(response,out,1024*1024)
            if target.stat().st_size<10000: raise ValueError('ZIP unexpectedly small')
            with zipfile.ZipFile(target) as z:
                if z.testzip() is not None:raise ValueError('FCC archive has a corrupted member')
                if not {'LO.dat','FR.dat','EM.dat','HD.dat','EN.dat'}.issubset({Path(f).name.upper().replace('.DAT','.dat') for f in z.namelist()}):
                    raise ValueError('FCC archive does not contain the required license tables')
            return
        except Exception as exc:
            if target.exists():target.unlink()
            if attempt==3:raise RuntimeError(f'FCC source {name} unavailable; prior hosted snapshot should be retained: {exc}') from exc
            time.sleep(attempt*10)

def build(args):
    output=args.output.resolve();state_dir=output/'states'
    state_dir.mkdir(parents=True,exist_ok=True)
    accepted={};stats=Counter();paths=[]
    for name in ARCHIVES:
        path=args.download_dir/name
        if args.download and not args.keep_downloads or not path.exists():fetch_archive(name,path)
        if not path.exists():raise FileNotFoundError(f'Missing FCC archive: {path}')
        paths.append(path)
    for path in paths:parse_archive(path,'ALL',False,accepted,stats)
    if len(accepted)<10000:raise RuntimeError(f'Refusing to publish suspiciously small FCC snapshot ({len(accepted)} records).')
    by_state=defaultdict(list)
    for row in accepted.values():by_state[row['state']].append(row)
    created=datetime.now(timezone.utc).isoformat()
    states={};geocoded=0
    for state,rows in sorted(by_state.items()):
        rows.sort(key=lambda r:(r['county'],r['city'],r['callsign'],r['locationNumber'],r['mhz'],r['station']))
        geocoded+=sum(r.get('latitude') is not None and r.get('longitude') is not None for r in rows)
        data={'format':'BDA-FCC-State-v1','state':state,'records':rows}
        blob=json.dumps(data,ensure_ascii=False,separators=(',',':')).encode('utf-8')
        fname=f'{state}.json';(state_dir/fname).write_bytes(blob)
        states[state]={'file':f'states/{fname}','records':len(rows),'sha256':sha256(blob).hexdigest(),'bytes':len(blob)}
        print(f'  {state}: {len(rows):,} records / {len(blob)/1e6:.1f} MB',flush=True)
    if geocoded==0:raise RuntimeError('No FCC coordinates were decoded. Refusing to publish a map-less update.')
    manifest={'format':'BDA-FCC-Hosted-v1','generatedAt':created,'source':'FCC ULS complete weekly license archives',
        'sourceArchives':list(ARCHIVES),'recordCount':len(accepted),'geocodedRecords':geocoded,
        'notes':'FCC licenses with P25-compatible emissions; NOT proof of currently operational radio transmitters or control channels.',
        'states':states}
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    print(f'Published {len(accepted):,} FCC frequency records in {len(states)} states; {geocoded:,} with GPS coordinates.',flush=True)
    if not args.keep_downloads:
        for f in paths:
            try:f.unlink()
            except OSError:pass

def main():
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,default=Path('site'));p.add_argument('--download-dir',type=Path,default=Path('fcc-input'));p.add_argument('--download',action='store_true',help='Fetch fresh official FCC ZIPs even when local ZIPs exist');p.add_argument('--keep-downloads',action='store_true',help='Retain downloaded ZIP archives after build')
    a=p.parse_args();a.download_dir.mkdir(exist_ok=True,parents=True)
    build(a)
if __name__=='__main__':main()
