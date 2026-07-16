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