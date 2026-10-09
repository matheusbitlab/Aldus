const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

function load(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function("require", "exports", code)(name => dependencies[name] ?? require(name), exports);
  return exports;
}

const types = load("src/domain/types/flashcards.ts");
const scoring = load("src/domain/study/flashcardScoring.ts", {
  "../types/flashcards": types,
  "@/src/domain/types/flashcards": types,
});

const { evaluateFlashcardAnswer, getFlashcardFeedbackColor, SCORING_RULES } = scoring;

console.log("Iniciando testes do motor de pontuação de Flashcards...");

// 1. Testa regras de pontuação solo (regra compartilhada)
assert.equal(SCORING_RULES.solo.correctHigh, 10);
assert.equal(SCORING_RULES.solo.correctLow, 5);
assert.equal(SCORING_RULES.solo.penaltyHigh, -10);
assert.equal(SCORING_RULES.solo.penaltyLow, -5);

// 2. Testa regras de pontuação battle (regra compartilhada)
assert.equal(SCORING_RULES.battle.correctHigh, 10);
assert.equal(SCORING_RULES.battle.correctLow, 5);
assert.equal(SCORING_RULES.battle.penaltyHigh, -10);
assert.equal(SCORING_RULES.battle.penaltyLow, -5);

// 3. Testa todas as 8 combinações do modo SOLO
// Cenário Gabarito FALSO:
// - XX (Falso, Alta): acertou -> +10
let res = evaluateFlashcardAnswer(false, "XX", "solo");
assert.equal(res.isCorrect, true);
assert.equal(res.points, 10);
assert.equal(res.confidence, "HIGH");
assert.equal(res.userJudgment, false);

// - X (Falso, Baixa): acertou -> +5
res = evaluateFlashcardAnswer(false, "X", "solo");
assert.equal(res.isCorrect, true);
assert.equal(res.points, 5);
assert.equal(res.confidence, "LOW");
assert.equal(res.userJudgment, false);

// - CHECK (Verdadeiro, Baixa): errou -> -5
res = evaluateFlashcardAnswer(false, "CHECK", "solo");
assert.equal(res.isCorrect, false);
assert.equal(res.points, -5);
assert.equal(res.confidence, "LOW");
assert.equal(res.userJudgment, true);

// - DOUBLE_CHECK (Verdadeiro, Alta): errou -> -10
res = evaluateFlashcardAnswer(false, "DOUBLE_CHECK", "solo");
assert.equal(res.isCorrect, false);
assert.equal(res.points, -10);
assert.equal(res.confidence, "HIGH");
assert.equal(res.userJudgment, true);

// Cenário Gabarito VERDADEIRO:
// - XX (Falso, Alta): errou -> -10
res = evaluateFlashcardAnswer(true, "XX", "solo");
assert.equal(res.isCorrect, false);
assert.equal(res.points, -10);
assert.equal(res.confidence, "HIGH");

// - X (Falso, Baixa): errou -> -5
res = evaluateFlashcardAnswer(true, "X", "solo");
assert.equal(res.isCorrect, false);
assert.equal(res.points, -5);
assert.equal(res.confidence, "LOW");

// - CHECK (Verdadeiro, Baixa): acertou -> +5
res = evaluateFlashcardAnswer(true, "CHECK", "solo");
assert.equal(res.isCorrect, true);
assert.equal(res.points, 5);
assert.equal(res.confidence, "LOW");

// - DOUBLE_CHECK (Verdadeiro, Alta): acertou -> +10
res = evaluateFlashcardAnswer(true, "DOUBLE_CHECK", "solo");
assert.equal(res.isCorrect, true);
assert.equal(res.points, 10);
assert.equal(res.confidence, "HIGH");

// 4. Testa todas as 8 combinações do modo BATTLE
// Gabarito FALSO:
res = evaluateFlashcardAnswer(false, "XX", "battle");
assert.equal(res.isCorrect, true);
assert.equal(res.points, 10);

res = evaluateFlashcardAnswer(false, "X", "battle");
assert.equal(res.isCorrect, true);
assert.equal(res.points, 5);

res = evaluateFlashcardAnswer(false, "CHECK", "battle");
assert.equal(res.isCorrect, false);
assert.equal(res.points, -5);

res = evaluateFlashcardAnswer(false, "DOUBLE_CHECK", "battle");
assert.equal(res.isCorrect, false);
assert.equal(res.points, -10);

// Gabarito VERDADEIRO:
res = evaluateFlashcardAnswer(true, "XX", "battle");
assert.equal(res.isCorrect, false);
assert.equal(res.points, -10);

res = evaluateFlashcardAnswer(true, "X", "battle");
assert.equal(res.isCorrect, false);
assert.equal(res.points, -5);

res = evaluateFlashcardAnswer(true, "CHECK", "battle");
assert.equal(res.isCorrect, true);
assert.equal(res.points, 5);

res = evaluateFlashcardAnswer(true, "DOUBLE_CHECK", "battle");
assert.equal(res.isCorrect, true);
assert.equal(res.points, 10);

// 5. Teste de feedback visual (verde sempre no acerto do usuário, vermelho no erro)
const greenFeedback = getFlashcardFeedbackColor(true);
assert.equal(greenFeedback.text, "#15803D");
assert.equal(greenFeedback.statusLabel, "Você acertou!");

const redFeedback = getFlashcardFeedbackColor(false);
assert.equal(redFeedback.text, "#DC2626");
assert.equal(redFeedback.statusLabel, "Você errou!");

// 6. Teste dos helpers de tipos
const sampleLegacyCard = {
  id: "c1",
  deckId: "d1",
  front: "Pergunta Legada",
  back: "Resposta Legada",
  difficulty: "MEDIUM",
  tags: [],
  status: "approved",
  interval: 1,
  repetition: 0,
  easeFactor: 2.5,
  dueAt: 0,
  source: { kind: "manual", bookId: null, chapterId: null, chapterTitle: null, quote: null, prefix: null, suffix: null, sourcePage: null },
  createdAt: 0,
  updatedAt: 0,
};
assert.equal(types.flashcardStatement(sampleLegacyCard), "Pergunta Legada");
assert.equal(types.flashcardExplanation(sampleLegacyCard), "Resposta Legada");
assert.throws(() => types.flashcardIsTrue(sampleLegacyCard), /selecione o gabarito/);
assert.equal(types.flashcardTitle(sampleLegacyCard), "Flashcard");

const sampleNewCard = {
  ...sampleLegacyCard,
  title: "Biologia Celular",
  statement: "Mitocôndrias produzem ATP.",
  isTrue: true,
  explanation: "A respiração celular ocorre nas mitocôndrias gerando ATP.",
};
assert.equal(types.flashcardStatement(sampleNewCard), "Mitocôndrias produzem ATP.");
assert.equal(types.flashcardExplanation(sampleNewCard), "A respiração celular ocorre nas mitocôndrias gerando ATP.");
assert.equal(types.flashcardIsTrue(sampleNewCard), true);
assert.equal(types.flashcardTitle(sampleNewCard), "Biologia Celular");

console.log("PASS: 16/16 regras de pontuação (solo e batalha), feedback verde/vermelho e helpers de flashcard validados com sucesso!");
