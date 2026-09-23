// ================================================
// SCRIPT 1T — Trasmittente (v9.3)
// Shelly 1 PM Gen4 + LoRa Add-on — FW >= 2.0.0
// Novità v9.3:
//  - Temperatura locale di 1T letta da switch:0 e loggata
//    insieme a quella di 1R in un'unica riga:
//    "Temperature: 1T: 54.6 °C | 1R: 51.3 °C"
//    (stampata dopo "PONG ricevuto: 1R operativo.")
//  - Soglie di allarme temperatura SEPARATE:
//    CFG_TEMP_MAX_1T e CFG_TEMP_MAX_1R (0 = disattivata),
//    notifiche ntfy distinte, isteresi di rientro 5 °C
//  - Il controllo temperatura di 1T avviene ad ogni ciclo
//    di heartbeat, anche se 1R non risponde
//  - Nessuna modifica richiesta su 1R (resta v9.2)
// ================================================

// === PARAMETRI CONFIGURABILI ===
// §§§§§ durata (secondi) di attivazione della pompa: viene trasmessa
//       automaticamente a 1R, che NON va mai modificato §§§§§
let CFG_DURATA_POMPA        = 400;
let CFG_PING_AVVIO          = 10;
let CFG_PING_VERIFICA       = 10;
let CFG_PING_VERIFICA_COUNT = 3;
let CFG_PING_NORMALE        = 1200;   // §§§ produzione: 1200 (20 min) §§§
let CFG_PING_ALERT          = 25;   // §§§ produzione: 30 (1/2 min) compreso timeout §§§
let CFG_PING_POMPA          = 10;   // §§§ produzione: 10 (ping rapidi SOLO a pompa accesa) §§§
let CFG_PING_TIMEOUT        = 5;
let CFG_MAX_ALERT           = 15;   // ping falliti prima dell'allarme corrente generale
let CFG_MAX_ALERT_POMPA     = 3;    // ping falliti prima dell'avviso "1R muto a pompa accesa"
let CFG_ACK_TIMEOUT         = 5;
let CFG_MAX_RETRY           = 10;

// Margine (s) di tolleranza per considerare "completato" un ciclo
// verificato via PONG:OFF (copre latenze radio e retry del comando)
let CFG_MARGINE_FINE        = 20;

// Controllo assorbimento pompa (0 = disattivato).
// §§§ a fine collaudo: imposta ~60-70% della potenza nominale della pompa,
//     es. pompa da 750 W -> CFG_POTENZA_MIN = 450 §§§
let CFG_POTENZA_MIN         = 1000;    // watt minimi attesi a pompa accesa
let CFG_POTENZA_CONTEGGIO   = 2;    // letture basse consecutive prima della notifica

// v9.3 — Allarmi temperatura SEPARATI (0 = disattivato).
// §§§ es. 70 = avviso oltre 70 °C; rientro con isteresi di 5 °C §§§
let CFG_TEMP_MAX_1T         = 0;    // soglia per la temperatura locale di 1T
let CFG_TEMP_MAX_1R         = 0;    // soglia per la temperatura riferita da 1R

// §§§§§ il tuo topic ntfy §§§§§
let NTFY_URL                 = "https://ntfy.sh/******"; // §§§§§ sostituire ****** con il tuo topic ntfy §§§§§
let CFG_NOTIFICA_RIPRISTINO  = false; // false = nessuna notifica | true = notifica "Controllo corrente: OK"
let CFG_NOTIFICA_SPEGNIMENTO = true;  // true = notifica a spegnimento pompa

// === PARAMETRI LoRa / SheLR ===
let CFG_LORA_ID     = 100;
let CFG_ADDR_LOCALE = "000000A1";
let CFG_ADDR_1R     = "000000B1";

// §§§§§ Chiave IDENTICA, carattere per carattere, a quella di 1R §§§§§
let CFG_LORA_KEY    = "****************"; // §§§§§ sostituire con la chiave LoRa condivisa con 1R §§§§§
let CFG_LORA_KEY_ID = 1;

