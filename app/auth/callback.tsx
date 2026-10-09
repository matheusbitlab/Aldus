import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Platform, Text } from "react-native";
import { AuthForm, AuthLink } from "@/src/presentation/components/AuthForm";
import { exchangeCallbackCode } from "@/src/data/remote/authService";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { useURL } from "expo-linking";
import { readAuthCallback, callbackFailureMessage } from "@/src/data/remote/authCallback";

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
  const values = readAuthCallback(Platform.OS === "web" && typeof window !== "undefined" ? window.location.href : linkedUrl);
  const effectiveCode = params.code || values.code;
  const effectiveError = params.error || params.error_description || params.error_code || values.error || values.error_description || values.error_code;
  const description = params.error_description || values.error_description;
  const next = params.next || values.next;

  useEffect(() => {
    if (effectiveError) {
      setError(callbackFailureMessage(description));
      return;
    }

    if (typeof effectiveCode !== "string" || !effectiveCode) {
      setError("Link de autenticação inválido ou expirado.");
      return;
    }

    setError(null);
    let active = true;
    void exchangeCallbackCode(effectiveCode)
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
  }, [effectiveCode, effectiveError, description, next]);

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
