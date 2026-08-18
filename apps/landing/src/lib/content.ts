import adocaoPet from "~/../public/images/servico-adocao-pet.webp";
import banhoETosa from "~/../public/images/servico-banho-e-tosa.webp";
import crechePet from "~/../public/images/servico-creche-pet.webp";
import hospedagemPet from "~/../public/images/servico-hospedagem-pet.webp";
import petSitter from "~/../public/images/servico-pet-sitter.webp";
import petWalker from "~/../public/images/servico-pet-walker.webp";

import type { StaticImageData } from "next/image";

/**
 * The copy of the site, in one file.
 *
 * Every service here becomes its own statically rendered route under
 * `/servicos/<slug>` — that is the whole point of the file. The Framer page
 * pointed all six "Saiba mais" buttons at a single "página em construção", so
 * six distinct search intents ("banho e tosa perto de mim", "creche para cães")
 * had nothing to rank. One page per service, each with its own title,
 * description, body copy and FAQ, is the single largest SEO change in this app.
 *
 * `intent` records who the page is written for, because the two audiences want
 * opposite things from the same word: a tutor searching "pet sitter" wants to
 * hire one, a provider wants to be found as one. Each page addresses the tutor
 * first and closes with the provider path.
 */

export type Service = {
  slug: string;
  /** Short label, used in cards and navigation. */
  name: string;
  /** The <h1> of the service page — longer and more specific than `name`. */
  heading: string;
  /** One line. Doubles as the card copy and the meta description seed. */
  summary: string;
  /** The meta description. Kept under ~155 characters on purpose. */
  metaDescription: string;
  intro: string;
  /** What the service covers. Rendered as a list and read by crawlers. */
  includes: string[];
  faq: { question: string; answer: string }[];
  image: StaticImageData;
  imageAlt: string;
  /** Feeds the `keywords` metadata field and the Service JSON-LD. */
  keywords: string[];
};