// === STATO POMPA ===
let isLocked        = false;
let isPompaOn       = false;
let timerPompa      = null;
let comandoPendente = false;

// === STATO ESITO CICLO ===
let esitoCicloPendente = false; // ciclo avviato, esito non ancora confermato
let fineCiclo          = 0;     // uptime (s) previsto di fine ciclo (0 = nessuno)

// === STATO ACK ===
let ackAtteso            = false;
let contatoreRetry       = 0;
let ackSpegniAtteso      = false;
let contatoreRetrySpegni = 0;

// === STATO HEARTBEAT ===
let pongRicevuto   = false;
let pingInCorso    = false;
let is1ROnline     = false;
let modalitaAlert  = false;
let contatoreAlert = 0;
let timerPing      = null;
let timerVerifica  = null;
let verificaAvvio  = 0;

// === STATO ALLARMI POMPA ===
let allarmePompaInviato   = false;  // "1R muto a pompa accesa" gia notificato
let contatorePotenzaBassa = 0;
let allarmePotenzaInviato = false;

// === STATO TEMPERATURE (v9.3) ===
let ultimaTemp1R        = "";     // ultima temperatura riferita da 1R (stringa, "" = non disponibile)
let allarmeTemp1TInviato = false;
let allarmeTemp1RInviato = false;

// ------------------------------------------------
// UTILITÀ
// ------------------------------------------------
function uptime() {
  let sys = Shelly.getComponentStatus("sys");
  return (sys && sys.uptime) ? sys.uptime : 0;
}

// ------------------------------------------------
// TEMPERATURE (v9.3)
// ------------------------------------------------
// Formatta tC con un decimale senza artefatti float->stringa
function formattaTemp(tC) {
  let d = Math.round(tC * 10);
  let neg = d < 0;
  if (neg) d = -d;
  let s = JSON.stringify(Math.floor(d / 10)) + "." + JSON.stringify(d % 10);
  return neg ? "-" + s : s;
}

// Temperatura locale di 1T (stringa, "" se non disponibile)
function leggiTemp1T() {
  let sw = Shelly.getComponentStatus("switch:0");
  if (sw && sw.temperature && typeof sw.temperature.tC === "number") {
    return formattaTemp(sw.temperature.tC);
  }
  return "";
}

// Controllo soglia generico: nome = "1T" | "1R"
function controllaSogliaTemp(nome, tStr, soglia, allarmeInviato) {
  if (soglia <= 0 || tStr === "") return allarmeInviato;
  let t = parseInt(tStr);
  if (isNaN(t)) return allarmeInviato;
  if (t >= soglia && !allarmeInviato) {
    inviaNtfy("🌡⚠️ Temperatura di " + nome + " elevata: " + tStr + " °C (soglia " + JSON.stringify(soglia) + " °C).");
    return true;
  }
  if (allarmeInviato && t <= soglia - 5) {
    if (CFG_NOTIFICA_RIPRISTINO) inviaNtfy("🌡 Temperatura di " + nome + " rientrata: " + tStr + " °C.");
    return false;
  }
  return allarmeInviato;
}

// Riga di log unificata + verifica soglie (v9.3)
function logTemperature() {
  let t1t = leggiTemp1T();
  let s1t = (t1t !== "") ? t1t + " °C" : "n/d";
  let s1r = (ultimaTemp1R !== "") ? ultimaTemp1R + " °C" : "n/d";
  print("Temperature: 1T: " + s1t + " | 1R: " + s1r);

  allarmeTemp1TInviato = controllaSogliaTemp("1T", t1t,         CFG_TEMP_MAX_1T, allarmeTemp1TInviato);
  allarmeTemp1RInviato = controllaSogliaTemp("1R", ultimaTemp1R, CFG_TEMP_MAX_1R, allarmeTemp1RInviato);
}

// Solo controllo soglia 1T (usato quando 1R non risponde) (v9.3)
function controllaTemp1T() {
  allarmeTemp1TInviato = controllaSogliaTemp("1T", leggiTemp1T(), CFG_TEMP_MAX_1T, allarmeTemp1TInviato);
}

