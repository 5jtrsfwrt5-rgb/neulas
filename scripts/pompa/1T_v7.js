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
  // Imposta stato locale al primo tentativo
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
  if (!ackAtteso) return; // SPEGNI inviato nel frattempo: annulla retry
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
  if (!ackAtteso) return; // ACK già ricevuto nel frattempo
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

    // Esegui comando pendente alla prima riconnessione
    if (erOffline && comandoPendente) {
      comandoPendente = false;
      print("Esecuzione comando pendente: ACCENDI_POMPA.");
      Timer.set(3000, false, inviaAccendi);
    }

    // Pianifica prossimo ping
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

  // PONG: heartbeat
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

  // POMPA_ON: conferma accensione da 1R
  if (msg === "POMPA_ON") {
    if (ackAtteso) {
      ackAtteso      = false;
      contatoreRetry = 0;
      print("POMPA_ON confermato: pompa avviata su 1R.");
      inviaNtfy("💧💧💧 Elettropompa accesa per " + CFG_DURATA_POMPA + " secondi! 💧💧💧");
    }
    return;
  }

  // POMPA_OFF: conferma spegnimento da 1R (informativo)
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

  // 1R non confermato online
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

  // 1R online: comportamento normale
  if (isPompaOn) {
    let msg = "SPEGNI_POMPA";
    isPompaOn = false;
    ackAtteso = false; // annulla eventuale attesa ACK
    if (timerPompa !== null) { Timer.clear(timerPompa); timerPompa = null; }
    print("Invio SPEGNI_POMPA.");
    Shelly.call("LoRa.SendBytes", { id: 100, data: btoa(msg) },
      function(res, err, errMsg) {
        if (err) print("Errore trasmissione:", errMsg);
        else print("Trasmesso con successo:", msg);
      }
    );
  } else {
    inviaAccendi(); // il lock 30s è già impostato dentro inviaAccendi()
    return;         // esce senza impostare un secondo lock
  }

  // Lock 10s per il path SPEGNI (ACCENDI ha già il suo lock da 30s)
  Timer.set(10000, false, function() {
    isLocked = false;
    print("Pausa di sicurezza terminata. Sistema pronto.");
  });
});