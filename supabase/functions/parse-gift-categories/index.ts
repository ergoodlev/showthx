// Supabase Edge Function to parse gift names and extract categories using AI
// Called during CSV import to clean up messy gift descriptions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

// Gift categories with emojis
const GIFT_CATEGORIES: Record<string, { emoji: string; label: string }> = {
  stuffed_animal: { emoji: "🧸", label: "Stuffed Animal" },
  doll: { emoji: "🪆", label: "Doll" },
  lego: { emoji: "🧱", label: "LEGO/Blocks" },
  board_game: { emoji: "🎲", label: "Board Game" },
  video_game: { emoji: "🎮", label: "Video Game" },
  toy_car: { emoji: "🚗", label: "Toy Car" },
  robot: { emoji: "🤖", label: "Robot/Tech Toy" },
  art_supplies: { emoji: "🎨", label: "Art Supplies" },
  book: { emoji: "📚", label: "Book" },
  musical: { emoji: "🎵", label: "Musical" },
  science: { emoji: "🔬", label: "Science Kit" },
  sports: { emoji: "⚽", label: "Sports" },
  bike: { emoji: "🚲", label: "Bike/Scooter" },
  outdoor: { emoji: "🏕️", label: "Outdoor Gear" },
  clothing: { emoji: "👕", label: "Clothing" },
  jewelry: { emoji: "💎", label: "Jewelry" },
  bag: { emoji: "🎒", label: "Bag/Backpack" },
  electronics: { emoji: "📱", label: "Electronics" },
  money: { emoji: "💵", label: "Money/Gift Card" },
  candy: { emoji: "🍬", label: "Candy/Treats" },
  pet: { emoji: "🐕", label: "Pet/Animal" },
  room_decor: { emoji: "🛏️", label: "Room Decor" },
  gift: { emoji: "🎁", label: "Gift" },
};

interface GiftInput {
  id: string;
  rawName: string;
}

interface ParsedGift {
  id: string;
  category: string;
  emoji: string;
  parsedName: string;
}

