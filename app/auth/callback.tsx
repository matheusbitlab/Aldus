import { useEffect, useState, useSyncExternalStore } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Platform, Text } from "react-native";
import { AuthForm, AuthLink } from "@/src/presentation/components/AuthForm";
import { exchangeCallbackCode } from "@/src/data/remote/authService";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { nativeAuthCallbacks } from '@/src/data/remote/nativeAuthCallback';
import { readAuthCallback, callbackFailureMessage } from "@/src/data/remote/authCallback";
import { isExpectedAuthCallback } from "@/src/data/remote/authRedirect";
import { diagnoseAuthCallback, finishAuthOAuthOperation } from "@/src/utils/authOAuthDiagnostics";

export default function Callback() {
  const params = useLocalSearchParams<{
    code?: string;
    next?: string;
    error?: string;
    error_description?: string;
    error_code?: string;
  }>();
  const { palette } = useAppTheme();
  const nativeCallback = useSyncExternalStore(nativeAuthCallbacks.subscribe, nativeAuthCallbacks.snapshot, nativeAuthCallbacks.snapshot);
  const [error, setError] = useState<string | null>(null);
  const native = Platform.OS !== 'web';
  const callbackUrl = !native && typeof window !== "undefined" ? window.location.href : nativeCallback.url;
  const values = readAuthCallback(callbackUrl);
  // Native route params alone do not establish the origin of an incoming callback.
  const effectiveCode = values.code || (!native ? params.code : undefined);
  const effectiveError = values.error || values.error_description || values.error_code || (!native ? params.error || params.error_description || params.error_code : undefined);
  const description = values.error_description || (!native ? params.error_description : undefined);
  const next = values.next || (!native ? params.next : undefined);
  const webOrigin = Platform.OS === "web" && typeof window !== "undefined" ? window.location.origin : undefined;

  useEffect(() => {
    if (native && !nativeCallback.ready) return;
    if (native && !callbackUrl) { setError('Link de autenticação inválido ou expirado. Volte para entrar e tente novamente.'); return; }
    if (!isExpectedAuthCallback(callbackUrl, Platform.OS, webOrigin)) {
      const operationId = diagnoseAuthCallback(callbackUrl, next, "rejected");
      finishAuthOAuthOperation(operationId);
      setError("O retorno de autenticação não pertence a este aplicativo. A configuração do serviço precisa ser verificada.");
      return;
    }
    const operationId = diagnoseAuthCallback(callbackUrl, next, effectiveError ? "denied" : "received");
    if (effectiveError) {
      finishAuthOAuthOperation(operationId);
      setError(callbackFailureMessage(description, values.error || (!native ? params.error : undefined)));
      return;
    }

    if (typeof effectiveCode !== "string" || !effectiveCode) {
      setError("Link de autenticação inválido ou expirado.");
      return;
    }

    setError(null);
    let active = true;
    void exchangeCallbackCode(effectiveCode, operationId)
      .then(() => {
        if (active) {
          router.replace((next === "reset-password" ? "/auth/reset-password" : "/") as never);
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
  }, [effectiveCode, effectiveError, description, next, callbackUrl, params.error, values.error, webOrigin, native, nativeCallback.ready]);

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
