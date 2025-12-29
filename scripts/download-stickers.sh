#!/bin/bash
# Download Twemoji PNG stickers for video compositing

# Create output directory
mkdir -p ~/Desktop/stickers-png
cd ~/Desktop/stickers-png

# Base URL for Twemoji 72x72 PNGs
BASE_URL="https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72"

# List of emoji codes (matching what you uploaded as SVG)
EMOJIS=(
  "1f308"  # 🌈 rainbow
  "1f31f"  # 🌟 glowing star
  "1f381"  # 🎁 gift
  "1f382"  # 🎂 cake
  "1f388"  # 🎈 balloon
  "1f38a"  # 🎊 confetti
  "1f496"  # 💖 sparkling heart
  "1f49d"  # 💝 heart with ribbon
  "1f60a"  # 😊 smile
  "1f60d"  # 😍 heart eyes
  "1f63b"  # 😻 cat heart eyes
  "2665"   # ♥️ heart suit
  "2728"   # ✨ sparkles
  "2b50"   # ⭐ star
)

echo "Downloading sticker PNGs to ~/Desktop/stickers-png..."

for code in "${EMOJIS[@]}"; do
  echo "Downloading ${code}.png..."
  curl -sLO "${BASE_URL}/${code}.png"
done

echo ""
echo "✅ Done! Downloaded ${#EMOJIS[@]} sticker PNGs"
echo "📁 Location: ~/Desktop/stickers-png"
echo ""
echo "Next: Upload these PNG files to your Supabase 'stickers' bucket"
echo "      (delete the SVG files first)"
