import { QuotaError } from '@/src/domain/saas/quota';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/src/data/remote/supabase';
import { WebBookFileStore } from '@/src/data/database/connection/WebBookFileStore';
import { BookRepository } from '@/src/domain/repositories/BookRepository';
import { ChapterRepository } from '@/src/domain/repositories/ChapterRepository';
import { LibraryBook, StoredChapter } from '@/src/domain/entities/LibraryBook';
import { EpubParserService } from '@/src/data/epub/EpubParserService';
import { EpubFileImporter } from '@/src/data/epub/EpubFileImporter';
import { PdfFileImporter } from '@/src/data/local/PdfFileImporter';
import { ImportEpubUseCase } from '@/src/domain/usecases/ImportEpubUseCase';
import { throwIfAborted, withAbort } from '@/src/core/utils/cancellation';
import { newLibraryId } from '@/src/domain/entities/libraryId';
import { hashBookFile, MAX_PRIVATE_BOOK_SIZE, privateBookPath } from './BookFileIntegrity';
import { BookFileDriver, BookFileReference } from './PrivateBookFileService';

const BUCKET = 'aldus-private-library';
/** Authenticated Storage only. JWT is frozen per operation and never persisted in a job. */
export class SupabaseBookFileDriver implements BookFileDriver {
  constructor(private files: WebBookFileStore) {}
  private async headers(owner: string) {
    if (!supabase) throw new Error('Sincronização não configurada.');
    const { data, error } = await supabase.auth.getSession();
    if (error || data.session?.user.id !== owner) throw new Error('Entre novamente para transferir arquivos.');
    return { apikey: process.env.EXPO_PUBLIC_SUPABASE_KEY!, Authorization: `Bearer ${data.session.access_token}` };
  }
  private url(path: string, owner: string, authenticated = false) {
    if (path.split('/')[0] !== owner) throw new Error('Arquivo não pertence à conta atual.');
    return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/${authenticated ? 'authenticated/' : ''}${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
  }
  async local(book: LibraryBook): Promise<BookFileReference | null> {
    if (!book.filePath || book.filePath.startsWith('bundled-')) return null;
    if (Platform.OS === 'web') {
      const blob = await this.files.get(book.id);
      return blob ? { uri: book.filePath, size: blob.size, blob } : null;
    }
    const info = await FileSystem.getInfoAsync(book.filePath);
    return info.exists && !info.isDirectory && info.size > 0 ? { uri: book.filePath, size: info.size } : null;
  }
  hash(file: BookFileReference, signal: AbortSignal) {
    return hashBookFile(file.size, async (position, length) => {
      if (file.blob) return new Uint8Array(await withAbort(file.blob.slice(position, position + length).arrayBuffer(), signal));
      const encoded = await withAbort(FileSystem.readAsStringAsync(file.uri, { encoding: 'base64', position, length }), signal);
      return Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    }, signal);
  }
  private async quotaRpc(headers: Record<string,string>, name: string, body: object, signal: AbortSignal): Promise<any> {
    const controller=new AbortController(),abort=()=>controller.abort();
    signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
    const timer=setTimeout(abort,30000);
    try {
      const response=await withAbort(fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${name}`,{
        method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal,
      }),controller.signal);
      const result=await withAbort(response.json(),controller.signal);
      if(!response.ok){
        if(result?.code==='PQL02')throw new QuotaError('storage');
        if(response.status===404)throw new Error('Reservas de armazenamento ainda não disponíveis no servidor. A fila foi preservada.');
        throw new Error(response.status===401||response.status===403?'O servidor negou a reserva privada. Verifique a sessão e a conta.':'Não foi possível confirmar a reserva privada. A fila foi preservada.');
      }
      return result;
    } finally {clearTimeout(timer);signal.removeEventListener('abort',abort);}
  }
  async upload(owner: string, path: string, file: BookFileReference, mime: string, signal: AbortSignal): Promise<'created' | 'exists'> {
    const auth=await withAbort(this.headers(owner),signal),url=this.url(path,owner);
    throwIfAborted(signal);
    const reservation=await this.quotaRpc(auth,'saas_reserve_upload',{p_path:path,p_bytes:file.size},signal);
    if(reservation?.bytes!==file.size)throw new Error('Reserva privada inválida.');
    if(reservation.state==='exists')return 'exists';
    if(reservation.state!=='reserved'||typeof reservation.token!=='string'||!/^[0-9a-f-]{36}$/.test(reservation.token))throw new Error('Reserva privada inválida.');
    const headers={...auth,'Content-Type':mime,'x-upsert':'false'};
    try {
      throwIfAborted(signal);
      let status: number,errorBody='';
      if(Platform.OS==='web'){
        if(!file.blob)throw new Error('Arquivo local indisponível.');
        const response=await fetch(url,{method:'POST',headers,body:file.blob,signal});
        status=response.status;if(!response.ok)errorBody=await withAbort(response.text(),signal);
      }else{
        const task=FileSystem.createUploadTask(url,file.uri,{headers,httpMethod:'POST',uploadType:FileSystem.FileSystemUploadType.BINARY_CONTENT});
        const cancel=()=>{void task.cancelAsync().catch(()=>undefined);};signal.addEventListener('abort',cancel,{once:true});
        try{const result=await withAbort(task.uploadAsync(),signal);if(!result)throw new Error('Upload cancelado.');status=result.status;errorBody=result.body??'';}
        finally{signal.removeEventListener('abort',cancel);}
      }
      throwIfAborted(signal);
      const duplicate=status===409||(status===400&&this.isDuplicate(errorBody));
      if(!duplicate){
        if(errorBody.length<=8192&&/PQL02|private storage quota exceeded/.test(errorBody))throw new QuotaError('storage');
        this.checkStatus(status);
      }
      const finished=await this.quotaRpc(auth,'saas_finish_upload',{p_path:path,p_token:reservation.token,p_cancel:false},signal);
      if(finished?.state!=='committed'||finished.bytes!==file.size)throw new Error('Confirmação privada inválida.');
      return duplicate?'exists':'created';
    }catch(error){
      // Server checks durable objects before cancelling. Lost responses never delete bytes.
      // Frozen A credentials cannot cancel B's work after an account switch.
      await this.quotaRpc(auth,'saas_finish_upload',{p_path:path,p_token:reservation.token,p_cancel:true},new AbortController().signal).catch(()=>undefined);
      throw error;
    }
  }
  private isDuplicate(body: string) {
    if (body.length > 4096) return false;
    try {
      const error = JSON.parse(body);
      const codes = ['Duplicate', 'AssetAlreadyExists', 'ResourceAlreadyExists', 'KeyAlreadyExists', 'already_exists'];
      return codes.includes(error?.code) || codes.includes(error?.error);
    } catch { return false; }
  }
  async download(owner: string, path: string, signal: AbortSignal): Promise<BookFileReference> {
    const headers = await this.headers(owner), url = this.url(path, owner, true); throwIfAborted(signal);
    if (Platform.OS === 'web') {
      const response = await fetch(url, { headers, signal }); this.checkStatus(response.status);
      const declared = Number(response.headers.get('content-length') || 0);
      if (declared > MAX_PRIVATE_BOOK_SIZE) throw new Error('Arquivo maior que o limite de 512 MiB.');
      // Enforce the size ceiling even if the server omitted Content-Length.
      const reader = response.body?.getReader();
      let blob: Blob;
      if (reader) {
        const chunks: ArrayBuffer[] = []; let size = 0;
        try { while (true) { const item = await withAbort(reader.read(), signal); if (item.done) break; size += item.value.byteLength;
          if (size > MAX_PRIVATE_BOOK_SIZE) throw new Error('Arquivo maior que o limite de 512 MiB.');
          chunks.push(Uint8Array.from(item.value).buffer); }
        } catch (error) { await reader.cancel().catch(() => undefined); throw error; }
        finally { reader.releaseLock(); }
        blob = new Blob(chunks, { type: path.endsWith('.pdf') ? 'application/pdf' : 'application/epub+zip' });
      } else blob = await withAbort(response.blob(), signal);
      if (!blob.size || blob.size > MAX_PRIVATE_BOOK_SIZE) throw new Error('Arquivo vazio ou maior que o limite.');
      return { uri: '', blob, size: blob.size };
    }
    if (!FileSystem.documentDirectory) throw new Error('Armazenamento local indisponível.');
    const directory = `${FileSystem.documentDirectory}books/temp/`;
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true }); throwIfAborted(signal);
    const uri = `${directory}private-${newLibraryId()}.${path.endsWith('.pdf') ? 'pdf' : 'epub'}`;
    const task = FileSystem.createDownloadResumable(url, uri, { headers }, data => {
      if (data.totalBytesWritten > MAX_PRIVATE_BOOK_SIZE) void task.cancelAsync().catch(() => undefined);
    });
    const cancel = () => { void task.cancelAsync().catch(() => undefined); };
    signal.addEventListener('abort', cancel, { once: true });
    const pending = task.downloadAsync();
    try {
      const result = await withAbort(pending, signal); if (!result) throw new Error('Download cancelado.');
      this.checkStatus(result.status); throwIfAborted(signal);
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists || info.isDirectory || !info.size || info.size > MAX_PRIVATE_BOOK_SIZE) throw new Error('Download incompleto ou maior que o limite.');
      return { uri, size: info.size };
    } catch (error) {
      await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
      void pending.finally(() => FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined)).catch(() => undefined);
      throw error;
    } finally { signal.removeEventListener('abort', cancel); }
  }
  async validate(file: BookFileReference, original: LibraryBook, signal: AbortSignal) {
    // Reuse the current importers against isolated staging repositories. A cloud-only
    // PDF record must not trigger PdfFileImporter's existing-book shortcut.
    let stagedBook: LibraryBook | null = null, chapters: StoredChapter[] = [];
    const books: BookRepository = { listActive: async () => [], findById: async () => stagedBook,
      save: async book => { stagedBook = book; }, softDelete: async () => { stagedBook = null; } };
    const chapterStore: ChapterRepository = { listByBookId: async () => chapters, replaceForBook: async (_id, values) => { chapters = values; } };
    const stagedWebFiles = { save: async () => undefined, delete: async () => undefined } as unknown as WebBookFileStore;
    const book = original.mimeType === 'application/pdf'
      ? await new PdfFileImporter(books, chapterStore, stagedWebFiles).importFromUri(file.uri, original.fileName, original.id, file.blob, { signal })
      : await new EpubFileImporter(new ImportEpubUseCase(new EpubParserService(), books, chapterStore), stagedWebFiles)
          .importFromUri(file.uri, original.fileName, file.blob, original.id, { signal });
    return { book, chapters };
  }
  async promote(file: BookFileReference, book: LibraryBook) {
    if (Platform.OS === 'web') {
      if (!file.blob) throw new Error('Download incompleto.');
      await this.files.save(book.id, book.fileName, file.blob);
      return `${book.mimeType === 'application/pdf' ? 'web-pdf' : 'web-epub'}://${book.id}`;
    }
    const directory = `${FileSystem.documentDirectory}books/imported/`;
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    const uri = `${directory}private-${newLibraryId()}.${book.mimeType === 'application/pdf' ? 'pdf' : 'epub'}`;
    await FileSystem.moveAsync({ from: file.uri, to: uri }); return uri;
  }
  async dispose(file: BookFileReference) {
    if (!file.blob && file.uri.startsWith(`${FileSystem.documentDirectory}books/temp/`)) await FileSystem.deleteAsync(file.uri, { idempotent: true });
  }
  async removeLocal(book: LibraryBook) {
    if (Platform.OS === 'web') { await this.files.delete(book.id); return; }
    if (!book.filePath) return;
    if (!FileSystem.documentDirectory || !book.filePath.startsWith(`${FileSystem.documentDirectory}books/imported/`) || book.filePath.split('/').some(part=>part==='..'||part==='.') || /%2e|%2f|%5c|\\/i.test(book.filePath)) throw new Error('A cópia está fora do diretório controlado pelo Aldus.');
    await FileSystem.deleteAsync(book.filePath, { idempotent: true });
  }
  async removeRemote(owner: string, path: string, signal: AbortSignal) {
    this.url(path, owner);
    const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
      method: 'DELETE', headers: { ...await this.headers(owner), 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [path] }), signal,
    });
    if (response.status !== 404) this.checkStatus(response.status);
  }
  private checkStatus(status: number) {
    if (status >= 200 && status < 300) return;
    throw new Error(status === 401 ? 'Entre novamente para transferir arquivos.' : status === 413 ? 'O limite de arquivo do servidor foi excedido.'
      : status === 404 ? 'O armazenamento privado ainda não está disponível no servidor.' : 'Falha na transferência privada. Tente novamente.');
  }
  async listBookObjects(owner:string,bookId:string,signal:AbortSignal):Promise<string[]>{
    privateBookPath(owner,bookId,'0'.repeat(64),'epub');
    const paths:string[]=[],headers={...await this.headers(owner),'Content-Type':'application/json'};
    for(let page=0;page<20;page++){
      throwIfAborted(signal);
      const response=await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/list/${BUCKET}`,{method:'POST',headers,signal,body:JSON.stringify({prefix:`${owner}/${bookId}`,limit:100,offset:page*100,sortBy:{column:'name',order:'asc'}})});
      this.checkStatus(response.status);const entries=await response.json();if(!Array.isArray(entries))throw new Error('Resposta privada inválida.');
      for(const entry of entries){if(typeof entry.name!=='string'||!/^[a-f0-9]{64}\.(epub|pdf)$/.test(entry.name))throw new Error('Referência privada inválida.');paths.push(`${owner}/${bookId}/${entry.name}`);}
      if(entries.length<100)return paths;
    }
    throw new Error('Exclusão de arquivos privados precisa de outra tentativa.');
  }
}
