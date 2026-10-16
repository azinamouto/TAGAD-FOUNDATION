import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../modules/auth/AuthContext';
import { Table as ShinyTable, TableBody as ShinyBody, TableHeader as ShinyHeader, TableHead as ShinyHead, TableRow as ShinyRow, TableCell as ShinyCell } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { cn } from '../lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Search, Plus, Edit, Archive, ChevronLeft, ChevronRight, Loader2, Upload } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { CsvImportModal } from '../modules/ingestion';

// Statutory Reference: 25 Official Barangays of Talibon, Bohol
const OFFICIAL_TALIBON_BARANGAYS = [
  "Bagacay", "Balintawak", "Burgos", "Busalian", "Calituban", "Cataban",
  "Guindacpan", "Magsaysay", "Mahanay", "Nocnocan", "Poblacion", "Rizal",
  "San Agustin", "San Carlos", "San Francisco", "San Isidro", "San Jose",
  "San Pedro", "San Roque", "Santo Niño", "Sikatuna", "Suba", "Tanghaligi",
  "Tilmobo", "Zamora"
];

const SECTORS = [
  "Women", "Senior Citizens", "PWD", "Youth", "Indigenous Peoples", "Farmers", "Fisherfolk", "Urban Poor"
];

const SEXES = ["MALE", "FEMALE"];

