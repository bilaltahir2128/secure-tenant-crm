import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Mail, Phone, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { z } from 'zod';

// Zod schema for contact validation
const contactSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(100, 'First name must be less than 100 characters'),
  last_name: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be less than 100 characters'),
  email: z
    .string()
    .trim()
    .max(255, 'Email must be less than 255 characters')
    .refine(
      (val) => val === '' || /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(val),
      'Invalid email format'
    ),
  phone: z
    .string()
    .trim()
    .max(20, 'Phone must be less than 20 characters')
    .refine(
      (val) => val === '' || /^\+?[0-9\s\-()]{7,20}$/.test(val),
      'Invalid phone format'
    ),
  company: z
    .string()
    .trim()
    .max(200, 'Company must be less than 200 characters'),
  job_title: z
    .string()
    .trim()
    .max(100, 'Job title must be less than 100 characters'),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface Contact {
  contact_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  job_title: string | null;
}

export default function Contacts() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ContactFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    job_title: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({});

  const fetchContacts = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    setContacts((data as Contact[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchContacts();
  }, [tenantId]);

  const handleCreate = async () => {
    if (!tenantId) return;

    // Validate form data
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ContactFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof ContactFormData;
        if (!fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    const { error } = await supabase.from('contacts').insert({
      first_name: result.data.first_name,
      last_name: result.data.last_name,
      email: result.data.email || null,
      phone: result.data.phone || null,
      company: result.data.company || null,
      job_title: result.data.job_title || null,
      tenant_id: tenantId,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Contact created!' });
      setDialogOpen(false);
      setForm({ first_name: '', last_name: '', email: '', phone: '', company: '', job_title: '' });
      fetchContacts();
    }
  };

  const filtered = contacts.filter((c) =>
    `${c.first_name} ${c.last_name} ${c.email} ${c.company}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Contacts</h1>
            <p className="text-muted-foreground">Manage your contacts and leads</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Contact</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <Label>First Name *</Label>
                  <Input
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    maxLength={100}
                  />
                  {errors.first_name && <p className="text-sm text-destructive mt-1">{errors.first_name}</p>}
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <Input
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    maxLength={100}
                  />
                  {errors.last_name && <p className="text-sm text-destructive mt-1">{errors.last_name}</p>}
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    maxLength={255}
                  />
                  {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    maxLength={20}
                  />
                  {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone}</p>}
                </div>
                <div className="col-span-2">
                  <Label>Company</Label>
                  <Input
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    maxLength={200}
                  />
                  {errors.company && <p className="text-sm text-destructive mt-1">{errors.company}</p>}
                </div>
                <div className="col-span-2">
                  <Label>Job Title</Label>
                  <Input
                    value={form.job_title}
                    onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                    maxLength={100}
                  />
                  {errors.job_title && <p className="text-sm text-destructive mt-1">{errors.job_title}</p>}
                </div>
              </div>
              <Button onClick={handleCreate} className="mt-4 w-full">
                Create Contact
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Company</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-muted-foreground">
                    No contacts found
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.contact_id}>
                    <td className="font-medium">
                      {c.first_name} {c.last_name}
                    </td>
                    <td className="text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {c.email || '—'}
                    </td>
                    <td className="text-muted-foreground">
                      <Phone className="h-4 w-4 inline mr-2" />
                      {c.phone || '—'}
                    </td>
                    <td className="text-muted-foreground">
                      <Building2 className="h-4 w-4 inline mr-2" />
                      {c.company || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
