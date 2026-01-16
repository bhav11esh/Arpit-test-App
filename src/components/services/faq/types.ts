export type FAQItemType = {
  id: number;
  question: string;
  answer: string[] | React.ReactNode[];
};
  
  export interface FAQItemProps {
    item: FAQItemType;
    isExpanded: boolean;
    onToggle: () => void;
  }
  