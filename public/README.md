# PWA Icons

This directory contains Progressive Web App (PWA) icons.

## Required Icons

The PWA manifest requires the following icons:

- `icon-192x192.png` - 192x192 pixels
- `icon-512x512.png` - 512x512 pixels

## Creating Icons

For development, placeholder icons are provided. For production, replace them with your actual branded icons:

### Option 1: Using Online Tools
1. Visit https://convertio.co/svg-png/ or similar
2. Upload your SVG logo
3. Convert to PNG at required sizes (192x192 and 512x512)
4. Save as `icon-192x192.png` and `icon-512x512.png`

### Option 2: Using ImageMagick
```bash
# Install ImageMagick first
# Then run:
convert dorisio-logo.svg -resize 192x192 icon-192x192.png
convert dorisio-logo.svg -resize 512x512 icon-512x512.png
```

### Option 3: Using Photoshop/GIMP
1. Open your logo in Photoshop/GIMP
2. Resize to 192x192 and 512x512
3. Export as PNG
4. Save with the required filenames

## Icon Requirements

- **Format:** PNG
- **Sizes:** 192x192 and 512x512 pixels
- **Purpose:** App icon on home screen, taskbar, etc.
- **Design:** Should be recognizable at small sizes
- **Background:** Transparent or solid color (matches theme_color in manifest)

## Testing

After updating icons:
1. Clear browser cache
2. Rebuild the app: `npm run build`
3. Test PWA installation on mobile device
4. Verify icons appear correctly

## Additional Icons (Optional)

For better support across devices, consider adding:
- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-384x384.png`

Update `manifest.json` to include additional sizes if added.
