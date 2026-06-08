async function test() {
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'password123' }) 
    });
    const data = await res.json();
    const token = data.token;
    console.log("Got token");
    const recs = await fetch('http://localhost:3000/api/recommendations/home?latitude=28.7&longitude=77.1&radiusKm=15', { 
      headers: { Authorization: 'Bearer ' + token } 
    });
    const recsData = await recs.json();
    console.log('SUCCESS forYou:', recsData.forYou?.length, 'popularNearby:', recsData.popularNearby?.length);
    if(recsData.forYou?.length > 0) {
        console.log("First forYou item:", recsData.forYou[0]);
    }
  } catch(e) {
    console.error('ERROR', e);
  }
}
test();
