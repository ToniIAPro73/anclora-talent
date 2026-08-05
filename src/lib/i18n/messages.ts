import type { UiLocale } from '@/lib/ui-preferences/preferences';
import type { ProductTemplateCopyKey } from '@/lib/templates/product-templates';
import type {
  MarketingBenefit,
  MarketingShowcasePanel,
  MarketingWorkflowStep,
} from '@/components/marketing/marketing-data';

export type AppMessages = {
  shell: {
    brand: string;
    badge: string;
    contractEyebrow: string;
    contractTitle: string;
    contractDescription: string;
    navDashboard: string;
    navNewProject: string;
    navProjects: string;
    stackEyebrow: string;
    stackTitle: string;
    stackDescription: string;
    topbarEyebrow: string;
    topbarTitle: string;
    themeLabel: string;
    localeLabel: string;
    themeDark: string;
    themeLight: string;
    localeSpanish: string;
    localeEnglish: string;
    userMenuLabel: string;
    signOut: string;
    signingOut: string;
  };
  auth: {
    email: string;
    password: string;
    fullName: string;
    showPassword: string;
    hidePassword: string;
    signIn: string;
    signingIn: string;
    forgotPassword: string;
    noAccount: string;
    signUp: string;
    createAccount: string;
    creatingAccount: string;
    haveAccount: string;
    passwordRequirements: string;
    socialAccess: string;
    google: string;
    github: string;
    socialComingSoon: string;
    oauthCancelled: string;
    oauthInvalidState: string;
    oauthError: string;
    legalPrefix: string;
    terms: string;
    legalMiddle: string;
    privacy: string;
    legalSuffix: string;
    error: string;
    emailInUse: string;
    registerError: string;
  };
  landing: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    proofEyebrow: string;
    workflowEyebrow: string;
    workflowTitle: string;
    workflowDescription: string;
    workflowAdvance: string;
    workflowStepLabel: string;
    productEyebrow: string;
    productTitle: string;
    productDescription: string;
    benefitsEyebrow: string;
    benefitsTitle: string;
    finalEyebrow: string;
    finalTitle: string;
    finalNote: string;
    proofItems: readonly string[];
    workflowSteps: readonly MarketingWorkflowStep[];
    showcasePanels: readonly MarketingShowcasePanel[];
    benefits: readonly MarketingBenefit[];
  };
  dashboard: {
    eyebrow: string;
    title: string;
    description: string;
    createProject: string;
    projectsEyebrow: string;
    statusEyebrow: string;
    contractEyebrow: string;
    statusActive: string;
    statusEmpty: string;
    statusFallback: string;
    contractReady: string;
    contractFallback: string;
    sectionEyebrow: string;
    sectionTitle: string;
    emptyEyebrow: string;
    emptyFallbackEyebrow: string;
    emptyTitle: string;
    emptyFallbackTitle: string;
    emptyDescription: string;
    emptyFallbackDescription: string;
    emptyAction: string;
  };
  project: {
    newEyebrow: string;
    newTitle: string;
    newDescription: string;
    createFormEyebrow: string;
    createFormTitle: string;
    createFormDescription: string;
    titleLabel: string;
    titlePlaceholder: string;
    sourceDocumentLabel: string;
    sourceDocumentHint: string;
    createProjectHint: string;
    createProjectAction: string;
    templateSelectorEyebrow: string;
    templateSelectorTitle: string;
    templateSelectorDescription: string;
    templateSelectorSelected: string;
    templateSelectorSelect: string;
    productTemplates: Record<
      ProductTemplateCopyKey,
      { name: string; description: string }
    >;
    cardPremium: string;
    cardUpdated: string;
    cardOpenEditor: string;
    cardPreview: string;
    cardDelete: string;
    cardDeleteConfirm: string;
    editorEyebrow: string;
    editorOpenPreview: string;
    editorOpenCover: string;
    editorMetaEyebrow: string;
    editorLiveEyebrow: string;
    editorLiveDescription: string;
    editorTitleLabel: string;
    editorSubtitleLabel: string;
    editorAuthorLabel: string;
    editorChapterLabel: string;
    saveChanges: string;
    previewEyebrow: string;
    previewTitle: string;
    previewBackToEditor: string;
    previewOpenCover: string;
    previewCanvasEyebrow: string;
    previewCoverEyebrow: string;
    editorialMapTitle: string;
    editorialMapDescription: string;
    editorialMapOriginalColumn: string;
    editorialMapChaptersColumn: string;
    editorialMapPagesColumn: string;
    editorialMapGeneratedMeta: string;
    editorialMapInferredMeta: string;
    editorialMapAddedMeta: string;
    editorialMapRemovedMeta: string;
    editorialMapMergedMeta: string;
    coverEyebrow: string;
    coverTitle: string;
    coverBackEditor: string;
    coverBackPreview: string;
    coverFormEyebrow: string;
    coverTitleLabel: string;
    coverSubtitleLabel: string;
    coverAuthorLabel: string;
    coverPaletteLabel: string;
    coverBackgroundLabel: string;
    coverOpacityLabel: string;
    coverAdvancedSyncNotice: string;
    backCoverAdvancedSyncNotice: string;
    coverSave: string;
    coverNoImage: string;
    paletteObsidian: string;
    paletteTeal: string;
    paletteSand: string;
    importAnalyzing: string;
    importReady: string;
    importOcrAppliedLabel: string;
    importOcrBadgeLocal: string;
    importOcrBadgeService: string;
    importOcrBadgeBrowser: string;
    importChaptersDetected: string;
    importTitleDetected: string;
    importAuthorDetected: string;
    importConfidenceHigh: string;
    importConfidenceMedium: string;
    importConfidenceLow: string;
    importManuscriptTypeLabel: string;
    importManuscriptTypeEssay: string;
    importManuscriptTypeGuide: string;
    importManuscriptTypeNovel: string;
    importManuscriptTypeNonFiction: string;
    importWarningsLabel: string;
    importChapterPreviewLabel: string;
    importErrorGeneric: string;
    importFileTooLarge: string;
    importFormatUnsupported: string;
    chapterSyncPageNumbers: string;
    chapterSyncPageNumbersTitle: string;
    chapterSyncPageNumbersHelper: string;
    chapterSyncPageNumbersDone: string;
    chapterSyncPageNumbersMissingIndex: string;
    coverOpenBackCover: string;
    advancedCoverEyebrow: string;
    advancedCoverLayoutLabel: string;
    advancedCoverFontLabel: string;
    advancedCoverAccentLabel: string;
    backCoverEyebrow: string;
    backCoverTitle: string;
    backCoverFormEyebrow: string;
    backCoverTitleLabel: string;
    backCoverBodyLabel: string;
    backCoverBodyPlaceholder: string;
    backCoverAuthorBioLabel: string;
    backCoverSave: string;
    backCoverBackToCover: string;
    previewExportButton: string;
    previewExportFilename: string;
    previewExportPdfButton: string;
    previewExportDocxButton: string;
    previewExportEpubButton: string;
    coverRenderImage: string;
    coverRenderImageDone: string;
    coverRenderedImageLabel: string;
    coverSwitchToAdvanced: string;
    coverSwitchToBasic: string;
    coverStudioEyebrow: string;
    coverStudioSimpleSummary: string;
    coverStudioAdvancedSummary: string;
    coverStudioCanvasLabel: string;
    coverStudioTemplateLabel: string;
    coverStudioFieldsLegend: string;
    coverStudioInspectorEmpty: string;
    coverStudioContentLabel: string;
    coverFieldResync: string;
    coverStudioAlignLabel: string;
    coverStudioFontSizeLabel: string;
    coverStudioLineHeightLabel: string;
    coverStudioCharSpacingLabel: string;
    coverStudioColorLabel: string;
    coverStudioVisibilityLabel: string;
    coverStudioSaveDesign: string;
    coverStudioSaved: string;
    stepContent: string;
    stepChapters: string;
    stepTemplate: string;
    stepCover: string;
    stepBackCover: string;
    stepPreview: string;
    stepCollaborate: string;
    stepAI: string;
    stepExport: string;
    stepContentDesc: string;
    stepChaptersDesc: string;
    stepTemplateDesc: string;
    stepCoverDesc: string;
    stepBackCoverDesc: string;
    stepPreviewDesc: string;
    stepCollaborateDesc: string;
    stepAIDesc: string;
    stepExportDesc: string;
    rulesPanelEyebrow: string;
    rulesPanelTitle: string;
    rulesPanelDescription: string;
    rulesPresetLabel: string;
    rulesPresetDefault: string;
    rulesPresetPrint: string;
    rulesPresetDigital: string;
    rulesPresetDefaultDesc: string;
    rulesPresetPrintDesc: string;
    rulesPresetDigitalDesc: string;
    rulesKeepTable: string;
    rulesTableFillGap: string;
    rulesFillGapLeaveSpace: string;
    rulesFillGapNextFloat: string;
    rulesKeepList: string;
    rulesKeepCode: string;
    rulesKeepQuote: string;
    rulesKeepCallout: string;
    rulesKeepImageCaption: string;
    rulesKeepWithNext: string;
    rulesMinLinesAfter: string;
    rulesWidowsOrphans: string;
    rulesChapterOddPage: string;
    rulesPageBreakBeforeChapter: string;
    rulesRestartFigures: string;
    rulesRestartTables: string;
    rulesPageNumberFormat: string;
    rulesFormatDecimal: string;
    rulesFormatLowerRoman: string;
    rulesFormatUpperRoman: string;
    rulesExportGate: string;
    rulesExportGateOff: string;
    rulesExportGateWarn: string;
    rulesExportGateBlock: string;
    rulesSave: string;
    rulesSaved: string;
    healthPanelEyebrow: string;
    healthPanelTitle: string;
    healthNoViolations: string;
    healthViolationsCount: string;
    healthViolationPage: string;
    healthGoToPreview: string;
    preflightTitle: string;
    preflightChannelKdp: string;
    preflightChannelIngramspark: string;
    preflightChannelKobo: string;
    preflightEmpty: string;
    preflightIssueCount: string;
    preflightSeverityError: string;
    preflightSeverityWarning: string;
    preflightSeverityInfo: string;
    /** Localized message templates per preflight rule key (`{param}` placeholders). */
    preflightRules: Record<string, string>;
    aiAssistantEyebrow: string;
    aiEthicalCopy: string;
    aiProposeFix: string;
    aiProposalLoading: string;
    aiProposalError: string;
    aiProposalStale: string;
    aiProposalAccept: string;
    aiProposalReject: string;
    aiProposalApplying: string;
    aiModeCloud: string;
    aiModeLocal: string;
    aiAdvisoryBadge: string;
    aiDiffBefore: string;
    aiDiffAfter: string;
    aiChangeAdded: string;
    aiChangeRemoved: string;
    aiChangeChanged: string;
    aiChangeMoved: string;
    aiNoProposals: string;
    aiCoherenceButton: string;
    aiCoherenceLoading: string;
    aiCoherenceTitle: string;
    aiCoherenceEmpty: string;
    aiIssueBrokenRef: string;
    aiIssueDuplicateHeading: string;
    aiIssueMissingChapterHeading: string;
    aiProvenanceTitle: string;
    aiProvenanceSummary: string;
    aiCoAuthorEyebrow: string;
    aiCoAuthorEthicalCopy: string;
    aiCoAuthorChapterLabel: string;
    aiCoAuthorStyleAction: string;
    aiCoAuthorArchitectureAction: string;
    aiCoAuthorSummaryAction: string;
    aiCoAuthorNoProposal: string;
    kdpDisclosureTitle: string;
    kdpDisclosureRequiredBadge: string;
    kdpDisclosureExemptBadge: string;
    kdpDisclosureHelper: string;
    exportGateBlockedMessage: string;
    exportGateWarnMessage: string;
    metadataPanelEyebrow: string;
    metadataPanelTitle: string;
    metadataPanelDescription: string;
    metadataIsbnLabel: string;
    metadataDescriptionLabel: string;
    metadataKeywordsLabel: string;
    metadataKeywordsHelper: string;
    metadataLanguageLabel: string;
    metadataSave: string;
    metadataSaved: string;
    brandPanelEyebrow: string;
    brandPanelTitle: string;
    brandPanelDescription: string;
    brandSelectLabel: string;
    brandNoneOption: string;
    brandStatusDraft: string;
    brandStatusActive: string;
    brandStatusDeprecated: string;
    brandActivateAction: string;
    brandUploadLabel: string;
    brandUploadAction: string;
    brandUploading: string;
    brandSaved: string;
    brandVersionLabel: string;
    reimportButton: string;
    reimportDialogTitle: string;
    reimportDialogDescription: string;
    reimportAnalyzing: string;
    reimportConfirmLabel: string;
    reimportCancelLabel: string;
    reimportSummaryUpdate: string;
    reimportSummaryAdd: string;
    reimportSummaryKeep: string;
    reimportResultTitle: string;
    reimportDone: string;
    reimportError: string;
    structureToggleLabel: string;
    structureToggleHint: string;
    structureConfigureAction: string;
    structureConfiguredBadge: string;
    structureDialogTitle: string;
    structureDialogDescription: string;
    structureSourceUploadLabel: string;
    structureSourceSavedLabel: string;
    structureNoSavedProfiles: string;
    structureAnalyzing: string;
    structureConfirmTitle: string;
    structureHierarchyLine: string;
    structureSummaryLine: string;
    structureFunctionMissing: string;
    structureConfidencePrefix: string;
    structureSaveProfileLabel: string;
    structureProfileNamePlaceholder: string;
    structureConfirmAction: string;
    structureDiscardAction: string;
    structureError: string;
    healthRecomposedBadge: string;
    healthDiffTitle: string;
    healthDiffShift: string;
    healthDiffToc: string;
    healthDiffViolations: string;
    healthTelemetrySummary: string;
    healthRevertLabel: string;
    healthRevertAction: string;
    healthReverting: string;
    previewModalZoomOut: string;
    previewModalZoomIn: string;
    previewModalSingleView: string;
    previewModalSpreadView: string;
    previewModalLaptop: string;
    previewModalTablet: string;
    previewModalMobile: string;
    previewModalPrevious: string;
    previewModalNext: string;
    previewModalPage: string;
    previewModalOf: string;
    previewModalClose: string;
    previewModalAdvanced: string;
    previewModalTocShow: string;
    previewModalTocHide: string;
    previewModalTocHeading: string;
    previewModalZoomSlider: string;
    previewModalEmptyState: string;
    previewModalUntitledProject: string;
    previewModalUntitledChapter: string;
    previewModalCoverAlt: string;
    previewModalBackCoverAlt: string;
    onboardingEyebrow: string;
    onboardingStepLabel: string;
    onboardingStep1Title: string;
    onboardingStep1Body: string;
    onboardingStep2Title: string;
    onboardingStep2Body: string;
    onboardingStep3Title: string;
    onboardingStep3Body: string;
    onboardingNext: string;
    onboardingSkip: string;
    onboardingDone: string;
    onboardingClose: string;
  };
  filestudio: {
    badgeLocal: string;
    badgeService: string;
    badgeBrowser: string;
    settingsEyebrow: string;
    settingsTitle: string;
    settingsDescription: string;
    statusLabel: string;
    statusPaired: string;
    statusPending: string;
    statusNone: string;
    pairTitle: string;
    pairRequestIdLabel: string;
    pairRequestIdHint: string;
    pairCodeLabel: string;
    pairSubmit: string;
    pairSubmitting: string;
    pairSuccess: string;
    pairError: string;
    optimizeButton: string;
    optimizeWorking: string;
    optimizeNoCover: string;
    optimizeSuccess: string;
    consentTitle: string;
    consentDescription: string;
    consentOperationLabel: string;
    consentModeLabel: string;
    consentFileLabel: string;
    consentFileCover: string;
    consentConfirm: string;
    consentReject: string;
    derivativesTitle: string;
    derivativesEmpty: string;
    derivativeView: string;
    operationResizeLabel: string;
    jobStatus: {
      queued: string;
      processing: string;
      completed: string;
      failed: string;
      cancelled: string;
      expired: string;
    };
    errors: {
      unavailable: string;
      limitConcurrent: string;
      limitDaily: string;
      noCover: string;
      notFound: string;
      pairingCodeInvalid: string;
      pairingExpired: string;
      deviceRevoked: string;
      repairRequired: string;
      operationUnavailable: string;
      uploadTooLarge: string;
      integrityFailed: string;
      consentRejected: string;
      agentOffline: string;
    };
  };
  launchPack: {
    title: string;
    description: string;
    generateButton: string;
    regenerateButton: string;
    generating: string;
    empty: string;
    versionLabel: string;
    staleBadge: string;
    pendingBadge: string;
    viewAsset: string;
    provenanceCompositor: string;
    provenanceService: string;
    provenanceLocal: string;
    kinds: {
      epub: string;
      pdf: string;
      html: string;
      markdown: string;
      slides: string;
      image: string;
      mobi: string;
      azw3: string;
      audio: string;
      video: string;
    };
    errors: {
      unavailable: string;
      notFound: string;
    };
  };
  publishChannels: {
    title: string;
    description: string;
    kitTitle: string;
    generateKitButton: string;
    generatingKit: string;
    sheetTab: string;
    landingTab: string;
    copyButton: string;
    copiedBadge: string;
    draftDescriptionBadge: string;
    assetsLabel: string;
    disclosureLabel: string;
    gumroadTitle: string;
    gumroadDescription: string;
    gumroadDisabled: string;
    tokenLabel: string;
    tokenPlaceholder: string;
    saveTokenButton: string;
    savingToken: string;
    removeTokenButton: string;
    connectedBadge: string;
    priceLabel: string;
    pricePlaceholder: string;
    pushButton: string;
    pushing: string;
    pushSuccessLabel: string;
    modeApiBadge: string;
    hotmartTitle: string;
    hotmartDescription: string;
    exportButton: string;
    exporting: string;
    instructionsTitle: string;
    modeExportBadge: string;
    errors: {
      unavailable: string;
      notFound: string;
      notConfigured: string;
      auth: string;
      validation: string;
      circuitOpen: string;
    };
  };
  collaboration: {
    title: string;
    description: string;
    openThreadsBadge: string;
    viewerRoleLabel: string;
    roleBadges: { author: string; editor: string; designer: string };
    teamTitle: string;
    emptyTeam: string;
    revokeButton: string;
    inviteTitle: string;
    inviteDescription: string;
    inviteEmailLabel: string;
    inviteEmailPlaceholder: string;
    inviteRoleLabel: string;
    inviteButton: string;
    invitingButton: string;
    inviteLinkLabel: string;
    copyButton: string;
    copiedBadge: string;
    noSeatTollNote: string;
    pendingInvitationsTitle: string;
    invitationExpiresLabel: string;
    cancelInvitationButton: string;
    commentsTitle: string;
    emptyComments: string;
    frontMatterChapter: string;
    commentPlaceholder: string;
    commentButton: string;
    replyPlaceholder: string;
    replyButton: string;
    resolveButton: string;
    openBadge: string;
    resolvedBadge: string;
    resolvedByLabel: string;
    suggestionsTitle: string;
    emptySuggestions: string;
    proposeButton: string;
    proposeSummaryPlaceholder: string;
    proposeTextPlaceholder: string;
    proposeSubmitButton: string;
    proposingButton: string;
    suggestionStatusBadges: { pending: string; accepted: string; rejected: string };
    decidedByLabel: string;
    acceptButton: string;
    rejectButton: string;
    invite: {
      title: string;
      description: string;
      roleLabel: string;
      acceptButton: string;
      acceptingButton: string;
      acceptedTitle: string;
      acceptedDescription: string;
      goToDashboardButton: string;
    };
    errors: {
      unavailable: string;
      forbidden: string;
      notFound: string;
      invalid: string;
      invalidEmail: string;
      invalidRole: string;
      alreadyCollaborator: string;
      expired: string;
      emailMismatch: string;
      alreadyAccepted: string;
      stale: string;
    };
  };
  history: {
    title: string;
    description: string;
    saveVersionButton: string;
    savingVersion: string;
    empty: string;
    versionLabel: string;
    sourceManualSave: string;
    sourceReimport: string;
    sourceRestore: string;
    compareFrom: string;
    compareTo: string;
    compareButton: string;
    comparing: string;
    selectVersions: string;
    diffEmpty: string;
    diffSummary: string;
    metadataChangedBadge: string;
    changeAdded: string;
    changeRemoved: string;
    changeChanged: string;
    changeMoved: string;
    unchaptered: string;
    restoreButton: string;
    restoring: string;
    errors: {
      unavailable: string;
      notFound: string;
      unchanged: string;
    };
  };
};

