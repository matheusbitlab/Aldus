# Mapa para localizar o código

Este índice aponta entradas (o mapa tarefa→arquivos validado está em PROJECT_CONTEXT.md §5); o estado e as decisões atuais continuam no
[PROJECT_CONTEXT.md](../../../../PROJECT_CONTEXT.md). Não mantenha uma cópia de status aqui.

| Área | Entradas para inspeção | Módulo em docs/context/ |
| --- | --- | --- |
| Rotas/providers | `app/`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx` | PROJECT_CONTEXT §4; auth.md |
| Composição | `src/presentation/services/dependencies.ts` | PROJECT_CONTEXT §4; biblioteca-sync.md |
| Reader | `src/presentation/screens/ReaderScreen.tsx`, `src/presentation/components/reader/DocumentReaderAdapter.tsx` | reader.md |
| Documento e âncoras | `src/presentation/components/EpubReaderDocument.ts`, `ReaderAnchorDocument.ts`, `src/domain/types/readingAnchor.ts` | reader.md |
| Progresso/estudo | `src/domain/usecases/UpdateReadingProgressUseCase.ts`, `StudyBookmarks.ts`, `StudyHighlights.ts` | reader.md; biblioteca-sync.md |
| Armazenamento | `src/data/repositories/`, `src/data/database/`, `src/data/local/` | geral.md |
| Biblioteca/Sync | `src/data/library/`, `src/domain/usecases/OrganizeLibrarySelection.ts` | biblioteca-sync.md |
| Importação/EPUB/PDF | `src/data/imports/`, `src/data/epub/`, `src/data/local/PdfFileImporter.ts` | importacao-ocr.md |
| Sources/Drive | `src/data/sources/`, `src/data/drive/`, `modules/aldus-drive-auth/` | sources-drive.md |
| OCR Android | `modules/aldus-pdf-ocr/`, `src/data/local/pdfOcr.native.ts` | importacao-ocr.md |
| Auth | `src/presentation/contexts/AuthContext.tsx`, `src/data/remote/authService.ts`, `app/auth/` | auth.md |
| Community | `src/community/{domain,application,data,adapters,presentation}/` | community-estudo.md |
| SaaS/Admin | `src/domain/saas/`, `src/data/saas/`, `src/admin/`, `app/plan/`, `app/admin/` | biblioteca-sync.md (6.1/6.2) |
| Flashcards/Battle | `src/data/local/FlashcardRepository.ts`, `src/data/remote/FlashcardBattleRepository.ts`, `app/study/`, `app/battle.tsx` | community-estudo.md |
| Temas e UI | `src/theme/`, `src/presentation/contexts/AppThemeContext.tsx`, `ReaderSettingsContext.tsx` | PROJECT_CONTEXT §3 (UX/UI em curso) |
| Landing/legal | `src/marketing/`, `src/legal/`, `app/legal/`, `public/` | legal-build-git.md |
| Backend | `supabase/migrations/`, `supabase/functions/`, `supabase/audit/` | auth.md; biblioteca-sync.md; BUGS_ATUAIS.md |
| Qualidade/entrega | `scripts/`, `package.json`, `.github/workflows/validate.yml`, `android/`, `eas.json`, `vercel.json` | legal-build-git.md; PROJECT_CONTEXT §6 |

Leia implementações `.web` e `.native` pertinentes. Não presuma paridade iOS. Antes de
abrir arquivos enormes, use `rg -n` por símbolo e leia o bloco completo correspondente.
