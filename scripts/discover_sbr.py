#!/usr/bin/env python3
"""Read public ArcGIS metadata for the FCC SBR viewer; no credentials or record export."""
import json
import re
import sys
from collections import deque
from urllib.parse import urlsplit, urlencode, urlunsplit
from urllib.request import Request, urlopen

ROOT="558fa854f397424fa188dff89750d4c3"
PORTAL="https://www.arcgis.com/sharing/rest/content/items/"
ID=re.compile(r"^[0-9a-f]{32}$",re.I)
SERVICE=re.compile(r"/(?:FeatureServer|MapServer)(?:/\d+)?$",re.I)

def allowed(url):
    p=urlsplit(url)
    h=p.hostname or ""
    return p.scheme=="https" and not p.username and not p.password and p.port in (None,443) and (h=="arcgis.com" or h.endswith(".arcgis.com"))

def get(url, **args):
    if not allowed(url): raise ValueError("Not an approved public ArcGIS host")
    p=urlsplit(url)
    u=urlunsplit((p.scheme,p.netloc,p.path,urlencode(dict(f="json",**args)),""))
    with urlopen(Request(u,headers={"User-Agent":"Batwing SBR public metadata audit","Accept":"application/json"}),timeout=20) as r:
        if not allowed(r.geturl()): raise ValueError("Unexpected redirect")
        data=json.loads(r.read(12*1024*1024+1))
    if not isinstance(data,dict) or "error" in data: raise ValueError("Public API returned an error: "+str(data.get("error","invalid JSON"))[:300])
    return data

def walk(v):
    if isinstance(v,dict):
        for k,x in v.items():
            if isinstance(x,str):
                if k.lower() in ("itemid","portalitemid","webmapid","websceneid","serviceitemid") and ID.fullmatch(x):
                    yield ("item",x)
                if x.startswith("https://") and allowed(x):
                    p=urlsplit(x)
                    m=re.search(r"/(?:FeatureServer|MapServer)(?:/\d+)?",p.path,re.I)
                    if m:
                        yield ("service",urlunsplit((p.scheme,p.netloc,p.path[:m.end()],"","")))
            yield from walk(x)
    elif isinstance(v,list):
        for x in v: yield from walk(x)

def discover():
    pending=deque([("item",ROOT)]); seen=set(); candidates=[]
    while pending and len(seen)<60:
        kind,value=pending.popleft()
        if (kind,value) in seen: continue
        seen.add((kind,value))
        try:
            if kind=="item":
                meta=get(PORTAL+value)
                print("ITEM",value,meta.get("title"),meta.get("type"),meta.get("access"),flush=True)
                pending.extend(walk(meta))
                try: pending.extend(walk(get(PORTAL+value+"/data")))
                except Exception as e: print("ITEM DATA",value,str(e),flush=True)
            else:
                meta=get(value)
                pending.extend(walk(meta))
                if not re.search(r"/\d+$",value):
                    for layer in meta.get("layers",[])+meta.get("tables",[]):
                        if isinstance(layer.get("id"),int): pending.append(("service",value+"/"+str(layer["id"])))
                    continue
                fields=[{"name":f.get("name"),"alias":f.get("alias"),"type":f.get("type")} for f in meta.get("fields",[])]
                names=" ".join(str(f["name"])+" "+str(f["alias"]) for f in fields).lower()
                if not re.search(r"booster|registration|callsign|call.sign|company",names): continue
                count=get(value+"/query",where="1=1",returnCountOnly="true").get("count")
                row={"url":value,"name":meta.get("name"),"count":count,"capabilities":meta.get("capabilities"),"objectIdField":meta.get("objectIdField"),"maxRecordCount":meta.get("maxRecordCount"),"fields":fields}
                candidates.append(row)
                print("CANDIDATE",json.dumps(row,ensure_ascii=False),flush=True)
        except Exception as e:
            print("PROBE FAILED",kind,value,str(e),flush=True)
    print("DISCOVERY SUMMARY",json.dumps({"visited":len(seen),"candidates":candidates},ensure_ascii=False),flush=True)
    if not any(isinstance(c["count"],int) and c["count"]>0 for c in candidates):
        print("No verified public registry layer found; do not publish an empty registry.",file=sys.stderr)
        return 1
    return 0

if __name__=="__main__": sys.exit(discover())
