export type UiPackage = {
  id: number;
  name: string; // "10 Tests"
  price: number; // 150000
  quotaAmount: number; // 10
  features: string[]; // bullet points
  popular?: boolean;
};

export type UiExamPackages = {
  ielts: {
    name: "IELTS";
    testTypes: string[]; // ["Complete", "Reading", ...]
    packagesByType: Record<string, UiPackage[]>;
  };
  toefl: {
    name: "TOEFL";
    testTypes: string[];
    packagesByType: Record<string, UiPackage[]>;
  };
};

export type UiTransaction = {
  id: number;
  date: string; // "Dec 15, 2024"
  package: string; // "25 Tests (Complete)" (kalau ada di payload)
  tests: number | null;
  amount: number;
  currency: string;
  status: string;
};
