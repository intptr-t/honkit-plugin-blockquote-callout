export type CallOutRegexPattern = {
  pattern: RegExp;
  fix: (str: string) => string;
};

export enum CallOutType {
  Note = "note",
  Tip = "tip",
  Important = "important",
  Warning = "warning",
  Caution = "caution",
}

export type CallOutSettings = {
  title?: string;
  className?: string;
  titleClassName?: string;
};
