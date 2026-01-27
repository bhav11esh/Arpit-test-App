import type { User, Delivery, Screenshot, ReelTask, Cluster, Dealership, Mapping } from '../types';

// V1 CRITICAL: Photographer day state tracker (persists across navigation)
export let photographerDayStates: Record<string, { servicedCount: number; dayState: 'ACTIVE' | 'CLOSED' }> = {};

// Mock users
export const mockUsers: User[] = [
  { id: 'u1', name: 'Rahul Sharma', role: 'PHOTOGRAPHER', active: true, cluster_code: 'NORTH' },
  { id: 'u2', name: 'Priya Patel', role: 'PHOTOGRAPHER', active: true, cluster_code: 'NORTH' },
  { id: 'u3', name: 'Admin User', role: 'ADMIN', active: true },
];

// V1 ADMIN CONFIGURATION ENTITIES
// Initial seed data - fully manageable via Admin UI

export const mockClusters: Cluster[] = [
  { id: 'c1', name: 'North Delhi', latitude: 28.7041, longitude: 77.1025 },
  { id: 'c2', name: 'South Delhi', latitude: 28.5355, longitude: 77.3910 },
  { id: 'c3', name: 'East Delhi', latitude: 28.6692, longitude: 77.4538 },
  { id: 'c4', name: 'West Delhi', latitude: 28.6692, longitude: 77.1025 },
];

export const mockDealerships: Dealership[] = [
  { 
    id: 'ds1', 
    name: 'Khatri Wheels (KHTR_WH)', 
    latitude: 28.7041, 
    longitude: 77.1025,
    paymentType: 'CUSTOMER_PAID'
  },
  { 
    id: 'ds2', 
    name: 'DLF Phase 3 Showroom (DLF_PH3)', 
    latitude: 28.5355, 
    longitude: 77.3910,
    paymentType: 'DEALER_PAID'
  },
  { 
    id: 'ds3', 
    name: 'MGF Metropolitan (MGF_MET)', 
    latitude: 28.4955, 
    longitude: 77.0910,
    paymentType: 'CUSTOMER_PAID'
  },
  { 
    id: 'ds4', 
    name: 'Vasant Mall Showroom (VAS_MALL)', 
    latitude: 28.6692, 
    longitude: 77.4538,
    paymentType: 'CUSTOMER_PAID'
  },
  { 
    id: 'ds5', 
    name: 'Saket Central (SAK_CENT)', 
    latitude: 28.5244, 
    longitude: 77.2066,
    paymentType: 'CUSTOMER_PAID'
  },
];

export const mockMappings: Mapping[] = [
  // Primary mapping: North cluster -> Khatri Wheels -> Rahul Sharma
  { 
    id: 'm1', 
    clusterId: 'c1', 
    dealershipId: 'ds1', 
    photographerId: 'u1', 
    mappingType: 'PRIMARY' 
  },
  // Secondary mapping: South cluster -> DLF Phase 3 -> available for any photographer
  { 
    id: 'm2', 
    clusterId: 'c2', 
    dealershipId: 'ds2', 
    photographerId: 'u2', 
    mappingType: 'SECONDARY' 
  },
  // Primary mapping: North cluster -> MGF Metropolitan -> Rahul Sharma
  { 
    id: 'm3', 
    clusterId: 'c1', 
    dealershipId: 'ds3', 
    photographerId: 'u1', 
    mappingType: 'PRIMARY' 
  },
  // Secondary mapping: East cluster -> Vasant Mall -> Priya Patel
  { 
    id: 'm4', 
    clusterId: 'c3', 
    dealershipId: 'ds4', 
    photographerId: 'u2', 
    mappingType: 'SECONDARY' 
  },
  // Primary mapping: South cluster -> Saket Central -> Priya Patel
  { 
    id: 'm5', 
    clusterId: 'c2', 
    dealershipId: 'ds5', 
    photographerId: 'u2', 
    mappingType: 'PRIMARY' 
  },
];

