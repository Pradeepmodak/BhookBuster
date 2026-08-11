const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./dist/models/User.js').default;
  const UserTasteProfile = require('./dist/models/UserTasteProfile.js').default;
  const MenuItems = require('./dist/models/MenuItems.js').default;
  const Restaurant = require('./dist/models/Restaurant.js').default;
  
  const user = await User.findOne({ email: 'pradeepmodakofficial@gmail.com' });
  const profile = await UserTasteProfile.findOne({ userId: user._id });
  
  const latitude = 22.7766;
  const longitude = 86.1436;
  const radiusKm = 15;
  const limit = 10;
  
  const popularNearby = await Restaurant.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        distanceField: "distance",
        maxDistance: radiusKm * 1000,
        spherical: true,
        query: {
          isVerified: true,
        },
      },
    },
    { $sort: { isOpen: -1, distance: 1 } },
    { $addFields: { distanceKm: { $round: [{ $divide: ["$distance", 1000] }, 2] } } },
    { $limit: limit },
  ]);
  
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
    if (!restaurant) console.log('Mismatch for item!', rId);
    return {
      _id: item._id,
      restaurant: restaurant ? { _id: restaurant._id } : null,
    };
  }).filter(item => item.restaurant !== null);
  
  console.log('scoredItems count after filter:', scoredItems.length);

  process.exit(0);
}).catch(console.error);
