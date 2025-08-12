import axios from 'axios';

async function testMeEndpoint() {
  try {
    // You'll need to replace this with a valid JWT token from your mobile app
    const token = "YOUR_JWT_TOKEN_HERE"; // Replace with actual token
    
    console.log("Testing /me endpoint...");
    const response = await axios.get('http://localhost:3000/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log("Response:", response.data);
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
}

testMeEndpoint();
