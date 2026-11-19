#!/usr/bin/env python3
"""Prepare OFFLINE FCC ULS licensed P25-compatible frequency snapshots for the BDA planner.

Standard library only. Downloads are intentionally done separately via FCC website.
Input: 1-3 full LICENSE archives, e.g. l_LMpriv.zip, l_LMcomm.zip, l_LMbcast.zip.
Output: ONE complete USA JSON file with --single-file, or split by state by default.

This is *authorized emission data* -- NOT confirmed active P25 control channels.
The FCC does not supply a definitive nationwide list of on-air P25 channels.
"""
import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import re
import sys
import zipfile

# APCO common designators; FCC license indicates capability, not confirmed use.
# Include phase 1, phase 2, CQPSK/LSM variations. Deliberately no 'F3E'.
P25_CODES = re.compile(
    r'^(?:8K(?:00|10|30|40)F1[DEW]|8K10F7W|8K10DXW|'
    r'8K70D1W|9K70F1[DE]|9K80D7W|9K80F1[DE]|'
    r'5K76G1E|8K10G1W|9K80G1W)$', re.I)

def band(mhz):
    if 136 <= mhz <= 174: return 'VHF'
    if 380 <= mhz <= 520: return 'UHF'
    if 758 <= mhz <= 824: return '700/800-MOBILE'
    if 851 <= mhz <= 870: return '800'
    if 896 <= mhz <= 941: return '900'
    return ''

def numeric_frequency(raw):
    try:
        value = round(float(raw), 6)
        return value if band(value) else None
    except (ValueError, TypeError):
        return None

def members(z, base):
    found = [n for n in z.namelist() if Path(n).name.upper() == base.upper()]
    return found[0] if found else None

def records(z, base):
    found = members(z, base)
    if not found:
        raise ValueError(f'{z.filename}: missing required {base}. Use a weekly FCC LICENSE archive.')
    with z.open(found) as stream:
        for raw in stream:
            p = raw.decode('latin-1', 'replace').rstrip('\r\n').split('|')
            if len(p) > 10: yield p

def usi(row):
    return row[1].strip()

def coordinates_from_lo(p):
    # FCC ULS LO: positions 20..27 (1-based). See ULS File Formats LO.
    def coordinate(i, direction, limit):
        d, m, s = (float(p[i+j].strip()) for j in range(3))
        h = p[direction].strip().upper()
        if not (math.isfinite(d) and math.isfinite(m) and math.isfinite(s)):
            return None
        if d < 0 or d > limit or not 0 <= m < 60 or not 0 <= s < 60:
            return None
        allowed = ('N', 'S') if limit == 90 else ('E', 'W')
        if h not in allowed:
            return None
        value=d+m/60+s/3600
        if value > limit:
            return None
        return round(-value if h in ('S','W') else value, 6)
    try:
        lat=coordinate(19,22,90)
        lon=coordinate(23,26,180)
        if lat is None or lon is None or (lat==0 and lon==0):
            return None
        return lat, lon
    except (IndexError, ValueError, TypeError):
        return None



