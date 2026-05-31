export interface LocaleHealthTreeNode {
  id: string;
  label: string;
  description?: string;
  tooltip?: string;
  contextValue?: string;
  icon?: string;
  expanded?: boolean;
  command?: {
    command: string;
    title: string;
    arguments?: unknown[];
  };
  children?: LocaleHealthTreeNode[];
}
