export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'ADMIN' | 'PHOTOGRAPHER'
          active: boolean
          cluster_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role: 'ADMIN' | 'PHOTOGRAPHER'
          active?: boolean
          cluster_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'ADMIN' | 'PHOTOGRAPHER'
          active?: boolean
          cluster_code?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      clusters: {
        Row: {
          id: string
          name: string
          latitude: number
          longitude: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          latitude: number
          longitude: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          latitude?: number
          longitude?: number
          created_at?: string
          updated_at?: string
        }
      }
      dealerships: {
        Row: {
          id: string
          name: string
          latitude: number
          longitude: number
          payment_type: 'CUSTOMER_PAID' | 'DEALER_PAID'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          latitude: number
          longitude: number
          payment_type: 'CUSTOMER_PAID' | 'DEALER_PAID'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          latitude?: number
          longitude?: number
          payment_type?: 'CUSTOMER_PAID' | 'DEALER_PAID'
          created_at?: string
          updated_at?: string
        }
      }
      mappings: {
        Row: {
          id: string
          cluster_id: string
          dealership_id: string
          photographer_id: string
          mapping_type: 'PRIMARY' | 'SECONDARY'
          latitude: number
          longitude: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cluster_id: string
          dealership_id: string
          photographer_id: string
          mapping_type: 'PRIMARY' | 'SECONDARY'
          latitude: number
          longitude: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cluster_id?: string
          dealership_id?: string
          photographer_id?: string
          mapping_type?: 'PRIMARY' | 'SECONDARY'
          latitude?: number
          longitude?: number
          created_at?: string
          updated_at?: string
        }
      }
      deliveries: {
        Row: {
          id: string
          date: string
          showroom_code: string
          cluster_code: string
          showroom_type: 'PRIMARY' | 'SECONDARY'
          timing: string | null
          delivery_name: string
          status: 'ASSIGNED' | 'UNASSIGNED' | 'REJECTED' | 'POSTPONED_CANCELED' | 'DONE'
          assigned_user_id: string | null
          payment_type: 'CUSTOMER_PAID' | 'DEALER_PAID'
          footage_link: string | null
          created_at: string
          updated_at: string
          decision_state: 'WAITING' | 'ACCEPTED' | 'REJECTED_BY_ALL' | null
          rejected_by_all: boolean | null
          rejected_by_all_timestamp: string | null
          unassignment_reason: string | null
          unassignment_timestamp: string | null
          unassignment_by: string | null
          creation_index: number | null
        }
        Insert: {
          id?: string
          date: string
          showroom_code: string
          cluster_code: string
          showroom_type: 'PRIMARY' | 'SECONDARY'
          timing?: string | null
          delivery_name: string
          status?: 'ASSIGNED' | 'UNASSIGNED' | 'REJECTED' | 'POSTPONED_CANCELED' | 'DONE'
          assigned_user_id?: string | null
          payment_type: 'CUSTOMER_PAID' | 'DEALER_PAID'
          footage_link?: string | null
          created_at?: string
          updated_at?: string
          decision_state?: 'WAITING' | 'ACCEPTED' | 'REJECTED_BY_ALL' | null
          rejected_by_all?: boolean | null
          rejected_by_all_timestamp?: string | null
          unassignment_reason?: string | null
          unassignment_timestamp?: string | null
          unassignment_by?: string | null
          creation_index?: number | null
        }
        Update: {
          id?: string
          date?: string
          showroom_code?: string
          cluster_code?: string
          showroom_type?: 'PRIMARY' | 'SECONDARY'
          timing?: string | null
          delivery_name?: string
          status?: 'ASSIGNED' | 'UNASSIGNED' | 'REJECTED' | 'POSTPONED_CANCELED' | 'DONE'
          assigned_user_id?: string | null
          payment_type?: 'CUSTOMER_PAID' | 'DEALER_PAID'
          footage_link?: string | null
          created_at?: string
          updated_at?: string
          decision_state?: 'WAITING' | 'ACCEPTED' | 'REJECTED_BY_ALL' | null
          rejected_by_all?: boolean | null
          rejected_by_all_timestamp?: string | null
          unassignment_reason?: string | null
          unassignment_timestamp?: string | null
          unassignment_by?: string | null
          creation_index?: number | null
        }
      }
      screenshots: {
        Row: {
          id: string
          delivery_id: string
          user_id: string
          type: 'PAYMENT' | 'FOLLOW'
          file_url: string
          thumbnail_url: string
          uploaded_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          delivery_id: string
          user_id: string
          type: 'PAYMENT' | 'FOLLOW'
          file_url: string
          thumbnail_url: string
          uploaded_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          delivery_id?: string
          user_id?: string
          type?: 'PAYMENT' | 'FOLLOW'
          file_url?: string
          thumbnail_url?: string
          uploaded_at?: string
          deleted_at?: string | null
        }
      }
      reel_tasks: {
        Row: {
          id: string
          delivery_id: string
          assigned_user_id: string
          reel_link: string | null
          status: 'PENDING' | 'RESOLVED'
          reassigned_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          delivery_id: string
          assigned_user_id: string
          reel_link?: string | null
          status?: 'PENDING' | 'RESOLVED'
          reassigned_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          delivery_id?: string
          assigned_user_id?: string
          reel_link?: string | null
          status?: 'PENDING' | 'RESOLVED'
          reassigned_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leaves: {
        Row: {
          id: string
          photographer_id: string
          date: string
          half: 'FIRST_HALF' | 'SECOND_HALF'
          applied_by: 'PHOTOGRAPHER' | 'ADMIN'
          applied_at: string
        }
        Insert: {
          id?: string
          photographer_id: string
          date: string
          half: 'FIRST_HALF' | 'SECOND_HALF'
          applied_by: 'PHOTOGRAPHER' | 'ADMIN'
          applied_at?: string
        }
        Update: {
          id?: string
          photographer_id?: string
          date?: string
          half?: 'FIRST_HALF' | 'SECOND_HALF'
          applied_by?: 'PHOTOGRAPHER' | 'ADMIN'
          applied_at?: string
        }
      }
      log_events: {
        Row: {
          id: string
          type: string
          actor_user_id: string
          target_id: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          type: string
          actor_user_id: string
          target_id: string
          metadata: Json
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          actor_user_id?: string
          target_id?: string
          metadata?: Json
          created_at?: string
        }
      }
      geofence_breaches: {
        Row: {
          id: string
          delivery_id: string
          user_id: string
          latitude: number
          longitude: number
          expected_time: string
          breach_time: string
          distance_from_target: number
        }
        Insert: {
          id?: string
          delivery_id: string
          user_id: string
          latitude: number
          longitude: number
          expected_time: string
          breach_time: string
          distance_from_target: number
        }
        Update: {
          id?: string
          delivery_id?: string
          user_id?: string
          latitude?: number
          longitude?: number
          expected_time?: string
          breach_time?: string
          distance_from_target?: number
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'ADMIN' | 'PHOTOGRAPHER'
      delivery_status: 'ASSIGNED' | 'UNASSIGNED' | 'REJECTED' | 'POSTPONED_CANCELED' | 'DONE'
      decision_state: 'WAITING' | 'ACCEPTED' | 'REJECTED_BY_ALL'
      screenshot_type: 'PAYMENT' | 'FOLLOW'
      payment_type: 'CUSTOMER_PAID' | 'DEALER_PAID'
      showroom_type: 'PRIMARY' | 'SECONDARY'
      reel_status: 'PENDING' | 'RESOLVED'
      mapping_type: 'PRIMARY' | 'SECONDARY'
      leave_half: 'FIRST_HALF' | 'SECOND_HALF'
      leave_applied_by: 'PHOTOGRAPHER' | 'ADMIN'
    }
  }
}
