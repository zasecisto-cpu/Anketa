# Google Apps Script – Propojení ankety čistoty s Google Tabulkou
**Provozovatel:** REGIS-CZECH, spol. s r.o.  
**Místo:** Autobusové stanoviště Český Těšín  

Tento skript přijímá odpovědi z ankety přes metodu `POST`, automaticky vytvoří sloupce v Google Tabulce (pokud ještě neexistují) a zapíše každý nový záznam.

---

## 1. Kód skriptu (`Code.gs`)

Vložte následující kód do editoru Google Apps Script:

```javascript
/**
 * @license
 * Skript pro příjem odpovědí z ankety čistoty – REGIS-CZECH, spol. s r.o.
 * Autobusové stanoviště Český Těšín
 */

function doPost(e) {
  try {
    var lock = LockService.getScriptLock();
    // Počkat max 10 sekund na uvolnění zámku (ochrana před souběžnými zápisy)
    lock.waitLock(10000);

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Zkontrolovat / vytvořit hlavičku, pokud je tabulka prázdná
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Datum a čas",
        "Místo",
        "Čisto (ANO/NE)",
        "Hodnocení",
        "Poznámka",
        "Časové razítko (ISO)"
      ]);
      // Formátování záhlaví
      var headerRange = sheet.getRange(1, 1, 1, 6);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#DDB43C");
      headerRange.setFontColor("#2A2C4E");
      sheet.setFrozenRows(1);
    }

    // Parsování příchozích dat
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
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

    // Vložení nového řádku
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

// Podpora pro testovací GET požadavek v prohlížeči
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Google Apps Script Web App pro anketu REGIS-CZECH je aktivní."
  })).setMimeType(ContentService.MimeType.JSON);
}
```

---

## 2. Návod na nasazení krok za krokem

### Krok 1: Vytvoření Google Tabulky
1. Otevřete [Google Tabulky](https://sheets.google.com) a vytvořte novou tabulku (např. s názvem **„Hodnocení čistoty – Český Těšín“**).

### Krok 2: Otevření editoru skriptů
1. V horním menu tabulky klikněte na **Rozšíření** > **Apps Script**.
2. Smažte veškerý výchozí kód v souboru `Code.gs` a vložte celý kód uvedený výše.
3. Klikněte na ikonu diskety (💾 **Uložit**).

### Krok 3: Nasazení jako webová aplikace
1. Vpravo nahoře klikněte na modré tlačítko **Nasadit** (Deploy) > **Nové nasazení** (New deployment).
2. U položky **Vyberte typ** klikněte na ozubené kolečko ⚙️ a zvolte **Webová aplikace** (Web app).
3. Vyplňte následující nastavení (**VELMI DŮLEŽITÉ**):
   - **Popis:** Anketa čistoty stanoviště
   - **Spustit jako:** `Já (váš-email@gmail.com)`
   - **Kdo má přístup:** `Kdokoli` (Anyone)  *(Tento krok je klíčový, aby lidé po naskenování QR kódu nemuseli být přihlášeni k Google účtu!)*
4. Klikněte na **Nasadit** (Deploy).
5. Pokud se zobrazí výzva k autorizaci:
   - Klikněte na **Zkontrolovat přístupová práva**.
   - Vyberte svůj Google účet.
   - Klikněte na **Upřesnit** (Advanced) dole vlevo a poté na **Přejít na web ... (nebezpečné)**.
   - Klikněte na **Povolit** (Allow).

### Krok 4: Zkopírování URL adresy
1. Zkopírujte vygenerovanou **URL adresu webové aplikace** (končí na `/exec`).  
   Vypadá přibližně takto:  
   `https://script.google.com/macros/s/AKfycbx.../exec`
2. Tuto adresu vložte do konstanty `SCRIPT_URL` v souboru `samostatna-anketa.html` nebo do nastavení ve webové aplikaci.

---

## 3. Parametry v URL pro QR kódy
Můžete generovat různé QR kódy pro jednotlivá stanoviště nebo peróny:
- `https://vase-domena.cz/?misto=stanoviste-1`
- `https://vase-domena.cz/?misto=stanoviste-2`
- `https://vase-domena.cz/?misto=cekarma`
- `https://vase-domena.cz/` *(automaticky použije „autobusove-stanoviste“)*
