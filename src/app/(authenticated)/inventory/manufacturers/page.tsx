'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Factory,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Globe,
  Phone,
  Mail,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Manufacturer {
  id: string;
  name: string;
  website: string | null;
  supportUrl: string | null;
  supportPhone: string | null;
  supportEmail: string | null;
  notes: string | null;
  isActive: boolean;
  _count?: { items: number };
}

interface FormState {
  name: string;
  website: string;
  supportUrl: string;
  supportPhone: string;
  supportEmail: string;
  notes: string;
}

const emptyForm: FormState = {
  name: '',
  website: '',
  supportUrl: '',
  supportPhone: '',
  supportEmail: '',
  notes: '',
};

export default function ManufacturersPage() {
  const router = useRouter();
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [editing, setEditing] = useState<Manufacturer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Manufacturer | null>(null);

  const fetchManufacturers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/manufacturers?${params.toString()}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setManufacturers(json.data.data);
    } catch {
      toast.error('Failed to load manufacturers');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchManufacturers();
  }, [fetchManufacturers]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (m: Manufacturer) => {
    setEditing(m);
    setForm({
      name: m.name,
      website: m.website ?? '',
      supportUrl: m.supportUrl ?? '',
      supportPhone: m.supportPhone ?? '',
      supportEmail: m.supportEmail ?? '',
      notes: m.notes ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    try {
      const url = editing
        ? `/api/manufacturers/${editing.id}`
        : '/api/manufacturers';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          website: form.website || null,
          supportUrl: form.supportUrl || null,
          supportPhone: form.supportPhone || null,
          supportEmail: form.supportEmail || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(editing ? 'Manufacturer updated' : 'Manufacturer created');
      setDialogOpen(false);
      fetchManufacturers();
    } catch {
      toast.error('Failed to save manufacturer');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/manufacturers/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      toast.success('Manufacturer deactivated');
      setDeleteTarget(null);
      fetchManufacturers();
    } catch {
      toast.error('Failed to delete manufacturer');
    }
  };

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/inventory')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Factory className="h-7 w-7 text-primary" />
          <h1 className="page-title">Manufacturers</h1>
          {!loading && (
            <span className="text-sm text-muted-foreground">
              {manufacturers.length} total
            </span>
          )}
        </div>
        <Button
          size="sm"
          className="bg-brand-green hover:bg-brand-green/90"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4 mr-1" />
          New Manufacturer
        </Button>
      </div>

      <div className="mt-6 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search manufacturers..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="card-base rounded-xl p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : manufacturers.length === 0 ? (
          <div className="card-base rounded-xl flex flex-col items-center justify-center py-16">
            <Factory className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No manufacturers yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first manufacturer to start linking catalog items.
            </p>
          </div>
        ) : (
          <div className="card-base rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Items
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {manufacturers.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Factory className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{m.name}</p>
                          {m.website && (
                            <a
                              href={m.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-brand-green hover:underline inline-flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Globe className="h-3 w-3" />
                              {m.website.replace(/^https?:\/\//, '')}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div className="space-y-0.5">
                        {m.supportPhone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {m.supportPhone}
                          </div>
                        )}
                        {m.supportEmail && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {m.supportEmail}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {m._count?.items ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(m)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteTarget(m)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit Manufacturer' : 'New Manufacturer'}
            </DialogTitle>
            <DialogDescription>
              Manufacturers are separate from vendors. Vendors sell products,
              manufacturers make them.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Dell, HP, Cisco..."
              />
            </div>
            <div>
              <Label>Website</Label>
              <Input
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Support URL</Label>
              <Input
                value={form.supportUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, supportUrl: e.target.value }))
                }
                placeholder="https://support..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Support Phone</Label>
                <Input
                  value={form.supportPhone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, supportPhone: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Support Email</Label>
                <Input
                  value={form.supportEmail}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, supportEmail: e.target.value }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-brand-green hover:bg-brand-green/90"
              onClick={handleSave}
            >
              {editing ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Manufacturer</DialogTitle>
            <DialogDescription>
              Deactivate {deleteTarget?.name}? Existing item references will be
              preserved but the manufacturer will no longer appear in active
              lists.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
