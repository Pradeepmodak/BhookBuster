const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./dist/models/User.js').default;
  const UserTasteProfile = require('./dist/models/UserTasteProfile.js').default;
  const MenuItems = require('./dist/models/MenuItems.js').default;
  const Restaurant = require('./dist/models/Restaurant.js').default;
  
  const user = await User.findOne({ email: 'pradeepmodakofficial@gmail.com' });
  
  const latitude = 22.7766;
  const longitude = 86.1436;
  const radiusKm = 15;
  const limit = 10;
  
  const popularNearby = await Restaurant.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        distanceField: 'distance',
        maxDistance: radiusKm * 1000,
        spherical: true,
        query: { isVerified: true },
      },
    }
  ]);
  
  const restaurantIds = popularNearby.map(r => r._id);
  const totalDishes = await MenuItems.countDocuments({ restaurantId: { $in: restaurantIds }, isAvailable: true });
  console.log('Total dishes available:', totalDishes);

  process.exit(0);
}).catch(console.error);
