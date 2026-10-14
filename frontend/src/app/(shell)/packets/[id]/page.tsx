'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPacket, storePacket, retrievePacket, releasePacket } from '@/lib/api/packets';
import { PacketStatusBadge } from '@/components/shared/StatusBadge';
import { RoleGate } from '@/components/shared/RoleGate';
import { ArrowLeft, MapPin, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useState } from 'react';

export default function PacketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const qc = useQueryClient();
    const [error, setError] = useState<string | null>(null);
    const [storeOpen, setStoreOpen] = useState(false);
    const [safe, setSafe] = useState('');
    const [locker, setLocker] = useState('');
    const [shelf, setShelf] = useState('');
    const [position, setPosition] = useState('');
    const [retrieveReason, setRetrieveReason] = useState('');

    const { data: packet, isLoading } = useQuery({
        queryKey: ['packet', id],
        queryFn: () => getPacket(id),
    });

    const storeMut = useMutation({
        mutationFn: () => storePacket(id, { safe, locker, shelf, position }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['packet', id] }); setStoreOpen(false); },
        onError: (e: Error) => setError(e.message),
    });

    const retrieveMut = useMutation({
        mutationFn: () => retrievePacket(id, retrieveReason),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['packet', id] }),
        onError: (e: Error) => setError(e.message),
    });

    const releaseMut = useMutation({
        mutationFn: () => releasePacket(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['packet', id] }),
        onError: (e: Error) => setError(e.message),
    });

    const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent';

    if (isLoading) return <div className="p-8"><div className="h-64 bg-gray-100 rounded-xl animate-pulse" /></div>;
    if (!packet) return <div className="p-8 text-sm text-red-700">Packet not found.</div>;

    const preview = safe && locker && shelf && position ? `${safe}-L${locker}-S${shelf}-P${position}` : '—';

    return (
        <div className="p-8 max-w-3xl mx-auto space-y-6">
            <Link href="/packets" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                All Packets
            </Link>

            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">{packet.packetCode}</h1>
                        <Link href={`/loans/${packet.loanId}`} className="text-sm text-amber-600 hover:text-amber-700 mt-0.5 block">
                            View Loan →
                        </Link>
                    </div>
                    <PacketStatusBadge status={packet.status} />
                </div>

                {packet.storageLocation && (
                    <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                        <MapPin className="w-4 h-4 text-green-600" />
                        <div>
                            <p className="text-sm font-semibold text-green-800 font-mono">{packet.storageLocation.label}</p>
                            <p className="text-xs text-green-700">
                                {packet.storageLocation.branch} · Safe {packet.storageLocation.safe} · Locker {packet.storageLocation.locker}
                            </p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-2">
                    <RoleGate roles={['OWNER', 'MANAGER', 'STAFF']}>
                        {(packet.status === 'CREATED' || packet.status === 'SEALED') && (
                            <button onClick={() => setStoreOpen(s => !s)}
                                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors">
                                Assign Storage Location
                            </button>
                        )}
                    </RoleGate>
                    <RoleGate roles={['OWNER', 'MANAGER']}>
                        {packet.status === 'STORED' && (
                            <button
                                onClick={() => { setError(null); retrieveMut.mutate(); }}
                                disabled={retrieveMut.isPending || !retrieveReason}
                                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
                            >
                                {retrieveMut.isPending ? 'Retrieving…' : 'Retrieve for Closure'}
                            </button>
                        )}
                        {(packet.status === 'IN_CLOSURE_PROCESS' || packet.status === 'RETRIEVED') && (
                            <button
                                onClick={() => { setError(null); releaseMut.mutate(); }}
                                disabled={releaseMut.isPending}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                                {releaseMut.isPending ? 'Releasing…' : 'Release Gold'}
                            </button>
                        )}
                    </RoleGate>
                </div>

                {/* Retrieve reason input */}
                {packet.status === 'STORED' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason for retrieval (required before retrieving)</label>
                        <input type="text" value={retrieveReason} onChange={e => setRetrieveReason(e.target.value)}
                            className={inputCls} placeholder="e.g. Loan closure — customer request" />
                    </div>
                )}

                {/* Store form */}
                {storeOpen && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
                        <p className="text-sm font-semibold text-gray-800">Assign Storage Location</p>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Safe *', val: safe, set: setSafe, ph: 'SAFE01' },
                                { label: 'Locker *', val: locker, set: setLocker, ph: 'L03' },
                                { label: 'Shelf *', val: shelf, set: setShelf, ph: 'S12' },
                                { label: 'Position *', val: position, set: setPosition, ph: 'P07' },
                            ].map(({ label, val, set, ph }) => (
                                <div key={label}>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                                    <input type="text" placeholder={ph} value={val} onChange={e => set(e.target.value)} className={inputCls} />
                                </div>
                            ))}
                        </div>
                        <div className="rounded-lg bg-white border border-gray-200 px-4 py-2 flex justify-between items-center">
                            <span className="text-xs text-gray-500">Location label:</span>
                            <span className="font-mono text-sm font-semibold text-gray-900">{preview}</span>
                        </div>
                        <button
                            onClick={() => { setError(null); storeMut.mutate(); }}
                            disabled={storeMut.isPending || !safe || !locker || !shelf || !position}
                            className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                            {storeMut.isPending ? 'Storing…' : 'Confirm Storage'}
                        </button>
                    </div>
                )}
            </div>

            {/* Movement history */}
            {packet.movements && packet.movements.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-4">Movement History</h2>
                    <div className="space-y-3">
                        {packet.movements.map((m, i) => (
                            <div key={m.id} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                    <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5" />
                                    {i < (packet.movements?.length ?? 0) - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                                </div>
                                <div className="pb-3">
                                    <p className="text-sm text-gray-700">{m.reason}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{format(new Date(m.timestamp), 'd MMM yyyy, h:mm a')}</p>
                                    {(m.fromLocation || m.toLocation) && (
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {m.fromLocation?.label ?? '—'} → {m.toLocation?.label ?? '—'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
