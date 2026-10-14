'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, Check, PenTool, Maximize2, Minimize2, Tablet } from 'lucide-react';

interface SignaturePadProps {
    value?: string | null;
    onChange: (signatureDataUrl: string | null) => void;
    label?: string;
    height?: number;
    allowFullscreen?: boolean;
}

interface Point {
    x: number;
    y: number;
    pressure?: number;
}

export function SignaturePad({
    value,
    onChange,
    label = 'Customer Digital Signature',
    height = 140,
    allowFullscreen = true,
}: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fullscreenCanvasRef = useRef<HTMLCanvasElement>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Track points for Bézier curve smoothing
    const lastPointRef = useRef<Point | null>(null);

    // Draw an existing base64 signature image onto canvas
    const drawExistingValue = useCallback((canvas: HTMLCanvasElement, dataUrl: string) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();

        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, rect.width, rect.height);
            // Draw image centered and scaled maintaining aspect ratio
            const scale = Math.min(rect.width / img.width, rect.height / img.height) * 0.9;
            const x = (rect.width - img.width * scale) / 2;
            const y = (rect.height - img.height * scale) / 2;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            setHasDrawn(true);
        };
        img.src = dataUrl;
    }, []);

    // Initialize Canvas with proper High-DPI scaling
    const initCanvas = useCallback(
        (canvas: HTMLCanvasElement | null, targetHeight: number) => {
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const rect = canvas.getBoundingClientRect();
            const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

            canvas.width = rect.width * dpr;
            canvas.height = targetHeight * dpr;

            ctx.scale(dpr, dpr);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = '#0f172a'; // Deep slate ink
            ctx.lineWidth = 2.4;

            if (value) {
                drawExistingValue(canvas, value);
            } else {
                ctx.clearRect(0, 0, rect.width, targetHeight);
                setHasDrawn(false);
            }
        },
        [value, drawExistingValue]
    );

    useEffect(() => {
        initCanvas(canvasRef.current, height);
    }, [initCanvas, height]);

    useEffect(() => {
        if (isFullscreen) {
            // Re-init full screen canvas when opened
            setTimeout(() => {
                initCanvas(fullscreenCanvasRef.current, 360);
            }, 100);
        }
    }, [isFullscreen, initCanvas]);

    // Compute pointer coordinates relative to active canvas
    const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement): Point => {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            pressure: e.pressure > 0 ? e.pressure : 0.5,
        };
    };

    const handlePointerDown = (
        e: React.PointerEvent<HTMLCanvasElement>,
        canvas: HTMLCanvasElement | null
    ) => {
        if (!canvas) return;
        // Capture pointer to track outside canvas
        canvas.setPointerCapture(e.pointerId);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const point = getCoordinates(e, canvas);
        lastPointRef.current = point;
        setIsDrawing(true);

        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
    };

    const handlePointerMove = (
        e: React.PointerEvent<HTMLCanvasElement>,
        canvas: HTMLCanvasElement | null
    ) => {
        if (!isDrawing || !canvas || !lastPointRef.current) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const currentPoint = getCoordinates(e, canvas);
        const lastPoint = lastPointRef.current;

        // Quadratic curve smoothing between midpoint and current
        const midPoint = {
            x: (lastPoint.x + currentPoint.x) / 2,
            y: (lastPoint.y + currentPoint.y) / 2,
        };

        // Subtle pressure variation (2.0px to 3.2px)
        const pressureWeight = currentPoint.pressure ? 1.8 + currentPoint.pressure * 1.5 : 2.4;
        ctx.lineWidth = pressureWeight;

        ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midPoint.x, midPoint.y);
        ctx.stroke();

        lastPointRef.current = currentPoint;
        setHasDrawn(true);
    };

    const handlePointerUp = (
        e: React.PointerEvent<HTMLCanvasElement>,
        canvas: HTMLCanvasElement | null
    ) => {
        if (!isDrawing || !canvas) return;
        try {
            canvas.releasePointerCapture(e.pointerId);
        } catch {
            // Ignore if pointer capture was already released
        }

        setIsDrawing(false);
        lastPointRef.current = null;

        // Export as clean transparent PNG
        const dataUrl = canvas.toDataURL('image/png');
        onChange(dataUrl);
    };

    const clearCanvas = (canvas: HTMLCanvasElement | null, targetHeight: number) => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, targetHeight);
        setHasDrawn(false);
        onChange(null);
    };

    return (
        <div className="space-y-2">
            {/* Header / Controls */}
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-amber-600" />
                    <span>{label}</span>
                </span>

                <div className="flex items-center gap-2">
                    {hasDrawn && (
                        <button
                            type="button"
                            onClick={() => clearCanvas(canvasRef.current, height)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 transition-colors"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Clear Pad
                        </button>
                    )}

                    {allowFullscreen && (
                        <button
                            type="button"
                            onClick={() => setIsFullscreen(true)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 transition-colors"
                            title="Open large full-screen signature pad for tablet/counter use"
                        >
                            <Tablet className="w-3 h-3" />
                            Tablet Mode
                        </button>
                    )}
                </div>
            </div>

            {/* Standard Embedded Canvas */}
            <div className="relative rounded-xl border-2 border-dashed border-gray-300 bg-white overflow-hidden shadow-inner hover:border-amber-400 transition-colors">
                <canvas
                    ref={canvasRef}
                    style={{ height: `${height}px`, touchAction: 'none' }}
                    className="w-full cursor-crosshair block select-none"
                    onPointerDown={(e) => handlePointerDown(e, canvasRef.current)}
                    onPointerMove={(e) => handlePointerMove(e, canvasRef.current)}
                    onPointerUp={(e) => handlePointerUp(e, canvasRef.current)}
                    onPointerCancel={(e) => handlePointerUp(e, canvasRef.current)}
                />

                {!hasDrawn && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-xs text-gray-400 font-medium space-y-1">
                        <span>Sign here with stylus, finger, or mouse</span>
                        <span className="text-[10px] text-gray-300">
                            HTML5 Browser Canvas • Works with any ₹3,000 tablet • No vendor lock-in
                        </span>
                    </div>
                )}

                {/* Subtle base baseline indicator */}
                <div className="pointer-events-none absolute bottom-5 left-8 right-8 border-b border-gray-200/80 flex justify-between text-[9px] text-gray-300 uppercase tracking-widest pb-0.5">
                    <span>Borrower Signature Line</span>
                    <span>Sign Above</span>
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────────
                FULL SCREEN TABLET MODAL (FOR COUNTER / CUSTOMER-FACING TABLETS)
            ───────────────────────────────────────────────────────────────── */}
            {isFullscreen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-amber-500/10">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                                    <Tablet className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900">
                                        Customer Signature Tablet Pad
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        Hand tablet to borrower to sign with finger or standard capacitive stylus
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsFullscreen(false)}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                                <Minimize2 className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Large Tablet Canvas */}
                        <div className="p-6 space-y-4">
                            <div className="relative rounded-2xl border-2 border-dashed border-amber-300 bg-white shadow-inner overflow-hidden">
                                <canvas
                                    ref={fullscreenCanvasRef}
                                    style={{ height: '340px', touchAction: 'none' }}
                                    className="w-full cursor-crosshair block select-none"
                                    onPointerDown={(e) => handlePointerDown(e, fullscreenCanvasRef.current)}
                                    onPointerMove={(e) => handlePointerMove(e, fullscreenCanvasRef.current)}
                                    onPointerUp={(e) => handlePointerUp(e, fullscreenCanvasRef.current)}
                                    onPointerCancel={(e) => handlePointerUp(e, fullscreenCanvasRef.current)}
                                />

                                {!hasDrawn && (
                                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-sm text-gray-400 font-medium">
                                        <span>Please sign your full legal signature inside this box</span>
                                    </div>
                                )}

                                <div className="pointer-events-none absolute bottom-8 left-12 right-12 border-b-2 border-gray-300 flex justify-between text-xs text-gray-400 uppercase tracking-widest pb-1 font-semibold">
                                    <span>Borrower Signature</span>
                                    <span>X</span>
                                </div>
                            </div>

                            {/* Tablet Actions */}
                            <div className="flex items-center justify-between gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => clearCanvas(fullscreenCanvasRef.current, 360)}
                                    className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors flex items-center gap-1.5"
                                >
                                    <RotateCcw className="w-4 h-4 text-gray-500" />
                                    Clear & Sign Again
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsFullscreen(false);
                                        // Sync back to embedded canvas
                                        if (value && canvasRef.current) {
                                            drawExistingValue(canvasRef.current, value);
                                        }
                                    }}
                                    className="px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-2"
                                >
                                    <Check className="w-4 h-4" />
                                    Confirm Signature & Return
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
