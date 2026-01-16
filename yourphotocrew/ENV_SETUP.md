# Environment Variables Setup for yourphotocrew

This is a **Next.js** application. Environment variables must be prefixed with `NEXT_PUBLIC_` to be accessible in client-side code.

## Create .env.local file

Create a `.env.local` file in the **yourphotocrew** root directory with the following:

```env
# Venue Coordinates
# Format: NEXT_PUBLIC_VENUE_<VENUE_NAME>_LAT and NEXT_PUBLIC_VENUE_<VENUE_NAME>_LNG
# Replace spaces with underscores in venue names

# Hole in the Wall Cafe
NEXT_PUBLIC_VENUE_HOLE_IN_THE_WALL_CAFE_LAT=12.9352
NEXT_PUBLIC_VENUE_HOLE_IN_THE_WALL_CAFE_LNG=77.6245

# Photographer Codes (comma-separated)
NEXT_PUBLIC_PHOTOGRAPHER_CODES=ABHIGYAN139

# Maximum distance in meters for venue verification
NEXT_PUBLIC_VENUE_MAX_DISTANCE_METERS=500

# Venue Name Mappings (Optional)
# Map alternative venue names/aliases to the canonical venue name
# Format: NEXT_PUBLIC_VENUE_MAPPING_<VENUE_KEY>=alias1,alias2,alias3
# Example: If your QR code sends "HITW" but the venue is "Hole in the Wall Cafe"
NEXT_PUBLIC_VENUE_MAPPING_HOLE_IN_THE_WALL_CAFE=HITW,Hole in the Wall,Hole in Wall Cafe
```

## Venue Name Mappings

You can configure alternative names/aliases for venues using `VENUE_MAPPING_` environment variables. This is useful when:
- QR codes use shortened names (e.g., "HITW" instead of "Hole in the Wall Cafe")
- Different systems use different venue name formats
- You want to support multiple name variations

**Format:**
```env
NEXT_PUBLIC_VENUE_MAPPING_<VENUE_KEY>=alias1,alias2,alias3
```

**Example:**
```env
# For "Hole in the Wall Cafe" (VENUE_KEY is HOLE_IN_THE_WALL_CAFE)
NEXT_PUBLIC_VENUE_MAPPING_HOLE_IN_THE_WALL_CAFE=HITW,Hole in the Wall,Hole in Wall Cafe,hitw cafe
```

The system will automatically:
- Match exact venue names
- Match case-insensitive names
- Match via configured aliases
- Perform fuzzy/partial matching as fallback

## Important Notes for Next.js

1. **NEXT_PUBLIC_ prefix required**: All client-side environment variables must be prefixed with `NEXT_PUBLIC_`
2. **Restart required**: After creating/updating `.env.local`, restart your Next.js dev server (`npm run dev`)
3. **File location**: The `.env.local` file must be in the root of the yourphotocrew directory (same level as `package.json`)
4. **Security**: Never commit `.env.local` to version control (it's already in `.gitignore`)

## Getting Venue Coordinates

To get actual coordinates:
1. Open Google Maps
2. Search for the venue
3. Right-click on the venue location
4. Click on the coordinates to copy them
5. Use the latitude and longitude values in your `.env.local` file

