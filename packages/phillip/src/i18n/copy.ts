// Every string the lead reads that the model did not write: the widget's own
// chrome, and the lines Phillip says from the client without a round trip
// (iteration finished, checkout opened, the site is live).
//
// These used to be English literals scattered through PhillipWidget, Composer,
// Nudge and Takeover. A German lead would get a German greeting, tap a German
// chip, and then be told "you're live 🎉 i'll email your login."
//
// Register follows `defaultGreeting`: English stays in the brand's all-lowercase
// texting voice; every other language uses its normal capitalization and the
// polite form, because Phillip is a stranger pitching a business owner.

import { DEFAULT_LANGUAGE, type Language, coerceLanguage } from "./language";

export interface WidgetCopy {
  // --- chrome the lead sees ---
  online: string;
  openChat: (name: string) => string;
  dismiss: string;
  composerPlaceholder: string;
  composerLabel: string;
  send: string;
  hideConversation: string;
  showConversation: string;
  pickHintTouch: string;
  pickHintMouse: string;
  clearPicked: string;
  pickElement: string;
  // --- Phillip, speaking from the client ---
  heavyRequest: string;
  iterationDone: string;
  iterationManual: string;
  escalationSent: string;
  checkoutOpened: string;
  live: string;
  checkoutCancelled: string;
  // --- system notices (rendered as a bare line, not as Phillip) ---
  iterationFailed: string;
  emailInvalid: string;
  checkoutFailed: string;
  streamFailed: string;
}

