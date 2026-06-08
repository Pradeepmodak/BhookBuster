const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', { email: 'test@test.com', password: 'password123' });
    const token = res.data.token;
    console.log("Got token");
    const recs = await axios.get('http://localhost:3000/api/recommendations/home?latitude=28.7&longitude=77.1&radiusKm=15', { headers: { Authorization: 'Bearer ' + token } });
    console.log('SUCCESS forYou length:', recs.data.forYou?.length, 'popularNearby length:', recs.data.popularNearby?.length);
  } catch(e) {
    console.error('ERROR', e.response?.data || e.message);
  }
}
test();
