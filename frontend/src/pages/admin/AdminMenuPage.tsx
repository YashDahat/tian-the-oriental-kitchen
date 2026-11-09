import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { ColDef } from 'ag-grid-community';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminDataGrid } from '@/components/admin/AdminDataGrid';
import { type RowAction } from '@/components/admin/RowActionsCell';
import { BulkUploadDialog } from '@/components/admin/BulkUploadDialog';
import { StepperSheet, type WizardStep } from '@/components/admin/StepperSheet';
import ImagePicker from '@/components/admin/ImagePicker';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { diningService } from '@/services/diningService';
import { withToast } from '@/lib/apiToast';
import { KITCHENS, formatINR, kitchenName } from '@/lib/tian';
import type { DishDto, Kitchen, UpsertDishRequest } from '@/types/dining';
import { cn } from '@/lib/utils';

interface DishForm {
  id: number | null; name: string; description: string; kitchen: Kitchen; price: string; priceVerified: boolean;
  veg: boolean; spiceLevel: string; signature: boolean; pieces: string; imageUrl: string; active: boolean;
  takeaway: boolean; sortOrder: string;
}
const empty = (): DishForm => ({ id: null, name: '', description: '', kitchen: 'STEAMER', price: '', priceVerified: true, veg: true,
  spiceLevel: '0', signature: false, pieces: '', imageUrl: '', active: true, takeaway: true, sortOrder: '0' });
const toForm = (d: DishDto): DishForm => ({ id: d.id, name: d.name, description: d.description ?? '', kitchen: d.kitchen,
  price: String(d.price), priceVerified: d.priceVerified, veg: d.veg, spiceLevel: String(d.spiceLevel), signature: d.signature,
  pieces: d.pieces != null ? String(d.pieces) : '', imageUrl: d.imageUrl ?? '', active: d.active, takeaway: d.takeaway, sortOrder: String(d.sortOrder) });

function validate(f: DishForm): { errors: string[]; bad: Set<string> } {
  const errors: string[] = []; const bad = new Set<string>();
  if (!f.name.trim()) { errors.push('Name is required.'); bad.add('name'); }
  const price = Number(f.price);
  if (!f.price.trim() || !Number.isFinite(price) || price <= 0) { errors.push('Price must be a positive amount in ₹.'); bad.add('price'); }
  const spice = Number(f.spiceLevel);
  if (!Number.isInteger(spice) || spice < 0 || spice > 3) { errors.push('Spice level is 0–3.'); bad.add('spice'); }
  if (f.pieces.trim() && (!Number.isInteger(Number(f.pieces)) || Number(f.pieces) <= 0)) { errors.push('Pieces must be a whole number above 0.'); bad.add('pieces'); }
  return { errors, bad };
}
const toReq = (f: DishForm): UpsertDishRequest => ({
  name: f.name.trim(), description: f.description.trim() || null, kitchen: f.kitchen, price: Number(f.price),
  priceVerified: f.priceVerified, veg: f.veg, spiceLevel: Number(f.spiceLevel), signature: f.signature,
  pieces: f.pieces.trim() ? Number(f.pieces) : null, imageUrl: f.imageUrl || null, active: f.active, takeaway: f.takeaway,
  sortOrder: Number(f.sortOrder) || 0,
});

