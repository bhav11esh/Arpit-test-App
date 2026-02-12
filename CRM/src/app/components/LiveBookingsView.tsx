import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { RefreshCw, MapPin, CheckCircle2, UserPlus, Clock, Ban, Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface LiveBooking {
    id: string;
    request_id: string;
    venue_name: string;
    table_name: string | null;
    status: 'PENDING' | 'OPTED_IN' | 'ARRIVED' | 'PAID' | 'COMPLETED' | 'CANCELLED' | 'NOT_PAID';
    created_at: string;
    photographer_id: string | null;
    qr_params: any;
    drive_link: string | null;
    hardcopy_filenames: string | null;
    hardcopy_resolved: boolean;
    activation_code?: string;
}

export function LiveBookingsView() {
    const { user } = useAuth();
    const { photographers } = useConfig();
    const [bookings, setBookings] = useState<LiveBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVenues, setSelectedVenues] = useState<string[]>([]);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize notification sound
    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    }, []);

    const playNotificationSound = () => {
        if (soundEnabled && audioRef.current) {
            audioRef.current.play().catch(e => console.error('Error playing sound:', e));
        }
    };

    const loadBookings = async () => {
        setLoading(true);
        console.log('CRM: Loading bookings from table "live_bookings"...');
        try {
            const { data, error, status, statusText } = await (supabase as any)
                .from('live_bookings')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('CRM: Supabase Error loading bookings:', {
                    error,
                    status,
                    statusText,
                    table: 'live_bookings'
                });
                throw error;
            }
            console.log(`CRM: Successfully loaded ${data?.length || 0} bookings.`);
            setBookings(data || []);
        } catch (error: any) {
            console.error('CRM: Error in loadBookings:', error);
            toast.error('Failed to load bookings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBookings();

        // Subscribe to real-time changes
        const subscription = supabase
            .channel('live_bookings_changes')
            .on('postgres_changes' as any,
                { event: '*', schema: 'public', table: 'live_bookings' },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newBooking = payload.new as LiveBooking;
                        setBookings(prev => [newBooking, ...prev]);

                        // Notification alert
                        toast.info(`New booking at ${newBooking.venue_name}!`, {
                            description: `Table: ${newBooking.table_name || 'N/A'}`
                        });
                        playNotificationSound();
                    } else if (payload.eventType === 'UPDATE') {
                        const updatedBooking = payload.new as LiveBooking;
                        setBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
                    } else if (payload.eventType === 'DELETE') {
                        setBookings(prev => prev.filter(b => b.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const handleAction = async (bookingId: string, newStatus: LiveBooking['status'], additionalUpdates: any = {}) => {
        try {
            const updates: any = { ...additionalUpdates, status: newStatus, updated_at: new Date().toISOString() };
            if (newStatus === 'OPTED_IN') {
                updates.photographer_id = user?.id;
            }

            const { error } = await (supabase as any)
                .from('live_bookings')
                .update(updates)
                .eq('id', bookingId);

            if (error) throw error;
            toast.success(`Booking status updated to ${newStatus}`);
        } catch (error) {
            console.error('Error updating booking:', error);
            toast.error('Failed to update booking status');
        }
    };

    const handleUpdateDriveLink = async (bookingId: string, link: string) => {
        try {
            const { error } = await (supabase as any)
                .from('live_bookings')
                .update({ drive_link: link, updated_at: new Date().toISOString() })
                .eq('id', bookingId);

            if (error) throw error;
            toast.success('Drive link saved');
        } catch (error) {
            console.error('Error saving drive link:', error);
            toast.error('Failed to save drive link');
        }
    };

    const filteredBookings = bookings.filter(b =>
        selectedVenues.length === 0 || selectedVenues.includes(b.venue_name)
    );

    const venueOptions = Array.from(new Set([
        'Hole in the Wall Cafe Koramangala',
        'The Bier Library Koramangala',
        'Marco Polo Cafe',
        'Roastea Koramangala',
        'Garden Asia',
        ...bookings.map(b => b.venue_name)
    ])).map(name => ({
        label: name,
        value: name
    }));

    const getStatusBadge = (status: LiveBooking['status']) => {
        switch (status) {
            case 'PENDING': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
            case 'OPTED_IN': return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">Opted In</Badge>;
            case 'ARRIVED': return <Badge className="bg-purple-50 text-purple-700 border-purple-200">Arrived</Badge>;
            case 'PAID': return <Badge className="bg-green-100 text-green-800 border-green-300">Paid!</Badge>;
            case 'COMPLETED': return <Badge className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
            case 'CANCELLED': return <Badge variant="destructive">Cancelled</Badge>;
            case 'NOT_PAID': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Not Paid</Badge>;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-500 mb-1">Filter by Venue</span>
                        <div className="flex gap-2 flex-wrap">
                            {venueOptions.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        setSelectedVenues(prev =>
                                            prev.includes(option.value)
                                                ? prev.filter(v => v !== option.value)
                                                : [...prev, option.value]
                                        );
                                    }}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${selectedVenues.includes(option.value)
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                            {selectedVenues.length > 0 && (
                                <button
                                    onClick={() => setSelectedVenues([])}
                                    className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={soundEnabled ? 'text-blue-600' : 'text-gray-400'}
                    >
                        {soundEnabled ? <Bell size={18} /> : <BellOff size={18} />}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadBookings}
                        disabled={loading}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Reload
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Clock className="text-blue-500" size={20} />
                            Recent Live Requests
                        </CardTitle>
                        <Badge variant="outline" className="font-normal">
                            {filteredBookings.length} Active Bookings
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead className="w-[120px]">Time</TableHead>
                                <TableHead>Booking Name (ID)</TableHead>
                                <TableHead>Venue</TableHead>
                                <TableHead>Table</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBookings.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-gray-500">
                                        {loading ? 'Fetching bookings...' : 'No live requests found for selected cafes/pubs.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredBookings.map((booking) => (
                                    <TableRow
                                        key={booking.id}
                                        className={`hover:bg-gray-50/50 transition-colors ${booking.status === 'NOT_PAID' ? 'bg-red-50 hover:bg-red-50/80' :
                                            booking.status === 'PAID' ? 'bg-green-50/30 font-semibold' :
                                                booking.status === 'COMPLETED' ? 'bg-green-100/30' : ''
                                            }`}
                                    >
                                        <TableCell className="font-medium text-gray-600">
                                            {format(new Date(booking.created_at), 'hh:mm a')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit">
                                                        {booking.request_id}
                                                    </span>
                                                    {booking.activation_code ? (
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded border border-blue-200 uppercase" title="Photographer activation code">
                                                            Code: {booking.activation_code}
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-gray-50 text-gray-500 text-[10px] font-medium rounded border border-gray-100 italic" title="Legacy booking - use default venue code">
                                                            Code: Legacy
                                                        </span>
                                                    )}
                                                </div>
                                                {booking.hardcopy_filenames && (
                                                    <div className="text-[10px] text-gray-600 mt-1">
                                                        <span className="font-semibold">Print:</span> {booking.hardcopy_filenames}
                                                    </div>
                                                )}
                                                {booking.photographer_id && (
                                                    <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                                        <span className="font-semibold">Taken by:</span>
                                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                                                            {photographers.find(p => p.id === booking.photographer_id)?.name || 'Unknown'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={14} className="text-red-500" />
                                                    <span className="font-semibold">{booking.venue_name}</span>
                                                </div>
                                                {/* This is the original drive link input, kept as is */}
                                                {(booking.photographer_id === user?.id || user?.role === 'ADMIN') && (booking.status === 'OPTED_IN' || booking.status === 'ARRIVED' || booking.status === 'PAID' || booking.status === 'COMPLETED') && (
                                                    <div className="mt-2 flex gap-1">
                                                        <input
                                                            type="text"
                                                            placeholder="Drive Link..."
                                                            defaultValue={booking.drive_link || ''}
                                                            onBlur={(e) => handleUpdateDriveLink(booking.id, e.target.value)}
                                                            className={`text-[11px] px-2 py-1 border rounded w-full bg-white`}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                {booking.table_name ? (
                                                    <Badge variant="outline" className="font-mono text-xs">
                                                        {booking.table_name}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                                {getStatusBadge(booking.status)}
                                                {booking.hardcopy_filenames && !booking.hardcopy_resolved && (
                                                    <Badge className="bg-orange-100 text-orange-700 text-[9px] border-orange-200">
                                                        Pending Handover
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2 flex-wrap">
                                                {booking.status === 'PENDING' && (
                                                    <Button
                                                        size="sm"
                                                        variant="default"
                                                        className="bg-blue-600 hover:bg-blue-700 text-xs h-8 px-3"
                                                        onClick={() => handleAction(booking.id, 'OPTED_IN')}
                                                    >
                                                        <UserPlus size={14} className="mr-1" />
                                                        Opt-in
                                                    </Button>
                                                )}

                                                {(booking.status === 'OPTED_IN' || (booking.status === 'PENDING' && user?.role === 'ADMIN')) && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-xs h-8 px-3"
                                                        onClick={() => handleAction(booking.id, 'ARRIVED')}
                                                    >
                                                        <CheckCircle2 size={14} className="mr-1" />
                                                        Arrived
                                                    </Button>
                                                )}

                                                {(booking.status === 'PAID' || booking.status === 'ARRIVED') && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-green-600 border-green-600 hover:bg-green-50 text-xs h-8 px-3 font-bold bg-white"
                                                        onClick={() => handleAction(booking.id, 'COMPLETED', { hardcopy_resolved: true })}
                                                    >
                                                        <CheckCircle2 size={14} className="mr-1" />
                                                        {booking.hardcopy_filenames && !booking.hardcopy_resolved ? 'Handover Done?' : 'Resolved'}
                                                    </Button>
                                                )}

                                                {(booking.status === 'PENDING' || booking.status === 'OPTED_IN' || booking.status === 'ARRIVED') && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-red-500 border-red-200 hover:bg-red-50 text-xs h-8 px-3"
                                                        onClick={() => handleAction(booking.id, 'NOT_PAID')}
                                                    >
                                                        <Ban size={14} className="mr-1" />
                                                        Not Paid
                                                    </Button>
                                                )}

                                                {(booking.status !== 'CANCELLED' && user?.role === 'ADMIN') && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                                                        onClick={() => handleAction(booking.id, 'CANCELLED')}
                                                    >
                                                        <Ban size={14} />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div >
    );
}
