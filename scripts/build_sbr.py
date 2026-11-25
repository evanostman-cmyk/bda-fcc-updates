#!/usr/bin/env python3
"""Retrieve and validate the public FCC Class B registration layer; no contacts."""
import argparse
import hashlib
import json
import math
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

LAYER="https://services.arcgis.com/YnOQrIGdN9JGtBh4/arcgis/rest/services/Signal_Booster_Regiatrations/FeatureServer/0"
FIELDS=("FID","booster_id","company_name","state","county","city","callsigns","frequencies","Latitude","Longitude","submitted","updated","data_as_of")
MINIMUM=15000  # conservative guard based on 18,482 observed in discovery
def require(condition,message):
    if not condition: raise ValueError(message)

def request(path,post=False,**params):
    encoded=urlencode({"f":"json",**params})
    url=LAYER+path if post else LAYER+path+"?"+encoded
    for attempt in range(3):
        try:
            with urlopen(Request(url,data=encoded.encode("ascii") if post else None,headers={"User-Agent":"Batwing public FCC SBR snapshot","Accept":"application/json","Content-Type":"application/x-www-form-urlencoded"}),timeout=45) as res:
                require(res.geturl().startswith(LAYER),"Unexpected service redirect")
                body=res.read(20*1024*1024+1)
            require(len(body)<=20*1024*1024,"Oversized source response")
            obj=json.loads(body)
            require(isinstance(obj,dict) and "error" not in obj,"ArcGIS error: "+str(obj.get("error","invalid response"))[:250])
            return obj
        except Exception:
            if attempt==2: raise
            time.sleep(2**attempt)

def text(value):
    return "" if value is None else str(value).strip()
def date(value):
    if isinstance(value,(int,float)) and not isinstance(value,bool):
        try: return datetime.fromtimestamp(value/1000,timezone.utc).isoformat()
        except (ValueError,OverflowError,OSError): return ""
    return text(value)
def coordinate(a,b):
    if isinstance(a,(int,float)) and not isinstance(a,bool) and isinstance(b,(int,float)) and not isinstance(b,bool) and math.isfinite(a) and math.isfinite(b) and abs(a)<=90 and abs(b)<=180 and (a,b)!=(0,0): return a,b
    return None,None
def normalize(a):
    fid=a.get("FID")
    require(isinstance(fid,int) and not isinstance(fid,bool),"Invalid source FID")
    lat,lon=coordinate(a.get("Latitude"),a.get("Longitude"))
    return {"fid":fid,"id":text(a.get("booster_id")),"company":text(a.get("company_name")),"state":text(a.get("state")).upper(),"county":text(a.get("county")),"city":text(a.get("city")),"calls":text(a.get("callsigns")),"bands":text(a.get("frequencies")),"lat":lat,"lon":lon,"date":date(a.get("submitted")),"updated":date(a.get("updated")),"sourceDate":date(a.get("data_as_of"))}

def ids():
    obj=request("/query",where="1=1",returnIdsOnly="true")
    raw=obj.get("objectIds")
    require(isinstance(raw,list) and all(type(x) is int for x in raw),"Invalid source ID list")
    require(len(set(raw))==len(raw),"Duplicate source IDs")
    return sorted(raw)

def build(output,minimum=MINIMUM):
    meta=request("")
    require("Query" in meta.get("capabilities","") and meta.get("objectIdField")=="FID","Unexpected source layer identity")
    require(set(FIELDS)<={f.get("name") for f in meta.get("fields",[])},"FCC registry schema changed")
    initial=ids()
    require(len(initial)>=minimum,"Unexpectedly small registry; retaining prior release")
    count=request("/query",where="1=1",returnCountOnly="true").get("count")
    require(count==len(initial),"Source count and ID list disagree")
    rows={}
    # Limit GET URL length and stay well below the service's 2,000-row ceiling.
    for i in range(0,len(initial),400):
        batch=initial[i:i+400]
        try:
            result=request("/query",post=True,objectIds=",".join(map(str,batch)),outFields=",".join(FIELDS),returnGeometry="false")
        except Exception as error:
            print("POST batch unavailable; using ordered pagination:",type(error).__name__,flush=True)
            result=request("/query",where="1=1",orderByFields="FID ASC",resultOffset=i,resultRecordCount=len(batch),outFields=",".join(FIELDS),returnGeometry="false")
        require(not result.get("exceededTransferLimit") or len(result.get("features",[]))==len(batch),"Source truncated a batch")
        features=result.get("features")
        require(isinstance(features,list),"Missing feature list")
        got={}
        for feature in features:
            row=normalize(feature["attributes"])
            require(row["fid"] not in got,"Duplicate FID within batch")
            got[row["fid"]]=row
        require(set(got)==set(batch),"Missing or unexpected IDs in source batch")
        rows.update(got)
        print(f"Retrieved {len(rows):,}/{len(initial):,} source rows",flush=True)
    require(ids()==initial,"Source IDs changed during retrieval; retry rather than publish mixed ID sets")
    records=[rows[x] for x in initial]
    require(sum(bool(r["id"]) for r in records)>=len(records)*0.95,"Unexpectedly many missing booster IDs")
    require(sum(bool(r["company"]) for r in records)>=len(records)*0.5,"Unexpectedly many missing company names")
    stamp=datetime.now(timezone.utc).isoformat()
    payload={"format":"Batwing-FCC-SBR-v1","generatedAt":stamp,"records":records}
    blob=json.dumps(payload,ensure_ascii=False,separators=(",",":"),allow_nan=False).encode("utf-8")
    manifest={"format":"Batwing-FCC-SBR-Manifest-v1","generatedAt":stamp,"source":LAYER,"file":"records.json","records":len(records),"companiesPresent":sum(bool(r["company"]) for r in records),"missingBoosterIds":sum(not r["id"] for r in records),"sourceDates":sorted({r["sourceDate"] for r in records if r["sourceDate"]}),"bytes":len(blob),"sha256":hashlib.sha256(blob).hexdigest()}
    output.mkdir(parents=True,exist_ok=True)
    (output/"records.json").write_bytes(blob)
    (output/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
    print("SBR VERIFIED",json.dumps(manifest),flush=True)
    return manifest

if __name__=="__main__":
    parser=argparse.ArgumentParser();parser.add_argument("--output",type=Path,default=Path("sbr"));args=parser.parse_args();build(args.output)
