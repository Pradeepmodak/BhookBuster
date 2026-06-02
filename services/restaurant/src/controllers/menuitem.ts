import Restaurant from "../models/Restaurant.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import getBuffer from "../config/datauri.js";
import axios from "axios";
import uploadFile from "../middlewares/multer.js";
import MenuItems from "../models/MenuItems.js";
import { generateMenuEmbedding, toStringArray } from "../lib/embeddings.js";


export const addMenuItem = TryCatch(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Please login",
        });
    }

    const restaurant = await Restaurant.findOne({ ownerId: req.user._id });

    if (!restaurant) {
        return res.status(404).json({
            message: "No Restaurant found",
        });
    }

    const { name, description, price, cuisine, tags, dietaryFlags, spiceLevel } = req.body;
    if (!name || !price) {
        return res.status(400).json({
            message: "Name and price are required"
        })
    }
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
try {
    await generateMenuEmbedding(item);
} catch (error: any) {
    console.warn("⚠️ AI Gateway embedding generation failed for new menu item, but the item was created successfully:", error.message);
}
res.status(201).json({
    message:"Item added Successfully",
    item,
});
});

export const getAllItems = TryCatch(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            message: "Id is required",
        });
    }
    const items = await MenuItems.find({ restaurantId: id });
    res.status(200).json(items);
});

export const deleteMenuItem = TryCatch(async(req:AuthenticatedRequest, res)=>{
    if (!req.user) {
        return res.status(401).json({
            message: "Please login",
        });
    }

    const { itemId } = req.params;
    const item=await MenuItems.findById(itemId);
    if (!item) {
        return res.status(400).json({
            message: "Id is required",
        });
    }
    const restaurant = await Restaurant.findOne({
    _id: item.restaurantId,
    ownerId: req.user._id,
});

if(!restaurant){
    return res.status(404).json({
        message: "No Restaurant found",
    });
}

await item.deleteOne();

res.status(200).json({
    message:"Menu item deleted successfully",
})
});

export const toggleMenuItemAvailability=TryCatch(async(req:AuthenticatedRequest,res)=>{
   if (!req.user) {
        return res.status(401).json({
            message: "Please login",
        });
    }

    const { itemId } = req.params;
    const item=await MenuItems.findById(itemId);
    if (!item) {
        return res.status(400).json({
            message: "Id is required",
        });
    }
    const restaurant = await Restaurant.findOne({
    _id: item.restaurantId,
    ownerId: req.user._id,
});

if(!restaurant){
    return res.status(404).json({
        message: "No Restaurant found",
    });
}

item.isAvailable=!item.isAvailable;
await item.save();
res.status(200).json({
message:`Item Marked as ${item.isAvailable ? "available" : "unavailable"}`,
item,
})
})

export const updateMenuItem = TryCatch(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Please login",
        });
    }

    const { itemId } = req.params;
    const item = await MenuItems.findById(itemId);
    if (!item) {
        return res.status(404).json({
            message: "Menu item not found",
        });
    }

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

    if (name !== undefined) item.name = name;
    if (description !== undefined) item.description = description;
    if (price !== undefined) item.price = Number(price);
    if (cuisine !== undefined) item.cuisine = cuisine;
    if (tags !== undefined) item.tags = toStringArray(tags);
    if (dietaryFlags !== undefined) item.dietaryFlags = toStringArray(dietaryFlags);
    if (spiceLevel !== undefined) item.spiceLevel = spiceLevel;

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
