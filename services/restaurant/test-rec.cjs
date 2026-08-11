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
    query: {
      latitude: '22.7766',
      longitude: '86.1436',
      radiusKm: '15',
      limit: '10'
    }
  };
  
  const res = {
    status: (code) => res,
    json: (data) => {
      console.log('Result forYou length:', data.forYou ? data.forYou.length : null);
      if (data.forYou && data.forYou.length === 0) {
        console.log('WHY forYou is 0? Let us find out!');
      } else {
        console.log(data.forYou.map(i => i.name));
      }
      process.exit(0);
    }
  };
  await recommendationsController.homeRecommendations(req, res);
}).catch(console.error);
