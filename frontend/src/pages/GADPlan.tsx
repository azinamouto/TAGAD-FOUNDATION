import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../modules/auth/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { cn } from '../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, CheckCircle, Send, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';

const GADPlan: React.FC = () => {
  const { user, isAdmin, hasRole } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revisionId, setRevisionId] = useState<string | null>(null);
  const [revisionRemarks, setRevisionRemarks] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const defaultOfficeName = user?.office?.code || user?.office?.name || '';

  const [formData, setFormData] = useState({
    year: new Date().getFullYear().toString(),
    office: '',
    genderIssue: '',
    causeOfIssue: '',
    gadResult: '',
    activity: '',
    performanceIndicator: '',
    targetGroup: '',
    timeline: '',
    responsibleOffice: '',
    budget: '',
    fundSource: 'GAD Budget'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/gad-plans?year=${year}`);
      const payload = response.data?.data ?? response.data;
      setPlans(Array.isArray(payload) ? payload : []);
    } catch (error) {
      toast.error('Failed to fetch GAD plans');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      year: year.toString(),
      office: defaultOfficeName,
      genderIssue: '',
      causeOfIssue: '',
      gadResult: '',
      activity: '',
      performanceIndicator: '',
      targetGroup: '',
      timeline: '',
      responsibleOffice: defaultOfficeName,
      budget: '',
      fundSource: 'GAD Budget'
    });
    setIsModalOpen(true);
  };

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setFormData({
      year: (p.year ?? p.fiscalYear ?? year).toString(),
      office: p.office || defaultOfficeName,
      genderIssue: p.genderIssue || '',
      causeOfIssue: p.causeOfIssue || '',
      gadResult: p.gadResult || '',
      activity: p.activity || '',
      performanceIndicator: p.performanceIndicator || '',
      targetGroup: p.targetGroup || '',
      timeline: p.timeline || '',
      responsibleOffice: p.responsibleOffice || p.office || defaultOfficeName,
      budget: (p.budget ?? 0).toString(),
      fundSource: p.fundSource || 'GAD Budget'
    });
    setIsModalOpen(true);
  };

  const handleStatusUpdate = async (id: string, status: string, remarks?: string) => {
    if (status === 'REVISED' && !remarks?.trim()) return;
    setTransitioning(true);
    try {
      const action = status === 'SUBMITTED' ? 'submit' : status === 'APPROVED' ? 'approve' : 'revise';
      await api.post(`/gad-plans/${id}/${action}`, remarks ? { remarks: remarks.trim() } : {});
      setRevisionId(null);
      toast.success(`Plan ${status.toLowerCase()} successfully`);
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || error.response?.data?.message || 'Failed to update status';
      toast.error(msg);
    } finally {
      setTransitioning(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this plan entry?')) return;
    try {
      await api.delete(`/gad-plans/${id}`);
      toast.success('Deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        year: parseInt(formData.year) || year,
        budget: parseFloat(formData.budget) || 0
      };
      if (editingId) {
        await api.put(`/gad-plans/${editingId}`, payload);
        toast.success('Updated successfully');
      } else {
        await api.post('/gad-plans', payload);
        toast.success('Added successfully');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || error.response?.data?.message || 'Failed to save plan entry';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isViewer = hasRole('VIEWER') && !isAdmin && !hasRole('ENCODER');

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">GAD Plan & Budget (GPB)</h1>
          <p className="text-sm font-medium text-muted-foreground">Formulate and manage annual GAD plans</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-lg border border-border shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fiscal Year</span>
            <select 
              className="bg-transparent border-none focus:ring-0 text-sm font-bold text-primary cursor-pointer outline-none"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
            >
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {!isViewer && (
            <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary text-white rounded-lg shadow-sm font-semibold">
              <Plus className="h-4 w-4 mr-2" /> Add Entry
            </Button>
          )}
        </div>
      </div>

      <Card className="border-border shadow-sm bg-card rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="border-none">
                <TableHead className="text-[10px] font-bold uppercase tracking-wider py-4 pl-6 text-muted-foreground w-72">Gender Issue / Activity</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider py-4 text-muted-foreground">Office</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider py-4 text-muted-foreground">Budget</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider py-4 text-muted-foreground">Fund Source</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider py-4 text-muted-foreground">Status</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider py-4 pr-6 text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-24"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : plans.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-24 text-muted-foreground italic text-sm">No plans found for this year</TableCell></TableRow>
              ) : plans.map((p) => {
                const budgetVal = Number(p.budget ?? 0);
                const statusNormalized = (p.status || 'DRAFT').toUpperCase();
                return (
                  <TableRow key={p.id} className="hover:bg-accent/20 border-b border-border last:border-0 transition-colors group">
                    <TableCell className="py-4 pl-6">
                      <div className="font-bold text-foreground text-sm leading-tight">{p.genderIssue}</div>
                      <div className="text-[11px] text-primary font-bold mt-1.5 uppercase tracking-wide">{p.activity}</div>
                    </TableCell>
                    <TableCell className="text-foreground py-4">{p.office || defaultOfficeName}</TableCell>
                    <TableCell className="font-bold text-foreground whitespace-nowrap py-4">₱{budgetVal.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground text-xs font-medium py-4">{p.fundSource}</TableCell>
                    <TableCell className="py-4">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest",
                        statusNormalized === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 
                        statusNormalized === 'SUBMITTED' ? 'bg-accent text-primary' : 'bg-muted text-muted-foreground'
                      )}>
                        {statusNormalized}
                      </span>
                      {p.revisionRemarks && <p className="text-sm text-muted-foreground mt-2">Revision: {p.revisionRemarks}</p>}
                    </TableCell>
                    <TableCell className="text-right py-4 pr-6">
                      <div className="flex justify-end gap-1 opacity-100 transition-opacity">
                        {['DRAFT', 'REVISED'].includes(statusNormalized) && !isViewer && (
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(p)} className="h-8 w-8 text-primary hover:bg-card hover:shadow-sm"><Edit className="h-4 w-4" /></Button>
                        )}
                        {['DRAFT', 'REVISED'].includes(statusNormalized) && !isViewer && (
                          <Button variant="ghost" size="icon" aria-label={statusNormalized === 'REVISED' ? 'Resubmit plan' : 'Submit plan'} disabled={transitioning} onClick={() => handleStatusUpdate(p.id, 'SUBMITTED')} className="h-8 w-8 text-primary hover:bg-card hover:shadow-sm"><Send className="h-4 w-4" /></Button>
                        )}
                        {statusNormalized === 'SUBMITTED' && isAdmin && (
                          <Button variant="ghost" size="icon" aria-label="Approve plan" disabled={transitioning} onClick={() => handleStatusUpdate(p.id, 'APPROVED')} className="h-8 w-8 text-emerald-600 hover:bg-card hover:shadow-sm"><CheckCircle className="h-4 w-4" /></Button>
                        )}
                        {statusNormalized === 'SUBMITTED' && isAdmin && (
                          <Button variant="ghost" size="icon" aria-label="Request revision" disabled={transitioning} onClick={() => { setRevisionId(p.id); setRevisionRemarks(''); }} className="h-8 w-8 text-orange-500 hover:bg-card hover:shadow-sm"><Trash2 className="h-4 w-4 rotate-180" /></Button>
                        )}
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="h-8 w-8 text-red-400 hover:bg-card hover:shadow-sm"><Trash2 className="h-4 w-4" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!revisionId} onOpenChange={(open) => { if (!open && !transitioning) setRevisionId(null); }}>
        <DialogContent><DialogHeader><DialogTitle>Request plan revision</DialogTitle></DialogHeader>
          <form onSubmit={(event) => { event.preventDefault(); if (revisionId) void handleStatusUpdate(revisionId, 'REVISED', revisionRemarks); }} className="space-y-4">
            <Label htmlFor="revision-remarks">Revision remarks (required)</Label>
            <textarea id="revision-remarks" required maxLength={2000} value={revisionRemarks} onChange={event => setRevisionRemarks(event.target.value)} className="w-full border border-input bg-background p-3" />
            <Button type="submit" disabled={transitioning || !revisionRemarks.trim()}>Request revision</Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-8 border-none shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground">{editingId ? 'Edit GAD Plan Entry' : 'New GAD Plan Entry'}</DialogTitle>
            <p className="text-sm text-muted-foreground">Formulate the mandates and activities for the GAD budget cycle.</p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-8 pt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Budget Year <span className="text-red-500">*</span></Label>
                  <Input type="number" className="rounded-lg border-input py-6" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Gender Issue / GAD Mandate <span className="text-red-500">*</span></Label>
                  <Input className="rounded-lg border-input py-6" value={formData.genderIssue} onChange={e => setFormData({...formData, genderIssue: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Cause of Issue <span className="text-red-500">*</span></Label>
                  <Input className="rounded-lg border-input py-6" value={formData.causeOfIssue} onChange={e => setFormData({...formData, causeOfIssue: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">GAD Result / Outcome Statement <span className="text-red-500">*</span></Label>
                  <Input className="rounded-lg border-input py-6" value={formData.gadResult} onChange={e => setFormData({...formData, gadResult: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">GAD Activity / Program / Project <span className="text-red-500">*</span></Label>
                  <Input className="rounded-lg border-input py-6" value={formData.activity} onChange={e => setFormData({...formData, activity: e.target.value})} required />
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Performance Indicator <span className="text-red-500">*</span></Label>
                  <Input className="rounded-lg border-input py-6" value={formData.performanceIndicator} onChange={e => setFormData({...formData, performanceIndicator: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Target Group <span className="text-red-500">*</span></Label>
                  <Input className="rounded-lg border-input py-6" value={formData.targetGroup} onChange={e => setFormData({...formData, targetGroup: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Timeline <span className="text-red-500">*</span></Label>
                  <Input placeholder="e.g. Q1 2025" className="rounded-lg border-input py-6" value={formData.timeline} onChange={e => setFormData({...formData, timeline: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Estimated Budget (₱) <span className="text-red-500">*</span></Label>
                  <Input type="number" step="0.01" className="rounded-lg border-input py-6 font-bold text-primary" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Fund Source <span className="text-red-500">*</span></Label>
                  <Input className="rounded-lg border-input py-6" value={formData.fundSource} onChange={e => setFormData({...formData, fundSource: e.target.value})} required />
                </div>
              </div>
            </div>
            <DialogFooter className="pt-8 gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-lg text-muted-foreground font-semibold">Cancel</Button>
              <Button type="submit" className="bg-primary hover:bg-primary text-white rounded-lg shadow-sm font-bold min-w-[160px]" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Save Plan Entry'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GADPlan;
