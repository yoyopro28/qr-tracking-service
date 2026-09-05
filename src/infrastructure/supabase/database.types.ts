export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activations: {
        Row: {
          activated_by_user_id: string | null
          created_at: string
          ended_at: string | null
          flyer_id: string
          id: string
          location_id: string
          notes: string | null
          source: Database["public"]["Enums"]["activation_source"]
          workspace_id: string
        }
        Insert: {
          activated_by_user_id?: string | null
          created_at?: string
          ended_at?: string | null
          flyer_id: string
          id?: string
          location_id: string
          notes?: string | null
          source: Database["public"]["Enums"]["activation_source"]
          workspace_id: string
        }
        Update: {
          activated_by_user_id?: string | null
          created_at?: string
          ended_at?: string | null
          flyer_id?: string
          id?: string
          location_id?: string
          notes?: string | null
          source?: Database["public"]["Enums"]["activation_source"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activations_flyer_id_fkey"
            columns: ["flyer_id"]
            isOneToOne: false
            referencedRelation: "flyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          description: string | null
          destination_url: string
          id: string
          name: string
          status: Database["public"]["Enums"]["campaign_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          destination_url: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          destination_url?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      flyer_batches: {
        Row: {
          campaign_id: string
          created_at: string
          file_size_bytes: number | null
          finalized_at: string | null
          id: string
          physical_flyer_count: number
          sha256: string | null
          sheet_count: number
          status: Database["public"]["Enums"]["flyer_batch_status"]
          storage_path: string
          template_id: string
          tracking_origin: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          file_size_bytes?: number | null
          finalized_at?: string | null
          id?: string
          physical_flyer_count: number
          sha256?: string | null
          sheet_count: number
          status?: Database["public"]["Enums"]["flyer_batch_status"]
          storage_path: string
          template_id: string
          tracking_origin: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          file_size_bytes?: number | null
          finalized_at?: string | null
          id?: string
          physical_flyer_count?: number
          sha256?: string | null
          sheet_count?: number
          status?: Database["public"]["Enums"]["flyer_batch_status"]
          storage_path?: string
          template_id?: string
          tracking_origin?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flyer_batches_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flyer_batches_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flyer_batches_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      flyers: {
        Row: {
          activated_at: string | null
          batch_id: string
          campaign_id: string
          created_at: string
          generated_at: string | null
          id: string
          placement_index: number
          retired_at: string | null
          sheet_index: number
          shortcode: string
          status: Database["public"]["Enums"]["flyer_status"]
          template_id: string
          tracking_url: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          activated_at?: string | null
          batch_id: string
          campaign_id: string
          created_at?: string
          generated_at?: string | null
          id?: string
          placement_index: number
          retired_at?: string | null
          sheet_index: number
          shortcode: string
          status?: Database["public"]["Enums"]["flyer_status"]
          template_id: string
          tracking_url: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          activated_at?: string | null
          batch_id?: string
          campaign_id?: string
          created_at?: string
          generated_at?: string | null
          id?: string
          placement_index?: number
          retired_at?: string | null
          sheet_index?: number
          shortcode?: string
          status?: Database["public"]["Enums"]["flyer_status"]
          template_id?: string
          tracking_url?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flyers_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "flyer_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flyers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flyers_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flyers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          archived_at: string | null
          campaign_id: string | null
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          postal_code: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          archived_at?: string | null
          campaign_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          postal_code?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          archived_at?: string | null
          campaign_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          postal_code?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      qr_routes: {
        Row: {
          cache_error: string | null
          cache_synced_at: string | null
          cache_version: number
          campaign_id: string
          destination_url: string | null
          flyer_id: string
          location_id: string | null
          slug: string
          status: Database["public"]["Enums"]["qr_route_status"]
          updated_at: string
          version: number
          workspace_id: string
        }
        Insert: {
          cache_error?: string | null
          cache_synced_at?: string | null
          cache_version?: number
          campaign_id: string
          destination_url?: string | null
          flyer_id: string
          location_id?: string | null
          slug: string
          status: Database["public"]["Enums"]["qr_route_status"]
          updated_at?: string
          version?: number
          workspace_id: string
        }
        Update: {
          cache_error?: string | null
          cache_synced_at?: string | null
          cache_version?: number
          campaign_id?: string
          destination_url?: string | null
          flyer_id?: string
          location_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["qr_route_status"]
          updated_at?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_routes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_routes_flyer_id_fkey"
            columns: ["flyer_id"]
            isOneToOne: true
            referencedRelation: "flyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_routes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_routes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      redirect_cache_outbox: {
        Row: {
          attempts: number
          available_at: string
          completed_at: string | null
          created_at: string
          id: string
          last_error: string | null
          lease_until: string | null
          route_version: number
          slug: string
          status: Database["public"]["Enums"]["outbox_status"]
        }
        Insert: {
          attempts?: number
          available_at?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          lease_until?: string | null
          route_version: number
          slug: string
          status?: Database["public"]["Enums"]["outbox_status"]
        }
        Update: {
          attempts?: number
          available_at?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          lease_until?: string | null
          route_version?: number
          slug?: string
          status?: Database["public"]["Enums"]["outbox_status"]
        }
        Relationships: []
      }
      scan_rollups_daily: {
        Row: {
          campaign_id: string
          country_code: string
          day: string
          flyer_id: string
          id: string
          location_id: string | null
          scans: number
          unique_ip_days: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          campaign_id: string
          country_code?: string
          day: string
          flyer_id: string
          id?: string
          location_id?: string | null
          scans: number
          unique_ip_days: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          campaign_id?: string
          country_code?: string
          day?: string
          flyer_id?: string
          id?: string
          location_id?: string | null
          scans?: number
          unique_ip_days?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_rollups_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_rollups_daily_flyer_id_fkey"
            columns: ["flyer_id"]
            isOneToOne: false
            referencedRelation: "flyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_rollups_daily_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_rollups_daily_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_workspace_rollups_daily: {
        Row: {
          day: string
          scans: number
          unique_ip_days: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          day: string
          scans: number
          unique_ip_days: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          day?: string
          scans?: number
          unique_ip_days?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_workspace_rollups_daily_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      template_qr_placements: {
        Row: {
          height: number
          id: string
          page_number: number
          placement_order: number
          short_text_enabled: boolean
          short_text_offset_x: number | null
          short_text_offset_y: number | null
          template_id: string
          width: number
          x: number
          y: number
        }
        Insert: {
          height: number
          id?: string
          page_number: number
          placement_order: number
          short_text_enabled?: boolean
          short_text_offset_x?: number | null
          short_text_offset_y?: number | null
          template_id: string
          width: number
          x: number
          y: number
        }
        Update: {
          height?: number
          id?: string
          page_number?: number
          placement_order?: number
          short_text_enabled?: boolean
          short_text_offset_x?: number | null
          short_text_offset_y?: number | null
          template_id?: string
          width?: number
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_qr_placements_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          campaign_id: string
          created_at: string
          file_size_bytes: number
          height: number | null
          id: string
          mime_type: string
          original_filename: string
          page_count: number
          sha256: string
          status: Database["public"]["Enums"]["template_status"]
          storage_path: string
          updated_at: string
          width: number | null
          workspace_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          file_size_bytes: number
          height?: number | null
          id?: string
          mime_type: string
          original_filename: string
          page_count: number
          sha256: string
          status?: Database["public"]["Enums"]["template_status"]
          storage_path: string
          updated_at?: string
          width?: number | null
          workspace_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          file_size_bytes?: number
          height?: number | null
          id?: string
          mime_type?: string
          original_filename?: string
          page_count?: number
          sha256?: string
          status?: Database["public"]["Enums"]["template_status"]
          storage_path?: string
          updated_at?: string
          width?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_campaign_tenant_fk"
            columns: ["campaign_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "templates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_flyer: {
        Args: {
          p_latitude?: number
          p_location_id?: string
          p_longitude?: number
          p_new_location_name?: string
          p_shortcode: string
          p_source?: Database["public"]["Enums"]["activation_source"]
          p_workspace_id: string
        }
        Returns: undefined
      }
      archive_template: {
        Args: { p_template_id: string; p_workspace_id: string }
        Returns: undefined
      }
      can_access_storage_object: {
        Args: { object_name: string }
        Returns: boolean
      }
      claim_redirect_cache_events: {
        Args: { p_lease_seconds?: number; p_limit?: number }
        Returns: {
          id: string
          route_version: number
          slug: string
        }[]
      }
      complete_redirect_cache_event: {
        Args: { p_event_id: string; p_slug: string; p_version: number }
        Returns: undefined
      }
      configure_runtime_integrations: {
        Args: {
          p_cache_sync_url: string
          p_maintenance_secret: string
          p_project_url: string
          p_publishable_key: string
          p_rollup_secret: string
          p_sync_secret: string
        }
        Returns: undefined
      }
      delete_unused_location: {
        Args: { p_location_id: string; p_workspace_id: string }
        Returns: undefined
      }
      delete_empty_campaign: {
        Args: { p_campaign_id: string; p_workspace_id: string }
        Returns: undefined
      }
      enqueue_redirect_cache_reconciliation: {
        Args: { p_limit?: number }
        Returns: number
      }
      expire_stale_uploads: { Args: never; Returns: Json }
      fail_redirect_cache_event: {
        Args: { p_error: string; p_event_id: string; p_retryable: boolean }
        Returns: undefined
      }
      finalize_flyer_batch: {
        Args: {
          p_batch_id: string
          p_file_size_bytes: number
          p_sha256: string
          p_storage_path: string
          p_user_id: string
        }
        Returns: Json
      }
      finalize_template: { Args: { p_template_id: string }; Returns: undefined }
      get_campaign_flyer_batches: {
        Args: { p_campaign_id: string; p_workspace_id: string }
        Returns: Json
      }
      get_flyer_batch: { Args: { p_batch_id: string }; Returns: Json }
      get_flyer_batch_as: {
        Args: { p_batch_id: string; p_user_id: string }
        Returns: Json
      }
      get_scan_rollup_summary: {
        Args: { p_from: string; p_to: string; p_workspace_id: string }
        Returns: Json
      }
      is_workspace_member: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      is_workspace_owner: { Args: { p_workspace_id: string }; Returns: boolean }
      refresh_qr_route: { Args: { p_flyer_id: string }; Returns: undefined }
      reserve_flyer_batch: {
        Args: {
          p_campaign_id: string
          p_sheet_count: number
          p_template_id: string
          p_tracking_origin: string
          p_workspace_id: string
        }
        Returns: Json
      }
      reserve_template: {
        Args: {
          p_campaign_id: string
          p_file_size_bytes: number
          p_filename: string
          p_height: number
          p_mime_type: string
          p_page_count: number
          p_placements: Json
          p_sha256: string
          p_width: number
          p_workspace_id: string
        }
        Returns: Json
      }
      retire_flyer: {
        Args: { p_flyer_id: string; p_workspace_id: string }
        Returns: undefined
      }
    }
    Enums: {
      activation_source: "ADMIN_SCAN" | "MANUAL_ADMIN_ENTRY"
      campaign_status: "DRAFT" | "ACTIVE" | "ARCHIVED"
      flyer_batch_status:
        | "RESERVED"
        | "GENERATED"
        | "STORED"
        | "FINALIZED"
        | "CANCELLED"
      flyer_status:
        | "RESERVED"
        | "GENERATED"
        | "PRINTED"
        | "ACTIVATED"
        | "RETIRED"
      outbox_status: "PENDING" | "PROCESSING" | "DONE" | "FAILED"
      qr_route_status: "ACTIVE" | "DISABLED"
      template_status: "UPLOADING" | "READY" | "FAILED" | "ARCHIVED"
      workspace_role: "OWNER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
          versioning_status: string
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
          versioning_status?: string
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
          versioning_status?: string
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      iceberg_namespaces: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          metadata: Json
          name: string
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          remote_table_id: string | null
          shard_id: string | null
          shard_key: string | null
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            isOneToOne: false
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          archived_at: string | null
          bucket_id: string | null
          created_at: string | null
          id: string
          is_delete_marker: boolean
          is_versioned: boolean
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          archived_at?: string | null
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          is_delete_marker?: boolean
          is_versioned?: boolean
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          archived_at?: string | null
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          is_delete_marker?: boolean
          is_versioned?: boolean
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activation_source: ["ADMIN_SCAN", "MANUAL_ADMIN_ENTRY"],
      campaign_status: ["DRAFT", "ACTIVE", "ARCHIVED"],
      flyer_batch_status: [
        "RESERVED",
        "GENERATED",
        "STORED",
        "FINALIZED",
        "CANCELLED",
      ],
      flyer_status: [
        "RESERVED",
        "GENERATED",
        "PRINTED",
        "ACTIVATED",
        "RETIRED",
      ],
      outbox_status: ["PENDING", "PROCESSING", "DONE", "FAILED"],
      qr_route_status: ["ACTIVE", "DISABLED"],
      template_status: ["UPLOADING", "READY", "FAILED", "ARCHIVED"],
      workspace_role: ["OWNER"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
