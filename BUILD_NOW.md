# 🚀 BUILD NOW - Copy & Paste Commands

## ✅ Your Build is Ready!

Everything is configured. Just copy and paste these commands into your terminal.

---

## 🎯 Option 1: Use the Interactive Menu (Recommended)

Open a new terminal window and run:

```bash
cd /Users/ericgoodlev/Desktop/GratituGram
./build.sh
```

Then select option **2** for iOS Preview build.

---

## 🎯 Option 2: Direct Command

```bash
cd /Users/ericgoodlev/Desktop/GratituGram
npx eas build --profile preview --platform ios
```

---

## 📝 What Will Happen

1. **EAS will ask: "Do you want to log in to your Apple account?"**
   - Type: `y` and press Enter

2. **Apple ID Email:**
   - Enter your Apple Developer account email

3. **Apple ID Password:**
   - If you have 2FA enabled, use an app-specific password
   - Generate one at: https://appleid.apple.com

4. **Build Starts:**
   - EAS will show a URL like: `https://expo.dev/accounts/ericgoodlev/projects/showthx/builds/xxxxx`
   - Open this URL in your browser to watch progress

5. **Wait ~10-15 minutes:**
   - The build runs entirely in the cloud
   - You can close the terminal once the upload completes

6. **Download Your App:**
   - When complete, download the `.ipa` file from the build URL
   - Or run: `npx eas build:download`

---

## 🔍 Monitor Your Build

**Dashboard:** https://expo.dev/accounts/ericgoodlev/projects/showthx/builds

**Check Status:**
```bash
npx eas build:list
```

---

## 🆘 If You Get Errors

### "Apple credentials invalid"
Generate an app-specific password:
1. Go to: https://appleid.apple.com
2. Sign in → Security → App-Specific Passwords
3. Generate new password
4. Use this password instead

### "Bundle identifier already exists"
No problem - EAS will guide you through creating a new one.

### Other Issues
Check `BUILD_GUIDE.md` for troubleshooting.

---

## ✅ After Build Completes

**Option A: TestFlight (Recommended)**
```bash
npx eas submit --platform ios
```

**Option B: Direct Download**
```bash
npx eas build:download
```

---

## 🎉 You're Ready!

Open your terminal and run:

```bash
cd /Users/ericgoodlev/Desktop/GratituGram
./build.sh
```

Good luck! Your app will be ready in ~15 minutes! 🚀
