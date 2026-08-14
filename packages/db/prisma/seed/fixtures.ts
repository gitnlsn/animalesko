/**
 * The vocabulary the seed draws from.
 *
 * Hand-written rather than generated: a review is about judging screens, and
 * `Aliquam Consectetur` in a pet card tells you nothing about whether the card
 * works. Everything here is plausible Brazilian Portuguese, because that is
 * what the apps are written in — a name pool in English would make every list
 * look wrong in a way that has nothing to do with the layout.
 */

// --- Photos -----------------------------------------------------------------
//
// Unsplash ids, each one checked to resolve and to actually depict what the
// pool says it does. `images.unsplash.com` is allow-listed in both apps'
// next.config.ts alongside the Blob host; without that entry next/image refuses
// to optimise these and every card falls back to PLACEHOLDER_PET_IMAGE.

/** Sized, cropped and re-encoded by Unsplash rather than by us. */
export function photo(unsplashId: string, width = 800, height = 600): string {
  return `https://images.unsplash.com/photo-${unsplashId}?auto=format&fit=crop&w=${width}&h=${height}&q=70`;
}

const DOG_PHOTO_IDS = [
  "1543466835-00a7907e9de1",
  "1552053831-71594a27632d",
  "1583511655857-d19b40a7a54e",
  "1587300003388-59208cc962cb",
  "1518717758536-85ae29035b6d",
  "1517423440428-a5a00ad493e8",
  "1548199973-03cce0bbc87b",
  "1537151625747-768eb6cf92b2",
  "1561037404-61cd46aa615b",
  "1591160690555-5debfba289f0",
  "1583337130417-3346a1be7dee",
  "1601979031925-424e53b6caaa",
  "1568572933382-74d440642117",
  "1477884213360-7e9d7dcc1e48",
  "1583512603805-3cc6b41f3edb",
  "1507146426996-ef05306b995a",
  "1596797882870-8c33deeac224",
];

const CAT_PHOTO_IDS = [
  "1514888286974-6c03e2ca1dba",
  "1574158622682-e40e69881006",
  "1495360010541-f48722b34f7d",
  "1494256997604-768d1f608cac",
  "1533738363-b7f9aef128ce",
  "1526336024174-e58f5cdd8e13",
  "1596854407944-bf87f6fdd49e",
  "1592194996308-7b43878e84a6",
  "1450778869180-41d0601e046e",
  "1561948955-570b270e7c36",
  "1573865526739-10659fec78a5",
  "1511044568932-338cba0ad803",
  "1518791841217-8f162f1e1131",
  "1519052537078-e6302a4968d4",
  "1478098711619-5ab0b478d6e6",
  "1493406300581-484b937cdc41",
  "1529778873920-4da4926a72c2",
  "1548802673-380ab8ebc7b7",
  "1472491235688-bdc81a63246e",
  "1591871937573-74dbba515c4c",
];

const BIRD_PHOTO_IDS = ["1552728089-57bdde30beb3", "1444464666168-49d633b86797"];
const RODENT_PHOTO_IDS = ["1425082661705-1834bfd09dca", "1548767797-d8c844163c4c"];
const FISH_PHOTO_IDS = ["1522069169874-c58ec4b76be5"];
const OTHER_PHOTO_IDS = ["1535241749838-299277b6305f", "1591382386627-349b692688ff"];

/**
 * REPTILE has no verified photo, so reptiles are seeded without one and fall
 * back to the apps' own `/images/hero-pet.jpg`. A rabbit standing in for a
 * jabuti would be noticed immediately and would undermine every other photo on
 * the screen.
 */
export const PHOTOS_BY_SPECIES: Record<string, string[]> = {
  DOG: DOG_PHOTO_IDS,
  CAT: CAT_PHOTO_IDS,
  BIRD: BIRD_PHOTO_IDS,
  RODENT: RODENT_PHOTO_IDS,
  FISH: FISH_PHOTO_IDS,
  REPTILE: [],
  OTHER: OTHER_PHOTO_IDS,
};

/** Head-and-shoulders portraits, for `User.image`. */
export const AVATAR_PHOTO_IDS = [
  "1438761681033-6461ffad8d80",
  "1500648767791-00dcc994a43e",
  "1494790108377-be9c29b29330",
  "1534528741775-53994a69daeb",
  "1517841905240-472988babdf9",
  "1506794778202-cad84cf45f1d",
  "1544005313-94ddf0286df2",
  "1489424731084-a5d8b219a5bb",
  "1502685104226-ee32379fefbe",
  "1573497019940-1c28c88b4f3e",
  "1580489944761-15a19d654956",
  "1607746882042-944635dfe10e",
  "1527980965255-d3b416303d12",
  "1560250097-0b93528c311a",
  "1600486913747-55e5470d6f40",
  "1521119989659-a83eee488004",
  "1519085360753-af0119f7cbe7",
  "1463453091185-61582044d556",
  "1568602471122-7832951cc4c5",
  "1507003211169-0a1dd7228f2d",
  "1531123897727-8f129e1688ce",
];