// ------------------------------------------------
// CONFIGURAZIONE SheLR
// ------------------------------------------------
function configuraSheLR() {
  Shelly.call("LoRa.SetConfig", {
    id: CFG_LORA_ID,
    config: {
      shelr: {
        lr_addr:   CFG_ADDR_LOCALE,
        tx_key_id: CFG_LORA_KEY_ID,
        key1:      CFG_LORA_KEY,
        accept:    ["user"]
      }
    }
  }, function(res, err, errMsg) {
    if (err) print("ERRORE config SheLR:", errMsg);
    else     print("SheLR configurato. Addr locale:", CFG_ADDR_LOCALE, "-> peer 1R:", CFG_ADDR_1R);
  });
}

// ------------------------------------------------
// INVIO LoRa CIFRATO
// ------------------------------------------------
function loraSend(testo, callback) {
  Shelly.call("LoRa.Send", {
    id:      CFG_LORA_ID,
    lr_addr: CFG_ADDR_1R,
    data:    btoa(testo)
  }, callback);
}

// ------------------------------------------------
// UTILITÀ — data/ora GG/MM/AA - HH:MM:SS
// ------------------------------------------------
function num2(n) {
  return (n < 10 ? "0" : "") + JSON.stringify(n);
}

function getOrario() {
  let sys = Shelly.getComponentStatus("sys");
  if (!sys || !sys.unixtime) return "";
  let ts = sys.unixtime;

  let off = 0;
  if (sys.time) {
    let locMin = parseInt(sys.time.slice(0, 2)) * 60 + parseInt(sys.time.slice(3, 5));
    let utcMin = Math.floor(ts / 60) % 1440;
    off = locMin - utcMin;
    if (off >  720) off -= 1440;
    if (off < -720) off += 1440;
  }
  let t = ts + off * 60;

  let sod = t % 86400;
  let hh = Math.floor(sod / 3600);
  let mi = Math.floor((sod % 3600) / 60);
  let ss = sod % 60;

  let z   = Math.floor(t / 86400) + 719468;
  let era = Math.floor(z / 146097);
  let doe = z - era * 146097;
  let yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  let y   = yoe + era * 400;
  let doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  let mp  = Math.floor((5 * doy + 2) / 153);
  let d   = doy - Math.floor((153 * mp + 2) / 5) + 1;
  let m   = (mp < 10) ? mp + 3 : mp - 9;
  if (m <= 2) y = y + 1;

  return "[" + num2(d) + "/" + num2(m) + "/" + num2(y % 100) +
         " - " + num2(hh) + ":" + num2(mi) + ":" + num2(ss) + "] ";
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
// GESTIONE TIMER LOCALE POMPA
// ------------------------------------------------
function impostaTimerLocale(secondi) {
  if (timerPompa !== null) Timer.clear(timerPompa);
  timerPompa = Timer.set(secondi * 1000, false, function() {
    isPompaOn  = false;
    timerPompa = null;
    print("Timer pompa scaduto (sync locale 1T).");
    // esito non ancora confermato -> ping di verifica anticipato
    if (esitoCicloPendente && !pingInCorso && !ackAtteso && !ackSpegniAtteso) {
      print("Esito ciclo da confermare: ping di verifica anticipato.");
      pianificaPing(CFG_PING_TIMEOUT);
    }
  });
}

function azzeraStatoPompa() {
  isPompaOn = false;
  if (timerPompa !== null) {
    Timer.clear(timerPompa);
    timerPompa = null;
  }
  esitoCicloPendente    = false;
  fineCiclo             = 0;
  allarmePompaInviato   = false;
  contatorePotenzaBassa = 0;
  allarmePotenzaInviato = false;
}

// ------------------------------------------------
// PIANIFICAZIONE PING (ritmo diverso a pompa accesa)
// ------------------------------------------------
function pianificaPing(secondi) {
  if (timerPing !== null) Timer.clear(timerPing);
  timerPing = Timer.set(secondi * 1000, false, inviaPing);
}

function intervalloPingNormale() {
  return isPompaOn ? CFG_PING_POMPA : CFG_PING_NORMALE;
}

function intervalloPingAlert() {
  // A pompa accesa (o esito ciclo pendente) l'alert non deve mai
  // essere piu lento del ritmo pompa
  return ((isPompaOn || esitoCicloPendente) && CFG_PING_POMPA < CFG_PING_ALERT)
         ? CFG_PING_POMPA : CFG_PING_ALERT;
}

// ------------------------------------------------
// PROVA DI VITA: qualsiasi messaggio valido da 1R
// dimostra che e' online (riduce i falsi allarmi da collisione)
// ------------------------------------------------
function segnaVivo() {
  is1ROnline = true;
  if (pingInCorso) pongRicevuto = true; // il PONG puo' essersi perso in collisione
}

// ------------------------------------------------
// SINCRONIZZAZIONE STATO REALE (da PONG:ON/OFF di 1R)
// ------------------------------------------------
function sincronizzaStato(statoOn, residuo) {
  if (ackAtteso || ackSpegniAtteso) {
    print("Sync stato rinviata: comando in corso.");
    return;
  }

  if (statoOn) {
    if (!isPompaOn) {
      isPompaOn = true;
      print("SYNC: 1R segnala pompa ON (residuo " + JSON.stringify(residuo) + "s). Stato locale allineato su ON.");
    }
    let sec = (residuo > 0) ? residuo : 1;
    fineCiclo          = uptime() + sec;  // riferimento sempre aggiornato dal dato reale di 1R
    esitoCicloPendente = true;
    impostaTimerLocale(sec + 2);

    // 1R risponde di nuovo dopo l'allarme -> ciclo ancora in corso
    if (allarmePompaInviato) {
      allarmePompaInviato = false;
      inviaNtfy("📡💧 Comunicazione con 1R ripristinata: pompa ancora in funzione (" +
                JSON.stringify(sec) + "s residui).");
    }

  } else {
    if (esitoCicloPendente) {
      // pompa OFF con esito pendente -> completato o interrotto?
      let mancanti   = fineCiclo - uptime();
      let completato = (fineCiclo > 0) && (mancanti <= CFG_MARGINE_FINE);
      let eraAllarme = allarmePompaInviato;
      azzeraStatoPompa();
      print("SYNC: 1R segnala pompa OFF. Stato locale allineato su OFF.");

      if (completato) {
        if (eraAllarme) {
          inviaNtfy("✅💧 Comunicazione con 1R ripristinata: il ciclo pompa risulta COMPLETATO (tempo previsto trascorso, verificato via PONG).");
        } else if (CFG_NOTIFICA_SPEGNIMENTO) {
          inviaNtfy("✅ Elettropompa spenta: ciclo completato (conferma diretta persa, verificato via PONG).");
        }
      } else {
        inviaNtfy("⚠️ Ciclo pompa interrotto prima del termine (mancavano ~" +
                  JSON.stringify(mancanti) + "s): probabile interruzione di corrente su 1R.");
      }

    } else if (isPompaOn) {
      azzeraStatoPompa();
      print("SYNC: 1R segnala pompa OFF. Stato locale allineato su OFF.");
    }
  }
}

// ------------------------------------------------
// CONTROLLO ASSORBIMENTO POMPA
// ------------------------------------------------
function controllaPotenza(watt) {
  if (CFG_POTENZA_MIN <= 0 || watt < 0 || !isPompaOn) return;
  if (watt < CFG_POTENZA_MIN) {
    contatorePotenzaBassa++;
    print("Assorbimento pompa basso: " + JSON.stringify(watt) + " W (" +
          JSON.stringify(contatorePotenzaBassa) + "/" + JSON.stringify(CFG_POTENZA_CONTEGGIO) + ").");
    if (contatorePotenzaBassa >= CFG_POTENZA_CONTEGGIO && !allarmePotenzaInviato) {
      allarmePotenzaInviato = true;
      inviaNtfy("⚠️ Pompa comandata ON ma assorbimento anomalo (" + JSON.stringify(watt) + " W): possibile guasto pompa!");
    }
  } else {
    contatorePotenzaBassa = 0;
  }
}

// ------------------------------------------------
// INVIO ACCENDI CON RETRY
// ------------------------------------------------
function inviaAccendi() {
  ackSpegniAtteso = false;
  isPompaOn = true;
  allarmePompaInviato   = false;
  contatorePotenzaBassa = 0;
  allarmePotenzaInviato = false;
  impostaTimerLocale(CFG_DURATA_POMPA);

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
  let messaggio = "ACCENDI_POMPA:" + JSON.stringify(CFG_DURATA_POMPA);
  print("Invio ACCENDI_POMPA cifrato (tentativo " + JSON.stringify(contatoreRetry + 1) + "/" + JSON.stringify(CFG_MAX_RETRY) + ").");

  loraSend(messaggio, function(res, err, errMsg) {
    if (err) {
      print("Errore trasmissione:", errMsg);
      _gestisciMancatoAck();
      return;
    }
    print("Trasmesso: " + messaggio + ". Attendo POMPA_ON (" + JSON.stringify(CFG_ACK_TIMEOUT) + "s)...");
    Timer.set(CFG_ACK_TIMEOUT * 1000, false, function() {
      if (ackAtteso) _gestisciMancatoAck();
    });
  });
}

function _gestisciMancatoAck() {
  if (!ackAtteso) return;
  contatoreRetry++;
  if (contatoreRetry < CFG_MAX_RETRY) {
    print("POMPA_ON non ricevuto. Nuovo tentativo " + JSON.stringify(contatoreRetry + 1) + "/" + JSON.stringify(CFG_MAX_RETRY) + "...");
    Timer.set(2000, false, _trasmettAccendi);
  } else {
    print("ATTENZIONE: ACCENDI_POMPA non confermato da 1R dopo " + JSON.stringify(CFG_MAX_RETRY) + " tentativi.");
    inviaNtfy("⚠️ Avvio pompa non confermato da 1R!");
    ackAtteso = false;
    azzeraStatoPompa();
  }
}

// ------------------------------------------------
// INVIO SPEGNI CON RETRY
// ------------------------------------------------
function inviaSpegni() {
  ackAtteso            = false;
  ackSpegniAtteso      = true;
  contatoreRetrySpegni = 0;
  azzeraStatoPompa();
  _trasmettiSpegni();
}

function _trasmettiSpegni() {
  if (!ackSpegniAtteso) return;
  print("Invio SPEGNI_POMPA cifrato (tentativo " + JSON.stringify(contatoreRetrySpegni + 1) + "/" + JSON.stringify(CFG_MAX_RETRY) + ").");

  loraSend("SPEGNI_POMPA", function(res, err, errMsg) {
    if (err) {
      print("Errore trasmissione:", errMsg);
      _gestisciMancatoAckSpegni();
      return;
    }
    print("Trasmesso: SPEGNI_POMPA. Attendo POMPA_OFF (" + JSON.stringify(CFG_ACK_TIMEOUT) + "s)...");
    Timer.set(CFG_ACK_TIMEOUT * 1000, false, function() {
      if (ackSpegniAtteso) _gestisciMancatoAckSpegni();
    });
  });
}

function _gestisciMancatoAckSpegni() {
  if (!ackSpegniAtteso) return;
  contatoreRetrySpegni++;
  if (contatoreRetrySpegni < CFG_MAX_RETRY) {
    print("POMPA_OFF non ricevuto. Nuovo tentativo " + JSON.stringify(contatoreRetrySpegni + 1) + "/" + JSON.stringify(CFG_MAX_RETRY) + "...");
    Timer.set(2000, false, _trasmettiSpegni);
  } else {
    print("ATTENZIONE: SPEGNI_POMPA non confermato da 1R dopo " + JSON.stringify(CFG_MAX_RETRY) + " tentativi.");
    inviaNtfy("⚠️ Spegnimento pompa NON confermato da 1R! Verificare la pompa.");
    ackSpegniAtteso = false;
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
  // non contendere la radio a uno scambio comando in corso
  if (ackAtteso || ackSpegniAtteso) {
    print("PING rinviato: scambio comando in corso.");
    pianificaPing(CFG_PING_TIMEOUT);
    return;
  }

  pingInCorso  = true;
  pongRicevuto = false;
  print("HEARTBEAT: invio PING cifrato a 1R...");

  loraSend("PING", function(res, err, msg) {
    if (err) print("Errore invio PING:", msg);
  });

  timerVerifica = Timer.set(CFG_PING_TIMEOUT * 1000, false, verificaPong);
}

function verificaPong() {
  timerVerifica = null;
  pingInCorso   = false;

  if (pongRicevuto) {
    let erOffline = !is1ROnline;
    is1ROnline    = true;
    allarmePompaInviato = false;
    print("PONG ricevuto: 1R operativo.");

    // v9.3: riga temperature unificata (1T locale + 1R dal PONG)
    // e verifica soglie di allarme separate
    logTemperature();

    if (modalitaAlert) {
      modalitaAlert  = false;
      contatoreAlert = 0;
      Shelly.call("Boolean.Set", { id: 200, value: false });
      print("Allarme resettato. 1R di nuovo online.");
      if (CFG_NOTIFICA_RIPRISTINO) inviaNtfy("Controllo corrente: OK");
    }

    if (erOffline && comandoPendente) {
      comandoPendente = false;
      print("Esecuzione comando pendente: ACCENDI_POMPA.");
      Timer.set(3000, false, inviaAccendi);
    }

    if (verificaAvvio < CFG_PING_VERIFICA_COUNT) {
      verificaAvvio++;
      print("Verifica avvio " + JSON.stringify(verificaAvvio) + "/" + JSON.stringify(CFG_PING_VERIFICA_COUNT) + ": OK. Prossimo ping tra " + JSON.stringify(CFG_PING_VERIFICA) + "s.");
      pianificaPing(CFG_PING_VERIFICA);
    } else {
      pianificaPing(intervalloPingNormale());
    }

  } else {
    is1ROnline = false;

    // v9.3: anche senza risposta di 1R, sorveglia la temperatura di 1T
    controllaTemp1T();

    if (!modalitaAlert) {
      modalitaAlert  = true;
      contatoreAlert = 0;
      print("ATTENZIONE: 1R non risponde. Modalita allarme attiva.");
    }

    contatoreAlert++;
    print("Tentativi falliti: " + JSON.stringify(contatoreAlert) + "/" + JSON.stringify(CFG_MAX_ALERT));

    // avviso rapido dedicato quando la pompa dovrebbe essere accesa
    if (isPompaOn && !allarmePompaInviato && contatoreAlert >= CFG_MAX_ALERT_POMPA) {
      allarmePompaInviato = true;
      print("AVVISO: 1R non risponde a pompa accesa.");
      inviaNtfy("⚠️💧 1R non risponde durante il funzionamento della pompa! Possibile black-out durante il ciclo.");
    }

    if (contatoreAlert >= CFG_MAX_ALERT) {
      print("ALLARME: 1R offline!");
      Shelly.call("Boolean.Set", { id: 200, value: true });
      inviaNtfy("⚠️⚡️Controllo corrente⚡️⚠️");
      modalitaAlert  = false;
      contatoreAlert = 0;
      pianificaPing(intervalloPingNormale());
    } else {
      pianificaPing(intervalloPingAlert());
    }
  }
}

// ------------------------------------------------
// RICEZIONE MESSAGGI LoRa
// ------------------------------------------------
Shelly.addEventHandler(function(event) {
  if (!event || event.id !== CFG_LORA_ID || !event.info) return;
  if (event.info.event !== "user_rx") return;
  if (!event.info.data) return;

  let msg = atob(event.info.data);
  print("Ricevuto via SheLR (mittente " + JSON.stringify(event.info.sender) +
        ", RSSI " + JSON.stringify(event.info.rssi) + "):", msg);

  // ---- PONG (con stato reale, potenza e temperatura) ----
  // Formati: "PONG:OFF[:<temp>]", "PONG:ON:<residuo>[:<watt>[:<temp>]]",
  // "PONG" semplice (compatibilita: stato ignoto, nessuna sync).
  if (msg.indexOf("PONG") === 0) {
    pongRicevuto = true;
    print("PONG confermato da 1R.");

    // v9.3: la temperatura viene solo memorizzata qui;
    // la stampa avviene in verificaPong (riga unificata 1T+1R)
    ultimaTemp1R = "";

    if (msg.indexOf("PONG:OFF") === 0) {
      if (msg.length > 9) ultimaTemp1R = msg.slice(9);   // "PONG:OFF:" = 9 caratteri
      sincronizzaStato(false, 0);

    } else if (msg.indexOf("PONG:ON") === 0) {
      let residuo = 0;
      let watt    = -1;
      if (msg.length > 8) {                              // "PONG:ON:" = 8 caratteri
        // split manuale di "<residuo>[:<watt>[:<temp>]]"
        let campi = [];
        let resto = msg.slice(8);
        while (true) {
          let sep = resto.indexOf(":");
          if (sep === -1) { campi.push(resto); break; }
          campi.push(resto.slice(0, sep));
          resto = resto.slice(sep + 1);
        }
        if (campi.length > 0) {
          let r = parseInt(campi[0]);
          if (!isNaN(r) && r > 0) residuo = r;
        }
        if (campi.length > 1) {
          let w = parseInt(campi[1]);
          if (!isNaN(w) && w >= 0) watt = w;
        }
        if (campi.length > 2) ultimaTemp1R = campi[2];
      }
      sincronizzaStato(true, residuo);
      controllaPotenza(watt);
    }

    if (timerVerifica !== null) {
      Timer.clear(timerVerifica);
      timerVerifica = null;
      verificaPong();
    }
    return;
  }

  // ---- POMPA_ON: conferma accensione da 1R ----
  if (msg === "POMPA_ON") {
    segnaVivo();
    if (ackAtteso) {
      ackAtteso      = false;
      contatoreRetry = 0;
      // da ora l'esito del ciclo va tracciato fino a conferma
      esitoCicloPendente = true;
      fineCiclo          = uptime() + CFG_DURATA_POMPA;
      print("POMPA_ON confermato: pompa avviata su 1R.");
      inviaNtfy("💧💧💧 Elettropompa accesa per " + JSON.stringify(CFG_DURATA_POMPA) + " secondi! 💧💧💧");
      // passa subito al ritmo ping "pompa accesa"
      if (!pingInCorso) pianificaPing(CFG_PING_POMPA);
    }
    return;
  }

  // ---- POMPA_OFF: conferma spegnimento (manuale, automatico o failsafe) ----
  if (msg === "POMPA_OFF") {
    segnaVivo();
    let eraRichiesto = ackSpegniAtteso;
    ackSpegniAtteso      = false;
    contatoreRetrySpegni = 0;
    // eraCiclo copre anche la corsa temporale in cui il timer
    // locale e' appena scaduto ma l'esito era ancora pendente
    let eraCiclo = isPompaOn || esitoCicloPendente;
    azzeraStatoPompa();

    if (eraRichiesto) {
      print("POMPA_OFF confermato: spegnimento manuale eseguito su 1R.");
      if (CFG_NOTIFICA_SPEGNIMENTO) inviaNtfy("🛑 Elettropompa spenta manualmente.");
    } else {
      print("POMPA_OFF ricevuto da 1R (fine ciclo o failsafe). Stato locale OFF.");
      if (CFG_NOTIFICA_SPEGNIMENTO && eraCiclo) inviaNtfy("✅ Elettropompa spenta: ciclo completato.");
    }
    return;
  }

  print("Messaggio non riconosciuto:", msg);
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
    inviaSpegni();
  } else {
    inviaAccendi();
    return;
  }

  Timer.set(10000, false, function() {
    isLocked = false;
    print("Pausa di sicurezza terminata. Sistema pronto.");
  });
});

// === AVVIO ===
configuraSheLR();
print("Sistema avviato (v9.3, SheLR cifrato). Primo ping tra " + JSON.stringify(CFG_PING_AVVIO) + " secondi.");
timerPing = Timer.set(CFG_PING_AVVIO * 1000, false, inviaPing);