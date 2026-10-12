import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Platform, Text } from "react-native";
import { AuthForm, AuthLink } from "@/src/presentation/components/AuthForm";
import { exchangeCallbackCode } from "@/src/data/remote/authService";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { useURL } from "expo-linking";
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
  const linkedUrl = useURL();
  const [error, setError] = useState<string | null>(null);
  const callbackUrl = Platform.OS === "web" && typeof window !== "undefined" ? window.location.href : linkedUrl;
  const values = readAuthCallback(callbackUrl);
  const effectiveCode = params.code || values.code;
  const effectiveError = params.error || params.error_description || params.error_code || values.error || values.error_description || values.error_code;
  const description = params.error_description || values.error_description;
  const next = params.next || values.next;
  const webOrigin = Platform.OS === "web" && typeof window !== "undefined" ? window.location.origin : undefined;

  useEffect(() => {
    if (!isExpectedAuthCallback(callbackUrl, Platform.OS, webOrigin)) {
      const operationId = diagnoseAuthCallback(callbackUrl, next, "rejected");
      finishAuthOAuthOperation(operationId);
      setError("O retorno de autenticação não pertence a este aplicativo. A configuração do serviço precisa ser verificada.");
      return;
    }
    const operationId = diagnoseAuthCallback(callbackUrl, next, effectiveError ? "denied" : "received");
    if (effectiveError) {
      finishAuthOAuthOperation(operationId);
      setError(callbackFailureMessage(description, params.error || values.error));
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
  }, [effectiveCode, effectiveError, description, next, callbackUrl, params.error, values.error, webOrigin]);

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
