'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, X, Check, RefreshCw, AlertCircle } from 'lucide-react';

interface PhotoCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (photoDataUrl: string, angle?: string) => Promise<void> | void;
    title?: string;
    subtitle?: string;
    showAngleSelect?: boolean;
    defaultAngle?: string;
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
}: PhotoCaptureModalProps) {
    const [mode, setMode] = useState<'camera' | 'upload'>('camera');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [angle, setAngle] = useState(defaultAngle);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);

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

    const startCamera = useCallback(async () => {
        stopCamera();
        setCameraError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'environment',
                },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setIsCameraActive(true);
            }
        } catch (err: any) {
            setCameraError(
                err?.name === 'NotAllowedError'
                    ? 'Camera access permission denied. Please allow camera access in browser settings or use file upload.'
                    : 'Could not connect to camera device. Please switch to file upload.'
            );
            setIsCameraActive(false);
        }
    }, [stopCamera]);

    useEffect(() => {
        if (isOpen && mode === 'camera' && !previewUrl) {
            startCamera();
        } else {
            stopCamera();
        }

        return () => {
            stopCamera();
        };
    }, [isOpen, mode, previewUrl, startCamera, stopCamera]);

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
        const maxDim = 1024;
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
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
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
                    const compressed = canvas.toDataURL('image/jpeg', 0.85);
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
            startCamera();
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
                    <div>
                        <h3 className="text-base font-bold text-gray-900">{title}</h3>
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
                    {/* Mode Selector Tabs (if not showing captured preview) */}
                    {!previewUrl && (
                        <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-xl">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('camera');
                                    setCameraError(null);
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
                                        <span>Initializing camera…</span>
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
