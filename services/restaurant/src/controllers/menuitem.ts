import Restaurant from "../models/Restaurant.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import getBuffer from "../config/datauri.js";
import axios from "axios";
import uploadFile from "../middlewares/multer.js";
import MenuItems from "../models/MenuItems.js";
import { generateMenuEmbedding, toStringArray } from "../lib/embeddings.js";
import { redisClient } from "../config/redis.js";


/**
 * Adds a new menu item to a restaurant.
 * 
 * Flow:
 * 1. Authenticates the request.
 * 2. Checks if the user owns a restaurant.
 * 3. Validates required body parameters (name, price) and image file.
 * 4. Uploads the image to the external utils service.
 * 5. Saves the new menu item to the database.
 * 6. Generates AI Gateway embeddings for the menu item asynchronously (errors are logged but do not block creation).
 * 7. Invalidates the cached menu for the restaurant in Redis.
 * 
 * @route POST /api/menu
 * @param {AuthenticatedRequest} req - Express request object containing the user and body parameters.
 * @param {Response} res - Express response object.
 */
export const addMenuItem = TryCatch(async (req: AuthenticatedRequest, res) => {
    // 1. Ensure user authentication
    if (!req.user) {
        return res.status(401).json({
            message: "Please login",
        });
    }

    // 2. Retrieve restaurant owned by the current user
    const restaurant = await Restaurant.findOne({ ownerId: req.user._id });

    if (!restaurant) {
        return res.status(404).json({
            message: "No Restaurant found",
        });
    }

    // 3. Extract and validate required inputs
    const { name, description, price, cuisine, tags, dietaryFlags, spiceLevel } = req.body;
    if (!name || !price) {
        return res.status(400).json({
            message: "Name and price are required"
        })
    }

    // 4. Validate and prepare uploaded file
    const file = req.file;
    if (!file) {
        return res.status(400).json({
            message: "Please provide a restaurant image",
        });
    }

    const fileBuffer = getBuffer(file);
    if (!fileBuffer) {
        return res.status(400).json({
            message: "Invalid image file",
        });
    }

    // 5. Upload image to the utilities service
    console.log("Uploading file to utils service...");
    const { data: uploadResult } = await axios.post(`${process.env.UTILS_SERVICE}/api/upload`, {
        buffer: fileBuffer.content,
    },
    {
        headers: {
            Authorization: req.headers.authorization as string,
        },
    }
    );

    // 6. Create the menu item entry in the database
    const item = await MenuItems.create({
        name,
        description,
        price: Number(price),
        cuisine,
        tags: toStringArray(tags),
        dietaryFlags: toStringArray(dietaryFlags),
        spiceLevel,
        restaurantId: restaurant._id,
        image: uploadResult.url,
        isAvailable:true

    })

    // 7. Generate vector embeddings for the new item for AI search
    try {
        await generateMenuEmbedding(item);
    } catch (error: any) {
        console.warn("⚠️ AI Gateway embedding generation failed for new menu item, but the item was created successfully:", error.message);
    }

    // 8. Invalidate Redis cache to ensure the client gets fresh menu data
    await redisClient.del(`menu:${restaurant._id.toString()}`);

    res.status(201).json({
        message:"Item added Successfully",
        item,
    });
});

/**
 * Retrieves all menu items for a specific restaurant.
 * Utilizes a read-through cache strategy with Redis.
 * 
 * Flow:
 * 1. Checks if the menu items are already cached in Redis.
 * 2. If cached, parses and returns the cached data immediately.
 * 3. If not cached, fetches the items from MongoDB, caches them in Redis with a 1-hour TTL, and returns them.
 * 
 * @route GET /api/menu/:id
 * @param {AuthenticatedRequest} req - Express request object containing restaurant ID in params.
 * @param {Response} res - Express response object.
 */
const activeQueries = new Map<string, Promise<any>>();

export const getAllItems = TryCatch(async (req: AuthenticatedRequest, res) => {
    const id = req.params.id as string;
    if (!id) {
        return res.status(400).json({
            message: "Id is required",
        });
    }

    try {
        // Try to get from cache
        const cachedMenu = await redisClient.get(`menu:${id}`);
        if (cachedMenu) {
            return res.status(200).json(JSON.parse(cachedMenu));
        }
    } catch (error) {
        console.warn(`⚠️ Redis GET failed for menu:${id}, falling back to MongoDB.`, error);
    }

    // Cache Miss -> Prevent Cache Stampede using Request Collapsing (Promise Coalescing)
    if (activeQueries.has(id)) {
        // If another request is already fetching this menu, just wait for its result!
        const items = await activeQueries.get(id);
        return res.status(200).json(items);
    }

    // Create a single promise that queries the DB and updates the cache
    const fetchPromise = (async () => {
        try {
            const items = await MenuItems.find({ restaurantId: id });
            
            try {
                // Try to set cache, but don't fail the request if Redis is down
                await redisClient.setex(`menu:${id}`, 3600, JSON.stringify(items));
            } catch (redisError) {
                console.warn(`⚠️ Redis SETEX failed for menu:${id}.`, redisError);
            }
            
            return items;
        } finally {
            // Always remove the promise from the map when done (success or failure)
            activeQueries.delete(id);
        }
    })();

    // Store the promise so subsequent concurrent requests can wait on it
    activeQueries.set(id, fetchPromise);

    // Await the result and return
    const items = await fetchPromise;
    res.status(200).json(items);
});

