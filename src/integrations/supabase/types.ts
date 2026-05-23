export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          module: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          module: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          module?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      area_settings: {
        Row: {
          badge_class: string
          created_at: string
          icon: string
          id: string
          name: string
          soft_class: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          badge_class?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          soft_class?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          badge_class?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          soft_class?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      automatic_report_configs: {
        Row: {
          created_at: string
          created_by: string
          end_date: string | null
          frequency: string
          id: string
          include_area_filter: boolean
          include_assignee_filter: boolean
          include_category_filter: boolean
          include_charts: boolean
          include_priority_filter: boolean
          include_status_filter: boolean
          include_summary: boolean
          is_active: boolean
          name: string
          period_type: string
          recipient_emails: string[]
          report_type: string
          send_time: string
          start_date: string | null
          updated_at: string
          work_end_time: string
          work_start_time: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_date?: string | null
          frequency?: string
          id?: string
          include_area_filter?: boolean
          include_assignee_filter?: boolean
          include_category_filter?: boolean
          include_charts?: boolean
          include_priority_filter?: boolean
          include_status_filter?: boolean
          include_summary?: boolean
          is_active?: boolean
          name: string
          period_type?: string
          recipient_emails?: string[]
          report_type: string
          send_time?: string
          start_date?: string | null
          updated_at?: string
          work_end_time?: string
          work_start_time?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_date?: string | null
          frequency?: string
          id?: string
          include_area_filter?: boolean
          include_assignee_filter?: boolean
          include_category_filter?: boolean
          include_charts?: boolean
          include_priority_filter?: boolean
          include_status_filter?: boolean
          include_summary?: boolean
          is_active?: boolean
          name?: string
          period_type?: string
          recipient_emails?: string[]
          report_type?: string
          send_time?: string
          start_date?: string | null
          updated_at?: string
          work_end_time?: string
          work_start_time?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          action: string
          created_at: string
          email_id: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          email_id?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          email_id?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      epps: {
        Row: {
          actividad: string | null
          area: string
          codigo_nextsis: string | null
          created_at: string
          created_by: string | null
          descripcion: string | null
          estado: string
          id: string
          imagen_url: string | null
          nombre: string
          norma: string | null
          requiere_firma: boolean
          riesgo_previsto: string | null
          updated_at: string
          vida_util_dias: number
        }
        Insert: {
          actividad?: string | null
          area: string
          codigo_nextsis?: string | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          estado?: string
          id?: string
          imagen_url?: string | null
          nombre: string
          norma?: string | null
          requiere_firma?: boolean
          riesgo_previsto?: string | null
          updated_at?: string
          vida_util_dias?: number
        }
        Update: {
          actividad?: string | null
          area?: string
          codigo_nextsis?: string | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          estado?: string
          id?: string
          imagen_url?: string | null
          nombre?: string
          norma?: string | null
          requiere_firma?: boolean
          riesgo_previsto?: string | null
          updated_at?: string
          vida_util_dias?: number
        }
        Relationships: []
      }
      equipment_assignment_items: {
        Row: {
          assignment_id: string
          assignment_reason: string
          created_at: string
          delivery_date: string
          equipment_condition: string
          equipo_codigo: string
          equipo_id: string
          equipo_marca: string | null
          equipo_modelo: string | null
          equipo_nombre: string
          equipo_serie: string | null
          id: string
          return_date: string | null
          return_reason: string | null
          updated_at: string
        }
        Insert: {
          assignment_id: string
          assignment_reason: string
          created_at?: string
          delivery_date?: string
          equipment_condition?: string
          equipo_codigo: string
          equipo_id: string
          equipo_marca?: string | null
          equipo_modelo?: string | null
          equipo_nombre: string
          equipo_serie?: string | null
          id?: string
          return_date?: string | null
          return_reason?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          assignment_reason?: string
          created_at?: string
          delivery_date?: string
          equipment_condition?: string
          equipo_codigo?: string
          equipo_id?: string
          equipo_marca?: string | null
          equipo_modelo?: string | null
          equipo_nombre?: string
          equipo_serie?: string | null
          id?: string
          return_date?: string | null
          return_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assignment_items_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "equipment_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignment_items_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_assignment_reasons: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      equipment_assignments: {
        Row: {
          assigner_name: string
          assigner_position: string | null
          assignment_date: string
          created_at: string
          created_by: string
          id: string
          observations: string | null
          status: string
          updated_at: string
          worker_dni: string | null
          worker_id: string
          worker_name: string
          worker_position: string | null
        }
        Insert: {
          assigner_name?: string
          assigner_position?: string | null
          assignment_date?: string
          created_at?: string
          created_by: string
          id?: string
          observations?: string | null
          status?: string
          updated_at?: string
          worker_dni?: string | null
          worker_id: string
          worker_name: string
          worker_position?: string | null
        }
        Update: {
          assigner_name?: string
          assigner_position?: string | null
          assignment_date?: string
          created_at?: string
          created_by?: string
          id?: string
          observations?: string | null
          status?: string
          updated_at?: string
          worker_dni?: string | null
          worker_id?: string
          worker_name?: string
          worker_position?: string | null
        }
        Relationships: []
      }
      equipment_return_reasons: {
        Row: {
          created_at: string
          has_continuity: boolean
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          has_continuity?: boolean
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          has_continuity?: boolean
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      equipos: {
        Row: {
          codigo: string
          created_at: string
          created_by: string
          fecha_alta: string | null
          fecha_baja: string | null
          id: string
          inventario_id: string
          marca: string | null
          modelo: string | null
          nombre: string
          nro_serie: string | null
          operativo: boolean
          red_linea: string | null
          sede: string
          tarjeta_sim: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          created_by: string
          fecha_alta?: string | null
          fecha_baja?: string | null
          id?: string
          inventario_id: string
          marca?: string | null
          modelo?: string | null
          nombre: string
          nro_serie?: string | null
          operativo?: boolean
          red_linea?: string | null
          sede?: string
          tarjeta_sim?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          created_by?: string
          fecha_alta?: string | null
          fecha_baja?: string | null
          id?: string
          inventario_id?: string
          marca?: string | null
          modelo?: string | null
          nombre?: string
          nro_serie?: string | null
          operativo?: boolean
          red_linea?: string | null
          sede?: string
          tarjeta_sim?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipos_inventario_id_fkey"
            columns: ["inventario_id"]
            isOneToOne: false
            referencedRelation: "inventarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ext_emails: {
        Row: {
          autorizado: boolean
          confirmado: boolean | null
          confirmado_fecha: string | null
          correo_enviado: boolean | null
          correo_externo: string | null
          correo_usuario: string | null
          dominio: string | null
          fecha_autorizado: string | null
          fecha_correo_enviado: string | null
          fecha_registro: string | null
          hora_registro: string | null
          id: string
          informado: boolean | null
          motivo_comunicacion: string | null
          nombre_contacto: string | null
          numero: number | null
          pendiente_ti: string | null
          recuperado_ti: boolean | null
          tipo_correo: string | null
          usuario_autorizado: string | null
          usuario_id: string | null
        }
        Insert: {
          autorizado?: boolean
          confirmado?: boolean | null
          confirmado_fecha?: string | null
          correo_enviado?: boolean | null
          correo_externo?: string | null
          correo_usuario?: string | null
          dominio?: string | null
          fecha_autorizado?: string | null
          fecha_correo_enviado?: string | null
          fecha_registro?: string | null
          hora_registro?: string | null
          id: string
          informado?: boolean | null
          motivo_comunicacion?: string | null
          nombre_contacto?: string | null
          numero?: number | null
          pendiente_ti?: string | null
          recuperado_ti?: boolean | null
          tipo_correo?: string | null
          usuario_autorizado?: string | null
          usuario_id?: string | null
        }
        Update: {
          autorizado?: boolean
          confirmado?: boolean | null
          confirmado_fecha?: string | null
          correo_enviado?: boolean | null
          correo_externo?: string | null
          correo_usuario?: string | null
          dominio?: string | null
          fecha_autorizado?: string | null
          fecha_correo_enviado?: string | null
          fecha_registro?: string | null
          hora_registro?: string | null
          id?: string
          informado?: boolean | null
          motivo_comunicacion?: string | null
          nombre_contacto?: string | null
          numero?: number | null
          pendiente_ti?: string | null
          recuperado_ti?: boolean | null
          tipo_correo?: string | null
          usuario_autorizado?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      form_templates: {
        Row: {
          code: string | null
          created_at: string
          created_by: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          structure: Json
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          structure: Json
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          structure?: Json
          updated_at?: string
        }
        Relationships: []
      }
      inventarios: {
        Row: {
          comentario: string | null
          created_at: string
          created_by: string
          fecha_inventario: string
          id: string
          updated_at: string
          vigente: boolean
          year: number
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          created_by: string
          fecha_inventario?: string
          id?: string
          updated_at?: string
          vigente?: boolean
          year: number
        }
        Update: {
          comentario?: string | null
          created_at?: string
          created_by?: string
          fecha_inventario?: string
          id?: string
          updated_at?: string
          vigente?: boolean
          year?: number
        }
        Relationships: []
      }
      kardex_entries: {
        Row: {
          change_request_date: string | null
          created_at: string
          created_by: string | null
          delivery_date: string
          delivery_type: string
          epp_id: string
          event_type: string
          header_id: string | null
          id: string
          observations: string | null
          quantity: number
          reason: string
          responsible_name: string | null
          responsible_signature: string | null
          return_date: string | null
          updated_at: string
          void_reason: string | null
          voided: boolean
          voided_at: string | null
          worker_id: string
          worker_signature: string | null
        }
        Insert: {
          change_request_date?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string
          delivery_type?: string
          epp_id: string
          event_type?: string
          header_id?: string | null
          id?: string
          observations?: string | null
          quantity?: number
          reason?: string
          responsible_name?: string | null
          responsible_signature?: string | null
          return_date?: string | null
          updated_at?: string
          void_reason?: string | null
          voided?: boolean
          voided_at?: string | null
          worker_id: string
          worker_signature?: string | null
        }
        Update: {
          change_request_date?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string
          delivery_type?: string
          epp_id?: string
          event_type?: string
          header_id?: string | null
          id?: string
          observations?: string | null
          quantity?: number
          reason?: string
          responsible_name?: string | null
          responsible_signature?: string | null
          return_date?: string | null
          updated_at?: string
          void_reason?: string | null
          voided?: boolean
          voided_at?: string | null
          worker_id?: string
          worker_signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kardex_entries_header_id_fkey"
            columns: ["header_id"]
            isOneToOne: false
            referencedRelation: "kardex_headers"
            referencedColumns: ["id"]
          },
        ]
      }
      kardex_headers: {
        Row: {
          change_request_date: string | null
          created_at: string
          created_by: string | null
          delivery_date: string
          id: string
          observations: string | null
          responsible_name: string | null
          responsible_signature: string | null
          return_date: string | null
          updated_at: string
          void_reason: string | null
          voided: boolean
          voided_at: string | null
          worker_id: string
          worker_signature: string | null
        }
        Insert: {
          change_request_date?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string
          id?: string
          observations?: string | null
          responsible_name?: string | null
          responsible_signature?: string | null
          return_date?: string | null
          updated_at?: string
          void_reason?: string | null
          voided?: boolean
          voided_at?: string | null
          worker_id: string
          worker_signature?: string | null
        }
        Update: {
          change_request_date?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string
          id?: string
          observations?: string | null
          responsible_name?: string | null
          responsible_signature?: string | null
          return_date?: string | null
          updated_at?: string
          void_reason?: string | null
          voided?: boolean
          voided_at?: string | null
          worker_id?: string
          worker_signature?: string | null
        }
        Relationships: []
      }
      kardex_report_config: {
        Row: {
          actividad_economica: string
          codigo: string
          created_at: string
          direccion: string
          fecha: string
          headers: Json
          id: string
          pie_texto: string
          razon_social: string
          ruc: string
          texto_descriptivo: string
          titulo: string
          updated_at: string
          version: string
        }
        Insert: {
          actividad_economica?: string
          codigo?: string
          created_at?: string
          direccion?: string
          fecha?: string
          headers?: Json
          id?: string
          pie_texto?: string
          razon_social?: string
          ruc?: string
          texto_descriptivo?: string
          titulo?: string
          updated_at?: string
          version?: string
        }
        Update: {
          actividad_economica?: string
          codigo?: string
          created_at?: string
          direccion?: string
          fecha?: string
          headers?: Json
          id?: string
          pie_texto?: string
          razon_social?: string
          ruc?: string
          texto_descriptivo?: string
          titulo?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      maintenance_plan_config: {
        Row: {
          code: string
          created_at: string
          created_by: string
          date: string
          elaborado_por: string | null
          fecha_actualizacion: string | null
          id: string
          puesto_trabajo: string | null
          updated_at: string
          version: string
          year: number
        }
        Insert: {
          code?: string
          created_at?: string
          created_by: string
          date: string
          elaborado_por?: string | null
          fecha_actualizacion?: string | null
          id?: string
          puesto_trabajo?: string | null
          updated_at?: string
          version?: string
          year: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          date?: string
          elaborado_por?: string | null
          fecha_actualizacion?: string | null
          id?: string
          puesto_trabajo?: string | null
          updated_at?: string
          version?: string
          year?: number
        }
        Relationships: []
      }
      maintenance_plan_items: {
        Row: {
          actividad: string
          area: string
          cargo_responsable: string | null
          codigo_equipo: string | null
          created_at: string
          created_by: string
          id: string
          observaciones: string | null
          tipo: string
          tipo_equipo: string
          updated_at: string
          year: number
        }
        Insert: {
          actividad: string
          area: string
          cargo_responsable?: string | null
          codigo_equipo?: string | null
          created_at?: string
          created_by: string
          id?: string
          observaciones?: string | null
          tipo?: string
          tipo_equipo: string
          updated_at?: string
          year?: number
        }
        Update: {
          actividad?: string
          area?: string
          cargo_responsable?: string | null
          codigo_equipo?: string | null
          created_at?: string
          created_by?: string
          id?: string
          observaciones?: string | null
          tipo?: string
          tipo_equipo?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      maintenance_schedule: {
        Row: {
          created_at: string
          id: string
          is_ejecutado: boolean
          is_programado: boolean
          maintenance_item_id: string
          month: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_ejecutado?: boolean
          is_programado?: boolean
          maintenance_item_id: string
          month: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_ejecutado?: boolean
          is_programado?: boolean
          maintenance_item_id?: string
          month?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedule_maintenance_item_id_fkey"
            columns: ["maintenance_item_id"]
            isOneToOne: false
            referencedRelation: "maintenance_plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      module_permissions: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          granted: boolean
          id: string
          module: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          granted?: boolean
          id?: string
          module: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          granted?: boolean
          id?: string
          module?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_recipients: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_bcc: boolean | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_bcc?: boolean | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_bcc?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          area: string
          avatar_url: string | null
          cargo: string | null
          created_at: string
          dashboard_show_all_tickets: boolean | null
          dni: string | null
          email: string
          full_name: string
          id: string
          last_login: string | null
          notifications_enabled: boolean | null
          page_show_all_tickets: boolean | null
          personnel_type: Database["public"]["Enums"]["personnel_type"]
          role: Database["public"]["Enums"]["user_role"]
          sede: string
          signature_validated: boolean
          signature_validated_at: string | null
          signature_validated_by: string | null
          status: string
          updated_at: string
          user_id: string
          validated_signature: string | null
        }
        Insert: {
          active?: boolean
          area: string
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          dashboard_show_all_tickets?: boolean | null
          dni?: string | null
          email: string
          full_name: string
          id?: string
          last_login?: string | null
          notifications_enabled?: boolean | null
          page_show_all_tickets?: boolean | null
          personnel_type?: Database["public"]["Enums"]["personnel_type"]
          role?: Database["public"]["Enums"]["user_role"]
          sede?: string
          signature_validated?: boolean
          signature_validated_at?: string | null
          signature_validated_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          validated_signature?: string | null
        }
        Update: {
          active?: boolean
          area?: string
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          dashboard_show_all_tickets?: boolean | null
          dni?: string | null
          email?: string
          full_name?: string
          id?: string
          last_login?: string | null
          notifications_enabled?: boolean | null
          page_show_all_tickets?: boolean | null
          personnel_type?: Database["public"]["Enums"]["personnel_type"]
          role?: Database["public"]["Enums"]["user_role"]
          sede?: string
          signature_validated?: boolean
          signature_validated_at?: string | null
          signature_validated_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          validated_signature?: string | null
        }
        Relationships: []
      }
      room_requests: {
        Row: {
          created_at: string | null
          description_html: string | null
          end_time: string
          id: string
          m365_event_id: string | null
          organizer_email: string
          organizer_id: string
          participants: Json | null
          resources: Json | null
          room_email: string
          room_id: string
          start_time: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description_html?: string | null
          end_time: string
          id?: string
          m365_event_id?: string | null
          organizer_email: string
          organizer_id: string
          participants?: Json | null
          resources?: Json | null
          room_email: string
          room_id: string
          start_time: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description_html?: string | null
          end_time?: string
          id?: string
          m365_event_id?: string | null
          organizer_email?: string
          organizer_id?: string
          participants?: Json | null
          resources?: Json | null
          room_email?: string
          room_id?: string
          start_time?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sent_reports_history: {
        Row: {
          config_id: string
          created_by: string
          email_status: string
          email_subject: string | null
          error_message: string | null
          frequency: string | null
          id: string
          period_type: string | null
          recipient_emails: string[]
          report_data: Json | null
          report_end_date: string | null
          report_start_date: string | null
          report_type: string
          sent_at: string
        }
        Insert: {
          config_id: string
          created_by: string
          email_status?: string
          email_subject?: string | null
          error_message?: string | null
          frequency?: string | null
          id?: string
          period_type?: string | null
          recipient_emails: string[]
          report_data?: Json | null
          report_end_date?: string | null
          report_start_date?: string | null
          report_type: string
          sent_at?: string
        }
        Update: {
          config_id?: string
          created_by?: string
          email_status?: string
          email_subject?: string | null
          error_message?: string | null
          frequency?: string | null
          id?: string
          period_type?: string | null
          recipient_emails?: string[]
          report_data?: Json | null
          report_end_date?: string | null
          report_start_date?: string | null
          report_type?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sent_reports_history_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "automatic_report_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      support_conversations: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          id: string
          last_message_at: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          id?: string
          last_message_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          id?: string
          last_message_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          message_type: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message_type?: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message_type?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_participants: {
        Row: {
          conversation_id: string
          id: string
          is_online: boolean
          is_typing: boolean
          joined_at: string
          last_seen: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_online?: boolean
          is_typing?: boolean
          joined_at?: string
          last_seen?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_online?: boolean
          is_typing?: boolean
          joined_at?: string
          last_seen?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_areas: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ti_task_activities: {
        Row: {
          activity_number: number
          completed: boolean
          completed_at: string | null
          completion_date: string | null
          completion_time: string | null
          created_at: string
          created_by: string
          description: string
          due_date: string
          duration_days: number | null
          end_time: string | null
          id: string
          progress: number
          start_date: string | null
          start_time: string | null
          ti_task_id: string
          updated_at: string
        }
        Insert: {
          activity_number: number
          completed?: boolean
          completed_at?: string | null
          completion_date?: string | null
          completion_time?: string | null
          created_at?: string
          created_by: string
          description: string
          due_date: string
          duration_days?: number | null
          end_time?: string | null
          id?: string
          progress?: number
          start_date?: string | null
          start_time?: string | null
          ti_task_id: string
          updated_at?: string
        }
        Update: {
          activity_number?: number
          completed?: boolean
          completed_at?: string | null
          completion_date?: string | null
          completion_time?: string | null
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string
          duration_days?: number | null
          end_time?: string | null
          id?: string
          progress?: number
          start_date?: string | null
          start_time?: string | null
          ti_task_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      ti_task_attachments: {
        Row: {
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          ti_task_id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          ti_task_id: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          ti_task_id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      ti_task_categories: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ti_task_priorities: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          level: number
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level: number
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ti_task_reminders_sent: {
        Row: {
          created_at: string
          id: string
          reminder_type: string
          sent_at: string
          ti_task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reminder_type: string
          sent_at?: string
          ti_task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reminder_type?: string
          sent_at?: string
          ti_task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ti_task_reminders_sent_ti_task_id_fkey"
            columns: ["ti_task_id"]
            isOneToOne: false
            referencedRelation: "ti_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      ti_task_statuses: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          order_index: number
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          order_index?: number
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      ti_tasks: {
        Row: {
          activities_progress_avg: number | null
          area: string | null
          assignee: string | null
          category: string
          code: string
          conformidad_date: string | null
          conformidad_status: boolean | null
          conformidad_user_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          mentioned_users: string[] | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          reminder_date: string | null
          reminder_frequency: Json | null
          sede: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          activities_progress_avg?: number | null
          area?: string | null
          assignee?: string | null
          category?: string
          code: string
          conformidad_date?: string | null
          conformidad_status?: boolean | null
          conformidad_user_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          mentioned_users?: string[] | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          reminder_date?: string | null
          reminder_frequency?: Json | null
          sede?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          activities_progress_avg?: number | null
          area?: string | null
          assignee?: string | null
          category?: string
          code?: string
          conformidad_date?: string | null
          conformidad_status?: boolean | null
          conformidad_user_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          mentioned_users?: string[] | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          reminder_date?: string | null
          reminder_frequency?: Json | null
          sede?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      ticket_activities: {
        Row: {
          activity_number: number
          completed: boolean
          completed_at: string | null
          completion_date: string | null
          completion_time: string | null
          created_at: string
          created_by: string
          description: string
          due_date: string
          duration_days: number | null
          end_time: string | null
          id: string
          progress: number
          start_date: string | null
          start_time: string | null
          ticket_id: string
          updated_at: string
        }
        Insert: {
          activity_number: number
          completed?: boolean
          completed_at?: string | null
          completion_date?: string | null
          completion_time?: string | null
          created_at?: string
          created_by: string
          description: string
          due_date: string
          duration_days?: number | null
          end_time?: string | null
          id?: string
          progress?: number
          start_date?: string | null
          start_time?: string | null
          ticket_id: string
          updated_at?: string
        }
        Update: {
          activity_number?: number
          completed?: boolean
          completed_at?: string | null
          completion_date?: string | null
          completion_time?: string | null
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string
          duration_days?: number | null
          end_time?: string | null
          id?: string
          progress?: number
          start_date?: string | null
          start_time?: string | null
          ticket_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      ticket_attachments: {
        Row: {
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          ticket_id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          ticket_id: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          ticket_id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_categories: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ticket_priorities: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          level: number
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level: number
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ticket_responses: {
        Row: {
          content: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ticket_responses_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ticket_statuses: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          order_index: number
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          order_index?: number
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          activities_progress_avg: number | null
          assignee: string | null
          category: string
          code: string
          conformidad_date: string | null
          conformidad_status: boolean | null
          conformidad_user_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          mentioned_users: string[] | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          requester: string
          requester_area: string | null
          requester_cargo: string | null
          requester_email: string
          requester_sede: string
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          activities_progress_avg?: number | null
          assignee?: string | null
          category?: string
          code: string
          conformidad_date?: string | null
          conformidad_status?: boolean | null
          conformidad_user_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          mentioned_users?: string[] | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          requester: string
          requester_area?: string | null
          requester_cargo?: string | null
          requester_email: string
          requester_sede?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          activities_progress_avg?: number | null
          assignee?: string | null
          category?: string
          code?: string
          conformidad_date?: string | null
          conformidad_status?: boolean | null
          conformidad_user_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          mentioned_users?: string[] | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          requester?: string
          requester_area?: string | null
          requester_cargo?: string | null
          requester_email?: string
          requester_sede?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_access: boolean
          created_at: string
          id: string
          page_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_access?: boolean
          created_at?: string
          id?: string
          page_slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_access?: boolean
          created_at?: string
          id?: string
          page_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_update_password: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      create_admin_user: { Args: never; Returns: undefined }
      generate_equipo_code: {
        Args: { p_sede: string; p_tipo: string }
        Returns: string
      }
      generate_form_template_code: { Args: never; Returns: string }
      generate_next_email_id: {
        Args: never
        Returns: {
          next_id: string
          next_numero: number
        }[]
      }
      generate_ti_task_code: { Args: never; Returns: string }
      generate_ticket_code: {
        Args: { area: string; sede: string }
        Returns: string
      }
      get_user_area: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_module_permission: {
        Args: { _action: string; _module: string; _user_id: string }
        Returns: boolean
      }
      is_admin_session: { Args: never; Returns: boolean }
      is_gerencia_user_safe: {
        Args: { check_user_id?: string }
        Returns: boolean
      }
      is_ti_user_safe: { Args: { check_user_id?: string }; Returns: boolean }
      sync_auth_users_to_profiles: { Args: never; Returns: undefined }
      update_user_profile: {
        Args: {
          new_area: string
          new_cargo?: string
          new_full_name: string
          new_role?: Database["public"]["Enums"]["user_role"]
          new_sede?: string
          target_user_id: string
        }
        Returns: Json
      }
      users_same_area: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
    }
    Enums: {
      email_origin: "informado" | "recuperado_ti"
      personnel_type: "administrativo" | "operativo"
      ticket_priority: "low" | "medium" | "high" | "critical"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      user_role: "usuario" | "gerencia" | "ti"
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
  public: {
    Enums: {
      email_origin: ["informado", "recuperado_ti"],
      personnel_type: ["administrativo", "operativo"],
      ticket_priority: ["low", "medium", "high", "critical"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      user_role: ["usuario", "gerencia", "ti"],
    },
  },
} as const