const DataEncoding: React.FC = () => {
  const { user, isAdmin, hasRole } = useAuth();
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ sex: '', barangay: '', sector: '' });
  const [barangayList, setBarangayList] = useState<string[]>(OFFICIAL_TALIBON_BARANGAYS);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const defaultOfficeName = user?.office?.code || user?.office?.name || '';

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    sex: '',
    age: '',
    barangay: '',
    sector: '',
    program: '',
    office: ''
  });

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const response = await api.get('/beneficiaries', {
        params: { ...filters, page, limit: 10, search }
      });
      const dataPayload = response.data?.data ?? [];
      const paginationPayload = response.data?.pagination ?? {
        total: Array.isArray(dataPayload) ? dataPayload.length : 0,
        page: page,
        totalPages: 1
      };
      setBeneficiaries(Array.isArray(dataPayload) ? dataPayload : []);
      setPagination(paginationPayload);
    } catch (error) {
      toast.error('Failed to fetch beneficiaries');
      setBeneficiaries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
    // Fetch canonical 25 Talibon barangays from API
    api.get('/public/barangays')
      .then((res) => {
        if (Array.isArray(res.data?.data) && res.data.data.length > 0) {
          const names = res.data.data.map((b: any) => b.name);
          setBarangayList(names);
        }
      })
      .catch(() => {
        // Fallback to statutory 25 Talibon barangays
        setBarangayList(OFFICIAL_TALIBON_BARANGAYS);
      });
  }, [filters, search]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      firstName: '',
      lastName: '',
      sex: '',
      age: '',
      barangay: '',
      sector: '',
      program: '',
      office: defaultOfficeName
    });
    setIsModalOpen(true);
  };

  const handleEdit = (b: any) => {
    setEditingId(b.id);
    setFormData({
      firstName: b.firstName || '',
      lastName: b.lastName || '',
      sex: b.sex || '',
      age: (b.age ?? '').toString(),
      barangay: b.barangay || b.barangayName || '',
      sector: b.sector || '',
      program: b.program || b.programName || '',
      office: b.office || b.officeName || defaultOfficeName
    });
    setIsModalOpen(true);
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this record?')) return;
    try {
      await api.delete(`/beneficiaries/${id}`);
      toast.success('Record archived successfully');
      fetchData(pagination.page);
    } catch (error) {
      toast.error('Failed to archive record');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        age: formData.age
      };
      if (editingId) {
        await api.put(`/beneficiaries/${editingId}`, payload);
        toast.success('Record updated successfully');
      } else {
        await api.post('/beneficiaries', payload);
        toast.success('Record added successfully');
      }
      setIsModalOpen(false);
      fetchData(pagination.page);
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || error.response?.data?.message || 'Failed to save record';
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Data Encoding</h1>
          <p className="text-sm font-medium text-muted-foreground">Manage and track GAD beneficiaries</p>
        </div>
        <div className="flex items-center gap-2">
          {!isViewer && (
            <>
              <Button
                onClick={() => setIsImportModalOpen(true)}
                variant="outline"
                className="border-primary text-primary hover:bg-accent rounded-lg shadow-xs font-semibold"
              >
                <Upload className="h-4 w-4 mr-2" /> Import CSV
              </Button>
              <Button
                onClick={handleOpenAdd}
                className="bg-primary hover:bg-primary text-white rounded-lg shadow-xs font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Beneficiary
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="border-border shadow-sm bg-card rounded-xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                className="pl-10 border-input focus:ring-primary rounded-lg transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={filters.sex} onValueChange={(val) => setFilters({...filters, sex: val === 'ALL' ? '' : val})}>
                <SelectTrigger className="w-full md:w-[150px] border-input rounded-lg">
                  <SelectValue placeholder="Sex" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL">All Sex</SelectItem>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.barangay} onValueChange={(val) => setFilters({...filters, barangay: val === 'ALL' ? '' : val})}>
                <SelectTrigger className="w-full md:w-[200px] border-input rounded-lg">
                  <SelectValue placeholder="Barangay" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] rounded-xl">
                  <SelectItem value="ALL">All Barangays</SelectItem>
                  {barangayList.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.sector} onValueChange={(val) => setFilters({...filters, sector: val === 'ALL' ? '' : val})}>
                <SelectTrigger className="w-full md:w-[200px] border-input rounded-lg">
                  <SelectValue placeholder="Sector" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL">All Sectors</SelectItem>
                  {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {(filters.sex || filters.barangay || filters.sector) && (
                <Button variant="ghost" onClick={() => setFilters({sex: '', barangay: '', sector: ''})} className="text-muted-foreground hover:bg-muted rounded-lg">
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-border overflow-hidden bg-card">
                <ShinyTable>
                  <ShinyHeader className="bg-muted/50">
                    <ShinyRow>
                      <ShinyHead className="text-[10px] font-bold uppercase tracking-wider py-4 pl-6 text-muted-foreground">Name</ShinyHead>
                      <ShinyHead className="text-[10px] font-bold uppercase tracking-wider py-4 text-muted-foreground">Sex</ShinyHead>
                      <ShinyHead className="text-[10px] font-bold uppercase tracking-wider py-4 text-muted-foreground">Age</ShinyHead>
                      <ShinyHead className="text-[10px] font-bold uppercase tracking-wider py-4 text-muted-foreground">Barangay</ShinyHead>
                      <ShinyHead className="text-[10px] font-bold uppercase tracking-wider py-4 text-muted-foreground">Sector</ShinyHead>
                      <ShinyHead className="text-[10px] font-bold uppercase tracking-wider py-4 text-muted-foreground">Program</ShinyHead>
                      <ShinyHead className="text-[10px] font-bold uppercase tracking-wider py-4 text-muted-foreground">Office</ShinyHead>
                      <ShinyHead className="text-[10px] font-bold uppercase tracking-wider py-4 text-muted-foreground">Date</ShinyHead>
                      <ShinyHead className="text-[10px] font-bold uppercase tracking-wider py-4 pr-6 text-muted-foreground text-right">Actions</ShinyHead>
                    </ShinyRow>
                  </ShinyHeader>
                  <ShinyBody>
                    {beneficiaries.length === 0 ? (
                      <ShinyRow>
                        <ShinyCell colSpan={9} className="text-center py-16 text-muted-foreground italic text-sm">
                          No beneficiary records found.
                        </ShinyCell>
                      </ShinyRow>
                    ) : (
                      beneficiaries.map((b) => (
                        <ShinyRow key={b.id} className="hover:bg-accent/20 border-b border-border last:border-0 transition-colors group">
                          <ShinyCell className="font-semibold text-foreground py-4 pl-6">{b.firstName} {b.lastName}</ShinyCell>
                          <ShinyCell className="py-4">
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold",
                              b.sex === 'MALE' ? 'bg-accent text-primary' : 'bg-pink-50 text-pink-600'
                            )}>
                              {b.sex}
                            </span>
                          </ShinyCell>
                          <ShinyCell className="text-foreground py-4">{b.age}</ShinyCell>
                          <ShinyCell className="text-foreground py-4">{b.barangay || b.barangayName || ''}</ShinyCell>
                          <ShinyCell className="text-foreground py-4">{b.sector}</ShinyCell>
                          <ShinyCell className="max-w-[180px] truncate text-foreground py-4">{b.program || b.programName || '-'}</ShinyCell>
                          <ShinyCell className="text-muted-foreground py-4">{b.office || b.officeName || defaultOfficeName}</ShinyCell>
                          <ShinyCell className="text-muted-foreground text-xs font-medium py-4">
                            {b.dateEncoded || b.createdAt ? new Date(b.dateEncoded || b.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                          </ShinyCell>
                          <ShinyCell className="text-right py-4 pr-6">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!isViewer && (
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(b)} className="h-8 w-8 text-primary hover:bg-card hover:shadow-sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {isAdmin && (
                                <Button variant="ghost" size="icon" onClick={() => handleArchive(b.id)} className="h-8 w-8 text-red-400 hover:bg-card hover:shadow-sm">
                                  <Archive className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </ShinyCell>
                        </ShinyRow>
                      ))
                    )}
                  </ShinyBody>
                </ShinyTable>
              </div>

              <div className="flex items-center justify-between mt-8 px-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Showing <span className="text-muted-foreground">{pagination.total > 0 ? (pagination.page - 1) * 10 + 1 : 0}</span> to <span className="text-muted-foreground">{Math.min(pagination.page * 10, pagination.total)}</span> of <span className="text-muted-foreground">{pagination.total}</span> records
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-input rounded-lg h-9 w-9 p-0"
                    disabled={pagination.page <= 1}
                    onClick={() => fetchData(pagination.page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="h-9 px-4 bg-card border border-border rounded-lg flex items-center shadow-sm">
                    <span className="text-xs font-bold text-foreground">Page {pagination.page} of {Math.max(pagination.totalPages, 1)}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-input rounded-lg h-9 w-9 p-0"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => fetchData(pagination.page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl rounded-2xl p-8 border-none shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground">{editingId ? 'Edit Beneficiary' : 'Add New Beneficiary'}</DialogTitle>
            <p className="text-sm text-muted-foreground">Complete the form below to register or update a record.</p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-semibold text-foreground">First Name <span className="text-red-500">*</span></Label>
                <Input id="firstName" className="rounded-lg border-input py-6" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-semibold text-foreground">Last Name <span className="text-red-500">*</span></Label>
                <Input id="lastName" className="rounded-lg border-input py-6" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Sex <span className="text-red-500">*</span></Label>
                <Select value={formData.sex} onValueChange={val => setFormData({...formData, sex: val})}>
                  <SelectTrigger className="rounded-lg border-input py-6"><SelectValue placeholder="Select sex" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {SEXES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="age" className="text-sm font-semibold text-foreground">Age <span className="text-red-500">*</span></Label>
                <Input id="age" type="number" className="rounded-lg border-input py-6" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Barangay <span className="text-red-500">*</span></Label>
                <Select value={formData.barangay} onValueChange={val => setFormData({...formData, barangay: val})}>
                  <SelectTrigger className="rounded-lg border-input py-6"><SelectValue placeholder="Select barangay" /></SelectTrigger>
                  <SelectContent className="max-h-[200px] rounded-xl">
                    {barangayList.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Sector <span className="text-red-500">*</span></Label>
                <Select value={formData.sector} onValueChange={val => setFormData({...formData, sector: val})}>
                  <SelectTrigger className="rounded-lg border-input py-6"><SelectValue placeholder="Select sector" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="program" className="text-sm font-semibold text-foreground">Program / Service Availed <span className="text-red-500">*</span></Label>
              <Input id="program" className="rounded-lg border-input py-6" value={formData.program} onChange={e => setFormData({...formData, program: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="office" className="text-sm font-semibold text-foreground">Responsible Office <span className="text-red-500">*</span></Label>
              <Input id="office" className="rounded-lg border-input py-6" value={formData.office} onChange={e => setFormData({...formData, office: e.target.value})} required />
            </div>
            <DialogFooter className="pt-6 gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-lg text-muted-foreground font-semibold">Cancel</Button>
              <Button type="submit" className="bg-primary hover:bg-primary text-white rounded-lg shadow-sm font-bold min-w-[140px]" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Save Record'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CSV Ingestion Wizard Modal */}
      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => fetchData(1)}
        userRole={isAdmin ? 'ADMIN' : hasRole('ENCODER') ? 'ENCODER' : 'VIEWER'}
        userOfficeName={defaultOfficeName}
      />
    </div>
  );
};

export default DataEncoding;