def parse_archive(path, state_filter, base_only, accepted, stats):
    print(f'Reading {path.name} (P25 emissions, licenses, site locations, assignments)...', flush=True)
    with zipfile.ZipFile(path) as z:
        if not all(members(z,n) for n in ('EM.dat','FR.dat','HD.dat','EN.dat','LO.dat')):
            print(f'  WARNING: {path.name} does not contain all license tables; skipped.', file=sys.stderr)
            stats['archives_skipped']+=1
            return
        em = defaultdict(set)
        for p in records(z, 'EM.dat'):
            # Layout per FCC ULS public land-mobile EM: USI, loc#, antenna#, freq, designator
            if len(p) <= 9: continue
            code = p[9].strip().upper()
            if not P25_CODES.fullmatch(code): continue
            mhz = numeric_frequency(p[7])
            if mhz is None: continue
            em[(usi(p),p[5].strip(),p[6].strip(),mhz)].add(code)
            stats['matching_emission_rows']+=1
        if not em:
            print('  No matching P25-compatible emission codes found in this ZIP.', flush=True)
            return
        relevant_ids = {k[0] for k in em}
        active = {}
        for p in records(z, 'HD.dat'):
            if usi(p) not in relevant_ids: continue
            if p[5].strip().upper() != 'A': continue
            active[usi(p)] = {'callsign':p[4].strip().upper(), 'service':p[6].strip(), 'expires':p[8].strip()}
        stats['active_licenses']+=len(active)
        if not active: return
        names = {}
        for p in records(z, 'EN.dat'):
            uid=usi(p)
            if uid not in active: continue
            if p[5].strip().upper() == 'L' or uid not in names:
                name = p[7].strip() if len(p)>7 else ''
                if not name and len(p)>10: name=' '.join(filter(None,[p[8].strip(),p[10].strip()]))
                if name: names[uid]=name
        sites = {}
        for p in records(z, 'LO.dat'):
            uid=usi(p)
            if uid not in active: continue
            state=(p[14] if len(p)>14 else '').strip().upper()
            if not state or len(state)!=2: continue
            if state_filter != 'ALL' and state!=state_filter: continue
            locnum=p[8].strip()
            coords=coordinates_from_lo(p)
            sites[(uid,locnum)]={
                'state':state,'county':p[13].strip() or 'Not supplied',
                'city':p[12].strip(), 'site':p[42].strip() if len(p)>42 else '',
                'locationNumber':locnum,
                'latitude':coords[0] if coords else None,
                'longitude':coords[1] if coords else None,
            }
        stats['matching_locations']+=len(sites)
        if not sites: return
        valid_ids={k[0] for k in sites}
        matches=0
        for p in records(z, 'FR.dat'):
            uid=usi(p)
            if uid not in valid_ids: continue
            if len(p)<=10: continue
            locnum,antenna=p[6].strip(),p[7].strip()
            loc=sites.get((uid,locnum))
            if loc is None: continue
            mhz=numeric_frequency(p[10]); station=p[8].strip().upper()
            if mhz is None: continue
            if base_only and not station.startswith('FB'): continue
            codes=em.get((uid,locnum,antenna,mhz))
            if not codes: continue
            license=active[uid]
            # Keep each site + station class, avoid duplicate emission lines.
            dk=(license['callsign'],loc['state'],loc['county'],locnum,antenna,mhz,station)
            row={
                'callsign':license['callsign'], 'licensee':names.get(uid,'Not supplied'),
                'state':loc['state'], 'county':loc['county'], 'city':loc['city'],
                'site':loc['site'] or f'FCC Location {locnum}', 'locationNumber':locnum,
                'mhz':mhz, 'station':station,'service':license['service'],
                'emission':'; '.join(sorted(codes)),
                'p25':'P25-compatible FCC emission (unconfirmed on-air)',
                'status':'A (active in archive)', 'expires':license['expires'],
                'source':f'FCC ULS {path.name}', 'sourceType':'FCC weekly license bulk archive',
                'updated':'Archive snapshot date not independently verified',
                'latitude':loc['latitude'], 'longitude':loc['longitude'],
            }
            # Some older records are duplicated across archives. Keep better named row.
            if dk not in accepted or accepted[dk]['licensee']=='Not supplied': accepted[dk]=row
            matches+=1
        stats['matched_frequency_rows']+=matches
        print(f'  {len(em):,} P25 emission assignments; {len(active):,} active licenses; '
              f'{len(sites):,} matching site locations; {matches:,} joined frequency rows.',flush=True)

