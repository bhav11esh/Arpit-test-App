import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Camera, Users, Calendar, QrCode as Qr, Home, ChevronDown, ChevronUp, X, ChevronLeft, ChevronRight, Heart, Car } from 'lucide-react';
import { useRouter } from 'next/router';

const GalleryPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState('all');
  const [expandedCategories, setExpandedCategories] = useState(['all']);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const scrollRefs = useRef({});
  const [shuffledImages, setShuffledImages] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();

  const categories = [
    {
      id: 'all',
      name: 'All Photos',
      subcategories: [{ id: 'all', name: 'All', images: [] }]
    },
    {
      id: 'scheduled',
      name: 'Scheduled Shoots',
      icon: <Camera className="w-5 h-5" />,
      subcategories: [
        { id: 'couple', name: 'Couple Portraits', images: [] },
        { id: 'female', name: 'Female Portraits', images: [] },
        { id: 'portfolio', name: 'Business Profiles', images: [] },
        { id: 'male', name: 'Male Portraits', images: [] }
      ]
    },
    {
      id: 'college',
      name: 'College Events',
      icon: <Users className="w-5 h-5" />,
      subcategories: [
        { id: 'tech', name: 'Tech Fest', images: [] },
        { id: 'cultural', name: 'Cultural Fest', images: [] },
        { id: 'sports', name: 'Sports Meet', images: [] }
      ]
    },
    {
      id: 'qr',
      name: 'Live QR Bookings',
      icon: <Qr className="w-5 h-5" />,
      subcategories: [
        { id: 'cafe', name: 'Cafe Shoots', images: [] },
        { id: 'street', name: 'Street Photography', images: [] },
        { id: 'events', name: 'Event Coverage', images: [] }
      ]
    },
    {
      id: 'family',
      name: 'Family Events',
      icon: <Home className="w-5 h-5" />,
      subcategories: [
        { id: 'wedding', name: 'Wedding', images: [] },
        { id: 'thread', name: 'Thread Ceremony', images: [] },
        { id: 'puja', name: 'Puja', images: [] }
      ]
    },
    {
      id: 'cardealership',
      name: 'Vehicle Dealership',
      icon: <Car className="w-5 h-5" />,
      subcategories: [
        { id: 'car', name: 'Car', images: [] },
        { id: 'bike', name: 'Bike', images: [] }
      ]
    }
  ];
  
  
  // Sample images data (same as before)
  const images = [
    {
      id: '1',
      url: 'assets/gallery/couple/couple-1.jpg',
      title: 'Couple Section',
      category: 'scheduled',
      subcategory: 'couple',
      likes: 245
    },
    {
      id: '2',
      url: 'assets/gallery/couple/couple-2.jpg',
      title: 'Couple Section',
      category: 'scheduled',
      subcategory: 'couple',
      likes: 245
    },
    {
      id: '3',
      url: 'assets/gallery/couple/couple-3.jpg',
      title: 'Couple Section',
      category: 'scheduled',
      subcategory: 'couple',
      likes: 245
    },
    {
      id: '4',
      url: 'assets/gallery/couple/couple-4.jpg',
      title: 'Couple Section',
      category: 'scheduled',
      subcategory: 'couple',
      likes: 245
    },
    {
      id: '5',
      url: 'assets/gallery/couple/couple-5.jpg',
      title: 'Couple Section',    
      category: 'scheduled',
      subcategory: 'couple',
      likes: 245
    },
    {
      id: '6',
      url: 'assets/gallery/couple/couple-6.jpg',
      title: 'Couple Section',
      category: 'scheduled',
      subcategory: 'couple',
      likes: 245
    },
    {
      id: '7',
      url: 'assets/gallery/couple/couple-7.jpg',
      title: 'Couple Section',
      category: 'scheduled',
      subcategory: 'couple',
      likes: 245
    },
    {
      id: '8',
      url: 'assets/gallery/female/female-1.jpg',
      title: 'Female Section',
      category: 'scheduled',
      subcategory: 'female',
      likes: 245
    },
    {
      id: '9',
      url: 'assets/gallery/female/female-2.jpg',
      title: 'Female Section',
      category: 'scheduled',
      subcategory: 'female',
      likes: 245
    },
    // {
    //   id: '10',
    //   url: 'assets/gallery/female/female-3.jpg',
    //   title: 'Female Section',
    //   category: 'scheduled',
    //   subcategory: 'female',
    //   likes: 245
    // },
    // {
    //   id: '11',
    //   url: 'assets/gallery/female/female-4.jpg',
    //   title: 'Female Section',
    //   category: 'scheduled',
    //   subcategory: 'female',
    //   likes: 245
    // },
    // {
    //   id: '12',
    //   url: 'assets/gallery/female/female-5.jpg',
    //   title: 'Female Section',
    //   category: 'scheduled',
    //   subcategory: 'female',
    //   likes: 245
    // },
    // {
    //   id: '13',
    //   url: 'assets/gallery/female/female-6.jpg',
    //   title: 'Female Section',
    //   category: 'scheduled',
    //   subcategory: 'female',
    //   likes: 245
    // },
    {
      id: '14',
      url: 'assets/gallery/female/female-7.jpg',
      title: 'Female Section',
      category: 'scheduled',
      subcategory: 'female',
      likes: 245
    },
    {
      id: '18',
      url: 'assets/gallery/male/male-4.jpg',
      title: 'Male Section',
      category: 'scheduled',
      subcategory: 'male',
      likes: 245
    },
    {
      id: '19',
      url: 'assets/gallery/male/male-5.jpg',
      title: 'Male Section',
      category: 'scheduled',
      subcategory: 'male',
      likes: 245
    },
    {
      id: '39',
      url: 'assets/gallery/male/male-8.jpg',
      title: 'Male Section',
      category: 'scheduled',
      subcategory: 'male',
      likes: 245
    },
    {
      id: '40',
      url: 'assets/gallery/male/male-9.jpg',
      title: 'Male Section',
      category: 'scheduled',
      subcategory: 'male',
      likes: 245
    },
    {
      id: '41',
      url: 'assets/gallery/male/male-10.jpg',
      title: 'Male Section',
      category: 'scheduled',
      subcategory: 'male',
      likes: 245
    },
    {
      id: '42',
      url: 'assets/gallery/male/male-11.jpg',
      title: 'Male Section',
      category: 'scheduled',
      subcategory: 'male',
      likes: 245
    },
    {
      id: '43',
      url: 'assets/gallery/male/male-12.jpg',
      title: 'Male Section',
      category: 'scheduled',
      subcategory: 'male',
      likes: 245
    },
    {
      id: '44',
      url: 'assets/gallery/male/male-13.jpg',
      title: 'Male Section',
      category: 'scheduled',
      subcategory: 'male',
      likes: 245
    },
    {
      id: '15',
      url: 'assets/gallery/male/male-1.jpg',
      title: 'Male Section',
      category: 'scheduled',
      subcategory: 'male',
      likes: 245
    },
    // {
    //   id: '16',
    //   url: 'assets/gallery/male/male-2.jpg',
    //   title: 'Male Section',
    //   category: 'scheduled',
    //   subcategory: 'male',
    //   likes: 245
    // },
    // {
    //   id: '17',
    //   url: 'assets/gallery/male/male-3.jpg',
    //   title: 'Male Section',
    //   category: 'scheduled',
    //   subcategory: 'male',
    //   likes: 245
    // },
    
    // {
    //   id: '20',
    //   url: 'assets/gallery/male/male-6.jpg',
    //   title: 'Male Section',
    //   category: 'scheduled',
    //   subcategory: 'male',
    //   likes: 245
    // },
    // {
    //   id: '21',
    //   url: 'assets/gallery/male/male-7.jpg',
    //   title: 'Male Section',
    //   category: 'scheduled',
    //   subcategory: 'male',
    //   likes: 245
    // },
    // {
    //   id: '22',
    //   url: 'assets/gallery/businessprofile/businessprofile-1.jpg',
    //   title: 'Business Profile Shots',
    //   category: 'scheduled',
    //   subcategory: 'portfolio',
    //   likes: 245
    // },
    {
      id: '29',
      url: 'assets/gallery/businessprofile/businessprofile-8.jpg',
      title: 'Business Profile Shots',
      category: 'scheduled',
      subcategory: 'portfolio',
      likes: 245
    },
    {
      id: '30',
      url: 'assets/gallery/businessprofile/businessprofile-9.jpg',
      title: 'Business Profile Shots',
      category: 'scheduled',
      subcategory: 'portfolio',
      likes: 245
    },
    {
      id: '31',
      url: 'assets/gallery/businessprofile/businessprofile-10.jpg',
      title: 'Business Profile Shots',
      category: 'scheduled',
      subcategory: 'portfolio',
      likes: 245
    },
    {
      id: '32',
      url: 'assets/gallery/businessprofile/businessprofile-11.jpg',
      title: 'Business Profile Shots',
      category: 'scheduled',
      subcategory: 'portfolio',
      likes: 245
    },
    {
      id: '25',
      url: 'assets/gallery/businessprofile/businessprofile-4.jpg',
      title: 'Business Profile Shots',
      category: 'scheduled', 
      subcategory: 'portfolio',
      likes: 245
    },
    
    {
      id: '24',
      url: 'assets/gallery/businessprofile/businessprofile-3.jpg',
      title: 'Business Profile Shots',
      category: 'scheduled',
      subcategory: 'portfolio',
      likes: 245
    },
    
    // {
    //   id: '26',
    //   url: 'assets/gallery/businessprofile/businessprofile-5.jpg',
    //   title: 'Business Profile Shots',
    //   category: 'scheduled',
    //   subcategory: 'portfolio',
    //   likes: 245
    // },
    // {
    //   id: '27',
    //   url: 'assets/gallery/businessprofile/businessprofile-6.jpg',
    //   title: 'Business Profile Shots',
    //   category: 'scheduled',
    //   subcategory: 'portfolio',
    //   likes: 245
    // },
    {
      id: '28',
      url: 'assets/gallery/businessprofile/businessprofile-7.jpg',
      title: 'Business Profile Shots',
      category: 'scheduled',
      subcategory: 'portfolio',
      likes: 245
    },
    {
      id: '23',
      url: 'assets/gallery/businessprofile/businessprofile-2.jpg',
      title: 'Business Profile Shots',
      category: 'scheduled',
      subcategory: 'portfolio',
      likes: 245
    },
    
    {
      id: '33',
      url: 'assets/gallery/female/female-8.jpg',
      title: 'Female Section',
      category: 'scheduled',
      subcategory: 'female',
      likes: 245
    },
    {
      id: '34',
      url: 'assets/gallery/female/female-9.jpg',
      title: 'Female Section',
      category: 'scheduled',
      subcategory: 'female',
      likes: 245
    },
    {
      id: '35',
      url: 'assets/gallery/female/female-10.jpg',
      title: 'Female Section',
      category: 'scheduled',
      subcategory: 'female',
      likes: 245
    },
    {
      id: '36',
      url: 'assets/gallery/female/female-11.jpg',
      title: 'Female Section',
      category: 'scheduled',
      subcategory: 'female',
      likes: 245
    },
    {
      id: '37',
      url: 'assets/gallery/female/female-12.jpg',
      title: 'Female Section',
      category: 'scheduled',
      subcategory: 'female',
      likes: 245
    },
    {
      id: '38',
      url: 'assets/gallery/female/female-13.jpg',
      title: 'Female Section',
      category: 'scheduled',
      subcategory: 'female',
      likes: 245
    },
    
    // Car Dealership Reels (temporarily only reels as requested)
    {
      id: '100',
      url: 'assets/gallery/cardealership/reel-1.mp4',
      title: 'Car',
      category: 'cardealership',
      subcategory: 'car',
      likes: 0
    },
    {
      id: '101',
      url: 'assets/gallery/cardealership/reel-2.mp4',
      title: 'Car',
      category: 'cardealership',
      subcategory: 'car',
      likes: 0
    },
    {
      id: '102',
      url: 'assets/gallery/cardealership/reel-3.mp4',
      title: 'Car',
      category: 'cardealership',
      subcategory: 'car',
      likes: 0
    },
    {
      id: '103',
      url: 'assets/gallery/cardealership/reel-4.mp4',
      title: 'Car',
      category: 'cardealership',
      subcategory: 'car',
      likes: 0
    },
    {
      id: '104',
      url: 'assets/gallery/cardealership/reel-5.mp4',
      title: 'Car',
      category: 'cardealership',
      subcategory: 'car',
      likes: 0
    },
    {
      id: '105',
      url: 'assets/gallery/bikedealership/reel-1.mp4',
      title: 'Bike',
      category: 'cardealership',
      subcategory: 'bike',
      likes: 0
    },
    {
      id: '106',
      url: 'assets/gallery/bikedealership/reel-2.mp4',
      title: 'Bike',
      category: 'cardealership',
      subcategory: 'bike',
      likes: 0
    },
    {
      id: '107',
      url: 'assets/gallery/bikedealership/reel-3.mp4',
      title: 'Bike',
      category: 'cardealership',
      subcategory: 'bike',
      likes: 0
    },
    {
      id: '108',
      url: 'assets/gallery/bikedealership/reel-4.mp4',
      title: 'Bike',
      category: 'cardealership',
      subcategory: 'bike',
      likes: 0
    },
    // Photos are intentionally omitted for now

  ];

  // Update the useEffect hook where shuffledImages is initialized