const COPY: Record<Language, WidgetCopy> = {
  en: {
    online: "online",
    openChat: (name) => `open chat with ${name}`,
    dismiss: "dismiss",
    composerPlaceholder: "type a message…",
    composerLabel: "message",
    send: "send",
    hideConversation: "hide the conversation",
    showConversation: "show the conversation",
    pickHintTouch: "tap any part of your site — tap the crosshair again to cancel",
    pickHintMouse: "click any part of your site — esc cancels",
    clearPicked: "clear picked element",
    pickElement: "pick an element",
    heavyRequest:
      "that's a bigger change and worth doing right. drop your email and my colleague will pick it up.",
    iterationDone: "done — tap to see it ✨",
    iterationManual: "i'll take this one by hand — give me a little while.",
    escalationSent: "sent. look out for a note from phillip@nutz.inc.",
    checkoutOpened:
      "i opened secure checkout in a new tab — i'll get everything live the moment it's done.",
    live: "you're live 🎉 i'll email your login.",
    checkoutCancelled: "no stress — i kept everything ready. anything you'd change first?",
    iterationFailed: "hmm, that one didn't take. want to try again?",
    emailInvalid: "that email looks off — mind checking it?",
    checkoutFailed: "checkout didn't open — mind trying again?",
    streamFailed: "hmm, that didn't go through — tap to try again.",
  },
  de: {
    online: "online",
    openChat: (name) => `Chat mit ${name} öffnen`,
    dismiss: "Schließen",
    composerPlaceholder: "Nachricht schreiben…",
    composerLabel: "Nachricht",
    send: "Senden",
    hideConversation: "Konversation ausblenden",
    showConversation: "Konversation einblenden",
    pickHintTouch:
      "Tippen Sie auf einen Bereich Ihrer Seite — zum Abbrechen erneut auf das Fadenkreuz tippen",
    pickHintMouse: "Klicken Sie auf einen Bereich Ihrer Seite — Esc bricht ab",
    clearPicked: "Auswahl aufheben",
    pickElement: "Element auswählen",
    heavyRequest:
      "Das ist eine größere Änderung, und die sollte man richtig machen. Hinterlassen Sie mir Ihre E-Mail-Adresse, dann übernimmt mein Kollege.",
    iterationDone: "Fertig — tippen Sie, um es zu sehen ✨",
    iterationManual: "Das mache ich von Hand — geben Sie mir einen Moment.",
    escalationSent: "Abgeschickt. Sie hören von phillip@nutz.inc.",
    checkoutOpened:
      "Ich habe den sicheren Checkout in einem neuen Tab geöffnet — sobald er durch ist, gehe ich mit allem live.",
    live: "Sie sind live 🎉 Ihre Zugangsdaten schicke ich Ihnen per E-Mail.",
    checkoutCancelled:
      "Kein Stress — ich habe alles bereitgehalten. Möchten Sie vorher noch etwas ändern?",
    iterationFailed: "Hm, das hat nicht geklappt. Noch einmal versuchen?",
    emailInvalid: "Die E-Mail-Adresse sieht nicht richtig aus — schauen Sie noch einmal drüber?",
    checkoutFailed: "Der Checkout ließ sich nicht öffnen — noch einmal versuchen?",
    streamFailed: "Hm, das ist nicht durchgegangen — tippen Sie, um es erneut zu versuchen.",
  },
  fr: {
    online: "en ligne",
    openChat: (name) => `Ouvrir la discussion avec ${name}`,
    dismiss: "Fermer",
    composerPlaceholder: "Écrivez un message…",
    composerLabel: "Message",
    send: "Envoyer",
    hideConversation: "Masquer la conversation",
    showConversation: "Afficher la conversation",
    pickHintTouch:
      "Touchez n'importe quelle partie de votre site — touchez à nouveau le réticule pour annuler",
    pickHintMouse: "Cliquez sur n'importe quelle partie de votre site — Échap annule",
    clearPicked: "Effacer l'élément sélectionné",
    pickElement: "Sélectionner un élément",
    heavyRequest:
      "C'est une modification plus importante, et elle mérite d'être bien faite. Laissez-moi votre e-mail, mon collègue s'en occupera.",
    iterationDone: "C'est fait — touchez pour voir ✨",
    iterationManual: "Celle-ci, je la fais à la main — laissez-moi un instant.",
    escalationSent: "Envoyé. Vous recevrez un message de phillip@nutz.inc.",
    checkoutOpened:
      "J'ai ouvert le paiement sécurisé dans un nouvel onglet — je mets tout en ligne dès qu'il est validé.",
    live: "Vous êtes en ligne 🎉 Je vous envoie vos identifiants par e-mail.",
    checkoutCancelled:
      "Pas de souci — j'ai tout gardé prêt. Vous voulez changer quelque chose d'abord ?",
    iterationFailed: "Hmm, ça n'a pas marché. On réessaie ?",
    emailInvalid: "Cette adresse e-mail semble incorrecte — vous pouvez la vérifier ?",
    checkoutFailed: "Le paiement ne s'est pas ouvert — on réessaie ?",
    streamFailed: "Hmm, ça n'est pas passé — touchez pour réessayer.",
  },
  es: {
    online: "en línea",
    openChat: (name) => `Abrir el chat con ${name}`,
    dismiss: "Cerrar",
    composerPlaceholder: "Escriba un mensaje…",
    composerLabel: "Mensaje",
    send: "Enviar",
    hideConversation: "Ocultar la conversación",
    showConversation: "Mostrar la conversación",
    pickHintTouch: "Toque cualquier parte de su sitio — toque de nuevo la mira para cancelar",
    pickHintMouse: "Haga clic en cualquier parte de su sitio — Esc cancela",
    clearPicked: "Quitar el elemento seleccionado",
    pickElement: "Seleccionar un elemento",
    heavyRequest:
      "Ese es un cambio más grande y merece hacerse bien. Déjeme su correo y mi compañero se encargará.",
    iterationDone: "Listo — toque para verlo ✨",
    iterationManual: "Este lo hago a mano — deme un momento.",
    escalationSent: "Enviado. Recibirá un mensaje de phillip@nutz.inc.",
    checkoutOpened:
      "He abierto el pago seguro en una pestaña nueva — lo pondré todo en marcha en cuanto se complete.",
    live: "Ya está en línea 🎉 Le enviaré sus datos de acceso por correo.",
    checkoutCancelled: "Sin prisa — lo he dejado todo listo. ¿Quiere cambiar algo antes?",
    iterationFailed: "Vaya, no ha funcionado. ¿Lo intentamos otra vez?",
    emailInvalid: "Ese correo no parece correcto — ¿lo revisa?",
    checkoutFailed: "El pago no se ha abierto — ¿lo intentamos otra vez?",
    streamFailed: "Vaya, no se ha enviado — toque para reintentar.",
  },
  it: {
    online: "online",
    openChat: (name) => `Apri la chat con ${name}`,
    dismiss: "Chiudi",
    composerPlaceholder: "Scriva un messaggio…",
    composerLabel: "Messaggio",
    send: "Invia",
    hideConversation: "Nascondi la conversazione",
    showConversation: "Mostra la conversazione",
    pickHintTouch:
      "Tocchi un punto qualsiasi del suo sito — tocchi di nuovo il mirino per annullare",
    pickHintMouse: "Clicchi su un punto qualsiasi del suo sito — Esc annulla",
    clearPicked: "Rimuovi l'elemento selezionato",
    pickElement: "Seleziona un elemento",
    heavyRequest:
      "È una modifica più grande e merita di essere fatta bene. Mi lasci la sua email e se ne occuperà un mio collega.",
    iterationDone: "Fatto — tocchi per vederlo ✨",
    iterationManual: "Questa la faccio a mano — mi dia un momento.",
    escalationSent: "Inviato. Riceverà un messaggio da phillip@nutz.inc.",
    checkoutOpened:
      "Ho aperto il pagamento sicuro in una nuova scheda — metto tutto online appena è completato.",
    live: "È online 🎉 Le invio le credenziali via email.",
    checkoutCancelled: "Nessuna fretta — ho tenuto tutto pronto. Vuole cambiare qualcosa prima?",
    iterationFailed: "Mmh, non ha funzionato. Riproviamo?",
    emailInvalid: "Questa email non sembra giusta — la ricontrolla?",
    checkoutFailed: "Il pagamento non si è aperto — riproviamo?",
    streamFailed: "Mmh, non è passato — tocchi per riprovare.",
  },
  nl: {
    online: "online",
    openChat: (name) => `Chat met ${name} openen`,
    dismiss: "Sluiten",
    composerPlaceholder: "Typ een bericht…",
    composerLabel: "Bericht",
    send: "Versturen",
    hideConversation: "Gesprek verbergen",
    showConversation: "Gesprek tonen",
    pickHintTouch:
      "Tik op een willekeurig deel van uw site — tik nogmaals op het draadkruis om te annuleren",
    pickHintMouse: "Klik op een willekeurig deel van uw site — Esc annuleert",
    clearPicked: "Selectie wissen",
    pickElement: "Een element kiezen",
    heavyRequest:
      "Dat is een grotere aanpassing, en die verdient het om goed gedaan te worden. Laat uw e-mailadres achter, dan pakt mijn collega het op.",
    iterationDone: "Klaar — tik om het te bekijken ✨",
    iterationManual: "Deze doe ik met de hand — geeft u me even.",
    escalationSent: "Verstuurd. U hoort van phillip@nutz.inc.",
    checkoutOpened:
      "Ik heb de beveiligde afrekenpagina in een nieuw tabblad geopend — zodra die rond is, zet ik alles live.",
    live: "U staat live 🎉 Ik mail u uw inloggegevens.",
    checkoutCancelled:
      "Geen stress — ik heb alles klaar laten staan. Wilt u eerst nog iets veranderen?",
    iterationFailed: "Hm, dat lukte niet. Nog een keer proberen?",
    emailInvalid: "Dat e-mailadres lijkt niet te kloppen — kunt u het nakijken?",
    checkoutFailed: "De afrekenpagina ging niet open — nog een keer proberen?",
    streamFailed: "Hm, dat kwam niet door — tik om het opnieuw te proberen.",
  },
  pt: {
    online: "online",
    openChat: (name) => `Abrir o chat com ${name}`,
    dismiss: "Fechar",
    composerPlaceholder: "Escreva uma mensagem…",
    composerLabel: "Mensagem",
    send: "Enviar",
    hideConversation: "Ocultar a conversa",
    showConversation: "Mostrar a conversa",
    pickHintTouch: "Toque em qualquer parte do seu site — toque novamente na mira para cancelar",
    pickHintMouse: "Clique em qualquer parte do seu site — Esc cancela",
    clearPicked: "Limpar o elemento selecionado",
    pickElement: "Selecionar um elemento",
    heavyRequest:
      "Essa é uma alteração maior e merece ser bem feita. Deixe-me o seu e-mail e o meu colega trata disso.",
    iterationDone: "Pronto — toque para ver ✨",
    iterationManual: "Esta faço à mão — dê-me um momento.",
    escalationSent: "Enviado. Vai receber uma mensagem de phillip@nutz.inc.",
    checkoutOpened:
      "Abri o pagamento seguro num novo separador — assim que estiver concluído, coloco tudo no ar.",
    live: "Está no ar 🎉 Envio-lhe os dados de acesso por e-mail.",
    checkoutCancelled: "Sem pressa — deixei tudo pronto. Quer mudar alguma coisa primeiro?",
    iterationFailed: "Hm, não resultou. Tentamos de novo?",
    emailInvalid: "Esse e-mail não parece certo — pode confirmar?",
    checkoutFailed: "O pagamento não abriu — tentamos de novo?",
    streamFailed: "Hm, não foi enviado — toque para tentar de novo.",
  },
};

/** The widget's own copy in the lead's language. Absent/unknown → English. */
export function widgetCopy(language: Language | undefined = DEFAULT_LANGUAGE): WidgetCopy {
  return COPY[coerceLanguage(language)];
}