def main():
    parser=argparse.ArgumentParser(
        description='Generate searchable nationwide/state FCC P25-compatible license-frequency files for BDA Planner')
    parser.add_argument('archives',nargs='+',help='Downloaded FCC weekly license archives (ZIP files)')
    parser.add_argument('--state',default='ALL',help='Two-letter state (e.g. FL), or ALL to split entire US by state [default ALL]')
    parser.add_argument('--base-only',action='store_true',help='Include only FB*/base frequencies for downlink planning; default includes mobile/uplink too')
    parser.add_argument('--per-file',type=int,default=25000,help='Maximum records per state JSON output file (default 25000; ignored for --single-file)')
    parser.add_argument('--single-file',action='store_true',help='Write ONE JSON containing all selected states instead of state-by-state files')
    parser.add_argument('--output',default='FCC_P25_USA.json',help='Filename for --single-file output (default FCC_P25_USA.json)')
    parser.add_argument('--output-dir',default='FCC_P25_US_By_State',help='Directory for output state JSON files')
    args=parser.parse_args()
    state=args.state.upper().strip()
    if state!='ALL' and not re.fullmatch('[A-Z]{2}',state):parser.error('--state must be two letters or ALL')
    if not 100<=args.per_file<=100000:parser.error('--per-file must be between 100 and 100000')
    paths=[Path(x) for x in args.archives]
    for path in paths:
        if not path.is_file():parser.error(f'Missing input ZIP: {path}')
    outdir=Path(args.output_dir);outdir.mkdir(parents=True,exist_ok=True)
    accepted={};stats=Counter()
    for path in paths:
        parse_archive(path,state,args.base_only,accepted,stats)
    bystate=defaultdict(list)
    for row in accepted.values():bystate[row['state']].append(row)
    if args.single_file:
        # Exactly one JSON output. Stream JSON row by row to avoid creating an
        # additional giant string when processing the entire country.
        output_path=outdir/Path(args.output).name
        if output_path.suffix.lower() != '.json': parser.error('--output must end with .json')
        now=datetime.now(timezone.utc).isoformat()
        metadata={
            'format':'BDA-FCC-Offline-Database','version':1,
            'description':'FCC-authorized P25-compatible emissions, NOT verified active P25 control channels',
            'generatedAt':now,'state':state,
            'sourceArchives':[p.name for p in paths],
            'recordCount':len(accepted),
        }
        print(f'\nWriting one nationwide JSON file ({len(accepted):,} records)...', flush=True)
        # Sort the records for predictable ordering / easy inspection.
        sorted_rows=sorted(accepted.values(),key=lambda r:(r['state'],r['county'],r['city'],r['callsign'],r['mhz'],r['station']))
        with output_path.open('w',encoding='utf-8') as f:
            f.write('{')
            for i,(key,value) in enumerate(metadata.items()):
                if i: f.write(',')
                f.write(json.dumps(key,ensure_ascii=False)+':')
                f.write(json.dumps(value,ensure_ascii=False,separators=(',',':')))
            f.write(',"records":[')
            for i,row in enumerate(sorted_rows):
                if i: f.write(',')
                f.write(json.dumps(row,ensure_ascii=False,separators=(',',':')))
            f.write(']}')
        size=output_path.stat().st_size
        print(f'DONE: {output_path.resolve()}')
        print(f'Includes {len(bystate)} states/territories, {len(accepted):,} licensed P25-compatible frequency rows; {size/1e6:.1f} MB.')
        if len(accepted)>200000 or size>55000000:
            print('WARNING: The current BDA HTML app limits imports to 200,000 rows and 55 MB per file.')
            print('This complete JSON was NOT truncated; it may be too large for that app to import.')
            print('To fit the existing importer, a reduced extract or an app database upgrade is required.')
        else:
            print('Size/count pass the app import caps; import speed depends on your computer and browser.')
        print('P25-compatible licensing does not establish that a transmitter is currently on the air.')
        return
    print('\nCreating state files...',flush=True)
    index=[]
    now=datetime.now(timezone.utc).isoformat()
    for st in sorted(bystate):
        group=sorted(bystate[st],key=lambda r:(r['county'],r['city'],r['licensee'],r['mhz'],r['station']))
        for i,offset in enumerate(range(0,len(group),args.per_file),start=1):
            part=group[offset:offset+args.per_file]
            name=f'FCC_P25_{st}_{i:02d}.json'
            result={'format':'BDA-FCC-Offline-Database','version':1,
                    'description':'FCC-authorized P25-compatible emissions, NOT verified active P25 control channels',
                    'generatedAt':now,'state':st,'sourceArchives':[p.name for p in paths],
                    'recordCount':len(part),'records':part}
            dest=outdir/name
            dest.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
            index.append({'state':st,'file':name,'records':len(part),'size_mb':round(dest.stat().st_size/1e6,2)})
        print(f'  {st}: {len(group):,} P25-compatible licensed frequency rows',flush=True)
    with (outdir/'IMPORT_ORDER.csv').open('w',encoding='utf-8') as f:
        f.write('State,Filename,Records,File MB\n')
        for item in index:f.write(f"{item['state']},{item['file']},{item['records']},{item['size_mb']}\n")
    summary={'generatedAt':now,'sourceArchives':[str(p) for p in paths],
             'filter':'FCC licenses active at archive snapshot, frequencies with P25-compatible emission designators',
             'stationFilter':'Base only (FB*)' if args.base_only else 'All station classes',
             'stateFilter':state, 'records':len(accepted),'states':{s:len(rows) for s,rows in bystate.items()},
             'processingStatistics':dict(stats),'files':index,
             'limitations':['Does not prove on-air P25 or control channel role',
                            'Excludes records without a matching state-coded FCC location',
                            'Does not include federal NTIA-only assignments',
                            'Does not include records without listed P25-compatible emission codes',
                            'Does not include wide-area market licenses without site/frequency links']}
    (outdir/'DATABASE_BUILD_REPORT.json').write_text(json.dumps(summary,indent=2),encoding='utf8')
    print(f'\nFinished: {len(accepted):,} P25-compatible licensed frequency rows in '
          f'{len(index)} JSON file(s). Files located in {outdir.resolve()}')
    print('In the BDA Planner: FCC Search > Database updates > Import FCC CSV or JSON.')
    print('Import one state file at a time; app supports up to 200,000 cumulative imported records.')
    print('The FCC files are licensed-frequency references, NOT verified BDA channel plans.')

if __name__=='__main__':
    try: main()
    except (OSError,ValueError,zipfile.BadZipFile) as exc:
        print(f'ERROR: {exc}',file=sys.stderr);sys.exit(1)
