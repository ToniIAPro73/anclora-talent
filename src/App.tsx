/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, ChangeEvent } from 'react';
import { 
  LayoutDashboard, 
  UploadCloud, 
  BookOpen, 
  Image as ImageIcon, 
  Palette, 
  Eye, 
  Download, 
  MessageSquare, 
  Settings, 
  HelpCircle, 
  Plus, 
  Search, 
  Save, 
  Share2, 
  ChevronRight, 
  ChevronLeft, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Languages, 
  Moon, 
  Sun,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Type,
  Maximize2,
  Trash2,
  Bold,
  Italic,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Layers,
  Undo,
  Redo,
  Zap,
  ZoomIn,
  ZoomOut,
  Quote,
  Code,
  FileText,
  Printer,
  Bookmark,
  BookmarkPlus,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
type Screen = 'dashboard' | 'upload' | 'editor' | 'preview' | 'cover' | 'strategy';
type Language = 'es' | 'en';
type Theme = 'light' | 'dark';

interface BlockStyles {
  blockquote: {
    borderColor: string;
    backgroundColor: string;
    borderWidth: number;
  };
  codeBlock: {
    backgroundColor: string;
    textColor: string;
    padding: number;
  };
  pullQuote: {
    accentColor: string;
    fontSize: number;
    borderTop: boolean;
    borderBottom: boolean;
  };
}

interface CustomFont {
  name: string;
  url: string;
}

// --- Components ---

const Sidebar = ({ currentScreen, setScreen }: { currentScreen: Screen, setScreen: (s: Screen) => void }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', labelEn: 'Dashboard' },
    { id: 'upload', icon: UploadCloud, label: 'Subir Proyecto', labelEn: 'Upload Project' },
    { id: 'editor', icon: BookOpen, label: 'Editor de Texto', labelEn: 'Text Editor' },
    { id: 'cover', icon: Palette, label: 'Diseño de Portada', labelEn: 'Cover Design' },
    { id: 'preview', icon: Eye, label: 'Previsualización', labelEn: 'Preview' },
    { id: 'strategy', icon: Sparkles, iconColor: 'text-primary', label: 'Estrategia UX', labelEn: 'UX Strategy' },
  ];

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 z-40 bg-surface-container-low flex flex-col py-8 px-4 border-r border-outline-variant/10">
      <div className="mb-10 px-2">
        <h1 className="text-xl font-headline font-extrabold bg-gradient-to-br from-primary to-primary-container bg-clip-text text-transparent">
          The Digital Atelier
        </h1>
        <p className="text-[10px] font-headline font-medium opacity-50 tracking-widest mt-1 uppercase">V0.1.2</p>
      </div>
      
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setScreen(item.id as Screen)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
              currentScreen === item.id 
                ? 'bg-white/50 text-primary font-bold border-r-4 border-primary' 
                : 'text-on-surface-variant opacity-70 hover:bg-surface-container-high hover:opacity-100'
            }`}
          >
            <item.icon className={`w-5 h-5 ${item.iconColor || ''}`} />
            <span className="font-headline text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto px-2">
        <button className="w-full kinetic-gradient text-white py-4 rounded-xl font-headline font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95">
          <Plus className="w-5 h-5" />
          Nuevo Proyecto
        </button>
      </div>
    </aside>
  );
};

const TopBar = ({ language, setLanguage, theme, setTheme }: { language: Language, setLanguage: (l: Language) => void, theme: Theme, setTheme: (t: Theme) => void }) => {
  return (
    <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 z-30 bg-surface-container-low/80 backdrop-blur-md flex items-center justify-between px-8 border-b border-outline-variant/10">
      <div className="flex items-center gap-8">
        <span className="text-lg font-headline font-black text-on-surface tracking-tight">The Kinetic Manuscript</span>
        <nav className="hidden md:flex gap-6">
          <button className="text-on-surface-variant font-headline font-semibold text-sm hover:text-primary transition-colors">Borradores</button>
          <button className="text-on-surface-variant font-headline font-semibold text-sm hover:text-primary transition-colors">Recursos</button>
          <button className="text-on-surface-variant font-headline font-semibold text-sm hover:text-primary transition-colors">Historial</button>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center bg-surface-container-high/50 px-3 py-1.5 rounded-full border border-outline-variant/15">
          <Search className="w-4 h-4 text-on-surface-variant opacity-50" />
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="bg-transparent border-none focus:ring-0 text-sm w-40 font-sans ml-2"
          />
        </div>
        
        <button 
          onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
          className="p-2 text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
        >
          <Languages className="w-5 h-5" />
          <span className="text-xs font-bold uppercase">{language}</span>
        </button>

        <button 
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="p-2 text-on-surface-variant hover:text-primary transition-colors"
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        <div className="h-8 w-px bg-outline-variant/30 mx-2"></div>
        
        <button className="px-5 py-2 rounded-full bg-primary text-white font-headline font-bold text-sm hover:opacity-90 transition-all">
          Exportar E-book
        </button>
      </div>
    </header>
  );
};

const AIAgentPanel = () => {
  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-80 glass-panel rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-4 kinetic-gradient text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <span className="font-headline font-bold text-sm">Agente de IA Experto</span>
          </div>
          <Settings className="w-4 h-4 opacity-70 cursor-pointer" />
        </div>
        <div className="h-64 p-4 overflow-y-auto space-y-4 bg-white/50">
          <div className="bg-primary/10 p-3 rounded-2xl rounded-tl-none text-xs text-on-surface leading-relaxed">
            ¡Hola! Soy tu consultor editorial. ¿En qué puedo ayudarte hoy? Puedo sugerir tipografías, mejorar la composición o refinar tu contenido.
          </div>
          <div className="bg-surface-container-high p-3 rounded-2xl rounded-tr-none text-xs text-on-surface self-end ml-8">
            ¿Qué estilo tipográfico recomiendas para un libro de negocios moderno?
          </div>
          <div className="bg-primary/10 p-3 rounded-2xl rounded-tl-none text-xs text-on-surface leading-relaxed">
            Para negocios, recomiendo una combinación de **Plus Jakarta Sans** para títulos (transmite confianza y modernidad) e **Inter** para el cuerpo (máxima legibilidad).
          </div>
        </div>
        <div className="p-3 bg-surface-container-low border-t border-outline-variant/10 flex gap-2">
          <input 
            type="text" 
            placeholder="Pregunta al experto..." 
            className="flex-1 bg-white border-none rounded-xl text-xs px-3 py-2 focus:ring-1 focus:ring-primary"
          />
          <button className="p-2 bg-primary text-white rounded-xl">
            <Zap className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
      <button className="w-14 h-14 kinetic-gradient text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform">
        <MessageSquare className="w-6 h-6" />
      </button>
    </div>
  );
};

// --- Screens ---

const Dashboard = () => {
  const projects = [
    { title: 'Cybernetic Soul', status: 'READY', date: 'Hace 2h', img: 'https://picsum.photos/seed/cyber/400/300' },
    { title: 'Lost in the Glitch', status: 'IN REVIEW', date: 'Ayer', img: 'https://picsum.photos/seed/glitch/400/300' },
    { title: 'Minimalist Echoes', status: 'DRAFT', date: 'Hace 3 días', img: 'https://picsum.photos/seed/minimal/400/300' },
  ];

  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight mb-2">Bienvenido, Curador.</h2>
        <p className="text-on-surface-variant max-w-2xl font-sans leading-relaxed">Tu último manuscrito "The Neon Horizon" está al 85% de formato. Continúa donde lo dejaste o inicia un nuevo viaje creativo.</p>
      </section>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 bg-white rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between min-h-[320px] group cursor-pointer border border-outline-variant/10 hover:shadow-xl transition-all">
          <div className="relative z-10">
            <div className="bg-secondary-container text-on-secondary-container w-fit px-4 py-1.5 rounded-full text-xs font-bold font-headline mb-6 tracking-wide uppercase">Sesión Activa</div>
            <h3 className="text-3xl font-headline font-bold text-on-surface mb-4">Continuar: The Neon Horizon</h3>
            <div className="flex items-center gap-4 mb-8">
              <div className="flex -space-x-2">
                {[1,2].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-primary-container flex items-center justify-center text-[10px] font-bold">U{i}</div>
                ))}
              </div>
              <span className="text-sm font-sans text-on-surface-variant">+3 miembros editando</span>
            </div>
          </div>
          <div className="flex gap-4 relative z-10">
            <button className="px-6 py-3 bg-primary text-white rounded-xl font-headline font-bold flex items-center gap-2 hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" /> Reanudar Edición
            </button>
            <button className="px-6 py-3 bg-surface-container-high text-primary rounded-xl font-headline font-bold flex items-center gap-2">
              <Undo className="w-5 h-5" /> Ver Versiones
            </button>
          </div>
          <div className="absolute right-10 bottom-10 opacity-10 group-hover:opacity-20 transition-opacity">
            <BookOpen className="w-48 h-48 text-primary" />
          </div>
        </div>

        <div className="col-span-4 space-y-6">
          <div className="bg-secondary/5 rounded-3xl p-6 flex flex-col items-center justify-center text-center group cursor-pointer border border-secondary/10 hover:bg-secondary/10 transition-all h-1/2">
            <div className="w-16 h-16 rounded-2xl bg-secondary-container flex items-center justify-center text-on-secondary-container mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>
            <span className="font-headline font-bold text-on-surface">Subir Nuevo Archivo</span>
            <span className="text-xs text-on-surface-variant mt-1">DOCX, EPUB, PDF, MD</span>
          </div>
          <div className="bg-tertiary-container/10 rounded-3xl p-6 flex flex-col group cursor-pointer border border-tertiary-container/20 hover:bg-tertiary-container/20 transition-all h-1/2">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-tertiary-container flex items-center justify-center text-on-tertiary-container">
                <Palette className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-on-surface-variant opacity-40 group-hover:translate-x-1 transition-transform" />
            </div>
            <h4 className="font-headline font-bold text-on-surface text-lg">Estilos Globales</h4>
            <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">Modifica escalas tipográficas y temas de color.</p>
          </div>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-headline font-bold text-on-surface">Proyectos Recientes</h3>
          <button className="text-primary font-headline font-bold text-sm hover:underline flex items-center gap-1">
            Ver todos <Share2 className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-6">
          {projects.map((p, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden group hover:shadow-lg transition-all border border-outline-variant/10">
              <div className="h-40 relative overflow-hidden">
                <img src={p.img} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                  <span className="text-white font-headline font-bold">{p.title}</span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-on-surface-variant">{p.date}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    p.status === 'READY' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-on-surface-variant'
                  }`}>{p.status}</span>
                </div>
                <button className="w-full py-2 rounded-lg bg-surface-container-high text-primary font-bold text-xs hover:bg-primary hover:text-white transition-colors">Editar</button>
              </div>
            </div>
          ))}
          <div className="border-2 border-dashed border-outline-variant/30 rounded-2xl flex flex-col items-center justify-center p-8 group cursor-pointer hover:border-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <span className="font-headline font-bold text-on-surface-variant">Nuevo Manuscrito</span>
          </div>
        </div>
      </section>
    </div>
  );
};