/**
 * Deletes a menu item from the restaurant.
 * 
 * Flow:
 * 1. Authenticates user and retrieves menu item to verify ownership.
 * 2. Checks if user owns the restaurant hosting the menu item.
 * 3. Deletes the menu item from MongoDB.
 * 4. Invalidates the Redis cache for that restaurant's menu.
 * 
 * @route DELETE /api/menu/:itemId
 * @param {AuthenticatedRequest} req - Express request object containing itemId in params.
 * @param {Response} res - Express response object.
 */
export const deleteMenuItem = TryCatch(async(req:AuthenticatedRequest, res)=>{
    // 1. Ensure user authentication
    if (!req.user) {
        return res.status(401).json({
            message: "Please login",
        });
    }

    // 2. Find target menu item
    const { itemId } = req.params;
    const item=await MenuItems.findById(itemId);
    if (!item) {
        return res.status(400).json({
            message: "Id is required",
        });
    }

    // 3. Ensure the current user owns the restaurant linked to the menu item
    const restaurant = await Restaurant.findOne({
        _id: item.restaurantId,
        ownerId: req.user._id,
    });

    if(!restaurant){
        return res.status(404).json({
            message: "No Restaurant found",
        });
    }

    // 4. Delete item and clear associated cache
    await item.deleteOne();
    await redisClient.del(`menu:${restaurant._id.toString()}`);

    res.status(200).json({
        message:"Menu item deleted successfully",
    })
});

/**
 * Toggles the availability status (isAvailable) of a menu item.
 * 
 * Flow:
 * 1. Verifies authentication and checks restaurant ownership.
 * 2. Flips the availability status.
 * 3. Saves the updated item and invalidates the menu cache.
 * 
 * @route PATCH /api/menu/:itemId/toggle
 * @param {AuthenticatedRequest} req - Express request object containing itemId in params.
 * @param {Response} res - Express response object.
 */
export const toggleMenuItemAvailability=TryCatch(async(req:AuthenticatedRequest,res)=>{
   // 1. Ensure user authentication
   if (!req.user) {
        return res.status(401).json({
            message: "Please login",
        });
    }

    // 2. Find target menu item
    const { itemId } = req.params;
    const item=await MenuItems.findById(itemId);
    if (!item) {
        return res.status(400).json({
            message: "Id is required",
        });
    }

    // 3. Verify ownership
    const restaurant = await Restaurant.findOne({
        _id: item.restaurantId,
        ownerId: req.user._id,
    });

    if(!restaurant){
        return res.status(404).json({
            message: "No Restaurant found",
        });
    }

    // 4. Toggle and save availability state, then invalidate cache
    item.isAvailable=!item.isAvailable;
    await item.save();
    await redisClient.del(`menu:${restaurant._id.toString()}`);

    res.status(200).json({
        message:`Item Marked as ${item.isAvailable ? "available" : "unavailable"}`,
        item,
    })
})

/**
 * Updates an existing menu item with new details or image.
 * 
 * Flow:
 * 1. Verifies user authentication and menu item ownership.
 * 2. Conditionally updates provided parameters (name, description, price, tags, etc.).
 * 3. Handles optional new image upload via UTILS_SERVICE.
 * 4. Saves updates, refreshes search embeddings, and returns the updated item.
 * 
 * @route PUT /api/menu/:itemId
 * @param {AuthenticatedRequest} req - Express request object containing itemId in params and update details in body.
 * @param {Response} res - Express response object.
 */
export const updateMenuItem = TryCatch(async (req: AuthenticatedRequest, res) => {
    // 1. Ensure user authentication
    if (!req.user) {
        return res.status(401).json({
            message: "Please login",
        });
    }

    // 2. Find target menu item
    const { itemId } = req.params;
    const item = await MenuItems.findById(itemId);
    if (!item) {
        return res.status(404).json({
            message: "Menu item not found",
        });
    }

    // 3. Verify ownership
    const restaurant = await Restaurant.findOne({
        _id: item.restaurantId,
        ownerId: req.user._id,
    });

    if (!restaurant) {
        return res.status(404).json({
            message: "No Restaurant found",
        });
    }

    const { name, description, price, cuisine, tags, dietaryFlags, spiceLevel } = req.body;

    // 4. Conditionally update properties if defined in request
    if (name !== undefined) item.name = name;
    if (description !== undefined) item.description = description;
    if (price !== undefined) item.price = Number(price);
    if (cuisine !== undefined) item.cuisine = cuisine;
    if (tags !== undefined) item.tags = toStringArray(tags);
    if (dietaryFlags !== undefined) item.dietaryFlags = toStringArray(dietaryFlags);
    if (spiceLevel !== undefined) item.spiceLevel = spiceLevel;

    // 5. Handle new image upload if provided
    if (req.file) {
        const fileBuffer = getBuffer(req.file);
        if (!fileBuffer?.content) {
            return res.status(400).json({
                message: "Invalid image file",
            });
        }

        const { data: uploadResult } = await axios.post(
            `${process.env.UTILS_SERVICE}/api/upload`,
            { buffer: fileBuffer.content },
            {
                headers: {
                    Authorization: req.headers.authorization as string,
                },
            }
        );
        item.image = uploadResult.url;
    }

    await item.save();
    
    // 6. Refresh vector embeddings for searching
    try {
        await generateMenuEmbedding(item);
    } catch (error: any) {
        console.warn("⚠️ AI Gateway embedding generation failed for updated menu item, but the item was saved successfully:", error.message);
    }

    res.json({
        message: "Menu item updated successfully",
        item,
    });
});
