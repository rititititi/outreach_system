import io
import json
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import discovery

FIXTURE={'error':False,'total':1,'lookalikes':[],'directs':[{'profile':{'username':'test_creator','fullname':'Test Creator','followers':12345,'engagementRate':0.025,'bio':'Skincare ingredient reviews and serum routines.'}}]}

class DiscoveryTests(unittest.TestCase):
    def setUp(self):
        discovery._CACHE.clear();discovery._LAST_CALL=0
    def test_request(self):
        body=discovery.build_request({'query':'skincare','minFollowers':1000,'maxFollowers':50000,'language':'en','page':2})
        self.assertEqual(body['page'],2);self.assertEqual(body['filter']['influencer']['keywords'],'skincare')
        self.assertNotIn('audience',body['filter']);self.assertNotIn('location',body['filter']['influencer'])
        for bad in [[],{'query':''},{'query':'ok','page':True},{'query':'ok','minFollowers':5000,'maxFollowers':1000},{'query':'ok','language':'english'}]:
            with self.assertRaises(ValueError):discovery.build_request(bad)
    def test_mapping(self):
        c=discovery.map_response(FIXTURE)['candidates'][0]
        self.assertEqual(c['engagement'],2.5);self.assertEqual(c['followers'],12345);self.assertEqual(c['audienceMarket'],'');self.assertIsNone(c['rate']);self.assertIn('not the underlying measurement date',c['note'])
        duplicate={**FIXTURE,'lookalikes':FIXTURE['directs']};self.assertEqual(len(discovery.map_response(duplicate)['candidates']),1)
        unknown={**FIXTURE,'directs':[{'profile':{'username':'x','fullname':'X'}}]};self.assertIsNone(discovery.map_response(unknown)['candidates'][0]['followers'])
        with self.assertRaises(discovery.DiscoveryError):discovery.map_response({'profiles':[]})
        with self.assertRaises(discovery.DiscoveryError):discovery.map_response({**FIXTURE,'error':True})
    def test_missing_key(self):
        with patch.dict(os.environ,{},clear=True):
            with self.assertRaises(discovery.DiscoveryError) as result:discovery.search({'query':'skincare'})
            self.assertEqual(result.exception.status,503)
    def test_key_cache_and_no_client_secret(self):
        seen=[]
        def opener(req,timeout):
            seen.append(req);return io.BytesIO(json.dumps(FIXTURE).encode())
        with patch.dict(os.environ,{'MODASH_API_KEY':'test-only-secret'}):
            a=discovery.search({'query':'skincare'},opener);b=discovery.search({'query':'skincare'},opener)
            self.assertEqual(len(seen),1);self.assertEqual(seen[0].get_header('Authorization'),'Bearer test-only-secret');self.assertTrue(b['cached']);self.assertNotIn('test-only-secret',json.dumps(a))
    def test_access_failure_sanitized(self):
        def opener(req,timeout):raise HTTPError(req.full_url,401,'private provider message',{},None)
        with patch.dict(os.environ,{'MODASH_API_KEY':'test-only-secret'}):
            with self.assertRaises(discovery.DiscoveryError) as e:discovery.search({'query':'skincare'},opener)
            self.assertNotIn('test-only-secret',str(e.exception));self.assertNotIn('private provider message',str(e.exception))
if __name__=='__main__':unittest.main()