export const services: Service[] = [
  {
    slug: "banho-e-tosa",
    name: "Banho e Tosa",
    heading: "Banho e tosa para cães e gatos",
    summary: "Seu pet limpinho, cheiroso e cheio de estilo no banho e tosa!",
    metaDescription:
      "Encontre banho e tosa para cães e gatos com profissionais avaliados na Animalesko. Compare serviços, veja avaliações e agende pelo app.",
    intro:
      "Banho e tosa é rotina de saúde, não só de beleza. Pelagem limpa e bem aparada previne nós, dermatites e parasitas — e um pet que sai do banho tranquilo é sinal de que foi manuseado por quem entende do assunto. Na Animalesko você compara profissionais perto de você, vê as avaliações de outros tutores e agenda sem precisar ligar para ninguém.",
    includes: [
      "Banho com produtos adequados ao tipo de pelagem e à pele do seu pet",
      "Tosa higiênica, tosa na máquina ou tosa na tesoura, conforme a raça",
      "Corte de unhas, limpeza de ouvidos e escovação",
      "Profissionais avaliados por outros tutores da plataforma",
    ],
    faq: [
      {
        question: "Com que frequência meu cachorro precisa de banho?",
        answer:
          "Depende da raça, do tipo de pelagem e da rotina do pet. Na maioria dos casos, entre 15 e 30 dias é suficiente. Banhos excessivos removem a oleosidade natural da pele. O profissional que atender seu pet pode orientar o intervalo ideal.",
      },
      {
        question: "Vocês atendem gatos?",
        answer:
          "Sim. Vários profissionais da rede Animalesko atendem gatos e usam manejo específico para reduzir o estresse. Ao buscar no app, você consegue filtrar quem atende felinos.",
      },
      {
        question: "Como sei se o profissional é confiável?",
        answer:
          "Cada prestador da rede tem um perfil com avaliações e histórico de atendimentos feitos pela plataforma. Você vê a nota e os comentários de outros tutores antes de agendar.",
      },
    ],
    image: banhoETosa,
    imageAlt:
      "Cachorro de porte pequeno sendo tosado por um profissional em uma mesa de banho e tosa",
    keywords: ["banho e tosa", "tosa higiênica", "banho para cachorro", "banho e tosa para gatos"],
  },
  {
    slug: "adocao-pet",
    name: "Adoção Pet",
    heading: "Adoção responsável de cães e gatos",
    summary: "Quer aumentar a família? Adote um pet e ganhe um amigo.",
    metaDescription:
      "Adote um cão ou gato com segurança. A Animalesko conecta tutores a ONGs e protetores, com perfil completo de cada animal disponível para adoção.",
    intro:
      "Adotar é a razão de existir da Animalesko. Reduzir o abandono começa por encurtar a distância entre quem quer adotar e quem cuida dos animais que esperam por um lar. No app você conhece a história, o temperamento e as necessidades de cada pet antes de decidir — porque uma adoção que dá certo é uma adoção bem informada.",
    includes: [
      "Perfis com idade, porte, temperamento e histórico de saúde de cada animal",
      "Contato direto com a ONG ou protetor responsável",
      "Orientação sobre a adaptação nas primeiras semanas",
      "Acompanhamento pós-adoção pelos parceiros da rede",
    ],
    faq: [
      {
        question: "Adotar pela Animalesko tem custo?",
        answer:
          "A adoção em si não é uma venda. Algumas ONGs pedem uma contribuição para cobrir castração, vacinas e vermífugo já aplicados no animal. Esse valor, quando existe, aparece no perfil do pet antes de qualquer contato.",
      },
      {
        question: "Quais documentos preciso apresentar?",
        answer:
          "Cada ONG define o próprio processo. É comum pedir documento com foto, comprovante de residência e uma conversa ou visita antes da entrega. O responsável pelo animal explica os passos no primeiro contato.",
      },
      {
        question: "Moro em apartamento. Posso adotar?",
        answer:
          "Pode. O que importa é a compatibilidade entre o espaço, a rotina da família e as necessidades do animal. Os perfis indicam o porte e o nível de energia de cada pet para ajudar nessa escolha.",
      },
    ],
    image: adocaoPet,
    imageAlt: "Casal sentado no sofá acariciando um gato de pelagem rajada no colo",
    keywords: ["adoção de animais", "adotar cachorro", "adotar gato", "adoção responsável"],
  },
  {
    slug: "pet-walker",
    name: "Pet Walker",
    heading: "Passeador de cães (dog walker)",
    summary: "Passeios cheios de energia para o bem-estar do seu pet!",
    metaDescription:
      "Contrate um passeador de cães de confiança na Animalesko. Passeios com horário combinado, profissionais avaliados e agendamento pelo app.",
    intro:
      "Cachorro que passeia gasta energia, socializa e dorme melhor — e late menos. Quando a rotina não deixa espaço para o passeio diário, um pet walker resolve. Na Animalesko você encontra passeadores perto de casa, combina os dias e horários e acompanha os atendimentos pelo app.",
    includes: [
      "Passeios individuais ou em grupo, conforme o perfil do seu cão",
      "Horários combinados e recorrência semanal",
      "Profissionais avaliados por outros tutores",
      "Histórico dos passeios registrado na plataforma",
    ],
    faq: [
      {
        question: "Quanto tempo dura um passeio?",
        answer:
          "O mais comum são passeios de 30 a 60 minutos. A duração ideal depende do porte, da idade e do nível de energia do cão — um filhote ou um cão idoso costuma se cansar antes.",
      },
      {
        question: "Meu cão puxa muito a guia. Isso é um problema?",
        answer:
          "Não impede a contratação. Informe isso no agendamento para que o passeador se prepare e escolha o equipamento adequado. Vários profissionais da rede trabalham com condução e adestramento básico.",
      },
      {
        question: "Posso contratar passeios só em alguns dias da semana?",
        answer:
          "Sim. Você define a frequência: avulso, alguns dias por semana ou todos os dias úteis.",
      },
    ],
    image: petWalker,
    imageAlt: "Beagle na guia olhando para o tutor durante um passeio em parque no outono",
    keywords: ["dog walker", "passeador de cães", "passeio para cachorro", "pet walker"],
  },
  {
    slug: "pet-sitter",
    name: "Pet Sitter",
    heading: "Pet sitter: cuidado do seu pet em casa",
    summary: "Cuidamos do seu pet enquanto você está fora. Fale conosco.",
    metaDescription:
      "Pet sitter de confiança para cuidar do seu animal na sua casa enquanto você viaja. Encontre, compare e agende profissionais pela Animalesko.",
    intro:
      "Nem todo pet lida bem com mudança de ambiente — gatos, em especial, costumam sofrer mais com a viagem até um hotel do que com a ausência do tutor. O pet sitter vai até a sua casa, mantém a rotina de alimentação, higiene e carinho, e envia notícias. Seu pet fica no território dele; você viaja tranquilo.",
    includes: [
      "Visitas na sua casa com frequência combinada",
      "Alimentação, água fresca, troca de caixa de areia e limpeza",
      "Administração de medicação quando necessário",
      "Relato e fotos a cada visita",
    ],
    faq: [
      {
        question: "Quantas visitas por dia são recomendadas?",
        answer:
          "Para gatos, uma visita diária costuma bastar. Para cães, o comum são duas ou três, já que precisam sair para as necessidades. Filhotes e animais em tratamento pedem visitas mais frequentes.",
      },
      {
        question: "O pet sitter pode dar remédio ao meu pet?",
        answer:
          "Sim, desde que você deixe a prescrição e as instruções claras no agendamento. Informe dose, horário e forma de administração.",
      },
      {
        question: "Como funciona a entrega das chaves?",
        answer:
          "Isso é combinado entre você e o profissional antes da primeira visita — normalmente em um encontro de apresentação, que também serve para o pet conhecer quem vai cuidar dele.",
      },
    ],
    image: petSitter,
    imageAlt: "Cachorro enrolado em um cobertor laranja no sofá de casa",
    keywords: ["pet sitter", "cuidador de pets", "babá de pet", "cuidar do pet durante viagem"],
  },
  {
    slug: "creche-pet",
    name: "Creche Pet",
    heading: "Creche para cães (day care)",
    summary: "Seu pet brinca, faz amigos e volta para casa feliz e tranquilo.",
    metaDescription:
      "Creche para cães com atividades, socialização e supervisão durante o dia. Compare creches pet avaliadas e agende pela Animalesko.",
    intro:
      "Creche pet é para o cão que fica muitas horas sozinho. Em vez de esperar o dia inteiro em casa, ele passa o dia entre brincadeiras, descanso e convívio com outros cães, sob supervisão. Costuma resolver de uma vez ansiedade de separação, destruição de móveis e excesso de energia à noite.",
    includes: [
      "Período integral ou meio período, com entrada e saída combinadas",
      "Atividades dirigidas e descanso em ambiente supervisionado",
      "Socialização com cães de porte e temperamento compatíveis",
      "Relato do dia para o tutor",
    ],
    faq: [
      {
        question: "Meu cão precisa estar com as vacinas em dia?",
        answer:
          "Sim. Como há convívio com outros animais, as creches exigem carteira de vacinação atualizada, incluindo a antirrábica e a polivalente, além do controle de parasitas.",
      },
      {
        question: "E se meu cão não se der bem com outros cães?",
        answer:
          "As creches costumam fazer um dia de avaliação antes de aceitar a matrícula, justamente para observar a interação. Se a convivência em grupo não for indicada, um pet sitter ou passeios individuais atendem melhor.",
      },
      {
        question: "Existe idade mínima?",
        answer:
          "A maioria aceita filhotes a partir do ciclo completo de vacinação. Cada creche define a própria política e informa no perfil.",
      },
    ],
    image: crechePet,
    imageAlt: "Dois gatos descansando em um arranhador de madeira dentro de casa",
    keywords: ["creche para cães", "day care pet", "creche pet", "hotelzinho de dia"],
  },
  {
    slug: "hospedagem-pet",
    name: "Hospedagem Pet",
    heading: "Hospedagem pet: hotel para cães e gatos",
    summary: "Atenção e diversão para o seu pet enquanto você viaja.",
    metaDescription:
      "Hospedagem para cães e gatos com acompanhamento e rotina de cuidados. Encontre hotéis pet e famílias hospedeiras avaliadas na Animalesko.",
    intro:
      "Quando levar o pet junto não é opção, a hospedagem resolve a viagem inteira. A rede reúne hotéis pet e famílias hospedeiras que recebem o animal em casa — modelo que costuma funcionar melhor para pets que estranham ambientes com muitos cães. Você compara as duas opções, vê as avaliações e reserva pelo app.",
    includes: [
      "Hospedagem por diária, com data de entrada e saída definidas",
      "Alimentação com a ração do próprio pet, mantendo a rotina",
      "Espaço para descanso e atividades ao longo do dia",
      "Atualizações e fotos para o tutor durante a estadia",
    ],
    faq: [
      {
        question: "Posso levar a ração e os objetos do meu pet?",
        answer:
          "Sim, e é recomendado. Manter a mesma ração evita problemas digestivos, e um cobertor ou brinquedo conhecido ajuda muito na adaptação ao ambiente novo.",
      },
      {
        question: "Qual a diferença entre hotel pet e família hospedeira?",
        answer:
          "No hotel, o pet fica em uma estrutura dedicada, com outros animais. Na família hospedeira, ele fica na casa de alguém da rede, em ambiente doméstico e com menos animais por perto. Pets mais tímidos costumam se adaptar melhor à segunda opção.",
      },
      {
        question: "Preciso reservar com antecedência?",
        answer:
          "Em feriados e férias escolares, sim — a procura aumenta bastante. Fora dessas datas, costuma haver disponibilidade com poucos dias de antecedência.",
      },
    ],
    image: hospedagemPet,
    imageAlt: "Gato deitado em uma poltrona amarela recebendo carinho de uma pessoa",
    keywords: ["hospedagem pet", "hotel para cachorro", "hotel para gatos", "família hospedeira"],
  },
];