export const appMessages: Record<UiLocale, AppMessages> = {
  es: {
    shell: {
      brand: 'Anclora Talent',
      badge: 'Premium App',
      contractEyebrow: 'Contrato',
      contractTitle: 'Editorial workspace premium',
      contractDescription:
        'Identidad protegida, persistencia real y una experiencia que mantiene el mismo nivel visual desde la entrada hasta la producción.',
      navDashboard: 'Dashboard',
      navNewProject: 'Nuevo proyecto',
      navProjects: 'Mis proyectos',
      stackEyebrow: 'Stack activo',
      stackTitle: 'Auth + Neon + Blob',
      stackDescription:
        'La cuenta individual sigue siendo la unidad activa, pero la experiencia ya se presenta como producto premium, no como shell técnico.',
      topbarEyebrow: 'App shell',
      topbarTitle: 'Workspace editorial personal',
      themeLabel: 'Tema',
      localeLabel: 'Idioma',
      themeDark: 'Dark',
      themeLight: 'Light',
      localeSpanish: 'ES',
      localeEnglish: 'EN',
      userMenuLabel: 'Cuenta',
      signOut: 'Cerrar sesión',
      signingOut: 'Cerrando sesión…',
    },
    auth: {
      email: 'Email',
      password: 'Contraseña',
      fullName: 'Nombre completo',
      showPassword: 'Mostrar contraseña',
      hidePassword: 'Ocultar contraseña',
      signIn: 'Iniciar sesión',
      signingIn: 'Iniciando sesión…',
      forgotPassword: '¿Olvidaste tu contraseña?',
      noAccount: '¿No tienes cuenta?',
      signUp: 'Regístrate',
      createAccount: 'Crear cuenta',
      creatingAccount: 'Creando cuenta…',
      haveAccount: '¿Ya tienes cuenta?',
      passwordRequirements: 'Mínimo 8 caracteres, con al menos una letra y un número',
      socialAccess: 'Acceso social',
      google: 'Google',
      github: 'GitHub',
      socialComingSoon: 'Próximamente',
      oauthCancelled: 'Has cancelado el acceso mediante {provider}.',
      oauthInvalidState: 'La solicitud de acceso mediante {provider} ha caducado o no es válida.',
      oauthError: 'No se ha podido completar el acceso mediante {provider}.',
      legalPrefix: 'Al continuar, aceptas los',
      terms: 'Términos del servicio',
      legalMiddle: 'y la',
      privacy: 'Política de privacidad',
      legalSuffix: 'de Anclora Talent.',
      error: 'Email o contraseña incorrectos',
      emailInUse: 'Ya existe una cuenta con este email',
      registerError: 'No se pudo crear la cuenta. Inténtalo de nuevo.',
    },
    landing: {
      eyebrow: 'Anclora Talent',
      headline: 'Convierte talento en una presencia editorial lista para publicar.',
      subheadline:
        'Crea tu cuenta, lanza tu proyecto y trabaja sobre un flujo claro de documento, preview y portada desde una misma plataforma.',
      proofEyebrow: 'Confianza',
      workflowEyebrow: 'Flujo',
      workflowTitle: 'Tres pasos para empezar sin fricción',
      workflowDescription:
        'La landing debe reducir la distancia entre la promesa y la acción. Aquí el usuario entiende el recorrido antes de registrarse.',
      workflowAdvance: 'Avanzar',
      workflowStepLabel: 'Paso',
      productEyebrow: 'Producto',
      productTitle: 'Una plataforma donde documento, preview y portada dejan de competir entre sí.',
      productDescription:
        'El usuario no necesita interpretar capas técnicas. Necesita ver cómo encajan documento, preview y portada en una sola experiencia.',
      benefitsEyebrow: 'Beneficios',
      benefitsTitle: 'Lo que el usuario gana en cada visita',
      finalEyebrow: 'Siguiente paso',
      finalTitle: 'Abre tu cuenta y empieza con una base que ya parece producto.',
      finalNote:
        'Empieza con una cuenta propia, crea tu primer proyecto y trabaja con una base que ya transmite claridad, consistencia y salida real.',
      proofItems: [
        'Proyectos persistentes desde el primer día',
        'Documento, preview y portada en un mismo flujo',
        'Acceso autenticado y listo para producción',
      ],
      workflowSteps: [
        {
          title: 'Crea tu cuenta',
          description: 'Entra en segundos y deja listo tu espacio de trabajo.',
        },
        {
          title: 'Lanza tu proyecto',
          description: 'Parte de un documento canónico y una estructura clara.',
        },
        {
          title: 'Edita y publica',
          description: 'Convierte borradores en una presencia editorial coherente.',
        },
      ],
      showcasePanels: [
        {
          title: 'Documento canónico',
          description: 'Una sola fuente de verdad para el contenido editorial.',
          accent: 'Estructura',
          bullets: ['Títulos consistentes', 'Bloques editables', 'Base reutilizable'],
        },
        {
          title: 'Preview conectado',
          description: 'La lectura visual refleja lo que realmente vas a publicar.',
          accent: 'Claridad',
          bullets: ['Vista inmediata', 'Edición coherente', 'Menos fricción'],
        },
        {
          title: 'Portada persistente',
          description: 'Imágenes y assets preparados para un uso repetido.',
          accent: 'Acabado',
          bullets: ['Cover guardada', 'Assets en Blob', 'Reuso sin pérdida'],
        },
      ],
      benefits: [
        {
          title: 'Más claridad',
          description: 'Cada proyecto sigue una estructura que se entiende rápido.',
        },
        {
          title: 'Más velocidad',
          description: 'Menos decisiones redundantes para pasar de idea a publicación.',
        },
        {
          title: 'Más consistencia',
          description: 'Documento, portada y preview trabajan sobre el mismo relato.',
        },
      ],
    },
    dashboard: {
      eyebrow: 'Dashboard premium',
      title: 'Tus proyectos editoriales ya viven dentro de una app que parece producto de verdad.',
      description:
        'Auth, documento, preview y portada ya están alineados. Ahora el acceso diario también tiene que transmitir valor, control y acabado premium.',
      createProject: 'Crear nuevo proyecto',
      projectsEyebrow: 'Proyectos',
      statusEyebrow: 'Estado',
      contractEyebrow: 'Contrato',
      statusActive: 'Base activa y persistente',
      statusEmpty: 'Listo para primer proyecto',
      statusFallback: 'Fallback operativo activo',
      contractReady: 'Premium app operativa',
      contractFallback: 'Acceso sin caída ante fallo de datos',
      sectionEyebrow: 'Mis proyectos',
      sectionTitle: 'Base editorial individual',
      emptyEyebrow: 'Estado inicial',
      emptyFallbackEyebrow: 'Modo degradado',
      emptyTitle: 'Aún no hay proyectos, pero el workspace ya está listo para abrir el primero.',
      emptyFallbackTitle: 'El dashboard sigue accesible aunque la lectura de proyectos haya fallado.',
      emptyDescription:
        'La experiencia premium no empieza cuando ya hay contenido. Empieza cuando el sistema te invita a crear con claridad desde el minuto uno.',
      emptyFallbackDescription:
        'Puedes seguir creando un proyecto nuevo mientras se recupera la capa de datos. Esto evita que la navegación principal termine en error 500.',
      emptyAction: 'Crear el primer proyecto',
    },
    project: {
      newEyebrow: 'Proyecto nuevo',
      newTitle: 'Crea el contenedor editorial base',
      newDescription:
        'Al crear el proyecto se generan documento, portada y contrato de edición para que el flujo completo arranque ya sobre el modelo canónico.',
      createFormEyebrow: 'Nuevo proyecto',
      createFormTitle: 'Crea una base editorial con estándar premium',
      createFormDescription:
        'El proyecto puede nacer vacío o a partir de un documento fuente real para arrancar con contenido útil desde el primer minuto.',
      titleLabel: 'Título del proyecto',
      titlePlaceholder: 'Ej. Manual de marca editorial 2026',
      sourceDocumentLabel: 'Documento base opcional',
      sourceDocumentHint:
        'Soporta `pdf`, `doc`, `docx`, `txt` y `md`. Si el archivo se puede extraer bien, el editor arrancará ya sembrado con ese contenido.',
      createProjectHint:
        'La creación persiste sobre Neon desde el primer paso y abre el editor con base importada si has adjuntado documento.',
      createProjectAction: 'Crear proyecto y abrir editor',
      templateSelectorEyebrow: 'Plantilla de producto',
      templateSelectorTitle: 'Elige la estructura inicial',
      templateSelectorDescription:
        'Cada plantilla siembra capítulos guía y reglas de composición. La marca se aplica después, por separado.',
      templateSelectorSelected: 'Seleccionada',
      templateSelectorSelect: 'Seleccionar',
      productTemplates: {
        standardBook: {
          name: 'Libro estándar',
          description:
            'Portadilla, legal, prólogo, capítulos y epílogo: el esqueleto completo de un libro listo para escribir desde el minuto uno.',
        },
        technicalManual: {
          name: 'Manual técnico',
          description:
            'Secciones numeradas, referencia y apéndices, con reglas que protegen el código y las listas largas en cada página.',
        },
        leadMagnet: {
          name: 'Guía / lead magnet',
          description:
            'Secciones cortas y un cierre con CTA: una guía que se lee de un tirón y convierte lectores en leads.',
        },
        modularCourse: {
          name: 'Curso modular',
          description:
            'Módulos con lecciones y recursos ya ordenados para convertir tu método en un producto formativo publicable.',
        },
        bundle: {
          name: 'Bundle',
          description:
            'Un documento con partes agrupadas para empaquetar libro, workbook y recursos en un solo producto.',
        },
      },
      cardPremium: 'Premium',
      cardUpdated: 'Actualizado',
      cardOpenEditor: 'Abrir editor',
      cardPreview: 'Preview',
      cardDelete: 'Eliminar',
      cardDeleteConfirm: '¿Seguro que quieres eliminar "{title}"? Esta acción no se puede deshacer.',
      editorEyebrow: 'Editor',
      editorOpenPreview: 'Abrir preview',
      editorOpenCover: 'Diseñar portada',
      editorMetaEyebrow: 'Metadatos',
      editorLiveEyebrow: 'Documento vivo',
      editorLiveDescription:
        'La edición persiste sobre el documento canónico. El preview lee exactamente este mismo contenido.',
      editorTitleLabel: 'Título',
      editorSubtitleLabel: 'Subtítulo',
      editorAuthorLabel: 'Autor',
      editorChapterLabel: 'Título del capítulo',
      saveChanges: 'Guardar cambios',
      previewEyebrow: 'Preview',
      previewTitle: 'Validación de lectura y portada',
      previewBackToEditor: 'Volver al editor',
      previewOpenCover: 'Abrir cover studio',
      previewCanvasEyebrow: 'Preview editorial',
      previewCoverEyebrow: 'Portada actual',
      editorialMapTitle: 'Mapa editorial',
      editorialMapDescription: 'Compara la estructura detectada del documento, los capítulos actuales y el reparto de páginas del preview.',
      editorialMapOriginalColumn: 'Documento detectado',
      editorialMapChaptersColumn: 'Capítulos actuales',
      editorialMapPagesColumn: 'Páginas del preview',
      editorialMapGeneratedMeta: 'Índice generado automáticamente',
      editorialMapInferredMeta: 'Bloque inferido durante la importación',
      editorialMapAddedMeta: 'Añadido tras la importación',
      editorialMapRemovedMeta: 'Detectado en el original, ya no está en los capítulos',
      editorialMapMergedMeta: 'Fusionado dentro de un capítulo',
      coverEyebrow: 'Cover studio',
      coverTitle: 'Diseña y guarda la portada del proyecto',
      coverBackEditor: 'Editor',
      coverBackPreview: 'Preview',
      coverFormEyebrow: 'Portada persistente',
      coverTitleLabel: 'Título',
      coverSubtitleLabel: 'Subtítulo',
      coverAuthorLabel: 'Autor',
      coverPaletteLabel: 'Paleta',
      coverBackgroundLabel: 'Imagen de fondo',
      coverOpacityLabel: 'Opacidad de imagen',
      coverAdvancedSyncNotice:
        'Existe una portada avanzada asociada. Si guardas cambios aquí en título, subtítulo o autor, ese contenido también se actualizará en el editor avanzado, manteniendo su estilo actual: color, tamaño, espaciado y demás ajustes visuales.',
      backCoverAdvancedSyncNotice:
        'Existe una contraportada avanzada asociada. Si guardas cambios aquí en título, texto o biografía, ese contenido también se actualizará en el editor avanzado, manteniendo su estilo actual: color, tamaño, espaciado y demás ajustes visuales.',
      coverSave: 'Guardar portada',
      coverNoImage: 'Sin imagen subida',
      paletteObsidian: 'Obsidian',
      paletteTeal: 'Teal',
      paletteSand: 'Sand',
      importAnalyzing: 'Analizando documento...',
      importReady: 'Listo para importar',
      importOcrAppliedLabel: 'PDF escaneado: texto reconocido mediante OCR. Modo declarado:',
      importOcrBadgeLocal: 'Procesado en tu dispositivo',
      importOcrBadgeService: 'Procesado en la nube privada de Anclora',
      importOcrBadgeBrowser: 'Procesado en tu navegador',
      importChaptersDetected: '{count} capítulos detectados',
      importTitleDetected: 'Título detectado',
      importAuthorDetected: 'Autor detectado',
      importConfidenceHigh: 'Confianza alta',
      importConfidenceMedium: 'Confianza media',
      importConfidenceLow: 'Confianza baja',
      importManuscriptTypeLabel: 'Tipo de manuscrito',
      importManuscriptTypeEssay: 'Ensayo',
      importManuscriptTypeGuide: 'Guía práctica',
      importManuscriptTypeNovel: 'Novela',
      importManuscriptTypeNonFiction: 'No ficción',
      importWarningsLabel: 'Revisión recomendada',
      importChapterPreviewLabel: 'Estructura detectada',
      importErrorGeneric: 'No se pudo analizar el documento',
      importFileTooLarge: 'El archivo es demasiado grande (máx. 50 MB)',
      importFormatUnsupported: 'Formato no compatible',
      chapterSyncPageNumbers: 'Actualizar numeración',
      chapterSyncPageNumbersTitle: 'Recalcular la numeración del índice y de los pies de página',
      chapterSyncPageNumbersHelper:
        'Sincroniza el índice y los pies de página con la maquetación actual del preview.',
      chapterSyncPageNumbersDone: 'Índice y numeración sincronizados.',
      chapterSyncPageNumbersMissingIndex: 'No se encontró un capítulo Índice para sincronizar.',
      coverOpenBackCover: 'Contraportada',
      advancedCoverEyebrow: 'Distribución',
      advancedCoverLayoutLabel: 'Distribución',
      advancedCoverFontLabel: 'Tipografía',
      advancedCoverAccentLabel: 'Color de acento',
      backCoverEyebrow: 'Contraportada',
      backCoverTitle: 'Diseña la contraportada del proyecto',
      backCoverFormEyebrow: 'Contraportada persistente',
      backCoverTitleLabel: 'Título del autor',
      backCoverBodyLabel: 'Texto de contraportada',
      backCoverBodyPlaceholder: 'Resumen o blurb del proyecto...',
      backCoverAuthorBioLabel: 'Biografía del autor',
      backCoverSave: 'Guardar contraportada',
      backCoverBackToCover: 'Portada',
      previewExportButton: 'Exportar HTML',
      previewExportFilename: 'proyecto',
      previewExportPdfButton: 'Exportar PDF',
      previewExportDocxButton: 'Exportar Word (.docx)',
      previewExportEpubButton: 'Exportar EPUB (.epub)',
      coverRenderImage: 'Generar imagen',
      coverRenderImageDone: 'Imagen guardada',
      coverRenderedImageLabel: 'Imagen renderizada',
      coverSwitchToAdvanced: 'Editor Avanzado',
      coverSwitchToBasic: 'Editor Básico',
      coverStudioEyebrow: 'Estudio de cubierta',
      coverStudioSimpleSummary: 'Parte de una plantilla y ajusta el contenido guiado. Lo que ves es lo que se exporta.',
      coverStudioAdvancedSummary: 'Mueve y edita cada capa de texto directamente sobre el lienzo.',
      coverStudioCanvasLabel: 'Lienzo',
      coverStudioTemplateLabel: 'Plantilla',
      coverStudioFieldsLegend: 'Contenido',
      coverStudioInspectorEmpty: 'Haz clic en un texto del lienzo para editarlo.',
      coverStudioContentLabel: 'Contenido',
      coverFieldResync: 'Sincronizar con metadatos',
      coverStudioAlignLabel: 'Alineación y estilo',
      coverStudioFontSizeLabel: 'Tamaño',
      coverStudioLineHeightLabel: 'Interlineado',
      coverStudioCharSpacingLabel: 'Espaciado letras',
      coverStudioColorLabel: 'Color',
      coverStudioVisibilityLabel: 'Visibilidad',
      coverStudioSaveDesign: 'Guardar Diseño Final',
      coverStudioSaved: 'Guardado',
      stepContent: 'Contenido',
      stepChapters: 'Capítulos',
      stepTemplate: 'Plantilla',
      stepCover: 'Portada',
      stepBackCover: 'Contraportada',
      stepPreview: 'PREVIEW',
      stepCollaborate: 'Colaborar',
      stepAI: 'IA',
      stepExport: 'Exportar',
      stepContentDesc: 'Escribe y estructura el contenido principal de tu publicación.',
      stepChaptersDesc: 'Organiza los capítulos y la jerarquía de tu documento.',
      stepTemplateDesc: 'Selecciona una identidad visual premium para tu libro.',
      stepCoverDesc: 'Diseña una portada impactante con imágenes y paletas personalizadas.',
      stepBackCoverDesc: 'Configura la contraportada y la biografía del autor.',
      stepPreviewDesc: 'Valida la experiencia de lectura final en diferentes dispositivos.',
      stepCollaborateDesc: 'Gestiona el acceso de tu equipo y revisores al proyecto.',
      stepAIDesc: 'Potencia tu contenido con sugerencias inteligentes de IA.',
      stepExportDesc: 'Publica y descarga tu obra en múltiples formatos profesionales.',
      rulesPanelEyebrow: 'Composición',
      rulesPanelTitle: 'Reglas del documento',
      rulesPanelDescription: 'Controla cómo el motor compone la paginación: bloques indivisibles, encabezados huérfanos, viudas y numeración.',
      rulesPresetLabel: 'Preset',
      rulesPresetDefault: 'Empezar con buen pie',
      rulesPresetPrint: 'Maquetación print sin sustos',
      rulesPresetDigital: 'Publicar sin rechazos',
      rulesPresetDefaultDesc: 'Reglas equilibradas, listas para editar y publicar sin ajustes.',
      rulesPresetPrintDesc: 'Capítulos en página impar y saltos de página listos para imprenta.',
      rulesPresetDigitalDesc: 'Paginación fluida pensada para la lectura en pantalla.',
      rulesKeepTable: 'No dividir tablas',
      rulesTableFillGap: 'Hueco al saltar una tabla',
      rulesFillGapLeaveSpace: 'Dejar espacio',
      rulesFillGapNextFloat: 'Rellenar con el párrafo siguiente',
      rulesKeepList: 'No dividir listas de ≤ N ítems',
      rulesKeepCode: 'No dividir bloques de código',
      rulesKeepQuote: 'No dividir citas',
      rulesKeepCallout: 'No dividir avisos (callouts)',
      rulesKeepImageCaption: 'No separar imagen de su pie',
      rulesKeepWithNext: 'Los encabezados viajan con el contenido siguiente',
      rulesMinLinesAfter: 'Líneas mínimas tras un encabezado',
      rulesWidowsOrphans: 'Líneas mínimas viudas/huérfanas',
      rulesChapterOddPage: 'Capítulos en página impar (recto)',
      rulesPageBreakBeforeChapter: 'Salto de página antes de cada capítulo',
      rulesRestartFigures: 'Renumerar figuras por capítulo',
      rulesRestartTables: 'Renumerar tablas por capítulo',
      rulesPageNumberFormat: 'Formato de número de página',
      rulesFormatDecimal: 'Decimal (1, 2, 3)',
      rulesFormatLowerRoman: 'Romano minúsculas (i, ii, iii)',
      rulesFormatUpperRoman: 'Romano mayúsculas (I, II, III)',
      rulesExportGate: 'Al exportar con violaciones',
      rulesExportGateOff: 'Permitir sin avisos',
      rulesExportGateWarn: 'Advertir',
      rulesExportGateBlock: 'Bloquear exportación',
      rulesSave: 'Guardar reglas',
      rulesSaved: 'Reglas guardadas',
      healthPanelEyebrow: 'Composición',
      healthPanelTitle: 'Salud del documento',
      healthNoViolations: 'Cero violaciones. El documento compone limpio.',
      healthViolationsCount: '{count} violaciones',
      healthViolationPage: 'pág. {page}',
      healthGoToPreview: 'Abrir preview',
      preflightTitle: 'Pre-flight por canal',
      preflightChannelKdp: 'KDP',
      preflightChannelIngramspark: 'IngramSpark',
      preflightChannelKobo: 'Kobo',
      preflightEmpty: 'Sin incidencias. El documento está listo para este canal.',
      preflightIssueCount: '{count} incidencias',
      preflightSeverityError: 'error',
      preflightSeverityWarning: 'aviso',
      preflightSeverityInfo: 'info',
      preflightRules: {
        'kdp.metadata.title': 'KDP exige un título en los metadatos de la publicación.',
        'kdp.metadata.author': 'KDP exige autor/a en los metadatos de la publicación.',
        'kdp.metadata.isbn': 'Sin ISBN: KDP asignará un ASIN propio. Añade el ISBN si lo tienes.',
        'kdp.metadata.language': 'Idioma no declarado: KDP lo usa para el catálogo y los lectores.',
        'kdp.image.alt': 'Imagen sin texto alternativo ({src}); KDP lo exige en el contenido.',
        'kdp.image.resolution': 'Imagen muy pequeña ({lines} líneas estimadas); verifica su resolución antes de publicar.',
        'kdp.fonts.embed': 'La fuente «{font}» no es embebible; el EPUB incrusta Liberation y el resto cae a fuentes del sistema.',
        'ingram.metadata.isbn': 'IngramSpark exige un ISBN propio para publicar.',
        'ingram.metadata.description': 'Descripción recomendada para la ficha de distribución de IngramSpark.',
        'ingram.image.packaging': 'Imagen con origen no empaquetable ({src}); súbela como asset del proyecto.',
        'kobo.metadata.title': 'Kobo exige un título en los metadatos.',
        'kobo.metadata.author': 'Kobo exige autor/a en los metadatos.',
        'kobo.metadata.language': 'Kobo exige el idioma declarado (accesibilidad EPUB).',
        'kobo.a11y.imageAlt': 'Imagen sin texto alternativo ({src}); la accesibilidad EPUB lo exige.',
        'kobo.a11y.headingJump': 'Salto de jerarquía de encabezados (H{from} → H{to}); rompe la navegación accesible.',
      },
      aiAssistantEyebrow: 'Asistente IA',
      aiEthicalCopy: 'Asistente editorial — tú decides. La IA propone cambios sobre el documento; nunca escribe directamente.',
      aiProposeFix: 'Proponer fix',
      aiProposalLoading: 'Generando propuesta…',
      aiProposalError: 'No se pudo generar la propuesta.',
      aiProposalStale: 'El documento cambió desde que se generó la propuesta. Vuelve a generarla.',
      aiProposalAccept: 'Aceptar',
      aiProposalReject: 'Rechazar',
      aiProposalApplying: 'Aplicando…',
      aiModeCloud: 'Operación procesada en la nube',
      aiModeLocal: 'Propuesta local (heurísticas, sin nube)',
      aiAdvisoryBadge: 'Aviso — sin autocorrección',
      aiDiffBefore: 'Antes',
      aiDiffAfter: 'Después',
      aiChangeAdded: 'añadido',
      aiChangeRemoved: 'eliminado',
      aiChangeChanged: 'modificado',
      aiChangeMoved: 'movido',
      aiNoProposals: 'Sin propuestas automáticas para esta incidencia.',
      aiCoherenceButton: 'Revisar coherencia (refs/TOC)',
      aiCoherenceLoading: 'Analizando coherencia…',
      aiCoherenceTitle: 'Coherencia de referencias y TOC',
      aiCoherenceEmpty: 'Sin problemas de coherencia: referencias vivas y TOC correctos.',
      aiIssueBrokenRef: 'Referencia rota a «{target}»',
      aiIssueDuplicateHeading: 'Encabezado duplicado: «{text}»',
      aiIssueMissingChapterHeading: 'Capítulo sin encabezado de nivel 1',
      aiProvenanceTitle: 'Procedencia del contenido',
      aiProvenanceSummary: '{ai} bloques IA · {human} bloques humanos',
      aiCoAuthorEyebrow: 'Co-autor IA',
      aiCoAuthorEthicalCopy:
        'Asistente editorial, no escritor fantasma: la IA propone y tú decides qué entra en tu libro.',
      aiCoAuthorChapterLabel: 'Capítulo',
      aiCoAuthorStyleAction: 'Reescritura de estilo',
      aiCoAuthorArchitectureAction: 'Arquitectura de contenido',
      aiCoAuthorSummaryAction: 'Resumen derivado',
      aiCoAuthorNoProposal: 'Sin propuesta: la IA no devolvió cambios válidos para esta acción.',
      kdpDisclosureTitle: 'Declaración de contenido IA (KDP)',
      kdpDisclosureRequiredBadge: 'Requerida: contenido AI-assisted',
      kdpDisclosureExemptBadge: 'Exenta: contenido 100% humano',
      kdpDisclosureHelper:
        'Copia este texto en la pregunta de Amazon KDP sobre contenido generado con IA al publicar.',
      exportGateBlockedMessage: 'Exportación bloqueada: resuelve las violaciones del documento primero.',
      exportGateWarnMessage: 'Aviso: el documento tiene {count} violaciones de composición.',
      metadataPanelEyebrow: 'Producto digital',
      metadataPanelTitle: 'Metadatos de la publicación',
      metadataPanelDescription: 'Se inyectan en la portadilla, la página legal y la exportación, y sincronizan portada y contraportada.',
      metadataIsbnLabel: 'ISBN (opcional)',
      metadataDescriptionLabel: 'Descripción',
      metadataKeywordsLabel: 'Keywords',
      metadataKeywordsHelper: 'Separadas por comas',
      metadataLanguageLabel: 'Idioma',
      metadataSave: 'Guardar metadatos',
      metadataSaved: 'Metadatos guardados',
      brandPanelEyebrow: 'Identidad de marca',
      brandPanelTitle: 'Perfil de marca',
      brandPanelDescription:
        'Tema de marca opcional (paleta, tipografía y proporciones) aplicado a los exports. Independiente de las reglas de estructura.',
      brandSelectLabel: 'Perfil aplicado al proyecto',
      brandNoneOption: 'Sin perfil de marca',
      brandStatusDraft: 'Borrador',
      brandStatusActive: 'Activo',
      brandStatusDeprecated: 'Obsoleto',
      brandActivateAction: 'Activar',
      brandUploadLabel: 'Crear perfil desde manual de identidad (PDF)',
      brandUploadAction: 'Extraer perfil',
      brandUploading: 'Extrayendo…',
      brandSaved: 'Perfil de marca actualizado',
      brandVersionLabel: 'versión',
      reimportButton: 'Reimportar DOCX',
      reimportDialogTitle: 'Reimportar documento',
      reimportDialogDescription: 'Sube la versión revisada del archivo original. El contenido se fusiona por estructura: se conservan portada, contraportada, reglas y ajustes manuales.',
      reimportAnalyzing: 'Analizando archivo…',
      reimportConfirmLabel: 'Confirmar reimportación',
      reimportCancelLabel: 'Cancelar',
      reimportSummaryUpdate: '{count} capítulos se actualizarán',
      reimportSummaryAdd: '{count} capítulos se añadirán',
      reimportSummaryKeep: '{count} capítulos se conservan (no están en el archivo)',
      reimportResultTitle: 'Reimportación completada',
      reimportDone: 'Cerrar',
      reimportError: 'No se pudo reimportar el archivo.',
      structureToggleLabel: 'Aplicar estructura de referencia',
      structureToggleHint:
        'Genera un andamiaje vacío (partes, capítulos y subsecciones) a partir de la estructura de un documento de referencia. Nunca copia contenido ni voz de la fuente.',
      structureConfigureAction: 'Configurar estructura de referencia',
      structureConfiguredBadge: 'Estructura confirmada: {summary}',
      structureDialogTitle: 'Estructura de referencia',
      structureDialogDescription:
        'Sube un documento de referencia o elige un perfil guardado. Revisarás el esquema inferido antes de aplicarlo: nada se aplica sin tu confirmación.',
      structureSourceUploadLabel: 'Subir documento de referencia',
      structureSourceSavedLabel: 'Perfiles de estructura guardados',
      structureNoSavedProfiles: 'Aún no tienes perfiles de estructura guardados.',
      structureAnalyzing: 'Analizando estructura…',
      structureConfirmTitle: 'Confirma el esquema inferido',
      structureHierarchyLine: 'Jerarquía: {levels} (profundidad {depth})',
      structureSummaryLine: '{parts} partes · {chapters} capítulos · {subsections} subsecciones',
      structureFunctionMissing: 'sin inferir (edítala después)',
      structureConfidencePrefix: 'confianza:',
      structureSaveProfileLabel: 'Guardar como perfil reutilizable',
      structureProfileNamePlaceholder: 'Nombre del perfil',
      structureConfirmAction: 'Confirmar estructura',
      structureDiscardAction: 'Descartar',
      structureError: 'No se pudo analizar el documento de referencia.',
      healthRecomposedBadge: 'Recompuesto desde la pág. {page}',
      healthDiffTitle: 'Cambios desde la última edición',
      healthDiffShift: '{title}: pág. {from} → {to}',
      healthDiffToc: '{count} entradas al índice',
      healthDiffViolations: '{count} violaciones nuevas',
      healthTelemetrySummary: '{count} recomposiciones · última {lastMs} ms · media {avgMs} ms',
      healthRevertLabel: 'Recompuesto tras tu último guardado en «{chapter}». Puedes restaurar el contenido anterior.',
      healthRevertAction: 'Revertir',
      healthReverting: 'Revirtiendo…',
      previewModalZoomOut: 'Reducir zoom',
      previewModalZoomIn: 'Aumentar zoom',
      previewModalSingleView: 'Vista de 1 página',
      previewModalSpreadView: 'Vista de 2 páginas',
      previewModalLaptop: 'Laptop (6x9)',
      previewModalTablet: 'Tablet (5.5x8.5)',
      previewModalMobile: 'Móvil (3.7x6.2)',
      previewModalPrevious: 'Anterior',
      previewModalNext: 'Siguiente',
      previewModalPage: 'Página',
      previewModalOf: 'de',
      previewModalClose: 'Cerrar',
      previewModalAdvanced: 'Vista previa avanzada',
      previewModalTocShow: 'Mostrar índice',
      previewModalTocHide: 'Ocultar índice',
      previewModalTocHeading: 'Índice',
      previewModalZoomSlider: 'Nivel de zoom de la vista previa',
      previewModalEmptyState: 'Sin contenido para mostrar',
      previewModalUntitledProject: 'Proyecto sin título',
      previewModalUntitledChapter: 'Capítulo sin título',
      previewModalCoverAlt: 'Portada de vista previa',
      previewModalBackCoverAlt: 'Contraportada de vista previa',
      onboardingEyebrow: 'Bienvenido a tu workspace editorial',
      onboardingStepLabel: 'Paso {step} de {total}',
      onboardingStep1Title: 'Revisa sin miedo',
      onboardingStep1Body: 'Edita, reordena y reescribe a tu ritmo: el documento se recompone solo con cada cambio.',
      onboardingStep2Title: 'Nunca más un índice desactualizado',
      onboardingStep2Body: 'El índice y la paginación se regeneran solos mientras trabajas. Tu libro siempre está al día.',
      onboardingStep3Title: 'Publica sin rechazos',
      onboardingStep3Body: 'El panel de salud y las reglas del documento vigilan cada detalle antes de exportar.',
      onboardingNext: 'Siguiente',
      onboardingSkip: 'Saltar introducción',
      onboardingDone: 'Entendido',
      onboardingClose: 'Cerrar introducción',
    },
    filestudio: {
      badgeLocal: 'Procesado en tu dispositivo',
      badgeService: 'Procesado en la nube privada de Anclora',
      badgeBrowser: 'Procesado en tu navegador',
      settingsEyebrow: 'Integraciones',
      settingsTitle: 'FileStudio — conversión de archivos',
      settingsDescription:
        'Empareja el Agente Local de FileStudio para convertir y post-procesar archivos en tu propio dispositivo, sin subir el contenido.',
      statusLabel: 'Estado',
      statusPaired: 'Agente Local emparejado',
      statusPending: 'Emparejamiento pendiente',
      statusNone: 'Sin agente emparejado',
      pairTitle: 'Emparejar agente local',
      pairRequestIdLabel: 'ID de solicitud',
      pairRequestIdHint: 'El Agente Local lo muestra junto al código de emparejamiento.',
      pairCodeLabel: 'Código de 6 dígitos',
      pairSubmit: 'Emparejar',
      pairSubmitting: 'Emparejando…',
      pairSuccess: 'Agente Local emparejado correctamente.',
      pairError: 'No se pudo completar el emparejamiento.',
      optimizeButton: 'Optimizar portada (3 tamaños)',
      optimizeWorking: 'Enviando a FileStudio…',
      optimizeNoCover: 'Genera o sube primero una imagen de portada.',
      optimizeSuccess: 'Optimización enviada. Los derivados aparecerán aquí al completarse.',
      consentTitle: 'Confirmar procesamiento local',
      consentDescription:
        'FileStudio procesará este archivo en tu dispositivo emparejado. Declaramos la operación y el modo antes de enviar nada.',
      consentOperationLabel: 'Operación',
      consentModeLabel: 'Modo',
      consentFileLabel: 'Archivo',
      consentFileCover: 'Portada del proyecto',
      consentConfirm: 'Autorizar y enviar',
      consentReject: 'Rechazar',
      derivativesTitle: 'Derivados generados',
      derivativesEmpty: 'Aún no hay derivados. Lanza la optimización para generar los 3 tamaños.',
      derivativeView: 'Ver',
      operationResizeLabel: 'Redimensionar imagen a 1600 / 800 / 400 px',
      jobStatus: {
        queued: 'En cola',
        processing: 'Procesando',
        completed: 'Completado',
        failed: 'Fallido',
        cancelled: 'Cancelado',
        expired: 'Caducado',
      },
      errors: {
        unavailable: 'La conversión no está disponible ahora mismo. Inténtalo más tarde.',
        limitConcurrent: 'Ya tienes 3 trabajos en curso. Espera a que termine alguno.',
        limitDaily: 'Has alcanzado tu límite diario de trabajos de conversión.',
        noCover: 'Genera o sube primero una imagen de portada.',
        notFound: 'No encontramos este proyecto.',
        pairingCodeInvalid: 'Código incorrecto. Comprueba el código que muestra el Agente Local.',
        pairingExpired: 'El código ha caducado. Genera uno nuevo en el Agente Local.',
        deviceRevoked: 'Este dispositivo se ha desvinculado. Vuelve a emparejarlo para procesar en local.',
        repairRequired: 'El Agente Local necesita reconectarse.',
        operationUnavailable: 'Esta operación no está disponible en ese modo; la hemos movido a otro procesador.',
        uploadTooLarge: 'El archivo supera el tamaño máximo para este modo de procesamiento.',
        integrityFailed: 'El resultado no pasó la verificación de integridad. Vamos a reintentarlo.',
        consentRejected: 'El procesamiento local fue rechazado en tu dispositivo. Puedes reintentarlo o elegir otro modo.',
        agentOffline: 'Tu dispositivo está desconectado. El trabajo esperará o puedes procesarlo en la nube privada.',
      },
    },
    launchPack: {
      title: 'Pack de lanzamiento',
      description:
        'Genera todos los formatos del producto en una operación y deja constancia de su procedencia. Si editas el documento después, marcamos los activos desactualizados.',
      generateButton: 'Generar pack de lanzamiento',
      regenerateButton: 'Regenerar pack',
      generating: 'Generando pack…',
      empty: 'Aún no hay pack generado. Lanza la generación para crear todos los formatos coordinados.',
      versionLabel: 'Versión {version}',
      staleBadge: 'Desactualizado',
      pendingBadge: 'En proceso',
      viewAsset: 'Abrir',
      provenanceCompositor: 'Compositor',
      provenanceService: 'FileStudio · nube',
      provenanceLocal: 'FileStudio · tu dispositivo',
      kinds: {
        epub: 'EPUB',
        pdf: 'PDF',
        html: 'HTML',
        markdown: 'Markdown (blog)',
        slides: 'Slides',
        image: 'Imagen',
        mobi: 'MOBI',
        azw3: 'AZW3',
        audio: 'Audio',
        video: 'Vídeo',
      },
      errors: {
        unavailable: 'No se pudo generar el pack ahora mismo. Inténtalo más tarde.',
        notFound: 'No encontramos este proyecto.',
      },
    },
    publishChannels: {
      title: 'Publicar en canales de venta',
      description:
        'Genera la ficha de producto y el copy de landing desde el propio libro, crea el borrador en Gumroad o descarga el paquete listo para subir a Hotmart.',
      kitTitle: 'Ficha de producto y copy de landing',
      generateKitButton: 'Generar ficha y copy',
      generatingKit: 'Generando…',
      sheetTab: 'Ficha de producto',
      landingTab: 'Copy de landing',
      copyButton: 'Copiar',
      copiedBadge: 'Copiado',
      draftDescriptionBadge: 'Borrador derivado del primer capítulo — revísalo antes de publicar',
      assetsLabel: 'Archivos del pack para subir',
      disclosureLabel: 'Declaración de contenido IA',
      gumroadTitle: 'Gumroad',
      gumroadDescription:
        'Crea el producto como borrador en tu cuenta de Gumroad (la API lo fuerza a borrador; lo publicas tú desde su panel).',
      gumroadDisabled: 'Canal no habilitado en este despliegue (GUMROAD_ENABLED).',
      tokenLabel: 'Token de acceso de Gumroad',
      tokenPlaceholder: 'Pega tu access token…',
      saveTokenButton: 'Conectar Gumroad',
      savingToken: 'Verificando token…',
      removeTokenButton: 'Desconectar',
      connectedBadge: 'Conectado',
      priceLabel: 'Precio (céntimos)',
      pricePlaceholder: '900',
      pushButton: 'Crear borrador en Gumroad',
      pushing: 'Creando borrador…',
      pushSuccessLabel: 'Borrador creado en Gumroad',
      modeApiBadge: 'API · borrador',
      hotmartTitle: 'Hotmart',
      hotmartDescription:
        'Hotmart no tiene API pública de creación de productos: descarga el paquete con la ficha, el copy y los archivos listos para el alta manual.',
      exportButton: 'Descargar paquete Hotmart',
      exporting: 'Preparando paquete…',
      instructionsTitle: 'Pasos para el alta manual',
      modeExportBadge: 'Export manual',
      errors: {
        unavailable: 'No se pudo completar la operación ahora mismo. Inténtalo más tarde.',
        notFound: 'No encontramos este proyecto.',
        notConfigured: 'El servidor no tiene clave de cifrado de credenciales configurada.',
        auth: 'El token de Gumroad no es válido o fue revocado.',
        validation: 'Gumroad rechazó los datos del producto. Revisa la ficha.',
        circuitOpen: 'Gumroad no responde; reintentaremos en unos segundos.',
      },
    },
    collaboration: {
      title: 'Colaboración editorial',
      description:
        'Invita a tu corrector y maquetador, comenta bloques concretos del libro y decide qué correcciones entran al documento.',
      openThreadsBadge: '{count} hilos abiertos',
      viewerRoleLabel: 'Tu rol',
      roleBadges: { author: 'Autor', editor: 'Corrector', designer: 'Maquetador' },
      teamTitle: 'Equipo con acceso',
      emptyTeam: 'Aún no hay colaboradores. Invita a tu corrector o maquetador con un enlace.',
      revokeButton: 'Revocar acceso',
      inviteTitle: 'Invitar colaborador',
      inviteDescription:
        'Genera un enlace de invitación con rol. El invitado lo acepta con su cuenta (o se registra gratis con ese email).',
      inviteEmailLabel: 'Email del invitado',
      inviteEmailPlaceholder: 'corrector@ejemplo.com',
      inviteRoleLabel: 'Rol',
      inviteButton: 'Generar invitación',
      invitingButton: 'Generando…',
      inviteLinkLabel: 'Enlace para compartir (caduca en 7 días)',
      copyButton: 'Copiar',
      copiedBadge: 'Copiado',
      noSeatTollNote:
        'Aceptar una invitación nunca exige plan ni pago al invitado: el producto aún no tiene facturación por asientos.',
      pendingInvitationsTitle: 'Invitaciones pendientes',
      invitationExpiresLabel: 'Caduca el {date}',
      cancelInvitationButton: 'Cancelar',
      commentsTitle: 'Comentarios por bloque',
      emptyComments: 'Todavía no hay comentarios. Cualquier rol puede comentar sobre un bloque del libro.',
      frontMatterChapter: 'Preliminares',
      commentPlaceholder: 'Comenta este bloque…',
      commentButton: 'Comentar',
      replyPlaceholder: 'Responde al hilo…',
      replyButton: 'Responder',
      resolveButton: 'Resolver hilo',
      openBadge: 'Abierto',
      resolvedBadge: 'Resuelto',
      resolvedByLabel: 'Resuelto por {name}',
      suggestionsTitle: 'Correcciones propuestas',
      emptySuggestions: 'El corrector aún no ha propuesto correcciones.',
      proposeButton: 'Proponer corrección',
      proposeSummaryPlaceholder: 'Resumen (p. ej. «Errata en el segundo párrafo»)…',
      proposeTextPlaceholder: 'Texto corregido del bloque…',
      proposeSubmitButton: 'Enviar propuesta',
      proposingButton: 'Enviando…',
      suggestionStatusBadges: { pending: 'Pendiente', accepted: 'Aceptada', rejected: 'Rechazada' },
      decidedByLabel: 'Decidido por {name}',
      acceptButton: 'Aceptar',
      rejectButton: 'Rechazar',
      invite: {
        title: 'Invitación de colaboración',
        description: 'Te han invitado a colaborar en un proyecto de Anclora Talent.',
        roleLabel: 'Rol asignado',
        acceptButton: 'Aceptar invitación',
        acceptingButton: 'Aceptando…',
        acceptedTitle: 'Invitación aceptada',
        acceptedDescription: 'Ya formas parte del equipo del proyecto. Sin planes ni pagos: el acceso es directo.',
        goToDashboardButton: 'Ir al panel',
      },
      errors: {
        unavailable: 'No se pudo completar la operación ahora mismo. Inténtalo más tarde.',
        forbidden: 'Tu rol no permite esta acción.',
        notFound: 'No encontramos el proyecto o el elemento.',
        invalid: 'Revisa los datos: faltan campos o no son válidos.',
        invalidEmail: 'El email de la invitación no es válido.',
        invalidRole: 'El rol de la invitación no es válido.',
        alreadyCollaborator: 'Ese email ya forma parte del equipo del proyecto.',
        expired: 'La invitación ha caducado. Pide una nueva al autor.',
        emailMismatch: 'Esta invitación es para otro email. Entra con la cuenta invitada.',
        alreadyAccepted: 'Esta invitación ya fue aceptada por otra cuenta.',
        stale: 'El documento cambió desde que se propuso la corrección; la propuesta ya no aplica.',
      },
    },
    history: {
      title: 'Historial de versiones',
      description:
        'Cada versión guarda una copia completa del documento. Compara dos versiones para ver qué cambió por capítulo o restaura una anterior sin perder el historial.',
      saveVersionButton: 'Guardar versión',
      savingVersion: 'Guardando versión…',
      empty: 'Aún no hay versiones guardadas. Se crean al guardar capítulos, reimportar o con «Guardar versión».',
      versionLabel: 'Versión {version}',
      sourceManualSave: 'Guardado',
      sourceReimport: 'Reimportación',
      sourceRestore: 'Restauración',
      compareFrom: 'Desde',
      compareTo: 'Hasta',
      compareButton: 'Comparar',
      comparing: 'Comparando…',
      selectVersions: 'Elige dos versiones distintas para comparar.',
      diffEmpty: 'No hay cambios entre estas versiones.',
      diffSummary: '{added} añadidos · {removed} eliminados · {changed} modificados · {moved} movidos',
      metadataChangedBadge: 'Metadatos modificados',
      changeAdded: 'Añadido',
      changeRemoved: 'Eliminado',
      changeChanged: 'Modificado',
      changeMoved: 'Movido',
      unchaptered: 'Sin capítulo',
      restoreButton: 'Restaurar',
      restoring: 'Restaurando…',
      errors: {
        unavailable: 'No se pudo completar la operación. Inténtalo más tarde.',
        notFound: 'No encontramos esta versión.',
        unchanged: 'No hay cambios desde la última versión guardada.',
      },
    },
  },
  en: {
    shell: {
      brand: 'Anclora Talent',
      badge: 'Premium App',
      contractEyebrow: 'Contract',
      contractTitle: 'Premium editorial workspace',
      contractDescription:
        'Protected identity, real persistence, and an experience that keeps the same visual level from entry to production.',
      navDashboard: 'Dashboard',
      navNewProject: 'New project',
      navProjects: 'My projects',
      stackEyebrow: 'Active stack',
      stackTitle: 'Auth + Neon + Blob',
      stackDescription:
        'The individual account remains the active unit, but the experience already presents itself as a premium product, not as a technical shell.',
      topbarEyebrow: 'App shell',
      topbarTitle: 'Personal editorial workspace',
      themeLabel: 'Theme',
      localeLabel: 'Language',
      themeDark: 'Dark',
      themeLight: 'Light',
      localeSpanish: 'ES',
      localeEnglish: 'EN',
      userMenuLabel: 'Account',
      signOut: 'Sign out',
      signingOut: 'Signing out…',
    },
    auth: {
      email: 'Email',
      password: 'Password',
      fullName: 'Full name',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      signIn: 'Sign in',
      signingIn: 'Signing in…',
      forgotPassword: 'Forgot your password?',
      noAccount: "Don't have an account?",
      signUp: 'Sign up',
      createAccount: 'Create account',
      creatingAccount: 'Creating account…',
      haveAccount: 'Already have an account?',
      passwordRequirements: 'At least 8 characters, with one letter and one number',
      socialAccess: 'Social access',
      google: 'Google',
      github: 'GitHub',
      socialComingSoon: 'Coming soon',
      oauthCancelled: 'You cancelled signing in with {provider}.',
      oauthInvalidState: 'The sign-in request with {provider} has expired or is not valid.',
      oauthError: 'Could not complete signing in with {provider}.',
      legalPrefix: 'By continuing, you accept the',
      terms: 'Terms of service',
      legalMiddle: 'and the',
      privacy: 'Privacy policy',
      legalSuffix: 'of Anclora Talent.',
      error: 'Incorrect email or password',
      emailInUse: 'An account with this email already exists',
      registerError: 'Could not create the account. Please try again.',
    },
    landing: {
      eyebrow: 'Anclora Talent',
      headline: 'Turn talent into an editorial presence ready to publish.',
      subheadline:
        'Create your account, launch your project, and work across document, preview, and cover from a single platform.',
      proofEyebrow: 'Confidence',
      workflowEyebrow: 'Flow',
      workflowTitle: 'Three steps to start without friction',
      workflowDescription:
        'The landing should reduce the distance between promise and action. Here the user understands the journey before signing up.',
      workflowAdvance: 'Continue',
      workflowStepLabel: 'Step',
      productEyebrow: 'Product',
      productTitle: 'A platform where document, preview, and cover stop competing with each other.',
      productDescription:
        'The user should not need to interpret technical layers. They need to see how document, preview, and cover fit into one experience.',
      benefitsEyebrow: 'Benefits',
      benefitsTitle: 'What the user gains on every visit',
      finalEyebrow: 'Next step',
      finalTitle: 'Open your account and start from a base that already looks like product.',
      finalNote:
        'Start with your own account, create your first project, and work from a base that already communicates clarity, consistency, and real output.',
      proofItems: [
        'Persistent projects from day one',
        'Document, preview, and cover in one flow',
        'Authenticated access ready for production',
      ],
      workflowSteps: [
        {
          title: 'Create your account',
          description: 'Enter in seconds and prepare your workspace.',
        },
        {
          title: 'Launch your project',
          description: 'Start from a canonical document and a clear structure.',
        },
        {
          title: 'Edit and publish',
          description: 'Turn drafts into a coherent editorial presence.',
        },
      ],
      showcasePanels: [
        {
          title: 'Canonical document',
          description: 'A single source of truth for editorial content.',
          accent: 'Structure',
          bullets: ['Consistent titles', 'Editable blocks', 'Reusable base'],
        },
        {
          title: 'Connected preview',
          description: 'Visual reading reflects what you will actually publish.',
          accent: 'Clarity',
          bullets: ['Immediate view', 'Consistent editing', 'Less friction'],
        },
        {
          title: 'Persistent cover',
          description: 'Images and assets prepared for repeated use.',
          accent: 'Finish',
          bullets: ['Saved cover', 'Assets in Blob', 'Lossless reuse'],
        },
      ],
      benefits: [
        {
          title: 'More clarity',
          description: 'Every project follows a structure that is quickly understood.',
        },
        {
          title: 'More speed',
          description: 'Fewer redundant decisions to move from idea to publication.',
        },
        {
          title: 'More consistency',
          description: 'Document, cover, and preview work from the same narrative.',
        },
      ],
    },
    dashboard: {
      eyebrow: 'Premium dashboard',
      title: 'Your editorial projects already live inside an app that feels like a real product.',
      description:
        'Auth, document, preview, and cover are already aligned. Now daily access also has to communicate value, control, and premium finish.',
      createProject: 'Create new project',
      projectsEyebrow: 'Projects',
      statusEyebrow: 'Status',
      contractEyebrow: 'Contract',
      statusActive: 'Active and persistent base',
      statusEmpty: 'Ready for the first project',
      statusFallback: 'Operational fallback enabled',
      contractReady: 'Premium app operational',
      contractFallback: 'Access stays up during data failure',
      sectionEyebrow: 'My projects',
      sectionTitle: 'Individual editorial base',
      emptyEyebrow: 'Initial state',
      emptyFallbackEyebrow: 'Degraded mode',
      emptyTitle: 'There are no projects yet, but the workspace is ready to open the first one.',
      emptyFallbackTitle: 'The dashboard stays available even if project loading fails.',
      emptyDescription:
        'The premium experience does not start only when content exists. It starts when the system invites you to create with clarity from minute one.',
      emptyFallbackDescription:
        'You can still create a new project while the data layer recovers. This prevents the main navigation from ending in a 500 error.',
      emptyAction: 'Create the first project',
    },
    project: {
      newEyebrow: 'New project',
      newTitle: 'Create the base editorial container',
      newDescription:
        'Creating the project generates the document, cover, and editing contract so the full flow starts on the canonical model.',
      createFormEyebrow: 'New project',
      createFormTitle: 'Create an editorial base with premium standards',
      createFormDescription:
        'The project can start empty or from a real source document so you begin with useful content from the first minute.',
      titleLabel: 'Project title',
      titlePlaceholder: 'Ex. Editorial brand manual 2026',
      sourceDocumentLabel: 'Optional source document',
      sourceDocumentHint:
        'Supports `pdf`, `doc`, `docx`, `txt`, and `md`. If extraction succeeds, the editor starts already seeded with that content.',
      createProjectHint:
        'Creation persists to Neon from the first step and opens the editor with imported content if you attached a document.',
      createProjectAction: 'Create project and open editor',
      templateSelectorEyebrow: 'Product template',
      templateSelectorTitle: 'Choose the starting structure',
      templateSelectorDescription:
        'Each template seeds guide chapters and composition rules. Brand is applied later, separately.',
      templateSelectorSelected: 'Selected',
      templateSelectorSelect: 'Select',
      productTemplates: {
        standardBook: {
          name: 'Standard book',
          description:
            'Title page, legal, prologue, chapters and epilogue: the full skeleton of a book ready to write from minute one.',
        },
        technicalManual: {
          name: 'Technical manual',
          description:
            'Numbered sections, reference and appendices, with rules that protect code and long lists on every page.',
        },
        leadMagnet: {
          name: 'Guide / lead magnet',
          description:
            'Short sections and a closing CTA: a guide that reads in one sitting and turns readers into leads.',
        },
        modularCourse: {
          name: 'Modular course',
          description:
            'Modules with lessons and resources already laid out to turn your method into a publishable course product.',
        },
        bundle: {
          name: 'Bundle',
          description:
            'One document with grouped parts to package book, workbook and resources into a single product.',
        },
      },
      cardPremium: 'Premium',
      cardUpdated: 'Updated',
      cardOpenEditor: 'Open editor',
      cardPreview: 'Preview',
      cardDelete: 'Delete',
      cardDeleteConfirm: 'Are you sure you want to delete "{title}"? This action cannot be undone.',
      editorEyebrow: 'Editor',
      editorOpenPreview: 'Open preview',
      editorOpenCover: 'Design cover',
      editorMetaEyebrow: 'Metadata',
      editorLiveEyebrow: 'Live document',
      editorLiveDescription:
        'Editing persists on the canonical document. Preview reads this exact same content.',
      editorTitleLabel: 'Title',
      editorSubtitleLabel: 'Subtitle',
      editorAuthorLabel: 'Author',
      editorChapterLabel: 'Chapter title',
      saveChanges: 'Save changes',
      previewEyebrow: 'Preview',
      previewTitle: 'Reading and cover validation',
      previewBackToEditor: 'Back to editor',
      previewOpenCover: 'Open cover studio',
      previewCanvasEyebrow: 'Editorial preview',
      previewCoverEyebrow: 'Current cover',
      editorialMapTitle: 'Editorial map',
      editorialMapDescription: 'Compare the detected source structure, current chapters, and preview page distribution at a glance.',
      editorialMapOriginalColumn: 'Detected document',
      editorialMapChaptersColumn: 'Current chapters',
      editorialMapPagesColumn: 'Preview pages',
      editorialMapGeneratedMeta: 'Automatically generated index',
      editorialMapInferredMeta: 'Block inferred during import',
      editorialMapAddedMeta: 'Added after import',
      editorialMapRemovedMeta: 'Detected in the source, no longer in the chapters',
      editorialMapMergedMeta: 'Merged into a chapter',
      coverEyebrow: 'Cover studio',
      coverTitle: 'Design and save the project cover',
      coverBackEditor: 'Editor',
      coverBackPreview: 'Preview',
      coverFormEyebrow: 'Persistent cover',
      coverTitleLabel: 'Title',
      coverSubtitleLabel: 'Subtitle',
      coverAuthorLabel: 'Author',
      coverPaletteLabel: 'Palette',
      coverBackgroundLabel: 'Background image',
      coverOpacityLabel: 'Image opacity',
      coverAdvancedSyncNotice:
        'An advanced cover already exists. If you save title, subtitle, or author changes here, that content will also update in the advanced editor while preserving its current styling: color, size, spacing, and other visual settings.',
      backCoverAdvancedSyncNotice:
        'An advanced back cover already exists. If you save title, body, or author bio changes here, that content will also update in the advanced editor while preserving its current styling: color, size, spacing, and other visual settings.',
      coverSave: 'Save cover',
      coverNoImage: 'No uploaded image',
      paletteObsidian: 'Obsidian',
      paletteTeal: 'Teal',
      paletteSand: 'Sand',
      importAnalyzing: 'Analyzing document...',
      importReady: 'Ready to import',
      importOcrAppliedLabel: 'Scanned PDF: text recognized via OCR. Declared mode:',
      importOcrBadgeLocal: 'Processed on your device',
      importOcrBadgeService: 'Processed in Anclora’s private cloud',
      importOcrBadgeBrowser: 'Processed in your browser',
      importChaptersDetected: '{count} chapters detected',
      importTitleDetected: 'Detected title',
      importAuthorDetected: 'Detected author',
      importConfidenceHigh: 'High confidence',
      importConfidenceMedium: 'Medium confidence',
      importConfidenceLow: 'Low confidence',
      importManuscriptTypeLabel: 'Manuscript type',
      importManuscriptTypeEssay: 'Essay',
      importManuscriptTypeGuide: 'Practical guide',
      importManuscriptTypeNovel: 'Novel',
      importManuscriptTypeNonFiction: 'Non-fiction',
      importWarningsLabel: 'Recommended review',
      importChapterPreviewLabel: 'Detected structure',
      importErrorGeneric: 'Could not analyze the document',
      importFileTooLarge: 'File is too large (max. 50 MB)',
      importFormatUnsupported: 'Format not supported',
      chapterSyncPageNumbers: 'Sync pagination',
      chapterSyncPageNumbersTitle: 'Recalculate the table of contents and footer page numbers',
      chapterSyncPageNumbersHelper:
        'Synchronize the table of contents and footers with the current preview layout.',
      chapterSyncPageNumbersDone: 'Table of contents and pagination synchronized.',
      chapterSyncPageNumbersMissingIndex: 'No table of contents chapter was found to synchronize.',
      coverOpenBackCover: 'Back cover',
      advancedCoverEyebrow: 'Layout',
      advancedCoverLayoutLabel: 'Layout',
      advancedCoverFontLabel: 'Typography',
      advancedCoverAccentLabel: 'Accent color',
      backCoverEyebrow: 'Back cover',
      backCoverTitle: 'Design the project back cover',
      backCoverFormEyebrow: 'Persistent back cover',
      backCoverTitleLabel: 'Author title',
      backCoverBodyLabel: 'Back cover text',
      backCoverBodyPlaceholder: 'Project summary or blurb...',
      backCoverAuthorBioLabel: 'Author bio',
      backCoverSave: 'Save back cover',
      backCoverBackToCover: 'Cover',
      previewExportButton: 'Export HTML',
      previewExportFilename: 'project',
      previewExportPdfButton: 'Export PDF',
      previewExportDocxButton: 'Export Word (.docx)',
      previewExportEpubButton: 'Export EPUB (.epub)',
      coverRenderImage: 'Generate image',
      coverRenderImageDone: 'Image saved',
      coverRenderedImageLabel: 'Rendered image',
      coverSwitchToAdvanced: 'Advanced Editor',
      coverSwitchToBasic: 'Basic Editor',
      coverStudioEyebrow: 'Cover studio',
      coverStudioSimpleSummary: 'Start from a template and adjust the guided content. What you see is what gets exported.',
      coverStudioAdvancedSummary: 'Move and edit every text layer directly on the canvas.',
      coverStudioCanvasLabel: 'Canvas',
      coverStudioTemplateLabel: 'Template',
      coverStudioFieldsLegend: 'Content',
      coverStudioInspectorEmpty: 'Click a text on the canvas to edit it.',
      coverStudioContentLabel: 'Content',
      coverFieldResync: 'Sync with metadata',
      coverStudioAlignLabel: 'Alignment and style',
      coverStudioFontSizeLabel: 'Size',
      coverStudioLineHeightLabel: 'Line height',
      coverStudioCharSpacingLabel: 'Letter spacing',
      coverStudioColorLabel: 'Color',
      coverStudioVisibilityLabel: 'Visibility',
      coverStudioSaveDesign: 'Save Final Design',
      coverStudioSaved: 'Saved',
      stepContent: 'Content',
      stepChapters: 'Chapters',
      stepTemplate: 'Template',
      stepCover: 'Cover',
      stepBackCover: 'Back Cover',
      stepPreview: 'Preview',
      stepCollaborate: 'Collaborate',
      stepAI: 'AI',
      stepExport: 'Export',
      stepContentDesc: 'Write and structure the main content of your publication.',
      stepChaptersDesc: 'Organize the chapters and hierarchy of your document.',
      stepTemplateDesc: 'Select a premium visual identity for your book.',
      stepCoverDesc: 'Design a striking cover with custom images and palettes.',
      stepBackCoverDesc: 'Configure the back cover and author biography.',
      stepPreviewDesc: 'Validate the final reading experience across different devices.',
      stepCollaborateDesc: 'Manage team and reviewer access to the project.',
      stepAIDesc: 'Enhance your content with smart AI suggestions.',
      stepExportDesc: 'Publish and download your work in multiple professional formats.',
      rulesPanelEyebrow: 'Composition',
      rulesPanelTitle: 'Document rules',
      rulesPanelDescription: 'Control how the engine composes pagination: unbreakable blocks, orphan headings, widows and numbering.',
      rulesPresetLabel: 'Preset',
      rulesPresetDefault: 'Start on the right foot',
      rulesPresetPrint: 'Print layout, no surprises',
      rulesPresetDigital: 'Publish without rejections',
      rulesPresetDefaultDesc: 'Balanced rules, ready to edit and publish with no tweaks.',
      rulesPresetPrintDesc: 'Odd-page chapter starts and page breaks, ready for the printer.',
      rulesPresetDigitalDesc: 'Fluid pagination designed for on-screen reading.',
      rulesKeepTable: 'Never split tables',
      rulesTableFillGap: 'Gap when a table jumps',
      rulesFillGapLeaveSpace: 'Leave space',
      rulesFillGapNextFloat: 'Fill with next paragraph',
      rulesKeepList: 'Never split lists of ≤ N items',
      rulesKeepCode: 'Never split code blocks',
      rulesKeepQuote: 'Never split quotes',
      rulesKeepCallout: 'Never split callouts',
      rulesKeepImageCaption: 'Keep image with its caption',
      rulesKeepWithNext: 'Headings travel with the following content',
      rulesMinLinesAfter: 'Minimum lines after a heading',
      rulesWidowsOrphans: 'Minimum widow/orphan lines',
      rulesChapterOddPage: 'Chapters start on odd (recto) pages',
      rulesPageBreakBeforeChapter: 'Page break before each chapter',
      rulesRestartFigures: 'Restart figure numbering per chapter',
      rulesRestartTables: 'Restart table numbering per chapter',
      rulesPageNumberFormat: 'Page number format',
      rulesFormatDecimal: 'Decimal (1, 2, 3)',
      rulesFormatLowerRoman: 'Lowercase roman (i, ii, iii)',
      rulesFormatUpperRoman: 'Uppercase roman (I, II, III)',
      rulesExportGate: 'When exporting with violations',
      rulesExportGateOff: 'Allow without warnings',
      rulesExportGateWarn: 'Warn',
      rulesExportGateBlock: 'Block export',
      rulesSave: 'Save rules',
      rulesSaved: 'Rules saved',
      healthPanelEyebrow: 'Composition',
      healthPanelTitle: 'Document health',
      healthNoViolations: 'Zero violations. The document composes cleanly.',
      healthViolationsCount: '{count} violations',
      healthViolationPage: 'page {page}',
      healthGoToPreview: 'Open preview',
      preflightTitle: 'Channel pre-flight',
      preflightChannelKdp: 'KDP',
      preflightChannelIngramspark: 'IngramSpark',
      preflightChannelKobo: 'Kobo',
      preflightEmpty: 'No findings. The document is ready for this channel.',
      preflightIssueCount: '{count} findings',
      preflightSeverityError: 'error',
      preflightSeverityWarning: 'warning',
      preflightSeverityInfo: 'info',
      preflightRules: {
        'kdp.metadata.title': 'KDP requires a title in the publication metadata.',
        'kdp.metadata.author': 'KDP requires an author in the publication metadata.',
        'kdp.metadata.isbn': 'No ISBN: KDP will assign its own ASIN. Add the ISBN if you have one.',
        'kdp.metadata.language': 'No language declared: KDP uses it for the catalog and readers.',
        'kdp.image.alt': 'Image without alternative text ({src}); KDP requires it in the content.',
        'kdp.image.resolution': 'Very small image ({lines} estimated lines); double-check its resolution before publishing.',
        'kdp.fonts.embed': 'The font “{font}” is not embeddable; the EPUB embeds Liberation and the rest falls back to system fonts.',
        'ingram.metadata.isbn': 'IngramSpark requires your own ISBN to publish.',
        'ingram.metadata.description': 'Description recommended for the IngramSpark distribution record.',
        'ingram.image.packaging': 'Image with a non-packageable source ({src}); upload it as a project asset.',
        'kobo.metadata.title': 'Kobo requires a title in the metadata.',
        'kobo.metadata.author': 'Kobo requires an author in the metadata.',
        'kobo.metadata.language': 'Kobo requires the declared language (EPUB accessibility).',
        'kobo.a11y.imageAlt': 'Image without alternative text ({src}); EPUB accessibility requires it.',
        'kobo.a11y.headingJump': 'Heading hierarchy jump (H{from} → H{to}); it breaks accessible navigation.',
      },
      aiAssistantEyebrow: 'AI assistant',
      aiEthicalCopy: 'Editorial assistant — you decide. AI proposes changes to the document; it never writes directly.',
      aiProposeFix: 'Propose fix',
      aiProposalLoading: 'Generating proposal…',
      aiProposalError: 'The proposal could not be generated.',
      aiProposalStale: 'The document changed since this proposal was generated. Generate it again.',
      aiProposalAccept: 'Accept',
      aiProposalReject: 'Reject',
      aiProposalApplying: 'Applying…',
      aiModeCloud: 'Operation processed in the cloud',
      aiModeLocal: 'Local proposal (heuristics, no cloud)',
      aiAdvisoryBadge: 'Advisory — no auto-fix',
      aiDiffBefore: 'Before',
      aiDiffAfter: 'After',
      aiChangeAdded: 'added',
      aiChangeRemoved: 'removed',
      aiChangeChanged: 'changed',
      aiChangeMoved: 'moved',
      aiNoProposals: 'No automatic proposals for this issue.',
      aiCoherenceButton: 'Check coherence (refs/TOC)',
      aiCoherenceLoading: 'Analyzing coherence…',
      aiCoherenceTitle: 'Reference & TOC coherence',
      aiCoherenceEmpty: 'No coherence issues: live references and TOC are correct.',
      aiIssueBrokenRef: 'Broken reference to "{target}"',
      aiIssueDuplicateHeading: 'Duplicated heading: "{text}"',
      aiIssueMissingChapterHeading: 'Chapter without a level-1 heading',
      aiProvenanceTitle: 'Content provenance',
      aiProvenanceSummary: '{ai} AI blocks · {human} human blocks',
      aiCoAuthorEyebrow: 'AI co-author',
      aiCoAuthorEthicalCopy:
        'Editorial assistant, not a ghostwriter: AI proposes and you decide what goes into your book.',
      aiCoAuthorChapterLabel: 'Chapter',
      aiCoAuthorStyleAction: 'Style rewrite',
      aiCoAuthorArchitectureAction: 'Content architecture',
      aiCoAuthorSummaryAction: 'Derived summary',
      aiCoAuthorNoProposal: 'No proposal: AI returned no valid changes for this action.',
      kdpDisclosureTitle: 'AI content disclosure (KDP)',
      kdpDisclosureRequiredBadge: 'Required: AI-assisted content',
      kdpDisclosureExemptBadge: 'Exempt: 100% human content',
      kdpDisclosureHelper:
        'Paste this text into Amazon KDP’s AI-generated content question when publishing.',
      exportGateBlockedMessage: 'Export blocked: resolve the document violations first.',
      exportGateWarnMessage: 'Warning: the document has {count} composition violations.',
      metadataPanelEyebrow: 'Digital product',
      metadataPanelTitle: 'Publication metadata',
      metadataPanelDescription: 'Injected into the title page, legal page and export, and synced with cover and back cover.',
      metadataIsbnLabel: 'ISBN (optional)',
      metadataDescriptionLabel: 'Description',
      metadataKeywordsLabel: 'Keywords',
      metadataKeywordsHelper: 'Comma separated',
      metadataLanguageLabel: 'Language',
      metadataSave: 'Save metadata',
      metadataSaved: 'Metadata saved',
      brandPanelEyebrow: 'Brand identity',
      brandPanelTitle: 'Brand profile',
      brandPanelDescription:
        'Optional brand theme (palette, typography and proportions) applied to exports. Independent from structure rules.',
      brandSelectLabel: 'Profile applied to the project',
      brandNoneOption: 'No brand profile',
      brandStatusDraft: 'Draft',
      brandStatusActive: 'Active',
      brandStatusDeprecated: 'Deprecated',
      brandActivateAction: 'Activate',
      brandUploadLabel: 'Create profile from identity manual (PDF)',
      brandUploadAction: 'Extract profile',
      brandUploading: 'Extracting…',
      brandSaved: 'Brand profile updated',
      brandVersionLabel: 'version',
      reimportButton: 'Reimport DOCX',
      reimportDialogTitle: 'Reimport document',
      reimportDialogDescription: 'Upload the revised version of the original file. Content is merged by structure: cover, back cover, rules and manual tweaks are preserved.',
      reimportAnalyzing: 'Analyzing file…',
      reimportConfirmLabel: 'Confirm reimport',
      reimportCancelLabel: 'Cancel',
      reimportSummaryUpdate: '{count} chapters will be updated',
      reimportSummaryAdd: '{count} chapters will be added',
      reimportSummaryKeep: '{count} chapters kept (not in the file)',
      reimportResultTitle: 'Reimport completed',
      reimportDone: 'Close',
      reimportError: 'The file could not be reimported.',
      structureToggleLabel: 'Apply reference structure',
      structureToggleHint:
        'Generates an empty scaffold (parts, chapters and subsections) from the structure of a reference document. It never copies content or voice from the source.',
      structureConfigureAction: 'Configure reference structure',
      structureConfiguredBadge: 'Structure confirmed: {summary}',
      structureDialogTitle: 'Reference structure',
      structureDialogDescription:
        'Upload a reference document or pick a saved profile. You will review the inferred schema before applying it: nothing is applied without your confirmation.',
      structureSourceUploadLabel: 'Upload reference document',
      structureSourceSavedLabel: 'Saved structure profiles',
      structureNoSavedProfiles: 'You have no saved structure profiles yet.',
      structureAnalyzing: 'Analyzing structure…',
      structureConfirmTitle: 'Confirm the inferred schema',
      structureHierarchyLine: 'Hierarchy: {levels} (depth {depth})',
      structureSummaryLine: '{parts} parts · {chapters} chapters · {subsections} subsections',
      structureFunctionMissing: 'not inferred (edit it later)',
      structureConfidencePrefix: 'confidence:',
      structureSaveProfileLabel: 'Save as reusable profile',
      structureProfileNamePlaceholder: 'Profile name',
      structureConfirmAction: 'Confirm structure',
      structureDiscardAction: 'Discard',
      structureError: 'The reference document could not be analyzed.',
      healthRecomposedBadge: 'Recomposed from page {page}',
      healthDiffTitle: 'Changes since last edit',
      healthDiffShift: '{title}: page {from} → {to}',
      healthDiffToc: '{count} TOC entries',
      healthDiffViolations: '{count} new violations',
      healthTelemetrySummary: '{count} recompositions · last {lastMs} ms · avg {avgMs} ms',
      healthRevertLabel: 'Recomposed after your last save in "{chapter}". You can restore the previous content.',
      healthRevertAction: 'Revert',
      healthReverting: 'Reverting…',
      previewModalZoomOut: 'Zoom out',
      previewModalZoomIn: 'Zoom in',
      previewModalSingleView: 'Single page view',
      previewModalSpreadView: 'Two page view',
      previewModalLaptop: 'Laptop (6x9)',
      previewModalTablet: 'Tablet (5.5x8.5)',
      previewModalMobile: 'Mobile (3.7x6.2)',
      previewModalPrevious: 'Previous',
      previewModalNext: 'Next',
      previewModalPage: 'Page',
      previewModalOf: 'of',
      previewModalClose: 'Close',
      previewModalAdvanced: 'Advanced preview',
      previewModalTocShow: 'Show table of contents',
      previewModalTocHide: 'Hide table of contents',
      previewModalTocHeading: 'Table of contents',
      previewModalZoomSlider: 'Preview zoom level',
      previewModalEmptyState: 'No content to display',
      previewModalUntitledProject: 'Untitled project',
      previewModalUntitledChapter: 'Untitled chapter',
      previewModalCoverAlt: 'Preview cover',
      previewModalBackCoverAlt: 'Preview back cover',
      onboardingEyebrow: 'Welcome to your editorial workspace',
      onboardingStepLabel: 'Step {step} of {total}',
      onboardingStep1Title: 'Edit without fear',
      onboardingStep1Body: 'Edit, reorder and rewrite at your own pace: the document recomposes itself with every change.',
      onboardingStep2Title: 'Never an outdated table of contents again',
      onboardingStep2Body: 'TOC and pagination regenerate automatically as you work. Your book is always up to date.',
      onboardingStep3Title: 'Publish without rejections',
      onboardingStep3Body: 'The health panel and document rules watch every detail before export.',
      onboardingNext: 'Next',
      onboardingSkip: 'Skip introduction',
      onboardingDone: 'Got it',
      onboardingClose: 'Close introduction',
    },
    filestudio: {
      badgeLocal: 'Processed on your device',
      badgeService: 'Processed in Anclora’s private cloud',
      badgeBrowser: 'Processed in your browser',
      settingsEyebrow: 'Integrations',
      settingsTitle: 'FileStudio — file conversion',
      settingsDescription:
        'Pair the FileStudio Local Agent to convert and post-process files on your own device, without uploading the content.',
      statusLabel: 'Status',
      statusPaired: 'Local Agent paired',
      statusPending: 'Pairing pending',
      statusNone: 'No agent paired',
      pairTitle: 'Pair local agent',
      pairRequestIdLabel: 'Request ID',
      pairRequestIdHint: 'The Local Agent shows it next to the pairing code.',
      pairCodeLabel: '6-digit code',
      pairSubmit: 'Pair',
      pairSubmitting: 'Pairing…',
      pairSuccess: 'Local Agent paired successfully.',
      pairError: 'The pairing could not be completed.',
      optimizeButton: 'Optimize cover (3 sizes)',
      optimizeWorking: 'Sending to FileStudio…',
      optimizeNoCover: 'Generate or upload a cover image first.',
      optimizeSuccess: 'Optimization sent. The derivatives will appear here when done.',
      consentTitle: 'Confirm local processing',
      consentDescription:
        'FileStudio will process this file on your paired device. We declare the operation and the mode before sending anything.',
      consentOperationLabel: 'Operation',
      consentModeLabel: 'Mode',
      consentFileLabel: 'File',
      consentFileCover: 'Project cover',
      consentConfirm: 'Authorize and send',
      consentReject: 'Reject',
      derivativesTitle: 'Generated derivatives',
      derivativesEmpty: 'No derivatives yet. Run the optimization to generate the 3 sizes.',
      derivativeView: 'View',
      operationResizeLabel: 'Resize image to 1600 / 800 / 400 px',
      jobStatus: {
        queued: 'Queued',
        processing: 'Processing',
        completed: 'Completed',
        failed: 'Failed',
        cancelled: 'Cancelled',
        expired: 'Expired',
      },
      errors: {
        unavailable: 'Conversion is not available right now. Please try again later.',
        limitConcurrent: 'You already have 3 jobs in progress. Wait for one to finish.',
        limitDaily: 'You have reached your daily conversion job limit.',
        noCover: 'Generate or upload a cover image first.',
        notFound: 'We could not find this project.',
        pairingCodeInvalid: 'Incorrect code. Check the code shown by the Local Agent.',
        pairingExpired: 'The code has expired. Generate a new one in the Local Agent.',
        deviceRevoked: 'This device has been unlinked. Pair it again to process locally.',
        repairRequired: 'The Local Agent needs to reconnect.',
        operationUnavailable: 'This operation is not available in that mode; we moved it to another processor.',
        uploadTooLarge: 'The file exceeds the maximum size for this processing mode.',
        integrityFailed: 'The result did not pass the integrity check. We are retrying.',
        consentRejected: 'Local processing was rejected on your device. You can retry or choose another mode.',
        agentOffline: 'Your device is offline. The job will wait, or you can process it in the private cloud.',
      },
    },
    launchPack: {
      title: 'Launch pack',
      description:
        'Generates every product format in one operation and records its provenance. If you edit the document afterwards, we flag the outdated assets.',
      generateButton: 'Generate launch pack',
      regenerateButton: 'Regenerate pack',
      generating: 'Generating pack…',
      empty: 'No pack generated yet. Run the generation to create every coordinated format.',
      versionLabel: 'Version {version}',
      staleBadge: 'Outdated',
      pendingBadge: 'In progress',
      viewAsset: 'Open',
      provenanceCompositor: 'Compositor',
      provenanceService: 'FileStudio · cloud',
      provenanceLocal: 'FileStudio · your device',
      kinds: {
        epub: 'EPUB',
        pdf: 'PDF',
        html: 'HTML',
        markdown: 'Markdown (blog)',
        slides: 'Slides',
        image: 'Image',
        mobi: 'MOBI',
        azw3: 'AZW3',
        audio: 'Audio',
        video: 'Video',
      },
      errors: {
        unavailable: 'The pack could not be generated right now. Please try again later.',
        notFound: 'We could not find this project.',
      },
    },
    publishChannels: {
      title: 'Publish to sales channels',
      description:
        'Generates the product sheet and landing copy from the book itself, creates the draft on Gumroad, or downloads the package ready for manual upload to Hotmart.',
      kitTitle: 'Product sheet & landing copy',
      generateKitButton: 'Generate sheet & copy',
      generatingKit: 'Generating…',
      sheetTab: 'Product sheet',
      landingTab: 'Landing copy',
      copyButton: 'Copy',
      copiedBadge: 'Copied',
      draftDescriptionBadge: 'Draft derived from the first chapter — review before publishing',
      assetsLabel: 'Pack files to upload',
      disclosureLabel: 'AI content declaration',
      gumroadTitle: 'Gumroad',
      gumroadDescription:
        'Creates the product as a draft in your Gumroad account (the API forces draft state; you publish it from their dashboard).',
      gumroadDisabled: 'Channel not enabled on this deployment (GUMROAD_ENABLED).',
      tokenLabel: 'Gumroad access token',
      tokenPlaceholder: 'Paste your access token…',
      saveTokenButton: 'Connect Gumroad',
      savingToken: 'Verifying token…',
      removeTokenButton: 'Disconnect',
      connectedBadge: 'Connected',
      priceLabel: 'Price (cents)',
      pricePlaceholder: '900',
      pushButton: 'Create draft on Gumroad',
      pushing: 'Creating draft…',
      pushSuccessLabel: 'Draft created on Gumroad',
      modeApiBadge: 'API · draft',
      hotmartTitle: 'Hotmart',
      hotmartDescription:
        'Hotmart has no public product-creation API: download the package with the sheet, the copy and the files ready for manual registration.',
      exportButton: 'Download Hotmart package',
      exporting: 'Preparing package…',
      instructionsTitle: 'Manual registration steps',
      modeExportBadge: 'Manual export',
      errors: {
        unavailable: 'The operation could not be completed right now. Please try again later.',
        notFound: 'We could not find this project.',
        notConfigured: 'The server has no credentials encryption key configured.',
        auth: 'The Gumroad token is invalid or was revoked.',
        validation: 'Gumroad rejected the product data. Review the sheet.',
        circuitOpen: 'Gumroad is not responding; we will retry in a few seconds.',
      },
    },
    collaboration: {
      title: 'Editorial collaboration',
      description:
        'Invite your proofreader and layout designer, comment on concrete blocks of the book, and decide which corrections enter the document.',
      openThreadsBadge: '{count} open threads',
      viewerRoleLabel: 'Your role',
      roleBadges: { author: 'Author', editor: 'Proofreader', designer: 'Layout designer' },
      teamTitle: 'Team with access',
      emptyTeam: 'No collaborators yet. Invite your proofreader or layout designer with a link.',
      revokeButton: 'Revoke access',
      inviteTitle: 'Invite collaborator',
      inviteDescription:
        'Generates an invitation link with a role. The invitee accepts it with their account (or registers for free with that email).',
      inviteEmailLabel: 'Invitee email',
      inviteEmailPlaceholder: 'proofreader@example.com',
      inviteRoleLabel: 'Role',
      inviteButton: 'Generate invitation',
      invitingButton: 'Generating…',
      inviteLinkLabel: 'Link to share (expires in 7 days)',
      copyButton: 'Copy',
      copiedBadge: 'Copied',
      noSeatTollNote:
        'Accepting an invitation never requires a plan or payment from the invitee: the product has no per-seat billing yet.',
      pendingInvitationsTitle: 'Pending invitations',
      invitationExpiresLabel: 'Expires on {date}',
      cancelInvitationButton: 'Cancel',
      commentsTitle: 'Comments per block',
      emptyComments: 'No comments yet. Any role can comment on a block of the book.',
      frontMatterChapter: 'Front matter',
      commentPlaceholder: 'Comment on this block…',
      commentButton: 'Comment',
      replyPlaceholder: 'Reply to the thread…',
      replyButton: 'Reply',
      resolveButton: 'Resolve thread',
      openBadge: 'Open',
      resolvedBadge: 'Resolved',
      resolvedByLabel: 'Resolved by {name}',
      suggestionsTitle: 'Proposed corrections',
      emptySuggestions: 'The proofreader has not proposed corrections yet.',
      proposeButton: 'Propose correction',
      proposeSummaryPlaceholder: 'Summary (e.g. “Typo in the second paragraph”)…',
      proposeTextPlaceholder: 'Corrected block text…',
      proposeSubmitButton: 'Send proposal',
      proposingButton: 'Sending…',
      suggestionStatusBadges: { pending: 'Pending', accepted: 'Accepted', rejected: 'Rejected' },
      decidedByLabel: 'Decided by {name}',
      acceptButton: 'Accept',
      rejectButton: 'Reject',
      invite: {
        title: 'Collaboration invitation',
        description: 'You have been invited to collaborate on an Anclora Talent project.',
        roleLabel: 'Assigned role',
        acceptButton: 'Accept invitation',
        acceptingButton: 'Accepting…',
        acceptedTitle: 'Invitation accepted',
        acceptedDescription: 'You are now part of the project team. No plans or payments: access is immediate.',
        goToDashboardButton: 'Go to dashboard',
      },
      errors: {
        unavailable: 'The operation could not be completed right now. Please try again later.',
        forbidden: 'Your role does not allow this action.',
        notFound: 'We could not find the project or the item.',
        invalid: 'Check the data: fields are missing or invalid.',
        invalidEmail: 'The invitation email is not valid.',
        invalidRole: 'The invitation role is not valid.',
        alreadyCollaborator: 'That email is already part of the project team.',
        expired: 'The invitation has expired. Ask the author for a new one.',
        emailMismatch: 'This invitation is for another email. Sign in with the invited account.',
        alreadyAccepted: 'This invitation was already accepted by another account.',
        stale: 'The document changed since the correction was proposed; the proposal no longer applies.',
      },
    },
    history: {
      title: 'Version history',
      description:
        'Every version stores a full copy of the document. Compare two versions to see what changed per chapter, or restore a previous one without losing history.',
      saveVersionButton: 'Save version',
      savingVersion: 'Saving version…',
      empty: 'No saved versions yet. They are created on chapter saves, reimports, or with “Save version”.',
      versionLabel: 'Version {version}',
      sourceManualSave: 'Saved',
      sourceReimport: 'Reimport',
      sourceRestore: 'Restore',
      compareFrom: 'From',
      compareTo: 'To',
      compareButton: 'Compare',
      comparing: 'Comparing…',
      selectVersions: 'Pick two different versions to compare.',
      diffEmpty: 'No changes between these versions.',
      diffSummary: '{added} added · {removed} removed · {changed} changed · {moved} moved',
      metadataChangedBadge: 'Metadata changed',
      changeAdded: 'Added',
      changeRemoved: 'Removed',
      changeChanged: 'Changed',
      changeMoved: 'Moved',
      unchaptered: 'No chapter',
      restoreButton: 'Restore',
      restoring: 'Restoring…',
      errors: {
        unavailable: 'The operation could not be completed. Please try again later.',
        notFound: 'We could not find this version.',
        unchanged: 'No changes since the last saved version.',
      },
    },
  },
};

export function resolveLocaleMessages(locale: UiLocale): AppMessages {
  return appMessages[locale];
}
