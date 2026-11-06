/**
 * Aldus UI — design system "editorial calmo".
 * Regras: cores só via `useAppTheme().palette`; tamanhos via `typography`/`space`/`radius`;
 * um `primary` por área; todo controle só com ícone tem `label`; alvo mínimo 44.
 * O Reader (documento, geometria, posições) não depende deste pacote.
 */
export * from "./tokens";
export { AppText } from "./Text";
export type { AppTextProps, TextTone } from "./Text";
export { Button, IconButton } from "./Button";
export type { ButtonProps, ButtonVariant, IconButtonProps, IconName } from "./Button";
export { Chip, ChipRow } from "./Chip";
export { ListGroup, ListRow } from "./ListRow";
export { Screen, ScreenHeader, Section } from "./Screen";
export { EmptyState } from "./EmptyState";
export { ActionMenu } from "./ActionMenu";
export type { ActionMenuItem } from "./ActionMenu";
export { SearchField } from "./SearchField";