/** `Organization.avatarUrl` — a clinic interior plus animal portraits. */
export const ORG_PHOTO_IDS = [
  "1580281658223-9b93f18ae9ae",
  "1543466835-00a7907e9de1",
  "1514888286974-6c03e2ca1dba",
  "1537151625747-768eb6cf92b2",
  "1573865526739-10659fec78a5",
  "1601979031925-424e53b6caaa",
];

// --- Places -----------------------------------------------------------------
//
// Coordinates matter: /pet-alert centres on the browser's geolocation and falls
// back to São Paulo, then filters alerts to a ±100 km bounding box. Alerts
// outside it are invisible on first load, so the majority of the population
// lives in and around the capital and the rest is spread nationally to give the
// `state` filter something to do.

export interface City {
  name: string;
  state: string;
  lat: number;
  lng: number;
  /** Area code, so seeded phone numbers are plausible for the address. */
  ddd: string;
  /** Roughly within the /pet-alert default viewport. */
  nearCapital: boolean;
}

export const CITIES: City[] = [
  { name: "São Paulo", state: "SP", lat: -23.5505, lng: -46.6333, ddd: "11", nearCapital: true },
  { name: "Guarulhos", state: "SP", lat: -23.4538, lng: -46.5333, ddd: "11", nearCapital: true },
  { name: "Osasco", state: "SP", lat: -23.5324, lng: -46.7916, ddd: "11", nearCapital: true },
  { name: "Santo André", state: "SP", lat: -23.6639, lng: -46.5383, ddd: "11", nearCapital: true },
  {
    name: "São Bernardo do Campo",
    state: "SP",
    lat: -23.6914,
    lng: -46.5646,
    ddd: "11",
    nearCapital: true,
  },
  { name: "Campinas", state: "SP", lat: -22.9099, lng: -47.0626, ddd: "19", nearCapital: true },
  {
    name: "Rio de Janeiro",
    state: "RJ",
    lat: -22.9068,
    lng: -43.1729,
    ddd: "21",
    nearCapital: false,
  },
  { name: "Niterói", state: "RJ", lat: -22.8832, lng: -43.1034, ddd: "21", nearCapital: false },
  {
    name: "Belo Horizonte",
    state: "MG",
    lat: -19.9167,
    lng: -43.9345,
    ddd: "31",
    nearCapital: false,
  },
  { name: "Curitiba", state: "PR", lat: -25.4284, lng: -49.2733, ddd: "41", nearCapital: false },
  {
    name: "Porto Alegre",
    state: "RS",
    lat: -30.0346,
    lng: -51.2177,
    ddd: "51",
    nearCapital: false,
  },
  {
    name: "Florianópolis",
    state: "SC",
    lat: -27.5954,
    lng: -48.548,
    ddd: "48",
    nearCapital: false,
  },
  { name: "Salvador", state: "BA", lat: -12.9777, lng: -38.5016, ddd: "71", nearCapital: false },
  { name: "Recife", state: "PE", lat: -8.0476, lng: -34.877, ddd: "81", nearCapital: false },
];

export const CAPITAL = CITIES[0]!;

export const NEIGHBOURHOODS = [
  "Vila Mariana",
  "Pinheiros",
  "Moema",
  "Tatuapé",
  "Santana",
  "Butantã",
  "Ipiranga",
  "Lapa",
  "Perdizes",
  "Brooklin",
  "Vila Madalena",
  "Bela Vista",
  "Itaim Bibi",
  "Saúde",
  "Mooca",
  "Campo Belo",
];

export const STREETS = [
  "Rua das Acácias",
  "Av. Rebouças",
  "Rua Domingos de Morais",
  "Av. Paulista",
  "Rua Harmonia",
  "Rua Vergueiro",
  "Av. Ibirapuera",
  "Rua Augusta",
  "Rua Teodoro Sampaio",
  "Av. Brigadeiro Faria Lima",
  "Rua Cardeal Arcoverde",
  "Rua Joaquim Floriano",
];

export const LANDMARKS = [
  "Parque do Ibirapuera",
  "Praça Benedito Calixto",
  "Av. Paulista, próximo ao MASP",
  "Parque Villa-Lobos",
  "Praça da Sé",
  "Largo da Batata",
  "Parque da Aclimação",
  "Praça Roosevelt",
  "Parque Trianon",
  "Mercado Municipal",
  "Estação da Luz",
  "Parque Buenos Aires",
];

// --- People -----------------------------------------------------------------

export const FIRST_NAMES = [
  "Ana",
  "Beatriz",
  "Camila",
  "Daniela",
  "Eduarda",
  "Fernanda",
  "Gabriela",
  "Helena",
  "Isabela",
  "Juliana",
  "Larissa",
  "Mariana",
  "Natália",
  "Patrícia",
  "Rafaela",
  "Sabrina",
  "Tatiane",
  "Vanessa",
  "Bruno",
  "Caio",
  "Diego",
  "Eduardo",
  "Felipe",
  "Gustavo",
  "Henrique",
  "Igor",
  "Jonas",
  "Leandro",
  "Marcelo",
  "Nelson",
  "Otávio",
  "Paulo",
  "Rodrigo",
  "Samuel",
  "Thiago",
  "Vinícius",
  "Wagner",
  "Yuri",
];

