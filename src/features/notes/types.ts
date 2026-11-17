import type { components, paths } from "@/lib/api/notes-schema";

// Named aliases over the generated notes types (openapi/notes.json, from
// go-service-template). The module's code imports from here.

type Schemas = components["schemas"];

export type NotesPaths = paths;
export type Note = Schemas["internal_module_note.NoteResponse"];
export type NewNote = Schemas["internal_module_note.CreateNoteRequest"];
export type NoteChange = Schemas["internal_module_note.UpdateNoteRequest"];
export type NotesBulkDeleted =
  Schemas["internal_module_note.BulkDeleteResponse"];
/** The statuses the API accepts on a write; a read may report another. */
export type NoteStatus = NonNullable<NewNote["status"]>;
