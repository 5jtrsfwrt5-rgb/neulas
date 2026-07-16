---
layout: post
title: "Tre Shelly, una pompa e 60 metri d'aria"
date: 2026-07-14
categories: domotica shelly AI
tags: [Shelly, LoRa, domotica, AI, Claude, Gemini, Mistral, pompa, acqua]
description: >-
  Come una persona non esperta ha automatizzato il pompaggio dell'acqua
  a 60 metri di distanza, con l'aiuto di tre assistenti AI.
permalink: /tre-shelly-pompa-60-metri/
---

# Tre Shelly, una pompa e 60 metri d'aria
### Come una persona non esperta ha automatizzato il pompaggio dell'acqua con l'aiuto dell'AI

*Un racconto onesto: fatto di entusiasmi, vicoli ciechi, piccole vittorie — e di una sorgente scoperta per caso.*

> 🔧 **Sei qui per replicare il progetto?** Questo articolo è prima di tutto un racconto. Se cerchi subito la parte operativa — schemi, cablaggi, foto, script scaricabili — vai direttamente alla **[Guida tecnica passo-passo](/guida-tecnica-pompa-shelly-lora/#guida-tecnica)**. La incontrerai comunque richiamata, con l'icona 🔧, nei punti giusti della storia.

---

## 1. Il problema, in due righe

In casa mia l'acqua non arriva dall'acquedotto: arriva da una **sorgente** sul mio terreno, raccolta in una cisterna interrata, e va sollevata fino a un deposito in casa da un'**elettropompa**. Il punto è che la pompa e il deposito sono **lontani** — circa 60 metri — e, soprattutto, il punto in cui si trova la pompa **non è coperto dal WiFi di casa**.

Serviva quindi un modo per far dialogare dispositivi distanti, uno dei quali isolato dalla rete, in modo che:

- quando il livello dell'acqua nel deposito scende sotto una soglia, la pompa si accenda;
- quando il deposito è pieno, la pompa si spenga;
- e che io **sappia sempre** se qualcosa non funziona.

La soluzione si chiama **LoRa**: una radio a lungo raggio e bassissimo consumo, perfetta per mandare piccoli messaggi a distanza senza WiFi.

Ed ecco un punto che va chiarito subito, perché è tra quelli che generano più domande: il sistema **non usa due Shelly, ma tre**. Il ponte radio LoRa richiede obbligatoriamente **due** dispositivi, uno per lato (li chiamerò **1T**, il trasmittente, e **1R**, il ricevente). Ma c'è un **terzo** Shelly, già al lavoro da tempo sul deposito, che legge il sensore di livello tramite il suo Add-on: non poteva ospitare anche il modulo LoRa (lo slot era già occupato), ed è per questo che l'architettura è a tre dispositivi.

| Ruolo | Dispositivo | Posizione | Compito |
|---|---|---|---|
| **Sensore** | Shelly Plus 1PM + Plus Add-on | Deposito (sotto WiFi) | Legge la sonda di livello e avvisa 1T via WiFi |
| **1T — Trasmittente** | Shelly 1PM Gen4 + LoRa Add-on | In casa (sotto WiFi) | Riceve l'avviso e lo rilancia via radio LoRa; è il "cervello" |
| **1R — Ricevente** | Shelly 1PM Gen4 + LoRa Add-on | Alla cisterna (NO WiFi) | Riceve via radio e comanda la pompa |

Il flusso, in sintesi:

> 💧 **Acqua bassa** → il sensore (via Shelly Plus 1PM) avvisa **1T** via WiFi → **1T** trasmette via **LoRa** attraverso 60 metri d'aria → **1R** accende la **pompa** per il tempo stabilito, poi la spegne — e conferma a 1T che tutto è andato a buon fine.

![Schema generale del sistema][schema_sistema.webp]
*Lo schema del sistema: tre Shelly, due tecnologie radio (WiFi + LoRa), un solo obiettivo.*

> 🔧 *Lista materiali completa, foto dei collegamenti e istruzioni replicabili:* **[Guida tecnica → Passo 0](/guida-tecnica-pompa-shelly-lora/#guida-tecnica)**

Ma prima di arrivarci, c'è un antefatto che comincia molto più indietro nel tempo.

---

## Antefatto — Prima delle quattro evoluzioni

La storia di questo progetto si divide in quattro "evoluzioni" che hanno portato il sistema alla configurazione attuale. Ma la vera partenza è molto più antica, e si appoggia a una tecnologia quasi dimenticata che, però, dal **1772** ha avuto un ruolo tutt'altro che secondario.

### La sorgente scoperta per caso (2005)

Nel 2005 entrai in possesso di un terreno molto ampio, dove poter anche costruire la mia abitazione. Per arrivarci servivano lavori importanti: recinzioni, l'impianto di un frutteto, movimenti di terra. Durante uno di questi scavi, ormai in conclusione, un escavatore intercettò uno sperone roccioso che fece perdere alla benna il materiale già raccolto. L'operatore diede più potenza e, frantumato il masso, accadde l'inaspettato: **sgorgò una grande quantità d'acqua.**

Non era una condotta rotta. Era — cosa per me molto più interessante — una **sorgente.**

La faccio breve: eravamo al culmine di un periodo pluriennale di siccità gravissima, e mi ritrovavo tra le mani una sorgente sotterranea con una portata di **decine di migliaia di litri al giorno**. Un'occasione imperdibile. Cambiai i piani: attorno alla sorgente, ripulita, feci costruire una grande **cisterna interrata**, per avere una riserva d'acqua importante per gli sviluppi futuri.

### L'ariete idraulico: pompare senza elettricità

Nel frattempo mi interessavo a soluzioni il più possibile rispettose dell'ambiente, e mi imbattei in alcuni siti (forse americani, di cui ho perso traccia) che parlavano di *ram pump* — in italiano **pompa ad ariete idraulico**. Approfondii, e scoprii che era qualcosa che potevo costruire da solo, con facilità.

> 💧 **Cos'è un ariete idraulico**
> È una pompa che non usa elettricità: sfrutta l'energia di una piccola caduta d'acqua (un dislivello) per spingerne una frazione molto più in alto. Un colpo d'acqua che si "auto-pompa". Un'idea antica — appunto, del 1772 — e geniale nella sua semplicità.

Sfruttando un dislivello di circa **un metro** tra l'uscita del troppo-pieno della cisterna e il punto, più in basso, dove avevo collocato l'ariete, riuscivo a far arrivare fino all'edificio — allora in costruzione, e **8 metri più in alto** rispetto all'ariete — circa **mille litri d'acqua nelle 24 ore**. Poco più di un decimo di quanto erogava la sorgente, ma più che sufficiente per il fabbisogno domestico. E tutto questo **senza consumare un watt.**

Questo sistema è andato avanti, 24 ore su 24, fino al **2019-2020**.

### Quando l'ariete non basta più

Poi, negli anni della siccità più dura, la quantità d'acqua che raggiungeva l'ariete divenne insufficiente, nel cuore dell'estate, a pompare fino a casa. Fu necessario **integrarlo con un'elettropompa**.

All'inizio la gestivo nel modo più artigianale possibile: **inserivo a mano la spina** — la prima di una serie di prolunghe che raggiungevano la cisterna — quando vedevo che il livello nel deposito in casa era sceso troppo, e la **staccavo** quando il deposito era di nuovo pieno.

Funzionava, ma era scomodo, impreciso, e mi legava mani e piedi. È proprio da quel gesto ripetuto — infilare e sfilare una spina — che nasce tutto il resto. Perché poi è arrivata la scoperta degli Shelly e dei sensori. E come sia avvenuta, quella scoperta, merita un piccolo racconto a parte.

---

<a id="scoperta-shelly"></a>
## 📦 Box — Come ho scoperto gli Shelly (grazie a un tecnico curioso)

Sono stato insegnante per quasi quarant'anni, e in una scuola si ha modo di conoscere tante persone che, con i loro mestieri, la tengono in piedi. Tra i tecnici addetti alla manutenzione ce n'era uno incaricato di occuparsi degli apparati elettronici: una persona competente e, soprattutto, **curiosa come me**.

Durante una nostra conversazione — era il **2019**, se la memoria non m'inganna — mi capitò di parlargli del mio interesse ad automatizzare alcuni aspetti della mia abitazione. Fu lui ad accennarmi all'esistenza dei **dispositivi Shelly**, che usava anche a casa propria.

Le prime chiacchierate rimasero tali; poi arrivò la pandemia e, come per tante cose, tutto rimase in sospeso. Fu **dopo il COVID, nel 2021**, che passai alla pratica: iniziai con **un solo Shelly, per comandare una presa**. A quello ne sono seguiti una decina, per automazioni via via meno banali. Fino a questo progetto — che è, ad oggi, il più complesso che abbia affrontato, per ragioni che vanno oltre gli aspetti puramente tecnici.

Se c'è una morale in questo box, è questa: **le cose migliori spesso cominciano da una conversazione con una persona curiosa.** A quel tecnico, che forse un giorno leggerà queste righe, va il mio grazie.

---

## 2. Evoluzione 1: dal gesto manuale al primo automatismo

Il primo passo è stato eliminare la spina infilata a mano. Un sensore di livello nel deposito, uno **Shelly Plus 1PM** — lo stesso che ancora oggi, con il suo Add-on, legge la sonda — che comanda la pompa: quando l'acqua scende, si accende; quando risale, si spegne. Sulla carta, banale.

Nella pratica, è emerso subito **il nemico invisibile** che avrebbe accompagnato tutto il progetto: l'**oscillazione della superficie dell'acqua**.

Quando la pompa versa acqua nel deposito, la superficie non sale liscia come un lenzuolo: si increspa, ondeggia, sale e scende attorno alla soglia del sensore. E il sensore, ligio al dovere, segnala *ogni* attraversamento: acceso, spento, acceso, spento… una raffica di comandi in pochi secondi.

Ho una prova visiva perfetta di quanto fosse reale il problema:

![Confronto notifiche: 19 dal sensore, 1 dal sistema][notifiche.webp]
*La prova provata: **diciannove** attivazioni grezze del sensore (le notifiche Shelly) contro **una sola** notifica di accensione pompa (ntfy). È il filtro anti-oscillazione che fa la differenza.*

La soluzione — un **filtro temporale** (una sorta di *debounce*) — l'ho costruita più avanti, ma il problema è nato qui.

> 📐 *Il dettaglio dei 60 metri e degli 8 metri di dislivello* li abbiamo visti nello [schema iniziale ↑](#1-il-problema-in-due-righe): sono il motivo per cui non bastava un cavo, e serviva la radio.

Fu anche qui che si presentò il primo mistero tecnico che ancora oggi non so spiegarmi del tutto: la **tensione anomala sul sensore**. Ne parlo apertamente più avanti, nella sezione dedicata all'onestà tecnica, perché merita chiarezza.

Con l'automatismo di base funzionante, il problema vero restava però un altro: come far parlare i dispositivi a 60 metri di distanza, con uno di essi senza WiFi. Ed è qui che ho cominciato a chiedere aiuto all'intelligenza artificiale — per gradi, e per tentativi.

> 🔧 *Cablaggio del sensore, colori dei fili, foto e configurazione dell'Add-on:* **[Guida tecnica → Passo 2](/guida-tecnica-pompa-shelly-lora/#guida-tecnica)**

---

## 3. Mistral, la bussola (che a volte punta a nord magnetico)

Ogni viaggio comincia con qualcuno che ti indica la direzione. Nel mio caso, la prima "voce" a cui ho chiesto la strada è stata **Mistral**. E la scelta non fu affatto casuale: tra i tanti assistenti disponibili, Mistral è **l'unica AI europea**, e per me questo aveva — e continua ad avere — importanza. Mi sembrava giusto dare fiducia, per primo, a un progetto nato e cresciuto nel nostro continente, con le nostre regole e la nostra sensibilità sui dati. È un criterio che non rivendico come tecnico: è una scelta di campo, e la dichiaro volentieri.

E devo essere giusto: Mistral mi ha dato *la direzione giusta*. Il problema è che, lungo il cammino, mi indicava anche svolte per strade che non esistevano.

### La direzione giusta

Quando ho spiegato cosa volevo — far parlare due Shelly lontani tramite i loro LoRa Add-on — Mistral ha inquadrato subito il problema nel modo corretto:

- serviva uno **script** su ciascun dispositivo (gli Shelly Gen4 eseguono script in un linguaggio derivato da JavaScript);
- uno avrebbe fatto da **trasmittente**, l'altro da **ricevente**;
- la comunicazione sarebbe passata per l'**Add-on LoRa**, non per il WiFi.

Fin qui, una bussola perfetta. Mi ha dato la fiducia per cominciare, e non è poco: quando parti da zero, sapere *che la strada esiste* vale tantissimo.

### Le strade che non esistevano

Il guaio è arrivato con i dettagli. Mistral scriveva codice con grande sicurezza, usando comandi dal nome plausibile, elegante, convincente… ma **inventato**. Funzioni che non esistevano nell'API degli Shelly, chiamate a metodi dai nomi verosimili ma senza alcun riscontro nella documentazione reale.

Il momento che ricordo meglio è **l'errore 404**. Seguivo le sue indicazioni, lanciavo il codice, e il dispositivo rispondeva con l'equivalente di un "questa cosa non esiste". All'inizio pensavo di aver sbagliato *io* a copiare. Poi, dopo il terzo o quarto tentativo, ho capito: non stavo sbagliando io. **Il comando non esisteva proprio.** L'AI lo aveva costruito per assonanza, per "buon senso" statistico, ma senza verificarlo — perché non poteva verificarlo.

<details>
<summary><strong>🧭 Cosa stava succedendo, in realtà</strong> (clicca)</summary>

<br>

Quello che ho sperimentato ha un nome: le AI generative possono produrre **"allucinazioni"** — informazioni presentate con sicurezza ma non corrispondenti alla realtà. Con il codice questo si manifesta in modo particolarmente insidioso: il nome di una funzione *sembra* giusto, la sintassi è perfetta, tutto è plausibile… ma quel comando non è mai esistito nell'API di quel dispositivo.

Non è "colpa" del modello nel senso che intendiamo noi: un'AI linguistica completa il testo in base a ciò che è *probabile*, non a ciò che ha *verificato*. Se in migliaia di esempi di codice esiste una certa funzione, il modello tenderà a proporla anche per un dispositivo che, magari, usa un nome del tutto diverso.

**La lezione, quella vera:** l'AI è uno strumento straordinario per *iniziare*, per avere una direzione, per non sentirsi persi. Ma **la verifica sulla documentazione ufficiale spetta sempre all'essere umano.** La bussola indica il nord; sta a te controllare se davanti c'è un ponte o un burrone.

</details>

### Cosa mi ha lasciato Mistral

Sarebbe ingiusto liquidare questa fase come "tempo perso". Non lo è stata affatto:

- mi ha dato **l'architettura mentale** del progetto (trasmittente / ricevente / script) che si è rivelata corretta e mi ha accompagnato fino alla fine;
- mi ha insegnato, a mie spese, la **lezione più importante di tutte**: fidarsi della direzione, ma **verificare ogni singolo comando** sulla documentazione reale;
- mi ha tolto la paura di cominciare.

> 🧭 *Morale della tappa:* **l'AI ti dice dove andare, non sempre come arrivarci. Il "come" va verificato, passo per passo, sul campo.**

---

## 4. Gemini, il muratore: dove si costruisce davvero (e si sbaglia davvero)

Se Mistral era stato la bussola, **Gemini** è stato il muratore: quello con cui ho tirato su i muri, mattone dopo mattone. È con Gemini che il progetto ha smesso di essere un'idea ed è diventato codice che *girava* — con tutta la fatica, i vicoli ciechi e le ripartenze che "costruire davvero" comporta.

Voglio essere sincero: questa è stata la fase più lunga e, a tratti, più frustrante. Ma è anche quella in cui ho imparato di più.

### Il primo mattone vero: far partire un messaggio via LoRa

Il primo traguardo concreto è stato riuscire a mandare *fisicamente* un pacchetto di byte da 1T a 1R attraverso l'Add-on LoRa. Non un comando immaginario, ma la funzione reale che gli Shelly mettono a disposizione per scrivere sul modulo radio. Quando sullo schermo di 1R è comparso il primo messaggio arrivato via radio da 1T, ho avuto la prima, autentica esplosione di gioia del progetto.

Funzionava. I due dispositivi si *parlavano*, senza WiFi, attraverso 60 metri d'aria.

> 🔧 *Le prove al tavolo, con una lampada al posto della pompa (fatelo anche voi!):* **[Guida tecnica → Passo 1](/guida-tecnica-pompa-shelly-lora/#guida-tecnica)**

### Il nemico invisibile: l'acqua che "balla"

Risolto il "come parlare", è tornato a farsi vivo il problema dell'**oscillazione del sensore** già incontrato nell'Evoluzione 1. La soluzione, costruita con Gemini, è stata un **filtro temporale** (un *debounce*): dopo che un comando valido viene accettato, il sistema **ignora per un certo tempo** ogni nuovo impulso del sensore. In pratica dice: "ho appena ricevuto l'ordine di accendere la pompa, adesso lavoro; non sto a sentire ogni schizzo d'acqua per i prossimi secondi". È diventato uno dei pilastri della robustezza del sistema.

<details>
<summary><strong>⚙️ Il concetto di "debounce", spiegato semplice</strong> (clicca)</summary>

<br>

Il termine *debounce* ("anti-rimbalzo") viene dall'elettronica dei pulsanti: quando premi un tasto, i contatti metallici "rimbalzano" per pochi millisecondi, generando decine di aperture/chiusure invece di una sola. La soluzione classica è **ignorare i cambiamenti troppo ravvicinati nel tempo**, considerando valido solo il primo di una raffica.

Nel nostro caso il "rimbalzo" non è meccanico ma **idraulico**: è l'acqua che oscilla. Ma il principio è identico — *un evento vero, non venti falsi*.

</details>

### I vicoli ciechi: strade imboccate e abbandonate

Costruire vuol dire anche demolire quello che non funziona. Con Gemini ho imboccato più di una strada senza uscita, e credo sia utile raccontarle: chi replicherà il progetto eviterà di perderci le stesse ore che ci ho perso io.

- **La via del Cloud.** All'inizio si era pensato di far dialogare i dispositivi passando per il cloud di Shelly. Elegante sulla carta, ma con un difetto fatale per il mio caso: **1R non ha WiFi**, quindi non può raggiungere alcun cloud.
- **La via delle "Scene".** Comode per automazioni semplici, ma anch'esse dipendono dal cloud/WiFi e non offrono la flessibilità che mi serviva per gestire conferme, tentativi e allarmi.
- **La via di Telegram.** Per le notifiche avevamo valutato un bot Telegram. Funzionava, ma aggiungeva una dipendenza esterna e una complessità mal adatta a un dispositivo isolato. La abbandonai per una soluzione più leggera: **ntfy**.

Ogni vicolo cieco ha lasciato un insegnamento: mi ha costretto a chiarire, un requisito alla volta, *cosa* il sistema doveva davvero fare e da *quali* dipendenze doveva restare libero. Il fatto che **1R fosse isolato dal WiFi**, vissuto all'inizio come un limite, è diventato la bussola di ogni scelta.

### L'abbaglio dell'antenna

C'è un episodio che merita un posto d'onore, perché è il momento in cui ho toccato con mano che **anche il muratore può sbagliare misura.**

A un certo punto, discutendo di come migliorare la portata del segnale, Gemini mi aveva spiegato con dovizia di particolari come **svitare l'antenna** del LoRa Add-on per sostituirla con una esterna più performante, montata su connettore SMA. Indicazioni precise, sicure, dettagliate.

Peccato che il mio modello di LoRa Add-on **non abbia alcun connettore SMA**: l'antenna è un filo **integrato e non rimovibile**, con tanto di avvertenza stampata *"Do not remove the antenna tip"*. Solo la versione **Pro** ha il connettore per l'antenna esterna. Se avessi seguito alla lettera quelle istruzioni con la stessa fiducia dei primi tempi, avrei rischiato di **danneggiare irreparabilmente** il dispositivo.

Per fortuna, la lezione di Mistral aveva già fatto scuola: prima di mettere le mani sull'hardware, sono andato a **verificare sulla documentazione ufficiale**. Ed è lì che ho scoperto la differenza tra il modello standard (il mio) e il Pro.

<details>
<summary><strong>📡 Standard vs Pro: la differenza che conta</strong> (clicca)</summary>

<br>

| Caratteristica | LoRa Add-on **standard** | LoRa Add-on **Pro** |
|---|---|---|
| Antenna | A filo, **integrata e NON rimovibile** | Connettore **SMA** per antenna esterna |
| Avvertenza | "Do not remove the antenna tip" | — |
| Portata | Adeguata a distanze medie (come i miei 60 m) | Estendibile con antenne dedicate |

**Morale:** quando un'AI ti dà istruzioni che comportano un intervento fisico e potenzialmente distruttivo sull'hardware, la verifica sulla documentazione ufficiale non è un optional — è **obbligatoria**. Un conto è un comando software sbagliato (dà errore e via), un altro è svitare a forza un componente saldato.

</details>

### Cosa mi ha lasciato Gemini

Con Gemini il sistema ha imparato a **trasmettere davvero** via LoRa, è nato il **filtro anti-oscillazione**, ho ripulito il progetto da tre **vicoli ciechi** (Cloud, Scene, Telegram) e ho ricevuto una conferma bruciante della lezione di fondo: **verificare sempre**, soprattutto quando c'è di mezzo l'hardware.

> 🧱 *Morale della tappa:* **costruire significa anche sbagliare e rifare. I vicoli ciechi non sono tempo perso: sono il modo in cui capisci davvero cosa ti serve — e cosa no.**

---

## 5. Claude, il rifinitore: dalla cosa che "funziona" alla cosa di cui ti fidi

Ero arrivato a Claude per gradi, quasi per tentativi successivi — ed era una scelta ormai consapevole. Dopo Mistral e Gemini, avevo capito che non stavo solo cercando di risolvere un problema idraulico: stavo *esplorando un metodo*. La domanda vera, ormai, era diventata questa: **fino a dove può arrivare una persona non esperta, se si fa affiancare bene dall'AI?**

A quel punto il sistema, grazie a Gemini, *funzionava*. Ma tra "funziona sul banco" e "mi ci fido con la pompa a 60 metri mentre fuori c'è un temporale" c'è un abisso. Colmarlo è stato il lavoro di rifinitura — ed è la parte in cui il sistema è diventato **adulto**.

### Il problema della fiducia a distanza

Il punto debole era chiaro: 1T mandava il comando "accendi la pompa" a 1R… e poi? Come faceva 1T a *sapere* che la pompa si era davvero accesa? Il segnale radio poteva perdersi, degradarsi, arrivare corrotto. Un comando "sparato nel buio" senza conferma non è un sistema affidabile: è una speranza.

### 1) Il battito cardiaco: PING / PONG

A intervalli regolari — nel mio caso **ogni 30 minuti** — 1T manda a 1R un piccolo messaggio, `PING`. Se 1R è vivo e in ascolto, risponde `PONG`. Nel log reale si legge, ripetuto migliaia di volte, questo dialogo tranquillo:

```
HEARTBEAT: invio PING a 1R...
Ricevuto via LoRa: PONG
PONG confermato da 1R.
PONG ricevuto: 1R operativo.
```

Ogni riga è un battito. Finché ci sono, il cuore del sistema batte.

### 2) La conferma che conta: ACK e POMPA_ON

Non basta mandare il comando: 1T lo manda e poi **aspetta** che 1R risponda `POMPA_ON`. Solo allora considera il comando riuscito e manda **una sola** notifica:

```
Invio ACCENDI_POMPA (tentativo 1/10).
Trasmesso: ACCENDI_POMPA:400. Attendo POMPA_ON (5s)...
Ricevuto via LoRa: POMPA_ON
POMPA_ON confermato: pompa avviata su 1R.
Notifica ntfy inviata: [..] Elettropompa accesa per 400 secondi!
```

Il `400` è il tempo di funzionamento in secondi: 1T dice a 1R non solo "accendi", ma "accendi **per 400 secondi**". Un comando completo e autosufficiente.

### 3) Cosa succede se qualcosa va storto: i tentativi (retry)

Vedi quel `(tentativo 1/10)`? Se la conferma non arriva entro pochi secondi, 1T **riprova** — fino a dieci volte. E se dopo dieci tentativi 1R resta muto, il sistema non fa finta di niente: entra in **modalità allarme** e avvisa.

### 4) La voce del sistema: le notifiche ntfy

Per sapere cosa succede senza guardare i log, il sistema mi parla sul telefono tramite **ntfy**, un servizio di notifiche push semplice e leggero. Due tipi di messaggi:

- 💧 **"Elettropompa accesa per 400 secondi!"** — tutto bene.
- ⚠️ **"Controllo corrente"** — qualcosa non va: 1R non risponde più.

Il bello è che questa "voce" **non dipende dal WiFi del dispositivo lontano**: è 1T (che il WiFi ce l'ha) a parlare, riportando ciò che accade a 1R.

### 5) Il fantasma nella radio: il glitch e le interferenze

In mezzo a migliaia di `PONG` puliti, ogni tanto nel log compare qualcosa del genere:

```
Ricevuto via LoRa: PO^
```

Un `PONG` **arrivato corrotto**: la radio ha ricevuto qualcosa, ma il messaggio era danneggiato — probabilmente per interferenza elettrica. Ecco perché la logica dei tentativi è essenziale: un singolo messaggio sporco non deve mandare in crisi il sistema. 1T lo scarta, riprova al battito successivo, e quasi sempre il `PONG` seguente arriva pulito.

<details>
<summary><strong>⚡ Interferenze e disturbi: perché lo snubber</strong> (clicca)</summary>

<br>

Una pompa è un **carico induttivo**: quando il relè la stacca, l'energia accumulata nell'avvolgimento genera un picco di tensione (una scintilla sui contatti) che disturba l'elettronica vicina e, potenzialmente, le comunicazioni radio.

Per questo, su consiglio dell'AI, ho aggiunto uno **Shelly RC Snubber** montato **il più vicino possibile alla pompa**. Lo snubber (un gruppo resistenza + condensatore) "assorbe" quel picco, proteggendo il relè dello Shelly e riducendo i disturbi. È un piccolo componente da pochi euro che allunga la vita dell'impianto.

![Lo Shelly RC Snubber vicino alla pompa][Snubber.webp]
*Lo snubber RC montato in prossimità dell'elettropompa.*

</details>

> 🔧 *Posizionamento dei dispositivi, orientamento delle antenne, snubber e accorgimenti radio:* **[Guida tecnica → Passi 7 e 8](/guida-tecnica-pompa-shelly-lora/#guida-tecnica)**

### Perché proprio Claude, e una doverosa premessa di onestà

Sono arrivato a Claude alla fine di un percorso, non per partito preso. E qui devo essere trasparente su due cose.

**Primo: quasi tutto il progetto è stato realizzato con le versioni gratuite.** Mistral, Gemini e Claude li ho usato, per la maggior parte del lavoro, senza pagare nulla. È un punto che mi sta a cuore, perché sfata un mito: **per un progetto come questo non serve per forza spendere.** Le versioni gratuite mi hanno portato lontanissimo.

**Secondo: l'unico investimento — poche decine di euro — l'ho fatto solo per la preparazione di questo blog**, scegliendo **Claude Opus 4.8**. È stata una scelta del tutto personale, forse persino eccessiva per la mole di lavoro: ma l'ho trovato, *a mio insindacabile e personalissimo giudizio*, il modello più performante e più in sintonia con il mio stile di scrittura e le mie esigenze di racconto. Non è una classifica né una pubblicità: è solo la mia esperienza.

### Un'osservazione che vale tutto il progetto

Devo dire una cosa che mi ha sorpreso. I miei **primi tentativi** di usare l'AI risalgono a quasi **due anni fa**, e all'epoca ne ero uscito piuttosto deluso: risposte vaghe, codice che raramente stava in piedi, poca capacità di seguire un ragionamento lungo. Avevo quasi rinunciato all'idea che potessero essermi davvero utili.

Riprendere in mano questi strumenti oggi è stata una rivelazione. **Il miglioramento, in tutti i modelli che ho usato, è enorme.** Non parlo di sfumature: parlo di una differenza di categoria. Capiscono meglio il contesto, mantengono il filo di conversazioni lunghe e complesse, producono codice che — verificato! — funziona davvero. È stato proprio questo salto a rendere possibile un progetto che, due anni fa, avrei abbandonato dopo la prima settimana.

Ed è anche il motivo per cui ho voluto scrivere questo racconto: perché **l'accoppiata "persona non esperta + AI di supporto" è oggi realmente percorribile**, in un modo che fino a poco tempo fa non lo era.

> 🧩 *Morale della tappa:* **un sistema affidabile non è quello che non sbaglia mai, ma quello che sa accorgersi di aver sbagliato e reagire. Conferme, tentativi e allarmi non sono complicazioni: sono la differenza tra "funziona" e "mi ci fido".**

---

## 6. La prova del fuoco: quando la pompa si è rotta davvero

Si può scrivere il codice più elegante del mondo, ma è solo la **realtà** a dirti se un sistema funziona. E la realtà, come spesso accade, è arrivata senza preavviso, sotto forma di un temporale.

Racconto questo episodio perché è il momento in cui il sistema ha affrontato un guasto vero, serio e prolungato — e si è comportato **esattamente** come speravo. Non perché non sia successo nulla di male: al contrario, si è rotta la pompa. Ma perché il sistema **se n'è accorto, mi ha avvisato, e non ha fatto danni**.

### La quiete prima

Per giorni, il log scorre tranquillo. Ogni 30 minuti, il battito. Ogni tanto una pompata regolare, confermata e notificata. Tutto normale. Il sistema respira.

### Il guasto

Poi, probabilmente in concomitanza con un temporale, **l'elettropompa subisce un guasto** e comincia a disperdere corrente. Il **magnetotermico** della linea — che serve proprio a questo — scatta e toglie alimentazione alla pompa *e* a 1R.

Da un istante all'altro, 1R è muto. E il sistema, puntuale, se ne accorge:

```
HEARTBEAT: invio PING a 1R...
ATTENZIONE: 1R non risponde. Modalita allarme attiva.
Tentativi falliti: 1/10
...
Tentativi falliti: 10/10
ALLARME: 1R offline!
Notifica ntfy inviata: [..] ⚠️ Controllo corrente ⚠️
```

1T non si arrende al primo silenzio: prova, riprova, dieci volte. Solo quando è **certo** che 1R è irraggiungibile, lancia l'allarme e mi manda la notifica **"Controllo corrente"** sul telefono.

### Le ore difficili

Non ho potuto sostituire la pompa immediatamente — serviva un elettricista e un pezzo di ricambio. E qui si vede il carattere del sistema: **per quasi un'intera giornata**, ogni 30 minuti, con pazienza ostinata, 1T ha continuato a cercare 1R, a fallire dieci volte, e a rilanciare l'allarme. Non si è "stancato", non è andato in tilt, non ha fatto scelte avventate. Ha solo continuato a fare il suo dovere: **cercare, verificare, avvisare.**

C'è anche un dettaglio che mi ha colpito. A un certo punto arriva una richiesta di accensione mentre 1R è ancora offline, e il sistema **non spara il comando nel vuoto**:

```
1R non raggiungibile. Comando ACCENDI in attesa del ripristino.
Notifica ntfy inviata: [..] ⏳ Avvio pompa in attesa: 1R non raggiungibile.
```

Mette il comando **in attesa**, invece di perderlo. Se ne ricorderà quando 1R tornerà vivo.

### Il ritorno alla vita

Finalmente la pompa viene sostituita (ne ho approfittato per aggiungere lo snubber) e il magnetotermico riarmato. Nel giro di pochi minuti, il log torna a respirare — e succede una cosa bellissima:

```
HEARTBEAT: invio PING a 1R...
Ricevuto via LoRa: PONG
PONG confermato da 1R.
PONG ricevuto: 1R operativo.
Esecuzione comando pendente: ACCENDI_POMPA.
```

Il sistema **si ricorda del comando che aveva messo in attesa** e lo esegue. Da solo. Senza che io dovessi toccare nulla.

### Cosa mi ha insegnato questo episodio

Questa è stata, per me, la vera **prova del fuoco** — anzi, dell'acqua. E la lezione è doppia:

1. **Un buon sistema non impedisce i guasti** (la pompa si è rotta comunque), ma trasforma un guasto silenzioso e potenzialmente dannoso in un evento **visibile e gestibile**. Senza il sistema, avrei scoperto il problema solo restando senza acqua in casa, chissà quando. Con il sistema, l'ho saputo subito, dal telefono.

2. **La robustezza costruita con Claude non era teoria.** PING/PONG, tentativi, allarmi, comandi in attesa: ogni pezzo ha fatto la sua parte, in una situazione reale che non avevo pianificato.

<details>
<summary><strong>🔍 Una piccola imperfezione onesta (e perché ho scelto di non "aggiustarla")</strong> (clicca)</summary>

<br>

Nel ritorno alla normalità, il log mostra che la **prima** accensione dopo la riparazione si interrompe prima del previsto. La mia interpretazione: durante il lungo blackout il livello in cisterna era sceso parecchio; quando la pompa è ripartita e l'acqua ha ricominciato a salire attraversando la soglia del sensore, le oscillazioni della superficie hanno generato un impulso interpretato come "spegni".

Ho ragionato su due possibili miglioramenti:

- **A) Un timer dinamico**: dopo un blackout prolungato, allungare automaticamente il tempo di "sicurezza" del filtro anti-oscillazione. Soluzione a costo zero, solo software.
- **B) Un secondo sensore di "minima assoluta"**, più in basso nel deposito, che imponga un riempimento più lungo. Più robusta perché reagisce alla realtà fisica dell'acqua, non a una stima.

**Ho deciso, per ora, di non implementare né l'una né l'altra.** Il motivo è semplice e, credo, saggio: il sistema, di fronte a un guasto vero e prolungato, si è comportato correttamente. Ha allarmato, non ha fatto danni, è ripartito da solo. La piccola imperfezione della prima ripartenza è un caso limite raro, dovuto a un evento eccezionale. **Considero il sistema sufficientemente robusto e affidabile così com'è**, e preferisco non aggiungere complessità che non serve. Le due idee restano "in cassaforte": le tirerò fuori solo se un caso analogo dovesse ripetersi.

*(È anche un principio di buona ingegneria: non risolvere problemi che non hai davvero.)*

</details>

> 🔥 *Morale della tappa:* **il collaudo vero non lo decidi tu, lo decide la realtà. E il momento in cui qualcosa si rompe è il momento in cui scopri se il tuo sistema è un guardiano affidabile o solo un giocattolo che funziona col bel tempo.**

---

## 7. Sicurezza, anonimizzazione e onestà tecnica

Prima di tirare le fila, una sezione che considero un dovere verso chi legge. Fare le cose "per bene" non significa solo far funzionare la pompa: significa anche lavorare in sicurezza e raccontare le cose come stanno, comprese quelle che non ho capito fino in fondo.

### La sicurezza elettrica prima di tutto

Un promemoria che non mi stancherò di ripetere: **si lavora su tensione di rete (230 V) e su una pompa.** Non è un gioco.

- Ogni intervento sui collegamenti va fatto a **impianto sezionato** (interruttore aperto, assenza di tensione verificata).
- Il **magnetotermico** dedicato alla linea della pompa non è un optional: nel mio caso, come avete letto, è ciò che ha evitato guai seri quando la pompa ha cominciato a disperdere.
- Lo **snubber RC** va montato vicino al carico induttivo (la pompa).
- Se non si è sicuri di ciò che si sta facendo, **si chiama un elettricista.** Io l'ho fatto, senza vergogna, quando è stato il momento.

### L'anonimizzazione: cosa ho nascosto e perché

Tutti i dati sensibili in questo racconto e negli script sono stati **anonimizzati**. In particolare:

- **Indirizzi IP** dei dispositivi → sostituiti con valori d'esempio.
- **Chiavi e token** (ntfy) → rimossi o sostituiti con segnaposto.
- **Nome della rete WiFi** e password → mai riportati.

Perché insisto? Perché pubblicare online la configurazione reale di un dispositivo domotico — soprattutto uno che comanda un carico elettrico — è un rischio concreto. Chi replica il progetto deve inserire **i propri** dati, e imparare fin da subito l'abitudine a non spargere in giro chiavi e indirizzi.

### Onestà tecnica: il mistero della tensione del sensore

E qui viene la parte in cui devo essere completamente trasparente, perché non ho una risposta definitiva — e preferisco dirvelo piuttosto che inventarne una elegante.

Il sensore di livello è alimentato dall'uscita di riferimento dell'Add-on Shelly. La documentazione ufficiale indica che l'Add-on è alimentato a **3,3 V** dal dispositivo, con un'uscita di riferimento (**VREF OUT**) a bassa corrente e una seconda uscita che passa per un resistore di pull-up da **10 kΩ** (**VREF + R1 OUT**). L'ingresso analogico, inoltre, è di fatto un voltmetro con range **0–10 V**.

Ho misurato la tensione sul morsetto **VREF OUT "puro"** (quello diretto, non quello con il resistore da 10 kΩ), tra il polo positivo e la massa, e ho ottenuto:

- **~9,92 V a vuoto** (senza sensore collegato);
- **5,12 V con il sensore collegato.**

![La misurazione con il tester sul sensore collegato][TesterSensore.webp]
![Il valore rilevato: 5,12 V sotto carico][TesterMisura.webp]
![Il confronto a vuoto su un secondo Add-on: 9,92 V][TesterMisuraConfronto.webp]

**E qui c'è qualcosa che, onestamente, non mi torna del tutto.** Un'uscita descritta come riferimento a partire da un'alimentazione di 3,3 V non dovrebbe, a rigor di logica, presentare a vuoto una tensione di quasi 10 V — un valore **triplo** rispetto all'alimentazione. Le spiegazioni possibili sono diverse (il circuito di riferimento potrebbe essere costruito attorno alla scala 0–10 V del voltmetro interno; oppure il comportamento reale differisce dal dato nominale; oppure c'entra il modo in cui lo strumento legge una tensione poco caricata), ma **nessuna di queste è una certezza documentata**, e non voglio spacciarla per tale.

Quello che posso dire con sicurezza è il risultato pratico:

- i **5,12 V** che arrivano al sensore quando è collegato rientrano nel suo range operativo dichiarato (**5–24 V**);
- nel mio impianto, il sensore ha **sempre funzionato correttamente**;
- questo comportamento **non dipende dalla tensione di rete** (che nel mio caso è 240–245 V): l'Add-on è alimentato a bassa tensione e galvanicamente isolato.

> ⚠️ **Avviso onesto al lettore.** Il funzionamento del sensore, nel mio caso, è sempre risultato corretto — ma va preso **"così com'è", senza alcuna garanzia** che si comporti allo stesso modo in ogni configurazione. I valori di tensione che ho misurato non coincidono del tutto con ciò che ci si aspetterebbe dalla documentazione, e non ho una spiegazione definitiva. Se replicate il progetto, **verificate le vostre misure** e, nel dubbio, consultate la documentazione ufficiale aggiornata di Shelly.

Preferisco chiudere questa sezione con un punto interrogativo onesto piuttosto che con un punto fermo inventato. È, in fondo, la stessa lezione che l'AI mi ha insegnato fin dall'inizio: **meglio un "non lo so con certezza" verificabile che una sicurezza che non poggia su nulla.**

---

## 8. Cosa ho imparato (e cosa farei domani)

Siamo alla fine del cammino. La pompa si accende quando deve, si spegne quando deve, e se qualcosa va storto lo so dal telefono. L'obiettivo pratico è raggiunto. Ma, come dicevo all'inizio, strada facendo è nato un obiettivo più grande: capire **se e come** una persona non esperta possa, oggi, realizzare qualcosa di simile con l'aiuto dell'AI. E la risposta, per me, è un sì convinto.

### Le tre lezioni che porto a casa

1. **L'AI è un compagno straordinario, ma la responsabilità resta tua.** Mistral mi ha dato la direzione (e qualche comando inventato). Gemini ha costruito (e mi avrebbe fatto svitare un'antenna che non si svita). Claude ha rifinito. Ma la verifica sulla documentazione, la prova sul campo, la scelta finale: quelle sono sempre state mie. **L'AI propone, l'umano verifica e decide.**

2. **Non serve essere esperti per cominciare — serve essere onesti sui propri limiti.** Io sono quasi digiuno di elettrotecnica e ho perso la mano con la programmazione. Non l'ho nascosto: l'ho usato come punto di partenza, chiedendo, verificando, sbagliando e riprovando. I vicoli ciechi fanno parte del metodo.

3. **Gli strumenti sono maturati moltissimo.** Lo ripeto perché è la cosa che più mi ha sorpreso: ciò che due anni fa era frustrante, oggi è possibile. La finestra per provarci non è mai stata così aperta.

### Le idee "in cassaforte" (miglioramenti futuri non indispensabili)

Il sistema, così com'è, lo considero **robusto e affidabile** — la prova del fuoco lo ha dimostrato. Ma tengo da parte, senza fretta, un paio di idee per il futuro:

- **Timer dinamico post-blackout** — allungare il tempo del filtro anti-oscillazione dopo un'interruzione prolungata.
- **Secondo sensore di minima assoluta** — una soglia più bassa che imponga un riempimento più lungo. Più robusta, ma richiede un intervento hardware.

Nessuna delle due è indispensabile oggi. Le registro qui per onestà e memoria futura.

### Una nota sul blog e sul dominio

Già che raccontavo il progetto, ho fatto un passo in più: ho registrato un **dominio dedicato**, per dare al racconto una casa stabile e indipendente. È una scelta che consiglio a chiunque voglia condividere i propri progetti: avere un proprio indirizzo significa non dipendere dalla piattaforma di turno e poter spostare i contenuti in futuro senza perdere i lettori.

<a id="sostieni"></a>
### Sostieni il prossimo progetto (Raspberry Pi / Arduino) ☕

Una cosa voglio dirla chiaramente: **tutto ciò che trovate in queste pagine è, e resterà, liberamente disponibile.** È stata una scelta ponderata, basata su varie considerazioni — lo spirito di condivisione delle community di maker (dalle quali ho ricevuto tanto), la convinzione che la conoscenza cresca circolando, e il fatto stesso che questo progetto sia nato grazie a strumenti in gran parte gratuiti. Per questo ho deciso di pubblicare **sia la prima versione funzionante degli script (v2) sia quella definitiva attualmente in uso (v7)**, complete, commentate e scaricabili, senza contenuti a pagamento e senza registrazioni.

Detto questo: il prossimo progetto è già nella mia testa, e avrà come protagonisti un **Raspberry Pi e/o un Arduino** — con, naturalmente, un nuovo racconto su questo blog. Se questo articolo o la guida tecnica ti sono stati utili e vuoi darmi una mano a finanziarlo, puoi offrirmi un caffè: si tratta di un contributo **su base strettamente volontaria**, che non sblocca nulla di "premium" — perché non c'è nulla di bloccato — ma che sarà un incoraggiamento concreto (e apprezzatissimo) a continuare.

> ☕ **[Offrimi un caffè per il prossimo progetto](LINK_DONAZIONI)**
>
> *(qualunque cifra, anche simbolica, va interamente all'acquisto del materiale per il progetto Raspberry Pi / Arduino)*

### Un grazie e un augurio

Se sei arrivato fin qui, grazie per la pazienza. Questo non voleva essere un tutorial perfetto da manuale, ma il **racconto onesto di un percorso**: fatto di entusiasmi, vicoli ciechi, piccole vittorie e una pompa che, a 60 metri da casa, adesso fa il suo dovere.

Se sei una di quelle persone che hanno un'idea in testa ma pensano "non ne sono capace"… beh, forse non sei capace *da solo*. Ma con l'AI al fianco, un po' di pazienza e la disciplina di verificare sempre, la distanza tra l'idea e la realizzazione è molto più corta di quanto sembri.

Buona costruzione. E, come si diceva un tempo tra radioamatori: **buon collegamento.**

*— Roberto*

---

<!-- ELENCO IMMAGINI — DEFINIZIONI DEI RIFERIMENTI -->

[schema_sistema.webp]: immagini/pompa/schema_sistema.webp
[notifiche.webp]: immagini/pompa/notifiche.webp
[Snubber.webp]: immagini/pompa/Snubber.webp
[TesterSensore.webp]: immagini/pompa/TesterSensore.webp
[TesterMisura.webp]: immagini/pompa/TesterMisura.webp
[TesterMisuraConfronto.webp]: immagini/pompa/TesterMisuraConfronto.webp

<!-- FINE ELENCO IMMAGINI -->