import {
  StatisticalTableClassification,
  StatisticalPublicationStatus,
  StatisticalVerificationStatus,
} from '@prisma/client';
import prisma, { isDatabaseConnected } from '../lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export interface StatisticalTableCatalogItem {
  tableNumber: number;
  tableCode: string;
  title: string;
  domain: string;
  classification: StatisticalTableClassification;
  description: string;
  expectedUnit: string;
  rowGrain: string;
  dimensionsSummary: string;
  measureStructure: string;
  sourceFormat: string;
  verificationStatus: StatisticalVerificationStatus;
}

export const STATISTICAL_69_TABLE_CATALOG: StatisticalTableCatalogItem[] = [
  {
    tableNumber: 1,
    tableCode: 'STAT-TAB-01',
    title: 'Summary of Household and Population Statistics',
    domain: 'Demographics & Population',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Aggregated summary counts of total households and total population by barangay.',
    expectedUnit: 'count (households / persons)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 2,
    tableCode: 'STAT-TAB-02',
    title: 'Households by Tenure Status of Housing Unit and Lot',
    domain: 'Living Conditions & Housing',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Distribution of households across ownership/tenure categories (owned, rented, rent-free).',
    expectedUnit: 'households',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 3,
    tableCode: 'STAT-TAB-03',
    title: 'Households by Type of Building and Construction Material of Outer Walls and Roof',
    domain: 'Living Conditions & Housing',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Households classified by building structural type and physical materials (strong, light, salvage).',
    expectedUnit: 'households',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 4,
    tableCode: 'STAT-TAB-04',
    title: 'Households by Main Source of Water Supply for Drinking',
    domain: 'Water & Sanitation',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Distribution of households by primary drinking water source (piped, protected well, spring, bottled).',
    expectedUnit: 'households',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 5,
    tableCode: 'STAT-TAB-05',
    title: 'Households by Main Source of Water Supply for General Domestic Use',
    domain: 'Water & Sanitation',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Distribution of households by secondary water source used for cooking, bathing, and cleaning.',
    expectedUnit: 'households',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 6,
    tableCode: 'STAT-TAB-06',
    title: 'Households with Access to Improved Sanitation and Type of Toilet Facility',
    domain: 'Water & Sanitation',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Classification of households according to flush, pour-flush, ventilated pit, or open defecation status.',
    expectedUnit: 'households',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 7,
    tableCode: 'STAT-TAB-07',
    title: 'Proportion of Households with Access to Piped Water',
    domain: 'Water & Sanitation',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Percentage of households connected to Level III piped water distribution systems.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 8,
    tableCode: 'STAT-TAB-08',
    title: 'Proportion of Households with Sanitary Toilet Facilities',
    domain: 'Water & Sanitation',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Percentage of households utilizing approved sanitary toilet facilities complying with DOH standards.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 9,
    tableCode: 'STAT-TAB-09',
    title: 'Households by Main Source of Lighting and Electricity',
    domain: 'Energy & Utilities',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Households categorized by lighting power source (electric grid, solar home system, kerosene, battery).',
    expectedUnit: 'households',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 10,
    tableCode: 'STAT-TAB-10',
    title: 'Proportion of Households Connected to Power Grid',
    domain: 'Energy & Utilities',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Percentage of total households with active electrical grid connections (e.g. BOHECO II).',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 11,
    tableCode: 'STAT-TAB-11',
    title: 'Households by Usual Manner of Garbage and Solid Waste Disposal',
    domain: 'Waste Management & Environment',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Disposal methods including municipal collection, composting, recycling, burning, and open dumping.',
    expectedUnit: 'households',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 12,
    tableCode: 'STAT-TAB-12',
    title: 'Households by Internet Connectivity and Type of Service',
    domain: 'ICT & Connectivity',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Households with access to fixed fiber/DSL, mobile cellular broadband, satellite, or community Wi-Fi.',
    expectedUnit: 'households',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 13,
    tableCode: 'STAT-TAB-13',
    title: 'Proportion of Households with Internet Access',
    domain: 'ICT & Connectivity',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Percentage of households reporting regular home internet connectivity.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 14,
    tableCode: 'STAT-TAB-14',
    title: 'Households by Possession of Financial and Transaction Accounts',
    domain: 'Financial Inclusion & Social Protection',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Households with at least one member possessing a commercial bank, digital wallet (e-money), or coop account.',
    expectedUnit: 'households',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 15,
    tableCode: 'STAT-TAB-15',
    title: 'Proportion of Adult Population with Formal Financial Accounts',
    domain: 'Financial Inclusion & Social Protection',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Financial inclusion rate among individuals aged 15 years and older disaggregated by sex.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 16,
    tableCode: 'STAT-TAB-16',
    title: 'Households Experiencing Food Insecurity by Severity (FIES)',
    domain: 'Food Security & Nutrition',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Households categorized under mild, moderate, or severe food insecurity based on Food Insecurity Experience Scale.',
    expectedUnit: 'households',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 17,
    tableCode: 'STAT-TAB-17',
    title: 'Prevalence of Moderate or Severe Food Insecurity in the Population',
    domain: 'Food Security & Nutrition',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Proportion of municipal population experiencing moderate or severe food shortages in past 12 months.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 18,
    tableCode: 'STAT-TAB-18',
    title: 'Individuals Needing Medical Treatment in the Past 12 Months by Sex',
    domain: 'Health & Vulnerable Groups',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Count of persons who experienced illness, injury, or medical condition requiring clinical attention.',
    expectedUnit: 'persons',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 19,
    tableCode: 'STAT-TAB-19',
    title: 'Individuals Availing Medical Treatment in Health Facilities by Facility Type',
    domain: 'Health & Vulnerable Groups',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Distribution of patients utilizing Barangay Health Stations, Rural Health Units, district hospitals, or private clinics.',
    expectedUnit: 'persons',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 20,
    tableCode: 'STAT-TAB-20',
    title: 'Population Covered by Health Insurance (PhilHealth / Private HMO) by Sex',
    domain: 'Financial Inclusion & Social Protection',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Individuals enrolled in PhilHealth (Direct Contributor, Indigent, Senior) or private health maintenance plans.',
    expectedUnit: 'persons',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 21,
    tableCode: 'STAT-TAB-21',
    title: 'Prevalence of Malnutrition Among Children Under 5 Years of Age',
    domain: 'Food Security & Nutrition',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Stunting (height-for-age), wasting (weight-for-height), and underweight rates among children under 5.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 22,
    tableCode: 'STAT-TAB-22',
    title: 'Persons with Disability (PWD) by Type of Functional Difficulty and Sex',
    domain: 'Health & Vulnerable Groups',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Washington Group domain breakdown: vision, hearing, mobility, cognition, self-care, and communication difficulties.',
    expectedUnit: 'persons',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 23,
    tableCode: 'STAT-TAB-23',
    title: 'Proportion of Population with Functional Disabilities by Barangay',
    domain: 'Health & Vulnerable Groups',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Percentage of total residents experiencing moderate to severe functional disabilities.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 24,
    tableCode: 'STAT-TAB-24',
    title: 'Household Population by Sex and Barangay',
    domain: 'Demographics & Population',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Baseline disaggregation of male and female residents across the 25 official Talibon barangays.',
    expectedUnit: 'persons',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 25,
    tableCode: 'STAT-TAB-25',
    title: 'Population Distribution by Five-Year Age Group and Sex',
    domain: 'Demographics & Population',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Population age-sex pyramid data structured in 5-year cohorts (0-4, 5-9, ..., 80+).',
    expectedUnit: 'persons',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 26,
    tableCode: 'STAT-TAB-26',
    title: 'Senior Citizens Population (Aged 60 and Over) by Sex and Barangay',
    domain: 'Demographics & Population',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Counts of senior citizens disaggregated by male, female, and barangay location.',
    expectedUnit: 'persons',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 27,
    tableCode: 'STAT-TAB-27',
    title: 'Household Population by Indigenous Peoples (IP) / Ethnic Affiliation and Sex',
    domain: 'Demographics & Population',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Disaggregation of residents belonging to recognized indigenous cultural communities or ethnic groups.',
    expectedUnit: 'persons',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 28,
    tableCode: 'STAT-TAB-28',
    title: 'Teenage Pregnancy Prevalence Among Females Aged 10 to 19 Years',
    domain: 'Health & Vulnerable Groups',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Rate of live births and pregnancies recorded among adolescent girls aged 10-19 years.',
    expectedUnit: 'rate / percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 29,
    tableCode: 'STAT-TAB-29',
    title: 'Solo Parents Registered and Active by Sex and Barangay',
    domain: 'Health & Vulnerable Groups',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Registered solo parents under RA 11861 disaggregated by female/male heads of single-parent households.',
    expectedUnit: 'persons',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 30,
    tableCode: 'STAT-TAB-30',
    title: 'Labor Force Participation Rate (LFPR) by Sex',
    domain: 'Labor, Employment & Economic Sectors',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Proportion of working-age population (15+) actively employed or seeking work disaggregated by sex.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 31,
    tableCode: 'STAT-TAB-31',
    title: 'Employment Rate by Sex',
    domain: 'Labor, Employment & Economic Sectors',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Proportion of labor force participants who are gainfully employed disaggregated by sex.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 32,
    tableCode: 'STAT-TAB-32',
    title: 'Unemployment Rate by Sex',
    domain: 'Labor, Employment & Economic Sectors',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Proportion of labor force participants without work who are available and actively looking for work.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 33,
    tableCode: 'STAT-TAB-33',
    title: 'Underemployment Rate by Sex',
    domain: 'Labor, Employment & Economic Sectors',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Proportion of employed persons desiring additional hours of work or an additional job.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 34,
    tableCode: 'STAT-TAB-34',
    title: 'Employed Persons by Major Industry Group and Sex',
    domain: 'Labor, Employment & Economic Sectors',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Employment counts across Agriculture/Fishery, Industry, Manufacturing, and Services sectors by sex.',
    expectedUnit: 'persons',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 35,
    tableCode: 'STAT-TAB-35',
    title: 'Employed Persons by Major Occupation Group (PSOC) and Sex',
    domain: 'Labor, Employment & Economic Sectors',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Occupational groups including managers, professionals, technicians, clerical, service, and elementary trades.',
    expectedUnit: 'persons',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 36,
    tableCode: 'STAT-TAB-36',
    title: 'Employed Persons by Class of Worker and Sex',
    domain: 'Labor, Employment & Economic Sectors',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Class of worker: wage/salary workers (private/gov), self-employed, employers, and unpaid family workers.',
    expectedUnit: 'persons',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 37,
    tableCode: 'STAT-TAB-37',
    title: 'Working Children (5 to 17 Years Old) by Sex and Age Group',
    domain: 'Labor, Employment & Economic Sectors',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Minors aged 5-17 engaged in economic work activity disaggregated by sex.',
    expectedUnit: 'persons',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 38,
    tableCode: 'STAT-TAB-38',
    title: 'Proportion of Working Children Engaged in Child Labor',
    domain: 'Labor, Employment & Economic Sectors',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Percentage of working minors performing hazardous work or excessive working hours prohibited under RA 9231.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 39,
    tableCode: 'STAT-TAB-39',
    title: 'Youth (15 to 24 Years Old) Not in Employment, Education, or Training (NEET) Rate by Sex',
    domain: 'Labor, Employment & Economic Sectors',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Proportion of youth population detached from both education and the formal labor market.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 40,
    tableCode: 'STAT-TAB-40',
    title: 'Registered Farmers and Agricultural Workers by Sex and Commodity',
    domain: 'Labor, Employment & Economic Sectors',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'RSBSA registered farmers (crop, livestock, poultry) disaggregated by male and female workers.',
    expectedUnit: 'persons',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 41,
    tableCode: 'STAT-TAB-41',
    title: 'Registered Fisherfolk (FishR) by Sex and Coastal Barangay',
    domain: 'Labor, Employment & Economic Sectors',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Municipal capture fisherfolk, seaweed growers, and gleaners disaggregated by sex across coastal barangays.',
    expectedUnit: 'persons',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 42,
    tableCode: 'STAT-TAB-42',
    title: 'Informal Sector Workers by Major Activity and Sex',
    domain: 'Labor, Employment & Economic Sectors',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Vendors, tricycle operators, domestic workers, and unregistered micro-entrepreneurs by sex.',
    expectedUnit: 'persons',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 43,
    tableCode: 'STAT-TAB-43',
    title: 'Overseas Filipino Workers (OFWs) by Destination and Sex',
    domain: 'Labor, Employment & Economic Sectors',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Talibon residents working abroad disaggregated by land-based/sea-based contracts and sex.',
    expectedUnit: 'persons',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 44,
    tableCode: 'STAT-TAB-44',
    title: 'Micro, Small, and Medium Enterprises (MSMEs) by Sex of Business Owner',
    domain: 'Labor, Employment & Economic Sectors',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Locally registered commercial business establishments disaggregated by female-owned and male-owned enterprises.',
    expectedUnit: 'enterprises',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 45,
    tableCode: 'STAT-TAB-45',
    title: 'Women in Managerial and Leadership Positions in Public and Private Sectors',
    domain: 'Labor, Employment & Economic Sectors',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Proportion of supervisory, managerial, and executive roles occupied by women in local government and commerce.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 46,
    tableCode: 'STAT-TAB-46',
    title: 'School Attendance Rate of Children (Aged 5 to 17 Years) by Sex and Level',
    domain: 'Education & Literacy',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Proportion of children actively attending kindergarten, elementary, junior high, or senior high school.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 47,
    tableCode: 'STAT-TAB-47',
    title: 'Basic Literacy Rate of Population 10 Years Old and Over by Sex',
    domain: 'Education & Literacy',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Percentage of population 10+ who can read and write a simple message in any language or dialect.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 48,
    tableCode: 'STAT-TAB-48',
    title: 'Functional Literacy Rate of Population 10 to 64 Years Old by Sex',
    domain: 'Education & Literacy',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Percentage of population possessing reading, writing, comprehension, and numeracy skills.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 49,
    tableCode: 'STAT-TAB-49',
    title: 'Highest Educational Attainment of Population Aged 15 and Over by Sex',
    domain: 'Education & Literacy',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Educational attainment distribution: no grade completed, elementary, high school, TVET, college undergraduate, degree holder.',
    expectedUnit: 'persons',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 50,
    tableCode: 'STAT-TAB-50',
    title: 'Technical-Vocational Education and Training (TVET) Graduates by Course and Sex',
    domain: 'Education & Literacy',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'TESDA certified graduates disaggregated by NC certification course and sex.',
    expectedUnit: 'persons',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 51,
    tableCode: 'STAT-TAB-51',
    title: 'Maternal Mortality Ratio (MMR) per 100,000 Live Births',
    domain: 'Health & Vulnerable Groups',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Annual maternal deaths related to pregnancy or child delivery per 100,000 live births.',
    expectedUnit: 'ratio (per 100k live births)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 52,
    tableCode: 'STAT-TAB-52',
    title: 'Households with Access to Safe Drinking Water by Level of Service (Level 1, 2, 3)',
    domain: 'Water & Sanitation',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Service level breakdown: Level 1 (point source), Level 2 (communal faucet), Level 3 (individual house connection).',
    expectedUnit: 'households',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 53,
    tableCode: 'STAT-TAB-53',
    title: 'Proportion of Population with Access to Electricity by Barangay',
    domain: 'Energy & Utilities',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Percentage of residents dwelling in electrified households across all 25 barangays.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 54,
    tableCode: 'STAT-TAB-54',
    title: 'Disaster Preparedness: Households with Emergency Survival Kits by Barangay',
    domain: 'Disaster Risk Reduction & Safety',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Households maintaining "Go-Bags" containing first-aid, food, water, flashlight, and battery supplies.',
    expectedUnit: 'households',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 55,
    tableCode: 'STAT-TAB-55',
    title: 'Evacuation Center Capacity and Designated Safe Shelters by Barangay',
    domain: 'Disaster Risk Reduction & Safety',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Designated permanent evacuation centers, rated capacity in persons, and gender-segregated toilet availability.',
    expectedUnit: 'facilities / capacity count',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 56,
    tableCode: 'STAT-TAB-56',
    title: 'SDG 1.2.1: Proportion of Population Living Below the Municipal Poverty Threshold',
    domain: 'Poverty & SDG Indicators',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Percentage of population whose per capita income fails to meet the official PSA poverty threshold.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 57,
    tableCode: 'STAT-TAB-57',
    title: 'SDG 1.2.2: Proportion of Men, Women, and Children Living in Multidimensional Poverty',
    domain: 'Poverty & SDG Indicators',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Multidimensional Poverty Index (MPI) measuring simultaneous deprivations in education, health, and living standards.',
    expectedUnit: 'percent (%) / index',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 58,
    tableCode: 'STAT-TAB-58',
    title: 'SDG 3.1.2: Proportion of Births Attended by Skilled Health Personnel',
    domain: 'Health & Vulnerable Groups',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Percentage of live deliveries assisted by certified doctors, nurses, or licensed midwives.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 59,
    tableCode: 'STAT-TAB-59',
    title: 'SDG 3.2.1: Under-Five Mortality Rate per 1,000 Live Births',
    domain: 'Health & Vulnerable Groups',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Probability of a child dying before reaching 5 years of age per 1,000 live births.',
    expectedUnit: 'rate (per 1,000 live births)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 60,
    tableCode: 'STAT-TAB-60',
    title: 'SDG 3.2.2: Neonatal Mortality Rate per 1,000 Live Births',
    domain: 'Health & Vulnerable Groups',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Deaths of infants within the first 28 days of life per 1,000 live births.',
    expectedUnit: 'rate (per 1,000 live births)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 61,
    tableCode: 'STAT-TAB-61',
    title: 'SDG 4.1.2: Completion Rate for Primary and Secondary Education by Sex',
    domain: 'Education & Literacy',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Percentage of a cohort of students who complete the final grade of primary and secondary schooling.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 62,
    tableCode: 'STAT-TAB-62',
    title: 'SDG 5.5.2: Proportion of Women in Managerial and Decision-Making Positions',
    domain: 'Labor, Employment & Economic Sectors',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Share of senior and middle management positions held by women across local institutions.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 63,
    tableCode: 'STAT-TAB-63',
    title: 'SDG 6.1.1: Proportion of Population Using Safely Managed Drinking Water Services',
    domain: 'Water & Sanitation',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Percentage of population using drinking water from an improved source located on premises, available when needed, and free from contamination.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 64,
    tableCode: 'STAT-TAB-64',
    title: 'SDG 6.2.1: Proportion of Population Using Safely Managed Sanitation Services',
    domain: 'Water & Sanitation',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Percentage of population utilizing improved sanitation facilities not shared with other households where excreta are safely disposed.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 65,
    tableCode: 'STAT-TAB-65',
    title: 'SDG 7.1.1: Proportion of Population with Access to Clean Electricity and Lighting',
    domain: 'Energy & Utilities',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Share of residents with continuous, reliable, and clean electrical services.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 66,
    tableCode: 'STAT-TAB-66',
    title: 'SDG 8.5.2: Unemployment Rate Disaggregated by Sex, Age, and Persons with Disabilities',
    domain: 'Labor, Employment & Economic Sectors',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Unemployment rate across vulnerable demographic cohorts (youth, elderly, PWDs) by sex.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 67,
    tableCode: 'STAT-TAB-67',
    title: 'SDG 8.6.1: Proportion of Youth (Aged 15 to 24) Not in Education, Employment, or Training',
    domain: 'Labor, Employment & Economic Sectors',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'SDG benchmark indicator measuring disconnected youth disaggregated by sex.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 68,
    tableCode: 'STAT-TAB-68',
    title: 'SDG 11.1.1: Proportion of Urban / Barangay Population Living in Informal Settlements',
    domain: 'Disaster Risk Reduction & Safety',
    classification: StatisticalTableClassification.INDICATOR,
    description: 'Percentage of households living in informal settlements or inadequate housing conditions without legal tenure.',
    expectedUnit: 'percent (%)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
  {
    tableNumber: 69,
    tableCode: 'STAT-TAB-69',
    title: 'SDG 16.1.1: Number of Victims of Violence, Sexual Abuse, and VAWC Crimes by Sex',
    domain: 'Disaster Risk Reduction & Safety',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: 'Reported incidents of gender-based violence (RA 9262 VAWC, RA 8353 rape, RA 7610 child abuse) by sex of victim and barangay.',
    expectedUnit: 'count (incidents / victims)',
    rowGrain: 'UNVERIFIED',
    dimensionsSummary: 'UNVERIFIED',
    measureStructure: 'UNVERIFIED',
    sourceFormat: 'UNVERIFIED',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  },
];

// In-Memory Catalog State for development/testing
let inMemoryTableDefinitions = [...STATISTICAL_69_TABLE_CATALOG].map((item) => ({
  ...item,
  id: `stat-def-${item.tableNumber}`,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

let inMemoryDatasets: any[] = [];
let inMemoryIndicators: any[] = [];
let inMemoryDimensions: any[] = [
  {
    id: 'dim-sex',
    dimensionCode: 'DIM_SEX',
    name: 'Sex',
    description: 'Biological sex classification (Male, Female)',
    dataType: 'string',
    vocabularySource: 'PSA / CBMS standard codebook',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'dim-age-group',
    dimensionCode: 'DIM_AGE_GROUP',
    name: 'Age Group',
    description: 'Five-year and statutory age cohorts (0-4, 5-9, 15-24, 60+)',
    dataType: 'string',
    vocabularySource: 'PSA standardized demographic brackets',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'dim-barangay',
    dimensionCode: 'DIM_BARANGAY',
    name: 'Barangay',
    description: '25 official Talibon administrative barangays',
    dataType: 'string(UUID)',
    vocabularySource: 'LGU Talibon Official Registry',
    verificationStatus: StatisticalVerificationStatus.VERIFIED,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'dim-tenure',
    dimensionCode: 'DIM_TENURE_STATUS',
    name: 'Tenure Status',
    description: 'Housing and land tenure classification',
    dataType: 'string',
    vocabularySource: 'CBMS Section B codebook',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'dim-water-source',
    dimensionCode: 'DIM_WATER_SOURCE',
    name: 'Water Supply Source',
    description: 'Primary drinking and general domestic water source classification',
    dataType: 'string',
    vocabularySource: 'CBMS Section C codebook',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'dim-sanitation',
    dimensionCode: 'DIM_TOILET_FACILITY',
    name: 'Sanitation / Toilet Type',
    description: 'Sanitary toilet and sanitation service classification',
    dataType: 'string',
    vocabularySource: 'DOH / CBMS Section C codebook',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

let inMemoryObservations: any[] = [];
let inMemoryProvenances: any[] = [];

export class StatisticalCatalogService {
  /**
   * Deterministically seeds or verifies the 69 statistical table definitions.
   * Safe to execute multiple times (idempotent).
   */
  public static async seedCatalog(): Promise<{ count: number; seeded: number }> {
    let seededCount = 0;

    if (isDatabaseConnected()) {
      for (const item of STATISTICAL_69_TABLE_CATALOG) {
        const existing = await prisma.statisticalTableDefinition.findUnique({
          where: { tableNumber: item.tableNumber },
        });

        if (!existing) {
          await prisma.statisticalTableDefinition.create({
            data: {
              tableNumber: item.tableNumber,
              tableCode: item.tableCode,
              title: item.title,
              domain: item.domain,
              classification: item.classification,
              description: item.description,
              expectedUnit: item.expectedUnit,
              rowGrain: item.rowGrain,
              dimensionsSummary: item.dimensionsSummary,
              measureStructure: item.measureStructure,
              sourceFormat: item.sourceFormat,
              verificationStatus: item.verificationStatus,
            },
          });
          seededCount++;
        }
      }
    } else {
      // In-memory sync
      seededCount = STATISTICAL_69_TABLE_CATALOG.length;
    }

    return {
      count: STATISTICAL_69_TABLE_CATALOG.length,
      seeded: seededCount,
    };
  }

  /**
   * Retrieves registered statistical table definitions with rich filtering & pagination.
   */
  public static async getAllTableDefinitions(params: {
    domain?: string;
    classification?: StatisticalTableClassification;
    search?: string;
    verificationStatus?: StatisticalVerificationStatus;
    page: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>;
  public static async getAllTableDefinitions(params?: {
    domain?: string;
    classification?: StatisticalTableClassification;
    search?: string;
    verificationStatus?: StatisticalVerificationStatus;
    page?: number;
    limit?: number;
  }): Promise<any[]>;
  public static async getAllTableDefinitions(params?: {
    domain?: string;
    classification?: StatisticalTableClassification;
    search?: string;
    verificationStatus?: StatisticalVerificationStatus;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const isPaginated = params?.page !== undefined;
    const page = Math.max(1, params?.page || 1);
    const limit = Math.max(1, Math.min(100, params?.limit || 69));

    if (isDatabaseConnected()) {
      const where: any = {};
      if (params?.domain) {
        where.domain = { contains: params.domain, mode: 'insensitive' };
      }
      if (params?.classification) {
        where.classification = params.classification;
      }
      if (params?.verificationStatus) {
        where.verificationStatus = params.verificationStatus;
      }
      if (params?.search) {
        const searchTerm = params.search.trim();
        where.OR = [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { tableCode: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { domain: { contains: searchTerm, mode: 'insensitive' } },
          { expectedUnit: { contains: searchTerm, mode: 'insensitive' } },
        ];
      }

      const total = await prisma.statisticalTableDefinition.count({ where });
      const items = await prisma.statisticalTableDefinition.findMany({
        where,
        orderBy: { tableNumber: 'asc' },
        skip: isPaginated ? (page - 1) * limit : undefined,
        take: isPaginated ? limit : undefined,
        include: {
          indicators: true,
        },
      });

      if (isPaginated) {
        return {
          data: items.map((t) => ({
            ...t,
            hasRealData: t.verificationStatus === StatisticalVerificationStatus.VERIFIED,
            dataStatus: t.verificationStatus === StatisticalVerificationStatus.VERIFIED ? 'REAL DATA' : 'UNVERIFIED',
          })),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
      }
      return items.map((t) => ({
        ...t,
        hasRealData: t.verificationStatus === StatisticalVerificationStatus.VERIFIED,
        dataStatus: t.verificationStatus === StatisticalVerificationStatus.VERIFIED ? 'REAL DATA' : 'UNVERIFIED',
      }));
    }

    let results = inMemoryTableDefinitions.map((t) => ({
      ...t,
      hasRealData: t.verificationStatus === StatisticalVerificationStatus.VERIFIED,
      dataStatus: t.verificationStatus === StatisticalVerificationStatus.VERIFIED ? 'REAL DATA' : 'UNVERIFIED',
    }));
    if (params?.domain) {
      const d = params.domain.toLowerCase();
      results = results.filter((t) => t.domain.toLowerCase().includes(d));
    }
    if (params?.classification) {
      results = results.filter((t) => t.classification === params.classification);
    }
    if (params?.verificationStatus) {
      results = results.filter((t) => t.verificationStatus === params.verificationStatus);
    }
    if (params?.search) {
      const term = params.search.toLowerCase().trim();
      results = results.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          t.tableCode.toLowerCase().includes(term) ||
          (t.description && t.description.toLowerCase().includes(term)) ||
          t.domain.toLowerCase().includes(term) ||
          (t.expectedUnit && t.expectedUnit.toLowerCase().includes(term))
      );
    }

    const total = results.length;
    if (isPaginated) {
      const startIndex = (page - 1) * limit;
      const paginatedItems = results.slice(startIndex, startIndex + limit);
      return {
        data: paginatedItems,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }
    return results;
  }

  /**
   * Retrieves a table definition by table number (1 to 69).
   */
  public static async getTableDefinitionByNumber(tableNumber: number): Promise<any | null> {
    if (isDatabaseConnected()) {
      return await prisma.statisticalTableDefinition.findUnique({
        where: { tableNumber },
        include: { indicators: true },
      });
    }
    return inMemoryTableDefinitions.find((t) => t.tableNumber === tableNumber) || null;
  }

  /**
   * Retrieves a table definition by table code (e.g. STAT-TAB-01).
   */
  public static async getTableDefinitionByCode(tableCode: string): Promise<any | null> {
    const normalized = tableCode.trim().toUpperCase();
    if (isDatabaseConnected()) {
      return await prisma.statisticalTableDefinition.findUnique({
        where: { tableCode: normalized },
        include: { indicators: true },
      });
    }
    return inMemoryTableDefinitions.find((t) => t.tableCode.toUpperCase() === normalized) || null;
  }

  /**
   * Retrieves a table definition by either code (e.g. STAT-TAB-01) or number (e.g. 1).
   */
  public static async getTableDefinitionByCodeOrNumber(identifier: string | number): Promise<any | null> {
    if (typeof identifier === 'number' || !isNaN(Number(identifier))) {
      const num = typeof identifier === 'number' ? identifier : parseInt(identifier, 10);
      const res = await this.getTableDefinitionByNumber(num);
      if (res) return res;
    }
    return await this.getTableDefinitionByCode(String(identifier));
  }

  /**
   * Returns domain summary metrics for all 9 canonical domains.
   */
  public static async getDomainsSummary(): Promise<any[]> {
    const allTables = isDatabaseConnected()
      ? await prisma.statisticalTableDefinition.findMany({
          orderBy: { tableNumber: 'asc' },
          include: { indicators: true },
        })
      : inMemoryTableDefinitions;

    const domainMap: { [key: string]: { domain: string; tableCount: number; tables: any[]; verifiedCount: number; unverifiedCount: number; indicatorCount: number } } = {};

    for (const t of allTables) {
      const domainName = t.domain;
      if (!domainMap[domainName]) {
        domainMap[domainName] = {
          domain: domainName,
          tableCount: 0,
          tables: [],
          verifiedCount: 0,
          unverifiedCount: 0,
          indicatorCount: 0,
        };
      }
      domainMap[domainName].tableCount++;
      domainMap[domainName].tables.push({
        tableNumber: t.tableNumber,
        tableCode: t.tableCode,
        title: t.title,
        classification: t.classification,
        verificationStatus: t.verificationStatus,
      });
      if (t.verificationStatus === StatisticalVerificationStatus.VERIFIED) {
        domainMap[domainName].verifiedCount++;
      } else {
        domainMap[domainName].unverifiedCount++;
      }
      const indicators = (t as any).indicators;
      if (indicators && Array.isArray(indicators)) {
        domainMap[domainName].indicatorCount += indicators.length;
      }
    }

    return Object.values(domainMap);
  }

  /**
   * Registers a Statistical Dataset header (survey publication / dataset metadata).
   */
  public static async createDataset(data: {
    datasetCode: string;
    name: string;
    description?: string;
    sourceAgency?: string;
    reportingYear?: number;
    reportingPeriod?: string;
    surveyRound?: string;
    geographicLevel?: string;
    sourceFileName?: string;
    importedById?: string;
    publicationStatus?: StatisticalPublicationStatus;
  }): Promise<any> {
    const reportingYear = data.reportingYear || new Date().getFullYear();

    if (isDatabaseConnected()) {
      return await prisma.statisticalDataset.create({
        data: {
          datasetCode: data.datasetCode,
          name: data.name,
          description: data.description,
          sourceAgency: data.sourceAgency,
          reportingYear,
          reportingPeriod: data.reportingPeriod,
          surveyRound: data.surveyRound,
          geographicLevel: data.geographicLevel || 'MUNICIPALITY',
          sourceFileName: data.sourceFileName,
          importedById: data.importedById,
          publicationStatus: data.publicationStatus || StatisticalPublicationStatus.DRAFT,
          verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
        },
      });
    }

    const newDataset = {
      id: uuidv4(),
      datasetCode: data.datasetCode,
      name: data.name,
      description: data.description || null,
      sourceAgency: data.sourceAgency || null,
      reportingYear,
      reportingPeriod: data.reportingPeriod || null,
      surveyRound: data.surveyRound || null,
      geographicLevel: data.geographicLevel || 'MUNICIPALITY',
      sourceFileName: data.sourceFileName || null,
      importedById: data.importedById || null,
      isOfficial: false,
      isPublished: false,
      publicationStatus: data.publicationStatus || StatisticalPublicationStatus.DRAFT,
      verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryDatasets.push(newDataset);
    return newDataset;
  }

  /**
   * Registers an Indicator associated with a table definition.
   */
  public static async registerIndicator(data: {
    indicatorCode: string;
    name: string;
    title: string;
    description?: string;
    unit?: string;
    classification?: StatisticalTableClassification;
    formula?: string;
    numeratorDefinition?: string;
    denominatorDefinition?: string;
    tableDefinitionId?: string;
  }): Promise<any> {
    if (isDatabaseConnected()) {
      return await prisma.statisticalIndicator.create({
        data: {
          indicatorCode: data.indicatorCode,
          name: data.name,
          title: data.title,
          description: data.description,
          unit: data.unit,
          classification: data.classification || StatisticalTableClassification.INDICATOR,
          formula: data.formula,
          numeratorDefinition: data.numeratorDefinition,
          denominatorDefinition: data.denominatorDefinition,
          tableDefinitionId: data.tableDefinitionId,
          verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
        },
      });
    }

    const newIndicator = {
      id: uuidv4(),
      indicatorCode: data.indicatorCode,
      name: data.name,
      title: data.title,
      description: data.description || null,
      unit: data.unit || null,
      classification: data.classification || StatisticalTableClassification.INDICATOR,
      formula: data.formula || null,
      numeratorDefinition: data.numeratorDefinition || null,
      denominatorDefinition: data.denominatorDefinition || null,
      tableDefinitionId: data.tableDefinitionId || null,
      verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryIndicators.push(newIndicator);
    return newIndicator;
  }

  /**
   * Retrieves registered analytical dimensions.
   */
  public static async getDimensions(): Promise<any[]> {
    if (isDatabaseConnected()) {
      return await prisma.statisticalDimension.findMany({
        orderBy: { dimensionCode: 'asc' },
      });
    }
    return inMemoryDimensions;
  }

  /**
   * Creates a single statistical observation fact.
   */
  public static async createObservation(data: {
    datasetId: string;
    tableDefinitionId: string;
    indicatorId?: string;
    barangayId?: string;
    period: string;
    numericValue: number | string;
    unit?: string;
    dimensions?: any;
    provenanceId?: string;
    suppressionStatus?: string;
    suppressionReason?: string;
  }): Promise<any> {
    if (isDatabaseConnected()) {
      return await prisma.statisticalObservation.create({
        data: {
          datasetId: data.datasetId,
          tableDefinitionId: data.tableDefinitionId,
          indicatorId: data.indicatorId,
          barangayId: data.barangayId,
          period: data.period,
          numericValue: data.numericValue as any,
          unit: data.unit,
          dimensions: data.dimensions,
          provenanceId: data.provenanceId,
          suppressionStatus: data.suppressionStatus || 'NONE',
          suppressionReason: data.suppressionReason,
        },
      });
    }

    const newObs = {
      id: uuidv4(),
      datasetId: data.datasetId,
      tableDefinitionId: data.tableDefinitionId,
      indicatorId: data.indicatorId || null,
      barangayId: data.barangayId || null,
      period: data.period,
      numericValue: data.numericValue,
      unit: data.unit || null,
      dimensions: data.dimensions || null,
      provenanceId: data.provenanceId || null,
      suppressionStatus: data.suppressionStatus || 'NONE',
      suppressionReason: data.suppressionReason || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryObservations.push(newObs);
    return newObs;
  }

  /**
   * Resets in-memory test observation and dataset state.
   */
  public static resetInMemoryTestState(): void {
    inMemoryDatasets = [];
    inMemoryIndicators = [];
    inMemoryObservations = [];
    inMemoryProvenances = [];
  }
}
