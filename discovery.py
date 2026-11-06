"""Modash Instagram discovery adapter. Credentials remain server-side."""
import json
import math
import os
import re
import threading
import time
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ENDPOINT = 'https://api.modash.io/v1/instagram/search'
_LOCK = threading.Lock()
_CACHE = {}
_LAST_CALL = 0.0


class DiscoveryError(Exception):
    def __init__(self, message, status=502):
        super().__init__(message)
        self.status = status


def configured():
    return bool(os.environ.get('MODASH_API_KEY', '').strip())


def build_request(payload):
    if not isinstance(payload, dict):
        raise ValueError('Expected search settings.')
    query = payload.get('query', '')
    if not isinstance(query, str) or not 2 <= len(query.strip()) <= 200:
        raise ValueError('Enter a content keyword or phrase (2-200 characters).')
    page = payload.get('page', 0)
    lower, upper = payload.get('minFollowers', 1000), payload.get('maxFollowers', 1000000)
    if type(page) is not int or not 0 <= page <= 665:
        raise ValueError('Page must be an integer from 0 to 665.')
    if type(lower) is not int or type(upper) is not int or not 1000 <= lower <= upper <= 1000000000:
        raise ValueError('Enter a follower range between 1,000 and 1,000,000,000.')
    influencer = {'keywords': query.strip(), 'followers': {'min': lower, 'max': upper}}
    language = payload.get('language', '')
    if not isinstance(language, str) or (language and not re.fullmatch(r'[a-z]{2}', language)):
        raise ValueError('Language must be a two-letter code, or blank.')
    if language:
        influencer['language'] = language
    return {'page': page, 'calculationMethod': 'median', 'filter': {'influencer': influencer}}


def metric(value, ceiling):
    if type(value) not in (int, float) or not math.isfinite(value) or not 0 <= value <= ceiling:
        return None
    return value


def map_response(data):
    if not isinstance(data, dict) or data.get('error'):
        raise DiscoveryError('The provider returned an error. Check your API account and search settings.')
    if not isinstance(data.get('directs'), list) or not isinstance(data.get('lookalikes'), list):
        raise DiscoveryError('The provider response format was unexpected. No results were imported.')
    records, seen = [], set()
    for item in (data['directs'] + data['lookalikes'])[:100]:
        if not isinstance(item, dict):
            continue
        p = item.get('profile', item)
        if not isinstance(p, dict):
            continue
        handle = p.get('username', '')
        if not isinstance(handle, str) or not re.fullmatch(r'[A-Za-z0-9_.]{1,30}', handle) or handle.lower() in seen:
            continue
        seen.add(handle.lower())
        profile_url = 'https://www.instagram.com/' + handle + '/'
        rate = metric(p.get('engagementRate'), 1)
        bio = p.get('biography') or p.get('bio') or ''
        name = p.get('fullname') or p.get('fullName') or handle
        records.append({'name': str(name)[:120], 'handle': handle, 'platform': 'Instagram', 'profileUrl': profile_url,
                        'sourceUrl': profile_url, 'reason': str(bio)[:1500], 'niche': 'Other', 'audienceMarket': '',
                        'followers': metric(p.get('followers'), 1e10), 'engagement': round(rate * 100, 4) if rate is not None else None,
                        'views': None, 'rate': None, 'metricsSource': ENDPOINT,
                        'metricsDate': datetime.now(timezone.utc).date().isoformat(),
                        'note': 'Modash search snapshot. Retrieval date is not the underlying measurement date. Review content and audience; fees are unknown.'})
    if not records and (data['directs'] or data['lookalikes']):
        raise DiscoveryError('The provider returned profiles that could not be mapped. No results were imported.')
    total = metric(data.get('total'), 1e12)
    return {'candidates': records, 'total': total, 'provider': 'Modash',
            'audienceFiltered': False, 'note': 'Content-keyword search across provider coverage, not every Instagram account. Audience geography and rate quotes are not supplied.'}


def search(payload, opener=urlopen):
    global _LAST_CALL
    body = build_request(payload)
    key = os.environ.get('MODASH_API_KEY', '').strip()
    if not key:
        raise DiscoveryError('Discovery is not connected. Add MODASH_API_KEY to the server environment using a Modash Discovery API account.', 503)
    # Cache only within this process; never include credentials in a response or log.
    cache_key = (key, json.dumps(body, sort_keys=True))
    with _LOCK:
        now = time.monotonic()
        cached = _CACHE.get(cache_key)
        if cached and now - cached[0] < 120:
            return {**cached[1], 'cached': True}
        if now - _LAST_CALL < 1:
            raise DiscoveryError('Please wait a second before searching again.', 429)
        _LAST_CALL = now
        req = Request(ENDPOINT, data=json.dumps(body).encode(), headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'}, method='POST')
        try:
            with opener(req, timeout=25) as response:
                raw = response.read(2 * 1024 * 1024 + 1)
                if len(raw) > 2 * 1024 * 1024:
                    raise DiscoveryError('Provider response was too large. Try a narrower search.')
                result = map_response(json.loads(raw))
        except HTTPError as exc:
            if exc.code in (401, 403):
                raise DiscoveryError('The provider rejected access. Check the API key and Discovery API entitlement.', 502) from None
            if exc.code == 429:
                raise DiscoveryError('Provider rate limit or account quota reached. Try later or check your plan.', 429) from None
            raise DiscoveryError('Provider search failed. Check your account and filters; no automatic retry was made.', 502) from None
        except (URLError, TimeoutError, json.JSONDecodeError):
            raise DiscoveryError('Could not reach or read the provider. No automatic retry was made.', 502) from None
        result = {**result, 'page': body['page'], 'cached': False}
        if len(_CACHE) >= 64:
            _CACHE.clear()
        _CACHE[cache_key] = (now, result)
        return result
