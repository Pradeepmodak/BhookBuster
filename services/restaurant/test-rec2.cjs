const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./dist/models/User.js').default;
  const UserTasteProfile = require('./dist/models/UserTasteProfile.js').default;
  const MenuItems = require('./dist/models/MenuItems.js').default;
  
  const user = await User.findOne({ email: 'pradeepmodakofficial@gmail.com' });
  const profile = await UserTasteProfile.findOne({ userId: user._id });
  
  const recommendationsController = require('./dist/controllers/recommendations.js');
  const req = {
    user: user,
    query: { latitude: '22.7766', longitude: '86.1436', radiusKm: '15', limit: '10' }
  };
  
  // Custom fetch to see where it drops
  let popularNearby = await recommendationsController.__get__('getPopularNearbyRestaurants')(22.7766, 86.1436, 15, 10);
  console.log('popularNearby count:', popularNearby.length);
  
  const restaurantIds = popularNearby.map(r => r._id);
  const candidateItems = await MenuItems.find({
    isAvailable: true,
    restaurantId: { $in: restaurantIds },
  }).lean();
  console.log('candidateItems count:', candidateItems.length);
  
  const scoredItems = candidateItems.map((item) => {
    const rId = item.restaurantId.toString();
    const restaurant = popularNearby.find((r) => r._id.toString() === rId);
    if (!restaurant) console.log('Mismatch for item!', rId, 'vs', popularNearby.map(r => r._id.toString()));
    return {
      _id: item._id,
      restaurant: restaurant ? { _id: restaurant._id } : null,
    };
  }).filter(item => item.restaurant !== null);
  
  console.log('scoredItems count after filter:', scoredItems.length);

  process.exit(0);
}).catch(console.error);
