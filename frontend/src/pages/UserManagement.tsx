import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../modules/auth/AuthContext';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { UserPlus, UserCog, ShieldCheck, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { cn } from '../lib/utils';

const UserManagement: React.FC = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [accountStatus, setAccountStatus] = useState('');
  const officeLabel = (office: any) => typeof office === 'string' ? office : office?.code || office?.name || '';
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ENCODER',
    office: '',
    isActive: true
  });

  const fetchUsers = async () => {
    setLoading(true); setError('');
    try {
      const response = await api.get('/users');
      const payload = response.data?.data ?? response.data;
      if (!Array.isArray(payload)) throw new Error('Invalid user response');
      setUsers(payload);
    } catch (error) {
      setError('User accounts are unavailable. Retry to retrieve the current records.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenAdd = () => {
    setSaveError('');
    setEditingId(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'ENCODER',
      office: '',
      isActive: true
    });
    setIsModalOpen(true);
  };

  const handleEdit = (u: any) => {
    setSaveError('');
    setEditingId(u.id);
    setFormData({
      name: u.name || u.fullName || u.email?.split('@')[0] || '',
      email: u.email || '',
      password: '', // Don't show password
      role: u.role || 'ENCODER',
      office: officeLabel(u.office),
      isActive: u.isActive !== undefined ? Boolean(u.isActive) : true
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setSaveError('');
    setIsSubmitting(true);
    try {
      if (editingId) {
        const payload = { ...formData };
        if (!payload.password) delete (payload as any).password;
        await api.put(`/users/${editingId}`, payload);
        toast.success('User updated successfully');
      } else {
        if (!formData.password) throw new Error('Password is required');
        await api.post('/users', formData);
        toast.success('User created successfully');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Operation failed';
      setSaveError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibleUsers = users.filter(u => (!accountStatus || (accountStatus === 'active' ? u.isActive === true : u.isActive === false)) && [u.name, u.fullName, u.email, u.role, officeLabel(u.office)].some(value => typeof value === 'string' && value.toLowerCase().includes(search.toLowerCase())));
  return (
    <div className="analytics-dashboard management-page">
      <div className="dashboard-intro">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
          <p className="text-sm font-medium text-muted-foreground">Manage system access and roles</p>
        </div>
        {isAdmin && (
          <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary text-white rounded-lg shadow-sm font-semibold px-6">
            <UserPlus className="h-4 w-4 mr-2" /> Add User
          </Button>
        )}
      </div>

      <section className="analytics-notice" aria-label="Account data scope"><p>Source: system accounts available to your role. Office and account status reflect stored assignments; they do not confirm LGU designation or institutional approval.</p></section>
      <div className="management-filters">
        <label>Search users<Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, email, role or office" /></label>
        <label>Account status<select aria-label="Account status" value={accountStatus} onChange={e => setAccountStatus(e.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        {(search || accountStatus) && <Button variant="outline" onClick={() => { setSearch(''); setAccountStatus(''); }}>Clear filters</Button>}
      </div>
      <Card className="border-border shadow-sm bg-card rounded-xl overflow-hidden">
        <header className="px-8 py-6 border-b border-border flex items-center justify-between bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent rounded-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">System Users</h2>
          </div>
          <span className="text-sm font-bold text-muted-foreground uppercase tracking-normal">{loading ? 'Loading accounts...' : error ? 'Accounts unavailable' : `${visibleUsers.length} of ${users.length} accounts / ${users.filter(u => u.isActive === true).length} active`}</span>
        </header>
        <CardContent className="p-0">
          {loading ? (
            <p role="status" className="p-6">Loading user accounts...</p>
          ) : error ? <div role="alert" className="management-error"><p>{error}</p><Button variant="outline" onClick={fetchUsers}>Retry users</Button></div> : (
            <Table aria-label="System users" className="analytics-table">
              <TableHeader className="bg-muted/50">
                <TableRow className="border-none">
                  <TableHead className="text-sm font-bold uppercase tracking-normal py-4 pl-8 text-muted-foreground">Name</TableHead>
                  <TableHead className="text-sm font-bold uppercase tracking-normal py-4 text-muted-foreground">Email</TableHead>
                  <TableHead className="text-sm font-bold uppercase tracking-normal py-4 text-muted-foreground">Role</TableHead>
                  <TableHead className="text-sm font-bold uppercase tracking-normal py-4 text-muted-foreground">Office</TableHead>
                  <TableHead className="text-sm font-bold uppercase tracking-normal py-4 text-muted-foreground">Status</TableHead>
                  {isAdmin && <TableHead className="text-sm font-bold uppercase tracking-normal py-4 pr-8 text-muted-foreground text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-20 text-muted-foreground italic text-sm">
                      No users match the current selection.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleUsers.map((u) => {
                    const roleUpper = (u.role || '').toUpperCase();
                    const officeName = officeLabel(u.office) || 'Not recorded';
                    const isActive = u.isActive === true;
                    return (
                      <TableRow key={u.id} className="hover:bg-muted/50 border-b border-border last:border-0 transition-colors group">
                        <TableCell className="font-bold text-foreground text-sm py-5 pl-8">{u.name || u.fullName || u.email?.split('@')[0]}</TableCell>
                        <TableCell className="text-foreground text-sm py-5">{u.email}</TableCell>
                        <TableCell className="py-5">
                          {roleUpper === 'ADMIN' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-sm font-extrabold bg-muted text-foreground uppercase tracking-normal">Admin</span>
                          ) : roleUpper === 'ENCODER' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-sm font-extrabold bg-accent text-primary uppercase tracking-normal">Encoder</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-sm font-extrabold bg-muted text-muted-foreground uppercase tracking-normal">{roleUpper || 'Viewer'}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm py-5">{officeName}</TableCell>
                        <TableCell className="py-5">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-sm font-extrabold uppercase tracking-normal",
                            isActive ? "bg-accent text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            {u.isActive == null ? 'Not recorded' : isActive ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right py-5 pr-8">
                            <Button variant="ghost" size="icon" aria-label={'Edit user ' + (u.name || u.fullName || u.email)} onClick={() => handleEdit(u)} className="h-9 w-9 text-primary hover:bg-card hover:shadow-sm ">
                              <UserCog className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={open => { if (!isSubmitting) setIsModalOpen(open); }}>
        <DialogContent showCloseButton={!isSubmitting} className="portal-theme management-dialog sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground">{editingId ? 'Edit User' : 'Add New User'}</DialogTitle>
            <p className="text-sm text-muted-foreground">Assign roles and office permissions to municipal staff.</p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="pt-6" aria-busy={isSubmitting}>
            {saveError && <p role="alert" className="management-error mb-4">{saveError}</p>}
            {isSubmitting && <p role="status" className="mb-4">Saving changes...</p>}
            <fieldset disabled={isSubmitting} className="space-y-6 min-w-0">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-foreground">Full Name <span className="text-red-500">*</span></Label>
              <Input id="name" className="rounded-lg border-input py-6" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Juan De La Cruz" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-foreground">Email Address <span className="text-red-500">*</span></Label>
              <Input id="email" type="email" className="rounded-lg border-input py-6" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="juan@talibon.gov.ph" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-foreground">{editingId ? 'New Password (leave blank to keep current)' : 'Password'}</Label>
              <Input id="password" type="password" className="rounded-lg border-input py-6" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!editingId} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">System Role <span className="text-red-500">*</span></Label>
                <Select value={formData.role} onValueChange={val => setFormData({...formData, role: val})}>
                  <SelectTrigger aria-label="Role" className="rounded-lg border-input py-6"><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent className="portal-theme rounded-xl">
                    <SelectItem value="SUPER_ADMIN">Super Admin (System-wide)</SelectItem>
                    <SelectItem value="ADMIN">Admin (Full Access)</SelectItem>
                    <SelectItem value="ENCODER">Encoder (Data Entry)</SelectItem>
                    <SelectItem value="VIEWER">Viewer (Read Only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="office" className="text-sm font-semibold text-foreground">Office <span className="text-red-500">*</span></Label>
                <Input id="office" className="rounded-lg border-input py-6" value={formData.office} onChange={e => setFormData({...formData, office: e.target.value})} placeholder="e.g. MSWDO" required />
              </div>
            </div>
            {editingId && (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-xl border border-border">
                <input 
                  type="checkbox" 
                  id="isActive" 
                  className="w-5 h-5 rounded border-input text-primary focus:ring-primary"
                  checked={formData.isActive} 
                  onChange={e => setFormData({...formData, isActive: e.target.checked})} 
                />
                <Label htmlFor="isActive" className="text-sm font-bold text-foreground cursor-pointer">Account Active</Label>
                <span className="text-sm font-medium text-muted-foreground">Deactivating will revoke all system access immediately.</span>
              </div>
            )}
            <DialogFooter className="pt-6 gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-lg text-muted-foreground font-semibold">Cancel</Button>
              <Button type="submit" className="bg-primary hover:bg-primary text-white rounded-lg shadow-sm font-bold min-w-[140px]" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Save User'}
              </Button>
            </DialogFooter>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