const UXStrategy = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <header className="text-center">
        <h2 className="text-5xl font-headline font-black text-on-surface mb-4">Estrategia UX: The Digital Atelier</h2>
        <p className="text-xl text-on-surface-variant">Diseño de experiencia para herramientas de publicación digital premium.</p>
      </header>

      <section className="space-y-6">
        <h3 className="text-2xl font-headline font-bold text-primary flex items-center gap-2">
          <Sparkles className="w-6 h-6" /> 1. Mapa de Pantallas y Navegación
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-6 bg-white rounded-3xl border border-outline-variant/10">
            <h4 className="font-bold mb-2">Navegación Principal (Rail)</h4>
            <ul className="text-sm space-y-2 text-on-surface-variant">
              <li>• Dashboard (Vista general)</li>
              <li>• Upload (Ingesta inteligente)</li>
              <li>• Editor (Refinamiento editorial)</li>
              <li>• Cover Designer (Estudio visual)</li>
              <li>• Preview (Simulación multi-dispositivo)</li>
            </ul>
          </div>
          <div className="p-6 bg-white rounded-3xl border border-outline-variant/10">
            <h4 className="font-bold mb-2">Contextual (Top Bar)</h4>
            <ul className="text-sm space-y-2 text-on-surface-variant">
              <li>• Control de Versiones</li>
              <li>• Gestión de Activos (Imágenes/Fuentes)</li>
              <li>• Exportación Multi-formato (EPUB, PDF, MOBI)</li>
              <li>• Configuración de Colaboración</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h3 className="text-2xl font-headline font-bold text-primary flex items-center gap-2">
          <Zap className="w-6 h-6" /> 2. Flujo UX Ideal
        </h3>
        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-4">
          {['Carga', 'Análisis IA', 'Refinamiento', 'Diseño Visual', 'Preview', 'Export'].map((step, i) => (
            <div key={i} className="flex flex-col items-center gap-2 min-w-[120px]">
              <div className="w-12 h-12 rounded-full kinetic-gradient text-white flex items-center justify-center font-bold">{i+1}</div>
              <span className="text-xs font-bold uppercase tracking-wider">{step}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h3 className="text-2xl font-headline font-bold text-primary flex items-center gap-2">
          <Palette className="w-6 h-6" /> 3. Jerarquía Visual y Sistema de Diseño
        </h3>
        <div className="p-8 bg-surface-container-low rounded-[2rem] border border-outline-variant/20">
          <div className="grid grid-cols-3 gap-8">
            <div>
              <h4 className="text-xs font-bold uppercase mb-4 opacity-50">Tipografía</h4>
              <p className="text-2xl font-headline font-extrabold mb-1">Jakarta</p>
              <p className="text-sm opacity-70">Headlines & UI</p>
              <div className="mt-4">
                <p className="text-xl font-sans font-medium mb-1">Inter</p>
                <p className="text-sm opacity-70">Body & Metadata</p>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase mb-4 opacity-50">Colores</h4>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-primary"></div>
                <div className="w-8 h-8 rounded-full bg-secondary"></div>
                <div className="w-8 h-8 rounded-full bg-surface-container-highest"></div>
              </div>
              <p className="text-xs mt-4 leading-relaxed">Paleta "Atelier": Púrpuras profundos con acentos en teal eléctrico.</p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase mb-4 opacity-50">Elevación</h4>
              <p className="text-xs leading-relaxed">Uso de Glassmorphism (blur 12px) y sombras ambientales suaves para capas de edición.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <h3 className="text-2xl font-headline font-bold text-primary">4. Ejemplos de Uso</h3>
        
        <div className="space-y-6">
          <div className="p-8 bg-white rounded-3xl border border-outline-variant/10 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase">Ejemplo 1</div>
              <h4 className="text-xl font-bold">Mejora de DOCX</h4>
            </div>
            <div className="grid grid-cols-3 gap-6 text-sm">
              <div className="space-y-2">
                <p className="font-bold text-primary">Usuario ve:</p>
                <p className="text-on-surface-variant">Un editor de texto limpio con el contenido importado y una barra lateral de "Sugerencias de Estilo".</p>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-primary">Acciones:</p>
                <p className="text-on-surface-variant">Aplica un "Preset Editorial" y usa el generador de portadas para crear una imagen basada en el título.</p>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-primary">IA sugiere:</p>
                <p className="text-on-surface-variant">"He detectado que tu tono es académico; recomiendo una fuente Serif para el cuerpo y márgenes amplios."</p>
              </div>
            </div>
          </div>

          <div className="p-8 bg-white rounded-3xl border border-outline-variant/10 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-[10px] font-bold uppercase">Ejemplo 2</div>
              <h4 className="text-xl font-bold">Enriquecimiento de PDF</h4>
            </div>
            <div className="grid grid-cols-3 gap-6 text-sm">
              <div className="space-y-2">
                <p className="font-bold text-secondary">Usuario ve:</p>
                <p className="text-on-surface-variant">El PDF desglosado en bloques editables. Herramientas de extracción de imágenes activas.</p>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-secondary">Acciones:</p>
                <p className="text-on-surface-variant">Reorganiza capítulos mediante drag-and-drop y añade citas destacadas (pull-quotes) automáticas.</p>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-secondary">IA sugiere:</p>
                <p className="text-on-surface-variant">"He extraído 5 conceptos clave. ¿Quieres que genere ilustraciones abstractas para cada inicio de capítulo?"</p>
              </div>
            </div>
          </div>

          <div className="p-8 bg-white rounded-3xl border border-outline-variant/10 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1 bg-tertiary/10 text-tertiary rounded-full text-[10px] font-bold uppercase">Ejemplo 3</div>
              <h4 className="text-xl font-bold">Consulta Estratégica</h4>
            </div>
            <div className="grid grid-cols-3 gap-6 text-sm">
              <div className="space-y-2">
                <p className="font-bold text-tertiary">Usuario ve:</p>
                <p className="text-on-surface-variant">Panel de chat con el Agente IA abierto mientras previsualiza el libro en modo "Tablet".</p>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-tertiary">Acciones:</p>
                <p className="text-on-surface-variant">Pregunta: "¿Qué estilo editorial conviene para un eBook de negocios de alta gama?"</p>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-tertiary">IA sugiere:</p>
                <p className="text-on-surface-variant">"Recomiendo un diseño suizo: tipografía sans-serif geométrica, mucho aire y una paleta monocromática con un solo acento."</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const Editor = ({ 
  customFonts, 
  onUploadFont, 
  selectedFont, 
  setSelectedFont,
  fontWeight,
  setFontWeight,
  fontStyle,
  setFontStyle,
  fontSize,
  setFontSize,
  lineHeight,
  setLineHeight,
  paragraphSpacing,
  setParagraphSpacing,
  blockStyles,
  setBlockStyles
}: { 
  customFonts: CustomFont[], 
  onUploadFont: (font: CustomFont) => void,
  selectedFont: string, 
  setSelectedFont: (font: string) => void,
  fontWeight: string,
  setFontWeight: (w: string) => void,
  fontStyle: string,
  setFontStyle: (s: string) => void,
  fontSize: number,
  setFontSize: (s: number) => void,
  lineHeight: number,
  setLineHeight: (l: number) => void,
  paragraphSpacing: number,
  setParagraphSpacing: (s: number) => void,
  blockStyles: BlockStyles,
  setBlockStyles: (s: BlockStyles) => void
}) => {
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const fontUrl = event.target?.result as string;
        const fontName = file.name.split('.')[0];
        onUploadFont({ name: fontName, url: fontUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-full flex">
      <div className="w-80 h-full bg-surface-container-low p-6 flex flex-col gap-8 border-r border-outline-variant/10 overflow-y-auto hide-scrollbar">
        <div>
          <h2 className="text-primary font-headline font-bold text-lg mb-6">Tipografía</h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Fuente Principal</label>
              <div className="relative group">
                <select 
                  value={selectedFont}
                  onChange={(e) => setSelectedFont(e.target.value)}
                  className="w-full bg-white border-none rounded-xl py-3 px-4 text-sm appearance-none focus:ring-2 focus:ring-primary/20 font-medium cursor-pointer"
                >
                  <optgroup label="Predeterminadas">
                    <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                    <option value="Inter">Inter</option>
                    <option value="Lora">Lora (Serif)</option>
                    <option value="Playfair Display">Playfair Display</option>
                  </optgroup>
                  {customFonts.length > 0 && (
                    <optgroup label="Personalizadas">
                      {customFonts.map((font) => (
                        <option key={font.name} value={font.name}>{font.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <ChevronRight className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none opacity-40" />
              </div>
            </div>

            <div className="pt-2 space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">Peso de Fuente</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => setFontWeight('normal')}
                  className={`flex-1 py-2 rounded-xl border font-headline font-bold text-xs transition-all ${
                    fontWeight === 'normal' 
                      ? 'bg-primary text-white border-primary shadow-md' 
                      : 'bg-white text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'
                  }`}
                >
                  Regular
                </button>
                <button 
                  onClick={() => setFontWeight('bold')}
                  className={`flex-1 py-2 rounded-xl border font-headline font-bold text-xs transition-all ${
                    fontWeight === 'bold' 
                      ? 'bg-primary text-white border-primary shadow-md' 
                      : 'bg-white text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'
                  }`}
                >
                  Bold
                </button>
              </div>
            </div>

            <div className="pt-2 space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">Estilo de Fuente</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => setFontStyle('normal')}
                  className={`flex-1 py-2 rounded-xl border font-headline font-bold text-xs transition-all ${
                    fontStyle === 'normal' 
                      ? 'bg-primary text-white border-primary shadow-md' 
                      : 'bg-white text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'
                  }`}
                >
                  Normal
                </button>
                <button 
                  onClick={() => setFontStyle('italic')}
                  className={`flex-1 py-2 rounded-xl border font-headline font-bold text-xs italic transition-all ${
                    fontStyle === 'italic' 
                      ? 'bg-primary text-white border-primary shadow-md' 
                      : 'bg-white text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'
                  }`}
                >
                  Italic
                </button>
              </div>
            </div>

            <div className="pt-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-3 block">Subir Fuente (.ttf, .otf, .woff)</label>
              <label className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-primary/5 border-2 border-dashed border-primary/20 rounded-xl cursor-pointer hover:bg-primary/10 hover:border-primary/40 transition-all group">
                <UploadCloud className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-primary">Añadir Fuente</span>
                <input type="file" accept=".ttf,.otf,.woff,.woff2" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Tamaño Base</label>
                <span className="text-xs font-bold text-primary">{fontSize}px</span>
              </div>
              <input 
                type="range" 
                min="12"
                max="24"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full accent-primary" 
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-outline-variant/10">
          <h2 className="text-primary font-headline font-bold text-lg mb-6">Estructura</h2>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                  <Type className="w-3 h-3 text-on-surface-variant opacity-50" />
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Interlineado</label>
                </div>
                <span className="text-xs font-bold text-primary">{lineHeight}</span>
              </div>
              <input 
                type="range" 
                min="1"
                max="2.5"
                step="0.1"
                value={lineHeight}
                onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary" 
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                  <Layers className="w-3 h-3 text-on-surface-variant opacity-50" />
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Espacio Párrafos</label>
                </div>
                <span className="text-xs font-bold text-primary">{paragraphSpacing}rem</span>
              </div>
              <input 
                type="range" 
                min="0"
                max="4"
                step="0.5"
                value={paragraphSpacing}
                onChange={(e) => setParagraphSpacing(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary" 
              />
            </div>

            <div className="pt-4 space-y-4">
              {['Párrafos Justificados', 'Sangría Inteligente', 'Capitulares'].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item}</span>
                  <div className={`w-10 h-5 rounded-full relative flex items-center px-1 ${i % 2 === 0 ? 'bg-primary' : 'bg-surface-container-high'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full ${i % 2 === 0 ? 'ml-auto' : ''}`}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-outline-variant/10">
          <h2 className="text-primary font-headline font-bold text-lg mb-6">Estilos de Bloque</h2>
          <div className="space-y-8">
            {/* Blockquote */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Quote className="w-4 h-4 text-primary" />
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Cita (Blockquote)</label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[9px] opacity-50 font-bold uppercase">Borde</span>
                  <input 
                    type="color" 
                    value={blockStyles.blockquote.borderColor}
                    onChange={(e) => setBlockStyles({...blockStyles, blockquote: {...blockStyles.blockquote, borderColor: e.target.value}})}
                    className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] opacity-50 font-bold uppercase">Fondo</span>
                  <input 
                    type="color" 
                    value={blockStyles.blockquote.backgroundColor}
                    onChange={(e) => setBlockStyles({...blockStyles, blockquote: {...blockStyles.blockquote, backgroundColor: e.target.value}})}
                    className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-none"
                  />
                </div>
              </div>
            </div>

            {/* Code Block */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-primary" />
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Bloque de Código</label>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] opacity-50 font-bold uppercase">Color de Fondo</span>
                <input 
                  type="color" 
                  value={blockStyles.codeBlock.backgroundColor}
                  onChange={(e) => setBlockStyles({...blockStyles, codeBlock: {...blockStyles.codeBlock, backgroundColor: e.target.value}})}
                  className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-none"
                />
              </div>
            </div>

            {/* Pull Quote */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Cita Destacada (Pull Quote)</label>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-[9px] opacity-50 font-bold uppercase">Tamaño</span>
                  <span className="text-xs font-bold text-primary">{blockStyles.pullQuote.fontSize}px</span>
                </div>
                <input 
                  type="range" 
                  min="20"
                  max="48"
                  value={blockStyles.pullQuote.fontSize}
                  onChange={(e) => setBlockStyles({...blockStyles, pullQuote: {...blockStyles.pullQuote, fontSize: parseInt(e.target.value)}})}
                  className="w-full h-1.5 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary" 
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Bordes Horizontales</span>
                <button 
                  onClick={() => setBlockStyles({...blockStyles, pullQuote: {...blockStyles.pullQuote, borderTop: !blockStyles.pullQuote.borderTop, borderBottom: !blockStyles.pullQuote.borderBottom}})}
                  className={`w-10 h-5 rounded-full relative flex items-center px-1 transition-colors ${blockStyles.pullQuote.borderTop ? 'bg-primary' : 'bg-surface-container-high'}`}
                >
                  <div className={`w-3 h-3 bg-white rounded-full transition-all ${blockStyles.pullQuote.borderTop ? 'ml-auto' : ''}`}></div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto">
          <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-4 block">Presets Visuales</label>
          <div className="grid grid-cols-2 gap-3">
            <div className="aspect-square bg-secondary rounded-xl p-3 flex flex-col justify-end cursor-pointer hover:scale-105 transition-transform">
              <span className="text-[10px] text-white font-bold">Midnight Ocean</span>
            </div>
            <div className="aspect-square bg-tertiary rounded-xl p-3 flex flex-col justify-end cursor-pointer hover:scale-105 transition-transform">
              <span className="text-[10px] text-white font-bold">Ruby Classic</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-surface-container p-12 overflow-y-auto flex justify-center custom-scrollbar">
        <div className="w-full max-w-2xl bg-white shadow-2xl rounded-xl min-h-[1000px] p-16 relative">
          <div className="absolute top-8 left-1/2 -translate-x-1/2 glass-panel px-6 py-3 rounded-full flex items-center gap-6 shadow-xl ring-1 ring-primary/10">
            <Bold className="w-4 h-4 text-primary cursor-pointer" />
            <Italic className="w-4 h-4 text-on-surface-variant cursor-pointer" />
            <div className="w-px h-6 bg-outline-variant/30"></div>
            <AlignLeft className="w-4 h-4 text-primary cursor-pointer" />
            <AlignCenter className="w-4 h-4 text-on-surface-variant cursor-pointer" />
            <div className="w-px h-6 bg-outline-variant/30"></div>
            <Trash2 className="w-4 h-4 text-tertiary cursor-pointer" />
          </div>

          <article 
            className="prose prose-purple max-w-none pt-12" 
            style={{ 
              fontFamily: selectedFont,
              fontWeight: fontWeight,
              fontStyle: fontStyle,
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight,
            }}
          >
            <style>{`
              .prose p {
                margin-top: 0;
                margin-bottom: ${paragraphSpacing}rem;
                line-height: ${lineHeight};
              }
              .prose blockquote {
                border-left: ${blockStyles.blockquote.borderWidth}px solid ${blockStyles.blockquote.borderColor};
                background-color: ${blockStyles.blockquote.backgroundColor};
                padding: 1.5rem 2rem;
                margin: 2rem 0;
                border-radius: 0 1rem 1rem 0;
                font-style: italic;
                color: ${blockStyles.blockquote.borderColor};
              }
              .prose pre {
                background-color: ${blockStyles.codeBlock.backgroundColor};
                color: ${blockStyles.codeBlock.textColor};
                padding: ${blockStyles.codeBlock.padding}px;
                border-radius: 1rem;
                font-family: 'JetBrains Mono', monospace;
                font-size: 0.9em;
                overflow-x: auto;
                margin: 2rem 0;
              }
              .prose .pull-quote {
                font-size: ${blockStyles.pullQuote.fontSize}px;
                color: ${blockStyles.pullQuote.accentColor};
                text-align: center;
                font-weight: 800;
                padding: 2rem 0;
                margin: 3rem 0;
                border-top: ${blockStyles.pullQuote.borderTop ? `2px solid ${blockStyles.pullQuote.accentColor}20` : 'none'};
                border-bottom: ${blockStyles.pullQuote.borderBottom ? `2px solid ${blockStyles.pullQuote.accentColor}20` : 'none'};
                line-height: 1.2;
              }
            `}</style>
            <header className="mb-12">
              <span className="text-primary font-bold uppercase tracking-widest text-[10px]">Capítulo Tres</span>
              <h1 className="text-5xl font-headline font-black text-on-surface mt-4 mb-2 leading-tight">La Resonancia de la Tinta Digital</h1>
              <p className="text-on-surface-variant font-medium italic">Una reflexión sobre la naturaleza fluida de la autoría moderna.</p>
            </header>
            <p className="text-lg leading-relaxed text-on-surface mb-8">
              <span className="float-left text-7xl font-headline font-black text-primary leading-[0.8] mr-4 mt-2">E</span>n los rincones tranquilos del atelier digital, donde el zumbido del procesador reemplaza el rascado de la pluma, una nueva forma de literatura está comenzando a respirar. No está ligada por la gravedad estática de la página física, sino que flota en un estado de potencial cinético.
            </p>
            <p className="text-lg leading-relaxed text-on-surface mb-8">
              El manuscrito del mañana no es un objeto terminado, sino un diálogo vivo entre el creador y el lienzo. Cada trazo de tipografía, cada ajuste del margen y cada elección de fuente actúa como una frecuencia armónica, vibrando a través de la pantalla para llegar al ojo del lector.
            </p>
            
            <blockquote>
              "La tipografía es la voz del texto. En el mundo digital, esa voz debe ser capaz de cantar en múltiples dimensiones."
            </blockquote>

            <p className="text-lg leading-relaxed text-on-surface mb-8">
              Consideremos el siguiente fragmento de lógica que define nuestra estructura:
            </p>

            <pre>
{`function renderManuscript(content) {
  return content.map(block => {
    return <KineticBlock type={block.type} data={block.data} />;
  });
}`}
            </pre>

            <div className="pull-quote">
              "El diseño no es lo que ves, es cómo haces sentir al lector."
            </div>

            <div className="my-12 rounded-2xl overflow-hidden aspect-video relative group cursor-pointer">
              <img src="https://picsum.photos/seed/ink/800/450" alt="Ink" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent flex items-end p-8">
                <p className="text-white font-bold text-xs tracking-wide">FIGURA 1.2: LA INTERSECCIÓN DE LUZ Y LÓGICA</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
};

const Preview = ({ 
  selectedFont, 
  fontWeight, 
  fontStyle,
  fontSize,
  lineHeight,
  paragraphSpacing,
  blockStyles
}: { 
  selectedFont: string, 
  fontWeight: string, 
  fontStyle: string,
  fontSize: number,
  lineHeight: number,
  paragraphSpacing: number,
  blockStyles: BlockStyles
}) => {
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('tablet');
  const [format, setFormat] = useState<'EPUB' | 'PDF' | 'Print'>('EPUB');
  const [zoom, setZoom] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(42);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const totalPages = 312;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));

  const toggleBookmark = () => {
    setBookmarks(prev => 
      prev.includes(currentPage) 
        ? prev.filter(p => p !== currentPage) 
        : [...prev, currentPage].sort((a, b) => a - b)
    );
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* Bookmarks Panel */}
      <AnimatePresence>
        {showBookmarks && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="absolute left-0 top-0 bottom-0 w-72 bg-surface-container-low border-r border-outline-variant/10 z-50 shadow-2xl p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-primary" />
                <h3 className="font-headline font-bold text-lg">Marcadores</h3>
              </div>
              <button 
                onClick={() => setShowBookmarks(false)}
                className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {bookmarks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center opacity-40">
                  <BookmarkPlus className="w-10 h-10 mb-2" />
                  <p className="text-xs font-medium">No hay marcadores aún</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {bookmarks.map(page => (
                    <button
                      key={page}
                      onClick={() => {
                        setCurrentPage(page);
                        setShowBookmarks(false);
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${
                        currentPage === page 
                          ? 'bg-primary text-white shadow-lg' 
                          : 'bg-surface-container-high hover:bg-primary/10 text-on-surface'
                      }`}
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Página</span>
                        <span className="text-lg font-black">{page}</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${currentPage === page ? 'text-white' : 'text-primary'}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <p className="mt-6 text-[10px] text-on-surface-variant opacity-50 italic">
              Haz clic en un marcador para saltar directamente a esa página.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="py-6 px-12 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setShowBookmarks(true)}
            className={`p-2.5 rounded-xl transition-all ${showBookmarks ? 'bg-primary text-white shadow-lg' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}`}
            title="Ver Marcadores"
          >
            <Bookmark className="w-5 h-5" />
          </button>

          <div className="flex bg-surface-container-low p-1 rounded-xl">
            {[
              { id: 'EPUB', icon: BookOpen, label: 'EPUB' },
              { id: 'PDF', icon: FileText, label: 'PDF' },
              { id: 'Print', icon: Printer, label: 'Impresión' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  format === f.id 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <f.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{f.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-surface-container-low p-1.5 rounded-full">
            <button 
              onClick={() => setDevice('mobile')}
              className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all ${device === 'mobile' ? 'bg-secondary text-white shadow-md' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              <Smartphone className="w-4 h-4" />
              <span className="text-sm font-semibold">Móvil</span>
            </button>
            <button 
              onClick={() => setDevice('tablet')}
              className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all ${device === 'tablet' ? 'bg-secondary text-white shadow-md' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              <Tablet className="w-4 h-4" />
              <span className="text-sm font-semibold">Tablet</span>
            </button>
            <button 
              onClick={() => setDevice('desktop')}
              className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all ${device === 'desktop' ? 'bg-secondary text-white shadow-md' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              <Monitor className="w-4 h-4" />
              <span className="text-sm font-semibold">E-reader</span>
            </button>
          </div>

          <div className="flex items-center gap-1 bg-surface-container-low p-1.5 rounded-full">
            <button 
              onClick={handleZoomOut}
              className="p-2 text-on-surface-variant hover:text-primary transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-bold w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button 
              onClick={handleZoomIn}
              className="p-2 text-on-surface-variant hover:text-primary transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-surface-container-low px-4 py-2 rounded-xl text-on-surface-variant">
            <span className="text-[10px] font-bold uppercase tracking-widest">Página</span>
            <span className="text-sm font-black text-primary ml-1">{currentPage}</span>
            <span className="text-[10px] opacity-50 mx-1">/</span>
            <span className="text-[10px] opacity-50 uppercase tracking-widest">{totalPages}</span>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={toggleBookmark}
              className={`p-2.5 rounded-xl transition-all ${
                bookmarks.includes(currentPage) 
                  ? 'bg-primary text-white shadow-lg' 
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-primary/10 hover:text-primary'
              }`}
              title={bookmarks.includes(currentPage) ? "Quitar Marcador" : "Marcar Página"}
            >
              <BookmarkPlus className={`w-5 h-5 ${bookmarks.includes(currentPage) ? 'fill-current' : ''}`} />
            </button>
            <div className="w-px h-10 bg-outline-variant/20 mx-1" />
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-headline font-bold text-sm transition-all ${
                currentPage === 1 
                  ? 'bg-surface-container-high text-on-surface-variant opacity-40 cursor-not-allowed' 
                  : 'bg-surface-container-high text-primary hover:bg-primary hover:text-white shadow-sm'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden md:inline">Página Anterior</span>
            </button>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-headline font-bold text-sm transition-all ${
                currentPage === totalPages 
                  ? 'bg-surface-container-high text-on-surface-variant opacity-40 cursor-not-allowed' 
                  : 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105'
              }`}
            >
              <span className="hidden md:inline">Página Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden bg-surface-container-high/20">
        <motion.div 
          layout
          animate={{ scale: zoom }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`bg-[#1a1625] rounded-[3rem] p-4 shadow-2xl ring-8 ring-white/10 ring-inset transition-all duration-500 origin-center ${
            device === 'mobile' ? 'w-80 aspect-[9/19]' : device === 'tablet' ? 'w-[600px] aspect-[3/4]' : 'w-[900px] aspect-[16/10]'
          } ${format === 'PDF' ? 'p-0 overflow-hidden' : 'p-4'}`}
        >
          <div 
            className={`w-full h-full rounded-[2rem] overflow-hidden p-12 flex flex-col shadow-inner relative ${
              format === 'PDF' ? 'bg-white text-black p-16' : 
              format === 'Print' ? 'bg-white border-2 border-dashed border-outline-variant/30 p-12' : 
              'bg-white'
            }`}
            style={{ 
              fontFamily: selectedFont,
              fontWeight: fontWeight,
              fontStyle: fontStyle,
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight
            }}
          >
            {format === 'PDF' && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-surface-container-high rounded text-[10px] font-mono text-on-surface-variant z-10">
                PDF / ISO 216 / A4 Simulation
              </div>
            )}
            <style>{`
              .preview-content p {
                margin-top: 0;
                margin-bottom: ${paragraphSpacing}rem;
                line-height: ${lineHeight};
              }
              .preview-content blockquote {
                border-left: ${blockStyles.blockquote.borderWidth}px solid ${blockStyles.blockquote.borderColor};
                background-color: ${blockStyles.blockquote.backgroundColor};
                padding: 1rem 1.5rem;
                margin: 1.5rem 0;
                border-radius: 0 0.75rem 0.75rem 0;
                font-style: italic;
                color: ${blockStyles.blockquote.borderColor};
                font-size: 0.9em;
              }
              .preview-content pre {
                background-color: ${blockStyles.codeBlock.backgroundColor};
                color: ${blockStyles.codeBlock.textColor};
                padding: ${blockStyles.codeBlock.padding / 2}px;
                border-radius: 0.75rem;
                font-family: 'JetBrains Mono', monospace;
                font-size: 0.8em;
                overflow-x: auto;
                margin: 1.5rem 0;
              }
              .preview-content .pull-quote {
                font-size: ${blockStyles.pullQuote.fontSize * 0.8}px;
                color: ${blockStyles.pullQuote.accentColor};
                text-align: center;
                font-weight: 800;
                padding: 1.5rem 0;
                margin: 2rem 0;
                border-top: ${blockStyles.pullQuote.borderTop ? `2px solid ${blockStyles.pullQuote.accentColor}20` : 'none'};
                border-bottom: ${blockStyles.pullQuote.borderBottom ? `2px solid ${blockStyles.pullQuote.accentColor}20` : 'none'};
                line-height: 1.2;
              }
            `}</style>
            <div className="flex-1 overflow-y-auto hide-scrollbar preview-content">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="font-headline text-3xl font-black text-on-surface mb-8 leading-tight">
                    {currentPage === 42 ? 'La Arquitectura del Silencio' : `Capítulo ${currentPage}: Nuevos Horizontes`}
                  </h2>
                  <p className="font-sans text-lg text-on-surface/80 leading-relaxed mb-6">
                    {currentPage === 42 
                      ? 'El atelier estaba tranquilo, pero no estaba vacío. El silencio aquí tenía una estructura, un peso físico que presionaba contra los lienzos apoyados en las paredes.'
                      : `Esta es la página ${currentPage} de tu manuscrito. El contenido fluye dinámicamente mientras navegas por el atelier digital, permitiéndote previsualizar la experiencia final del lector.`}
                  </p>
                  
                  <blockquote>
                    {currentPage === 42 
                      ? '"El silencio es el lienzo sobre el cual la creatividad pinta sus primeras sombras."'
                      : '"Cada página es un nuevo comienzo en el viaje del autor."'}
                  </blockquote>

                  <p className="font-sans text-lg text-on-surface/80 leading-relaxed mb-6">
                    {currentPage === 42
                      ? 'Julian buscó el carboncillo, sus dedos encontrando las ranuras familiares de la herramienta desgastada.'
                      : 'La transición suave entre páginas asegura una lectura inmersiva y sin distracciones.'}
                  </p>

                  <div className="pull-quote">
                    {currentPage === 42
                      ? '"La creación es un acto de valentía silenciosa."'
                      : `"Página ${currentPage}: Explorando el potencial del diseño cinético."`}
                  </div>

                  <img src={`https://picsum.photos/seed/art-${currentPage}/600/400`} alt="Art" className="w-full rounded-2xl mb-6" />
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="mt-8 pt-8 border-t border-outline-variant/10 flex justify-center">
              <span className="text-[10px] font-bold text-on-surface-variant tracking-[0.4em]">{currentPage}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [language, setLanguage] = useState<Language>('es');
  const [theme, setTheme] = useState<Theme>('light');
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
  const [selectedFont, setSelectedFont] = useState<string>('Plus Jakarta Sans');
  const [fontWeight, setFontWeight] = useState<string>('normal');
  const [fontStyle, setFontStyle] = useState<string>('normal');
  const [fontSize, setFontSize] = useState<number>(16);
  const [lineHeight, setLineHeight] = useState<number>(1.5);
  const [paragraphSpacing, setParagraphSpacing] = useState<number>(1.5);
  const [blockStyles, setBlockStyles] = useState<BlockStyles>({
    blockquote: {
      borderColor: '#6b46c1',
      backgroundColor: '#f8f5ff',
      borderWidth: 4
    },
    codeBlock: {
      backgroundColor: '#1a202c',
      textColor: '#e2e8f0',
      padding: 24
    },
    pullQuote: {
      accentColor: '#6b46c1',
      fontSize: 32,
      borderTop: true,
      borderBottom: true
    }
  });

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  const handleUploadFont = (font: CustomFont) => {
    setCustomFonts(prev => [...prev, font]);
    setSelectedFont(font.name);
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-inverse-surface' : 'bg-surface'}`}>
      {/* Dynamic Font Injection */}
      <style>{`
        ${customFonts.map(font => `
          @font-face {
            font-family: '${font.name}';
            src: url('${font.url}');
          }
        `).join('\n')}
      `}</style>

      <Sidebar currentScreen={screen} setScreen={setScreen} />
      <TopBar language={language} setLanguage={setLanguage} theme={theme} setTheme={setTheme} />
      
      <main className="ml-64 pt-16 h-screen overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
            className="h-full p-10 overflow-y-auto custom-scrollbar"
          >
            {screen === 'dashboard' && <Dashboard />}
            {screen === 'strategy' && <UXStrategy />}
            {screen === 'editor' && (
              <Editor 
                customFonts={customFonts} 
                onUploadFont={handleUploadFont} 
                selectedFont={selectedFont}
                setSelectedFont={setSelectedFont}
                fontWeight={fontWeight}
                setFontWeight={setFontWeight}
                fontStyle={fontStyle}
                setFontStyle={setFontStyle}
                fontSize={fontSize}
                setFontSize={setFontSize}
                lineHeight={lineHeight}
                setLineHeight={setLineHeight}
                paragraphSpacing={paragraphSpacing}
                setParagraphSpacing={setParagraphSpacing}
                blockStyles={blockStyles}
                setBlockStyles={setBlockStyles}
              />
            )}
            {screen === 'preview' && (
              <Preview 
                selectedFont={selectedFont} 
                fontWeight={fontWeight} 
                fontStyle={fontStyle}
                fontSize={fontSize}
                lineHeight={lineHeight}
                paragraphSpacing={paragraphSpacing}
                blockStyles={blockStyles}
              />
            )}
            {screen === 'upload' && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <UploadCloud className="w-16 h-16" />
                </div>
                <h2 className="text-3xl font-headline font-bold">Arrastra tu manuscrito aquí</h2>
                <p className="text-on-surface-variant max-w-md">Soportamos PDF, DOCX, TXT y MD. Nuestra IA analizará la estructura automáticamente.</p>
                <button className="px-8 py-4 kinetic-gradient text-white rounded-2xl font-bold shadow-xl">Seleccionar Archivo</button>
              </div>
            )}
            {screen === 'cover' && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                <div className="w-32 h-32 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                  <Palette className="w-16 h-16" />
                </div>
                <h2 className="text-3xl font-headline font-bold">Diseñador de Portadas</h2>
                <p className="text-on-surface-variant max-w-md">Crea portadas impactantes con nuestro editor visual o deja que la IA genere conceptos basados en tu historia.</p>
                <button className="px-8 py-4 bg-secondary text-white rounded-2xl font-bold shadow-xl">Abrir Estudio de Diseño</button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <AIAgentPanel />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #edd3ff;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3a264b;
        }
      `}</style>
    </div>
  );
}
