# Live Booking Integration Setup

The Live Booking feature has been successfully integrated into yourphotocrew. Follow these steps to complete the setup:

## Environment Variables

Create a `.env.local` file in the `yourphotocrew` directory with the following variables (all must be prefixed with `NEXT_PUBLIC_`):

```env
# Venue Coordinates
NEXT_PUBLIC_VENUE_HOLE_IN_THE_WALL_CAFE_LAT=12.9352
NEXT_PUBLIC_VENUE_HOLE_IN_THE_WALL_CAFE_LNG=77.6245

# Photographer Codes (comma-separated)
NEXT_PUBLIC_PHOTOGRAPHER_CODES=ABHIGYAN139

# Maximum distance in meters for venue verification
NEXT_PUBLIC_VENUE_MAX_DISTANCE_METERS=500

# Razorpay Payment Gateway Key
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXX

# Venue Name Mappings (Optional)
NEXT_PUBLIC_VENUE_MAPPING_HOLE_IN_THE_WALL_CAFE=HITW,Hole in the Wall,Hole in Wall Cafe
```

**Important:** 
- Replace the example values with your actual configuration
- Use test keys (`rzp_test_...`) for development
- Use live keys (`rzp_live_...`) for production
- Never commit `.env.local` to version control

## Installation

After setting up environment variables, install the dependencies:

```bash
cd yourphotocrew
npm install
```

## Accessing Live Booking

The Live Booking page is now available at:
- URL: `/live-booking`
- Navigation: Added to Navbar and Footer

## Features

- QR code scanning support
- Location verification
- Session management with timer
- Payment processing via Razorpay
- Mobile-first responsive design

## Notes

- The Razorpay script is loaded in `_document.js`
- All components are organized under `src/components/livebooking/`
- Styles are in `src/styles/livebooking/`
- Utilities are in `src/utils/livebooking/`

