// ================================================
// SCRIPT 1R — Ricevente (v9.1)
// Shelly 1 PM Gen4 + LoRa Add-on — FW >= 2.0.0
// Novità v9.1:
//  - PONG a pompa accesa: "PONG:ON:<residuo>:<watt>"
//    (potenza attiva misurata: 1R la riferisce soltanto,
//    la valutazione è fatta da 1T)
//  - ACCENDI_POMPA idempotente: un duplicato ricevuto a
//    pompa gia accesa NON azzera il timer, ma viene solo
//    ri-confermato con POMPA_ON (i duplicati sono retry di 1T)
//  - Nessun parametro configurabile: la durata arriva
//    sempre da 1T nel messaggio ACCENDI_POMPA:<sec>
// ================================================

// === PARAMETRI LoRa / SheLR (devono solo corrispondere a 1T) ===
let CFG_LORA_ID     = 100;
let CFG_ADDR_LOCALE = "000000B1";  // = CFG_ADDR_1R su 1T
let CFG_ADDR_1T     = "000000A1";  // = CFG_ADDR_LOCALE su 1T

// §§§§§ Chiave IDENTICA, carattere per carattere, a quella di 1T §§§§§
let CFG_LORA_KEY    = "****************"; // §§§§§ sostituire *************** con la chiave LoRa condivisa con 1T §§§§§
let CFG_LORA_KEY_ID = 1;

// === STATO ===
let timerSpegnimento = null;
let scadenzaPompa    = 0;   // uptime (s) a cui la pompa deve spegnersi

function uptime() {
  let sys = Shelly.getComponentStatus("sys");
  return (sys && sys.uptime) ? sys.uptime : 0;
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
    else     print("SheLR configurato. Addr locale:", CFG_ADDR_LOCALE, "-> peer 1T:", CFG_ADDR_1T);
  });
}

// ------------------------------------------------
// INVIO LoRa CIFRATO
// ------------------------------------------------
function loraSend(testo, callback) {
  Shelly.call("LoRa.Send", {
    id:      CFG_LORA_ID,
    lr_addr: CFG_ADDR_1T,
    data:    btoa(testo)
  }, function(res, err, errMsg) {
    if (err) print("Errore invio '" + testo + "':", errMsg);
    else     print("'" + testo + "' inviato a 1T (cifrato).");
    if (callback) callback(res, err, errMsg);
  });
}

// ------------------------------------------------
// SPEGNIMENTO POMPA (unico punto di spegnimento)
// ------------------------------------------------
function pompaOff(motivo, inviaConferma) {
  if (timerSpegnimento !== null) {
    Timer.clear(timerSpegnimento);
    timerSpegnimento = null;
  }
  scadenzaPompa = 0;
  Shelly.call("Switch.Set", { id: 0, on: false }, function(res, err, errMsg) {
    if (err) {
      print("ERRORE spegnimento pompa (" + motivo + "):", errMsg);
      return;
    }
    print("Pompa OFF (" + motivo + ").");
    if (inviaConferma) {
      Timer.set(500, false, function() { loraSend("POMPA_OFF"); });
    }
  });
}

// ------------------------------------------------
// RICEZIONE MESSAGGI LoRa (solo "user_rx" decifrati)
// ------------------------------------------------
Shelly.addEventHandler(function(event) {
  if (!event || event.id !== CFG_LORA_ID || !event.info) return;
  if (event.info.event !== "user_rx") return;
  if (!event.info.data) return;

  let msg = atob(event.info.data);
  print("Ricevuto via SheLR (mittente " + JSON.stringify(event.info.sender) +
        ", RSSI " + JSON.stringify(event.info.rssi) + "):", msg);

  // ---- PING: rispondi con stato reale (+ potenza se accesa) ----
  if (msg === "PING") {
    let sw = Shelly.getComponentStatus("switch:0");
    if (sw && sw.output === true && timerSpegnimento !== null) {
      let residuo = scadenzaPompa - uptime();
      if (residuo < 0) residuo = 0;
      let w = 0;
      if (typeof sw.apower === "number" && sw.apower > 0) w = Math.round(sw.apower);
      loraSend("PONG:ON:" + JSON.stringify(residuo) + ":" + JSON.stringify(w));
    } else {
      loraSend("PONG:OFF");
    }
    return;
  }

  // ---- ACCENDI_POMPA:<durata> ----
  if (msg.indexOf("ACCENDI_POMPA") === 0) {
    let durata = 0;
    let sep = msg.indexOf(":");
    if (sep !== -1) {
      let d = parseInt(msg.slice(sep + 1));
      if (!isNaN(d) && d > 0) durata = d;
    }
    if (durata <= 0) {
      print("ERRORE: ACCENDI_POMPA senza durata valida. Ignorato per sicurezza.");
      return;
    }

    // v9.1 — IDEMPOTENTE: se la pompa e' gia accesa con timer attivo,
    // questo messaggio e' un retry di 1T (a pompa ON 1T invia solo SPEGNI):
    // ri-conferma POMPA_ON senza azzerare il conteggio in corso.
    let sw = Shelly.getComponentStatus("switch:0");
    if (sw && sw.output === true && timerSpegnimento !== null) {
      print("ACCENDI_POMPA duplicato (pompa gia accesa): rinvio conferma, timer NON azzerato.");
      Timer.set(500, false, function() { loraSend("POMPA_ON"); });
      return;
    }

    print("Accensione pompa per " + JSON.stringify(durata) + " secondi (durata ricevuta da 1T).");

    // Il timer viene creato PRIMA di accendere il rele,
    // cosi il failsafe non interviene per errore.
    if (timerSpegnimento !== null) {
      Timer.clear(timerSpegnimento);
      timerSpegnimento = null;
    }
    scadenzaPompa = uptime() + durata;

    timerSpegnimento = Timer.set(durata * 1000, false, function() {
      timerSpegnimento = null;
      scadenzaPompa    = 0;
      print("Tempo scaduto. Spegnimento automatico.");
      Shelly.call("Switch.Set", { id: 0, on: false }, function(res, err, errMsg) {
        if (err) {
          print("ERRORE spegnimento automatico:", errMsg);
          return;
        }
        loraSend("POMPA_OFF");
      });
    });

    Shelly.call("Switch.Set", { id: 0, on: true });
    Timer.set(500, false, function() { loraSend("POMPA_ON"); });
    return;
  }

  // ---- SPEGNI_POMPA ----
  if (msg === "SPEGNI_POMPA") {
    print("Comando di spegnimento ricevuto da 1T.");
    pompaOff("comando da 1T", true);
    return;
  }

  print("Messaggio non riconosciuto:", msg);
});

// ------------------------------------------------
// FAILSAFE: rele acceso senza timer attivo -> OFF forzato
// ------------------------------------------------
Shelly.addStatusHandler(function(event) {
  if (event.component !== "switch:0") return;
  if (!event.delta || event.delta.output !== true) return;
  if (timerSpegnimento === null) {
    print("FAILSAFE: rele ON senza timer attivo. Spegnimento forzato.");
    pompaOff("failsafe", true);
  }
});

// === AVVIO ===
Shelly.call("Switch.SetConfig", {
  id: 0,
  config: { initial_state: "off" }
}, function(res, err, errMsg) {
  if (err) print("ERRORE Switch.SetConfig initial_state:", errMsg);
  else     print("Uscita configurata: initial_state = off (persistente).");
});

pompaOff("avvio di sicurezza", false);

configuraSheLR();
print("Script 1R v9.1 attivo. In ascolto (SheLR)...");