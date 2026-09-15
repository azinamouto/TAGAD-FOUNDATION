# CBMS source reconciliation — 2026-09-15

Source: local Downloads file `0701243-TalibonJ-Bohol-2024-CBMS-Statistical-Tables-4.csv`.
The duplicate `(1).csv` has identical bytes. The preserved source is
[the CSV](../prisma/data/talibon-2024-cbms-table-register.csv).
SHA-256: `2581f42ddbac4e1258ace935231dda90a3b870caa2ef6c2ff99a7cfb1e565d95`.

The CSV contains **69 rows numbered 1–67, 69, and 70**. It does not contain
Table 68. Titles are copied exactly, including punctuation and Unicode. The
CSV has no table_code column: codes are derived from Tab Name by uppercasing,
replacing non-alphanumeric runs with underscores, and trimming edge underscores.
The generated source manifest preserves every original tab name alongside that
code. Old STAT-TAB codes are replaced, so API clients must use the new codes or
existing UUID/number identifiers where supported.

The checked-in catalog had **69 definitions, not 74**. This change updates
68 existing titles and 68 existing codes, removes the non-source Table 68,
and adds source Table 70. The complete identity diff follows below. Navigation
domains/classifications are local classifications, not claims from the CSV;
units, dimensions, and verification remain UNVERIFIED until tabulation schemas
are reviewed. No statistical observations are invented.

Both the normal Prisma seed and StatisticalCatalogService.seedCatalog now call
the atomic reconciler. It updates existing definitions rather than skipping
them. Unreferenced legacy/system entries outside the source are removed;
custom entries are retained. In a 74-entry legacy fixture the obsolete numbers
are 68 and 71–74. A linked obsolete entry, or a title correction on an entry
with observations/indicators/dimension bindings, aborts for explicit data review
instead of deleting or relabeling its data. Deployed row counts and application
of this reconciliation remain unverified while Supabase is unavailable.

Regression: every number, title, tab name and derived code is compared with the
preserved CSV using an independent CSV reader. The PostgreSQL qualification
checks a 74-row legacy fixture, exact persisted identities, custom preservation,
idempotency, and linked-data rejection. Run `npm run test:qualification`.

