#!/usr/bin/env python3
"""Fail closed before publishing an incomplete or corrupt nationwide FCC snapshot."""
import argparse
import hashlib
import json
import math
from datetime import datetime, timezone, timedelta
from pathlib import Path

REQUIRED = set("AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC".split())
def require(ok, message):
    if not ok:
        raise ValueError(message)

def verify(root, minimum=100000, required=REQUIRED):
    root = Path(root)
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    require(manifest.get("format") == "BDA-FCC-Hosted-v1", "Invalid manifest format")
    stamp = datetime.fromisoformat(manifest["generatedAt"].replace("Z", "+00:00"))
    require(stamp.tzinfo is not None, "Missing manifest timezone")
    require(datetime.now(timezone.utc)-timedelta(days=2) <= stamp <= datetime.now(timezone.utc)+timedelta(hours=1), "Build timestamp outside expected window")
    states = manifest["states"]
    require(required <= set(states), "Missing required states: " + ", ".join(sorted(required-set(states))))
    count = geocoded = 0
    for state, entry in states.items():
        require(len(state)==2 and state.isascii() and state.isalpha() and state.isupper(), "Invalid state code")
        require(entry["file"] == "states/"+state+".json", "Unexpected state path")
        data = (root / entry["file"]).read_bytes()
        require(len(data) == entry["bytes"], state+" byte count mismatch")
        require(hashlib.sha256(data).hexdigest() == entry["sha256"], state+" SHA-256 mismatch")
        payload = json.loads(data)
        require(payload["format"] == "BDA-FCC-State-v1" and payload["state"] == state, state+" invalid payload")
        rows = payload["records"]
        require(isinstance(rows, list) and len(rows) == entry["records"] and len(rows)>0, state+" record count mismatch")
        for row in rows:
            require(row["state"] == state and bool(row["callsign"]) and bool(row["station"]), state+" invalid record identity")
            freq = row["mhz"]
            require(isinstance(freq,(int,float)) and math.isfinite(freq) and 100<=freq<=1000, state+" invalid frequency")
            lat, lon = row.get("latitude"), row.get("longitude")
            require((lat is None)==(lon is None), state+" incomplete coordinates")
            if lat is not None:
                require(isinstance(lat,(int,float)) and isinstance(lon,(int,float)) and math.isfinite(lat) and math.isfinite(lon) and abs(lat)<=90 and abs(lon)<=180 and (lat,lon)!=(0,0), state+" invalid coordinates")
                geocoded += 1
        count += len(rows)
    require(count == manifest["recordCount"] and count >= minimum, "Nationwide count mismatch or unexpectedly small snapshot")
    require(geocoded == manifest["geocodedRecords"] and geocoded>0, "Geocoded count mismatch or no coordinates")
    print(f"Validated {count:,} records, {len(states)} jurisdictions, {geocoded:,} geocoded records; every state hash verified.")
    return manifest

if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("root", type=Path)
    args=parser.parse_args()
    verify(args.root)