export const LAST_NAMES = [
  "Silva",
  "Santos",
  "Oliveira",
  "Souza",
  "Rodrigues",
  "Ferreira",
  "Alves",
  "Pereira",
  "Lima",
  "Gomes",
  "Costa",
  "Ribeiro",
  "Martins",
  "Carvalho",
  "Almeida",
  "Lopes",
  "Barbosa",
  "Rocha",
  "Dias",
  "Nascimento",
  "Moreira",
  "Araújo",
  "Cardoso",
  "Teixeira",
];

export const USER_BIOS = [
  "Apaixonado por pets e sempre em busca dos melhores cuidados para meus companheiros.",
  "Tutora de dois gatos resgatados. Voluntária em feiras de adoção nos fins de semana.",
  "Moro em apartamento e adoro caminhadas longas no parque com meu cachorro.",
  "Acredito que adotar muda duas vidas. Já ajudei sete animais a encontrarem lar.",
  "Trabalho em casa, então meu pet tem companhia o dia inteiro.",
  "Primeira vez tutor. Aprendendo tudo e amando cada minuto.",
  "Família grande, quintal grande e espaço de sobra para mais um focinho.",
  null,
  null,
];

// --- Organizations ----------------------------------------------------------

export interface OrgTemplate {
  slug: string;
  name: string;
  type: "SHELTER" | "CLINIC" | "PETSHOP" | "INDEPENDENT";
  description: string;
}

/**
 * Twenty providers, weighted towards shelters and clinics because those are the
 * two that drive the most screens in `plus`: adoption listings are shelter-only
 * and the clinical tabs only fill up for an org that actually treats animals.
 */
export const ORGANIZATIONS: OrgTemplate[] = [
  {
    slug: "abrigo-amigo",
    name: "Abrigo Amigo",
    type: "SHELTER",
    description: "ONG dedicada ao resgate e adoção responsável.",
  },
  {
    slug: "lar-dos-focinhos",
    name: "Lar dos Focinhos",
    type: "SHELTER",
    description: "Abrigo comunitário mantido por voluntários desde 2014.",
  },
  {
    slug: "patas-do-bem",
    name: "Patas do Bem",
    type: "SHELTER",
    description: "Resgate de animais em situação de rua e reabilitação para adoção.",
  },
  {
    slug: "segunda-chance",
    name: "Instituto Segunda Chance",
    type: "SHELTER",
    description: "Cuidamos de animais idosos e com necessidades especiais.",
  },
  {
    slug: "refugio-quatro-patas",
    name: "Refúgio Quatro Patas",
    type: "SHELTER",
    description: "Santuário para cães e gatos resgatados de maus-tratos.",
  },
  {
    slug: "clinica-vida-animal",
    name: "Clínica Vida Animal",
    type: "CLINIC",
    description: "Clínica veterinária completa, com atendimento 24 horas.",
  },
  {
    slug: "vet-center-paulista",
    name: "Vet Center Paulista",
    type: "CLINIC",
    description: "Consultas, exames de imagem e cirurgias de pequeno porte.",
  },
  {
    slug: "clinica-sao-francisco",
    name: "Clínica São Francisco",
    type: "CLINIC",
    description: "Medicina preventiva e vacinação com hora marcada.",
  },
  {
    slug: "hospital-pet-vida",
    name: "Hospital Pet Vida",
    type: "CLINIC",
    description: "Pronto-socorro veterinário e internação monitorada.",
  },
  {
    slug: "clinica-bicho-feliz",
    name: "Clínica Bicho Feliz",
    type: "CLINIC",
    description: "Atendimento clínico, odontologia e nutrição animal.",
  },
  {
    slug: "petshop-mundo-animal",
    name: "Petshop Mundo Animal",
    type: "PETSHOP",
    description: "Banho, tosa e produtos para todas as espécies.",
  },
  {
    slug: "banho-e-tosa-da-vila",
    name: "Banho & Tosa da Vila",
    type: "PETSHOP",
    description: "Estética animal sem estresse, com hora marcada.",
  },
  {
    slug: "petshop-au-miau",
    name: "Petshop Au & Miau",
    type: "PETSHOP",
    description: "Loja de bairro com serviços de higiene e day care.",
  },
  {
    slug: "espaco-pet-brooklin",
    name: "Espaço Pet Brooklin",
    type: "PETSHOP",
    description: "Hotelzinho, creche e banho com transporte incluso.",
  },
  {
    slug: "pet-care-silva",
    name: "Pet Care Silva",
    type: "INDEPENDENT",
    description: "Cuidado especializado para seu pet em casa, com muito carinho e atenção.",
  },
  {
    slug: "passeios-do-joao",
    name: "Passeios do João",
    type: "INDEPENDENT",
    description: "Passeios diários para manter seu cãozinho feliz e saudável.",
  },
  {
    slug: "adestramento-consciente",
    name: "Adestramento Consciente",
    type: "INDEPENDENT",
    description: "Adestramento em positivo e consultoria comportamental.",
  },
  {
    slug: "pet-taxi-sp",
    name: "Pet Táxi SP",
    type: "INDEPENDENT",
    description: "Transporte climatizado para consultas, viagens e mudanças.",
  },
  {
    slug: "hospedagem-da-carol",
    name: "Hospedagem da Carol",
    type: "INDEPENDENT",
    description: "Hospedagem familiar, no máximo três hóspedes por vez.",
  },
  {
    slug: "creche-pet-pinheiros",
    name: "Creche Pet Pinheiros",
    type: "INDEPENDENT",
    description: "Creche com recreação monitorada e relatório diário.",
  },
];

