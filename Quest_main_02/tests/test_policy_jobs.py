import unittest
from datetime import datetime
from briefings.policy_jobs import due


class PolicyJobTests(unittest.TestCase):
    def test_due_after_830_or_late_logon_once_per_day(self):
        self.assertFalse(due(datetime(2026,11,18,8,29),{}))
        self.assertTrue(due(datetime(2026,11,18,8,30),{}))
        self.assertTrue(due(datetime(2026,11,18,13,0),{'last_success_date':'2026-11-17'}))
        self.assertFalse(due(datetime(2026,11,18,13,0),{'last_success_date':'2026-11-18','sources_version':4}))
        self.assertTrue(due(datetime(2026,11,18,13,0),{'last_success_date':'2026-11-18'}))


if __name__ == '__main__':
    unittest.main()
