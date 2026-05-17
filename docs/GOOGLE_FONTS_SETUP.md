# Google Fonts Integration Setup

## Overview

The Advanced Cover Editor includes a professional font selection system with **hundreds of Google Fonts**, similar to Canva's font picker.

### Features ✨
- 🎨 **30+ default fonts** (sans-serif, serif, display, monospace)
- 🔍 **Full-text search** for finding fonts by name
- 📁 **Category filtering** (Serif, Sans-Serif, Display, Monospace)
- 📱 **Responsive design** with elegant dialog
- ⚡ **Dynamic font loading** (fonts are loaded on demand)
- 🎯 **Real-time preview** of selected font on canvas

## Setup (Optional API Key)

### Option 1: Default Fonts (No Setup Required) ✅
The application comes with **30+ high-quality fonts pre-configured**. No API key needed!

Located in `src/hooks/use-google-fonts.ts`:
```typescript
const DEFAULT_FONTS: GoogleFont[] = [
  // Serif fonts
  'Libre Baskerville', 'Playfair Display', 'Lora', 'Merriweather',
  // Sans-serif fonts
  'Inter', 'Poppins', 'Raleway', 'Roboto', 'Montserrat',
  // Display fonts
  'Bebas Neue', 'Pacifico', 'Great Vibes', 'Caveat',
  // Monospace fonts
  'JetBrains Mono', 'IBM Plex Mono', 'Roboto Mono',
  // ... and more
];
```

### Option 2: Google Fonts API (Full Access to 1000+ Fonts)

#### Get API Key
1. Go to [Google Fonts Developer API](https://developers.google.com/fonts/docs/developer_api)
2. Create a new project in Google Cloud Console
3. Enable the Google Fonts API
4. Create an API key (type: Unrestricted for web applications)

#### Configure
Add to `.env.local`:
```bash
NEXT_PUBLIC_GOOGLE_FONTS_API_KEY=your_api_key_here
```

> **Note:** The `NEXT_PUBLIC_` prefix makes it available to the browser. This is safe since Google Fonts API doesn't require secret keys for public use.

#### What You Get
- Access to **entire Google Fonts library** (1000+ fonts)
- Automatically fetches most popular fonts
- Fallback to defaults if API fails

---

## How It Works

### Architecture
```
useGoogleFonts()
  ├── Fetch from Google API (if configured)
  ├── Fallback to DEFAULT_FONTS
  └── Load fonts on demand in browser
  
FontSelector Component
  ├── Search/filter fonts
  ├── Display by category
  └── Live preview on canvas
  
Fabric.js Integration
  ├── Apply selected font to text
  ├── Render with Google Fonts CDN
  └── Store font preference in canvas object
```

### Font Loading Flow
1. **User selects font** in FontSelector dialog
2. **Hook loads font** from Google Fonts CDN:
   ```typescript
   const link = document.createElement('link');
   link.href = `https://fonts.googleapis.com/css2?family=${fontFamily}&display=swap`;
   document.head.appendChild(link);
   ```
3. **Font applied to Fabric.js** object:
   ```typescript
   fabricObject.set({ fontFamily: 'Playfair Display' });
   ```
4. **Canvas renders** with new font

---

## Usage

### For Users
1. Select any text element on the cover
2. Property panel opens on the right
3. Click the "Tipografía" (Typography) button
4. Choose from 30+ fonts (or 1000+ with API key)
5. Font applies instantly to selected text

### For Developers

#### Adding Custom Fonts
Edit `src/hooks/use-google-fonts.ts`:

```typescript
const DEFAULT_FONTS: GoogleFont[] = [
  // Add your font here
  { family: 'Your Font Name', variants: ['400', '700'], category: 'serif', kind: 'webfont' },
  // ...existing fonts
];
```

#### Using the Hook
```typescript
import { useGoogleFonts } from '@/hooks/use-google-fonts';

export function MyComponent() {
  const { fonts, loadFont, searchFonts, getFontsByCategory } = useGoogleFonts();
  
  // Load a specific font
  loadFont('Playfair Display');
  
  // Search fonts
  const results = searchFonts('bask');
  
  // Get fonts by category
  const serifFonts = getFontsByCategory('serif');
}
```

#### Using FontSelector Component
```typescript
import { FontSelector } from '@/components/projects/advanced-cover/FontSelector';

export function MyEditor() {
  const [selectedFont, setSelectedFont] = useState('Inter');
  
  return (
    <FontSelector
      selectedFont={selectedFont}
      onFontSelect={(font) => {
        setSelectedFont(font);
        applyFontToText(font);
      }}
      triggerLabel="Choose Font"
    />
  );
}
```

---

## Performance Optimization

### Font Loading
- **On-demand loading:** Fonts load only when selected (not all at startup)
- **Caching:** Loaded fonts are tracked to avoid redundant loads
- **display=swap:** Fonts swap in after loading (no layout shift)

### Bundle Impact
- No additional dependencies required
- Uses native Google Fonts CDN
- Hook is lightweight (~2KB)

---

## Categories Included

| Category | Count | Examples |
|----------|-------|----------|
| **Serif** | 10 | Libre Baskerville, Playfair Display, Lora, Merriweather |
| **Sans-Serif** | 14 | Inter, Poppins, Raleway, Roboto, Montserrat, Open Sans |
| **Display** | 6 | Bebas Neue, Pacifico, Great Vibes, Caveat |
| **Monospace** | 4 | JetBrains Mono, IBM Plex Mono, Roboto Mono |

---

## Customization

### Change Font Dialog Size
Edit `FontSelector.tsx`:
```typescript
<DialogContent className="max-w-2xl max-h-[80vh]">
  {/* Change max-w-2xl or max-h-[80vh] as needed */}
</DialogContent>
```

### Change Categories Display
Edit the tabs in `FontSelector.tsx`:
```typescript
<TabsList className="grid w-full grid-cols-5 gap-2">
  {/* Adjust grid-cols-5 to show more/fewer category tabs */}
</TabsList>
```

### Adjust Search Behavior
Edit `use-google-fonts.ts`:
```typescript
const searchFonts = useCallback((query: string): GoogleFont[] => {
  if (!query.trim()) return fonts;
  
  const lowerQuery = query.toLowerCase();
  return fonts.filter((font) => font.family.toLowerCase().includes(lowerQuery));
}, [fonts]);
```

---

## Troubleshooting

### Fonts Not Loading
1. **Check browser console** for network errors
2. **Verify CORS:** Google Fonts API is public, should work everywhere
3. **Check font name:** Ensure font name matches exactly (case-sensitive)

### Font Not Appearing on Canvas
1. **Font may need time to load** - can take 100-500ms
2. **Check Fabric.js:** Ensure font is supported by Fabric.js
3. **Try refreshing:** Sometimes browser needs refresh to apply

### Too Many Fonts Loaded
Fonts are cached in memory. To clear:
```typescript
// Clear loaded fonts (loses user's font cache)
localStorage.clear();
// Or selectively manage with loadedFontFamilies set
```

---

## Files

- `src/hooks/use-google-fonts.ts` - Font management hook
- `src/components/projects/advanced-cover/FontSelector.tsx` - Font picker component
- `src/components/projects/advanced-cover/PropertyPanel.tsx` - Integration point

---

## Future Enhancements

- [ ] Recent fonts history
- [ ] Font favorites/starred
- [ ] Font combination suggestions
- [ ] Font preview with custom text
- [ ] Font pairing recommendations
- [ ] Variable fonts support
- [ ] Custom font upload

---

**Status:** ✅ Fully functional with default fonts, optional Google Fonts API
**Last Updated:** 2026-04-07
