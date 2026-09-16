'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, Check, PenTool } from 'lucide-react';

interface SignaturePadProps {
    value?: string | null;
    onChange: (signatureDataUrl: string | null) => void;
    label?: string;
    height?: number;
}

export function SignaturePad({
    value,
    onChange,
    label = 'Customer Digital Signature',
    height = 140,
}: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    // Initialize Canvas with proper high-DPI scaling
    const initCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        canvas.width = rect.width * dpr;
        canvas.height = height * dpr;

        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#0f172a'; // slate-900 ink
        ctx.lineWidth = 2.2;

        // If an existing value (base64) was provided, draw it
        if (value) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, rect.width, height);
                setHasDrawn(true);
            };
            img.src = value;
        } else {
            ctx.clearRect(0, 0, rect.width, height);
            setHasDrawn(false);
        }
    }, [height, value]);

    useEffect(() => {
        initCanvas();
    }, [initCanvas]);

    const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        let clientX = 0;
        let clientY = 0;

        if ('touches' in e && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if ('clientX' in e) {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e) {
            // Prevent page scroll while drawing
            e.preventDefault();
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCanvasCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        if ('touches' in e) {
            e.preventDefault();
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCanvasCoordinates(e);
        ctx.lineTo(x, y);
        ctx.stroke();
        setHasDrawn(true);
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            const dataUrl = canvas.toDataURL('image/png');
            onChange(dataUrl);
        }
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, height);
        setHasDrawn(false);
        onChange(null);
    };

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-amber-600" />
                    {label}
                </span>
                {hasDrawn && (
                    <button
                        type="button"
                        onClick={clearCanvas}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 hover:text-red-700 transition-colors"
                    >
                        <RotateCcw className="w-3 h-3" />
                        Clear Pad
                    </button>
                )}
            </div>

            <div className="relative rounded-lg border-2 border-dashed border-gray-300 bg-white overflow-hidden shadow-inner hover:border-amber-400 transition-colors">
                <canvas
                    ref={canvasRef}
                    style={{ height: `${height}px`, touchAction: 'none' }}
                    className="w-full cursor-crosshair block"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />

                {!hasDrawn && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-gray-400 font-medium">
                        Sign here with stylus, finger, or mouse
                    </div>
                )}
            </div>
        </div>
    );
}