// Update the useEffect hook where shuffledImages is initialized
useEffect(() => {
  const timer = setTimeout(() => setIsLoading(false), 1000);
  
  const initialShuffled = {};
  categories.filter(c => c.id !== 'all').forEach(category => {
    let categoryImages = images.filter(img => img.category === category.id);
    
    if (category.id === 'scheduled') {
      // Get all business profile photos
      const businessProfileImages = categoryImages.filter(img => img.subcategory === 'portfolio');
      // Get all other photos
      const otherImages = categoryImages.filter(img => img.subcategory !== 'portfolio');
      
      // Select one random business profile to be first
      const firstImage = businessProfileImages.length > 0 
        ? [businessProfileImages[Math.floor(Math.random() * businessProfileImages.length)]] 
        : [];
      
      // Combine: 
      // 1. The selected business profile photo
      // 2. Shuffled remaining business profiles + all other photos
      const remainingBusinessProfiles = businessProfileImages.filter(
        img => !firstImage.some(first => first.id === img.id)
      );
      
      categoryImages = [
        ...firstImage,
        ...shuffleArray([...remainingBusinessProfiles, ...otherImages])
      ];
    } else {
      categoryImages = shuffleArray(categoryImages);
    }
    
    initialShuffled[category.id] = categoryImages;
  });
  
  setShuffledImages(initialShuffled);
  return () => clearTimeout(timer);
}, []);