| Source table | Previous code / title | Corrected code / exact title |
| --- | --- | --- |
| 1 | STAT-TAB-01 — Summary of Household and Population Statistics | SUMMARY_STATISTICS — Responding Households, Covered Population and Average Household Size |
| 2 | STAT-TAB-02 — Households by Tenure Status of Housing Unit and Lot | HOUSEHOLDS_BY_SIZE — Distribution of Households by Number of Household Members |
| 3 | STAT-TAB-03 — Households by Type of Building and Construction Material of Outer Walls and Roof | ACCESS_TO_INTERNET — Distribution of Households by Access to Internet |
| 4 | STAT-TAB-04 — Households by Main Source of Water Supply for Drinking | PERCEPTION_ON_SAFETY — Distribution of Respondents by Perception on Safety while Walking Alone in their Neighborhood at Night |
| 5 | STAT-TAB-05 — Households by Main Source of Water Supply for General Domestic Use | MAIN_SOURCE_OF_WATER_SUPPLY — Distribution of Households by Main Source of Water Supply |
| 6 | STAT-TAB-06 — Households with Access to Improved Sanitation and Type of Toilet Facility | MAIN_SOURCE_OF_DRINKING_WATER — Distribution of Households by Main Source of Drinking Water |
| 7 | STAT-TAB-07 — Proportion of Households with Access to Piped Water | DRINKING_WATER_SERVICE_LEVEL — Distribution of Households by Service Level of Drinking Water |
| 8 | STAT-TAB-08 — Proportion of Households with Sanitary Toilet Facilities | TOILET_FACILITY — Distribution of Households by Type of Toilet Facility |
| 9 | STAT-TAB-09 — Households by Main Source of Lighting and Electricity | TOILET_FACILITY_SERVICE_LEVEL — Distribution of Households by Service Level of Toilet Facility |
| 10 | STAT-TAB-10 — Proportion of Households Connected to Power Grid | HANDWASHING_FACILITY — Distribution of Households by Service Level of Handwashing Facility |
| 11 | STAT-TAB-11 — Households by Usual Manner of Garbage and Solid Waste Disposal | BUILDING_TYPE — Distribution of Households by Type of Building/Housing Unit they Occupy |
| 12 | STAT-TAB-12 — Households by Internet Connectivity and Type of Service | ROOF_MATERIAL — Distribution of Households by Type of Material Used in the Roof of the Building they Occupy |
| 13 | STAT-TAB-13 — Proportion of Households with Internet Access | OUTER_WALLS_MATERIAL — Distribution of Households by Type of Material Used in the Outer Walls of the Building/Housing Unit they Occupy |
| 14 | STAT-TAB-14 — Households by Possession of Financial and Transaction Accounts | FLOOR_MATERIAL — Distribution of Households by Type of Material Used in the Floor of the Housing Unit they Occupy |
| 15 | STAT-TAB-15 — Proportion of Adult Population with Formal Financial Accounts | RESIDENCE_TENURE_STATUS — Distribution of Households by Tenure Status of the Housing Unit and Lot they Occupy |
| 16 | STAT-TAB-16 — Households Experiencing Food Insecurity by Severity (FIES) | ACCESS_TO_ELECTRICITY — Distribution of Households by Availability of Electricity in the Building/Housing Unit they Occupy |
| 17 | STAT-TAB-17 — Prevalence of Moderate or Severe Food Insecurity in the Population | FUEL_FOR_COOKING — Distribution of Households by Fuel/Energy Source Used for Cooking |
| 18 | STAT-TAB-18 — Individuals Needing Medical Treatment in the Past 12 Months by Sex | ACCESS_TO_SECURE_TENURE — Distribution of Households by Access to Secure Tenure |
| 19 | STAT-TAB-19 — Individuals Availing Medical Treatment in Health Facilities by Facility Type | OVERCROWDING_STATUS — Distribution of Households by Overcrowding Status |
| 20 | STAT-TAB-20 — Population Covered by Health Insurance (PhilHealth / Private HMO) by Sex | RELIANCE_ON_CLEAN_FUEL — Distribution of Households by Reliance on Clean Fuels/Technology |
| 21 | STAT-TAB-21 — Prevalence of Malnutrition Among Children Under 5 Years of Age | FOOD_INSECURITY_EXPERIENCE — Number of Households that Experienced Food Insecurity |
| 22 | STAT-TAB-22 — Persons with Disability (PWD) by Type of Functional Difficulty and Sex | FINANCIAL_ACCOUNT — Number of Households with Formal Financial Account by Type |
| 23 | STAT-TAB-23 — Proportion of Population with Functional Disabilities by Barangay | MEDICAL_TREATMENT_NONAVAILMENT — Number of Households with Member/s who got Ill/Sick/Injured but did not Avail Medical Treatment by Main Reason |
| 24 | STAT-TAB-24 — Household Population by Sex and Barangay | POPULATION_BY_SEX — Distribution of Covered Population by Sex |
| 25 | STAT-TAB-25 — Population Distribution by Five-Year Age Group and Sex | POPULATION_BY_AGE_GROUP — Distribution of Covered Population by Age Group and Sex |
| 26 | STAT-TAB-26 — Senior Citizens Population (Aged 60 and Over) by Sex and Barangay | POPULATION_BY_ETHNICITY — Distribution of Covered Population by Ethnicity |
| 27 | STAT-TAB-27 — Household Population by Indigenous Peoples (IP) / Ethnic Affiliation and Sex | SENIOR_CITIZEN_ID — Distribution of Covered Population 60 Years Old and Over by Ownership of Senior Citizen ID |
| 28 | STAT-TAB-28 — Teenage Pregnancy Prevalence Among Females Aged 10 to 19 Years | SCHOOLING_STATUS_OF_3_24YO — Distribution of Covered Population 3 to 24 Years Old by Schooling Status |
| 29 | STAT-TAB-29 — Solo Parents Registered and Active by Sex and Barangay | NOT_SCHOOLING_REASON_OF_16_21YO — Distribution of Covered Population 16 to 21 Years Old who are not Attending School by Sex and Reason |
| 30 | STAT-TAB-30 — Labor Force Participation Rate (LFPR) by Sex | LABOR_FORCE_PARTICIPATION_LFP — Labor Force Participation Rate among Covered Population 15 Years Old and Over Excluding Overseas Filipino Workers |
| 31 | STAT-TAB-31 — Employment Rate by Sex | LFP_BY_SEX — Labor Force Participation Rate among Covered Population 15 Years Old and Over Excluding Overseas Filipino Workers by Sex |
| 32 | STAT-TAB-32 — Unemployment Rate by Sex | KEY_EMPLOYMENT_STATISTICS — Employment, Unemployment and Underemployment among Covered Population 15 Years Old and Over Excluding Overseas Filipino Workers by Sex |
| 33 | STAT-TAB-33 — Underemployment Rate by Sex | FARMERS_AND_FARM_WORKERS — Proportion of Farmers and Farm Workers among Covered Population 15 Years Old and Over Excluding Overseas Filipino Workers |
| 34 | STAT-TAB-34 — Employed Persons by Major Industry Group and Sex | FISHERFOLK_AND_FISH_WORKERS — Proportion of Fisherfolk and Fish Workers among Covered Population 15 Years Old and Over Excluding Overseas Filipino Workers |
| 35 | STAT-TAB-35 — Employed Persons by Major Occupation Group (PSOC) and Sex | CHILD_LABOR — Distribution of Covered Population 5 to 17 Years Old by Engagement to Child Labor |
| 36 | STAT-TAB-36 — Employed Persons by Class of Worker and Sex | WORKING_CHILDREN_BY_SEX — Distribution of Working Children aged 5 to 17 Years Old by Sex |
| 37 | STAT-TAB-37 — Working Children (5 to 17 Years Old) by Sex and Age Group | WORKING_CHILDREN_BY_OCCUPATION — Distribution of Working Children aged 5 to 17 Years Old by Occupation Group |
| 38 | STAT-TAB-38 — Proportion of Working Children Engaged in Child Labor | EMPLOYED_MANAGERS — Distribution of Employed Persons in Managerial Positions by Sex |
| 39 | STAT-TAB-39 — Youth (15 to 24 Years Old) Not in Employment, Education, or Training (NEET) Rate by Sex | CLASS_OF_WORKERS — Distribution of Covered Population 15 Years Old and Over Excluding Overseas Filipino Workers who are Employed by Class of Worker |
| 40 | STAT-TAB-40 — Registered Farmers and Agricultural Workers by Sex and Commodity | INDUSTRY_GROUP — Distribution of Covered Population 15 Years Old and Over Excluding Overseas Filipino Workers who are Employed by Industry Group |
| 41 | STAT-TAB-41 — Registered Fisherfolk (FishR) by Sex and Coastal Barangay | YOUTH_ENGAGEMENT — Proportion of Youth not in Education, Employment or Training among Covered Population 15 to 24 Years Old |
| 42 | STAT-TAB-42 — Informal Sector Workers by Major Activity and Sex | SHS_GRADUATE_NOT_IN_SCHOOL — Distribution of Senior High School Graduate not Attending School by Employment Status |
| 43 | STAT-TAB-43 — Overseas Filipino Workers (OFWs) by Destination and Sex | TVET_GRADUATE_NOT_IN_SCHOOL — Distribution of Covered Population 15 Years Old and Over who are Technical and Vocational Education and Training Graduates not Attending School by Employment Status |
| 44 | STAT-TAB-44 — Micro, Small, and Medium Enterprises (MSMEs) by Sex of Business Owner | MANUFACTURING_INDUSTRY — Proportion of Employed Individuals Engaged in the Manufacturing Industry |
| 45 | STAT-TAB-45 — Women in Managerial and Leadership Positions in Public and Private Sectors | INFORMAL_EMPLOYMENT — Proportion of Employed Individuals Who Are Self‑Employed and Unpaid Family Workers |
| 46 | STAT-TAB-46 — School Attendance Rate of Children (Aged 5 to 17 Years) by Sex and Level | EMPLOYED_BY_OCCUPATION_GROUP — Distribution of Employed Persons by Occupation Group and by Sex |
| 47 | STAT-TAB-47 — Basic Literacy Rate of Population 10 Years Old and Over by Sex | PUBLIC_TRANSPORTATION — Distribution of Households by Access to Public Transportation |
| 48 | STAT-TAB-48 — Functional Literacy Rate of Population 10 to 64 Years Old by Sex | WORKING_CHILDREN_NOT_IN_SCHOOL — Distribution of Working Children Aged 5 to 17 Years Old Who are Not in School by Age and Sex |
| 49 | STAT-TAB-49 — Highest Educational Attainment of Population Aged 15 and Over by Sex | FLOOR_MATERIAL_STRENGTH — Distribution of Households by Strength of Floor Materials |
| 50 | STAT-TAB-50 — Technical-Vocational Education and Training (TVET) Graduates by Course and Sex | ROOF_MATERIAL_STRENGTH — Distribution of Households by Strength of Roof Materials |
| 51 | STAT-TAB-51 — Maternal Mortality Ratio (MMR) per 100,000 Live Births | OUTER_WALL_MATERIAL_STRENGTH — Distribution of Households by Strength of Outer Wall Materials |
| 52 | STAT-TAB-52 — Households with Access to Safe Drinking Water by Level of Service (Level 1, 2, 3) | WASTE_COLLECTION — Availability of Garbage Collection Services by Barangay |
| 53 | STAT-TAB-53 — Proportion of Population with Access to Electricity by Barangay | NETWORK_SIGNAL — Availability of Cellphone Network Signal by Barangay |
| 54 | STAT-TAB-54 — Disaster Preparedness: Households with Emergency Survival Kits by Barangay | DRRM — Presence of Disaster Risk Reduction and Management Measures by Barangay |
| 55 | STAT-TAB-55 — Evacuation Center Capacity and Designated Safe Shelters by Barangay | SDG_1_4_1_3 — Proportion of Households with Access to Electricity |
| 56 | STAT-TAB-56 — SDG 1.2.1: Proportion of Population Living Below the Municipal Poverty Threshold | SDG_1_4_1_4 — Proportion of Households with Primary Reliance on Clean Fuels and Technology |
| 57 | STAT-TAB-57 — SDG 1.2.2: Proportion of Men, Women, and Children Living in Multidimensional Poverty | SDG_1_4_1_5_P1 — Proportion of Households with Access to Basic Drinking Water Services |
| 58 | STAT-TAB-58 — SDG 3.1.2: Proportion of Births Attended by Skilled Health Personnel | SDG_1_4_1_6_P1A — Proportion of Households with Access to Basic Sanitation Services |
| 59 | STAT-TAB-59 — SDG 3.2.1: Under-Five Mortality Rate per 1,000 Live Births | SDG_1_4_1_6_P1B — Proportion of Households with Access to Handwashing Facility with Soap and Water |
| 60 | STAT-TAB-60 — SDG 3.2.2: Neonatal Mortality Rate per 1,000 Live Births | SDG_1_4_2_P1 — Proportion of Households with Access to Secure Tenure |
| 61 | STAT-TAB-61 — SDG 4.1.2: Completion Rate for Primary and Secondary Education by Sex | SDG_1_4_S4 — Proportion of Households with Owned or Owner-like Possession of Housing Units |
| 62 | STAT-TAB-62 — SDG 5.5.2: Proportion of Women in Managerial and Decision-Making Positions | SDG_5_5_2 — Proportion of Women in Managerial Positions |
| 63 | STAT-TAB-63 — SDG 6.1.1: Proportion of Population Using Safely Managed Drinking Water Services | SDG_8_3_1 — Proportion of Self-employed and Unpaid Family Workers |
| 64 | STAT-TAB-64 — SDG 6.2.1: Proportion of Population Using Safely Managed Sanitation Services | SDG_8_5_2 — Unemployment Rate |
| 65 | STAT-TAB-65 — SDG 7.1.1: Proportion of Population with Access to Clean Electricity and Lighting | SDG_8_6_1 — Proportion of Youth (Aged 15-24 Years) Not in Education, Employment, or Training (NEET Rate) |
| 66 | STAT-TAB-66 — SDG 8.5.2: Unemployment Rate Disaggregated by Sex, Age, and Persons with Disabilities | SDG_8_7_1_P1 — Proportion of Children Aged 5–17 Years Engaged in Child Labour |
| 67 | STAT-TAB-67 — SDG 8.6.1: Proportion of Youth (Aged 15 to 24) Not in Education, Employment, or Training | SDG_9_2_2 — Manufacturing Employment as a Proportion of Total Employment |
| 69 | STAT-TAB-69 — SDG 16.1.1: Number of Victims of Violence, Sexual Abuse, and VAWC Crimes by Sex | SDG_16_1_4_P1 — Proportion of Households that Feel Safe Walking Alone Around their Area at Night |
| 70 | (new source entry) | SDG_17_8_1_P1 — Proportion of Households with Exposure to the Internet |

Removed from the source catalog: Table 68 — SDG 11.1.1: Proportion of Urban / Barangay Population Living in Informal Settlements.
