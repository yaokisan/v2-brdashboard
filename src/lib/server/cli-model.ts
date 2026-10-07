import 'server-only'

// Reviewed CLI contract. Never derive table/column permissions from a request.
export type CliField = { type: string; format?: string; nullable: boolean; enum?: string[] }
export type CliTable = { fields: Record<string, CliField>; required_create: string[]; immutable: string[]; default_select: string[]; default_order: string; unique?: string[][] }
export const cliModel: { version: number; tables: Record<string, CliTable>; relations: {table: string; field: string; references: string; on_delete: string}[]; notes: string[] } = {
  "version": 1,
  "tables": {
    "projects": {
      "fields": {
        "id": {
          "type": "string",
          "format": "uuid",
          "nullable": false
        },
        "title": {
          "type": "string",
          "nullable": false
        },
        "recording_date": {
          "type": "string",
          "format": "date",
          "nullable": false
        },
        "total_recording_time": {
          "type": "string",
          "nullable": false
        },
        "location": {
          "type": "string",
          "nullable": false
        },
        "address": {
          "type": "string",
          "nullable": true
        },
        "location_map_url": {
          "type": "string",
          "nullable": true
        },
        "has_after_party": {
          "type": "boolean",
          "nullable": true
        },
        "after_party_start_time": {
          "type": "string",
          "nullable": true
        },
        "after_party_location": {
          "type": "string",
          "nullable": true
        },
        "after_party_address": {
          "type": "string",
          "nullable": true
        },
        "after_party_map_url": {
          "type": "string",
          "nullable": true
        },
        "after_party_note": {
          "type": "string",
          "nullable": true
        },
        "after_party_deadline": {
          "type": "string",
          "format": "date",
          "nullable": true
        },
        "entry_method": {
          "type": "string",
          "nullable": true
        },
        "created_at": {
          "type": "string",
          "format": "datetime",
          "nullable": true
        },
        "updated_at": {
          "type": "string",
          "format": "datetime",
          "nullable": true
        }
      },
      "required_create": [
        "title",
        "recording_date",
        "total_recording_time",
        "location"
      ],
      "immutable": [
        "id",
        "created_at",
        "updated_at"
      ],
      "default_select": [
        "id",
        "title",
        "recording_date",
        "total_recording_time",
        "location",
        "has_after_party"
      ],
      "default_order": "created_at.desc"
    },
    "performers": {
      "fields": {
        "id": {
          "type": "string",
          "format": "uuid",
          "nullable": false
        },
        "project_id": {
          "type": "string",
          "format": "uuid",
          "nullable": false
        },
        "name": {
          "type": "string",
          "nullable": false
        },
        "role": {
          "type": "string",
          "nullable": true
        },
        "start_time": {
          "type": "string",
          "format": "time",
          "nullable": true
        },
        "end_time": {
          "type": "string",
          "format": "time",
          "nullable": true
        },
        "available_start_time": {
          "type": "string",
          "format": "time",
          "nullable": true
        },
        "available_end_time": {
          "type": "string",
          "format": "time",
          "nullable": true
        },
        "is_time_confirmed": {
          "type": "boolean",
          "nullable": true
        },
        "belongings": {
          "type": "string",
          "nullable": true
        },
        "program_items": {
          "type": "string",
          "nullable": true
        },
        "sort_order": {
          "type": "integer",
          "nullable": true
        },
        "created_at": {
          "type": "string",
          "format": "datetime",
          "nullable": true
        },
        "updated_at": {
          "type": "string",
          "format": "datetime",
          "nullable": true
        }
      },
      "required_create": [
        "project_id",
        "name"
      ],
      "immutable": [
        "id",
        "project_id",
        "created_at",
        "updated_at"
      ],
      "default_select": [
        "id",
        "project_id",
        "name",
        "sort_order",
        "start_time",
        "end_time",
        "is_time_confirmed"
      ],
      "default_order": "sort_order.asc.nullslast,id.asc"
    },
    "plans": {
      "fields": {
        "id": {
          "type": "string",
          "format": "uuid",
          "nullable": false
        },
        "project_id": {
          "type": "string",
          "format": "uuid",
          "nullable": false
        },
        "title": {
          "type": "string",
          "nullable": false
        },
        "scheduled_time": {
          "type": "string",
          "format": "time",
          "nullable": true
        },
        "duration": {
          "type": "string",
          "nullable": false
        },
        "script_url": {
          "type": "string",
          "nullable": true
        },
        "has_script": {
          "type": "boolean",
          "nullable": true
        },
        "notes": {
          "type": "string",
          "nullable": true
        },
        "reference_video_url": {
          "type": "string",
          "nullable": true
        },
        "is_confirmed": {
          "type": "boolean",
          "nullable": true
        },
        "created_at": {
          "type": "string",
          "format": "datetime",
          "nullable": true
        },
        "updated_at": {
          "type": "string",
          "format": "datetime",
          "nullable": true
        }
      },
      "required_create": [
        "project_id",
        "title",
        "duration"
      ],
      "immutable": [
        "id",
        "project_id",
        "created_at",
        "updated_at"
      ],
      "default_select": [
        "id",
        "project_id",
        "title",
        "scheduled_time",
        "duration",
        "is_confirmed",
        "has_script"
      ],
      "default_order": "scheduled_time.asc.nullslast,id.asc"
    },
    "plan_performers": {
      "fields": {
        "id": {
          "type": "string",
          "format": "uuid",
          "nullable": false
        },
        "plan_id": {
          "type": "string",
          "format": "uuid",
          "nullable": false
        },
        "performer_id": {
          "type": "string",
          "format": "uuid",
          "nullable": false
        },
        "role": {
          "type": "string",
          "nullable": false
        },
        "created_at": {
          "type": "string",
          "format": "datetime",
          "nullable": true
        }
      },
      "required_create": [
        "plan_id",
        "performer_id",
        "role"
      ],
      "immutable": [
        "id",
        "plan_id",
        "performer_id",
        "created_at"
      ],
      "default_select": [
        "id",
        "plan_id",
        "performer_id",
        "role"
      ],
      "default_order": "created_at.asc,id.asc",
      "unique": [
        [
          "plan_id",
          "performer_id"
        ]
      ]
    },
    "schedule_items": {
      "fields": {
        "id": {
          "type": "string",
          "format": "uuid",
          "nullable": false
        },
        "project_id": {
          "type": "string",
          "format": "uuid",
          "nullable": false
        },
        "type": {
          "type": "string",
          "nullable": false,
          "enum": [
            "break",
            "preparation",
            "custom"
          ]
        },
        "title": {
          "type": "string",
          "nullable": false
        },
        "start_time": {
          "type": "string",
          "format": "time",
          "nullable": false
        },
        "duration": {
          "type": "integer",
          "nullable": false
        },
        "created_at": {
          "type": "string",
          "format": "datetime",
          "nullable": true
        },
        "updated_at": {
          "type": "string",
          "format": "datetime",
          "nullable": true
        }
      },
      "required_create": [
        "project_id",
        "type",
        "title",
        "start_time",
        "duration"
      ],
      "immutable": [
        "id",
        "project_id",
        "created_at",
        "updated_at"
      ],
      "default_select": [
        "id",
        "project_id",
        "type",
        "title",
        "start_time",
        "duration"
      ],
      "default_order": "start_time.asc,id.asc"
    },
    "proposals": {
      "fields": {
        "id": {
          "type": "string",
          "format": "uuid",
          "nullable": false
        },
        "title": {
          "type": "string",
          "nullable": false
        },
        "title_note": {
          "type": "string",
          "nullable": true
        },
        "recording_date_text": {
          "type": "string",
          "nullable": false
        },
        "recording_time_text": {
          "type": "string",
          "nullable": false
        },
        "location_text": {
          "type": "string",
          "nullable": false
        },
        "overview": {
          "type": "string",
          "nullable": true
        },
        "youtube_url": {
          "type": "string",
          "nullable": true
        },
        "youtube_embed_id": {
          "type": "string",
          "nullable": true
        },
        "video_description": {
          "type": "string",
          "nullable": true
        },
        "appearance_fee_type": {
          "type": "string",
          "nullable": false,
          "enum": [
            "promotional",
            "paid",
            "custom"
          ]
        },
        "appearance_fee_text": {
          "type": "string",
          "nullable": true
        },
        "transportation_type": {
          "type": "string",
          "nullable": false,
          "enum": [
            "self_expense",
            "provided",
            "custom"
          ]
        },
        "transportation_text": {
          "type": "string",
          "nullable": true
        },
        "expense_note": {
          "type": "string",
          "nullable": true
        },
        "slug": {
          "type": "string",
          "nullable": false
        },
        "is_published": {
          "type": "boolean",
          "nullable": false
        },
        "expires_at": {
          "type": "string",
          "format": "date",
          "nullable": true
        },
        "created_at": {
          "type": "string",
          "format": "datetime",
          "nullable": true
        },
        "updated_at": {
          "type": "string",
          "format": "datetime",
          "nullable": true
        }
      },
      "required_create": [
        "title",
        "recording_date_text",
        "recording_time_text",
        "location_text",
        "appearance_fee_type",
        "transportation_type",
        "slug",
        "is_published"
      ],
      "immutable": [
        "id",
        "created_at",
        "updated_at"
      ],
      "default_select": [
        "id",
        "title",
        "slug",
        "is_published",
        "expires_at"
      ],
      "default_order": "created_at.desc"
    },
    "after_party_attendances": {
      "fields": {
        "id": {
          "type": "string",
          "format": "uuid",
          "nullable": false
        },
        "project_id": {
          "type": "string",
          "format": "uuid",
          "nullable": false
        },
        "name": {
          "type": "string",
          "nullable": false
        },
        "status": {
          "type": "string",
          "nullable": false,
          "enum": [
            "attending",
            "not_attending"
          ]
        },
        "comment": {
          "type": "string",
          "nullable": true
        },
        "created_at": {
          "type": "string",
          "format": "datetime",
          "nullable": true
        },
        "updated_at": {
          "type": "string",
          "format": "datetime",
          "nullable": true
        }
      },
      "required_create": [
        "project_id",
        "name",
        "status"
      ],
      "immutable": [
        "id",
        "project_id",
        "created_at",
        "updated_at"
      ],
      "default_select": [
        "id",
        "project_id",
        "name",
        "status",
        "comment"
      ],
      "default_order": "created_at.asc,id.asc"
    }
  },
  "relations": [
    {
      "table": "performers",
      "field": "project_id",
      "references": "projects",
      "on_delete": "cascade"
    },
    {
      "table": "plans",
      "field": "project_id",
      "references": "projects",
      "on_delete": "cascade"
    },
    {
      "table": "schedule_items",
      "field": "project_id",
      "references": "projects",
      "on_delete": "cascade"
    },
    {
      "table": "after_party_attendances",
      "field": "project_id",
      "references": "projects",
      "on_delete": "cascade"
    },
    {
      "table": "plan_performers",
      "field": "plan_id",
      "references": "plans",
      "on_delete": "cascade"
    },
    {
      "table": "plan_performers",
      "field": "performer_id",
      "references": "performers",
      "on_delete": "cascade"
    }
  ],
  "notes": [
    "Model is an application contract, not a complete live PostgreSQL schema. Field names verified against repository database.ts and live table GETs; nullable flags are conservative local inference.",
    "Generated id/created_at/updated_at are not user payload fields. Parent foreign keys are required on create and immutable on update.",
    "plans.scheduled_time accepts null in the current application; old README SQL says NOT NULL. Server constraints remain authoritative.",
    "schedule_items.type custom is used by current application code; the checked-in old migration permits only break/preparation. Never silently change a rejected custom type.",
    "The two plan_performers parents must belong to the same project. Generic foreign keys alone do not enforce that invariant.",
    "default_order is a deterministic CLI convenience. App plan order is unspecified and performer null sort_order maps to 9999.",
    "Proposal publication must be explicit in the create payload; new invitation drafts should set is_published false."
  ]
}
