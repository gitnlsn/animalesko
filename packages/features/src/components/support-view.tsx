"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from "@animalesko/ui";
import { HelpCircle, Mail, MessageCircle, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const FAQ = [
  {
    question: "Como funciona a adoção?",
    answer:
      "Você encontra um pet na aba Adoção, abre o perfil dele e toca em “Quero adotar”. Isso abre uma conversa com o abrigo responsável, que combina a visita e conduz o processo. A Animalesko não cobra nada pela adoção.",
  },
  {
    question: "Quanto custa usar a Animalesko?",
    answer:
      "Navegar, adotar e conversar é gratuito. Você paga apenas pelos serviços que agendar, e o valor é sempre o que o prestador publicou — sem taxa escondida no checkout.",
  },
  {
    question: "Posso cancelar um agendamento?",
    answer:
      "Sim, enquanto ele estiver pendente ou confirmado. Abra o Histórico de serviços e toque em Cancelar. O prestador é avisado e o horário volta a ficar livre na agenda dele.",
  },
  {
    question: "Como funciona o Pet Alert?",
    answer:
      "É um mural de pets perdidos com mapa. Qualquer pessoa pode ver os alertas da região, mesmo sem conta. Se você reconhecer um animal, registre um avistamento: o tutor é notificado na hora e você ganha 50 Pontos Aumigos.",
  },
  {
    question: "O que são Pontos Aumigos?",
    answer:
      "É a pontuação que você acumula ajudando: favoritar um pet, avaliar um prestador, ajudar no Pet Alert. Os pontos sobem de nível e desbloqueiam badges no seu perfil.",
  },
  {
    question: "Meu prestador não apareceu. E agora?",
    answer:
      "Fale com ele pela conversa do agendamento e, se não houver resposta, cancele — o serviço não será cobrado. Depois avalie honestamente: a nota do prestador é a média real das avaliações de quem contratou.",
  },
];

/**
 * A scripted responder, not an AI.
 *
 * Keyword matching over the FAQ above, exactly as the prototype's "chatbot" did
 * — no request leaves the browser. Kept because it genuinely helps someone who
 * would rather type than scan a list, and labelled honestly in the UI so nobody
 * mistakes it for a person or a model.
 *
 * Acceptance criterion: every question string in FAQ must match its own entry's
 * KEYWORDS regex here (verified character-by-character), so tapping a suggested
 * question — or typing it back — never falls through to the fallback message.
 * The regexes also cover the app's own brand terms ("Pet Alert", "Aumigos") so
 * users typing those words land on the right answer too.
 */
const KEYWORDS: { match: RegExp; answer: string }[] = [
  { match: /ado[çc]|adotar/i, answer: FAQ[0]!.answer },
  { match: /pre[çc]o|cust[ao]|caro|gr[aá]tis|pagar|pagamento/i, answer: FAQ[1]!.answer },
  { match: /cancel/i, answer: FAQ[2]!.answer },
  { match: /perdid|alerta|sumiu|achei|encontr|pet ?alert/i, answer: FAQ[3]!.answer },
  { match: /ponto|n[ií]vel|badge|aumigo/i, answer: FAQ[4]!.answer },
  { match: /prestador|n[ãa]o apareceu|atras/i, answer: FAQ[5]!.answer },
];

const FALLBACK =
  "Não encontrei isso na minha lista 😅 Toque em “Falar com a gente” abaixo e uma pessoa de verdade te responde.";

interface ChatTurn {
  from: "user" | "bot";
  text: string;
}

export function SupportView() {
  return (
    <Tabs defaultValue="faq">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="faq">FAQ</TabsTrigger>
        <TabsTrigger value="chat">Assistente</TabsTrigger>
      </TabsList>

      <TabsContent value="faq" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HelpCircle size={18} className="text-primary" />
              Perguntas frequentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              {FAQ.map((entry, index) => (
                <AccordionItem key={entry.question} value={`item-${index}`}>
                  <AccordionTrigger>{entry.question}</AccordionTrigger>
                  <AccordionContent>{entry.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <ContactCard />
      </TabsContent>

      <TabsContent value="chat" className="space-y-4">
        <Chatbot />
        <ContactCard />
      </TabsContent>
    </Tabs>
  );
}

function Chatbot() {
  const [turns, setTurns] = useState<ChatTurn[]>([
    { from: "bot", text: "Oi! 🐾 Sou um assistente automático. Sobre o que você quer saber?" },
  ]);
  const [draft, setDraft] = useState("");

  function ask(question: string) {
    const answer = KEYWORDS.find((entry) => entry.match.test(question))?.answer ?? FALLBACK;

    setTurns((current) => [
      ...current,
      { from: "user", text: question },
      { from: "bot", text: answer },
    ]);
    setDraft("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle size={18} className="text-primary" />
          Assistente automático
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Respostas prontas por palavra-chave — não é uma pessoa nem uma IA.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        <ScrollArea className="h-64 rounded-lg border p-3">
          <ul className="space-y-3">
            {turns.map((turn, index) => (
              <li
                key={index}
                className={cn("flex", turn.from === "user" ? "justify-end" : "justify-start")}
              >
                <p
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    turn.from === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted",
                  )}
                >
                  {turn.text}
                </p>
              </li>
            ))}
          </ul>
        </ScrollArea>

        <div className="flex flex-wrap gap-2">
          {FAQ.slice(0, 3).map((entry) => (
            <Button
              key={entry.question}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => ask(entry.question)}
            >
              {entry.question}
            </Button>
          ))}
        </div>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (draft.trim()) ask(draft.trim());
          }}
        >
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Digite sua dúvida…"
            aria-label="Sua dúvida"
          />
          <Button type="submit" size="icon" aria-label="Perguntar">
            <Send size={16} />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ContactCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ainda precisa de ajuda?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button asChild className="w-full">
          <Link href="/mensagens">
            <MessageCircle size={16} />
            Falar com a gente
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <a href="mailto:suporte@animalesko.com.br">
            <Mail size={16} />
            suporte@animalesko.com.br
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
