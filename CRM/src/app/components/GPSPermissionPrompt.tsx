import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Settings, Info, CheckCircle2, ChevronRight, Smartphone, Globe, AlertTriangle } from 'lucide-react';
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
    const [isVerifying, setIsVerifying] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [hasConfirmedAlways, setHasConfirmedAlways] = useState(false);

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

        // LOGGING LOGIC: Detect transitions
        if (user && lastStateRef.current !== 'unknown' && lastStateRef.current !== state) {
            // Transition to 'granted' -> ON
            if (state === 'granted' && lastStateRef.current !== 'granted') {
                console.log('📡 GPS Logging: ON detected');
                createLogEvent({
                    type: 'GPS_PERMISSION_CHANGE',
                    actor_user_id: user.id,
                    target_id: user.id,
                    metadata: {
                        action: 'ON',
                        photographer_name: user.name,
                        timestamp: new Date().toISOString()
                    }
                });
            }
            // Transition from 'granted' to anything else -> OFF
            else if (lastStateRef.current === 'granted' && state !== 'granted') {
                console.log('📡 GPS Logging: OFF detected');
                createLogEvent({
                    type: 'GPS_PERMISSION_CHANGE',
                    actor_user_id: user.id,
                    target_id: user.id,
                    metadata: {
                        action: 'OFF',
                        photographer_name: user.name,
                        timestamp: new Date().toISOString()
                    }
                });
            }
        }

        lastStateRef.current = state;
        setPermissionState(state);

        // If permission is denied or prompt is needed, show the modal
        if (state !== 'granted') {
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
            // Trigger the native prompt
            await getCurrentPosition();
            await updatePermissionStatus();
        } catch (error) {
            console.error('Failed to get position/permission:', error);
            await updatePermissionStatus();
        } finally {
            setIsVerifying(false);
        }
    };

    if (permissionState === 'granted') return null;

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent hideCloseButton className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <MapPin className="h-6 w-6 text-blue-600" />
                    </div>
                    <DialogTitle className="text-center text-xl font-bold">Action Required: GPS "Always Allow"</DialogTitle>
                    <DialogDescription className="text-center pt-2 text-gray-700">
                        To verify your location for early morning deliveries, your browser needs <span className="font-bold text-blue-700 underline">"Always Allow"</span> location access.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800">
                            <strong>"While Using" is not enough.</strong> We must check your distance 15 minutes before your scheduled timing, even if you are not currently using the website.
                        </p>
                    </div>

                    <div className="border rounded-lg p-3">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Settings className="h-4 w-4" /> How to set to "Always":
                        </h4>

                        <Tabs defaultValue="android" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="android" className="flex items-center gap-2">
                                    <Smartphone className="h-4 w-4" /> Android
                                </TabsTrigger>
                                <TabsTrigger value="ios" className="flex items-center gap-2">
                                    <Globe className="h-4 w-4" /> iOS (iPhone)
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="android" className="text-sm space-y-2 text-gray-600 bg-gray-50 p-3 rounded-md">
                                <p className="flex items-center gap-2"><span className="bg-blue-100 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">1</span> Open <strong>Settings</strong> &gt; <strong>Apps</strong></p>
                                <p className="flex items-center gap-2"><span className="bg-blue-100 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">2</span> Find & Select <strong>Chrome</strong> (or your browser)</p>
                                <p className="flex items-center gap-2"><span className="bg-blue-100 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">3</span> Tap <strong>Permissions</strong> &gt; <strong>Location</strong></p>
                                <p className="flex items-center gap-2 font-bold text-blue-800"><span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">4</span> Select "Allow all the time"</p>
                            </TabsContent>
                            <TabsContent value="ios" className="text-sm space-y-2 text-gray-600 bg-gray-50 p-3 rounded-md">
                                <p className="flex items-center gap-2"><span className="bg-blue-100 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">1</span> Open <strong>Settings</strong> &gt; Privacy &gt; Location Services</p>
                                <p className="flex items-center gap-2"><span className="bg-blue-100 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">2</span> Find & Select <strong>Chrome</strong> (or your browser)</p>
                                <p className="flex items-center gap-2"><span className="bg-blue-100 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">3</span> Set to <strong className="text-blue-800">"Always"</strong></p>
                                <p className="text-xs italic mt-2 text-gray-500">Note: Ensure "Precise Location" is also turned ON.</p>
                            </TabsContent>
                        </Tabs>
                    </div>

                    <div className="flex items-start space-x-3 pt-2">
                        <Checkbox
                            id="confirmed-always"
                            checked={hasConfirmedAlways}
                            onCheckedChange={(checked) => setHasConfirmedAlways(checked as boolean)}
                            className="mt-1"
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label
                                htmlFor="confirmed-always"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                I have updated my phone settings to "Always Allow"
                            </Label>
                            <p className="text-xs text-gray-500">
                                This ensures I receive geofence alerts on time.
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="sm:justify-center mt-4 pt-4 border-t">
                    {permissionState === 'denied' ? (
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
                            disabled={isVerifying || !hasConfirmedAlways}
                        >
                            {isVerifying ? 'Checking...' : 'Grant Access & Continue'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
