import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          title: string
          recording_date: string
          total_recording_time: string
          location: string
          location_map_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          recording_date: string
          total_recording_time: string
          location: string
          location_map_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          recording_date?: string
          total_recording_time?: string
          location?: string
          location_map_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      performers: {
        Row: {
          id: string
          project_id: string
          name: string
          role: string | null
          start_time: string | null
          end_time: string | null
          is_time_confirmed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          role?: string | null
          start_time?: string | null
          end_time?: string | null
          is_time_confirmed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          role?: string | null
          start_time?: string | null
          end_time?: string | null
          is_time_confirmed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      plans: {
        Row: {
          id: string
          project_id: string
          title: string
          scheduled_time: string
          duration: string
          script_url: string | null
          has_script: boolean
          notes: string | null
          reference_video_url: string | null
          is_confirmed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          scheduled_time: string
          duration: string
          script_url?: string | null
          has_script?: boolean
          notes?: string | null
          reference_video_url?: string | null
          is_confirmed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          scheduled_time?: string
          duration?: string
          script_url?: string | null
          has_script?: boolean
          notes?: string | null
          reference_video_url?: string | null
          is_confirmed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      plan_performers: {
        Row: {
          id: string
          plan_id: string
          performer_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          performer_id: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          performer_id?: string
          role?: string
          created_at?: string
        }
      }
    }
  }
}