// --- Service offerings ------------------------------------------------------

export interface OfferingTemplate {
  type:
    | "PET_SITTER"
    | "DOG_WALKER"
    | "DAYCARE"
    | "HOTEL"
    | "GROOMING"
    | "VET_CONSULT"
    | "VACCINATION"
    | "TRAINING"
    | "TRANSPORT"
    | "OTHER";
  titles: string[];
  descriptions: string[];
  priceUnit: "PER_HOUR" | "PER_DAY" | "PER_NIGHT" | "PER_WALK" | "PER_SESSION";
  /** Integer cents, inclusive range. */
  price: [number, number];
  durationMinutes: number;
  tags: string[];
}

/**
 * All ten `ServiceType` values are represented. Four of them back the tabs on
 * the consumer `/servicos` screen (PET_SITTER, DOG_WALKER, DAYCARE, HOTEL), and
 * two of those four had no rows at all before this seed, so the tabs were
 * permanently empty.
 */
export const OFFERINGS: OfferingTemplate[] = [
  {
    type: "PET_SITTER",
    titles: ["Pet Sitter", "Pet Sitter em domicílio", "Cuidador para viagens"],
    descriptions: [
      "Cuidado especializado para seu pet em casa, com muito carinho e atenção.",
      "Visitas diárias com alimentação, medicação e muito colo enquanto você viaja.",
      "Fico com o seu pet na rotina dele, no ambiente dele, sem estresse de mudança.",
    ],
    priceUnit: "PER_DAY",
    price: [3500, 9000],
    durationMinutes: 480,
    tags: ["Experiente", "Emergência", "Pernoite", "Medicação"],
  },
  {
    type: "DOG_WALKER",
    titles: ["Dog Walker", "Passeio individual", "Passeio em grupo pequeno"],
    descriptions: [
      "Passeios diários para manter seu cãozinho feliz e saudável.",
      "Trinta a sessenta minutos de caminhada, com foto e relatório ao final.",
      "Grupos de no máximo três cães, sempre no mesmo horário.",
    ],
    priceUnit: "PER_WALK",
    price: [1800, 4000],
    durationMinutes: 60,
    tags: ["Matutino", "Vespertino", "Grupo pequeno", "GPS"],
  },
  {
    type: "DAYCARE",
    titles: ["Creche Pet", "Day care com recreação", "Creche meio período"],
    descriptions: [
      "Seu cão passa o dia brincando e volta cansado do jeito certo.",
      "Recreação monitorada, descanso na hora certa e relatório diário no app.",
      "Meio período para quem trabalha fora e não quer deixar o pet sozinho.",
    ],
    priceUnit: "PER_DAY",
    price: [4000, 9000],
    durationMinutes: 540,
    tags: ["Recreação", "Socialização", "Relatório diário", "Transporte"],
  },
  {
    type: "HOTEL",
    titles: ["Hotelzinho", "Hospedagem familiar", "Hotel com suíte individual"],
    descriptions: [
      "Hospedagem em ambiente climatizado, com câmeras e acompanhamento veterinário.",
      "Seu pet fica em casa de família, sem gaiolas e sem canil.",
      "Suítes individuais, área externa cercada e vídeo diário para o tutor.",
    ],
    priceUnit: "PER_NIGHT",
    price: [6000, 15000],
    durationMinutes: 1440,
    tags: ["Ar-condicionado", "Câmeras", "Sem gaiolas", "Área externa"],
  },
  {
    type: "GROOMING",
    titles: ["Banho e Tosa", "Tosa higiênica", "Banho com hidratação"],
    descriptions: [
      "Banho, secagem e tosa com produtos hipoalergênicos.",
      "Tosa higiênica rápida, ideal entre banhos completos.",
      "Hidratação profunda para pelagens longas e ressecadas.",
    ],
    priceUnit: "PER_SESSION",
    price: [5000, 16000],
    durationMinutes: 90,
    tags: ["Hipoalergênico", "Sem sedação", "Leva e traz"],
  },
  {
    type: "VET_CONSULT",
    titles: ["Consulta Veterinária", "Consulta de retorno", "Consulta domiciliar"],
    descriptions: [
      "Avaliação clínica completa, com orientação de tratamento por escrito.",
      "Retorno para acompanhamento de tratamento já iniciado.",
      "Atendimento na sua casa, para pets que não lidam bem com transporte.",
    ],
    priceUnit: "PER_SESSION",
    price: [9000, 25000],
    durationMinutes: 30,
    tags: ["Clínica geral", "Retorno incluso", "Domiciliar"],
  },
  {
    type: "VACCINATION",
    titles: ["Vacinação V10", "Antirrábica", "Pacote de vacinas anual"],
    descriptions: [
      "Aplicação com carteirinha digital atualizada na hora.",
      "Dose única, com registro e lembrete automático do reforço.",
      "Protocolo anual completo, agendado de uma vez.",
    ],
    priceUnit: "PER_SESSION",
    price: [6000, 14000],
    durationMinutes: 20,
    tags: ["Carteirinha digital", "Lembrete de reforço"],
  },
  {
    type: "TRAINING",
    titles: ["Adestramento básico", "Consultoria comportamental", "Adestramento avançado"],
    descriptions: [
      "Comandos básicos e convívio, em reforço positivo.",
      "Diagnóstico e plano para ansiedade de separação, latidos e agressividade.",
      "Trabalho de foco e obediência para cães que já dominam o básico.",
    ],
    priceUnit: "PER_SESSION",
    price: [8000, 20000],
    durationMinutes: 60,
    tags: ["Reforço positivo", "Domiciliar", "Plano de 8 semanas"],
  },
  {
    type: "TRANSPORT",
    titles: ["Pet Táxi", "Transporte para consultas", "Transporte intermunicipal"],
    descriptions: [
      "Veículo climatizado e caixa de transporte higienizada a cada corrida.",
      "Levo e trago da clínica, com envio de localização em tempo real.",
      "Viagens entre cidades, com paradas programadas.",
    ],
    priceUnit: "PER_SESSION",
    price: [4000, 12000],
    durationMinutes: 60,
    tags: ["Climatizado", "Caixa inclusa", "Rastreável"],
  },
  {
    type: "OTHER",
    titles: ["Fisioterapia animal", "Sessão de acupuntura", "Consulta nutricional"],
    descriptions: [
      "Reabilitação pós-cirúrgica e manutenção para cães idosos.",
      "Terapia complementar para dor crônica e mobilidade.",
      "Plano alimentar individual, com acompanhamento mensal.",
    ],
    priceUnit: "PER_SESSION",
    price: [7000, 18000],
    durationMinutes: 45,
    tags: ["Idosos", "Pós-cirúrgico", "Plano mensal"],
  },
];

