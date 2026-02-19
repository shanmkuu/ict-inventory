import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Add parent directory to path to import agent
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock psutil and requests before importing agent
sys.modules['psutil'] = MagicMock()
sys.modules['requests'] = MagicMock()

import agent

class TestAgentFailover(unittest.TestCase):

    @patch('agent.get_system_info')
    @patch('agent.requests.post')
    def test_failover_success_first_url(self, mock_post, mock_get_info):
        """Test that if the first URL succeeds, we don't try the second."""
        config = {
            "api_urls": ["http://primary.com", "http://backup.com"],
            "api_key": "test_key"
        }
        
        # Mock success for first call
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        result = agent.send_heartbeat(config)
        
        self.assertTrue(result)
        mock_post.assert_called_once_with(
            "http://primary.com", 
            json=mock_get_info.return_value, 
            headers={"x-api-key": "test_key"}, 
            timeout=10
        )

    @patch('agent.get_system_info')
    @patch('agent.requests.post')
    def test_failover_success_backup_url(self, mock_post, mock_get_info):
        """Test that if the first URL fails, we failover to the second."""
        config = {
            "api_urls": ["http://primary.com", "http://backup.com"],
            "api_key": "test_key"
        }
        
        # Setup mock to fail first, succeed second
        bad_response = MagicMock()
        bad_response.status_code = 500
        
        good_response = MagicMock()
        good_response.status_code = 200
        
        # Side effect can be a list of return values
        mock_post.side_effect = [bad_response, good_response]
        
        result = agent.send_heartbeat(config)
        
        self.assertTrue(result)
        self.assertEqual(mock_post.call_count, 2)
        # Verify calls
        calls = mock_post.call_args_list
        self.assertEqual(calls[0][0][0], "http://primary.com")
        self.assertEqual(calls[1][0][0], "http://backup.com")

    @patch('agent.get_system_info')
    @patch('agent.requests.post')
    def test_failover_all_fail(self, mock_post, mock_get_info):
        """Test that if all URLs fail, we return False."""
        config = {
            "api_urls": ["http://primary.com", "http://backup.com"],
            "api_key": "test_key"
        }
        
        # Setup mock to fail both
        bad_response = MagicMock()
        bad_response.status_code = 500
        
        mock_post.return_value = bad_response
        
        result = agent.send_heartbeat(config)
        
        self.assertFalse(result)
        self.assertEqual(mock_post.call_count, 2)

    @patch('agent.get_system_info')
    @patch('agent.requests.post')
    def test_single_url_compatibility(self, mock_post, mock_get_info):
        """Test backward compatibility with 'api_url' config."""
        config = {
            "api_url": "http://legacy.com",
            # No api_urls list
            "api_key": "test_key"
        }
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        result = agent.send_heartbeat(config)
        
        self.assertTrue(result)
        mock_post.assert_called_with(
            "http://legacy.com", 
            json=mock_get_info.return_value, 
            headers={"x-api-key": "test_key"}, 
            timeout=10
        )

if __name__ == '__main__':
    unittest.main()
