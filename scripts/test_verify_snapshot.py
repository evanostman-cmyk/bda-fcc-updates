#!/usr/bin/env python3
"""Small synthetic fixtures; never included in the published Pages artifact."""
import hashlib
import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from verify_snapshot import verify

class SnapshotTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        (self.root/"states").mkdir()
        self.rows=[{"state":"FL","callsign":"TEST","station":"FB2","mhz":851.2,"latitude":27.8,"longitude":-82.6}]
        self.m={"format":"BDA-FCC-Hosted-v1","generatedAt":datetime.now(timezone.utc).isoformat(),"recordCount":1,"geocodedRecords":1,"states":{}}
        self.write()
    def write(self):
        body=json.dumps({"format":"BDA-FCC-State-v1","state":"FL","records":self.rows}).encode()
        (self.root/"states/FL.json").write_bytes(body)
        self.m["states"]["FL"]={"file":"states/FL.json","records":len(self.rows),"bytes":len(body),"sha256":hashlib.sha256(body).hexdigest()}
        self.save_manifest()
    def save_manifest(self):
        (self.root/"manifest.json").write_text(json.dumps(self.m))
    def check(self):
        return verify(self.root,minimum=1,required={"FL"})
    def test_valid(self):
        self.assertEqual(self.check()["recordCount"],1)
    def test_tampering(self):
        p=self.root/"states/FL.json"
        p.write_bytes(p.read_bytes().replace(b"TEST",b"FAKE"))
        with self.assertRaisesRegex(ValueError,"SHA-256"): self.check()
    def test_missing_state(self):
        with self.assertRaisesRegex(ValueError,"Missing required"): verify(self.root,minimum=1,required={"FL","GA"})
    def test_wrong_count(self):
        self.m["recordCount"]=2
        self.save_manifest()
        with self.assertRaisesRegex(ValueError,"Nationwide count"): self.check()
    def test_wrong_state(self):
        self.rows[0]["state"]="GA"
        self.write()
        with self.assertRaisesRegex(ValueError,"record identity"): self.check()
    def test_invalid_coordinate(self):
        self.rows[0]["latitude"]=91
        self.write()
        with self.assertRaisesRegex(ValueError,"invalid coordinates"): self.check()
    def test_empty(self):
        self.rows=[]
        self.write()
        with self.assertRaisesRegex(ValueError,"record count"): self.check()
if __name__=="__main__":
    unittest.main()