// --- Animals ----------------------------------------------------------------

export const BREEDS_BY_SPECIES: Record<string, string[]> = {
  DOG: [
    "Vira-lata",
    "Golden Retriever",
    "Labrador",
    "Poodle",
    "Shih Tzu",
    "Bulldog Francês",
    "Beagle",
    "Pastor Alemão",
    "Border Collie",
    "Yorkshire",
    "Pinscher",
    "Husky Siberiano",
    "Lhasa Apso",
    "Maltês",
    "Pug",
    "Dachshund",
    "Boxer",
    "Cocker Spaniel",
    "Basset Hound",
    "Corgi",
    "Schnauzer",
    "Rottweiler",
  ],
  CAT: [
    "SRD",
    "Persa",
    "Siamês",
    "Maine Coon",
    "Angorá",
    "Sphynx",
    "Bengal",
    "Ragdoll",
    "British Shorthair",
    "Himalaio",
  ],
  BIRD: ["Calopsita", "Periquito", "Canário", "Papagaio", "Agapornis"],
  RODENT: ["Hamster Sírio", "Porquinho-da-índia", "Chinchila", "Gerbil", "Coelho"],
  REPTILE: ["Jabuti", "Iguana", "Gecko"],
  FISH: ["Betta", "Kinguio"],
  OTHER: ["Coelho", "Ouriço", "Furão"],
};

export const PET_NAMES = [
  "Amora",
  "Apolo",
  "Athena",
  "Aurora",
  "Bela",
  "Bento",
  "Bilu",
  "Bob",
  "Bolinha",
  "Branquinha",
  "Cacau",
  "Caramelo",
  "Chico",
  "Cookie",
  "Dengo",
  "Dodô",
  "Estopa",
  "Fiona",
  "Flocos",
  "Frajola",
  "Fumaça",
  "Gaia",
  "Hulk",
  "Íris",
  "Jujuba",
  "Kiara",
  "Lola",
  "Lupi",
  "Maya",
  "Mel",
  "Marley",
  "Nala",
  "Neguinho",
  "Nick",
  "Nuvem",
  "Olívia",
  "Pandora",
  "Pipoca",
  "Pretinha",
  "Romeu",
  "Simba",
  "Sushi",
  "Tequila",
  "Toto",
  "Trufa",
  "Uva",
  "Zeca",
  "Zeus",
  "Bruna",
  "Cacique",
  "Duque",
  "Emília",
  "Fofo",
  "Gigi",
  "Horácio",
  "Ivo",
  "Jade",
  "Kiko",
  "Lili",
  "Max",
  "Nino",
  "Otto",
  "Pérola",
  "Quindim",
  "Rita",
  "Salém",
  "Tico",
  "Ursa",
  "Vitó",
];

export const TEMPERAMENTS = [
  "Carinhoso",
  "Brincalhão",
  "Sociável",
  "Energético",
  "Leal",
  "Dócil",
  "Companheiro",
  "Tranquilo",
  "Independente",
  "Curioso",
  "Protetor",
  "Tímido",
  "Alegre",
  "Calmo",
  "Obediente",
  "Esperto",
  "Afetuoso",
];

