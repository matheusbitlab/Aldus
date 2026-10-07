import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Platform, Text } from "react-native";
import { AuthForm, AuthLink } from "@/src/presentation/components/AuthForm";
import { exchangeCallbackCode } from "@/src/data/remote/authService";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";

function extractCallbackParams() {
  if (Platform.OS !== "web" || typeof window === "undefined") return {};
  const search = new URLSearchParams(window.location.search);
  const hashRaw = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const hash = new URLSearchParams(hashRaw);
  return {
    code: search.get("code") || hash.get("code") || undefined,
    error: search.get("error") || hash.get("error") || undefined,
    errorDescription: search.get("error_description") || hash.get("error_description") || undefined,
    errorCode: search.get("error_code") || hash.get("error_code") || undefined,
  };
}

export default function Callback() {
  const params = useLocalSearchParams<{
    code?: string;
    next?: string;
    error?: string;
    error_description?: string;
    error_code?: string;
  }>();
  const { palette } = useAppTheme();
  const [error, setError] = useState<string | null>(null);
  const exchangedCode = useRef<string | null>(null);

  useEffect(() => {
    const webParams = extractCallbackParams();
    const effectiveError = params.error || params.error_description || webParams.error || webParams.errorDescription;
    const effectiveCode = params.code || webParams.code;

    if (effectiveError) {
      const description = params.error_description || webParams.errorDescription || effectiveError;
      if (description.includes("Unable to exchange external code")) {
        setError("Não foi possível autenticar com o Google. O código do provedor expirou ou as credenciais OAuth no Supabase estão incorretas.");
      } else {
        setError(description);
      }
      return;
    }

    if (typeof effectiveCode !== "string" || !effectiveCode) {
      setError("Link de autenticação inválido ou expirado.");
      return;
    }

    if (exchangedCode.current === effectiveCode) return;
    exchangedCode.current = effectiveCode;

    let active = true;
    void exchangeCallbackCode(effectiveCode)
      .then(() => {
        if (active) {
          router.replace((params.next === "reset-password" ? "/auth/reset-password" : "/") as never);
        }
      })
      .catch((failure) => {
        if (active) {
          setError(failure instanceof Error ? failure.message : "Link inválido ou expirado.");
        }
      });

    return () => {
      active = false;
    };
  }, [params.code, params.next, params.error, params.error_description]);

  return (
    <AuthForm title={error ? "Não foi possível concluir" : "Concluindo acesso"}>
      {error ? (
        <>
          <Text accessibilityRole="alert" style={{ color: palette.accent }}>
            {error}
          </Text>
          <AuthLink title="Voltar para entrar" href="/auth/login" />
        </>
      ) : (
        <ActivityIndicator color={palette.accent} />
      )}
    </AuthForm>
  );
}
