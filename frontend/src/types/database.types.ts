/**
 * TAGAD System — Canonical Database Types (Blueprint v2)
 * PostgreSQL / Supabase Schema Definition
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Canonical 4-Role Architecture
export type CanonicalRole = 'SUPER_ADMIN' | 'ADMIN' | 'ENCODER' | 'VIEWER';

export type AppRole = CanonicalRole;

export type BeneficiarySex = 'MALE' | 'FEMALE';

export type GADPlanStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REVISED';

export type GADProgramStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PROPOSED'
  | 'ONGOING';

export type BudgetStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REVISED';

export interface Database {
  public: {
    Tables: {
      // ------------------------------------------------------------------------
      // Canonical Blueprint v2 Tables
      // ------------------------------------------------------------------------
      tagad_offices: {
        Row: {
          id: string;
          code: string;
          name: string;
          head_name: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          head_name?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          head_name?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      tagad_barangays: {
        Row: {
          id: string;
          name: string;
          code: string;
          captain_name: string | null;
          gad_focal_person: string | null;
          contact_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          captain_name?: string | null;
          gad_focal_person?: string | null;
          contact_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          captain_name?: string | null;
          gad_focal_person?: string | null;
          contact_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tagad_households: {
        Row: {
          id: string;
          household_no: string;
          barangay_id: string;
          purok: string | null;
          is_4ps: boolean;
          is_indigent: boolean;
          head_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_no: string;
          barangay_id: string;
          purok?: string | null;
          is_4ps?: boolean;
          is_indigent?: boolean;
          head_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_no?: string;
          barangay_id?: string;
          purok?: string | null;
          is_4ps?: boolean;
          is_indigent?: boolean;
          head_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tagad_users: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          full_name: string;
          role: CanonicalRole;
          office_id: string | null;
          barangay_id: string | null;
          is_active: boolean;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          full_name: string;
          role?: CanonicalRole;
          office_id?: string | null;
          barangay_id?: string | null;
          is_active?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          full_name?: string;
          role?: CanonicalRole;
          office_id?: string | null;
          barangay_id?: string | null;
          is_active?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tagad_beneficiaries: {
        Row: {
          id: string;
          household_id: string | null;
          office_id: string | null;
          barangay_id: string;
          first_name: string;
          last_name: string;
          middle_name: string | null;
          sex: BeneficiarySex;
          birthdate: string | null;
          age: number;
          sector: string;
          contact_number: string | null;
          address_street: string | null;
          is_archived: boolean;
          encoded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id?: string | null;
          office_id?: string | null;
          barangay_id: string;
          first_name: string;
          last_name: string;
          middle_name?: string | null;
          sex: BeneficiarySex;
          birthdate?: string | null;
          age: number;
          sector: string;
          contact_number?: string | null;
          address_street?: string | null;
          is_archived?: boolean;
          encoded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string | null;
          office_id?: string | null;
          barangay_id?: string;
          first_name?: string;
          last_name?: string;
          middle_name?: string | null;
          sex?: BeneficiarySex;
          birthdate?: string | null;
          age?: number;
          sector?: string;
          contact_number?: string | null;
          address_street?: string | null;
          is_archived?: boolean;
          encoded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tagad_gad_plans: {
        Row: {
          id: string;
          office_id: string;
          fiscal_year: number;
          total_budget: number;
          mandatory_gad_percentage: number;
          gad_budget: number;
          status: GADPlanStatus;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          office_id: string;
          fiscal_year: number;
          total_budget?: number;
          mandatory_gad_percentage?: number;
          gad_budget?: number;
          status?: GADPlanStatus;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          office_id?: string;
          fiscal_year?: number;
          total_budget?: number;
          mandatory_gad_percentage?: number;
          gad_budget?: number;
          status?: GADPlanStatus;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tagad_gad_plan_items: {
        Row: {
          id: string;
          gad_plan_id: string;
          program_id: string | null;
          gender_issue: string;
          cause_of_issue: string | null;
          gad_result: string;
          activity: string;
          performance_indicator: string;
          target_group: string;
          timeline: string;
          responsible_office: string;
          budget: number;
          fund_source: string;
          hgdg_score: number | null;
          attributed_percentage: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gad_plan_id: string;
          program_id?: string | null;
          gender_issue: string;
          cause_of_issue?: string | null;
          gad_result: string;
          activity: string;
          performance_indicator: string;
          target_group: string;
          timeline: string;
          responsible_office: string;
          budget?: number;
          fund_source?: string;
          hgdg_score?: number | null;
          attributed_percentage?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gad_plan_id?: string;
          program_id?: string | null;
          gender_issue?: string;
          cause_of_issue?: string | null;
          gad_result?: string;
          activity?: string;
          performance_indicator?: string;
          target_group?: string;
          timeline?: string;
          responsible_office?: string;
          budget?: number;
          fund_source?: string;
          hgdg_score?: number | null;
          attributed_percentage?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tagad_programs: {
        Row: {
          id: string;
          office_id: string;
          title: string;
          description: string | null;
          sector: string;
          fiscal_year: number;
          status: GADProgramStatus;
          budget_target: number;
          budget_actual: number;
          target_male: number;
          target_female: number;
          actual_male: number;
          actual_female: number;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          office_id: string;
          title: string;
          description?: string | null;
          sector: string;
          fiscal_year: number;
          status?: GADProgramStatus;
          budget_target?: number;
          budget_actual?: number;
          target_male?: number;
          target_female?: number;
          actual_male?: number;
          actual_female?: number;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          office_id?: string;
          title?: string;
          description?: string | null;
          sector?: string;
          fiscal_year?: number;
          status?: GADProgramStatus;
          budget_target?: number;
          budget_actual?: number;
          target_male?: number;
          target_female?: number;
          actual_male?: number;
          actual_female?: number;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tagad_accomplishments: {
        Row: {
          id: string;
          program_id: string | null;
          gad_plan_item_id: string | null;
          fiscal_year: number;
          quarter: number | null;
          actual_output: string;
          actual_beneficiary_male: number;
          actual_beneficiary_female: number;
          actual_budget_used: number;
          output_summary: string | null;
          remarks: string | null;
          variance_explanation: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          program_id?: string | null;
          gad_plan_item_id?: string | null;
          fiscal_year: number;
          quarter?: number | null;
          actual_output: string;
          actual_beneficiary_male?: number;
          actual_beneficiary_female?: number;
          actual_budget_used?: number;
          output_summary?: string | null;
          remarks?: string | null;
          variance_explanation?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          program_id?: string | null;
          gad_plan_item_id?: string | null;
          fiscal_year?: number;
          quarter?: number | null;
          actual_output?: string;
          actual_beneficiary_male?: number;
          actual_beneficiary_female?: number;
          actual_budget_used?: number;
          output_summary?: string | null;
          remarks?: string | null;
          variance_explanation?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tagad_mov_attachments: {
        Row: {
          id: string;
          accomplishment_id: string;
          storage_path: string;
          file_name: string;
          file_type: string;
          file_size_bytes: number;
          uploaded_by: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          accomplishment_id: string;
          storage_path: string;
          file_name: string;
          file_type: string;
          file_size_bytes: number;
          uploaded_by?: string | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          accomplishment_id?: string;
          storage_path?: string;
          file_name?: string;
          file_type?: string;
          file_size_bytes?: number;
          uploaded_by?: string | null;
          uploaded_at?: string;
        };
      };
      tagad_audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          before_state: Json | null;
          after_state: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          before_state?: Json | null;
          after_state?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          before_state?: Json | null;
          after_state?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };

      // ------------------------------------------------------------------------
      // Transitional Legacy Tables (Preserved for Non-Destructive Operation)
      // ------------------------------------------------------------------------
      roles: {
        Row: {
          id: string;
          name: AppRole;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: AppRole;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: AppRole;
          description?: string | null;
          created_at?: string;
        };
      };
      offices: {
        Row: {
          id: string;
          code: string;
          name: string;
          head_name: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          head_name?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          head_name?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      barangays: {
        Row: {
          id: string;
          name: string;
          code: string;
          captain_name: string | null;
          gad_focal_person: string | null;
          contact_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          captain_name?: string | null;
          gad_focal_person?: string | null;
          contact_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          captain_name?: string | null;
          gad_focal_person?: string | null;
          contact_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          office_id: string | null;
          barangay_id: string | null;
          is_active: boolean;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          office_id?: string | null;
          barangay_id?: string | null;
          is_active?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          office_id?: string | null;
          barangay_id?: string | null;
          is_active?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: AppRole;
          assigned_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: AppRole;
          assigned_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: AppRole;
          assigned_by?: string | null;
          created_at?: string;
        };
      };
      gad_programs: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          office_id: string;
          fiscal_year: number;
          status: GADProgramStatus;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          office_id: string;
          fiscal_year: number;
          status?: GADProgramStatus;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          office_id?: string;
          fiscal_year?: number;
          status?: GADProgramStatus;
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      budgets: {
        Row: {
          id: string;
          fiscal_year: number;
          total_lgu_budget: number;
          mandatory_gad_percentage: number;
          mandatory_gad_budget: number;
          status: BudgetStatus;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          fiscal_year: number;
          total_lgu_budget: number;
          mandatory_gad_percentage?: number;
          mandatory_gad_budget: number;
          status?: BudgetStatus;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          fiscal_year?: number;
          total_lgu_budget?: number;
          mandatory_gad_percentage?: number;
          mandatory_gad_budget?: number;
          status?: BudgetStatus;
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      budget_allocations: {
        Row: {
          id: string;
          budget_id: string;
          office_id: string;
          allocated_amount: number;
          fund_source: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          budget_id: string;
          office_id: string;
          allocated_amount: number;
          fund_source?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          budget_id?: string;
          office_id?: string;
          allocated_amount?: number;
          fund_source?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      document_types: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          activity_id: string | null;
          document_type_id: string;
          file_name: string;
          storage_path: string;
          file_size: number;
          mime_type: string;
          uploaded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          activity_id?: string | null;
          document_type_id: string;
          file_name: string;
          storage_path: string;
          file_size: number;
          mime_type: string;
          uploaded_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          activity_id?: string | null;
          document_type_id?: string;
          file_name?: string;
          storage_path?: string;
          file_size?: number;
          mime_type?: string;
          uploaded_by?: string;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_table: string;
          entity_id: string | null;
          old_values: Json | null;
          new_values: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_table: string;
          entity_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          entity_table?: string;
          entity_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
