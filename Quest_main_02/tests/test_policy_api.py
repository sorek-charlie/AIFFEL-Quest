import io
import json
import unittest
from urllib.parse import parse_qs, urlsplit

from briefings.policy_api import ENDPOINT, request_page
from briefings.windows_secret import transform


class Opener:
    def __init__(self):
        self.request = None

    def open(self, request, timeout):
        self.request = request
        return io.BytesIO(json.dumps({'response': {'header': {'resultCode': '00'}}}).encode())


class PolicyApiTests(unittest.TestCase):
    def test_encoded_key_is_encoded_exactly_once(self):
        opener = Opener()
        result = request_page('abc%2Fdef%2Bghi%3D', page=2, size=5, opener=opener)
        actual = urlsplit(opener.request.full_url)
        self.assertEqual(actual.scheme + '://' + actual.netloc + actual.path, ENDPOINT)
        self.assertEqual(parse_qs(actual.query)['serviceKey'], ['abc/def+ghi='])
        self.assertEqual(result['response']['header']['resultCode'], '00')

    def test_windows_encryption_roundtrip(self):
        encrypted = transform(b'sample-key-only', True)
        self.assertNotIn(b'sample-key-only', encrypted)
        self.assertEqual(transform(encrypted, False), b'sample-key-only')


if __name__ == '__main__':
    unittest.main()