interface RequestPayload {
  gifts: GiftInput[];
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY not configured");
      // Fall back to simple keyword matching
      const payload: RequestPayload = await req.json();
      const parsedGifts = payload.gifts.map((gift) => fallbackParse(gift));
      return new Response(JSON.stringify({ parsedGifts }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const payload: RequestPayload = await req.json();
    console.log("Parsing", payload.gifts.length, "gifts");

    // Build the prompt for Claude
    const giftList = payload.gifts
      .map((g, i) => `${i + 1}. "${g.rawName}"`)
      .join("\n");

    const categoryList = Object.entries(GIFT_CATEGORIES)
      .map(([key, val]) => `- ${key}: ${val.label} ${val.emoji}`)
      .join("\n");

    const prompt = `You are helping parse gift descriptions for a kids' thank you video app.

For each gift below, extract:
1. A kid-friendly gift name - include ALL items completely (don't shorten or truncate)
2. The best matching category
3. If child names appear in parentheses like (ELI) or (ASHER), extract who gets what

Gift descriptions to parse:
${giftList}

Available categories:
${categoryList}

IMPORTANT RULES:
- parsedName: Include the COMPLETE FULL description of ALL gifts (don't truncate!)
- Include ALL items if multiple gifts listed - never pick just one
- Remove only instructions like "don't forget" or "thank them both"
- childGifts: If (CHILDNAME) appears before items, map each child to their gifts
- childGifts: Empty array [] if no child names in parentheses

EXAMPLES:

Two kids, different gifts:
Input: "(ELI) BASEBALL BASES AND BACKSTOP, (ASHER) CROQUET SET"
Output: {"parsedName": "Baseball Bases and Backstop, Croquet Set", "category": "sports", "childGifts": [{"child": "Eli", "gift": "Baseball Bases and Backstop"}, {"child": "Asher", "gift": "Croquet Set"}]}

Two kids, multiple gifts each:
Input: "(ELI) BIKE, HELMET, (ASHER) SCOOTER, KNEE PADS"
Output: {"parsedName": "Bike, Helmet, Scooter, Knee Pads", "category": "bike", "childGifts": [{"child": "Eli", "gift": "Bike and Helmet"}, {"child": "Asher", "gift": "Scooter and Knee Pads"}]}

Multiple gifts, no specific kids:
Input: "LEGO Star Wars set and Pokemon book"
Output: {"parsedName": "LEGO Star Wars Set and Pokemon Book", "category": "lego", "childGifts": []}

Single gift with instructions to remove:
Input: "green elephant stuffed toy - don't forget to thank them!"
Output: {"parsedName": "Green Elephant Stuffed Toy", "category": "stuffed_animal", "childGifts": []}

Respond with JSON array only:
[{"index": 1, "parsedName": "...", "category": "...", "childGifts": [...]}, ...]`;

    // Call Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", response.status, errorText);
      // Fallback to keyword matching
      const parsedGifts = payload.gifts.map((gift) => fallbackParse(gift));
      return new Response(JSON.stringify({ parsedGifts }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const claudeResponse = await response.json();
    const content = claudeResponse.content[0]?.text || "[]";

    // Parse Claude's response
    let parsedResults: Array<{ index: number; parsedName: string; category: string }>;
    try {
      // Extract JSON from response (Claude might include extra text)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      parsedResults = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (parseError) {
      console.error("Error parsing Claude response:", parseError);
      const parsedGifts = payload.gifts.map((gift) => fallbackParse(gift));
      return new Response(JSON.stringify({ parsedGifts }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Map results back to gift IDs
    const parsedGifts: ParsedGift[] = payload.gifts.map((gift, index) => {
      const result = parsedResults.find((r) => r.index === index + 1);
      if (result && GIFT_CATEGORIES[result.category]) {
        return {
          id: gift.id,
          category: result.category,
          emoji: GIFT_CATEGORIES[result.category].emoji,
          parsedName: result.parsedName,
        };
      }
      return fallbackParse(gift);
    });

    console.log("Successfully parsed", parsedGifts.length, "gifts");

    return new Response(JSON.stringify({ parsedGifts }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error in parse-gift-categories:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

// Clean up gift name for fallback
function cleanGiftName(rawName: string): string {
  if (!rawName) return "Special Gift";

  let cleaned = rawName
    // Remove child name prefixes like "(ELI)" or "(ASHER)"
    .replace(/\([A-Z]+\)\s*/gi, "")
    // Remove common instruction text
    .replace(/thank.*both|thank.*them|don't forget|please note/gi, "")
    // Remove quantity notes like "(x2)" or "x 3"
    .replace(/\(x\d+\)|x\s*\d+/gi, "")
    // Remove multiple spaces
    .replace(/\s+/g, " ")
    .trim();

  // Title case
  cleaned = cleaned
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  // Keep full gift name - only limit extremely long names for display
  if (cleaned.length > 100) {
    cleaned = cleaned.substring(0, 97) + "...";
  }

  return cleaned || "Special Gift";
}

// Simple fallback parsing using keywords
function fallbackParse(gift: GiftInput): ParsedGift {
  const text = gift.rawName?.toLowerCase() || "";
  const cleanedName = cleanGiftName(gift.rawName);

  const keywords: Record<string, string[]> = {
    stuffed_animal: ["stuffed", "plush", "teddy", "bear", "bunny", "elephant"],
    doll: ["doll", "barbie", "action figure"],
    lego: ["lego", "blocks", "building", "duplo"],
    board_game: ["board game", "puzzle", "game", "monopoly", "uno"],
    video_game: ["video game", "nintendo", "switch", "xbox", "playstation", "pokemon"],
    toy_car: ["car", "truck", "train", "hot wheels", "vehicle", "hotwheels"],
    robot: ["robot", "drone", "remote control", "rc"],
    art_supplies: ["art", "paint", "crayon", "marker", "drawing", "craft"],
    book: ["book", "reading", "story", "comic"],
    musical: ["music", "instrument", "piano", "guitar"],
    science: ["science", "experiment", "chemistry", "dinosaur"],
    sports: ["ball", "soccer", "basketball", "football", "sports", "baseball"],
    bike: ["bike", "bicycle", "scooter", "skateboard"],
    clothing: ["shirt", "dress", "pants", "shoes", "clothes"],
    electronics: ["tablet", "ipad", "phone", "headphones"],
    money: ["money", "cash", "gift card", "amazon", "visa"],
    candy: ["candy", "chocolate", "sweets", "treats"],
  };

  for (const [category, words] of Object.entries(keywords)) {
    for (const word of words) {
      if (text.includes(word)) {
        return {
          id: gift.id,
          category,
          emoji: GIFT_CATEGORIES[category].emoji,
          parsedName: cleanedName,  // Use cleaned gift name, not category label
        };
      }
    }
  }

  return {
    id: gift.id,
    category: "gift",
    emoji: "🎁",
    parsedName: cleanedName,  // Use cleaned gift name, not "Gift"
  };
}