export const PET_NOTES = [
  "Pet muito ativo, gosta de brincar no parque. Alérgico a frango.",
  "Prefere ambientes silenciosos e esconderijos altos.",
  "Toma medicação para tireoide todos os dias, de manhã.",
  "Não se dá bem com outros machos, mas adora gatos.",
  "Tem medo de fogos de artifício. Precisa de local seguro em datas festivas.",
  "Já passou por cirurgia ortopédica no joelho esquerdo em 2024.",
  "Come ração hipoalergênica prescrita. Nada de petiscos comuns.",
  "Extremamente sociável com crianças.",
  null,
  null,
  null,
];

export const VACCINE_NAMES = [
  "V10",
  "V8",
  "Antirrábica",
  "Giárdia",
  "Gripe canina",
  "Leishmaniose",
  "V4 felina",
  "V5 felina",
  "Leucemia felina",
];

export const VETERINARIANS = [
  "Dra. Helena Prado",
  "Dr. Marcos Antunes",
  "Dra. Beatriz Nogueira",
  "Dr. Rafael Camargo",
  "Dra. Lívia Menezes",
  "Dr. Otávio Bastos",
];

export const HEALTH_SYMPTOMS = [
  "Apatia e recusa alimentar há dois dias.",
  "Coceira intensa na região lombar.",
  "Claudicação intermitente do membro posterior direito.",
  "Vômito isolado, sem outros sinais.",
  "Tosse seca ao final do passeio.",
  null,
  null,
  null,
];

export const HEALTH_NOTES = [
  "Check-up de entrada. Sem alterações dignas de nota.",
  "Exame físico normal. Orientada manutenção da dieta atual.",
  "Prescrito anti-inflamatório por cinco dias, com retorno agendado.",
  "Boa evolução em relação à consulta anterior. Peso estável.",
  "Coletado material para exame laboratorial. Resultado em 48h.",
  "Escore corporal acima do ideal. Ajuste alimentar recomendado.",
  "Placa dentária moderada. Indicada profilaxia no próximo trimestre.",
];

export const REMINDER_TEMPLATES: { type: string; title: string; description: string | null }[] = [
  { type: "MEDICATION", title: "Vermífugo", description: "Segunda dose, meio comprimido." },
  { type: "MEDICATION", title: "Antipulgas mensal", description: "Aplicar na nuca." },
  { type: "APPOINTMENT", title: "Confirmar retorno", description: null },
  { type: "APPOINTMENT", title: "Levar exames à consulta", description: "Hemograma e ultrassom." },
  { type: "GROOMING", title: "Banho e tosa", description: "Tosa higiênica apenas." },
  { type: "GROOMING", title: "Cortar unhas", description: null },
  { type: "FEEDING", title: "Trocar ração", description: "Transição gradual em sete dias." },
  { type: "EXERCISE", title: "Passeio longo", description: "Mínimo 40 minutos." },
  { type: "GENERAL", title: "Renovar carteira de vacinação", description: null },
];

// --- Adoption copy ----------------------------------------------------------

export const LISTING_SUMMARIES = [
  "{name} é muito carinhoso e brincalhão, adora crianças e outros pets.",
  "{name} é um {breed} energético e leal, perfeito para famílias ativas.",
  "{name} é discreto, limpinho e adora uma janela ensolarada.",
  "{name} é dócil e está há mais tempo no abrigo do que qualquer outro.",
  "{name} chegou muito magro e hoje está saudável, esperando uma família.",
  "{name} convive bem com outros animais e já sabe fazer as necessidades no lugar certo.",
  "{name} é tranquilo, ideal para quem mora em apartamento.",
  "{name} adora companhia e não gosta nada de ficar sozinho.",
  "{name} foi resgatado da rua e retribui cada carinho em dobro.",
  "{name} é curioso, esperto e aprende comandos com facilidade.",
];

export const LISTING_STORIES = [
  "Resgatado ainda filhote, {name} se recuperou completamente e agora procura uma família definitiva.",
  "{name} foi encontrado na rua durante uma chuva forte e está pronto para um lar cheio de aventuras.",
  "{name} chegou ao abrigo depois que sua tutora idosa faleceu. Levou meses para voltar a confiar em gente, e hoje procura uma casa calma.",
  "Animais idosos são os últimos a serem adotados. {name} é saudável, já vive bem com outros animais e pede pouco além de companhia.",
  "{name} foi resgatado de uma situação de maus-tratos. Passou por tratamento completo e hoje é outro animal — confiante e afetuoso.",
  "Nasceu no abrigo, de uma mãe resgatada prenhe. {name} nunca conheceu a rua e é sociável desde sempre.",
  "{name} foi devolvido uma vez porque a família se mudou. Merece uma segunda chance com quem possa ficar de verdade.",
  "Encontrado sozinho em uma estrada vicinal, {name} foi castrado, vacinado e vermifugado e está pronto para ir para casa.",
];

