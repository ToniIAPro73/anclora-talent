export type MarketingUseCase = {
  title: string;
  role: string;
  description: string;
  points: readonly string[];
};

export type MarketingFaqItem = {
  question: string;
  answer: string;
};

export type MarketingNav = {
  features: string;
  studio: string;
  showcase: string;
  useCases: string;
  pricing: string;
  faq: string;
  signIn: string;
  signUp: string;
  dashboard: string;
  toggleTheme: string;
  toggleLocale: string;
  openMenu: string;
  closeMenu: string;
};

export type MarketingProductMoment = {
  id: string;
  badge: string;
  title: string;
  description: string;
  pills: readonly string[];
  imageDark: string;
  imageLight: string;
  altDark: string;
  altLight: string;
  backImageDark?: string;
  backImageLight?: string;
  backAltDark?: string;
  backAltLight?: string;
  hasBackCoverToggle?: boolean;
};

export type MarketingProductStory = {
  eyebrow: string;
  title: string;
  description: string;
  frontLabel: string;
  backLabel: string;
  viewLabel: string;
  moments: readonly MarketingProductMoment[];
};
