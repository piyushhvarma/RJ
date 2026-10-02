'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, X, Check, RefreshCw, AlertCircle, Video, Settings2 } from 'lucide-react';

export type PhotoCaptureTarget = 'customer' | 'jewellery' | 'general';

interface PhotoCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (photoDataUrl: string, angle?: string) => Promise<void> | void;
    title?: string;
    subtitle?: string;
    showAngleSelect?: boolean;
    defaultAngle?: string;
    captureTarget?: PhotoCaptureTarget;
}

const JEWELLERY_ANGLES = [
    { value: 'front', label: 'Front View' },
    { value: 'back', label: 'Back View' },
    { value: 'close_up', label: 'Close-up / Details' },
    { value: 'hallmark', label: 'Hallmark Stamp' },
    { value: 'packaging', label: 'Packaging / Pouch' },
];

export function PhotoCaptureModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Capture or Upload Photo',
    subtitle = 'Take a live snapshot with the camera or upload an image file from your device.',
    showAngleSelect = false,
    defaultAngle = 'front',
    captureTarget,
}: PhotoCaptureModalProps) {
    // Determine target (customer portrait vs jewellery ornament)
    const effectiveTarget: PhotoCaptureTarget =
        captureTarget ??
        (title.toLowerCase().includes('customer') || title.toLowerCase().includes('borrower')
            ? 'customer'
            : title.toLowerCase().includes('jewellery') ||
              title.toLowerCase().includes('ornament') ||
              title.toLowerCase().includes('item')
            ? 'jewellery'
            : 'general');

    const [mode, setMode] = useState<'camera' | 'upload'>('camera');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [angle, setAngle] = useState(defaultAngle);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);

    // Multi-camera device management
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [justSavedDefault, setJustSavedDefault] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setIsCameraActive(false);
    }, []);

    // Stop and start camera with specific deviceId
    const startCamera = useCallback(
        async (deviceIdToUse?: string) => {
            stopCamera();
            setCameraError(null);

            if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
                setCameraError('Webcam access is not supported by your browser environment.');
                return;
            }

            try {
                const constraints: MediaStreamConstraints = {
                    video: deviceIdToUse
                        ? {
                              deviceId: { exact: deviceIdToUse },
                              width: { ideal: 1280 },
                              height: { ideal: 720 },
                          }
                        : {
                              width: { ideal: 1280 },
                              height: { ideal: 720 },
                              facingMode: effectiveTarget === 'jewellery' ? 'environment' : 'user',
                          },
                    audio: false,
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                    setIsCameraActive(true);
                }

                // Query and enumerate available cameras after permission is granted
                const allDevices = await navigator.mediaDevices.enumerateDevices();
                const cameras = allDevices.filter((d) => d.kind === 'videoinput');
                setVideoDevices(cameras);

                // Identify the active track's deviceId
                const activeTrack = stream.getVideoTracks()[0];
                const activeSettings = activeTrack.getSettings();
                const activeId = activeSettings.deviceId || deviceIdToUse || cameras[0]?.deviceId;

                if (activeId && (!selectedDeviceId || deviceIdToUse)) {
                    setSelectedDeviceId(activeId);
                }
            } catch (err: any) {
                console.error('Camera stream error:', err);
                setCameraError(
                    err?.name === 'NotAllowedError'
                        ? 'Camera access permission denied. Please allow camera access in browser settings or use file upload.'
                        : err?.name === 'OverconstrainedError'
                        ? 'Selected camera device is not available. Please pick another camera or use file upload.'
                        : 'Could not connect to camera device. Please switch camera or upload file.'
                );
                setIsCameraActive(false);
            }
        },
        [stopCamera, effectiveTarget, selectedDeviceId]
    );

    // Initial camera resolution on modal open
    useEffect(() => {
        if (!isOpen || mode !== 'camera' || previewUrl) {
            stopCamera();
            return;
        }

        const initCamera = async () => {
            // Check localStorage for saved camera preference
            const savedCustomerCam = localStorage.getItem('preferred_camera_customer');
            const savedJewelleryCam = localStorage.getItem('preferred_camera_jewellery');

            let preferredId =
                effectiveTarget === 'customer'
                    ? savedCustomerCam
                    : effectiveTarget === 'jewellery'
                    ? savedJewelleryCam
                    : null;

            // Attempt enumerating devices first if permission was previously granted
            try {
                const allDevices = await navigator.mediaDevices.enumerateDevices();
                const cameras = allDevices.filter((d) => d.kind === 'videoinput');
                setVideoDevices(cameras);

                if (cameras.length > 0) {
                    // Check if preferredId exists among connected cameras
                    const exists = cameras.some((c) => c.deviceId === preferredId);
                    if (!exists) {
                        // Heuristic default:
                        // Customer photo -> front/integrated camera or first camera (Webcam A)
                        // Jewellery photo -> USB/external/macro camera or second camera (Webcam B)
                        if (effectiveTarget === 'jewellery' && cameras.length >= 2) {
                            const extCam = cameras.find(
                                (c) =>
                                    c.label.toLowerCase().includes('usb') ||
                                    c.label.toLowerCase().includes('external') ||
                                    c.label.toLowerCase().includes('back') ||
                                    c.label.toLowerCase().includes('rear')
                            );
                            preferredId = extCam ? extCam.deviceId : cameras[1].deviceId;
                        } else {
                            const frontCam = cameras.find(
                                (c) =>
                                    c.label.toLowerCase().includes('integrated') ||
                                    c.label.toLowerCase().includes('front') ||
                                    c.label.toLowerCase().includes('face')
                            );
                            preferredId = frontCam ? frontCam.deviceId : cameras[0].deviceId;
                        }
                    }
                }
            } catch (e) {
                console.warn('Could not pre-enumerate devices before stream:', e);
            }

            if (preferredId) {
                setSelectedDeviceId(preferredId);
                await startCamera(preferredId);
            } else {
                await startCamera();
            }
        };

        initCamera();

        return () => {
            stopCamera();
        };
    }, [isOpen, mode, previewUrl, effectiveTarget]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSwitchCamera = async (newDeviceId: string) => {
        setSelectedDeviceId(newDeviceId);
        // Persist preference for this specific photo target
        if (effectiveTarget === 'customer') {
            localStorage.setItem('preferred_camera_customer', newDeviceId);
        } else if (effectiveTarget === 'jewellery') {
            localStorage.setItem('preferred_camera_jewellery', newDeviceId);
        }
        setJustSavedDefault(true);
        setTimeout(() => setJustSavedDefault(false), 3000);

        await startCamera(newDeviceId);
    };

    if (!isOpen) return null;

    const handleClose = () => {
        stopCamera();
        setPreviewUrl(null);
        setCameraError(null);
        onClose();
    };

    const handleCaptureSnapshot = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        const maxDim = 1200;
        let width = video.videoWidth || 640;
        let height = video.videoHeight || 480;

        if (width > maxDim || height > maxDim) {
            if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
            } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
            }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
            setPreviewUrl(dataUrl);
            stopCamera();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxDim = 1200;
                let width = img.width;
                let height = img.height;

                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressed = canvas.toDataURL('image/jpeg', 0.88);
                    setPreviewUrl(compressed);
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleRetake = () => {
        setPreviewUrl(null);
        if (mode === 'camera') {
            startCamera(selectedDeviceId);
        }
    };

    const handleSave = async () => {
        if (!previewUrl) return;
        try {
            setIsSaving(true);
            await onConfirm(previewUrl, showAngleSelect ? angle : undefined);
            handleClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-gray-900">{title}</h3>
                            <span
                                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                    effectiveTarget === 'customer'
                                        ? 'bg-blue-100 text-blue-800'
                                        : effectiveTarget === 'jewellery'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-gray-100 text-gray-700'
                                }`}
                            >
                                {effectiveTarget === 'customer'
                                    ? 'Customer Camera'
                                    : effectiveTarget === 'jewellery'
                                    ? 'Jewellery Macro Cam'
                                    : 'Photo Capture'}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto">
                    {/* Mode Selector Tabs */}
                    {!previewUrl && (
                        <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-xl">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('camera');
                                    setCameraError(null);
                                    startCamera(selectedDeviceId);
                                }}
                                className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                                    mode === 'camera'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                <Camera className="w-4 h-4" /> Live Camera
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('upload');
                                    stopCamera();
                                }}
                                className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                                    mode === 'upload'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                <Upload className="w-4 h-4" /> Upload File
                            </button>
                        </div>
                    )}

                    {/* Camera Device Selector Dropdown & Quick Toggles */}
                    {!previewUrl && mode === 'camera' && (
                        <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                    <Video className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Active Camera Device</span>
                                </label>
                                {justSavedDefault && (
                                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 animate-fade-in flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Saved as default for {effectiveTarget}
                                    </span>
                                )}
                            </div>

                            {/* Dropdown for selecting any connected camera */}
                            <select
                                value={selectedDeviceId}
                                onChange={(e) => handleSwitchCamera(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                                {videoDevices.length > 0 ? (
                                    videoDevices.map((device, idx) => (
                                        <option key={device.deviceId || idx} value={device.deviceId}>
                                            {device.label || `Camera ${idx + 1} (${device.deviceId.slice(0, 8)}…)`}
                                            {device.deviceId === selectedDeviceId ? ' — [Active]' : ''}
                                        </option>
                                    ))
                                ) : (
                                    <option value="">Default System Webcam</option>
                                )}
                            </select>

                            {/* Quick Switcher Buttons if 2 or more cameras detected */}
                            {videoDevices.length >= 2 && (
                                <div className="pt-1 flex items-center gap-2">
                                    <span className="text-[10px] font-medium text-gray-400">Quick Switch:</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const dev = videoDevices[0]?.deviceId;
                                            if (dev) handleSwitchCamera(dev);
                                        }}
                                        className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 border ${
                                            selectedDeviceId === videoDevices[0]?.deviceId
                                                ? 'bg-amber-100 border-amber-300 text-amber-900'
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        <span>👤 Webcam A (Customer)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const dev = videoDevices[1]?.deviceId;
                                            if (dev) handleSwitchCamera(dev);
                                        }}
                                        className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 border ${
                                            selectedDeviceId === videoDevices[1]?.deviceId
                                                ? 'bg-amber-100 border-amber-300 text-amber-900'
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        <span>💍 Webcam B (Jewellery)</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Angle Selection (if enabled for jewellery) */}
                    {showAngleSelect && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                                Photo Angle / Perspective
                            </label>
                            <select
                                value={angle}
                                onChange={(e) => setAngle(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                            >
                                {JEWELLERY_ANGLES.map((a) => (
                                    <option key={a.value} value={a.value}>
                                        {a.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Main Content Area */}
                    {previewUrl ? (
                        /* Preview Confirmation State */
                        <div className="space-y-3">
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-gray-200 shadow-inner flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={previewUrl}
                                    alt="Captured snapshot"
                                    className="max-h-full max-w-full object-contain"
                                />
                                <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white rounded text-[11px] font-medium backdrop-blur-xs">
                                    Snapshot Preview
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleRetake}
                                    disabled={isSaving}
                                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <RefreshCw className="w-4 h-4" /> Retake
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex-2 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-white hover:bg-amber-600 shadow-sm transition-colors disabled:opacity-50"
                                >
                                    <Check className="w-4 h-4" /> {isSaving ? 'Attaching…' : 'Confirm & Save Photo'}
                                </button>
                            </div>
                        </div>
                    ) : mode === 'camera' ? (
                        /* Live Camera View */
                        <div className="space-y-3">
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900 border border-gray-200 flex items-center justify-center">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
                                />
                                {!isCameraActive && !cameraError && (
                                    <div className="flex flex-col items-center gap-2 text-gray-400 text-xs">
                                        <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                                        <span>Connecting to selected camera…</span>
                                    </div>
                                )}
                                {cameraError && (
                                    <div className="p-6 text-center text-red-200 space-y-2">
                                        <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                                        <p className="text-xs text-red-300 font-medium">{cameraError}</p>
                                        <button
                                            type="button"
                                            onClick={() => setMode('upload')}
                                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
                                        >
                                            <Upload className="w-3.5 h-3.5" /> Switch to File Upload
                                        </button>
                                    </div>
                                )}
                            </div>

                            {isCameraActive && (
                                <button
                                    type="button"
                                    onClick={handleCaptureSnapshot}
                                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-white hover:bg-amber-600 shadow-sm transition-all"
                                >
                                    <Camera className="w-4 h-4" /> Capture Snapshot
                                </button>
                            )}
                        </div>
                    ) : (
                        /* Upload File View */
                        <div className="space-y-3">
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-300 hover:border-amber-400 hover:bg-amber-50/40 transition-all rounded-xl p-8 text-center cursor-pointer flex flex-col items-center justify-center gap-2"
                            >
                                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-semibold text-gray-800">
                                    Click to select image file
                                </p>
                                <p className="text-xs text-gray-500">
                                    Supports JPG, PNG, WEBP from your camera roll or computer
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
