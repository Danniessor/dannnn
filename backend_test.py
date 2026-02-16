import requests
import sys
import json
from datetime import datetime, timedelta
import time

class RinaVisualsAPITester:
    def __init__(self, base_url="https://book-photobooth.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_base = f"{base_url}/api"
        self.token = None
        self.session_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_result(self, test_name, success, details=None):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name} - {details}")
            self.failed_tests.append({"test": test_name, "details": details})

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_base}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        # Add auth headers if available
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if self.session_token:
            test_headers['Cookie'] = f'session_token={self.session_token}'
        
        # Add custom headers
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            
            if success:
                self.log_result(name, True)
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                details = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_body = response.json()
                    details += f" - {error_body}"
                except:
                    details += f" - {response.text[:200]}"
                self.log_result(name, False, details)
                return False, {}

        except Exception as e:
            self.log_result(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_seed_data(self):
        """Seed initial data"""
        return self.run_test("Seed Data", "POST", "seed", 200)

    def test_get_packages(self):
        """Test get packages endpoint"""
        return self.run_test("Get Packages", "GET", "packages", 200)

    def test_get_portfolio(self):
        """Test get portfolio endpoint"""
        return self.run_test("Get Portfolio", "GET", "portfolio", 200)

    def test_get_portfolio_with_filter(self):
        """Test get portfolio with category filter"""
        return self.run_test("Get Portfolio (Wedding)", "GET", "portfolio?category=wedding", 200)

    def test_get_testimonials(self):
        """Test get testimonials endpoint"""
        return self.run_test("Get Testimonials", "GET", "testimonials", 200)

    def test_get_booked_dates(self):
        """Test get booked dates endpoint"""
        return self.run_test("Get Booked Dates", "GET", "booked-dates", 200)

    def test_user_registration(self):
        """Test user registration"""
        timestamp = int(time.time())
        user_data = {
            "email": f"testuser{timestamp}@example.com",
            "password": "TestPassword123!",
            "name": f"Test User {timestamp}"
        }
        
        success, response = self.run_test("User Registration", "POST", "auth/register", 200, user_data)
        if success and 'token' in response:
            self.token = response['token']
            return True, response
        return success, response

    def test_user_login(self, email=None, password=None):
        """Test user login"""
        if not email:
            # Use default test credentials
            timestamp = int(time.time())
            email = f"testuser{timestamp}@example.com"
            password = "TestPassword123!"
            
            # Register first if no email provided
            reg_success, reg_response = self.test_user_registration()
            if not reg_success:
                return False, {}
            email = reg_response.get('user', {}).get('email')
        
        login_data = {
            "email": email,
            "password": password
        }
        
        success, response = self.run_test("User Login", "POST", "auth/login", 200, login_data)
        if success and 'token' in response:
            self.token = response['token']
        return success, response

    def test_get_current_user(self):
        """Test get current user endpoint (requires auth)"""
        return self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_create_booking(self):
        """Test create booking"""
        timestamp = int(time.time())
        booking_data = {
            "client_name": f"Test Client {timestamp}",
            "client_email": f"testclient{timestamp}@example.com",
            "client_phone": "+63912345678",
            "event_date": "2024-12-25",
            "event_time": "10:00",
            "event_type": "wedding",
            "venue": "Test Venue Manila",
            "package_id": "",  # Will be filled from packages
            "special_requests": "Test booking request"
        }
        
        # Get a package first
        pkg_success, packages = self.run_test("Get Packages for Booking", "GET", "packages", 200)
        if pkg_success and packages:
            booking_data["package_id"] = packages[0]["package_id"]
            return self.run_test("Create Booking", "POST", "bookings", 200, booking_data)
        else:
            self.log_result("Create Booking", False, "No packages available")
            return False, {}

    def test_submit_contact(self):
        """Test submit contact message"""
        timestamp = int(time.time())
        contact_data = {
            "name": f"Test Contact {timestamp}",
            "email": f"testcontact{timestamp}@example.com",
            "phone": "+63912345678",
            "subject": "Test Subject",
            "message": "This is a test contact message."
        }
        
        return self.run_test("Submit Contact", "POST", "contact", 200, contact_data)

    def test_protected_endpoints_without_auth(self):
        """Test that protected endpoints return 401 without auth"""
        # Temporarily remove token
        original_token = self.token
        self.token = None
        
        success, _ = self.run_test("Admin Bookings (No Auth)", "GET", "admin/bookings", 401)
        
        # Restore token
        self.token = original_token
        return success

    def test_admin_endpoints_with_user_role(self):
        """Test admin endpoints with regular user (should get 403)"""
        if not self.token:
            self.log_result("Admin Endpoints (User Role)", False, "No auth token available")
            return False
        
        return self.run_test("Admin Bookings (User Role)", "GET", "admin/bookings", 403)

    def run_comprehensive_tests(self):
        """Run all backend API tests"""
        print("="*60)
        print("🚀 Starting Rina Visuals Backend API Testing")
        print("="*60)
        
        # Basic endpoint tests
        print("\n📊 Testing Basic Endpoints:")
        self.test_root_endpoint()
        self.test_seed_data()
        self.test_get_packages()
        self.test_get_portfolio()
        self.test_get_portfolio_with_filter()
        self.test_get_testimonials()
        self.test_get_booked_dates()
        
        # Public functionality tests
        print("\n📋 Testing Public Functionality:")
        self.test_create_booking()
        self.test_submit_contact()
        
        # Authentication tests
        print("\n🔐 Testing Authentication:")
        self.test_user_registration()
        self.test_get_current_user()
        
        # Authorization tests
        print("\n🛡️ Testing Authorization:")
        self.test_protected_endpoints_without_auth()
        self.test_admin_endpoints_with_user_role()
        
        # Print summary
        print("\n" + "="*60)
        print(f"📊 TEST SUMMARY")
        print("="*60)
        print(f"✅ Tests Passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Tests Failed: {len(self.failed_tests)}")
        
        if self.failed_tests:
            print("\n🔍 Failed Tests Details:")
            for failed_test in self.failed_tests:
                print(f"   • {failed_test['test']}: {failed_test['details']}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n🎯 Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = RinaVisualsAPITester()
    success = tester.run_comprehensive_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())