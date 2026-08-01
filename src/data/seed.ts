import type { Ad, Campaign, Client, Post } from '@/types';

// Genera un ISO relativo al mes actual para que la demo siempre tenga contenido "de este mes".
function d(offsetDays: number, hour = 12, min = 0): string {
  const base = new Date();
  base.setHours(hour, min, 0, 0);
  base.setDate(base.getDate() + offsetDays);
  return base.toISOString();
}

function monthKey(offsetDays: number): string {
  const base = new Date();
  base.setDate(base.getDate() + offsetDays);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`;
}

let n = 0;
const id = (p: string) => `${p}_${(++n).toString(36)}${Date.now().toString(36).slice(-3)}`;

export const seedClients: Client[] = [
  {
    id: 'cli_demm',
    name: 'Aurora Skin',
    handle: '@aurora.skin',
    color: '#8069BC',
    accounts: [
      { id: 'acc_demm_ig', platform: 'instagram', handle: '@aurora.skin', connected: true },
      { id: 'acc_demm_tt', platform: 'tiktok', handle: '@aurora.skin', connected: false },
    ],
  },
  {
    id: 'cli_flora',
    name: 'Flora Café',
    handle: '@flora.cafe',
    color: '#C08056',
    accounts: [
      { id: 'acc_flora_ig', platform: 'instagram', handle: '@flora.cafe', connected: true },
      { id: 'acc_flora_fb', platform: 'facebook', handle: 'Flora Café', connected: true },
    ],
  },
  {
    id: 'cli_nova',
    name: 'Nova Fitness',
    handle: '@nova.fit',
    color: '#4F8F79',
    accounts: [
      { id: 'acc_nova_ig', platform: 'instagram', handle: '@nova.fit', connected: false },
    ],
  },
];

const grad = (a: string, b: string) =>
  `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;

export const seedPosts: Post[] = [
  // ---- Aurora Skin ----
  {
    id: id('post'),
    clientId: 'cli_demm',
    accountId: 'acc_demm_ig',
    platform: 'instagram',
    type: 'reel',
    title: 'Reel: "Cómo tu marca pierde clientes sin redes"',
    date: d(2, 19, 0),
    status: 'revision',
    ideaGeneral:
      'Reel estilo propaganda que muestra el "antes y después" de una marca que no gestiona sus redes. Tono de humor argentino, gancho fuerte en los primeros 2 segundos.',
    contenido:
      'ESCENA 1 (0-2s): Placa negra con texto "Tu competencia ya está acá". \nESCENA 2 (2-8s): Locución tipo publicidad: "¿Sabías que el 70% de tus clientes te busca primero en Instagram?". \nESCENA 3 (8-15s): CTA a agendar reunión.',
    copy:
      'Tu marca no necesita estar en todos lados. Necesita estar bien donde importa. 👀\n\nEscribinos "REDES" por DM y armamos tu estrategia del mes. \n\n#communitymanager #marcapersonal #redessociales',
    mediaKind: 'video',
    mediaUrl: grad('#C8B9EA', '#EDE7F9'),
    hashtags: ['communitymanager', 'marcapersonal', 'redessociales'],
    campaignId: 'camp_demm_ago',
    comments: [
      {
        id: id('cm'),
        author: 'cliente',
        authorName: 'Aurora',
        text: 'Me encanta el gancho. ¿Podemos hacer el CTA un poco más suave? En vez de "agendá" algo tipo "hablemos".',
        createdAt: d(-1, 10, 30),
        resolved: false,
      },
    ],
  },
  {
    id: id('post'),
    clientId: 'cli_demm',
    accountId: 'acc_demm_ig',
    platform: 'instagram',
    type: 'carrusel',
    title: 'Carrusel: 5 errores en el feed',
    date: d(5, 13, 0),
    status: 'aprobado',
    ideaGeneral:
      'Carrusel educativo con los 5 errores más comunes que comete una marca al armar su feed. Formato guardable.',
    contenido:
      'Slide 1: Portada "5 errores que arruinan tu feed". \nSlide 2-6: un error por slide con ejemplo visual. \nSlide 7: CTA "Guardá este post".',
    copy:
      '¿Tu feed no crece? Puede que estés cometiendo alguno de estos 5 errores. \n\nGuardalo para tenerlo a mano 📌\n\n#feedinstagram #tipsderedes #diseño',
    mediaKind: 'image',
    mediaUrl: grad('#DED4F3', '#FAE3E8'),
    hashtags: ['feedinstagram', 'tipsderedes', 'diseño'],
    campaignId: 'camp_demm_ago',
    comments: [],
  },
  {
    id: id('post'),
    clientId: 'cli_demm',
    accountId: 'acc_demm_ig',
    platform: 'instagram',
    type: 'historia',
    title: 'Historia: Encuesta "¿Qué contenido querés ver?"',
    date: d(1, 11, 0),
    status: 'programado',
    ideaGeneral: 'Serie de 3 historias con encuesta para activar a la comunidad y decidir contenido.',
    contenido:
      'Historia 1: pregunta abierta. \nHistoria 2: encuesta A/B (tips vs detrás de escena). \nHistoria 3: agradecimiento + adelanto.',
    copy: 'Decime qué querés ver 👇',
    mediaKind: 'image',
    mediaUrl: grad('#AE9BDE', '#DED4F3'),
    hashtags: [],
    comments: [],
  },
  {
    id: id('post'),
    clientId: 'cli_demm',
    accountId: 'acc_demm_ig',
    platform: 'instagram',
    type: 'post',
    title: 'Post: Testimonio de cliente',
    date: d(-8, 20, 0),
    status: 'publicado',
    ideaGeneral: 'Prueba social. Testimonio real de un cliente con captura de resultados.',
    contenido: 'Placa con la frase del testimonio + logo. Diseño limpio.',
    copy: 'Resultados que hablan. Gracias @clienteX por confiar 💜 #testimonio #resultados',
    mediaKind: 'image',
    mediaUrl: grad('#B0CDE9', '#DED4F3'),
    hashtags: ['testimonio', 'resultados'],
    campaignId: 'camp_demm_jul',
    metrics: { reach: 4820, impressions: 6210, likes: 512, comments: 34, saves: 88, shares: 41 },
    comments: [],
  },
  {
    id: id('post'),
    clientId: 'cli_demm',
    accountId: 'acc_demm_ig',
    platform: 'instagram',
    type: 'reel',
    title: 'Reel: Detrás de escena de una sesión',
    date: d(-15, 19, 0),
    status: 'publicado',
    ideaGeneral: 'Mostrar el proceso creativo, humanizar la marca.',
    contenido: 'Clips rápidos de la grabación + música trending.',
    copy: 'Así se hace la magia ✨ #detrasdeescena #bts',
    mediaKind: 'video',
    mediaUrl: grad('#9781D0', '#C8B9EA'),
    hashtags: ['detrasdeescena', 'bts'],
    campaignId: 'camp_demm_jul',
    metrics: { reach: 12300, impressions: 15100, likes: 1340, comments: 96, saves: 210, shares: 180, views: 18400 },
    comments: [],
  },

  // ---- Flora Café ----
  {
    id: id('post'),
    clientId: 'cli_flora',
    accountId: 'acc_flora_ig',
    platform: 'instagram',
    type: 'post',
    title: 'Post: Nuevo café de especialidad',
    date: d(3, 9, 30),
    status: 'produccion',
    ideaGeneral: 'Presentar el nuevo grano de temporada con foto cálida del pour over.',
    contenido: 'Foto flat lay del café + textura. Nota de cata en el diseño.',
    copy: 'Llegó el nuevo lote de temporada ☕️ Notas a chocolate y naranja. Te esperamos.',
    mediaKind: 'image',
    mediaUrl: grad('#F2C2A5', '#FBF1DA'),
    hashtags: ['cafedeespecialidad', 'coffeelovers'],
    campaignId: 'camp_flora_ago',
    comments: [],
  },
  {
    id: id('post'),
    clientId: 'cli_flora',
    accountId: 'acc_flora_ig',
    platform: 'instagram',
    type: 'reel',
    title: 'Reel: Latte art en cámara lenta',
    date: d(6, 10, 0),
    status: 'idea',
    ideaGeneral: 'Reel satisfactorio de latte art en slow motion para alcance.',
    contenido: 'Plano cenital, cámara lenta, música calma. Sin locución.',
    copy: 'Un arte en cada taza 🎨☕️ #latteart #coffee',
    mediaKind: 'video',
    mediaUrl: grad('#F8D8C4', '#F6E5BC'),
    hashtags: ['latteart', 'coffee'],
    campaignId: 'camp_flora_ago',
    comments: [
      {
        id: id('cm'),
        author: 'cliente',
        authorName: 'Flora',
        text: 'Buenísima idea. ¿Podemos sumar el precio del combo desayuno al final?',
        createdAt: d(-2, 15, 0),
        resolved: false,
      },
    ],
  },
  {
    id: id('post'),
    clientId: 'cli_flora',
    accountId: 'acc_flora_ig',
    platform: 'instagram',
    type: 'post',
    title: 'Post: Promo desayuno 2x1',
    date: d(-10, 8, 30),
    status: 'publicado',
    ideaGeneral: 'Promo para llevar tráfico al local los días de semana.',
    contenido: 'Placa con la promo y horario. Colores de marca.',
    copy: '2x1 en desayunos de lunes a jueves 🥐 Traé a quien quieras. #promo #desayuno',
    mediaKind: 'image',
    mediaUrl: grad('#FCE9DD', '#EFD79B'),
    hashtags: ['promo', 'desayuno'],
    campaignId: 'camp_flora_jul',
    metrics: { reach: 7600, impressions: 9200, likes: 430, comments: 58, saves: 120, shares: 64 },
    comments: [],
  },

  // ---- Nova ----
  {
    id: id('post'),
    clientId: 'cli_nova',
    accountId: 'acc_nova_ig',
    platform: 'instagram',
    type: 'reel',
    title: 'Reel: Rutina de 10 min en casa',
    date: d(4, 18, 0),
    status: 'revision',
    ideaGeneral: 'Rutina rápida sin equipo, apta para principiantes.',
    contenido: 'Demostración de 4 ejercicios, texto en pantalla con repeticiones.',
    copy: '10 minutos, cero excusas 💪 Guardalo y hacelo hoy. #fitness #rutinaencasa',
    mediaKind: 'video',
    mediaUrl: grad('#B0DCC3', '#CCDFF2'),
    hashtags: ['fitness', 'rutinaencasa'],
    campaignId: 'camp_nova_ago',
    comments: [],
  },
];

export const seedCampaigns: Campaign[] = [
  {
    id: 'camp_demm_ago',
    clientId: 'cli_demm',
    name: 'Autoridad de marca · Agosto',
    month: monthKey(0),
    goal: 'Posicionar a Aurora Skin como referente y generar 10 leads por DM.',
    budget: 45000,
    postIds: [],
  },
  {
    id: 'camp_demm_jul',
    clientId: 'cli_demm',
    name: 'Prueba social · Julio',
    month: monthKey(-30),
    goal: 'Aumentar confianza con testimonios y BTS.',
    budget: 40000,
    postIds: [],
  },
  {
    id: 'camp_flora_ago',
    clientId: 'cli_flora',
    name: 'Temporada nueva · Agosto',
    month: monthKey(0),
    goal: 'Lanzar el café de temporada y subir visitas al local.',
    budget: 30000,
    postIds: [],
  },
  {
    id: 'camp_flora_jul',
    clientId: 'cli_flora',
    name: 'Tráfico al local · Julio',
    month: monthKey(-30),
    goal: 'Promos para llenar el local entre semana.',
    budget: 28000,
    postIds: [],
  },
  {
    id: 'camp_nova_ago',
    clientId: 'cli_nova',
    name: 'Lanzamiento · Agosto',
    month: monthKey(0),
    goal: 'Dar a conocer la cuenta y sumar primeros seguidores.',
    budget: 20000,
    postIds: [],
  },
];

export const seedAds: Ad[] = [
  {
    id: 'ad_demm_1',
    clientId: 'cli_demm',
    platform: 'instagram',
    name: 'Leads DM · Reel autoridad',
    objective: 'Mensajes',
    status: 'activa',
    budget: 25000,
    spend: 14200,
    impressions: 82000,
    clicks: 2100,
    conversions: 46,
    startDate: d(-6),
    endDate: d(10),
  },
  {
    id: 'ad_flora_1',
    clientId: 'cli_flora',
    platform: 'facebook',
    name: 'Tráfico local · Promo desayuno',
    objective: 'Tráfico',
    status: 'finalizada',
    budget: 18000,
    spend: 18000,
    impressions: 96000,
    clicks: 3400,
    conversions: 210,
    startDate: d(-20),
    endDate: d(-5),
  },
  {
    id: 'ad_demm_2',
    clientId: 'cli_demm',
    platform: 'instagram',
    name: 'Alcance · Carrusel errores',
    objective: 'Alcance',
    status: 'pausada',
    budget: 12000,
    spend: 5200,
    impressions: 41000,
    clicks: 780,
    conversions: 12,
    startDate: d(-3),
    endDate: d(14),
  },
];

// Vincula los posts a sus campañas
seedCampaigns.forEach((c) => {
  c.postIds = seedPosts.filter((p) => p.campaignId === c.id).map((p) => p.id);
});
