import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../modules/auth/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Loader2, Target } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { cn } from '../lib/utils';

const ProgramMonitoring: React.FC = () => {
  const { user, isAdmin, hasRole } = useAuth();
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    setLoading(true);
    try {
      const response = await api.get('/programs');
      const payload = response.data?.data ?? response.data;
      setPrograms(Array.isArray(payload) ? payload : []);
    } catch (error) {
      toast.error('Failed to fetch programs');
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
    setEditingId(p.id);
    setFormData({
      title: p.title || '',
      description: p.description || '',
      office: p.office || p.officeName || defaultOfficeName,
      sector: p.sector || '',
      budget: (p.budget ?? p.budgetTarget ?? 0).toString(),
      year: (p.year ?? p.fiscalYear ?? new Date().getFullYear()).toString(),
      status: p.status || 'ACTIVE',
      targetMale: (p.targetMale ?? 0).toString(),
      targetFemale: (p.targetFemale ?? 0).toString(),
      actualMale: (p.actualMale ?? 0).toString(),
      actualFemale: (p.actualFemale ?? 0).toString()
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
    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        office: formData.office,
        sector: formData.sector,
        year: parseInt(formData.year) || new Date().getFullYear(),
        budget: parseFloat(formData.budget) || 0,
        status: formData.status,
        targetMale: parseInt(formData.targetMale) || 0,
        targetFemale: parseInt(formData.targetFemale) || 0,
        actualMale: parseInt(formData.actualMale) || 0,
        actualFemale: parseInt(formData.actualFemale) || 0
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
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isViewer = hasRole('VIEWER') && !isAdmin && !hasRole('ENCODER');

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Program Monitoring</h1>
          <p className="text-sm font-medium text-muted-foreground">Track GAD-related programs and actual vs target impact</p>
        </div>
        {!isViewer && (
          <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary text-white rounded-lg shadow-sm font-semibold">
            <Plus className="h-4 w-4 mr-2" /> New Program
          </Button>
        )}
      </div>

      <div className="grid gap-6">
        {loading ? (
          <div className="py-24 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
        ) : programs.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground">No Programs Found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-6">
              There are no GAD programs recorded for this period yet.
            </p>
            {!isViewer && (
              <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary text-white rounded-lg font-semibold">
                <Plus className="h-4 w-4 mr-2" /> Create First Program
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {programs.map((p) => {
              const targetM = Number(p.targetMale) || 0;
              const targetF = Number(p.targetFemale) || 0;
              const actualM = Number(p.actualMale) || 0;
              const actualF = Number(p.actualFemale) || 0;
              const totalTarget = targetM + targetF;
              const totalActual = actualM + actualF;
              const progress = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
              const budgetVal = Number(p.budget ?? p.budgetTarget ?? 0);
              const statusNormalized = (p.status || 'ACTIVE').toUpperCase();

              return (
                <Card key={p.id} className="border-border shadow-sm h-full flex flex-col bg-card rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 group">
                  <header className="px-6 py-5 border-b border-border flex items-start justify-between">
                    <div className="space-y-1.5">
                      <h3 className="text-lg font-bold text-foreground line-clamp-1">{p.title}</h3>
                      <div className="flex gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground uppercase tracking-wider">
                          {p.sector || 'General'}
                        </span>
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest",
                          statusNormalized === 'ACTIVE' ? 'bg-accent text-primary' :
                          statusNormalized === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                        )}>
                          {statusNormalized}
                        </span>
                      </div>
                    </div>
                    <div className="p-2 bg-muted rounded-lg group-hover:bg-accent transition-colors">
                      <Target className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                    </div>
                  </header>
                  <CardContent className="flex-1 p-6 space-y-6">
                    <p className="text-xs font-medium text-muted-foreground leading-relaxed line-clamp-2">{p.description || 'No description provided.'}</p>

                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Beneficiary Reach</span>
                        <span className="text-xs font-bold text-foreground">{totalActual.toLocaleString()} / {totalTarget.toLocaleString()}</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted p-3 rounded-xl border border-border">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Budget</p>
                        <p className="text-sm font-bold text-foreground">₱{budgetVal.toLocaleString()}</p>
                      </div>
                      <div className="bg-muted p-3 rounded-xl border border-border">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Office</p>
                        <p className="text-sm font-bold text-foreground truncate">{p.office || p.officeName || 'General'}</p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isViewer && (
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(p)} className="h-9 px-4 text-primary font-semibold hover:bg-accent rounded-lg">
                          <Edit className="h-4 w-4 mr-2" /> Edit
                        </Button>
                      )}
                      {isAdmin && (
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="h-9 px-4 text-red-400 font-semibold hover:bg-red-50 rounded-lg">
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl rounded-2xl p-8 border-none shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground">{editingId ? 'Edit Program' : 'Create New Program'}</DialogTitle>
            <p className="text-sm text-muted-foreground">Define the scope and objectives for your GAD program.</p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-semibold text-foreground">Program Title <span className="text-red-500">*</span></Label>
              <Input id="title" className="rounded-lg border-input py-6" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold text-foreground">Description</Label>
              <Input id="description" className="rounded-lg border-input py-6" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="office" className="text-sm font-semibold text-foreground">Responsible Office <span className="text-red-500">*</span></Label>
                <Input id="office" className="rounded-lg border-input py-6" value={formData.office} onChange={e => setFormData({...formData, office: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sector" className="text-sm font-semibold text-foreground">Sector <span className="text-red-500">*</span></Label>
                <Select value={formData.sector} onValueChange={val => setFormData({...formData, sector: val})}>
                  <SelectTrigger className="rounded-lg border-input py-6"><SelectValue placeholder="Select sector" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {["Women", "Senior Citizens", "PWD", "Youth", "Indigenous Peoples", "Farmers", "Fisherfolk", "Urban Poor"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="budget" className="text-sm font-semibold text-foreground">Budget (₱) <span className="text-red-500">*</span></Label>
                <Input id="budget" type="number" step="0.01" className="rounded-lg border-input py-6" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year" className="text-sm font-semibold text-foreground">Year <span className="text-red-500">*</span></Label>
                <Input id="year" type="number" className="rounded-lg border-input py-6" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 p-6 rounded-xl bg-muted border border-border">
              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Target Beneficiaries</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Male</Label>
                    <Input className="h-10 rounded-lg border-input" type="number" value={formData.targetMale} onChange={e => setFormData({...formData, targetMale: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Female</Label>
                    <Input className="h-10 rounded-lg border-input" type="number" value={formData.targetFemale} onChange={e => setFormData({...formData, targetFemale: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Actual Beneficiaries</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Male</Label>
                    <Input className="h-10 rounded-lg border-input" type="number" value={formData.actualMale} onChange={e => setFormData({...formData, actualMale: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Female</Label>
                    <Input className="h-10 rounded-lg border-input" type="number" value={formData.actualFemale} onChange={e => setFormData({...formData, actualFemale: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Status</Label>
              <Select value={formData.status} onValueChange={val => setFormData({...formData, status: val})}>
                <SelectTrigger className="rounded-lg border-input py-6"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent className="rounded-xl">
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
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProgramMonitoring;