export function getService(slug: string): Service | undefined {
  return services.find((service) => service.slug === slug);
}

/**
 * The three audiences the landing has to separate on first sight.
 *
 * This is the structure the whole site turns on: a visitor is either a tutor
 * (goes to the app), a provider (goes to the back office) or an NGO. Everything
 * else on the page is context for choosing one of the three.
 */
export const audiences = [
  {
    id: "tutores",
    eyebrow: "Amigos de pets",
    title: "Tenho um pet — ou quero adotar",
    description:
      "Adote um bichinho e descubra tudo o que você precisa para cuidar dele com amor: serviços perto de você, agendamento e histórico do seu pet em um só app.",
    href: "/para-tutores",
  },
  {
    id: "prestadores",
    eyebrow: "Serviços para pets",
    title: "Ofereço serviços para pets",
    description:
      "Se você quer oferecer serviços ou cuidados para pets, venha fazer parte da nossa rede. Agenda, clientes e faturamento organizados no back office.",
    href: "/para-prestadores",
  },
  {
    id: "ongs",
    eyebrow: "ONGs de animais",
    title: "Cuido de animais resgatados",
    description:
      "Conectamos pets às pessoas certas e oferecemos suporte na organização da sua ONG, do cadastro dos animais ao acompanhamento das adoções.",
    href: "/ongs",
  },
] as const;

