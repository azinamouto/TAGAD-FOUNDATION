import React from 'react';
import {
  CsvDiscoveryResult,
  IngestionDatasetType,
  ReferenceOffice,
} from '../types';
import {
  CANONICAL_FIELD_OPTIONS,
  DATASET_TYPE_LABELS,
} from '../constants';
import { Button } from '../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent } from '../../../components/ui/card';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Building2,
  Lock,
  ArrowRight,
  ChevronLeft,
  Sparkles,
  Info,
  Layers,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface MappingStepProps {
  discovery: CsvDiscoveryResult;
  datasetType: IngestionDatasetType;
  onDatasetTypeChange: (type: IngestionDatasetType) => void;
  mappings: Record<string, string>;
  onMappingChange: (sourceCol: string, targetField: string) => void;
  offices: ReferenceOffice[];
  targetOfficeId: string | null;
  onTargetOfficeChange: (officeId: string | null) => void;
  userRole: string;
  userOfficeName?: string | null;
  onBack: () => void;
  onProceedToPreview: () => void;
  isPreviewing: boolean;
}

export const MappingStep: React.FC<MappingStepProps> = ({
  discovery,
  datasetType,
  onDatasetTypeChange,
  mappings,
  onMappingChange,
  offices,
  targetOfficeId,
  onTargetOfficeChange,
  userRole,
  userOfficeName,
  onBack,
  onProceedToPreview,
  isPreviewing,
}) => {
  const isEncoder = userRole === 'ENCODER' || userRole === 'encoder';
  const isAdmin = userRole === 'ADMIN' || userRole === 'admin' || userRole === 'super_admin';

  const canonicalOptions = CANONICAL_FIELD_OPTIONS[datasetType] || CANONICAL_FIELD_OPTIONS.BENEFICIARY_REGISTRY;
  const availableDatasetTypes: IngestionDatasetType[] = [
    'BENEFICIARY_REGISTRY',
    'HOUSEHOLD_SURVEY',
    'PROGRAM_CATALOG',
    'GAD_ACCOMPLISHMENT',
  ];

  // Count mapped, unmapped, and required fields status
  const requiredFields = canonicalOptions.filter((opt) => opt.required).map((opt) => opt.field);
  const mappedTargets = new Set(Object.values(mappings));
  const missingRequired = requiredFields.filter((req) => !mappedTargets.has(req));

  return (
    <div className="space-y-6 text-left">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[#111827]">Dataset Type & Schema Mapping</h3>
          <p className="text-xs text-[#6B7280]">
            Review detected columns and confirm how CSV columns map to canonical TAGAD records.
          </p>
        </div>

        {/* Readiness Badge */}
        <div className="flex items-center gap-2 bg-accent border border-primary px-3 py-1.5 rounded-xl">
          <Sparkles className="w-4 h-4 text-[#6366F1]" />
          <span className="text-xs font-semibold text-[#4F46E5]">
            Readiness Score: <strong className="font-bold">{discovery.summary.readinessScore}%</strong>
          </span>
        </div>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dataset Type Selector */}
        <Card className="border-border shadow-xs bg-card rounded-xl">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#6366F1]" />
                Target Dataset Type
              </label>
              {discovery.summary.datasetTypeGuess === datasetType && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                  Auto-Detected
                </Badge>
              )}
            </div>

            <Select
              value={datasetType}
              onValueChange={(val) => onDatasetTypeChange(val as IngestionDatasetType)}
            >
              <SelectTrigger className="w-full text-xs font-semibold rounded-lg border-border">
                <SelectValue placeholder="Select Dataset Type" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {availableDatasetTypes.map((type) => (
                  <SelectItem key={type} value={type} className="text-xs">
                    <div className="flex flex-col text-left py-0.5">
                      <span className="font-semibold text-foreground">{DATASET_TYPE_LABELS[type].label}</span>
                      <span className="text-[10px] text-muted-foreground">{DATASET_TYPE_LABELS[type].description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Office Scope Configuration */}
        <Card className="border-border shadow-xs bg-card rounded-xl">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#6366F1]" />
                Responsible Office Scope
              </label>
              {isEncoder ? (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Account Enforced
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-accent text-[#6366F1] border-primary text-[10px] font-bold">
                  Cross-Office Authorized
                </Badge>
              )}
            </div>

            {isEncoder ? (
              <div className="bg-muted border border-border rounded-lg p-2.5 text-xs text-foreground space-y-1">
                <p className="font-bold text-foreground">{userOfficeName || 'Assigned LGU Department'}</p>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Records will be stamped with your authenticated office. CSV office columns cannot override authorization.
                </p>
              </div>
            ) : (
              <Select
                value={targetOfficeId || 'AUTO'}
                onValueChange={(val) => onTargetOfficeChange(val === 'AUTO' ? null : val)}
              >
                <SelectTrigger className="w-full text-xs font-semibold rounded-lg border-border">
                  <SelectValue placeholder="Auto-detect from CSV column" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="AUTO" className="text-xs font-semibold text-foreground">
                    Auto-resolve from CSV Office column
                  </SelectItem>
                  {offices.map((off) => (
                    <SelectItem key={off.id} value={off.id} className="text-xs">
                      {off.code} — {off.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Missing Required Fields Notice */}
      {missingRequired.length > 0 && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-800 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Required Field Mapping Notice</p>
            <p>
              The following required canonical fields are currently unmapped:{' '}
              <strong>{missingRequired.join(', ')}</strong>. Please assign corresponding CSV columns below or verify data format.
            </p>
          </div>
        </div>
      )}

      {/* Mapping Matrix Table */}
      <div className="border border-border rounded-xl overflow-hidden bg-card shadow-xs">
        <div className="bg-muted/80 px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">
            CSV Column Mapping Matrix ({discovery.rawHeaders.length} Columns)
          </span>
          <span className="text-[11px] text-muted-foreground">
            Total records: {discovery.totalRows.toLocaleString()} rows
          </span>
        </div>

        <div className="overflow-x-auto max-h-[380px] overflow-y-auto divide-y divide-border">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted/50 sticky top-0 z-10 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-4 w-[25%]">CSV Source Column</th>
                <th className="py-2.5 px-4 w-[20%]">Detected Type / Sample</th>
                <th className="py-2.5 px-4 w-[35%]">TAGAD Canonical Destination</th>
                <th className="py-2.5 px-4 w-[20%] text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {discovery.rawHeaders.map((header) => {
                const profile = discovery.columns[header];
                const currentTarget = mappings[header] || '__IGNORE__';
                const isIgnored = currentTarget === '__IGNORE__';
                const isCustomAttr = currentTarget.startsWith('metadata.');
                const matchedOption = canonicalOptions.find((opt) => opt.field === currentTarget);
                const isRequiredField = matchedOption?.required ?? false;

                const sampleValuesPreview = (profile?.sampleValues || []).slice(0, 3).join(', ');

                return (
                  <tr key={header} className="hover:bg-accent/20 transition-colors">
                    {/* Source Column */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-foreground font-mono text-xs">{header}</span>
                        {profile?.uniqueValuesCount !== undefined && (
                          <p className="text-[10px] text-muted-foreground">
                            {profile.nonEmptyValues}/{discovery.totalRows} non-empty ({profile.uniqueValuesCount} unique)
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Detected Type & Sample */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-mono uppercase bg-muted text-foreground font-semibold"
                        >
                          {profile?.detectedType || 'string'}
                        </Badge>
                        {sampleValuesPreview && (
                          <p className="text-[10px] text-muted-foreground truncate max-w-[180px]" title={sampleValuesPreview}>
                            Sample: {sampleValuesPreview}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Target Dropdown */}
                    <td className="py-3 px-4">
                      <Select
                        value={currentTarget}
                        onValueChange={(val) => onMappingChange(header, val)}
                      >
                        <SelectTrigger className="w-full text-xs font-semibold rounded-lg border-border h-8">
                          <SelectValue placeholder="Select Destination Field" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[260px] rounded-xl">
                          <SelectItem value="__IGNORE__" className="text-xs text-muted-foreground italic">
                            🚫 Ignore / Do Not Import
                          </SelectItem>
                          <SelectItem value={`metadata.${header}`} className="text-xs text-purple-700 font-medium">
                            🏷️ Save as Custom Attribute ({header})
                          </SelectItem>
                          <div className="h-[1px] bg-muted my-1" />
                          <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Canonical Fields ({datasetType})
                          </div>
                          {canonicalOptions.map((opt) => (
                            <SelectItem key={opt.field} value={opt.field} className="text-xs">
                              <span className={cn('font-medium', opt.required && 'text-[#6366F1] font-bold')}>
                                {opt.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 text-right">
                      {isIgnored ? (
                        <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px]">
                          Ignored
                        </Badge>
                      ) : isCustomAttr ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-semibold">
                          Custom Attr
                        </Badge>
                      ) : isRequiredField ? (
                        <Badge variant="outline" className="bg-accent text-[#4F46E5] border-primary text-[10px] font-bold flex items-center gap-1 ml-auto">
                          <CheckCircle2 className="w-3 h-3 text-[#6366F1]" /> Required Mapped
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold flex items-center gap-1 ml-auto">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Optional
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isPreviewing}
          className="rounded-lg text-xs font-semibold border-border"
        >
          <ChevronLeft className="w-4 h-4 mr-1.5" />
          Back to Upload
        </Button>

        <Button
          type="button"
          onClick={onProceedToPreview}
          disabled={isPreviewing}
          className="bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-lg font-bold px-6 py-2 shadow-xs text-xs flex items-center gap-2"
        >
          {isPreviewing ? (
            'Generating Validation Matrix...'
          ) : (
            <>
              Generate Validation Preview
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