export const APPLICATION_MESSAGES = [
  "Moro em casa com quintal cercado e já tive dois cães de porte médio. Posso buscar no fim de semana.",
  "Trabalho em home office e teria companhia o dia todo. Tenho experiência com gatos resgatados.",
  "Somos uma família de quatro pessoas, sem outros animais no momento. Procuramos um companheiro tranquilo.",
  "Já adotei por aqui antes e gostaria de dar um irmão para o meu cachorro.",
  "Apartamento telado, sem risco de queda. Posso mandar fotos do espaço se ajudar.",
  "Tenho disponibilidade para os cuidados que ele precisa e um veterinário de confiança.",
];

// --- Reviews ----------------------------------------------------------------

export const REVIEW_COMMENTS: { rating: number; comment: string }[] = [
  { rating: 5, comment: "Pontual e manda foto do passeio. Recomendo demais!" },
  { rating: 5, comment: "Cuidou da minha gata como se fosse dela. Voltarei sempre." },
  { rating: 5, comment: "Atendimento impecável, explicou tudo com calma." },
  { rating: 5, comment: "Meu cão voltou limpo, cheiroso e nada estressado." },
  { rating: 4, comment: "Ótimo serviço, só atrasou uns quinze minutos." },
  { rating: 4, comment: "Muito atenciosa. O preço poderia ser um pouco melhor." },
  { rating: 4, comment: "Gostei bastante, mas o relatório do dia veio incompleto." },
  { rating: 3, comment: "Serviço ok. Esperava um pouco mais de comunicação durante o dia." },
  { rating: 3, comment: "Resolveu, mas foi difícil conseguir horário." },
  { rating: 2, comment: "Demorou a responder e remarcou duas vezes." },
];

// --- Messaging --------------------------------------------------------------

export const LISTING_THREADS: string[][] = [
  [
    "Olá! Vi o anúncio do {pet}. Ele se dá bem com crianças?",
    "Oi! Se dá muito bem, sim. Ele convive com as crianças dos voluntários.",
    "Que ótimo. E com outros cães?",
    "Também. Divide o espaço com mais quatro sem nenhum problema.",
    "Ele já é castrado?",
    "Castrado, vacinado e vermifugado. Sai daqui com tudo em dia.",
    "Perfeito. Moro em casa com quintal cercado, acho que seria um bom lar.",
    "Parece ótimo! Você teria disponibilidade para uma visita?",
    "Teria sim, prefiro no fim de semana.",
    "Quer agendar uma visita para conhecê-lo neste sábado?",
  ],
  [
    "Boa tarde! O {pet} ainda está disponível?",
    "Boa tarde! Está sim. Você mora em casa ou apartamento?",
    "Apartamento, mas com tela em todas as janelas.",
    "Perfeito, é exatamente o que pedimos.",
    "Tenho outro gato em casa, isso é um problema?",
    "Pelo contrário — ele foi criado com outros gatos e estranha mais ficar sozinho.",
    "Fico aliviada de saber. Quanto tempo leva o processo?",
    "Depois da visita e do formulário, costuma sair em uma semana.",
    "Posso te mandar o formulário?",
    "Pode sim, obrigada!",
  ],
  [
    "Oi! Tenho interesse no {pet}. Ele tem alguma condição de saúde?",
    "Oi! Nenhuma. O último check-up foi há três semanas, posso te enviar.",
    "Por favor. Trabalho fora o dia todo, ele lida bem com isso?",
    "Lida, mas o ideal seria alguém em casa pelo menos parte do dia.",
    "Meu marido trabalha de casa às terças e quintas.",
    "Isso já ajuda bastante. Ele é bem tranquilo quando tem rotina.",
    "E de comida, tem alguma restrição?",
    "Come ração comum, sem alergias conhecidas.",
    "Ótimo. Como faço para seguir?",
    "Vou te mandar o questionário e a gente marca a visita.",
  ],
  [
    "Olá, vocês fazem acompanhamento depois da adoção do {pet}?",
    "Fazemos! Ligamos em trinta, noventa e cento e oitenta dias.",
    "Isso me deixa mais segura, é a primeira vez que adoto.",
    "Fica tranquila, a gente ajuda no que precisar nos primeiros meses.",
    "Preciso comprar alguma coisa antes de buscar?",
    "Comedouro, bebedouro, cama e uma coleira com plaquinha. O resto vai vindo.",
    "Anotado. E ele já sabe fazer as necessidades no lugar certo?",
    "No abrigo sim. Em casa costuma levar uns dias para reaprender.",
    "Combinado. Vou me organizar e volto a falar com vocês.",
  ],
];