/** Admin › Menu: every dish by kitchen — price confirmation, veg, spice, signature, photo, takeaway. */
export default function AdminMenuPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'dishes'], queryFn: diningService.admin.dishes });
  const [form, setForm] = useState<DishForm | null>(null);
  const [toDelete, setToDelete] = useState<DishDto | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin', 'dishes'] }); qc.invalidateQueries({ queryKey: ['dining', 'menu'] }); };
  const save = useMutation({
    mutationFn: (f: DishForm) => withToast(f.id == null ? diningService.admin.createDish(toReq(f)) : diningService.admin.updateDish(f.id, toReq(f)), 'Dish saved'),
    onSuccess: () => { refresh(); setForm(null); },
  });
  const del = useMutation({
    mutationFn: (id: number) => withToast(diningService.admin.deleteDish(id), 'Dish hidden from the menu'),
    onSuccess: () => { refresh(); setToDelete(null); },
  });
  const patch = (p: Partial<DishForm>) => setForm((f) => (f ? { ...f, ...p } : f));
  const v = form ? validate(form) : { errors: [], bad: new Set<string>() };
  const err = (k: string) => cn(v.bad.has(k) && 'border-destructive focus-visible:ring-destructive');

  const columnDefs: ColDef<DishDto>[] = [
    { field: 'name', flex: 1.6 },
    { field: 'kitchen', valueFormatter: (p) => kitchenName(p.value), maxWidth: 160 },
    { field: 'price', valueFormatter: (p) => formatINR(Number(p.value)), maxWidth: 120 },
    { field: 'priceVerified', headerName: 'Price confirmed', valueFormatter: (p) => (p.value ? 'Yes' : 'To confirm'), maxWidth: 150 },
    { field: 'veg', valueFormatter: (p) => (p.value ? 'Veg' : 'Non-veg'), maxWidth: 110 },
    { field: 'signature', valueFormatter: (p) => (p.value ? '★' : ''), maxWidth: 110 },
    { field: 'active', valueFormatter: (p) => (p.value ? 'On menu' : 'Hidden'), maxWidth: 120 },
  ];
  const actions: RowAction<DishDto>[] = [
    { label: 'Edit', icon: Pencil, onClick: (row) => setForm(toForm(row)) },
    { label: 'Hide from menu', icon: Trash2, danger: true, onClick: (row) => setToDelete(row), hidden: (row) => !row.active },
  ];

  const steps: WizardStep[] = form ? [
    { id: 'dish', title: 'Dish', description: 'Name, kitchen & price', error: v.errors.length > 0, complete: v.errors.length === 0,
      content: (
        <>
          {v.errors.length > 0 && <div role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm">{v.errors.join(' ')}</div>}
          <div className="grid gap-2"><Label htmlFor="d-name">Name</Label><Input id="d-name" className={err('name')} value={form.name} onChange={(e) => patch({ name: e.target.value })} /></div>
          <div className="grid gap-2"><Label htmlFor="d-desc">Description</Label><Textarea id="d-desc" rows={3} value={form.description} onChange={(e) => patch({ description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2"><Label>Kitchen</Label>
              <Select value={form.kitchen} onValueChange={(k) => patch({ kitchen: k as Kitchen })}>
                <SelectTrigger aria-label="Kitchen"><SelectValue /></SelectTrigger>
                <SelectContent>{KITCHENS.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="grid gap-2"><Label htmlFor="d-price">Price (₹)</Label><Input id="d-price" inputMode="decimal" className={err('price')} value={form.price} onChange={(e) => patch({ price: e.target.value })} /></div>
          </div>
          <div className="flex items-center justify-between"><Label htmlFor="d-verified">Price confirmed by the restaurant</Label><Switch id="d-verified" checked={form.priceVerified} onCheckedChange={(x) => patch({ priceVerified: x })} /></div>
        </>
      ) },
    { id: 'details', title: 'Details', description: 'Veg, spice, pieces',
      content: (
        <>
          <div className="flex items-center justify-between"><Label htmlFor="d-veg">Vegetarian</Label><Switch id="d-veg" checked={form.veg} onCheckedChange={(x) => patch({ veg: x })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2"><Label htmlFor="d-spice">Spice (0–3)</Label><Input id="d-spice" inputMode="numeric" className={err('spice')} value={form.spiceLevel} onChange={(e) => patch({ spiceLevel: e.target.value })} /></div>
            <div className="grid gap-2"><Label htmlFor="d-pcs">Pieces</Label><Input id="d-pcs" inputMode="numeric" className={err('pieces')} value={form.pieces} onChange={(e) => patch({ pieces: e.target.value })} /></div>
            <div className="grid gap-2"><Label htmlFor="d-sort">Sort order</Label><Input id="d-sort" inputMode="numeric" value={form.sortOrder} onChange={(e) => patch({ sortOrder: e.target.value })} /></div>
          </div>
          <div className="flex items-center justify-between"><Label htmlFor="d-sig">Signature dish</Label><Switch id="d-sig" checked={form.signature} onCheckedChange={(x) => patch({ signature: x })} /></div>
          <div className="flex items-center justify-between"><Label htmlFor="d-take">Available for pick-up</Label><Switch id="d-take" checked={form.takeaway} onCheckedChange={(x) => patch({ takeaway: x })} /></div>
          <div className="flex items-center justify-between"><Label htmlFor="d-active">On the menu</Label><Switch id="d-active" checked={form.active} onCheckedChange={(x) => patch({ active: x })} /></div>
        </>
      ) },
    { id: 'photo', title: 'Photo', description: 'From the media library',
      content: <ImagePicker value={form.imageUrl || null} onChange={(url) => patch({ imageUrl: url })} /> },
  ] : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">Menu</h1><p className="text-sm text-muted-foreground">Dishes by kitchen. Prices marked “To confirm” show a note on the public menu.</p></div>
        <div className="flex gap-2">
          <BulkUploadDialog title="Bulk upload dishes"
            columns={['name', 'kitchen', 'price', 'veg', 'spiceLevel', 'signature', 'pieces', 'description', 'takeaway']}
            sampleRow={['Crystal Dumplings', 'STEAMER', '425', 'yes', '0', 'yes', '4', 'Translucent wrappers', 'yes']}
            templateName="tian-dishes-template.csv"
            onUpload={async (file) => { const r = await diningService.admin.bulkDishes(file); refresh(); return r; }} />
          <Button onClick={() => setForm(empty())}>New dish</Button>
        </div>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <AdminDataGrid<DishDto> rowData={data ?? []} columnDefs={columnDefs} actions={actions} emptyMessage="No dishes yet." testId="admin-dishes-grid" />
      )}
      <StepperSheet open={form != null} onOpenChange={(o) => !o && setForm(null)} title={form?.id == null ? 'New dish' : `Edit — ${form?.name}`}
        steps={steps} canSave={!!form && v.errors.length === 0} saving={save.isPending} onSave={() => form && save.mutate(form)} />
      <ConfirmDialog open={toDelete != null} onOpenChange={() => setToDelete(null)} title="Hide this dish?"
        description="It disappears from the public menu; past orders and passport stamps keep it." confirmLabel="Hide" destructive
        pending={del.isPending} onConfirm={() => toDelete && del.mutate(toDelete.id)} />
    </div>
  );
}
