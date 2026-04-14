import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Settings, Info, CheckCircle2, ChevronRight, Smartphone, Globe, AlertTriangle, Bell, MessageSquare } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { checkGeolocationPermission, getCurrentPosition } from '../lib/geofence';
import { useAuth } from '../context/AuthContext';
import { createLogEvent } from '../lib/db/logs';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';

export function GPSPermissionPrompt() {
    const { user } = useAuth();
    const [permissionState, setPermissionState] = useState<PermissionState | 'unsupported'>('prompt');
    const [notifState, setNotifState] = useState<NotificationPermission>('default');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [hasConfirmedAlways, setHasConfirmedAlways] = useState(false);
    const [hasConfirmedNotifs, setHasConfirmedNotifs] = useState(false);

    // Track last state to detect changes during focus events or checks
    const lastStateRef = useRef<PermissionState | 'unsupported' | 'unknown'>('unknown');

    // Check permission status
    const updatePermissionStatus = async () => {
        if (!navigator.geolocation) {
            setPermissionState('unsupported');
            setIsOpen(true);
            return;
        }

        const state = await checkGeolocationPermission();
        const currentNotifState = Notification.permission;

        // LOGGING LOGIC: Detect transitions
        if (user && lastStateRef.current !== 'unknown') {
            const lastState = lastStateRef.current as any;
            
            // GPS Change
            if (lastState.gps !== state) {
                const { createLogEvent } = await import('../lib/db/logs');
                await createLogEvent({
                    type: 'GPS_STATUS_CHANGE',
                    actor_user_id: user.id,
                    target_id: user.id,
                    metadata: { action: state === 'granted' ? 'ON' : 'OFF', photographer_name: user.name }
                });
            }

            // Notif Change
            if (lastState.notification !== currentNotifState) {
                const { createLogEvent } = await import('../lib/db/logs');
                await createLogEvent({
                    type: 'NOTIFICATION_STATUS_CHANGE',
                    actor_user_id: user.id,
                    target_id: user.id,
                    metadata: { action: currentNotifState === 'granted' ? 'ON' : 'OFF', photographer_name: user.name }
                });
            }
        }

        lastStateRef.current = { gps: state, notification: currentNotifState } as any;
        setPermissionState(state);
        setNotifState(currentNotifState);

        // If any permission is not granted, show the modal
        if (state !== 'granted' || currentNotifState !== 'granted') {
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        updatePermissionStatus();

        // Re-check when the window gains focus (e.g., after user changes settings in another tab)
        window.addEventListener('focus', updatePermissionStatus);
        return () => window.removeEventListener('focus', updatePermissionStatus);
    }, [user]);

    const handleGrantAccess = async () => {
        setIsVerifying(true);
        try {
            // 1. Request GPS
            if (permissionState !== 'granted') {
                await getCurrentPosition();
            }
            
            // 2. Request Notifications
            if (notifState !== 'granted') {
                await Notification.requestPermission();
            }

            await updatePermissionStatus();
        } catch (error) {
            console.error('Failed to grant permissions:', error);
            await updatePermissionStatus();
        } finally {
            setIsVerifying(false);
        }
    };

    if (permissionState === 'granted' && notifState === 'granted') return null;

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent hideCloseButton className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="h-6 w-6 text-blue-600" />
                    </div>
                    <DialogTitle className="text-center text-xl font-bold">Action Required: Enable Permissions</DialogTitle>
                    <DialogDescription className="text-center pt-2 text-gray-700">
                        To receive geofence alerts and verify your location, you must enable <span className="font-bold text-blue-700 underline">GPS (Always)</span> and <span className="font-bold text-blue-700 underline">Floating Notifications</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800">
                            <strong>"While Using" is not enough.</strong> We must check your distance 15 minutes before your scheduled timing, even if you are not currently using the website.
                        </p>
                    </div>

                    <div className="space-y-4 border rounded-lg p-3 bg-gray-50">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Bell className="h-4 w-4 text-blue-600" /> 1. Enable Floating Notifications
                        </h4>
                        <img 
                            src="/floating_notifications.png" 
                            alt="Floating Notifications Setting" 
                            className="rounded-lg shadow-sm border border-gray-200 mb-2 w-full max-h-[200px] object-cover"
                        />
                        <p className="text-xs text-gray-600 mb-2">
                            Go to <strong>Settings &gt; Notifications &gt; Floating Notifications</strong> and ensure it's enabled for your browser.
                        </p>
                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id="confirmed-notifs"
                                checked={hasConfirmedNotifs}
                                onCheckedChange={(checked) => setHasConfirmedNotifs(checked as boolean)}
                                className="mt-1"
                            />
                            <Label htmlFor="confirmed-notifs" className="text-sm">
                                I have enabled Floating Notifications
                            </Label>
                        </div>
                    </div>

                    <div className="space-y-4 border rounded-lg p-3 bg-gray-50">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-blue-600" /> 2. Set GPS to "Always Allow"
                        </h4>
                        <Tabs defaultValue="android" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-2">
                                <TabsTrigger value="android">Android</TabsTrigger>
                                <TabsTrigger value="ios">iOS</TabsTrigger>
                            </TabsList>
                            <TabsContent value="android" className="text-xs space-y-1 text-gray-600">
                                <p>Settings &gt; Apps &gt; Browser &gt; Permissions &gt; Location &gt; <strong>Allow all the time</strong></p>
                            </TabsContent>
                            <TabsContent value="ios" className="text-xs space-y-1 text-gray-600">
                                <p>Settings &gt; Privacy &gt; Location Services &gt; Browser &gt; <strong>Always</strong></p>
                            </TabsContent>
                        </Tabs>
                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id="confirmed-always"
                                checked={hasConfirmedAlways}
                                onCheckedChange={(checked) => setHasConfirmedAlways(checked as boolean)}
                                className="mt-1"
                            />
                            <Label htmlFor="confirmed-always" className="text-sm">
                                I have set Location to "Always Allow"
                            </Label>
                        </div>
                    </div>
                </div>

                <DialogFooter className="sm:justify-center mt-4 pt-4 border-t">
                    {permissionState === 'denied' || notifState === 'denied' ? (
                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg font-bold shadow-lg"
                            onClick={() => window.location.reload()}
                        >
                            I've Updated Settings - Reload
                        </Button>
                    ) : (
                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg font-bold shadow-lg"
                            onClick={handleGrantAccess}
                            disabled={isVerifying || !hasConfirmedAlways || !hasConfirmedNotifs}
                        >
                            {isVerifying ? 'Checking...' : 'Grant Access & Continue'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