export const SERVICE_THREADS: string[][] = [
  [
    "Oi! Consegue atender no sábado de manhã?",
    "Consigo sim! Tenho horário às 9h e às 11h.",
    "As 9h fica melhor pra mim.",
    "Fechado. Vou confirmar o agendamento por aqui.",
    "Preciso levar alguma coisa?",
    "Só a carteira de vacinação, o resto é comigo.",
    "Perfeito, até sábado!",
  ],
  [
    "Bom dia! Ele precisa tomar remédio às 14h, tudo bem?",
    "Bom dia! Sem problema, é só me deixar o remédio e a dosagem por escrito.",
    "Combinado, mando foto da receita.",
    "Recebi. Meio comprimido, com comida, certo?",
    "Isso mesmo. Ele cospe se estiver sozinho no pote.",
    "Anotado, vou dar junto com um pedaço de banana.",
    "Obrigada! Fico mais tranquila.",
  ],
  [
    "Cheguei em casa e ele estava super calmo, obrigada!",
    "Que bom! Ele brincou bastante hoje, dormiu no caminho de volta.",
    "Deu tudo certo com os outros cães?",
    "Deu. Ficou mais com os menores, mas participou de tudo.",
    "Vou agendar de novo para semana que vem.",
    "Ótimo! Segunda e quarta ainda estão livres.",
    "Fecho as duas então.",
  ],
  [
    "Oi, preciso remarcar o horário de amanhã. É possível?",
    "É sim! Prefere mais cedo ou mais tarde?",
    "Mais tarde, depois das 16h se der.",
    "Tenho 16h30 e 18h.",
    "16h30 está ótimo.",
    "Remarcado. Já cancelei o horário anterior, sem cobrança.",
    "Muito obrigada pela flexibilidade!",
    "Imagina, qualquer coisa é só chamar.",
  ],
];

export const NOTIFICATION_TEMPLATES: {
  type: string;
  title: string;
  body: string;
  href: string;
}[] = [
  {
    type: "SERVICE",
    title: "Agendamento confirmado",
    body: "Seu agendamento está confirmado.",
    href: "/historico",
  },
  {
    type: "SERVICE",
    title: "Serviço concluído",
    body: "Que tal avaliar o prestador?",
    href: "/avaliacoes",
  },
  {
    type: "ADOPTION",
    title: "Novo pet disponível!",
    body: "Um novo pet acabou de entrar para adoção na sua cidade.",
    href: "/adocao",
  },
  {
    type: "ADOPTION",
    title: "Atualização de adoção",
    body: "Seu pedido de adoção foi atualizado para 'em análise'.",
    href: "/perfil",
  },
  {
    type: "REMINDER",
    title: "Lembrete de vacina",
    body: "A próxima dose está chegando.",
    href: "/meus-pets",
  },
  {
    type: "MESSAGE",
    title: "Nova mensagem",
    body: "Você recebeu uma resposta em uma conversa.",
    href: "/mensagens",
  },
  {
    type: "ALERT",
    title: "Pet perdido perto de você",
    body: "Um alerta foi aberto a menos de 3 km do seu endereço.",
    href: "/pet-alert",
  },
  {
    type: "SYSTEM",
    title: "Bem-vindo à Animalesko",
    body: "Complete seu perfil para aproveitar melhor o app.",
    href: "/perfil",
  },
];

// --- Lost pets --------------------------------------------------------------

export const ALERT_DESCRIPTIONS = [
  "Cadela preta de porte médio, coleira vermelha, muito medrosa. Sumiu durante a chuva forte.",
  "Gato laranja, castrado, sem coleira. Costuma responder ao nome.",
  "Cão idoso, quase surdo, com mancha branca no peito. Não se afasta muito.",
  "Filhote de vira-lata caramelo, coleira azul com plaquinha.",
  "Gata tricolor, arisca com estranhos. Fugiu pela janela do quarto.",
  "Cão de porte grande, pelo curto, com cicatriz na pata dianteira esquerda.",
  "Calopsita cinza com bochechas laranja. Voou da varanda.",
  "Cadela shih tzu recém-tosada, sem coleira no momento do desaparecimento.",
  "Gato preto de olhos amarelos, castrado, com microchip.",
  "Cão pequeno, pelo longo, muito assustado com barulho de moto.",
];

export const SIGHTING_NOTES = [
  "Vi um cão com essa descrição perto da padaria, correndo em direção ao parque.",
  "Estava embaixo de um carro estacionado, mas fugiu quando me aproximei.",
  "Deixei água e ração no local. Ele voltou a comer por volta das 19h.",
  "Uma moradora disse que o animal dorme no mesmo portão há três noites.",
  "Consegui fotografar de longe. Parece ser o mesmo, mas está bem sujo.",
  null,
];

// --- Client contacts --------------------------------------------------------

export const CLIENT_NOTES = [
  "Prefere horários pela manhã.",
  "Cadela idosa, chega sempre acompanhada.",
  "Paga sempre no PIX, na hora.",
  "Pede lembrete por WhatsApp na véspera.",
  "Cão reativo com outros machos — agendar em horário vazio.",
  "Cliente desde 2023.",
  null,
  null,
  null,
];

/** The walk-in services `plus` books directly, without a consumer offering. */
export const WALK_IN_SERVICES = [
  "Banho e Tosa",
  "Consulta Veterinária",
  "Consulta de Retorno",
  "Vacinação",
  "Tosa Higiênica",
  "Corte de Unhas",
  "Exame de Sangue",
  "Aplicação de Medicação",
  "Retorno Pós-Cirúrgico",
  "Avaliação Odontológica",
];

export const APPOINTMENT_NOTES = [
  "Cliente pediu para avisar quando estiver pronto.",
  "Trazer carteira de vacinação.",
  "Jejum de 8 horas antes do procedimento.",
  "Buscar em casa — transporte incluso.",
  null,
  null,
  null,
];
