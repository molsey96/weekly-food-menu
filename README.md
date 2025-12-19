# 🍽️ Weekly Food Menu

A beautiful, modern web app for planning and sharing your weekly meal menu with your cook or family.

## Features

- ✨ Beautiful dark-themed UI
- 📅 Plan meals for all 7 days of the week
- 🍳 Track breakfast, lunch, and dinner
- 💾 Auto-saves to browser storage
- 📤 Share menu via link or text
- 📥 Import menu from shared links
- 📱 Fully responsive design

## How to Use Locally

### Option 1: Simple (Double-click)
Just double-click `index.html` to open it in your browser.

### Option 2: Local Server (Recommended)
```bash
# Using Python
python3 -m http.server 8000

# Then open: http://localhost:8000
```

## Sharing Your Menu with Your Cook

### Method 1: Share Link (Easiest)
1. Plan your weekly menu
2. Click **"📤 Share Menu"** button
3. Click **"Copy Link"** to copy the shareable link
4. Send the link to your cook via WhatsApp, email, or text
5. When your cook opens the link, they'll see your menu!

### Method 2: Share as Text
1. Click **"📤 Share Menu"** button
2. Click **"Copy Text"** to copy formatted menu text
3. Paste it in WhatsApp, email, or any messaging app
4. Your cook can read it directly or import it using the "📥 Import Menu" button

### Method 3: Import Menu
If you receive a share link or menu data:
1. Click **"📥 Import Menu"** button
2. Paste the link or menu data
3. Click **"Import"** to load the menu

## Deploying Online (Free Options)

### GitHub Pages (Recommended - Free & Easy)

1. **Create a GitHub account** (if you don't have one): https://github.com

2. **Create a new repository:**
   - Go to https://github.com/new
   - Name it `weekly-food-menu` (or any name)
   - Make it **Public** (required for free GitHub Pages)
   - Click "Create repository"

3. **Upload your files:**
   ```bash
   # In your project folder
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/weekly-food-menu.git
   git push -u origin main
   ```
   
   Or use GitHub Desktop app for a simpler GUI approach.

4. **Enable GitHub Pages:**
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Under "Source", select **main** branch and **/ (root)** folder
   - Click **Save**
   - Your site will be live at: `https://YOUR_USERNAME.github.io/weekly-food-menu/`

5. **Share with your cook:**
   - Send them the GitHub Pages URL
   - They can bookmark it and you can update the menu weekly!

### Alternative: Netlify (Also Free)

1. Go to https://www.netlify.com
2. Sign up for free
3. Drag and drop your project folder onto Netlify
4. Get an instant URL like `your-menu.netlify.app`
5. Share that URL with your cook!

### Alternative: Vercel (Also Free)

1. Go to https://vercel.com
2. Sign up for free
3. Import your GitHub repository or upload files
4. Get an instant URL
5. Share with your cook!

## Weekly Workflow

1. **Plan your menu** for the week
2. **Click "Share Menu"** to get a shareable link
3. **Send the link** to your cook via WhatsApp/email
4. Your cook opens the link and sees your menu
5. **Next week**, plan a new menu and share again!

## Tips

- The menu auto-saves in your browser, so you can come back anytime
- Share links work on any device (phone, tablet, computer)
- You can share the same link multiple times
- Use "Clear Week" to start fresh for a new week

## Browser Support

Works on all modern browsers:
- Chrome/Edge
- Firefox
- Safari
- Mobile browsers

## License

Free to use for personal purposes.