// Mock deliveries
export const mockDeliveries: Delivery[] = [
  {
    id: 'd1',
    date: '2026-01-15',
    showroom_code: 'KHTR_WH',
    cluster_code: 'NORTH',
    showroom_type: 'PRIMARY',
    timing: '14:30',
    delivery_name: '15-01-2026_KHTR_WH_14_30',
    status: 'ASSIGNED',
    assigned_user_id: 'u1',
    payment_type: 'CUSTOMER_PAID',
    footage_link: null,
    created_at: '2026-01-12T10:00:00Z',
    updated_at: '2026-01-12T10:00:00Z',
  },
  {
    id: 'd2',
    date: '2026-01-15',
    showroom_code: 'DLF_PH3',
    cluster_code: 'SOUTH',
    showroom_type: 'SECONDARY',
    timing: '16:00',
    delivery_name: '15-01-2026_DLF_PH3_16_00',
    status: 'UNASSIGNED',
    assigned_user_id: null,
    payment_type: 'DEALER_PAID',
    footage_link: 'https://drive.google.com/example1',
    created_at: '2026-01-12T11:00:00Z',
    updated_at: '2026-01-12T11:00:00Z',
  },
  {
    id: 'd3',
    date: '2026-01-16',
    showroom_code: 'MGF_MET',
    cluster_code: 'NORTH',
    showroom_type: 'PRIMARY',
    timing: null,
    delivery_name: '16-01-2026_MGF_MET_1',
    status: 'UNASSIGNED',
    assigned_user_id: null,
    payment_type: 'CUSTOMER_PAID',
    footage_link: null,
    created_at: '2026-01-12T12:00:00Z',
    updated_at: '2026-01-12T12:00:00Z',
  },
  {
    id: 'd4',
    date: '2026-01-16',
    showroom_code: 'VAS_MALL',
    cluster_code: 'EAST',
    showroom_type: 'SECONDARY',
    timing: '11:00',
    delivery_name: '16-01-2026_VAS_MALL_11_00',
    status: 'UNASSIGNED',
    assigned_user_id: null,
    payment_type: 'CUSTOMER_PAID',
    footage_link: null,
    created_at: '2026-01-12T13:00:00Z',
    updated_at: '2026-01-12T13:00:00Z',
  },
  {
    id: 'd5',
    date: '2026-01-14',
    showroom_code: 'SAK_CENT',
    cluster_code: 'SOUTH',
    showroom_type: 'PRIMARY',
    timing: '15:30',
    delivery_name: '14-01-2026_SAK_CENT_15_30',
    status: 'DONE',
    assigned_user_id: 'u2',
    payment_type: 'CUSTOMER_PAID',
    footage_link: 'https://drive.google.com/example2',
    created_at: '2026-01-11T10:00:00Z',
    updated_at: '2026-01-14T16:00:00Z',
  },
  {
    id: 'd6',
    date: '2026-01-13',
    showroom_code: 'KHTR_WH',
    cluster_code: 'NORTH',
    showroom_type: 'PRIMARY',
    timing: '12:00',
    delivery_name: '13-01-2026_KHTR_WH_12_00',
    status: 'DONE',
    assigned_user_id: 'u1',
    payment_type: 'DEALER_PAID',
    footage_link: 'https://drive.google.com/example3',
    created_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-01-13T13:30:00Z',
  },
];

// Mock screenshots
export const mockScreenshots = [
  {
    id: 's1',
    delivery_id: 'd5',
    user_id: 'u2',
    type: 'PAYMENT',
    file_url: 'https://images.unsplash.com/photo-1620204792730-e5b52d101930?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYXltZW50JTIwcmVjZWlwdCUyMHNjcmVlbnNob3R8ZW58MXx8fHwxNzY4OTQ3ODEyfDA&ixlib=rb-4.1.0&q=80&w=1080',
    thumbnail_url: 'https://images.unsplash.com/photo-1620204792730-e5b52d101930?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    uploaded_at: '2026-01-14T15:45:00Z',
    deleted_at: null,
  },
  {
    id: 's2',
    delivery_id: 'd5',
    user_id: 'u2',
    type: 'FOLLOW',
    file_url: 'https://images.unsplash.com/photo-1598018553943-29ace5bf9867?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2NpYWwlMjBtZWRpYSUyMHNjcmVlbnNob3R8ZW58MXx8fHwxNzY4OTQ3ODEyfDA&ixlib=rb-4.1.0&q=80&w=1080',
    thumbnail_url: 'https://images.unsplash.com/photo-1598018553943-29ace5bf9867?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    uploaded_at: '2026-01-14T15:46:00Z',
    deleted_at: null,
  },
  {
    id: 's3',
    delivery_id: 'd6',
    user_id: 'u1',
    type: 'PAYMENT',
    file_url: 'https://images.unsplash.com/photo-1765226410758-9ae3d34cd791?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2JpbGUlMjBwYXltZW50JTIwc2NyZWVufGVufDF8fHx8MTc2ODk0NzgxMnww&ixlib=rb-4.1.0&q=80&w=1080',
    thumbnail_url: 'https://images.unsplash.com/photo-1765226410758-9ae3d34cd791?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    uploaded_at: '2026-01-13T12:45:00Z',
    deleted_at: null,
  },
  {
    id: 's4',
    delivery_id: 'd6',
    user_id: 'u1',
    type: 'FOLLOW',
    file_url: 'https://images.unsplash.com/photo-1567200297374-ad376ab03e32?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaG9uZSUyMHNjcmVlbiUyMGFwcHxlbnwxfHx8fDE3Njg5MjUyMDN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    thumbnail_url: 'https://images.unsplash.com/photo-1567200297374-ad376ab03e32?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    uploaded_at: '2026-01-13T12:46:00Z',
    deleted_at: null,
  },
];

// Mock reel tasks
export const mockReelTasks: ReelTask[] = [
  {
    id: 'r1',
    delivery_id: 'd5',
    assigned_user_id: 'u2', // Priya's delivery, assigned to Priya
    reel_link: null,
    status: 'PENDING',
    reassigned_reason: null,
  },
  {
    id: 'r2',
    delivery_id: 'd6',
    assigned_user_id: 'u1', // Rahul's delivery, assigned to Rahul
    reel_link: null,
    status: 'PENDING',
    reassigned_reason: null, // NOT reassigned - this is Rahul's own delivery
  },
];

// API simulation helper
export const simulateApiDelay = (ms: number = 500) => 
  new Promise(resolve => setTimeout(resolve, ms));