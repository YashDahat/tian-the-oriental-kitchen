import { useState } from 'react';
import { CheckCircle2, DoorOpen, Utensils } from 'lucide-react';
import type { ColDef } from 'ag-grid-community';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AdminDataGrid } from '@/components/admin/AdminDataGrid';
import { type RowAction } from '@/components/admin/RowActionsCell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { diningService } from '@/services/diningService';
import { useAdvanceStage } from '@/hooks/orderHooks';
import { formatTime, isoDateIST, occasionLabel } from '@/lib/tian';
import type { AdminReservationRow } from '@/types/dining';

/**
 * Admin › Reservations: the host-stand day sheet (read-only view over table-booking orders). Check-in /
 * seat / complete move the booking's workflow stage through the foundation order API — the same transitions
 * as the order board, so connectors (emails, passport visit stamps) fire exactly once.
 */
export default function AdminReservationsPage() {
  const qc = useQueryClient();
  const [from, setFrom] = useState(isoDateIST(0));
  const [to, setTo] = useState(isoDateIST(0));
  const rangeError = to < from ? 'End date must be on or after the start date.' : null;
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reservations', from, to], queryFn: () => diningService.admin.reservations(from, to),
    enabled: !rangeError, refetchInterval: 30_000,
  });
  const advance = useAdvanceStage();
  const move = (row: AdminReservationRow, stageCode: string) =>
    advance.mutate({ id: row.orderId, stageCode }, { onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'reservations'] }) });

  const columns: ColDef<AdminReservationRow>[] = [
    { field: 'date', maxWidth: 120 },
    { field: 'time', valueFormatter: (p) => formatTime(p.value), maxWidth: 110 },
    { field: 'guestName', headerName: 'Guest', flex: 1.2 },
    { field: 'guestPhone', headerName: 'Phone', maxWidth: 150 },
    { field: 'guests', maxWidth: 100 },
    { field: 'seatingName', headerName: 'Table' },
    { field: 'occasion', valueFormatter: (p) => (p.value === 'NONE' ? '' : occasionLabel(p.value)) },
    { field: 'dietaryNotes', headerName: 'Dietary', flex: 1.2 },
    { field: 'specialRequest', headerName: 'Request', flex: 1.2 },
    { field: 'stageLabel', headerName: 'Status', maxWidth: 150 },
  ];
  const actions: RowAction<AdminReservationRow>[] = [
    { label: 'Guests arrived', icon: DoorOpen, onClick: (r) => move(r, 'ARRIVED'), hidden: (r) => r.stageCode !== 'CONFIRMED' },
    { label: 'Seat', icon: Utensils, onClick: (r) => move(r, 'SEATED'), hidden: (r) => r.stageCode !== 'ARRIVED' },
    { label: 'Complete', icon: CheckCircle2, onClick: (r) => move(r, 'COMPLETED'), hidden: (r) => r.stageCode !== 'SEATED' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">Reservations</h1>
          <p className="text-sm text-muted-foreground">Day sheet for the host stand. Cancel or block from the <Link className="underline" to="/admin/orders">order board</Link> (workflow “Table bookings”).</p></div>
        <div className="flex items-end gap-2">
          <div className="grid gap-1"><Label htmlFor="r-from">From</Label><Input id="r-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={rangeError ? 'border-destructive' : ''} /></div>
          <div className="grid gap-1"><Label htmlFor="r-to">To</Label><Input id="r-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className={rangeError ? 'border-destructive' : ''} /></div>
          <Button variant="outline" onClick={() => { setFrom(isoDateIST(0)); setTo(isoDateIST(0)); }}>Today</Button>
        </div>
      </div>
      {rangeError && <div role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm">{rangeError}</div>}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <AdminDataGrid<AdminReservationRow> rowData={data ?? []} columnDefs={columns} actions={actions} emptyMessage="No bookings for these dates." testId="admin-reservations-grid" />
      )}
    </div>
  );
}
