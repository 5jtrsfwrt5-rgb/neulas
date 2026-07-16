
Ogni ` ``` ` spezza il codice. Il dispositivo Shelly non riconoscerebbe più nulla.

---

## ✅ Soluzione: ti riscrivo i due file puliti

Copia **solo il codice qui sotto** (senza toccare nient'altro). Per ogni file: seleziona tutto il blocco JavaScript, copialo, incollalo in un file di testo **puro**, e salvalo con il nome indicato.

---

### File 1: `1T_v2.js`

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