---
layout: post
title: "Guida tecnica — Tre Shelly, una pompa, 60 metri"
date: 2026-07-15
categories: domotica shelly AI
tags: [Shelly, LoRa, domotica, tutorial, replica, script]
description: >-
  Guida operativa passo-passo per replicare il progetto della pompa comandata
  via LoRa tra due Shelly 1PM Gen4. Materiali, cablaggi, script scaricabili.
permalink: /guida-tecnica-pompa-shelly-lora/
---

<a id="guida-tecnica"></a>
## 🔧 Guida tecnica passo-passo — per chi vuole replicare (o adattare) il progetto

Questa guida raccoglie, in ordine operativo, tutto ciò che serve per costruire il sistema: materiali, foto, cablaggi, configurazioni e collaudo. È pensata per chi parte più o meno dal mio stesso livello: **nessuna competenza avanzata richiesta**, ma attenzione, pazienza e rispetto assoluto per la sicurezza elettrica.

> ⚠️ **Prima di tutto: sicurezza.** Si lavora a 230 V. Ogni collegamento va fatto a impianto sezionato e tensione verificata assente. Nel dubbio, un elettricista. (Io l'ho chiamato, quando serviva. Nessuna vergogna.)

> 📖 **Vuoi capire prima il "perché" di certe scelte?** Questa guida è il complemento operativo del **[racconto del progetto](/tre-shelly-pompa-60-metri/)**: lì trovi la narrazione (le quattro evoluzioni, il ruolo delle AI, la prova sul campo), qui trovi come costruirlo passo per passo.

### Passo 0 — Cosa serve

| Componente | Q.tà | Note |
|---|---|---|
| Shelly Plus 1PM | 1 | Legge il sensore di livello (deposito) |
| Shelly Plus Add-on | 1 | Interfaccia sensore, isolata galvanicamente |
| Sensore capacitivo XKC-Y25-NPN (5–24 V) | 1 | Senza contatto, si applica all'esterno del deposito |
| Shelly 1PM Gen4 | 2 | Diventeranno **1T** e **1R** |
| Shelly LoRa Add-on | 2 | Uno per ciascun Gen4 — versione standard, antenna integrata |
| Shelly RC Snubber | 1 | Da montare in parallelo alla pompa |
| Quadro con 2 prese Schuko bipasso 2P+T 10/16A + magnetotermico | 1 | Presso la cisterna |
| Scatola di derivazione da esterno + viti e tasselli | 1 | Sede definitiva di 1T |
| Cavo tripolare 1,5 mm² | q.b. | Alimentazione di 1T all'esterno |
| Cavo tripolare 2,5 mm² | q.b. | Linea da casa al quadro della cisterna |
| Puntalini, morsettiere | q.b. | — |

*Dove trovarli:* gli Shelly sul [sito ufficiale](https://www.shelly.com/it/collections/smart-switches-dimmers); il sensore XKC-Y25-NPN si reperisce facilmente online.

![Lo Shelly Plus 1PM][Shelly_Plus_1PM.webp]
![Lo Shelly 1PM Gen4 con i fili collegati][shelly-1pm-gen4_con_fili.webp]
![Il LoRa Add-on accoppiato allo Shelly][shelly-lora-add-on-accoppiato.webp]
![Il quadro con le due prese e il magnetotermico][Quadro_con_prese.webp]
![Le morsettiere utilizzate][Morsettiere.webp]

**Solo per le prove al tavolo** (Passo 1): due prolunghe tripolari con presa bipasso (da tagliare), spezzoni di cavo 1,5 mm² con puntalini, e un'abat-jour con **lampada a incandescenza**.

**Strumenti:** cacciaviti isolati da elettricista, forbici da elettricista, crimpatrice per puntalini, spelafili, saldatore e stagno, trapano a percussione con punte da muro, un multimetro.

### Passo 1 — Le prove al tavolo (prima di toccare la pompa!)

Non collegate mai la pompa al primo colpo. Ho fatto tutte le prove **in casa, su un tavolo**, usando un'abat-jour con lampadina a incandescenza come "pompa finta": un riscontro visivo immediato e innocuo.

![L'abat-jour con lampada a incandescenza usata come carico di prova][Abat-jour_Lampadina.webp]
![Le prolunghe tagliate e preparate per le prove][Cavi_prolunghe_per_prove.webp]
![Prolunga elettrica intestata con puntalini][Prolunga-elettrica_con_puntalini.webp]

> ⚠️ **Perché proprio una lampadina a incandescenza?** Perché è un carico **resistivo** "vero": assorbe abbastanza corrente da far lavorare il relè in modo realistico. Il mio primo tentativo con un **faretto LED** fallì: i LED assorbono pochissimo e la loro elettronica di controllo può dare comportamenti anomali con i relè. E ricordate: la lampadina valida la *logica* del sistema, ma la pompa è un carico **induttivo** — il comportamento elettrico reale (spunti, disturbi) lo vedrete solo sul campo. Per questo, alla fine, c'è lo snubber.

### Passo 2 — Il sensore di livello e l'Add-on

Il sensore XKC-Y25-NPN è capacitivo e **senza contatto**: si applica all'esterno della parete del deposito (plastica o vetro, non metallo) e rileva l'acqua attraverso di essa. Ha quattro fili; questo il cablaggio verso lo Shelly Plus Add-on:

| Filo sensore | Funzione | Morsetto Add-on |
|---|---|---|
| **Marrone** | Alimentazione + | **VREF OUT** |
| **Blu** | Massa | **GND** |
| **Giallo** | Segnale di uscita | **DIGITAL IN** |
| **Nero** | Selezione modalità (NO/NC) | **GND** |

![Il sensore con i puntalini e l'Add-on][Sensore_con_puntalini_e_Addon.webp]
![I collegamenti del sensore all'Add-on][Addon_sensore_collegamenti.webp]
![Lo Shelly Plus Add-on cablato][shelly-plus-addon_con_fili.webp]
![L'insieme Shelly + Add-on + sensore di livello][Shelly_Addon_sensore_livello.webp]
![Il sensore nella sua posizione definitiva sulla parete del deposito][Sensore_su_deposito.webp]

**La logica di funzionamento:** il LED del sensore è **acceso** quando rileva il liquido. Quando il livello scende sotto la soglia, il LED **si spegne** — ed è proprio questo spegnimento l'evento che fa partire tutta la catena. In altre parole: *la pompa parte quando l'acqua manca, non quando c'è.* La sensibilità si regola con la piccola vite sul retro del sensore.

> ⚠️ **Nota sulla tensione di alimentazione.** Nel mio impianto, sul morsetto VREF OUT ho misurato **~9,92 V a vuoto** e **5,12 V con il sensore collegato** — valori che non coincidono del tutto con la documentazione (che parla di alimentazione a 3,3 V). I 5,12 V rientrano comunque nel range del sensore (5–24 V) e da me tutto ha sempre funzionato correttamente — ma **verificate le vostre misure** e prendete questa parte "così com'è", senza garanzie. I dettagli nella [sezione sull'onestà tecnica](/tre-shelly-pompa-60-metri/#7-sicurezza-anonimizzazione-e-onestà-tecnica) del racconto.

### Passo 3 — Configurare lo Shelly del deposito (l'azione HTTP)

Sullo Shelly Plus 1PM del deposito va creata un'**Azione** che, quando l'ingresso dell'Add-on **si disattiva** (LED del sensore spento = acqua sotto soglia), chiami questo indirizzo locale — che "preme" virtualmente l'ingresso di 1T:

```
http://192.168.1.xxx/rpc/Switch.Set?id=0&on=true
```

*(sostituite `192.168.1.xxx` con l'IP reale di 1T nella vostra rete)*

Due accorgimenti **fondamentali**, imparati a mie spese:

1. **Una sola azione**, non duplicata (attenzione: l'interfaccia può mostrare come distinte un'azione nativa e una URL che in realtà sono raggruppate).
2. Impostate **"Ripeti quando" a 420 secondi** (poco più della durata del ciclo pompa): così, anche se il sensore oscilla più volte durante il riempimento, parte un solo comando ogni 420 secondi.

> 💡 **Consiglio: IP statici.** Assegnate ai tre Shelly indirizzi IP fissi (prenotazione DHCP dal router, basata sul MAC). Se l'IP di 1T cambiasse, l'azione HTTP fallirebbe *in silenzio*.

### Passo 4 — Preparare 1T e 1R

1. **Firmware aggiornato** su entrambi i Gen4.
2. **LoRa Add-on installato** su ciascuno, con la ricezione abilitata (*"Allow the LoRa Add-on to receive packets"*).
3. **Parametri radio** (uguali sui due dispositivi — sono quelli di fabbrica): frequenza **868 MHz** (Europa), bandwidth 125 kHz, **SF12** (portata massima), potenza **14 dBm** — che è già il limite legale europeo: non si può "alzare il volume", si può solo migliorare posizione e orientamento delle antenne.
4. Su **1T**, impostate l'ingresso in modalità **detached** — indispensabile, altrimenti il relè "segue" l'input fisico e genera comandi doppi:

```
http://192.168.1.xxx/rpc/Switch.SetConfig?id=0&config={"in_mode":"detached"}
```

5. Su **entrambi**, comportamento post-blackout: **spento** alla riaccensione (*Power On Default → OFF*). Con la pompa di mezzo, è una scelta di sicurezza.
6. Su **1T**, create un **componente virtuale Boolean** (otterrà l'id `boolean:200`): lo script lo userà come "spia" dello stato d'allarme.

![1T cablato e pronto][1T_collegato.webp]
![I collegamenti di 1R][1R_collegamenti.webp]
![Il LoRa Add-on montato su 1T][1T_LoRa_AddON.webp]
![Il LoRa Add-on con i pin in evidenza][shelly-lora-add-on-pin-evidenti.webp]

### Passo 5 — Caricare gli script

Gli script completi (prima versione funzionante **v2** e definitiva **v7**) sono nell'[Appendice tecnica](#appendice) e scaricabili qui:

- ⬇️ [Script 1T — v2](scripts/pompa/1T_v2.js) · ⬇️ [Script 1R — v2](scripts/pompa/1R_v2.js)
- ⬇️ [Script 1T — v7 definitivo](scripts/pompa/1T_v7.js) · ⬇️ [Script 1R — v7 definitivo](scripts/pompa/1R_v7.js)

Procedura: Web UI del dispositivo → *Scripts* → *Create new script* → incollare → *Save* → *Start* → attivare **Run on boot**.

Prima di avviare:

1. **Create il vostro topic ntfy**: installate l'app ntfy sul telefono, inventate una stringa lunga e casuale, iscrivetevi a quel canale e **inseritela nello script al posto di `IL_TUO_TOPIC_SEGRETO`**. Il topic è, di fatto, una password: non pubblicatelo mai.
2. Il mio consiglio è di partire dalla **v2** (più semplice da capire), verificarne il funzionamento, e passare poi alla **v7**.

### Passo 6 — Collaudo: prima in casa, poi sul campo

1. **In casa**, con 1R vicino e la lampadina come carico: riducete temporaneamente i timer in cima allo script di 1T (es. `CFG_DURATA_POMPA = 10`, `CFG_PING_NORMALE = 18`) per non aspettare mezz'ora tra le prove.
2. Verificate nel log di 1T il ciclo completo: `PING → PONG` e `ACCENDI_POMPA → POMPA_ON → notifica ntfy → spegnimento a tempo`.
3. Provate anche i casi d'errore: togliete alimentazione a 1R e osservate i tentativi, l'allarme, la notifica "Controllo corrente" e — alla riaccensione — il ripristino automatico.
4. Solo a quel punto, **ripristinate i valori definitivi** dei timer e spostate 1R nella posizione reale.

### Passo 7 — Posizionamento definitivo e accorgimenti radio

Qui si gioca gran parte dell'affidabilità del collegamento. Le regole che ho imparato (a mie spese):

- **Antenne parallele tra loro**: entrambe verticali o entrambe nello stesso orientamento. Un'antenna verticale e una orizzontale possono costare gran parte del segnale.
- Il filo dell'antenna **non deve puntare verso l'altro dispositivo** (lungo il suo asse la radiazione è minima): meglio perpendicolare alla linea che unisce 1T e 1R.
- **Lontano da metalli e cavi di potenza**: la mia peggior fase di instabilità (messaggi corrotti come `PONE`, `QONG`, `PO^`) era dovuta al sovraffollamento di fili, interruttore e presa nella scatola dove avevo infilato 1T. Spostato in una **scatola di derivazione da esterno, dedicata**, il problema è sparito: 57 PONG puliti consecutivi al primo log.
- **In alto è meglio**: pochi metri di elevazione riducono gli ostacoli nel percorso radio.

![La scatola di derivazione esterna, sede definitiva di 1T][Scatola_esterna_1T.webp]
![I 60,75 metri tra 1T e 1R, misurati su ortofoto][Distanza_1T_1R.webp]

*I tre dispositivi nelle loro sedi definitive:*

![Collage: il sensore sul deposito, 1T sulla parete esterna, 1R alla cisterna][collage_tre_dispositivi.webp]

### Passo 8 — Snubber e sicurezza elettrica

- Montate lo **Shelly RC Snubber in parallelo alla pompa, il più vicino possibile ad essa** (non vicino allo Shelly!). Assorbe i picchi di tensione alla commutazione, protegge il relè e riduce i disturbi — anche radio.
- Verificate che il **magnetotermico** dedicato sia correttamente dimensionato: nel mio caso è stato lui a salvare la situazione quando la pompa ha ceduto.
- Controllate i dati di targa della pompa rispetto ai limiti dello Shelly (il mio Gen4 gestisce fino a 16 A; la mia pompa ne assorbe 5,88 — ampio margine, ma è un controllo da fare sempre).

![Lo snubber RC montato in prossimità dell'elettropompa][Snubber.webp]
![La targhetta con le caratteristiche dell'elettropompa][Caratteristiche_pompa.webp]

### Il risultato

Se tutto è andato bene, il vostro log sarà un lungo, monotono, meraviglioso susseguirsi di `PING`/`PONG` — e sul telefono arriverà **una** notifica per ogni accensione reale della pompa, non una raffica:

![Una notifica ntfy contro diciannove attivazioni grezze del sensore][notifiche.webp]

### Una parola prima di salutarci

Questa guida — come tutto il progetto, script definitivi compresi — è **gratuita e lo resterà**: è una scelta fatta con convinzione, per restituire quello che a mia volta ho ricevuto da chi condivide le proprie esperienze in rete. Se ti è stata utile e vuoi contribuire, **su base del tutto volontaria**, al prossimo progetto (Raspberry Pi / Arduino), puoi farlo qui:

> ☕ **[Offrimi un caffè per il prossimo progetto](LINK_DONAZIONI)**

E se replicando il progetto scopri qualcosa — un miglioramento, un errore, una variante — scrivimelo: il bello di questi progetti è che non finiscono mai davvero.

---

<a id="appendice"></a>
## Appendice tecnica — Gli script, dal "funziona" al "mi fido"

Questa appendice raccoglie il cuore software del progetto. Ho scelto di NON mostrarti solo la versione finale, ma di metterti sotto gli occhi **due tappe** del percorso — la prima versione completa e quella definitiva — perché il confronto tra le due è il racconto di questo progetto: mostra come, correzione dopo correzione, un sistema che "funziona" diventa un sistema di cui ci si "fida". Ed entrambe, ripeto, sono **liberamente scaricabili**: è una scelta deliberata.

> 🔒 **Nota sull'anonimizzazione.** Tutti gli script qui sotto sono stati ripuliti dai dati sensibili. In particolare:
> - l'indirizzo del servizio di notifica è sostituito con `IL_TUO_TOPIC_SEGRETO`;
> - l'indirizzo IP nel comando di configurazione è un IP locale **d'esempio** (`192.168.1.xxx`).
>
> ⚠️ **Se replichi il progetto:** il "topic" di ntfy.sh funziona di fatto come una password. **Non condividerlo mai in chiaro** (né in un blog, né altrove): chi lo conosce può leggere e inviare le tue notifiche. Usa una stringa lunga e casuale, e trattala come una credenziale.

### Premessa comune: la configurazione dell'Add-on sensore

In entrambe le versioni, oltre agli script, serve **un'azione** configurata sull'Add-on a cui è collegata la sonda di livello. Quando il sensore cambia stato, l'Add-on chiama questo indirizzo locale, che "preme" virtualmente l'ingresso dello Shelly 1T:

```
http://192.168.1.xxx/rpc/Switch.Set?id=0&on=true
```

*(`192.168.1.xxx` è l'IP locale d'esempio del dispositivo 1T: sostituiscilo con quello reale della tua rete.)*

---

### PARTE A — La prima versione funzionante (v2)

Questa è la prima versione che ha funzionato dall'inizio alla fine. Fa già le cose essenziali, ed è la più facile da leggere per capire l'impianto generale:

- **1T** invia `PING` ogni 30 minuti e attende `PONG`; se 1R tace per 10 tentativi, manda l'allarme "Controllo corrente";
- il **sensore** fa scattare l'invio di `ACCENDI_POMPA:400` (o `SPEGNI_POMPA`);
- una **pausa di sicurezza di 10 secondi** dopo ogni comando smorza le oscillazioni del sensore (il *debounce*);
- **1R** riceve, comanda la pompa, e la spegne da solo allo scadere del timer.

**Cosa NON fa ancora la v2** (e sarà il motivo delle versioni successive): non c'è conferma di avvenuta accensione (ACK), quindi 1T "spara" il comando e *spera* che sia arrivato. Se il messaggio si perde, la pompa non parte e nessuno se ne accorge.

⬇️ Download: [1T_v2.js](scripts/pompa/1T_v2.js) · [1R_v2.js](scripts/pompa/1R_v2.js)

<details>
<summary><strong>📜 Script 1T — Trasmittente (v2)</strong> (clicca per espandere)</summary>

```javascript
// ================================================
// SCRIPT 1T — Trasmittente (v2, prima versione completa)
// Shelly 1 PM Gen4 + LoRa Add-on
// ================================================

// === PARAMETRI CONFIGURABILI ===
let CFG_DURATA_POMPA = 400;  // secondi di attivazione pompa
let CFG_PING_NORMALE = 1800; // secondi tra ping normali (30 min)
let CFG_PING_ALERT   = 60;   // secondi tra ping in modalità allarme (1 min)
let CFG_PING_TIMEOUT = 30;   // secondi di attesa PONG dopo ogni PING
let CFG_MAX_ALERT    = 10;   // ping falliti consecutivi prima della notifica

let NTFY_URL = "https://ntfy.sh/IL_TUO_TOPIC_SEGRETO";

// === STATO POMPA ===
let isLocked   = false;
let isPompaOn  = false;
let timerPompa = null;

// === STATO HEARTBEAT ===
let pongRicevuto   = false;
let pingInCorso    = false;
let modalitaAlert  = false;
let contatoreAlert = 0;
let timerPing      = null;

// ------------------------------------------------
// NOTIFICHE ntfy
// ------------------------------------------------
function inviaNtfy(testo) {
  Shelly.call("HTTP.POST", {
    url: NTFY_URL,
    body: testo,
    content_type: "text/plain"
  }, function(res, err, msg) {
    if (err) print("Errore notifica ntfy:", msg);
    else print("Notifica ntfy inviata:", testo);
  });
}

// ------------------------------------------------
// HEARTBEAT — PING periodico verso 1R
// ------------------------------------------------
function inviaPing() {
  if (pingInCorso) {
    print("Ping gia in corso, attendo verificaPong.");
    return;
  }
  pingInCorso  = true;
  pongRicevuto = false;
  print("HEARTBEAT: invio PING a 1R...");

  Shelly.call("LoRa.SendBytes", { id: 100, data: btoa("PING") },
    function(res, err, msg) {
      if (err) print("Errore invio PING:", msg);
    }
  );

  Timer.set(CFG_PING_TIMEOUT * 1000, false, verificaPong);
}

function verificaPong() {
  pingInCorso = false;

  if (pongRicevuto) {
    print("PONG ricevuto: 1R operativo.");

    if (modalitaAlert) {
      modalitaAlert  = false;
      contatoreAlert = 0;
      Shelly.call("Boolean.Set", { id: 200, value: false });
      inviaNtfy("Controllo corrente: OK");
      print("Allarme resettato. 1R di nuovo online.");

      // 1R è ripartito da zero: sincronizza lo stato della pompa
      isPompaOn = false;
      if (timerPompa !== null) {
        Timer.clear(timerPompa);
        timerPompa = null;
        print("Stato pompa sincronizzato: OFF (riavvio 1R).");
      }
    }

    timerPing = Timer.set(CFG_PING_NORMALE * 1000, false, inviaPing);

  } else {
    if (!modalitaAlert) {
      modalitaAlert  = true;
      contatoreAlert = 0;
      print("ATTENZIONE: 1R non risponde. Modalita allarme attiva.");
    }

    contatoreAlert++;
    print("Tentativi falliti: " + contatoreAlert + "/" + CFG_MAX_ALERT);

    if (contatoreAlert >= CFG_MAX_ALERT) {
      print("ALLARME: 1R offline!");
      Shelly.call("Boolean.Set", { id: 200, value: true });
      inviaNtfy("⚠️⚡️Controllo corrente⚡️⚠️");
      modalitaAlert  = false;
      contatoreAlert = 0;
      timerPing = Timer.set(CFG_PING_NORMALE * 1000, false, inviaPing);
    } else {
      timerPing = Timer.set(CFG_PING_ALERT * 1000, false, inviaPing);
    }
  }
}

// Primo ping 60 secondi dopo l'avvio (lascia stabilizzare il sistema)
Timer.set(60000, false, inviaPing);

// ------------------------------------------------
// RICEZIONE MESSAGGI LoRa (PONG da 1R)
// ------------------------------------------------
Shelly.addEventHandler(function(event) {
  if (!event || event.name !== "lora" || event.id !== 100) return;
  if (!event.info || !event.info.data) return;

  let msg = atob(event.info.data);
  print("Ricevuto via LoRa:", msg);

  if (msg === "PONG") {
    pongRicevuto = true;
    print("PONG confermato da 1R.");
  }
});

// ------------------------------------------------
// GESTIONE INPUT SENSORE (switch:0)
// ------------------------------------------------
Shelly.addStatusHandler(function(event) {
  if (event.component !== "switch:0") return;
  if (event.delta.output !== true) return;

  if (isLocked) {
    Shelly.call("Switch.Set", { id: 0, on: false });
    print("Input ignorato: pausa di sicurezza attiva.");
    return;
  }

  isLocked = true;
  Shelly.call("Switch.Set", { id: 0, on: false });

  let messaggio;

  if (isPompaOn) {
    messaggio = "SPEGNI_POMPA";
    isPompaOn = false;
    if (timerPompa !== null) {
      Timer.clear(timerPompa);
      timerPompa = null;
    }
    print("Invio SPEGNI_POMPA.");
  } else {
    messaggio = "ACCENDI_POMPA:" + CFG_DURATA_POMPA;
    isPompaOn = true;
    timerPompa = Timer.set(CFG_DURATA_POMPA * 1000, false, function() {
      isPompaOn = false;
      timerPompa = null;
      print("Timer pompa scaduto (sync locale 1T).");
    });
    print("Invio ACCENDI_POMPA per " + CFG_DURATA_POMPA + " secondi.");
  }

  Shelly.call("LoRa.SendBytes", { id: 100, data: btoa(messaggio) },
    function(res, err, errMsg) {
      if (err) print("Errore trasmissione:", errMsg);
      else print("Trasmesso con successo:", messaggio);
    }
  );

  Timer.set(10000, false, function() {
    isLocked = false;
    print("Pausa di sicurezza terminata. Sistema pronto.");
  });
});
```

</details>

<details>
<summary><strong>📜 Script 1R — Ricevente (v2)</strong> (clicca per espandere)</summary>

```javascript
// ================================================
// SCRIPT 1R — Ricevente (v2)
// Shelly 1 PM Gen4 + LoRa Add-on
// ================================================

print("Script 1R attivo. In ascolto...");

let timerSpegnimento = null;

Shelly.addEventHandler(function(event) {
  if (!event || event.name !== "lora" || event.id !== 100) return;
  if (!event.info || !event.info.data) return;

  let msg = atob(event.info.data);
  print("Messaggio ricevuto:", msg);

  // ---- PING: rispondi con PONG ----
  if (msg === "PING") {
    Shelly.call("LoRa.SendBytes", { id: 100, data: btoa("PONG") },
      function(res, err, errMsg) {
        if (err) print("Errore invio PONG:", errMsg);
        else print("PONG inviato a 1T.");
      }
    );
    return;
  }

  // ---- ACCENDI_POMPA[:durata] ----
  if (msg.indexOf("ACCENDI_POMPA") === 0) {
    let durata = 400; // fallback se la durata non è nel messaggio
    let sep = msg.indexOf(":");
    if (sep !== -1) {
      let d = parseInt(msg.slice(sep + 1));
      if (!isNaN(d) && d > 0) durata = d;
    }
    print("Accensione pompa per " + durata + " secondi.");

    if (timerSpegnimento !== null) {
      Timer.clear(timerSpegnimento);
      timerSpegnimento = null;
    }

    Shelly.call("Switch.Set", { id: 0, on: true });

    timerSpegnimento = Timer.set(durata * 1000, false, function() {
      print("Tempo scaduto. Spegnimento automatico.");
      Shelly.call("Switch.Set", { id: 0, on: false });
      timerSpegnimento = null;
    });
    return;
  }

  // ---- SPEGNI_POMPA ----
  if (msg === "SPEGNI_POMPA") {
    print("Comando di spegnimento ricevuto.");
    if (timerSpegnimento !== null) {
      Timer.clear(timerSpegnimento);
      timerSpegnimento = null;
    }
    Shelly.call("Switch.Set", { id: 0, on: false });
    return;
  }

  print("Messaggio non riconosciuto:", msg);
});
```

</details>

---

### Il percorso tra la v2 e la v7 (le versioni intermedie)

Tra la prima versione e quella definitiva ci sono state alcune tappe intermedie (le v4, v5, v6), che non riporto per intero per non appesantire. Ma vale la pena riassumere **cosa** è cambiato, perché ogni modifica nasce da un problema reale:

- **Introduzione dell'ACK (conferma).** 1R, quando accende la pompa, risponde `POMPA_ON`; quando la spegne, `POMPA_OFF`. Finalmente 1T *sa* se il comando è andato a buon fine, invece di sperarlo.
- **Retry automatici.** Se `POMPA_ON` non arriva entro 5 secondi, 1T **ritenta** (fino a 10 volte).
- **Comando "in attesa".** Se il sensore chiede la pompa mentre 1R è offline, il comando non viene perso: resta *pendente* ed eseguito appena 1R torna online.
- **Fase di verifica all'avvio.** Dopo un riavvio, 1T fa alcuni ping ravvicinati prima di passare al ritmo di crociera da 30 minuti.

E poi c'è **l'ultima correzione**, quella che ha dato origine alla v7 — e che è nata direttamente **dalla lettura dei log reali.**

<details>
<summary><strong>🐛 Il bug che i log hanno rivelato (v6 → v7)</strong> (clicca)</summary>

<br>

Osservando il comportamento reale del sistema, mi sono accorto di un problema sottile. Al momento dell'accensione, poteva capitare che un evento "spurio" sullo switch (un doppio trigger dell'app, oppure l'esecuzione di un comando pendente) generasse subito uno `SPEGNI_POMPA` involontario, fermando la pompa un istante dopo averla accesa.

La soluzione, nella v7, è un **lock di sicurezza più lungo (30 secondi)** applicato *specificamente* all'accensione. In pratica: appena parte un `ACCENDI_POMPA`, il sistema "chiude le orecchie" a qualsiasi nuovo evento sullo switch per 30 secondi, il tempo che la situazione si stabilizzi. Nel codice v7 lo si riconosce da questo commento:

```javascript
// Lock di sicurezza: blocca eventi switch per 30s dopo l'avvio
// (previene SPEGNI spurii sia dal path pendente che da doppi trigger app)
```

È un piccolo esempio, ma per me significativo: **non l'ho trovato ragionando a tavolino, l'ho trovato leggendo cosa faceva davvero il sistema.** La realtà è sempre il miglior collaudatore.

</details>

---

### PARTE B — La versione definitiva, in uso (v7)

Questa è la versione attualmente in funzione. Rispetto alla v2 è più lunga e più "difensiva": ogni riga in più esiste per gestire un caso in cui qualcosa potrebbe andare storto. È il concetto dei **"due cervelli"** portato all'estremo: 1T (accessibile, in casa) concentra tutta l'intelligenza; 1R (isolato, lontano) resta volutamente semplice — riceve, esegue, conferma.

⬇️ Download: [1T_v7.js](scripts/pompa/1T_v7.js) · [1R_v7.js](scripts/pompa/1R_v7.js)

<details>
<summary><strong>📜 Script 1T — Trasmittente (v7, definitivo)</strong> (clicca per espandere)</summary>

```javascript
// ================================================
// SCRIPT 1T — Trasmittente (versione finale v7)
// Shelly 1 PM Gen4 + LoRa Add-on
// ================================================

// === PARAMETRI CONFIGURABILI ===
let CFG_DURATA_POMPA        = 400;   // secondi di attivazione pompa
let CFG_PING_AVVIO          = 120;   // secondi prima del primo ping dopo l'avvio (2 min)
let CFG_PING_VERIFICA       = 120;   // secondi tra ping nella fase di verifica iniziale (2 min)
let CFG_PING_VERIFICA_COUNT = 3;     // ping ravvicinati all'avvio prima del ritmo normale
let CFG_PING_NORMALE        = 1800;  // secondi tra ping normali a regime (30 min)
let CFG_PING_ALERT          = 120;   // secondi tra ping in modalità allarme (2 min)
let CFG_PING_TIMEOUT        = 30;    // secondi massimi di attesa PONG dopo ogni PING
let CFG_MAX_ALERT           = 10;    // ping falliti consecutivi prima della notifica
let CFG_ACK_TIMEOUT         = 5;     // secondi attesa POMPA_ON da 1R dopo ogni ACCENDI
let CFG_MAX_RETRY           = 10;    // tentativi max prima di notifica fallimento

let NTFY_URL                = "https://ntfy.sh/IL_TUO_TOPIC_SEGRETO";
let CFG_NOTIFICA_RIPRISTINO = false; // true = notifica "Controllo corrente: OK" attiva

// === STATO POMPA ===
let isLocked        = false;
let isPompaOn       = false;
let timerPompa      = null;
let comandoPendente = false;

// === STATO ACK ===
let ackAtteso      = false;
let contatoreRetry = 0;

// === STATO HEARTBEAT ===
let pongRicevuto   = false;
let pingInCorso    = false;
let is1ROnline     = false;
let modalitaAlert  = false;
let contatoreAlert = 0;
let timerPing      = null;
let timerVerifica  = null;
let verificaAvvio  = 0;

// ------------------------------------------------
// UTILITÀ — orario attuale HH:MM:SS
// ------------------------------------------------
function getOrario() {
  let sys = Shelly.getComponentStatus("sys");
  if (!sys || !sys.time) return "";
  let secs = sys.unixtime % 60;
  let secsStr = (secs < 10 ? "0" : "") + JSON.stringify(secs);
  return "[" + sys.time + ":" + secsStr + "] ";
}

// ------------------------------------------------
// NOTIFICHE ntfy
// ------------------------------------------------
function inviaNtfy(testo) {
  let msg = getOrario() + testo;
  Shelly.call("HTTP.POST", {
    url: NTFY_URL,
    body: msg,
    content_type: "text/plain"
  }, function(res, err, errMsg) {
    if (err) print("Errore notifica ntfy:", errMsg);
    else print("Notifica ntfy inviata:", msg);
  });
}

// ------------------------------------------------
// INVIO ACCENDI CON RETRY
// ------------------------------------------------
function inviaAccendi() {
  isPompaOn = true;
  if (timerPompa !== null) Timer.clear(timerPompa);
  timerPompa = Timer.set(CFG_DURATA_POMPA * 1000, false, function() {
    isPompaOn = false;
    timerPompa = null;
    print("Timer pompa scaduto (sync locale 1T).");
  });

  // Lock di sicurezza: blocca eventi switch per 30s dopo l'avvio
  // (previene SPEGNI spurii sia dal path pendente che da doppi trigger app)
  isLocked = true;
  Timer.set(30000, false, function() {
    isLocked = false;
    print("Pausa post-avvio terminata. Sistema pronto.");
  });

  ackAtteso      = true;
  contatoreRetry = 0;
  _trasmettAccendi();
}

function _trasmettAccendi() {
  if (!ackAtteso) return;
  let messaggio = "ACCENDI_POMPA:" + CFG_DURATA_POMPA;
  print("Invio ACCENDI_POMPA (tentativo " + (contatoreRetry + 1) + "/" + CFG_MAX_RETRY + ").");

  Shelly.call("LoRa.SendBytes", { id: 100, data: btoa(messaggio) },
    function(res, err, errMsg) {
      if (err) {
        print("Errore trasmissione:", errMsg);
        _gestisciMancatoAck();
        return;
      }
      print("Trasmesso: " + messaggio + ". Attendo POMPA_ON (" + CFG_ACK_TIMEOUT + "s)...");
      Timer.set(CFG_ACK_TIMEOUT * 1000, false, function() {
        if (ackAtteso) _gestisciMancatoAck();
      });
    }
  );
}

function _gestisciMancatoAck() {
  if (!ackAtteso) return;
  contatoreRetry++;
  if (contatoreRetry < CFG_MAX_RETRY) {
    print("POMPA_ON non ricevuto. Nuovo tentativo " + (contatoreRetry + 1) + "/" + CFG_MAX_RETRY + "...");
    Timer.set(2000, false, _trasmettAccendi);
  } else {
    print("ATTENZIONE: ACCENDI_POMPA non confermato da 1R dopo " + CFG_MAX_RETRY + " tentativi.");
    inviaNtfy("⚠️ Avvio pompa non confermato da 1R!");
    ackAtteso = false;
  }
}

// ------------------------------------------------
// HEARTBEAT
// ------------------------------------------------
function inviaPing() {
  if (pingInCorso) {
    print("Ping gia in corso, attendo verificaPong.");
    return;
  }
  pingInCorso  = true;
  pongRicevuto = false;
  print("HEARTBEAT: invio PING a 1R...");

  Shelly.call("LoRa.SendBytes", { id: 100, data: btoa("PING") },
    function(res, err, msg) {
      if (err) print("Errore invio PING:", msg);
    }
  );

  timerVerifica = Timer.set(CFG_PING_TIMEOUT * 1000, false, verificaPong);
}

function verificaPong() {
  timerVerifica = null;
  pingInCorso   = false;

  if (pongRicevuto) {
    let erOffline = !is1ROnline;
    is1ROnline    = true;
    print("PONG ricevuto: 1R operativo.");

    if (modalitaAlert) {
      modalitaAlert  = false;
      contatoreAlert = 0;
      Shelly.call("Boolean.Set", { id: 200, value: false });
      print("Allarme resettato. 1R di nuovo online.");

      isPompaOn = false;
      if (timerPompa !== null) {
        Timer.clear(timerPompa);
        timerPompa = null;
        print("Stato pompa sincronizzato: OFF (riavvio 1R).");
      }

      if (CFG_NOTIFICA_RIPRISTINO) inviaNtfy("Controllo corrente: OK");
    }

    if (erOffline && comandoPendente) {
      comandoPendente = false;
      print("Esecuzione comando pendente: ACCENDI_POMPA.");
      Timer.set(3000, false, inviaAccendi);
    }

    if (verificaAvvio < CFG_PING_VERIFICA_COUNT) {
      verificaAvvio++;
      print("Verifica avvio " + verificaAvvio + "/" + CFG_PING_VERIFICA_COUNT + ": OK. Prossimo ping tra " + CFG_PING_VERIFICA + "s.");
      timerPing = Timer.set(CFG_PING_VERIFICA * 1000, false, inviaPing);
    } else {
      timerPing = Timer.set(CFG_PING_NORMALE * 1000, false, inviaPing);
    }

  } else {
    is1ROnline = false;

    if (!modalitaAlert) {
      modalitaAlert  = true;
      contatoreAlert = 0;
      print("ATTENZIONE: 1R non risponde. Modalita allarme attiva.");
    }

    contatoreAlert++;
    print("Tentativi falliti: " + contatoreAlert + "/" + CFG_MAX_ALERT);

    if (contatoreAlert >= CFG_MAX_ALERT) {
      print("ALLARME: 1R offline!");
      Shelly.call("Boolean.Set", { id: 200, value: true });
      inviaNtfy("⚠️⚡️Controllo corrente⚡️⚠️");
      modalitaAlert  = false;
      contatoreAlert = 0;
      timerPing = Timer.set(CFG_PING_NORMALE * 1000, false, inviaPing);
    } else {
      timerPing = Timer.set(CFG_PING_ALERT * 1000, false, inviaPing);
    }
  }
}

print("Sistema avviato. Primo ping tra " + CFG_PING_AVVIO + " secondi.");
timerPing = Timer.set(CFG_PING_AVVIO * 1000, false, inviaPing);

// ------------------------------------------------
// RICEZIONE MESSAGGI LoRa
// ------------------------------------------------
Shelly.addEventHandler(function(event) {
  if (!event || event.name !== "lora" || event.id !== 100) return;
  if (!event.info || !event.info.data) return;

  let msg = atob(event.info.data);
  print("Ricevuto via LoRa:", msg);

  if (msg === "PONG") {
    pongRicevuto = true;
    print("PONG confermato da 1R.");
    if (timerVerifica !== null) {
      Timer.clear(timerVerifica);
      timerVerifica = null;
      verificaPong();
    }
    return;
  }

  if (msg === "POMPA_ON") {
    if (ackAtteso) {
      ackAtteso      = false;
      contatoreRetry = 0;
      print("POMPA_ON confermato: pompa avviata su 1R.");
      inviaNtfy("💧💧💧 Elettropompa accesa per " + CFG_DURATA_POMPA + " secondi! 💧💧💧");
    }
    return;
  }

  if (msg === "POMPA_OFF") {
    print("POMPA_OFF confermato da 1R.");
    return;
  }
});

// ------------------------------------------------
// GESTIONE INPUT SENSORE / PULSANTE (switch:0)
// ------------------------------------------------
Shelly.addStatusHandler(function(event) {
  if (event.component !== "switch:0") return;
  if (event.delta.output !== true) return;

  if (isLocked) {
    Shelly.call("Switch.Set", { id: 0, on: false });
    print("Input ignorato: pausa di sicurezza attiva.");
    return;
  }

  isLocked = true;
  Shelly.call("Switch.Set", { id: 0, on: false });

  if (!is1ROnline) {
    if (!isPompaOn && !comandoPendente) {
      comandoPendente = true;
      print("1R non raggiungibile. Comando ACCENDI in attesa del ripristino.");
      inviaNtfy("⏳ Avvio pompa in attesa: 1R non raggiungibile.");
    } else if (comandoPendente) {
      comandoPendente = false;
      print("Comando pendente annullato.");
      inviaNtfy("Avvio pompa annullato.");
    } else {
      print("1R non raggiungibile. Comando SPEGNI ignorato.");
    }
    Timer.set(10000, false, function() {
      isLocked = false;
      print("Pausa di sicurezza terminata. Sistema pronto.");
    });
    return;
  }

  if (isPompaOn) {
    let msg = "SPEGNI_POMPA";
    isPompaOn = false;
    ackAtteso = false;
    if (timerPompa !== null) { Timer.clear(timerPompa); timerPompa = null; }
    print("Invio SPEGNI_POMPA.");
    Shelly.call("LoRa.SendBytes", { id: 100, data: btoa(msg) },
      function(res, err, errMsg) {
        if (err) print("Errore trasmissione:", errMsg);
        else print("Trasmesso con successo:", msg);
      }
    );
  } else {
    inviaAccendi();
    return;
  }

  Timer.set(10000, false, function() {
    isLocked = false;
    print("Pausa di sicurezza terminata. Sistema pronto.");
  });
});
```

</details>

<details>
<summary><strong>📜 Script 1R — Ricevente (v7, definitivo)</strong> (clicca per espandere)</summary>

```javascript
// ================================================
// SCRIPT 1R — Ricevente (versione finale, in uso con 1T v7)
// Shelly 1 PM Gen4 + LoRa Add-on
// ================================================

print("Script 1R attivo. In ascolto...");

let timerSpegnimento = null;

Shelly.addEventHandler(function(event) {
  if (!event || event.name !== "lora" || event.id !== 100) return;
  if (!event.info || !event.info.data) return;

  let msg = atob(event.info.data);
  print("Messaggio ricevuto:", msg);

  // ---- PING: rispondi con PONG ----
  if (msg === "PING") {
    Shelly.call("LoRa.SendBytes", { id: 100, data: btoa("PONG") },
      function(res, err, errMsg) {
        if (err) print("Errore invio PONG:", errMsg);
        else print("PONG inviato a 1T.");
      }
    );
    return;
  }

  // ---- ACCENDI_POMPA[:durata] ----
  if (msg.indexOf("ACCENDI_POMPA") === 0) {
    let durata = 400;
    let sep = msg.indexOf(":");
    if (sep !== -1) {
      let d = parseInt(msg.slice(sep + 1));
      if (!isNaN(d) && d > 0) durata = d;
    }
    print("Accensione pompa per " + durata + " secondi.");

    if (timerSpegnimento !== null) {
      Timer.clear(timerSpegnimento);
      timerSpegnimento = null;
    }

    Shelly.call("Switch.Set", { id: 0, on: true });

    timerSpegnimento = Timer.set(durata * 1000, false, function() {
      print("Tempo scaduto. Spegnimento automatico.");
      Shelly.call("Switch.Set", { id: 0, on: false });
      timerSpegnimento = null;
    });

    // Invia conferma ACK a 1T
    Timer.set(500, false, function() {
      Shelly.call("LoRa.SendBytes", { id: 100, data: btoa("POMPA_ON") },
        function(res, err, errMsg) {
          if (err) print("Errore invio POMPA_ON:", errMsg);
          else print("POMPA_ON inviato a 1T.");
        }
      );
    });
    return;
  }

  // ---- SPEGNI_POMPA ----
  if (msg === "SPEGNI_POMPA") {
    print("Comando di spegnimento ricevuto.");
    if (timerSpegnimento !== null) {
      Timer.clear(timerSpegnimento);
      timerSpegnimento = null;
    }
    Shelly.call("Switch.Set", { id: 0, on: false });

    // Invia conferma ACK a 1T
    Timer.set(500, false, function() {
      Shelly.call("LoRa.SendBytes", { id: 100, data: btoa("POMPA_OFF") },
        function(res, err, errMsg) {
          if (err) print("Errore invio POMPA_OFF:", errMsg);
          else print("POMPA_OFF inviato a 1T.");
        }
      );
    });
    return;
  }

  print("Messaggio non riconosciuto:", msg);
});
```

</details>

---

### L'esperimento del tubo trasparente (e i vasi comunicanti)

Un dettaglio che vale la pena raccontare, perché spiega perché nelle versioni intermedie il timer della pompa era salito da 400 a **410 secondi**.

A un certo punto avevo provato a **spostare il sensore** dalla parete del deposito al **tubo trasparente esterno** che serve a controllare a vista il livello dell'acqua — quello che funziona secondo il vecchio, validissimo principio dei **vasi comunicanti**. Con il sensore in quella posizione era stato necessario allungare il timer di 10 secondi (da 400 a 410) per compensare i tempi.

Ma si erano verificati alcuni malfunzionamenti, dovuti forse al **diametro ridotto del tubo** (circa 3 cm), a **eventuali residui** al suo interno, o alla necessità di **regolare ulteriormente la sensibilità** del sensore. Così ho preferito **riportare il sensore alla sua vecchia posizione**, sulla parete del deposito, dove aveva sempre funzionato — e continua a funzionare — bene. Con il ritorno alla posizione originale, il timer è tornato al suo valore collaudato di **400 secondi**.

Un piccolo esempio di come, a volte, la soluzione migliore non è la più "ingegnosa", ma quella che la realtà ha già dimostrato affidabile.

---

### Nota sulle funzioni Shelly usate

Per chi volesse orientarsi, ecco le funzioni dell'API Shelly che compaiono negli script:

| Funzione | A cosa serve |
|---|---|
| `LoRa.SendBytes` | Invia un messaggio (codificato in base64) via radio LoRa |
| `Shelly.addEventHandler` | Intercetta gli eventi in arrivo, incluso `"lora"` |
| `Shelly.addStatusHandler` | Reagisce ai cambi di stato di un componente (es. `switch:0`) |
| `Switch.Set` | Accende/spegne l'uscita del relè |
| `HTTP.POST` | Invia la notifica al servizio ntfy |
| `Boolean.Set` | Imposta una variabile booleana virtuale (stato d'allarme) |
| `btoa` / `atob` | Codifica/decodifica base64 dei messaggi |

> ⚙️ **Nota:** i messaggi LoRa viaggiano codificati in base64 (`btoa` in invio, `atob` in ricezione). È il motivo per cui, quando un pacchetto arriva corrotto, nel log può comparire una stringa illeggibile come `PO^`.

---

<!-- ELENCO IMMAGINI — DEFINIZIONI DEI RIFERIMENTI -->

[Shelly_Plus_1PM.webp]: immagini/pompa/Shelly_Plus_1PM.webp
[shelly-1pm-gen4_con_fili.webp]: immagini/pompa/shelly-1pm-gen4_con_fili.webp
[shelly-lora-add-on-accoppiato.webp]: immagini/pompa/shelly-lora-add-on-accoppiato.webp
[Quadro_con_prese.webp]: immagini/pompa/Quadro_con_prese.webp
[Morsettiere.webp]: immagini/pompa/Morsettiere.webp
[Abat-jour_Lampadina.webp]: immagini/pompa/Abat-jour_Lampadina.webp
[Cavi_prolunghe_per_prove.webp]: immagini/pompa/Cavi_prolunghe_per_prove.webp
[Prolunga-elettrica_con_puntalini.webp]: immagini/pompa/Prolunga-elettrica_con_puntalini.webp
[Sensore_con_puntalini_e_Addon.webp]: immagini/pompa/Sensore_con_puntalini_e_Addon.webp
[Addon_sensore_collegamenti.webp]: immagini/pompa/Addon_sensore_collegamenti.webp
[shelly-plus-addon_con_fili.webp]: immagini/pompa/shelly-plus-addon_con_fili.webp
[Shelly_Addon_sensore_livello.webp]: immagini/pompa/Shelly_Addon_sensore_livello.webp
[Sensore_su_deposito.webp]: immagini/pompa/Sensore_su_deposito.webp
[1T_collegato.webp]: immagini/pompa/1T_collegato.webp
[1R_collegamenti.webp]: immagini/pompa/1R_collegamenti.webp
[1T_LoRa_AddON.webp]: immagini/pompa/1T_LoRa_AddON.webp
[shelly-lora-add-on-pin-evidenti.webp]: immagini/pompa/shelly-lora-add-on-pin-evidenti.webp
[Scatola_esterna_1T.webp]: immagini/pompa/Scatola_esterna_1T.webp
[Distanza_1T_1R.webp]: immagini/pompa/Distanza_1T_1R.webp
[collage_tre_dispositivi.webp]: immagini/pompa/collage_tre_dispositivi.webp
[Snubber.webp]: immagini/pompa/Snubber.webp
[Caratteristiche_pompa.webp]: immagini/pompa/Caratteristiche_pompa.webp
[notifiche.webp]: immagini/pompa/notifiche.webp

<!-- FINE ELENCO IMMAGINI -->