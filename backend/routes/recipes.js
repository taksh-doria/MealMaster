import express from "express";
import multer from "multer";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import Recipe from "../models/Recipe.js";
import { validateRecipe } from "../middleware/validation.js";

const router = express.Router();

// Multer memory storage (gives access to req.file.buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
});

// Utility: normalize arrays whether they arrive as JSON strings or arrays
function toArray(v, fallback = []) {
  if (v == null || v === "") return fallback;
  if (Array.isArray(v)) return v;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

// Utility: normalize arrays for update (undefined means "do not change")
function toMaybeArray(v) {
  if (v == null || v === "") return undefined;
  if (Array.isArray(v)) return v;
  try {
    return JSON.parse(v);
  } catch {
    return undefined;
  }
}

// GET all with filters
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      cuisine,
      difficulty,
      maxPrepTime,
      maxCookTime,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filter = {};
    if (cuisine) filter.cuisine = cuisine;
    if (difficulty) filter.difficulty = parseInt(difficulty);
    if (maxPrepTime) filter.prepTime = { $lte: parseInt(maxPrepTime) };
    if (maxCookTime) filter.cookTime = { $lte: parseInt(maxCookTime) };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [data, total] = await Promise.all([
      Recipe.find(filter).sort(sort).skip(skip).limit(parseInt(limit)),
      Recipe.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch recipes",
      error: e.message,
    });
  }
});

// GET one
router.get("/:id", async (req, res) => {
  try {
    const item = await Recipe.findById(req.params.id);
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Recipe not found" });
    res.json({ success: true, data: item });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch recipe",
      error: e.message,
    });
  }
});

// GET image (stream from MongoDB inline binary)
router.get("/:id/image", async (req, res) => {
  try {
    const doc = await Recipe.findById(req.params.id).select("image");
    if (!doc?.image?.data) {
      return res
        .status(404)
        .json({ success: false, message: "Image not found" });
    }
    res.set(
      "Content-Type",
      doc.image.contentType || "application/octet-stream"
    );
    return res.send(doc.image.data);
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "Failed to load image",
      error: e.message,
    });
  }
});

// POST create (multipart/form-data, field "image")
router.post(
  "/",
  upload.single("image"),
  async (req, res, next) => {
    try {
      const body = {
        ...req.body,
        ingredients: toArray(req.body.ingredients, []),
        instructions: toArray(req.body.instructions, []),
        tags: toArray(req.body.tags, []),
      };
      if (req.file?.buffer) {
        const processed = await sharp(req.file.buffer)
          .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
          .toFormat("webp", { quality: 85 })
          .toBuffer();

        body.image = {
          data: processed.toString("base64"), // send Base64
          contentType: "image/webp",
          filename: `${uuidv4()}.webp`,
        };
      }

      req.body = body; // pass normalized body to validator and handler
      return next();
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: "Failed to parse payload",
        error: e.message,
      });
    }
  },
  validateRecipe,
  async (req, res) => {
    try {
      const recipe = await Recipe.create(req.body);
      return res
        .status(201)
        .json({ success: true, message: "Recipe created", data: recipe });
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: "Failed to create recipe",
        error: e.message,
      });
    }
  }
);

// PUT update (multipart/form-data, field "image")
router.put(
  "/:id",
  upload.single("image"),
  async (req, res, next) => {
    try {
      const body = {
        ...req.body,
        ingredients: toMaybeArray(req.body.ingredients),
        instructions: toMaybeArray(req.body.instructions),
        tags: toMaybeArray(req.body.tags),
      };

      // Remove undefined keys (means "do not change")
      Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

      if (req.file?.buffer) {
        const processed = await sharp(req.file.buffer)
          .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
          .toFormat("webp", { quality: 85 })
          .toBuffer();

        body.image = {
          data: processed,
          contentType: "image/webp",
          filename: `${uuidv4()}.webp`,
        };
      }

      req.body = body; // pass normalized body forward
      return next();
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: "Failed to parse payload",
        error: e.message,
      });
    }
  },
  validateRecipe,
  async (req, res) => {
    try {
      const updated = await Recipe.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      if (!updated)
        return res
          .status(404)
          .json({ success: false, message: "Recipe not found" });
      return res.json({
        success: true,
        message: "Recipe updated",
        data: updated,
      });
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: "Failed to update recipe",
        error: e.message,
      });
    }
  }
);

// DELETE remove
router.delete("/:id", async (req, res) => {
  try {
    const item = await Recipe.findByIdAndDelete(req.params.id);
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Recipe not found" });
    // No filesystem cleanup needed; image is stored in MongoDB
    res.json({ success: true, message: "Recipe deleted" });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Failed to delete recipe",
      error: e.message,
    });
  }
});

// POST scale ingredients
router.post("/:id/scale", async (req, res) => {
  try {
    const { servings } = req.body;
    if (!servings || servings <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid servings" });
    }
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe)
      return res
        .status(404)
        .json({ success: false, message: "Recipe not found" });
    const scaledIngredients = recipe.scaleIngredients(servings);
    res.json({
      success: true,
      data: {
        originalServings: recipe.servings,
        newServings: servings,
        scaledIngredients,
      },
    });
  } catch (e) {
    res
      .status(500)
      .json({ success: false, message: "Failed to scale", error: e.message });
  }
});

export default router;
