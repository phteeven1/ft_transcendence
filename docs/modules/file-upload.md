# Web Minor — File upload

**Points:** 1 · **Category:** Web

## Summary

Admins upload **vocabulary files** (images and PDFs) for AI extraction. Upload uses **Multer** on the backend with in-memory storage, file size limits, and MIME type validation. The frontend shows file selection and upload progress via loading state.

Supported paths:

- **Images** (PNG, JPEG, …) → OCR + AI structuring
- **PDF** → text extraction + AI structuring
- **Manual entry** — separate CRUD, not file upload

## Demo steps

1. Manage Vocabulary → **AI Vocabulary Import**
2. Select a PDF or image (max 10 MB)
3. Choose from/to language → upload
4. Show extracted pairs before saving to database

## Validation

| Check | Where |
|-------|--------|
| File present | Backend `BadRequestException` if missing |
| Max size 10 MB | Multer `limits.fileSize` |
| MIME / extension | `ExtractionService` rejects unsupported types |
| Min 5 word pairs | After AI extraction, server-side |
| Client file picker | `accept` attribute + user feedback on error |

## Key files

| Layer | Path |
|-------|------|
| Upload endpoint | `apps/backend/src/vocabularies/vocabularies.controller.ts` (`POST extract`) |
| Multer config | `FileInterceptor('file', { storage: memoryStorage(), limits: … })` |
| Processing | `apps/backend/src/vocabularies/extraction.service.ts` |
| Frontend UI | `apps/frontend/app/manage_vocabulary/_components/import-vocabulary.tsx` |
| API client | `apps/frontend/app/lib/api/vocabularies.api.ts` |

## Security notes

- Files stored in memory for processing, not written to public disk paths
- Upload requires authenticated parent flow (group context on save)
- OCR/AI output validated before persisting vocabulary

## Related module

Image OCR details: [image-recognition.md](./image-recognition.md)

## Eval talking points

- “We support **multiple file types** — images and PDFs — with server-side validation.”
- “**Multer** handles multipart upload; size and type are enforced on the backend.”
- “Upload is integrated into the **vocabulary workflow**, not a standalone file manager.”
