import React from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Flashcard, FlashcardEvaluation } from "@/src/domain/types/flashcards";
import {
  flashcardExplanation,
  flashcardStatement,
  flashcardTitle,
} from "@/src/domain/types/flashcards";
import { getFlashcardFeedbackColor } from "@/src/domain/study/flashcardScoring";
import { AppThemePalette } from "@/src/theme/tokens";
import { FlashcardVisual } from "./FlashcardVisual";

interface FlashcardCardViewProps {
  card: Flashcard;
  isFlipped: boolean;
  evaluation: FlashcardEvaluation | null;
  palette: AppThemePalette;
}

export function FlashcardCardView({
  card,
  isFlipped,
  evaluation,
  palette,
}: FlashcardCardViewProps) {
  const title = flashcardTitle(card);
  const statement = flashcardStatement(card);
  const explanation = isFlipped ? flashcardExplanation(card) : "";
  const isTrue = typeof card.isTrue === "boolean" ? card.isTrue : null;
  const feedback = evaluation
    ? getFlashcardFeedbackColor(
        evaluation.isCorrect,
        palette.text === "#EEF2F4",
      )
    : null;

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: palette.card,
          borderColor: feedback ? feedback.primary : palette.separator,
          borderWidth: feedback ? 2 : 1,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Lado da Frente */}
        {!isFlipped ? (
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: palette.text }]}>
                {title}
              </Text>
              <Text
                style={[
                  styles.badge,
                  {
                    backgroundColor: palette.surfaceSecondary,
                    color: palette.secondaryText,
                  },
                ]}
              >
                AFIRMAÇÃO
              </Text>
            </View>

            <Text style={[styles.statement, { color: palette.text }]}>
              {statement}
            </Text>

            {/* Imagem/desenho opcional: somente se existir */}
            <FlashcardVisual imageUrl={card.imageUrl} drawing={card.drawing} />

            {card.source?.chapterTitle ? (
              <View style={styles.sourceFooter}>
                <Ionicons
                  name="book-outline"
                  size={13}
                  color={palette.secondaryText}
                />
                <Text
                  style={[styles.sourceText, { color: palette.secondaryText }]}
                >
                  {card.source.chapterTitle}
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          /* Lado do Verso */
          <View style={styles.content}>
            {/* Header de Resultado */}
            {feedback && evaluation ? (
              <View
                style={[
                  styles.feedbackBanner,
                  {
                    backgroundColor: feedback.background,
                    borderColor: feedback.primary,
                  },
                ]}
              >
                <View style={styles.feedbackRow}>
                  <Ionicons
                    name={
                      evaluation.isCorrect ? "checkmark-circle" : "close-circle"
                    }
                    size={24}
                    color={feedback.primary}
                  />
                  <Text
                    style={[styles.feedbackTitle, { color: feedback.primary }]}
                  >
                    {feedback.statusLabel}
                  </Text>
                  <View
                    style={[
                      styles.pointsBadge,
                      {
                        backgroundColor:
                          evaluation.points >= 0 ? "#15803D" : "#DC2626",
                      },
                    ]}
                  >
                    <Text style={styles.pointsText}>
                      {evaluation.points > 0
                        ? `+${evaluation.points}`
                        : evaluation.points}{" "}
                      pts
                    </Text>
                  </View>
                </View>
                <Text style={[styles.choiceSummary, { color: palette.text }]}>
                  Sua resposta:{" "}
                  <Text style={{ fontWeight: "700" }}>
                    {evaluation.symbol} (
                    {evaluation.userJudgment ? "Verdadeiro" : "Falso"})
                  </Text>
                </Text>
              </View>
            ) : null}

            {/* Gabarito oficial */}
            <View style={styles.truthRow}>
              <Text
                style={[styles.truthLabel, { color: palette.secondaryText }]}
              >
                Gabarito do autor:
              </Text>
              <View
                style={[
                  styles.truthBadge,
                  {
                    backgroundColor: palette.surfaceSecondary,
                  },
                ]}
              >
                <Text style={[styles.truthText, { color: palette.text }]}>
                  {isTrue === null
                    ? "NÃO SELECIONADO"
                    : isTrue
                      ? "VERDADEIRO"
                      : "FALSO"}
                </Text>
              </View>
            </View>

            {/* Explicação detalhada */}
            <View style={styles.explanationSection}>
              <Text
                style={[
                  styles.sectionHeading,
                  { color: palette.textSecondary },
                ]}
              >
                Explicação:
              </Text>
              <Text style={[styles.explanationText, { color: palette.text }]}>
                {explanation || "Nenhuma explicação adicional fornecida."}
              </Text>
            </View>

            {card.source?.quote ? (
              <View
                style={[
                  styles.quoteBox,
                  {
                    backgroundColor: palette.surfaceSecondary,
                    borderColor: palette.separator,
                  },
                ]}
              >
                <Text
                  style={[styles.quoteLabel, { color: palette.secondaryText }]}
                >
                  Trecho de referência:
                </Text>
                <Text
                  numberOfLines={4}
                  style={[styles.quoteText, { color: palette.text }]}
                >
                  "{card.source.quote}"
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  badge: {
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    letterSpacing: 1,
  },
  statement: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600",
    textAlign: "center",
    marginVertical: 12,
  },
  imageWrapper: {
    alignItems: "center",
    marginVertical: 12,
  },
  image: {
    width: "100%",
    height: 180,
    borderRadius: 10,
  },
  sourceFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: "500",
  },
  feedbackBanner: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    marginLeft: 8,
  },
  pointsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  choiceSummary: {
    fontSize: 12,
    marginTop: 4,
  },
  truthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  truthLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  truthBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  truthText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  explanationSection: {
    gap: 6,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  explanationText: {
    fontSize: 16,
    lineHeight: 24,
  },
  quoteBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    gap: 4,
  },
  quoteLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  quoteText: {
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 18,
  },
});
