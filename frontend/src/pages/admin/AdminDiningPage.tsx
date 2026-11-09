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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { diningService } from '@/services/diningService';
import { withToast } from '@/lib/apiToast';
import type { BulkUploadResult } from '@/types/bulkUpload';
import { cn } from '@/lib/utils';

type Value = string | boolean | number | null;
interface Field {
  key: string; label: string; type: 'text' | 'textarea' | 'number' | 'switch' | 'image';
  required?: boolean; min?: number; max?: number;
}
interface EntityAdminProps<T extends { id: number }> {
  noun: string; queryKey: string; fields: Field[]; columns: ColDef<T>[];
  list: () => Promise<T[]>;
  save: (id: number | null, body: Record<string, unknown>) => Promise<unknown>;
  remove: (id: number) => Promise<void>; removeLabel: string;
  bulk: { columns: string[]; sample: string[]; upload: (f: File) => Promise<BulkUploadResult> };
  defaults: Record<string, Value>;
  /** Cross-field validation beyond required/min/max. */
  extraValidate?: (v: Record<string, Value>) => string | null;
}

/** One small admin grid + stepper-sheet editor + bulk upload, shared by seating / story / milestones. */
function EntityAdmin<T extends { id: number }>(p: EntityAdminProps<T>) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', p.queryKey], queryFn: p.list });
  const [form, setForm] = useState<(Record<string, Value> & { id: number | null }) | null>(null);
  const [toDelete, setToDelete] = useState<T | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin', p.queryKey] }); qc.invalidateQueries({ queryKey: ['dining'] }); };

  const errors: string[] = [];
  const bad = new Set<string>();
  if (form) {
    for (const f of p.fields) {
      const v = form[f.key];
      if (f.type === 'number') {
        const n = Number(v);
        if (String(v).trim() === '' || !Number.isInteger(n) || (f.min != null && n < f.min) || (f.max != null && n > f.max)) {
          errors.push(`${f.label} must be a whole number${f.min != null ? ` from ${f.min}` : ''}${f.max != null ? ` to ${f.max}` : ''}.`);
          bad.add(f.key);
        }
      } else if (f.required && typeof v === 'string' && !v.trim()) {
        errors.push(`${f.label} is required.`); bad.add(f.key);
      }
    }
    const extra = errors.length === 0 ? p.extraValidate?.(form) : null;
    if (extra) errors.push(extra);
  }

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {};
      for (const f of p.fields) {
        const v = form![f.key];
        body[f.key] = f.type === 'number' ? Number(v) : typeof v === 'string' ? (v.trim() || null) : v;
      }
      return withToast(p.save(form!.id, body), `${p.noun} saved`);
    },
    onSuccess: () => { refresh(); setForm(null); },
  });
  const del = useMutation({
    mutationFn: (id: number) => withToast(p.remove(id), `${p.noun} removed`),
    onSuccess: () => { refresh(); setToDelete(null); },
  });

  const toForm = (row: T) => {
    const f: Record<string, Value> & { id: number | null } = { id: row.id };
    const r = row as unknown as Record<string, unknown>;
    for (const fd of p.fields) f[fd.key] = fd.type === 'switch' ? Boolean(r[fd.key]) : r[fd.key] == null ? '' : String(r[fd.key]);
    return f;
  };
  const actions: RowAction<T>[] = [
    { label: 'Edit', icon: Pencil, onClick: (row) => setForm(toForm(row)) },
    { label: p.removeLabel, icon: Trash2, danger: true, onClick: (row) => setToDelete(row) },
  ];
  const steps: WizardStep[] = form ? [{
    id: 'main', title: p.noun, error: errors.length > 0, complete: errors.length === 0,
    content: (
      <>
        {errors.length > 0 && <div role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm">{errors.join(' ')}</div>}
        {p.fields.map((f) => {
          const id = `${p.queryKey}-${f.key}`;
          const cls = cn(bad.has(f.key) && 'border-destructive focus-visible:ring-destructive');
          const v = form[f.key];
          if (f.type === 'switch') return (
            <div key={f.key} className="flex items-center justify-between"><Label htmlFor={id}>{f.label}</Label>
              <Switch id={id} checked={Boolean(v)} onCheckedChange={(x) => setForm({ ...form, [f.key]: x })} /></div>);
          if (f.type === 'image') return (
            <div key={f.key} className="grid gap-2"><Label>{f.label}</Label>
              <ImagePicker value={(v as string) || null} onChange={(url) => setForm({ ...form, [f.key]: url })} /></div>);
          return (
            <div key={f.key} className="grid gap-2"><Label htmlFor={id}>{f.label}</Label>
              {f.type === 'textarea'
                ? <Textarea id={id} rows={5} className={cls} value={v as string} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                : <Input id={id} className={cls} inputMode={f.type === 'number' ? 'numeric' : undefined} value={v as string} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />}
            </div>);
        })}
      </>
    ),
  }] : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <BulkUploadDialog title={`Bulk upload — ${p.noun.toLowerCase()}`} columns={p.bulk.columns} sampleRow={p.bulk.sample}
          templateName={`tian-${p.queryKey}-template.csv`}
          onUpload={async (file) => { const r = await p.bulk.upload(file); refresh(); return r; }} />
        <Button onClick={() => setForm({ ...p.defaults, id: null })}>New {p.noun.toLowerCase()}</Button>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <AdminDataGrid<T> rowData={data ?? []} columnDefs={p.columns} actions={actions} emptyMessage={`No ${p.noun.toLowerCase()} yet.`} height="calc(100vh - 300px)" />
      )}
      <StepperSheet open={form != null} onOpenChange={(o) => !o && setForm(null)} title={form?.id == null ? `New ${p.noun.toLowerCase()}` : `Edit ${p.noun.toLowerCase()}`}
        steps={steps} canSave={!!form && errors.length === 0} saving={save.isPending} onSave={() => save.mutate()} />
      <ConfirmDialog open={toDelete != null} onOpenChange={() => setToDelete(null)} title={`${p.removeLabel}?`} destructive
        confirmLabel={p.removeLabel} pending={del.isPending} onConfirm={() => toDelete && del.mutate(toDelete.id)} />
    </div>
  );
}

