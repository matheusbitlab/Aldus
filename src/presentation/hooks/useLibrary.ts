import { useEffect } from "react";
import { useLibraryStore } from "@/src/presentation/stores/libraryStore";

export function useLibrary() { const { books, status, error, load } = useLibraryStore(); useEffect(() => { if (status === "idle") void load(); }, [load, status]); return { books, status, error, reload: load }; }
