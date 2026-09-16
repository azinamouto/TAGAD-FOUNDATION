import { z } from 'zod';

export const uuidSchema = z.string().uuid({ message: 'Invalid UUID format' });
export const uuidParamSchema = z.object({
  id: uuidSchema,
});
export const itemUuidParamSchema = z.object({
  id: uuidSchema,
  itemId: uuidSchema,
});

// Common pagination and filter schema
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  year: z.coerce.number().int().min(1990).max(2100).optional(),
  officeId: z.string().optional(),
  barangayId: z.string().optional(),
  sector: z.string().optional(),
  sex: z.enum(['MALE', 'FEMALE']).optional(),
  status: z.string().optional(),
  quarter: z.coerce.number().int().min(1).max(4).optional(),
});

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address format' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, { message: 'Refresh token is required' }),
});

// User schemas
export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  fullName: z.string().min(2, { message: 'Full name is required' }),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'ENCODER', 'VIEWER']).default('ENCODER'),
  officeId: z.string().optional().nullable(),
  barangayId: z.string().optional().nullable(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(2).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'ENCODER', 'VIEWER']).optional(),
  officeId: z.string().optional().nullable(),
  barangayId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

// Beneficiary schemas
export const createBeneficiarySchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' }),
  middleName: z.string().optional().nullable(),
  sex: z.enum(['MALE', 'FEMALE'], { message: 'Sex must be either MALE or FEMALE' }),
  age: z.coerce.number().int().min(0).max(150, { message: 'Age must be between 0 and 150' }),
  sector: z.string().min(1, { message: 'Sector is required' }),
  barangayId: z.string().min(1, { message: 'Barangay is required' }),
  officeId: z.string().optional().nullable(),
  contactNumber: z.string().optional().nullable(),
  addressStreet: z.string().optional().nullable(),
  householdId: z.string().optional().nullable(),
  birthdate: z.string().optional().nullable(),
});

export const updateBeneficiarySchema = createBeneficiarySchema.partial();

// Program schemas
export const createProgramSchema = z.object({
  title: z.string().min(3, { message: 'Program title must be at least 3 characters' }),
  description: z.string().optional().nullable(),
  sector: z.string().min(1, { message: 'Sector is required' }),
  fiscalYear: z.coerce.number().int().min(2000).max(2100),
  officeId: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']).default('ACTIVE'),
  budgetTarget: z.coerce.number().min(0).default(0),
  budgetActual: z.coerce.number().min(0).default(0),
  targetMale: z.coerce.number().int().min(0).default(0),
  targetFemale: z.coerce.number().int().min(0).default(0),
  actualMale: z.coerce.number().int().min(0).default(0),
  actualFemale: z.coerce.number().int().min(0).default(0),
});

export const updateProgramSchema = createProgramSchema.partial();

// GAD Plan Item Schema
export const gadPlanItemSchema = z.object({
  id: z.string().optional(),
  programId: z.string().optional().nullable(),
  genderIssue: z.string().min(1, { message: 'Gender issue is required' }),
  causeOfIssue: z.string().optional().nullable(),
  gadResult: z.string().min(1, { message: 'GAD result / objective is required' }),
  activity: z.string().min(1, { message: 'Activity is required' }),
  performanceIndicator: z.string().min(1, { message: 'Performance indicator is required' }),
  targetGroup: z.string().min(1, { message: 'Target group is required' }),
  timeline: z.string().min(1, { message: 'Timeline is required' }),
  responsibleOffice: z.string().min(1, { message: 'Responsible office is required' }),
  budget: z.coerce.number().min(0).default(0),
  fundSource: z.string().default('General Fund (5% GAD)'),
  hgdgScore: z.coerce.number().min(0).max(20).optional().nullable(),
  attributedPercentage: z.coerce.number().min(0).max(100).optional().nullable(),
});

// GAD Plan Schemas
export const createGADPlanSchema = z.object({
  officeId: z.string().optional(),
  fiscalYear: z.coerce.number().int().min(2000).max(2100),
  totalBudget: z.coerce.number().min(0).default(0),
  mandatoryGADPercentage: z.coerce.number().min(0).max(100).default(5.00),
  gadBudget: z.coerce.number().min(0).default(0),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REVISED']).default('DRAFT'),
  items: z.array(gadPlanItemSchema).optional(),
});

export const updateGADPlanSchema = createGADPlanSchema.partial();

export const updatePlanStatusSchema = z.object({
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REVISED']),
});

// Accomplishment Schemas
export const createAccomplishmentSchema = z.object({
  programId: z.string().optional().nullable(),
  gadPlanItemId: z.string().optional().nullable(),
  fiscalYear: z.coerce.number().int().min(2000).max(2100),
  quarter: z.coerce.number().int().min(1).max(4).optional().nullable(),
  actualOutput: z.string().min(1, { message: 'Actual output is required' }),
  actualMale: z.coerce.number().int().min(0).default(0),
  actualFemale: z.coerce.number().int().min(0).default(0),
  actualBudgetUsed: z.coerce.number().min(0).default(0),
  outputSummary: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  varianceExplanation: z.string().optional().nullable(),
});

export const updateAccomplishmentSchema = createAccomplishmentSchema.partial();

// Office Schemas
export const createOfficeSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(255),
  headName: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateOfficeSchema = createOfficeSchema.partial();

// Public Feedback Schema
export const publicFeedbackSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }).max(255),
  email: z.string().trim().email({ message: 'Valid email is required' }).max(255),
  subject: z.string().trim().min(3, { message: 'Subject is required' }).max(255),
  message: z.string().trim().min(10, { message: 'Message must be at least 10 characters' }).max(10000),
});
