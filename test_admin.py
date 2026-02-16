import requests

def test_admin_endpoints():
    """Test admin endpoints with admin session token"""
    base_url = "https://book-photobooth.preview.emergentagent.com/api"
    session_token = "admin_session_1771206575170"
    
    headers = {
        'Content-Type': 'application/json',
        'Cookie': f'session_token={session_token}'
    }
    
    print("🔐 Testing Admin Endpoints with Admin User")
    print("="*50)
    
    # Test admin/bookings
    print("\n📋 Testing GET /admin/bookings...")
    response = requests.get(f"{base_url}/admin/bookings", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        bookings = response.json()
        print(f"✅ Found {len(bookings)} bookings")
    else:
        print(f"❌ Failed: {response.text}")
    
    # Test admin/messages
    print("\n📧 Testing GET /admin/messages...")
    response = requests.get(f"{base_url}/admin/messages", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        messages = response.json()
        print(f"✅ Found {len(messages)} messages")
    else:
        print(f"❌ Failed: {response.text}")
    
    # Test admin/users
    print("\n👥 Testing GET /admin/users...")
    response = requests.get(f"{base_url}/admin/users", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        users = response.json()
        print(f"✅ Found {len(users)} users")
    else:
        print(f"❌ Failed: {response.text}")
        
    # Test admin/packages
    print("\n📦 Testing GET /admin/packages...")
    response = requests.get(f"{base_url}/admin/packages", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        packages = response.json()
        print(f"✅ Found {len(packages)} packages")
    else:
        print(f"❌ Failed: {response.text}")

if __name__ == "__main__":
    test_admin_endpoints()