/** Admin › Dining: seating & capacity, story chapters, passport rewards. */
export default function AdminDiningPage() {
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-semibold">Dining</h1>
        <p className="text-sm text-muted-foreground">Tables per seating slot drive online availability. Story chapters appear on the home and Our Story pages. Passport rewards are what guests unlock.</p></div>
      <Tabs defaultValue="seating">
        <TabsList><TabsTrigger value="seating">Seating</TabsTrigger><TabsTrigger value="story">Story</TabsTrigger><TabsTrigger value="passport">Passport rewards</TabsTrigger></TabsList>
        <TabsContent value="seating" className="pt-4">
          <EntityAdmin
            noun="Seating option" queryKey="seating" removeLabel="Deactivate"
            list={diningService.admin.seating} remove={diningService.admin.deleteSeating}
            save={(id, b) => diningService.admin.saveSeating(id, b as never)}
            defaults={{ name: '', description: '', minGuests: '1', maxGuests: '2', slotCapacity: '1', active: true, sortOrder: '0' }}
            fields={[
              { key: 'name', label: 'Name', type: 'text', required: true },
              { key: 'description', label: 'Description', type: 'textarea' },
              { key: 'minGuests', label: 'Min guests', type: 'number', min: 1, max: 40 },
              { key: 'maxGuests', label: 'Max guests', type: 'number', min: 1, max: 40 },
              { key: 'slotCapacity', label: 'Tables per seating slot', type: 'number', min: 0, max: 50 },
              { key: 'sortOrder', label: 'Sort order', type: 'number', min: 0, max: 999 },
              { key: 'active', label: 'Bookable online', type: 'switch' },
            ]}
            extraValidate={(v) => (Number(v.minGuests) > Number(v.maxGuests) ? 'Min guests must not exceed max guests.' : null)}
            columns={[{ field: 'name' as never, flex: 1.4 }, { field: 'minGuests' as never, headerName: 'Min' }, { field: 'maxGuests' as never, headerName: 'Max' },
              { field: 'slotCapacity' as never, headerName: 'Tables / slot' }, { field: 'active' as never, valueFormatter: (x) => (x.value ? 'Yes' : 'No') }]}
            bulk={{ columns: ['name', 'minGuests', 'maxGuests', 'slotCapacity', 'description'], sample: ['Table for two', '1', '2', '4', 'Quiet table'], upload: diningService.admin.bulkSeating }}
          />
        </TabsContent>
        <TabsContent value="story" className="pt-4">
          <EntityAdmin
            noun="Chapter" queryKey="story" removeLabel="Delete"
            list={diningService.admin.story} remove={diningService.admin.deleteStory}
            save={(id, b) => diningService.admin.saveStory(id, b as never)}
            defaults={{ ordinal: '1', label: '', title: '', body: '', imageUrl: '', active: true }}
            fields={[
              { key: 'ordinal', label: 'Order', type: 'number', min: 0, max: 999 },
              { key: 'label', label: 'Label (e.g. "The steamer")', type: 'text' },
              { key: 'title', label: 'Title', type: 'text', required: true },
              { key: 'body', label: 'Text', type: 'textarea', required: true },
              { key: 'imageUrl', label: 'Photo (optional)', type: 'image' },
              { key: 'active', label: 'Published', type: 'switch' },
            ]}
            columns={[{ field: 'ordinal' as never, headerName: '#', maxWidth: 80 }, { field: 'label' as never }, { field: 'title' as never, flex: 1.6 },
              { field: 'active' as never, headerName: 'Published', valueFormatter: (x) => (x.value ? 'Yes' : 'No') }]}
            bulk={{ columns: ['ordinal', 'label', 'title', 'body'], sample: ['6', 'The team', 'Faces you will meet', 'A few lines…'], upload: diningService.admin.bulkStory }}
          />
        </TabsContent>
        <TabsContent value="passport" className="pt-4">
          <EntityAdmin
            noun="Reward" queryKey="milestones" removeLabel="Delete"
            list={diningService.admin.milestones} remove={diningService.admin.deleteMilestone}
            save={(id, b) => diningService.admin.saveMilestone(id, b as never)}
            defaults={{ stamps: '5', title: '', reward: '', active: true }}
            fields={[
              { key: 'stamps', label: 'Stamps needed', type: 'number', min: 1, max: 100 },
              { key: 'title', label: 'Title', type: 'text', required: true },
              { key: 'reward', label: 'Reward guests see', type: 'textarea' },
              { key: 'active', label: 'Active', type: 'switch' },
            ]}
            columns={[{ field: 'stamps' as never, maxWidth: 110 }, { field: 'title' as never, flex: 1.2 }, { field: 'reward' as never, flex: 2 },
              { field: 'active' as never, valueFormatter: (x) => (x.value ? 'Yes' : 'No') }]}
            bulk={{ columns: ['stamps', 'title', 'reward'], sample: ['5', 'Regular', 'A pot of tea on us'], upload: diningService.admin.bulkMilestones }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
