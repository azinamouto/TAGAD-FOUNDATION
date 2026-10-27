import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../modules/auth/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';


const ProgramMonitoring: React.FC = () => {
  const { user, isAdmin, hasRole } = useAuth();
  const [programs, setPrograms] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    office: '',
    sector: '',
    budget: '',
    year: new Date().getFullYear().toString(),
    status: 'ACTIVE',
    targetMale: '0',
    targetFemale: '0',
    actualMale: '0',
    actualFemale: '0'
  });

  const fetchPrograms = async () => {
    setLoading(true); setError('');
    try {
      const response = await api.get('/programs');
      const payload = response.data?.data ?? response.data;
      if (!Array.isArray(payload)) throw new Error('Invalid program response');
      setPrograms(payload);
    } catch (error) {
      setError('Programs are unavailable. Retry to retrieve the current records.');
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const defaultOfficeName = user?.office?.code || user?.office?.name || '';

  const handleOpenAdd = () => {
    setSaveError('');
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      office: defaultOfficeName,
      sector: '',
      budget: '',
      year: new Date().getFullYear().toString(),
      status: 'ACTIVE',
      targetMale: '0',
      targetFemale: '0',
      actualMale: '0',
      actualFemale: '0'
    });
    setIsModalOpen(true);
  };

  const handleEdit = (p: any) => {
    setSaveError('');
    setEditingId(p.id);
    setFormData({
      title: p.title || '',
      description: p.description || '',
      office: p.office || p.officeName || defaultOfficeName,
      sector: p.sector || '',
      budget: (p.budget ?? p.budgetTarget ?? 0).toString(),
      year: (p.year ?? p.fiscalYear ?? new Date().getFullYear()).toString(),
      status: p.status || 'ACTIVE',
      targetMale: (p.targetMale ?? '').toString(),
      targetFemale: (p.targetFemale ?? '').toString(),
      actualMale: (p.actualMale ?? '').toString(),
      actualFemale: (p.actualFemale ?? '').toString()
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this program?')) return;
    try {
      await api.delete(`/programs/${id}`);
      toast.success('Program deleted successfully');
      fetchPrograms();
    } catch (error) {
      toast.error('Failed to delete program');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setSaveError('');
    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        office: formData.office,
        sector: formData.sector,
        year: Number(formData.year),
        budget: Number(formData.budget),
        status: formData.status,
        targetMale: formData.targetMale === '' ? undefined : Number(formData.targetMale),
        targetFemale: formData.targetFemale === '' ? undefined : Number(formData.targetFemale),
        actualMale: formData.actualMale === '' ? undefined : Number(formData.actualMale),
        actualFemale: formData.actualFemale === '' ? undefined : Number(formData.actualFemale)
      };

      if (editingId) {
        await api.put(`/programs/${editingId}`, payload);
        toast.success('Program updated successfully');
      } else {
        await api.post('/programs', payload);
        toast.success('Program created successfully');
      }
      setIsModalOpen(false);
      fetchPrograms();
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || error.response?.data?.message || 'Failed to save program';
      setSaveError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isViewer = hasRole('VIEWER') && !isAdmin && !hasRole('ENCODER');

  const visiblePrograms = programs.filter(p => (!filterYear || String(p.year ?? p.fiscalYear) === filterYear) && [p.title, p.office, p.officeName, p.sector].some(value => typeof value === 'string' && value.toLowerCase().includes(search.toLowerCase())));
  const years = [...new Set(programs.map(p => p.year ?? p.fiscalYear).filter(value => value != null).map(String))].sort().reverse();
  const recorded = (value: unknown) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value).toLocaleString('en-PH') : 'Not recorded';
  return (
    <div className="analytics-dashboard management-page">
      <div className="dashboard-intro">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Program Monitoring</h1>
          <p className="text-sm font-medium text-muted-foreground">Compare recorded program targets, actual counts and budgets within your access scope.</p>
        </div>
        {!isViewer && (
          <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary text-white rounded-lg shadow-sm font-semibold">
            <Plus className="h-4 w-4 mr-2" /> New Program
          </Button>
        )}
      </div>

      <section className="analytics-notice" aria-label="Program data scope"><p>Source: stored program records. Fiscal year and responsible office are shown per program. Reported actual counts do not establish unique participants or measured impact. Verification status is not supplied.</p></section>
      <section className="analytics-panel">
        <div className="management-filters">
          <label>Search programs<Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Title, office or sector" /></label>
          <label>Fiscal year<select aria-label="Fiscal year" value={filterYear} onChange={e => setFilterYear(e.target.value)}><option value="">All recorded years</option>{years.map(y => <option key={y}>{y}</option>)}</select></label>
          {(search || filterYear) && <Button variant="outline" onClick={() => { setSearch(''); setFilterYear(''); }}>Clear filters</Button>}
        </div>
        {loading ? <p role="status">Loading programs...</p> : error ? <div role="alert" className="management-error"><p>{error}</p><Button variant="outline" onClick={fetchPrograms}>Retry programs</Button></div> : <>
          <p role="status" className="panel-footnote">Showing {visiblePrograms.length} of {programs.length} available programs.</p>
          <div className="table-scroll" role="region" aria-label="Program comparison" tabIndex={0}>
            <table className="analytics-table program-table"><caption>Recorded counts by sex; missing values remain "Not recorded". Targets and actuals are kept separate.</caption>
              <thead><tr>{['Program / sector', 'Office / fiscal year', 'Budget target (PHP)', 'Target male / female', 'Actual male / female', 'Status', 'Actions'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
              <tbody>{visiblePrograms.map(p => <tr key={p.id}>
                <th scope="row"><strong>{p.title || 'Not recorded'}</strong><p className="text-muted-foreground font-normal">{p.sector || 'Sector not recorded'}</p>{p.description && <details><summary>Program description</summary><p className="font-normal">{p.description}</p></details>}</th>
                <td>{p.office || p.officeName || 'Not recorded'}<p className="text-muted-foreground">{p.year ?? p.fiscalYear ?? 'Year not recorded'}</p></td>
                <td className="numeric">{recorded(p.budget ?? p.budgetTarget)}</td>
                <td className="numeric">{recorded(p.targetMale)} / {recorded(p.targetFemale)}</td>
                <td className="numeric">{recorded(p.actualMale)} / {recorded(p.actualFemale)}</td>
                <td>{p.status || 'Not recorded'}</td>
                <td><div className="management-actions">{!isViewer && <Button variant="outline" aria-label={'Edit program ' + p.title} onClick={() => handleEdit(p)}><Edit size={16} />Edit</Button>}{isAdmin && <Button variant="outline" aria-label={'Delete program ' + p.title} onClick={() => handleDelete(p.id)}><Trash2 size={16} />Delete</Button>}{isViewer && <span className="text-muted-foreground">Read only</span>}</div></td>
              </tr>)}{!visiblePrograms.length && <tr><td colSpan={7} className="analytics-empty">{programs.length ? 'No programs match these filters.' : 'No programs are recorded in your access scope.'}</td></tr>}</tbody>
            </table>
          </div>
        </>}
      </section>

      <Dialog open={isModalOpen} onOpenChange={open => { if (!isSubmitting) setIsModalOpen(open); }}>
        <DialogContent showCloseButton={!isSubmitting} className="portal-theme management-dialog sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground">{editingId ? 'Edit Program' : 'Create New Program'}</DialogTitle>
            <p className="text-sm text-muted-foreground">Define the scope and objectives for your GAD program.</p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="pt-6" aria-busy={isSubmitting}>
            {saveError && <p role="alert" className="management-error mb-4">{saveError}</p>}
            {isSubmitting && <p role="status" className="mb-4">Saving changes...</p>}
            <fieldset disabled={isSubmitting} className="space-y-6 min-w-0">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-semibold text-foreground">Program Title <span className="text-red-500">*</span></Label>
              <Input id="title" minLength={3} className="rounded-lg border-input py-6" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold text-foreground">Description</Label>
              <Input id="description" className="rounded-lg border-input py-6" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="office" className="text-sm font-semibold text-foreground">Responsible Office <span className="text-red-500">*</span></Label>
                <Input id="office" className="rounded-lg border-input py-6" value={formData.office} onChange={e => setFormData({...formData, office: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sector" className="text-sm font-semibold text-foreground">Sector <span className="text-red-500">*</span></Label>
                <Select value={formData.sector} onValueChange={val => setFormData({...formData, sector: val})}>
                  <SelectTrigger aria-label="Sector" className="rounded-lg border-input py-6"><SelectValue placeholder="Select sector" /></SelectTrigger>
                  <SelectContent className="portal-theme rounded-xl">
                    {["Women", "Senior Citizens", "PWD", "Youth", "Indigenous Peoples", "Farmers", "Fisherfolk", "Urban Poor"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="budget" className="text-sm font-semibold text-foreground">Budget (₱) <span className="text-red-500">*</span></Label>
                <Input id="budget" type="number" min={0} step="0.01" className="rounded-lg border-input py-6" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year" className="text-sm font-semibold text-foreground">Year <span className="text-red-500">*</span></Label>
                <Input id="year" type="number" min={2000} max={2100} step={1} className="rounded-lg border-input py-6" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-xl bg-muted border border-border">
              <div className="space-y-4">
                <p className="text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground">Target Beneficiaries</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-muted-foreground">Male</Label>
                    <Input className="h-10 rounded-lg border-input" type="number" min={0} step={1} aria-label="Target male" value={formData.targetMale} onChange={e => setFormData({...formData, targetMale: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-muted-foreground">Female</Label>
                    <Input className="h-10 rounded-lg border-input" type="number" min={0} step={1} aria-label="Target female" value={formData.targetFemale} onChange={e => setFormData({...formData, targetFemale: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground">Actual Beneficiaries</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-muted-foreground">Male</Label>
                    <Input className="h-10 rounded-lg border-input" type="number" min={0} step={1} aria-label="Actual male" value={formData.actualMale} onChange={e => setFormData({...formData, actualMale: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-muted-foreground">Female</Label>
                    <Input className="h-10 rounded-lg border-input" type="number" min={0} step={1} aria-label="Actual female" value={formData.actualFemale} onChange={e => setFormData({...formData, actualFemale: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Status</Label>
              <Select value={formData.status} onValueChange={val => setFormData({...formData, status: val})}>
                <SelectTrigger aria-label="Status" className="rounded-lg border-input py-6"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent className="portal-theme rounded-xl">
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                  <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                  <SelectItem value="DRAFT">DRAFT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-6 gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-lg text-muted-foreground font-semibold">Cancel</Button>
              <Button type="submit" className="bg-primary hover:bg-primary text-white rounded-lg shadow-sm font-bold min-w-[140px]" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Save Program'}
              </Button>
            </DialogFooter>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProgramMonitoring;
