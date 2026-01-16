# Navigation Flow Diagram - YourPhotoCrew

## Complete Navigation & CTA Flow

```mermaid
graph TD
    Start([User Enters Site]) --> Home[/]
    Start --> Root[/root]
    
    Home --> Navbar[Navbar - All Pages]
    Root --> Navbar
    
    Navbar --> NavHome[Home Link]
    Navbar --> NavServices[Scheduled Services Link]
    Navbar --> NavGallery[Gallery Link]
    
    NavHome --> Home
    NavServices --> Services[/services]
    NavGallery --> Gallery[/gallery]
    
    Home --> HeroSection[Hero Section]
    HeroSection --> CTA1[Schedule Shoot Button]
    HeroSection --> CTA2[View Gallery Button]
    HeroSection --> External1[Paytm Insider Logo]
    HeroSection --> External2[BookMyShow Logo]
    
    CTA1 --> Services
    CTA2 --> Gallery
    
    Home --> ServicesSection[Services Section]
    ServicesSection --> Tab1[Scheduled Shoot Tab]
    ServicesSection --> Tab2[Goa Edition Tab]
    ServicesSection --> Tab3[College Fests Tab]
    ServicesSection --> Tab4[Family Functions Tab]
    
    Home --> Footer[Footer - All Pages]
    Footer --> FooterHome[Home Link]
    Footer --> FooterServices[Scheduled Services Link]
    Footer --> FooterGallery[Gallery Link]
    Footer --> Social1[Instagram Link]
    Footer --> Social2[YouTube Link]
    Footer --> Social3[WhatsApp Link]
    
    FooterHome --> Home
    FooterServices --> Services
    FooterGallery --> Gallery
    Social1 --> External3[Instagram External]
    Social2 --> External4[YouTube External]
    Social3 --> WhatsApp[WhatsApp External]
    
    Services --> ServicesNavbar[Navbar]
    Services --> ScheduledShoot[Scheduled Shoot Section]
    Services --> CameraLove[Camera Love Section]
    Services --> Features[Features Section]
    Services --> BTS[BTS Section]
    Services --> GettingStarted[Getting Started Section]
    Services --> GlimpseGallery[Glimpse Gallery]
    Services --> DiscountSection[Discount Section]
    Services --> Testimonials[Testimonials Section]
    Services --> FAQ[FAQ Section]
    Services --> ServicesFooter[Footer]
    Services --> ServicesWhatsApp[WhatsApp Button]
    
    GettingStarted --> CTA3[Book Your Shoot Now]
    CTA3 --> Services
    
    DiscountSection --> CTA4[Claim Offer Button]
    CTA4 --> WhatsApp
    
    Gallery --> GalleryNavbar[Navbar]
    Gallery --> GalleryPage[Gallery Page Component]
    Gallery --> GalleryFooter[Footer]
    Gallery --> GalleryWhatsApp[WhatsApp Button]
    
    Gallery --> ShowroomRedirect[/gallery/showroomDeliveries]
    ShowroomRedirect --> GalleryFilter[Gallery with Car Dealership Filter]
    
    Home --> HomeWhatsApp[WhatsApp Button - Fixed Bottom Right]
    Services --> ServicesWhatsApp
    Gallery --> GalleryWhatsApp
    
    HomeWhatsApp --> WhatsApp
    ServicesWhatsApp --> WhatsApp
    GalleryWhatsApp --> WhatsApp
    
    style Home fill:#e1f5ff
    style Root fill:#e1f5ff
    style Services fill:#fff4e1
    style Gallery fill:#ffe1f5
    style WhatsApp fill:#d4edda
    style External3 fill:#f0f0f0
    style External4 fill:#f0f0f0
    style External1 fill:#f0f0f0
    style External2 fill:#f0f0f0
```

## Route Summary

### Internal Routes
- **`/`** - Home page (index.js)
- **`/root`** - Home page (root.js) - Same content as `/`
- **`/services`** - Scheduled Services page
- **`/gallery`** - Gallery page
- **`/gallery/showroomDeliveries`** - Redirects to gallery with car dealership filter

### External Links
- **WhatsApp**: `https://wa.me/7676235229`
- **Instagram**: `https://www.instagram.com/yourphotocrew/`
- **YouTube**: `https://www.youtube.com/@yourphotocrew`
- **Paytm Insider**: (Logo display only)
- **BookMyShow**: (Logo display only)

## CTA Breakdown by Page

### Home Page (`/`)
1. **Hero Section:**
   - "Schedule Shoot" → `/services`
   - "View Gallery" → `/gallery`
   - Paytm Insider logo (display)
   - BookMyShow logo (display)

2. **Navbar:**
   - Home → `/`
   - Scheduled Services → `/services`
   - Gallery → `/gallery`

3. **Footer:**
   - Home → `/`
   - Scheduled Services → `/services`
   - Gallery → `/gallery`
   - Instagram → External
   - YouTube → External
   - WhatsApp → External

4. **WhatsApp Button (Fixed):**
   - "Help & Support" → WhatsApp External

### Services Page (`/services`)
1. **Getting Started Section:**
   - "Book Your Shoot Now" → `/services` (scrolls to top)

2. **Discount Section:**
   - "Claim Offer" → WhatsApp with coupon code pre-filled

3. **Navbar:**
   - Same as Home page

4. **Footer:**
   - Same as Home page

5. **WhatsApp Button (Fixed):**
   - Same as Home page

### Gallery Page (`/gallery`)
1. **Navbar:**
   - Same as Home page

2. **Footer:**
   - Same as Home page

3. **WhatsApp Button (Fixed):**
   - Same as Home page

4. **Gallery Filters:**
   - Category filters (internal navigation within page)
   - Subcategory filters (internal navigation within page)

## Navigation Patterns

### Primary User Flows
1. **Discovery → Booking:**
   - Home → Hero CTA "Schedule Shoot" → Services → Getting Started "Book Your Shoot Now"

2. **Discovery → Gallery:**
   - Home → Hero CTA "View Gallery" → Gallery

3. **Services → Booking:**
   - Services → Discount Section "Claim Offer" → WhatsApp

4. **Anywhere → Contact:**
   - Any Page → WhatsApp Button → WhatsApp External

### Secondary Navigation
- Navbar links available on all pages
- Footer links available on all pages
- WhatsApp button available on all pages (fixed position)