/** Home-page FAQ. Also emitted as FAQPage structured data. */
export const homeFaq = [
  {
    question: "O que é a Animalesko?",
    answer:
      "A Animalesko é uma plataforma brasileira que conecta tutores de pets a serviços especializados e a animais disponíveis para adoção, e que dá a prestadores e ONGs as ferramentas para organizar esse atendimento. A missão é reduzir o abandono de animais.",
  },
  {
    question: "A Animalesko é gratuita para quem tem pet?",
    answer:
      "Sim. Criar conta, buscar serviços, ver animais para adoção e falar com ONGs não tem custo. Você paga apenas o serviço que contratar, ao prestador escolhido.",
  },
  {
    question: "Sou tutor. Por onde eu começo?",
    answer:
      "Pelo app, em app.animalesko.org. Ele funciona no navegador do computador e do celular, sem instalar nada. É onde você busca serviços, agenda atendimentos e acompanha o histórico do seu pet.",
  },
  {
    question: "Ofereço serviços para pets. Onde eu me cadastro?",
    answer:
      "No back office, em backoffice.animalesko.org. É a área de gestão para banho e tosa, creches, hotéis, pet sitters, passeadores e clínicas: agenda, clientes, serviços e faturamento em um só lugar.",
  },
  {
    question: "Em quais cidades a Animalesko atende?",
    answer:
      "A rede está em expansão e a disponibilidade varia por região. Ao buscar um serviço no app, você vê os profissionais que atendem o seu endereço.",
  },
  {
    question: "Como meus dados são tratados?",
    answer:
      "Pedimos apenas o necessário para o contato e o atendimento. O tratamento dos dados segue a LGPD (Lei nº 13.709/2018) e está descrito na política de privacidade.",
  },
];
