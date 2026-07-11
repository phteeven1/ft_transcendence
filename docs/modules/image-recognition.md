# AI Minor — Image recognition

**Points:** 1 · **Category:** Artificial Intelligence

## Summary

Parents upload a photo of a vocabulary list (worksheet, textbook page, or handwritten list). The backend runs **Tesseract.js OCR** on the image, then **OpenAI GPT-4o** structures the text into word/translation pairs and a list title.

PDF uploads skip OCR and use text extraction instead; the same AI structuring step applies.

## Demo steps

1. Sign in as a parent → open a group → **Manage Vocabulary**
2. Use **AI Vocabulary Import**
3. Select **From / To language** (e.g. French → English)
4. Upload a clear PNG/JPEG photo with at least 5 word pairs
5. Review extracted pairs and title → save as a group vocabulary list

## Technical flow

```
Frontend (import-vocabulary.tsx)
  → POST /vocabularies/extract (multipart)
  → ExtractionService.extractDocumentText()
       → images: Tesseract.js OCR
       → PDFs: pdf-parse
  → OpenAI GPT-4o (JSON word/meaning pairs + title)
  → Validation (minimum 5 pairs)
  → User saves via POST /vocabularies
```

## Key files

| Layer | Path |
|-------|------|
| OCR + AI | `apps/backend/src/vocabularies/extraction.service.ts` |
| Endpoint | `apps/backend/src/vocabularies/vocabularies.controller.ts` |
| UI | `apps/frontend/app/manage_vocabulary/_components/import-vocabulary.tsx` |
| API client | `apps/frontend/app/lib/api/vocabularies.api.ts` |

## Dependencies

- `tesseract.js` — OCR
- `openai` — structuring extracted text
- `pdf-parse` — PDF text extraction
- `multer` — secure multipart upload
