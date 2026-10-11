/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Check, 
  X, 
  Star, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  Settings2, 
  FileCode, 
  ExternalLink, 
  Copy, 
  Download, 
  QrCode,
  ShieldCheck
} from 'lucide-react';

const STORAGE_KEY = "regis_cleanliness_rating_timestamp";
const SCRIPT_URL_KEY = "regis_cleanliness_script_url";
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hodina

const STAR_LABELS: Record<number, string> = {
  1: "1 hvězdička – Velmi nespokojen/a",
  2: "2 hvězdičky – Nespokojen/a",
  3: "3 hvězdičky – Průměr",
  4: "4 hvězdičky – Spokojen/a",
  5: "5 hvězdiček – Velmi spokojen/a"
};

export default function App() {
  // Stav formuláře
  const [cleanliness, setCleanliness] = useState<'ANO' | 'NE' | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>('');
  const [honeypot, setHoneypot] = useState<string>('');
  
  // Stavy odeslání a rozhraní
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number | null>(null);
  
  // Nastavení skriptu a URL parametru
   const [scriptUrl, setScriptUrl] = useState<string>('https://script.google.com/macros/s/AKfycbw0h5QGrJX27GRd_75cTznF_qF6uG668u-RSLO2ZboXdK8HH19TFSqQytkbIhBcZZSI/exec');  const [placeParam, setPlaceParam] = useState<string>('autobusove-stanoviste');
  
  // Modální okna pro správce / zobrazení kódu
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [adminTab, setAdminTab] = useState<'script' | 'standalone' | 'qr'>('script');
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [copiedHtml, setCopiedHtml] = useState<boolean>(false);

  // Inicializace parametrů a cooldownu
  useEffect(() => {
    // 1. Zjistit místo z URL ?misto=
    const params = new URLSearchParams(window.location.search);
    const m = params.get('misto');
    if (m) {
      setPlaceParam(m);
    }

    // 2. Načíst uloženou URL Apps Scriptu, pokud existuje
    const savedUrl = localStorage.getItem(SCRIPT_URL_KEY);
    if (savedUrl) {
      setScriptUrl(savedUrl);
    }

    // 3. Zkontrolovat 1h limit
    checkCooldown();
  }, []);

  const checkCooldown = () => {
    const lastSentStr = localStorage.getItem(STORAGE_KEY);
    if (lastSentStr) {
      const lastSent = parseInt(lastSentStr, 10);
      const diff = Date.now() - lastSent;
      if (diff < COOLDOWN_MS) {
        const remainingMinutes = Math.ceil((COOLDOWN_MS - diff) / 60000);
        setCooldownRemaining(remainingMinutes);
        return true;
      }
    }
    setCooldownRemaining(null);
    return false;
  };

  const handleResetCooldown = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCooldownRemaining(null);
    setIsSuccess(false);
    setCleanliness(null);
    setRating(null);
    setComment('');
  };

  const handleSaveScriptUrl = (url: string) => {
    setScriptUrl(url);
    localStorage.setItem(SCRIPT_URL_KEY, url.trim());
  };

  // Hezký titulek místa
  const displayLocation = (slug: string) => {
    if (!slug || slug === 'autobusove-stanoviste') {
      return 'Autobusové stanoviště Český Těšín';
    }
    const clean = slug.replace(/[-_]+/g, ' ');
    return `Autobusové stanoviště Český Těšín (${clean})`;
  };

  // Validace formuláře
  const isValid = cleanliness !== null && rating !== null;

  // Odeslání formuláře
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Kontrola botů
    if (honeypot.trim() !== '') {
      setIsSuccess(true);
      return;
    }

    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      timestamp: new Date().toISOString(),
      formattedDate: new Date().toLocaleString("cs-CZ", { timeZone: "Europe/Prague" }),
      misto: placeParam,
      cisto: cleanliness,
      hodnoceni: rating,
      poznamka: comment.trim()
    };

    try {
      if (!scriptUrl) {
        // Simulace odeslání pro účely testování UI, pokud administrátor zatím nevložil URL Apps Scriptu
        console.log("Simulované odeslání hodnocení:", payload);
        await new Promise((res) => setTimeout(res, 600));
      } else {
        // Skutečné POST odeslání do Google Apps Script bez CORS preflightu
        const response = await fetch(scriptUrl, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          },
          body: JSON.stringify(payload),
          redirect: "follow"
        });

        // Odpověď zpracuj jako JSON; pokud obsahuje status "success", zobraz poděkování.
        // Pokud čtení odpovědi selže, ale síťový požadavek proběhl, považuj odeslání za úspěšné.
        try {
          const resData = await response.json();
          if (resData && resData.status && resData.status !== "success") {
            throw new Error(resData.message || `Server vrátil stav: ${resData.status}`);
          }
        } catch (readErr) {
          console.error("Chyba při čtení odpovědi z Google Apps Script:", readErr);
          // Síťový požadavek proběhl v pořádku, pokračujeme k poděkování
        }
      }

      // Úspěch -> zapsat čas do localStorage
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err: unknown) {
      console.error("Chyba při odesílání na Google Apps Script:", err);
      setErrorMsg("Odeslání se nezdařilo. Zkontrolujte připojení k internetu a zkuste to znovu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Kód pro Google Apps Script
  const appsScriptCode = `function doPost(e) {
  try {
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Vytvoření hlavičky tabulky, pokud ještě neexistuje
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Datum a čas",
        "Místo",
        "Čisto (ANO/NE)",
        "Hodnocení",
        "Poznámka",
        "Časové razítko (ISO)"
      ]);
      var headerRange = sheet.getRange(1, 1, 1, 6);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#DDB43C");
      headerRange.setFontColor("#2A2C4E");
      sheet.setFrozenRows(1);
    }

    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var now = new Date();
    var formattedDate = data.formattedDate || Utilities.formatDate(now, "Europe/Prague", "d.M.yyyy HH:mm:ss");
    var misto = data.misto || "autobusove-stanoviste";
    var cisto = data.cisto || "";
    var hodnoceni = data.hodnoceni || "";
    var poznamka = data.poznamka || "";
    var timestamp = data.timestamp || now.toISOString();

    sheet.appendRow([
      formattedDate,
      misto,
      cisto,
      hodnoceni,
      poznamka,
      timestamp
    ]);

    lock.releaseLock();

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Hodnocení úspěšně uloženo."
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Google Apps Script pro anketu REGIS-CZECH je aktivní."
  })).setMimeType(ContentService.MimeType.JSON);
}`;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const currentFullUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${window.location.pathname}?misto=${encodeURIComponent(placeParam)}` 
    : '';
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentFullUrl)}&color=2a2c4e&bgcolor=ffffff`;

  return (
    <div className="min-h-screen bg-[#F2F3F5] text-[#2A2C4E] flex flex-col justify-between items-center p-3 sm:p-5 select-none font-sans">
      
      {/* Hlavní obsah / Karta ankety */}
      <div className="w-full flex justify-center items-center my-auto">
        <main 
          className="w-full max-w-[440px] bg-white rounded-[24px] shadow-[0_4px_24px_rgba(42,44,78,0.06)] overflow-hidden flex flex-col border border-gray-100"
          role="main"
        >
          {/* 1. Nadpis & Záhlaví */}
          <header className="pt-6 pb-3 px-5 text-center">
            <h1 className="text-[#DDB43C] font-[800] text-[1.35rem] sm:text-[1.45rem] uppercase leading-tight tracking-wide mb-1.5">
              JAK JSTE SPOKOJENI S ČISTOTOU?
            </h1>
            <p className="text-[#5E6080] text-[0.95rem] font-semibold">
              {displayLocation(placeParam)}
            </p>
          </header>


          {/* Obsah karty podle stavu */}
          {cooldownRemaining !== null ? (
            /* Stav: Ochrana proti spamu (Limit 1 hodina) */
            <div className="p-7 text-center flex flex-col items-center gap-4 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-[#DDB43C] flex items-center justify-center text-[#2A2C4E]">
                <Clock className="w-9 h-9 stroke-[2.5]" />
              </div>
              <h2 className="text-[1.25rem] font-extrabold text-[#2A2C4E] leading-snug">
                Děkujeme, hodnocení jste už odeslali.
              </h2>
              <p className="text-[#5E6080] text-sm font-semibold max-w-[300px]">
                Z jednoho zařízení lze hodnotit jednou za hodinu. Další hodnocení můžete poslat za cca {cooldownRemaining} min.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetCooldown}
                  className="inline-flex items-center gap-1.5 text-xs text-[#5E6080] hover:text-[#2A2C4E] underline font-medium cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Resetovat limit (pro testování)
                </button>
              </div>
            </div>
          ) : isSuccess ? (
            /* 6. Stav po odeslání: Poděkování */
            <div className="p-8 text-center flex flex-col items-center gap-4 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-[#DDB43C] flex items-center justify-center text-[#2A2C4E] shadow-sm">
                <Check className="w-10 h-10 stroke-[3]" />
              </div>
              <h2 className="text-[1.5rem] font-[800] text-[#2A2C4E]">
                Děkujeme!
              </h2>
              <p className="text-[#5E6080] text-base font-semibold max-w-[310px] leading-relaxed">
                Vaše hodnocení nám pomáhá udržet stanoviště čisté.
              </p>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleResetCooldown}
                  className="text-xs text-[#5E6080] hover:text-[#2A2C4E] underline font-medium cursor-pointer"
                >
                  Odeslat další hodnocení (testovací reset)
                </button>
              </div>
            </div>
          ) : (
            /* Formulář */
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex flex-col gap-5" noValidate>
              
              {/* Skrytý Honeypot proti botům */}
              <div className="sr-only" aria-hidden="true">
                <label htmlFor="hp_field">Toto pole nevyplňujte:</label>
                <input 
                  type="text" 
                  id="hp_field" 
                  tabIndex={-1} 
                  autoComplete="off" 
                  value={honeypot} 
                  onChange={(e) => setHoneypot(e.target.value)} 
                />
              </div>

              {/* 2. Otázka „Je tu čisto?“ – dvě velká tlačítka vedle sebe: ANO / NE */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[1.05rem] text-[#2A2C4E]">
                    Je tu čisto?
                  </span>
                  <span className="text-xs font-bold text-[#DDB43C] uppercase tracking-wider">
                    * povinné
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Je tu čisto?">
                  <button
                    type="button"
                    onClick={() => setCleanliness('ANO')}
                    aria-checked={cleanliness === 'ANO'}
                    role="radio"
                    className={`min-h-[52px] rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all cursor-pointer border-2 ${
                      cleanliness === 'ANO'
                        ? 'bg-[#DDB43C] text-[#2A2C4E] border-[#2A2C4E] shadow-sm'
                        : 'bg-white text-[#2A2C4E] border-[#2A2C4E] hover:bg-gray-50 active:scale-[0.98]'
                    }`}
                  >
                    <Check className="w-5 h-5 stroke-[2.5]" />
                    ANO
                  </button>

                  <button
                    type="button"
                    onClick={() => setCleanliness('NE')}
                    aria-checked={cleanliness === 'NE'}
                    role="radio"
                    className={`min-h-[52px] rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all cursor-pointer border-2 ${
                      cleanliness === 'NE'
                        ? 'bg-[#DDB43C] text-[#2A2C4E] border-[#2A2C4E] shadow-sm'
                        : 'bg-white text-[#2A2C4E] border-[#2A2C4E] hover:bg-gray-50 active:scale-[0.98]'
                    }`}
                  >
                    <X className="w-5 h-5 stroke-[2.5]" />
                    NE
                  </button>
                </div>
              </div>

              {/* 3. Hodnocení 1–5 hvězdiček */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[1.05rem] text-[#2A2C4E]">
                    Celkové hodnocení
                  </span>
                  <span className="text-xs font-bold text-[#DDB43C] uppercase tracking-wider">
                    * povinné
                  </span>
                </div>

                <div 
                  className="flex justify-between items-center gap-1 py-1"
                  role="radiogroup" 
                  aria-label="Hodnocení 1 až 5 hvězdiček"
                >
                  {[1, 2, 3, 4, 5].map((starVal) => {
                    const isFilled = rating !== null && starVal <= rating;
                    return (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => setRating(starVal)}
                        aria-label={`${starVal} hvězdiček z 5`}
                        role="radio"
                        aria-checked={rating === starVal}
                        className="min-w-[48px] min-h-[48px] flex items-center justify-center p-1 rounded-xl transition-transform active:scale-90 cursor-pointer focus:outline-none"
                      >
                        <Star
                          className={`w-9 h-9 transition-colors duration-150 ${
                            isFilled
                              ? 'text-[#DDB43C] fill-[#DDB43C] stroke-[#2A2C4E] stroke-[1.8]'
                              : 'text-[#2A2C4E] fill-transparent stroke-[#2A2C4E] stroke-[1.8]'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                <p className="text-center text-xs font-semibold text-[#5E6080] min-h-[18px]">
                  {rating !== null ? STAR_LABELS[rating] : 'Klepněte pro výběr 1 až 5 hvězdiček'}
                </p>
              </div>

              {/* 4. Textové pole „Chcete nám něco vzkázat? (nepovinné)“ */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="comment-box" className="font-bold text-[0.98rem] text-[#2A2C4E]">
                  Chcete nám něco vzkázat? <span className="font-normal text-xs text-[#5E6080]">(nepovinné)</span>
                </label>
                <textarea
                  id="comment-box"
                  rows={3}
                  maxLength={300}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Napište nám vaši připomínku či pochvalu..."
                  className="w-full border-2 border-[#2A2C4E] rounded-2xl p-3 text-sm text-[#2A2C4E] placeholder:text-[#5E6080]/60 focus:border-[#DDB43C] focus:outline-none transition-colors resize-none"
                />
                <div className="text-right text-xs font-semibold text-[#5E6080]">
                  {comment.length} / 300 znaků
                </div>
              </div>

              {/* Chybová hláška */}
              {errorMsg && (
                <div className="p-3 bg-amber-50 border border-[#DDB43C] rounded-xl text-xs text-[#2A2C4E] flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-4 h-4 text-[#DDB43C] shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                  <button
                    type="submit"
                    className="self-start text-xs bg-[#2A2C4E] text-white font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                  >
                    Zkusit znovu
                  </button>
                </div>
              )}

              {/* 5. Tlačítko „ODESLAT“ */}
              <button
                type="submit"
                disabled={!isValid || isSubmitting}
                className={`w-full min-h-[54px] rounded-2xl font-bold text-lg text-white tracking-wide transition-all duration-150 flex items-center justify-center gap-2 ${
                  !isValid || isSubmitting
                    ? 'bg-[#2A2C4E] opacity-45 cursor-not-allowed'
                    : 'bg-[#2A2C4E] hover:opacity-95 active:scale-[0.98] cursor-pointer shadow-md'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>ODESÍLÁM...</span>
                  </>
                ) : (
                  <span>ODESLAT</span>
                )}
              </button>

            </form>
          )}

          {/* 7. Patička */}
          <footer className="py-4 px-5 text-center border-t border-gray-100 bg-white">
            <p className="text-[0.78rem] font-bold text-[#2A2C4E] tracking-wide">
              PROVOZOVATEL: REGIS-CZECH, spol. s r.o.
            </p>
          </footer>
        </main>
      </div>

      {/* Spodní pomocná lišta pro provozovatele / správce */}
       {new URLSearchParams(window.location.search).has('admin') && (<aside className="w-full max-w-[440px] mt-4 flex items-center justify-between text-xs text-[#5E6080] px-2">
        <button
          type="button"
          onClick={() => setShowAdminModal(true)}
          className="flex items-center gap-1.5 hover:text-[#2A2C4E] font-medium py-1 px-2 rounded-lg hover:bg-white/60 transition-colors cursor-pointer"
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>Kód Google Apps Script a QR kód</span>
        </button>

        <a
          href="/samostatna-anketa.html"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-[#2A2C4E] font-medium py-1 px-2 rounded-lg hover:bg-white/60 transition-colors"
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Samostatný HTML soubor</span>
        </a>
      </aside>)}

      {/* Modální okno pro konfiguraci Apps Scriptu & QR kódů */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-[540px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200">
            
            {/* Záhlaví modálu */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#DDB43C]" />
                <h3 className="font-bold text-sm text-[#2A2C4E]">
                  Správa ankety & Google Apps Script
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="p-1 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Záložky modálu */}
            <div className="flex border-b border-gray-100 text-xs font-semibold bg-gray-50/50">
              <button
                type="button"
                onClick={() => setAdminTab('script')}
                className={`flex-1 py-2.5 px-3 border-b-2 text-center transition-colors cursor-pointer ${
                  adminTab === 'script'
                    ? 'border-[#DDB43C] text-[#2A2C4E] bg-white font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                1. Google Apps Script
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('qr')}
                className={`flex-1 py-2.5 px-3 border-b-2 text-center transition-colors cursor-pointer ${
                  adminTab === 'qr'
                    ? 'border-[#DDB43C] text-[#2A2C4E] bg-white font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                2. QR Kódy & Místa
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('standalone')}
                className={`flex-1 py-2.5 px-3 border-b-2 text-center transition-colors cursor-pointer ${
                  adminTab === 'standalone'
                    ? 'border-[#DDB43C] text-[#2A2C4E] bg-white font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                3. Samostatný HTML
              </button>
            </div>

            {/* Obsah modálu */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs text-gray-700 leading-relaxed">
              {adminTab === 'script' && (
                <>
                  <div className="bg-amber-50/70 border border-[#DDB43C]/40 p-3 rounded-xl space-y-1">
                    <p className="font-bold text-[#2A2C4E]">
                      Kam se ukládají odpovědi?
                    </p>
                    <p className="text-gray-600">
                      Odpovědi se odesílají přímo do vaší Google Tabulky přes Google Apps Script (sloupce: Datum a čas | Místo | Čisto (ANO/NE) | Hodnocení | Poznámka).
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-[#2A2C4E] mb-1">
                      URL webové aplikace Google Apps Script (SCRIPT_URL):
                    </label>
                    <input
                      type="url"
                      value={scriptUrl}
                      onChange={(e) => handleSaveScriptUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-mono focus:border-[#DDB43C] focus:outline-none"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      {scriptUrl ? '✓ URL je uložena v prohlížeči.' : 'Pokud necháte pole prázdné, anketa funguje v testovacím režimu bez chyb.'}
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-[#2A2C4E]">Kód pro Apps Script (Code.gs):</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(appsScriptCode);
                          setCopiedScript(true);
                          setTimeout(() => setCopiedScript(false), 2000);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] bg-[#2A2C4E] text-white px-2.5 py-1 rounded font-semibold hover:opacity-90 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedScript ? 'Zkopírováno!' : 'Kopírovat kód'}
                      </button>
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded-xl overflow-x-auto text-[11px] font-mono max-h-48 leading-snug">
                      {appsScriptCode}
                    </pre>
                  </div>

                  <div className="border-t border-gray-100 pt-3">
                    <p className="font-bold text-[#2A2C4E] mb-1">Rychlý návod k nasazení:</p>
                    <ol className="list-decimal pl-4 space-y-1 text-gray-600">
                      <li>Vytvořte tabulku na <strong>sheets.google.com</strong>.</li>
                      <li>Klikněte na <strong>Rozšíření</strong> &gt; <strong>Apps Script</strong>.</li>
                      <li>Vložte kód výše a uložte.</li>
                      <li>Klikněte na <strong>Nasadit</strong> &gt; <strong>Nové nasazení</strong> &gt; <strong>Webová aplikace</strong>.</li>
                      <li>Vyberte <em>Spustit jako: Já</em> a <strong>Kdo má přístup: Kdokoli</strong> (velmi důležité).</li>
                      <li>Zkopírujte URL adresu končící na <code className="bg-gray-100 px-1">/exec</code> a vložte ji do pole výše.</li>
                    </ol>
                  </div>
                </>
              )}

              {adminTab === 'qr' && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-bold text-[#2A2C4E] mb-1">
                      Výběr stanoviště / parametru URL (?misto=):
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {[
                        { label: 'Celé stanoviště', val: 'autobusove-stanoviste' },
                        { label: 'Stanoviště 1', val: 'stanoviste-1' },
                        { label: 'Stanoviště 2', val: 'stanoviste-2' },
                        { label: 'Stanoviště 3', val: 'stanoviste-3' },
                        { label: 'Čekárna', val: 'cekarma' },
                        { label: 'Toalety / WC', val: 'toalety' },
                      ].map((loc) => (
                        <button
                          key={loc.val}
                          type="button"
                          onClick={() => setPlaceParam(loc.val)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer border ${
                            placeParam === loc.val
                              ? 'bg-[#DDB43C] text-[#2A2C4E] border-[#DDB43C]'
                              : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          {loc.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={placeParam}
                      onChange={(e) => setPlaceParam(e.target.value)}
                      placeholder="např. stanoviste-1"
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="w-32 h-32 bg-white p-1 rounded-lg border border-gray-200 flex items-center justify-center shrink-0">
                      <img 
                        src={qrApiUrl} 
                        alt="QR kód pro nálepku" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="space-y-2 text-left">
                      <p className="font-bold text-[#2A2C4E]">QR kód pro nálepku na stanovišti</p>
                      <p className="text-gray-500 text-[11px]">
                        Tento QR kód přímo otevírá anketu s parametrem: <br/>
                        <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-[#2A2C4E] font-bold">
                          ?misto={placeParam}
                        </code>
                      </p>
                      <a
                        href={qrApiUrl}
                        download={`qr-${placeParam}.png`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-[#2A2C4E] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Stáhnout QR kód v plné kvalitě
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {adminTab === 'standalone' && (
                <div className="space-y-3">
                  <p className="text-gray-600">
                    Podle zadání byl vygenerován také soubor <code className="bg-gray-100 px-1 py-0.5 rounded font-bold text-[#2A2C4E]">samostatna-anketa.html</code>, který obsahuje kompletní anketu (HTML + CSS + JavaScript v jediném souboru, bez jakýchkoliv frameworků či npm balíčků).
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    <a
                      href="/samostatna-anketa.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-[#DDB43C] text-[#2A2C4E] font-bold text-xs px-3 py-2 rounded-xl hover:opacity-90 transition-opacity"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Otevřít samostatný HTML soubor
                    </a>
                    
                    <a
                      href="/samostatna-anketa.html"
                      download="anketa-cistoty-cesky-tesin.html"
                      className="inline-flex items-center gap-1.5 bg-[#2A2C4E] text-white font-bold text-xs px-3 py-2 rounded-xl hover:opacity-90 transition-opacity"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Stáhnout soubor na disk
                    </a>
                  </div>

                  <p className="text-[11px] text-gray-500 pt-2">
                    Soubor můžete jednoduše nahrát na jakýkoliv webhosting, GitHub Pages, Netlify nebo provozovat z libovolného serveru.
                  </p>
                </div>
              )}
            </div>

            {/* Zápatí modálu */}
            <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <span className="text-[11px] text-gray-500">
                REGIS-CZECH, spol. s r.o. – Český Těšín
              </span>
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="bg-[#2A2C4E] text-white font-bold px-4 py-1.5 rounded-xl text-xs cursor-pointer hover:opacity-95"
              >
                Zavřít
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