// Add useEffect to read category/subcategory from URL
useEffect(() => {
  if (router.isReady) {
    const { category, subcategory } = router.query;
    let resolvedCategory = category;
    let resolvedSubcategory = subcategory;

    // Deep link support for /gallery/showroomDeliveries
    if (!resolvedCategory && typeof router.asPath === 'string' && router.asPath.includes('/gallery/showroomDeliveries')) {
      resolvedCategory = 'cardealership';
      resolvedSubcategory = resolvedSubcategory || 'all';
    }

    if (resolvedCategory) {
      setSelectedCategory(resolvedCategory);
      setExpandedCategories(prev => prev.includes(resolvedCategory) ? prev : [...prev, resolvedCategory]);
      setSelectedSubCategory(resolvedSubcategory || 'all');
    }
  }
}, [router.isReady, router.query, router.asPath]);

const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const filterImages = () => {
    return images.filter(image => {
      if (selectedCategory === 'all') return true;
      if (selectedSubCategory === 'all') return image.category === selectedCategory;
      return image.category === selectedCategory && image.subcategory === selectedSubCategory;
    });
  };

  const getCategoryIcon = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.icon || <Filter className="w-5 h-5" />;
  };

  const scrollLeft = (categoryId) => {
    if (scrollRefs.current[categoryId]) {
      scrollRefs.current[categoryId].scrollBy({
        left: -300,
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = (categoryId) => {
    if (scrollRefs.current[categoryId]) {
      scrollRefs.current[categoryId].scrollBy({
        left: 300,
        behavior: 'smooth'
      });
    }
  };

  const handleWheel = (e, categoryId) => {
    if (scrollRefs.current[categoryId]) {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
        e.preventDefault();
        scrollRefs.current[categoryId].scrollBy({
          left: e.deltaY,
          behavior: 'auto'
        });
      }
    }
  };

  const openImage = (image) => {
    const filtered = filterImages();
    const index = filtered.findIndex(img => img.id === image.id);
    setActiveImageIndex(index);
    setSelectedImage(image);
  };

  const navigateImage = (direction) => {
    const filtered = filterImages();
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = activeImageIndex === 0 ? filtered.length - 1 : activeImageIndex - 1;
    } else {
      newIndex = activeImageIndex === filtered.length - 1 ? 0 : activeImageIndex + 1;
    }
    
    setActiveImageIndex(newIndex);
    setSelectedImage(filtered[newIndex]);
  };

  // Utility function to check if a file is a video
  const isVideo = (url) => /\.(mp4|webm|mov|avi)$/i.test(url);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-lg text-gray-600">Loading gallery...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-quaternary pt-24 pb-12 mt-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        {/* <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Our Gallery</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore our collection of professionally captured moments across various categories
          </p>
        </div> */}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar - Modern Card Design */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Filter className="text-primary" />
                Filter Gallery
              </h2>
              
              <div className="space-y-3">
                {categories.map(category => (
                  <div key={category.id} className="space-y-1">
                    <button
                      onClick={() => {
                        toggleCategory(category.id);
                        setSelectedCategory(category.id);
                        setSelectedSubCategory('all');
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                        selectedCategory === category.id
                          ? 'bg-secondary/10 text-primary border border-primary/20'
                          : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`p-2 rounded-md ${
                          selectedCategory === category.id 
                            ? 'bg-primary text-white' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {getCategoryIcon(category.id)}
                        </span>
                        <span className="text-sm font-medium">{category.name}</span>
                      </div>
                      {category.id !== 'all' && (
                        expandedCategories.includes(category.id)
                          ? <ChevronUp className="w-4 h-4 text-gray-500" />
                          : <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                    
                    <AnimatePresence>
                      {expandedCategories.includes(category.id) && category.id !== 'all' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden ml-12"
                        >
                          <div className="py-1 space-y-1">
                            {category.subcategories.map(sub => (
                              <button
                                key={sub.id}
                                onClick={() => {
                                  setSelectedCategory(category.id);
                                  setSelectedSubCategory(sub.id);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                  selectedCategory === category.id && selectedSubCategory === sub.id
                                    ? 'text-primary font-medium bg-primary/5'
                                    : 'text-gray-600 hover:text-primary hover:bg-gray-50'
                                }`}
                              >
                                {sub.name}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gallery Content */}
          <div className="flex-1 overflow-hidden">
            {selectedCategory === 'all' ? (
              <div className="space-y-12">
                {categories.filter(c => c.id !== 'all').map(category => (
                  <div key={category.id} className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-primary flex items-center gap-3">
                        <span className="p-2 bg-secondary/10 text-primary rounded-lg">
                          {category.icon}
                        </span>
                        {category.name}
                      </h2>
                      <button 
                        onClick={() => {
                          setSelectedCategory(category.id);
                          setSelectedSubCategory('all');
                        }}
                        className="text-sm text-primary hover:text-primary/80 font-medium"
                      >
                        View all
                      </button>
                    </div>
                    
                    <div className="relative group">
                      {/* Navigation Arrows */}
                      <button 
                        onClick={() => scrollLeft(category.id)}
                        className="absolute left-0 top-1/2 z-20 -translate-y-1/2 bg-white hover:bg-gray-50 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-800" />
                      </button>
                      
                      <div 
                        ref={el => scrollRefs.current[category.id] = el}
                        className="w-full flex space-x-5 overflow-x-auto pb-6 scrollbar-hide px-1"
                        onWheel={(e) => handleWheel(e, category.id)}
                      >
                        {shuffledImages[category.id]?.map(image => (
                          <motion.div
                            key={image.id}
                            className="flex-none w-72 h-80 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group/item"
                            onClick={() => openImage(image)}
                            whileHover={{ y: -5 }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="relative h-64 overflow-hidden">
                              {isVideo(image.url) ? (
                                <video
                                  src={image.url}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-105"
                                  controls
                                  muted
                                  playsInline
                                  preload="metadata"
                                  poster={image.poster || undefined}
                                  loading="lazy"
                                  style={{ background: '#000' }}
                                />
                              ) : (
                                <img
                                  src={image.url}
                                  alt={image.title}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-105"
                                  loading="lazy"
                                />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex items-end p-4">
                                <div className="text-white">
                                  <h3 className="font-medium">{image.title}</h3>
                                  {/* <div className="flex items-center gap-1 text-sm mt-1">
                                    <Heart className="w-4 h-4" />
                                    <span>{image.likes} likes</span>
                                  </div> */}
                                </div>
                              </div>
                            </div>
                            <div className="p-3 bg-white">
                              <p className="text-sm font-medium text-gray-700 truncate">{image.title}</p>
                              <p className="text-xs text-gray-500">{category.name}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      
                      <button 
                        onClick={() => scrollRight(category.id)}
                        className="absolute right-0 top-1/2 z-20 -translate-y-1/2 bg-white hover:bg-gray-50 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-800" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {categories.find(c => c.id === selectedCategory)?.name}
                  </h2>
                  {selectedSubCategory !== 'all' && (
                    <p className="text-gray-600">
                      {categories.find(c => c.id === selectedCategory)
                        ?.subcategories.find(s => s.id === selectedSubCategory)?.name}
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filterImages().map((image) => (
                    <motion.div
                      key={image.id}
                      layoutId={`image-${image.id}`}
                      className="group relative rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => openImage(image)}
                      whileHover={{ y: -5 }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="aspect-w-4 aspect-h-3">
                        {isVideo(image.url) ? (
                          <video
                            src={image.url}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            controls
                            muted
                            playsInline
                            preload="metadata"
                            poster={image.poster || undefined}
                            loading="lazy"
                            style={{ background: '#000' }}
                          />
                        ) : (
                          <img
                            src={image.url}
                            alt={image.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                        <div className="text-white">
                          <h3 className="font-medium">{image.title}</h3>
                          {/* <div className="flex items-center gap-1 text-sm mt-1">
                            <Heart className="w-4 h-4" />
                            <span>{image.likes} likes</span>
                          </div> */}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Modal - Enhanced with Navigation */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              layoutId={`image-${selectedImage.id}`}
              className="relative max-w-6xl w-full max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Navigation Arrows */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateImage('prev');
                }}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white transition-colors backdrop-blur-sm"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateImage('next');
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white transition-colors backdrop-blur-sm"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              
              {/* Main Image */}
              {isVideo(selectedImage.url) ? (
                <video
                  src={selectedImage.url}
                  className="w-full h-full max-h-[80vh] object-contain rounded-lg"
                  controls
                  autoPlay
                  muted
                  playsInline
                  preload="metadata"
                  poster={selectedImage.poster || undefined}
                  style={{ background: '#000' }}
                />
              ) : (
                <img
                  src={selectedImage.url}
                  alt={selectedImage.title}
                  className="w-full h-full max-h-[80vh] object-contain rounded-lg"
                />
              )}
              
              {/* Close Button */}
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white transition-colors backdrop-blur-sm"
              >
                <X className="w-6 h-6" />
              </button>
              
              {/* Image Info */}
              <div className="mt-4 text-white text-center">
                <h3 className="text-xl font-semibold">{selectedImage.title}</h3>
                <p className="text-gray-300 mt-1 flex items-center justify-center gap-2">
                  <span>
                    {categories.find(c => c.id === selectedImage.category)?.name}
                  </span>
                  {/* <span>•</span> */}
                  {/* <span className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    {selectedImage.likes} likes
                  </span> */}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GalleryPage;