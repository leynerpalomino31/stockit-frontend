'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import ImportPeopleModal from '@/components/people/import-people-modal';
import Guard from '@/components/auth-guard';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type PersonType = 'NOMINA' | 'OPS' | 'PACIENTE' | 'TERCERO';

type Person = {
  id: string;
  documentId: string | null;
  fullName: string;
  type: PersonType;
  eps: string | null;
  department: string | null;
  municipality: string | null;
  address: string | null;
  finalStatus: string | null;
  inactivityType: string | null;
  inactivityDate: string | null;

  // ✅ NEW
  area?: string | null;
};

type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};

type PageSizeOption = 10 | 50 | 100 | 'ALL';

const TYPE_LABEL: Record<PersonType, string> = {
  NOMINA: 'Nómina',
  OPS: 'OPS',
  PACIENTE: 'Paciente',
  TERCERO: 'Tercero',
};

const INACTIVITY_TYPES = [
  'FALLECIDO',
  'EGRESO BARTHEL',
  'CAMBIO DE PRESTADOR',
  'SALIDA COLABORADOR',
  'EGRESO ADMINISTRATIVO',
] as const;

// ✅ NEW: Área (lista cerrada)
const AREA_OPTIONS = [
  'TALENTO HUMANO',
  'EDUCACIÓN',
  'SISTEMAS',
  'ADMINISTRATIVA',
  'CONTABLE',
  'FACTURACION',
  'E&C',
  'SST - CALIDAD',
  'AUTORIZACIONES',
  'DIRECCION GENERAL',
  'SERVICIO PBS',
  'FINANCIERA',
  'ACTIVOS FIJOS',
  'FARMACIA',
  'JURIDICA',
  'COMPRAS',
  'CLINICA DE HERIDAS',
  'COMUNICACIONES',
  'NUTRIDOM',
  'DIRECCION MEDICA',
  'PHD',
  'SERVICIOS ESPECIALES',
] as const;

// ✅ EPS (lista cerrada, exacta como la enviaste)
const EPS_OPTIONS = [
  'CAJA DE COMPENSACION FAMILIAR DEL VALLE DEL CAUCA - COMFENALCO VALLE DELAGENTE',
  'NUEVA EMPRESA PROMOTORA DE SALUD S.A - NUEVA EPS.',
  'ENTIDAD PROMOTORA DE SALUD SANITAS S.A.S.',
  'SALUD TOTAL EPS-S S.A',
  'COOSALUD ENTIDAD PROMOTORA DE SALUD S.A.',
  'PARTICULAR',
  'EPS SURAMERICANA S.A',
  'CAJA DE COMPENSACION FAMILIAR COMPENSAR',
  'ENTIDAD PROMOTORA DE SALUD SERVICIO OCCIDENTAL DE SALUD S.A. S.O.S.',
  'COOMEVA ENTIDAD PROMOTORA DE SALUD S.A.',
  'EMSSANAR E.S.S',
  'ASOCIACION MUTUAL LA ESPERANZA - ASMET SALUD',
  'FIDEICOMISOS PATRIMONIOS AUTONOMOS FIDUCIARIA LA PREVISORA S.A',
  'ENTIDAD PROMOTORA DE SALUD SANITAS S.A.S â€“ EN INTERVENCIÃ“N BAJO LA MEDIDA DE TOMA DE POSESIÃ“N',
  'POSITIVA COMPAÃ‘IA DE SEGUROS S.A.',
  'INVERSIONES HILLER ZAFRA S.A.S.',
] as const;

const CO_DEPARTMENTS = [
  'AMAZONAS',
  'ANTIOQUIA',
  'ARAUCA',
  'ARCHIPIÉLAGO DE SAN ANDRÉS, PROVIDENCIA Y SANTA CATALINA',
  'ATLÁNTICO',
  'BOGOTÁ, D. C.',
  'BOLÍVAR',
  'BOYACÁ',
  'CALDAS',
  'CAQUETÁ',
  'CASANARE',
  'CAUCA',
  'CESAR',
  'CHOCÓ',
  'CÓRDOBA',
  'CUNDINAMARCA',
  'GUAINÍA',
  'GUAVIARE',
  'HUILA',
  'LA GUAJIRA',
  'MAGDALENA',
  'META',
  'NARIÑO',
  'NORTE DE SANTANDER',
  'PUTUMAYO',
  'QUINDÍO',
  'RISARALDA',
  'SANTANDER',
  'SUCRE',
  'TOLIMA',
  'VALLE DEL CAUCA',
  'VAUPÉS',
  'VICHADA',
] as const;

/**
 * Normaliza claves para matchear:
 * - quita tildes
 * - quita espacios/puntos/comas/guiones
 * - uppercase
 * Ej: "BOGOTÁ, D. C." -> "BOGOTADC"
 */
function normKey(input: any) {
  return String(input ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');
}

function makeCanonMap(list: readonly string[]) {
  const m = new Map<string, string>();
  for (const v of list) m.set(normKey(v), v);
  return m;
}

const DEPT_CANON = makeCanonMap(CO_DEPARTMENTS);
const EPS_CANON = makeCanonMap(EPS_OPTIONS);
const AREA_CANON = makeCanonMap(AREA_OPTIONS);

/**
 * DATA de municipios (tal cual tu ejemplo).
 * (Dejé tu data como está)
 */
const CO_MUNICIPALITIES_RAW: Record<string, string[]> = {
  AMAZONAS: [
    'LETICIA',
    'EL ENCANTO',
    'LA CHORRERA',
    'LA PEDRERA',
    'LA VICTORIA',
    'MIRITI PARANA',
    'PUERTO ALEGRIA',
    'PUERTO ARICA',
    'PUERTO NARIÑO',
    'PUERTO SANTANDER',
    'TARAPACA',
  ],
  ANTIOQUIA: [
    'MEDELLIN',
    'ABEJORRAL',
    'ABRIAQUI',
    'ALEJANDRIA',
    'AMAGA',
    'AMALFI',
    'ANDES',
    'ANGELOPOLIS',
    'ANGOSTURA',
    'ANORI',
    'ANZA',
    'APARTADO',
    'ARBOLETES',
    'ARGELIA',
    'BARBOSA',
    'BELLO',
    'BETANIA',
    'BETULIA',
    'BRICEÑO',
    'BURITICA',
    'CACERES',
    'CAICEDO',
    'CALDAS',
    'CAMPAMENTO',
    'CAUCASIA',
    'CHIGORODO',
    'CISNEROS',
    'COCORNA',
    'CONCEPCION',
    'CONCORDIA',
    'COPACABANA',
    'DABEIBA',
    'DONMATIAS',
    'EL BAGRE',
    'ENTRERRIOS',
    'ENVIGADO',
    'FREDONIA',
    'FRONTINO',
    'GIRALDO',
    'GIRARDOTA',
    'GRANADA',
    'GUARNE',
    'GUATAPE',
    'HELICONIA',
    'HISPANIA',
    'ITAGUI',
    'ITUANGO',
    'JARDIN',
    'JERICO',
    'LA CEJA',
    'LA ESTRELLA',
    'LA PINTADA',
    'LA UNION',
    'LIBORINA',
    'MACEO',
    'MARINILLA',
    'MONTEBELLO',
    'MURINDO',
    'MUTATA',
    'NECOCLI',
    'NECHI',
    'PEÑOL',
    'PUERTO BERRIO',
    'PUERTO NARE',
    'PUERTO TRIUNFO',
    'REMEDIOS',
    'RETIRO',
    'RIONEGRO',
    'SABANALARGA',
    'SABANETA',
    'SALGAR',
    'SAN CARLOS',
    'SAN FRANCISCO',
    'SAN JERONIMO',
    'SAN LUIS',
    'SAN PEDRO DE LOS MILAGROS',
    'SAN RAFAEL',
    'SAN ROQUE',
    'SANTA BARBARA',
    'SANTA ROSA DE OSOS',
    'SANTO DOMINGO',
    'SEGOVIA',
    'SONSON',
    'SOPETRAN',
    'TAMESIS',
    'TARAZA',
    'TARSO',
    'TITIRIBI',
    'TOLEDO',
    'TURBO',
    'URAMITA',
    'URRAO',
    'VALDIVIA',
    'VALPARAISO',
    'VEGACHI',
    'VENECIA',
    'VIGIA DEL FUERTE',
    'YALI',
    'YARUMAL',
    'YOLOMBO',
    'YONDO',
    'ZARAGOZA',
  ],
  ARAUCA: ['ARAUCA', 'ARAUQUITA', 'CRAVO NORTE', 'FORTUL', 'PUERTO RONDON', 'SARAVENA', 'TAME'],
  ATLANTICO: [
    'BARRANQUILLA',
    'BARANOA',
    'CAMPO DE LA CRUZ',
    'CANDELARIA',
    'GALAPA',
    'JUAN DE ACOSTA',
    'LURUACO',
    'MALAMBO',
    'MANATI',
    'PALMAR DE VARELA',
    'PIOJO',
    'POLONUEVO',
    'PONEDERA',
    'PUERTO COLOMBIA',
    'REPELON',
    'SABANAGRANDE',
    'SABANALARGA',
    'SANTA LUCIA',
    'SANTO TOMAS',
    'SOLEDAD',
    'SUAN',
    'TUBARA',
    'USIACURI',
  ],
  'BOGOTA, D.C.': ['BOGOTA, D.C.'],
  BOLIVAR: [
    'CARTAGENA',
    'ACHI',
    'ALTOS DEL ROSARIO',
    'ARENAL',
    'ARJONA',
    'ARROYOHONDO',
    'BARRANCO DE LOBA',
    'CALAMAR',
    'CANTAGALLO',
    'CICUCO',
    'CLEMENCIA',
    'CORDOBA',
    'EL CARMEN DE BOLIVAR',
    'EL GUAMO',
    'EL PEÑON',
    'HATILLO DE LOBA',
    'MAGANGUE',
    'MAHATES',
    'MARGARITA',
    'MARIA LA BAJA',
    'MONTECRISTO',
    'MORALES',
    'NOROSI',
    'PINILLOS',
    'REGIDOR',
    'RIO VIEJO',
    'SAN CRISTOBAL',
    'SAN ESTANISLAO',
    'SAN FERNANDO',
    'SAN JACINTO',
    'SAN JUAN NEPOMUCENO',
    'SAN MARTIN DE LOBA',
    'SAN PABLO',
    'SANTA CATALINA',
    'SANTA ROSA',
    'SANTA ROSA DEL SUR',
    'SIMITI',
    'SOPLAVIENTO',
    'TALAIGUA NUEVO',
    'TIQUISIO',
    'TURBACO',
    'TURBANA',
    'VILLANUEVA',
    'ZAMBRANO',
  ],
  BOYACA: ['TUNJA', 'DUITAMA', 'SOGAMOSO', 'CHIQUINQUIRA', 'PAIPA', 'VILLA DE LEYVA', 'SAMACA', 'PUERTO BOYACA'],
  CALDAS: [
    'MANIZALES',
    'AGUADAS',
    'ANSERMA',
    'ARANZAZU',
    'BELALCAZAR',
    'CHINCHINA',
    'FILADELFIA',
    'LA DORADA',
    'MANZANARES',
    'MARMATO',
    'MARQUETALIA',
    'NEIRA',
    'NORCASIA',
    'PACORA',
    'PALESTINA',
    'PENSILVANIA',
    'RIOSUCIO',
    'SALAMINA',
    'SAMANA',
    'SAN JOSE',
    'SUPIA',
    'VICTORIA',
    'VILLAMARIA',
    'VITERBO',
  ],
  CAQUETA: [
    'FLORENCIA',
    'ALBANIA',
    'BELEN DE LOS ANDAQUIES',
    'CARTAGENA DEL CHAIRA',
    'CURILLO',
    'EL DONCELLO',
    'EL PAUJIL',
    'LA MONTAÑITA',
    'MILAN',
    'MORELIA',
    'PUERTO RICO',
    'SAN JOSE DEL FRAGUA',
    'SAN VICENTE DEL CAGUAN',
    'SOLANO',
    'SOLITA',
    'VALPARAISO',
  ],
  CASANARE: [
    'YOPAL',
    'AGUAZUL',
    'CHAMEZA',
    'HATO COROZAL',
    'LA SALINA',
    'MANI',
    'MONTERREY',
    'NUNCHIA',
    'OROCUE',
    'PAZ DE ARIPORO',
    'PORE',
    'RECETOR',
    'SABANALARGA',
    'SACAMA',
    'SAN LUIS DE PALENQUE',
    'TAMARA',
    'TAURAMENA',
    'TRINIDAD',
    'VILLANUEVA',
  ],
  CAUCA: [
    'POPAYAN',
    'ALMAGUER',
    'ARGELIA',
    'BALBOA',
    'BOLIVAR',
    'BUENOS AIRES',
    'CAJIBIO',
    'CALDONO',
    'CALOTO',
    'CORINTO',
    'EL TAMBO',
    'FLORENCIA',
    'GUAPI',
    'INZA',
    'JAMBALO',
    'LA SIERRA',
    'LA VEGA',
    'MERCADERES',
    'MIRANDA',
    'MORALES',
    'PADILLA',
    'PAEZ',
    'PATIA',
    'PIENDAMO',
    'PUERTO TEJADA',
    'ROSAS',
    'SANTANDER DE QUILICHAO',
    'SILVIA',
    'SUAREZ',
    'TIMBIO',
    'TORIBIO',
    'TOTORO',
  ],
  CESAR: [
    'VALLEDUPAR',
    'AGUACHICA',
    'AGUSTIN CODAZZI',
    'ASTREA',
    'BECERRIL',
    'BOSCONIA',
    'CHIMICHAGUA',
    'CHIRIGUANA',
    'CURUMANI',
    'EL COPEY',
    'EL PASO',
    'GAMARRA',
    'GONZALEZ',
    'LA GLORIA',
    'LA JAGUA DE IBIRICO',
    'MANAURE',
    'PAILITAS',
    'PELAYA',
    'PUEBLO BELLO',
    'RIO DE ORO',
    'SAN ALBERTO',
    'SAN DIEGO',
    'SAN MARTIN',
    'TAMALAMEQUE',
  ],
  CORDOBA: [
    'MONTERIA',
    'AYAPEL',
    'BUENAVISTA',
    'CANALETE',
    'CERETE',
    'CHIMA',
    'CHINU',
    'CIENAGA DE ORO',
    'COTORRA',
    'LA APARTADA',
    'LORICA',
    'LOS CORDOBAS',
    'MOMIL',
    'MONTELIBANO',
    'MOÑITOS',
    'PLANETA RICA',
    'PUEBLO NUEVO',
    'PUERTO ESCONDIDO',
    'PUERTO LIBERTADOR',
    'PURISIMA',
    'SAHAGUN',
    'SAN ANDRES DE SOTAVENTO',
    'SAN ANTERO',
    'SAN BERNARDO DEL VIENTO',
    'SAN CARLOS',
    'SAN JOSE DE URE',
    'SAN PELAYO',
    'TIERRALTA',
    'TUCHIN',
    'VALENCIA',
  ],
  CUNDINAMARCA: [
    'AGUA DE DIOS','ALBAN','ANAPOIMA','ANOLAIMA','ARBELAEZ','BELTRAN','BITUIMA','BOJACA','CABRERA','CACHIPAY',
    'CAJICA','CAPARRAPI','CAQUEZA','CARMEN DE CARUPA','CHAGUANI','CHIA','CHIPAQUE','CHOACHI','CHOCONTA','COGUA',
    'COTA','CUCUNUBA','EL COLEGIO','EL PEÑON','EL ROSAL','FACATATIVA','FOMEQUE','FOSCA','FUNZA','FUQUENE',
    'FUSAGASUGA','GACHALA','GACHANCIPA','GACHETA','GAMA','GIRARDOT','GRANADA','GUACHETA','GUADUAS','GUASCA',
    'GUATAQUI','GUATAVITA','GUAYABAL DE SIQUIMA','GUAYABETAL','GUTIERREZ','JERUSALEN','JUNIN','LA CALERA','LA MESA',
    'LA PALMA','LA PEÑA','LA VEGA','LENGUAZAQUE','MACHETA','MADRID','MANTA','MEDINA','MOSQUERA','NARIÑO','NEMOCON',
    'NILO','NIMAIMA','NOCAIMA','PACHO','PAIME','PANDI','PARATEBUENO','PASCA','PUERTO SALGAR','PULI','QUEBRADANEGRA',
    'QUETAME','QUIPILE','RAFAEL REYES','RICAURTE','SAN ANTONIO DEL TEQUENDAMA','SAN BERNARDO','SAN CAYETANO','SAN FRANCISCO',
    'SAN JUAN DE RIOSECO','SASAIMA','SESQUILE','SIBATE','SILVANIA','SIMIJACA','SOACHA','SOPO','SUBACHOQUE','SUESCA','SUPATA',
    'SUSA','SUTATAUSA','TABIO','TAUSA','TENA','TENJO','TIBACUY','TIBIRITA','TOCAIMA','TOCANCIPA','TOPAIPI','UBALA','UBAQUE',
    'UBATE','UNE','UTICA','VERGARA','VIANI','VILLAGOMEZ','VILLAPINZON','VILLETA','VIOTA','YACOPI','ZIPACON','ZIPAQUIRA',
  ],
  CHOCO: [
    'QUIBDO','ACANDI','ALTO BAUDO','ATRATO','BAGADO','BAHIA SOLANO','BAJO BAUDO','BOJAYA','CANTON DE SAN PABLO','CARMEN DEL DARIEN',
    'CERTEGUI','CONDOTO','EL CARMEN DE ATRATO','EL LITORAL DEL SAN JUAN','ISTMINA','JURADO','LLORO','MEDIO ATRATO','MEDIO BAUDO',
    'MEDIO SAN JUAN','NOVITA','NUQUI','RIO IRO','RIO QUITO','SAN JOSE DEL PALMAR','SIPI','TADO','UNGUIA','UNION PANAMERICANA',
  ],
  HUILA: [
    'NEIVA','ACEVEDO','AGRADO','AIPE','ALGECIRAS','ALTAMIRA','BARAYA','CAMPOALEGRE','COLOMBIA','ELIAS','GARZON','GIGANTE','GUADALUPE',
    'HOBO','IQUIRA','ISNOS','LA ARGENTINA','LA PLATA','NATAGA','OPORAPA','PAICOL','PALERMO','PALESTINA','PITAL','PITALITO','RIVERA',
    'SALADOBLANCO','SAN AGUSTIN','SANTA MARIA','SUAZA','TARQUI','TELLO','TERUEL','TESALIA','TIMANA','VILLAVIEJA','YAGUARA',
  ],
  'LA GUAJIRA': [
    'RIOHACHA','ALBANIA','BARRANCAS','DIBULLA','DISTRACCION','EL MOLINO','FONSECA','HATONUEVO','LA JAGUA DEL PILAR','MAICAO',
    'MANAURE','SAN JUAN DEL CESAR','URIBIA','URUMITA','VILLANUEVA',
  ],
  MAGDALENA: [
    'SANTA MARTA','ALGARROBO','ARACATACA','ARIGUANI','CERRO SAN ANTONIO','CHIVOLO','CIENAGA','CONCORDIA','EL BANCO','EL PIÑON','EL RETEN',
    'FUNDACION','GUAMAL','NUEVA GRANADA','PEDRAZA','PIJIÑO DEL CARMEN','PIVIJAY','PLATO','PUEBLOVIEJO','REMOLINO','SABANAS DE SAN ANGEL',
    'SALAMINA','SAN SEBASTIAN DE BUENAVISTA','SAN ZENON','SANTA ANA','SANTA BARBARA DE PINTO','SITIONUEVO','TENERIFE','ZAPAYAN','ZONA BANANERA',
  ],
  META: [
    'VILLAVICENCIO','ACACIAS','BARRANCA DE UPIA','CABUYARO','CASTILLA LA NUEVA','CUBARRAL','CUMARAL','EL CALVARIO','EL CASTILLO','EL DORADO',
    'FUENTE DE ORO','GRANADA','GUAMAL','LA MACARENA','LEJANIAS','MAPIRIPAN','MESETAS','PUERTO CONCORDIA','PUERTO GAITAN','PUERTO LLERAS',
    'PUERTO LOPEZ','PUERTO RICO','RESTREPO','SAN CARLOS DE GUAROA','SAN JUAN DE ARAMA','SAN JUANITO','SAN MARTIN','URIBE','VISTAHERMOSA',
  ],
  NARIÑO: [
    'PASTO','ALBAN','ALDANA','ANCUYA','ARBOLEDA','BARBACOAS','BELEN','BUESACO','CHACHAGUI','COLON','CONSACA','CONTADERO','CORDOBA','CUASPUD',
    'CUMBAL','CUMBITARA','EL CHARCO','EL PEÑOL','EL ROSARIO','EL TABLON','EL TAMBO','FUNES','GUACHUCAL','GUAITARILLA','GUALMATAN','ILES','IMUES',
    'IPIALES','LA CRUZ','LA FLORIDA','LA LLANADA','LA TOLA','LA UNION','LEIVA','LINARES','LOS ANDES','MAGUI','MALLAMA','MOSQUERA','NARIÑO',
    'OLAYA HERRERA','OSPINA','POLICARPA','POTOSI','PROVIDENCIA','PUERRES','PUPIALES','RICAURTE','ROBERTO PAYAN','SAMANIEGO','SAN BERNARDO',
    'SAN LORENZO','SAN PABLO','SAN PEDRO DE CARTAGO','SANDONA','SANTA BARBARA','SANTACRUZ','SAPUYES','TAMINANGO','TANGUA','TUMACO','TUQUERRES',
    'YACUANQUER',
  ],
  'NORTE DE SANTANDER': [
    'CUCUTA','ABREGO','ARBOLEDAS','BOCHALEMA','BUCARASICA','CACOTA','CACHIRA','CHINACOTA','CHITAGA','CONVENCION','CUCUTILLA','DURANIA','EL CARMEN',
    'EL TARRA','EL ZULIA','GRAMALOTE','HACARI','HERRAN','LABATECA','LA ESPERANZA','LA PLAYA','LOS PATIOS','LOURDES','MUTISCUA','OCAÑA','PAMPLONA',
    'PAMPLONITA','PUERTO SANTANDER','RAGONVALIA','SALAZAR','SAN CALIXTO','SAN CAYETANO','SANTIAGO','SARDINATA','SILOS','TEORAMA','TIBU','TOLEDO',
    'VILLA CARO','VILLA DEL ROSARIO',
  ],
  QUINDIO: ['ARMENIA','BUENAVISTA','CALARCA','CIRCASIA','CORDOBA','FILANDIA','GENOVA','LA TEBAIDA','MONTENEGRO','PIJAO','QUIMBAYA','SALENTO'],
  RISARALDA: ['PEREIRA','APIA','BALBOA','BELEN DE UMBRIA','DOSQUEBRADAS','GUATICA','LA CELIA','LA VIRGINIA','MARSELLA','MISTRATO','PUEBLO RICO','QUINCHIA','SANTA ROSA DE CABAL','SANTUARIO'],
  SANTANDER: [
    'BUCARAMANGA','AGUADA','ALBANIA','ARATOCA','BARBOSA','BARICHARA','BARRANCABERMEJA','BETULIA','BOLIVAR','CABRERA','CALIFORNIA','CAPITANEJO','CARCASI',
    'CEPITA','CERRITO','CHARALA','CHARTA','CHIMA','CHIPATA','CIMITARRA','CONCEPCION','CONFINES','CONTRATACION','COROMORO','CURITI','EL CARMEN DE CHUCURI',
    'EL GUACAMAYO','EL PEÑON','EL PLAYON','ENCINO','ENCISO','FLORIAN','FLORIDABLANCA','GALAN','GAMBITA','GIRON','GUACA','GUADALUPE','GUAPOTA','GUAVATA','GUEPSA',
    'HATO','JESUS MARIA','JORDAN','LA BELLEZA','LANDAZURI','LA PAZ','LEBRIJA','LOS SANTOS','MACARAVITA','MALAGA','MATANZA','MOGOTES','MOLAGAVITA','OCAMONTE',
    'OIBA','ONZAGA','PALMAR','PALMAS DEL SOCORRO','PARAMO','PIEDECUESTA','PINCHOTE','PUENTE NACIONAL','PUERTO PARRA','PUERTO WILCHES','RIONEGRO','SABANA DE TORRES',
    'SAN ANDRES','SAN BENITO','SAN GIL','SAN JOAQUIN','SAN JOSE DE MIRANDA','SAN MIGUEL','SAN VICENTE DE CHUCURI','SANTA BARBARA','SANTA HELENA DEL OPON','SIMACOTA',
    'SOCORRO','SUAITA','SUCRE','SURATA','TONA','VALLE DE SAN JOSE','VELEZ','VETAS','VILLANUEVA','ZAPATOCA',
  ],
  SUCRE: [
    'SINCELEJO','BUENAVISTA','CAIMITO','CHALAN','COLOSO','COROZAL','COVEÑAS','EL ROBLE','GALERAS','GUARANDA','LA UNION','LOS PALMITOS','MAJAGUAL','MORROA','OVEJAS','PALMITO',
    'SAMPUES','SAN BENITO ABAD','SAN JUAN DE BETULIA','SAN MARCOS','SAN ONOFRE','SAN PEDRO','SINCE','SUCRE','TOLU','TOLUVIEJO',
  ],
  TOLIMA: [
    'IBAGUE','ALPUJARRA','ALVARADO','AMBALEMA','ANZOATEGUI','ARMERO','ATACO','CAJAMARCA','CARMEN DE APICALA','CASABIANCA','CHAPARRAL','COELLO','COYAIMA','CUNDAY','DOLORES','ESPINAL',
    'FALAN','FLANDES','FRESNO','GUAMO','HERVEO','HONDA','ICONONZO','LERIDA','LIBANO','MARIQUITA','MELGAR','MURILLO','NATAGAIMA','ORTEGA','PALOCABILDO','PIEDRAS','PLANADAS','PRADO',
    'PURIFICACION','RIOBLANCO','RONCESVALLES','ROVIRA','SALDAÑA','SAN ANTONIO','SAN LUIS','SANTA ISABEL','SUAREZ','VALLE DE SAN JUAN','VENADILLO','VILLAHERMOSA','VILLARRICA',
  ],
  'VALLE DEL CAUCA': [
    'CALI','ALCALA','ANDALUCIA','ANSERMANUEVO','ARGELIA','BOLIVAR','BUENAVENTURA','BUGA','BUGALAGRANDE','CAICEDONIA','CALIMA','CANDELARIA','CARTAGO','DAGUA','EL AGUILA','EL CAIRO',
    'EL CERRITO','EL DOVIO','FLORIDA','GINEBRA','GUACARI','JAMUNDI','LA CUMBRE','LA UNION','LA VICTORIA','OBANDO','PALMIRA','PRADERA','RESTREPO','RIOFRIO','ROLDANILLO','SAN PEDRO',
    'SEVILLA','TORO','TRUJILLO','TULUA','ULLOA','VERSALLES','VIJES','YOTOCO','YUMBO','ZARZAL',
  ],
  PUTUMAYO: [
    'MOCOA','COLON','ORITO','PUERTO ASIS','PUERTO CAICEDO','PUERTO GUZMAN','PUERTO LEGUIZAMO','SAN FRANCISCO','SAN MIGUEL','SANTIAGO','SIBUNDOY','VALLE DEL GUAMUEZ','VILLAGARZON',
  ],
  GUAINIA: ['INIRIDA', 'BARRANCOMINAS', 'MAPIRIPANA', 'SAN FELIPE', 'PUERTO COLOMBIA'],
  GUAVIARE: ['SAN JOSE DEL GUAVIARE', 'CALAMAR', 'EL RETORNO', 'MIRAFLORES'],
  VAUPES: ['MITU', 'CARURU', 'PACOA', 'TARAIRA', 'YAVARATE'],
  VICHADA: ['PUERTO CARREÑO', 'LA PRIMAVERA', 'SANTA ROSALIA', 'CUMARIBO'],
};

// Mapa normalizado (para que coincida "BOGOTÁ, D. C." vs "BOGOTA, D.C.", etc.)
const CO_MUNICIPALITIES: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {};
  for (const [k, arr] of Object.entries(CO_MUNICIPALITIES_RAW)) {
    out[normKey(k)] = Array.from(new Set(arr.map((x) => String(x).trim())));
  }
  return out;
})();

const normalizeType = (t?: any): PersonType =>
  t === 'NOMINA' || t === 'OPS' || t === 'TERCERO' || t === 'PACIENTE' ? t : 'PACIENTE';

const normalizeFinalStatus = (s?: any): 'ACTIVO' | 'INACTIVO' | null => {
  const v = String(s ?? '').trim().toLowerCase();
  if (v === 'activo' || v === 'act' || v === 'active' || v === '1' || v === 'a') return 'ACTIVO';
  if (v.includes('inactiv') || v === '0' || v === 'i' || v === 'inactive') return 'INACTIVO';
  return null;
};

const labelFinalStatus = (s?: string | null) =>
  normalizeFinalStatus(s) === 'INACTIVO' ? 'Inactivo' : 'Activo';

/* Debounce helper */
function useDebounced<T>(value: T, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export default function PeoplePage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim(), 350);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const [form, setForm] = useState<Partial<Person>>({
    type: 'PACIENTE',
    finalStatus: 'ACTIVO',
    area: null,
  });

  const [pageSize, setPageSize] = useState<PageSizeOption>(10);
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    setPage(1);
  }, [dq, pageSize]);

  const deptKey = useMemo(() => normKey(form.department), [form.department]);

  const municipioOptions = useMemo(() => {
    if (!deptKey) return [];
    const list = CO_MUNICIPALITIES[deptKey] ?? [];
    return [...list].sort((a, b) => a.localeCompare(b, 'es'));
  }, [deptKey]);

  // Si cambia el departamento, limpiamos municipio
  useEffect(() => {
    if (!form.department && form.municipality) {
      setForm((f) => ({ ...f, municipality: null }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptKey]);

  const people = useQuery({
    queryKey: ['people', { dq, page, pageSize }],
    queryFn: async () => {
      try {
        const params: any = { page, pageSize: pageSize === 'ALL' ? 1000 : pageSize };
        if (dq) params.q = dq;
        const { data } = await api.get<Paginated<Person>>('/api/people', { params });
        return data;
      } catch (e: any) {
        const msg = e?.response?.data?.error || 'No se pudo obtener usuarios';
        toast.error(msg);
        return {
          items: [],
          total: 0,
          page: 1,
          pageSize: typeof pageSize === 'number' ? pageSize : 100,
          pages: 1,
        } as Paginated<Person>;
      }
    },
    keepPreviousData: true,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const create = useMutation({
    mutationFn: async (data: Partial<Person>) => (await api.post<Person>('/api/people', data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['people'] });
      setForm({ type: 'PACIENTE', finalStatus: 'ACTIVO', area: null });
      toast.success('Usuario creado');
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Person> }) =>
      (await api.patch<Person>(`/api/people/${id}`, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['people'] });
      setEditingId(null);
      setForm({ type: 'PACIENTE', finalStatus: 'ACTIVO', area: null });
      toast.success('Usuario actualizado');
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/api/people/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['people'] });
      toast.success('Usuario eliminado');
    },
  });

  function canonicalizeFromLists(p: Person) {
    const rawDept = p.department ? String(p.department).trim() : '';
    const deptCanon = rawDept ? (DEPT_CANON.get(normKey(rawDept)) ?? rawDept) : '';

    const deptKeyLocal = normKey(deptCanon);
    const muniList = CO_MUNICIPALITIES[deptKeyLocal] ?? [];
    const muniMap = new Map<string, string>();
    for (const m of muniList) muniMap.set(normKey(m), m);

    const rawMuni = p.municipality ? String(p.municipality).trim() : '';
    const muniCanon = rawMuni ? (muniMap.get(normKey(rawMuni)) ?? rawMuni) : '';

    const rawEps = p.eps ? String(p.eps).trim() : '';
    const epsCanon = rawEps ? (EPS_CANON.get(normKey(rawEps)) ?? rawEps) : '';

    const rawArea = p.area ? String(p.area).trim() : '';
    const areaCanon = rawArea ? (AREA_CANON.get(normKey(rawArea)) ?? rawArea) : '';

    return {
      deptCanon: deptCanon || null,
      muniCanon: muniCanon || null,
      epsCanon: epsCanon || null,
      areaCanon: areaCanon || null,
    };
  }

  const startEdit = (p: Person) => {
    const normStatus = normalizeFinalStatus(p.finalStatus) ?? 'ACTIVO';
    const t = normalizeType(p.type);
    const c = canonicalizeFromLists(p);

    setEditingId(p.id);

    // 👇 No dependas de "...p" para campos críticos: así no “se pierden” por Select mismatch
    setForm({
      id: p.id,
      documentId: p.documentId ? String(p.documentId).trim() : null,
      fullName: p.fullName ? String(p.fullName).trim() : '',
      type: t,

      eps: c.epsCanon,
      department: c.deptCanon,
      municipality: c.muniCanon,
      address: p.address ? String(p.address).trim() : null,

      // área: solo se mantiene si es NOMINA
      area: t === 'NOMINA' ? c.areaCanon : null,

      finalStatus: normStatus,
      inactivityType: p.inactivityType ? String(p.inactivityType).trim() : null,
      inactivityDate: p.inactivityDate ? p.inactivityDate.slice(0, 10) : null,
    });
  };

  const onChangeFinalStatus = (value: 'ACTIVO' | 'INACTIVO') => {
    if (value === 'ACTIVO') {
      setForm((f) => ({ ...f, finalStatus: 'ACTIVO', inactivityType: null, inactivityDate: null }));
    } else {
      setForm((f) => ({ ...f, finalStatus: 'INACTIVO' }));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalStatus = normalizeFinalStatus(form.finalStatus) ?? 'ACTIVO';
    const isNomina = normalizeType(form.type) === 'NOMINA';

    const payload = {
      documentId: form.documentId?.trim() || null,
      fullName: form.fullName?.trim(),
      type: normalizeType(form.type),
      eps: form.eps?.trim() || null,
      department: form.department?.trim() || null,
      municipality: form.municipality?.trim() || null,
      address: form.address?.trim() || null,

      // ✅ solo NOMINA
      area: isNomina ? (form.area?.trim() || null) : null,

      finalStatus,
      inactivityType: finalStatus === 'INACTIVO' ? form.inactivityType?.trim() || null : null,
      inactivityDate: finalStatus === 'INACTIVO' ? form.inactivityDate || null : null,
    };

    if (!payload.fullName) return toast.error('El nombre es obligatorio');

    if (editingId) await update.mutateAsync({ id: editingId, data: payload });
    else await create.mutateAsync(payload);
  };

  const rows = useMemo(() => {
    const items = people.data?.items ?? [];
    return items.map((p) => (
      <tr key={p.id} className="hover:bg-slate-50/50">
        <td className="p-3">{p.documentId || '—'}</td>
        <td className="p-3">{p.fullName}</td>
        <td className="p-3">{TYPE_LABEL[normalizeType(p.type)]}</td>
        <td className="p-3">{p.area || '—'}</td>
        <td className="p-3">{p.eps || '—'}</td>
        <td className="p-3">{p.department || '—'}</td>
        <td className="p-3">{p.municipality || '—'}</td>
        <td className="p-3 max-w-[220px] truncate" title={p.address || ''}>
          {p.address || '—'}
        </td>
        <td className="p-3">{labelFinalStatus(p.finalStatus)}</td>
        <td className="p-3">{p.inactivityType || '—'}</td>
        <td className="p-3">{p.inactivityDate ? p.inactivityDate.slice(0, 10) : '—'}</td>
        <td className="p-3">
          <div className="flex gap-2">
            <button
              onClick={() => startEdit(p)}
              className="rounded-md border px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Editar
            </button>
            <button
              onClick={async () => {
                if (!confirm('¿Eliminar este usuario?')) return;
                try {
                  await remove.mutateAsync(p.id);
                } catch (e: any) {
                  toast.error(e?.response?.data?.error ?? 'No se pudo eliminar');
                }
              }}
              className="rounded-md border px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
            >
              Eliminar
            </button>
          </div>
        </td>
      </tr>
    ));
  }, [people.data, remove]);

  const isInactive = normalizeFinalStatus(form.finalStatus) === 'INACTIVO';
  const isNominaForm = normalizeType(form.type) === 'NOMINA';

  const totalItems = people.data?.total ?? 0;
  const currentPage = people.data?.page ?? page;
  const effectivePageSize =
    people.data?.pageSize ?? (pageSize === 'ALL' ? totalItems || 1000 : (pageSize as number));

  const totalPages =
    pageSize === 'ALL'
      ? 1
      : people.data?.pages ??
        (effectivePageSize ? Math.max(1, Math.ceil(totalItems / effectivePageSize)) : 1);

  const showingCount =
    totalItems === 0 ? 0 : pageSize === 'ALL' ? totalItems : Math.min(totalItems, currentPage * effectivePageSize);

  const currentEps = (form.eps ?? '').toString().trim();
  const currentEpsInOptions = !!currentEps && (EPS_OPTIONS as readonly string[]).includes(currentEps);

  const currentDepartment = (form.department ?? '').toString().trim();
  const currentDepartmentInOptions =
    !!currentDepartment && (CO_DEPARTMENTS as readonly string[]).includes(currentDepartment);

  const currentMunicipality = (form.municipality ?? '').toString().trim();
  const currentMunicipalityInOptions = !!currentMunicipality && municipioOptions.includes(currentMunicipality);

  const currentArea = (form.area ?? '').toString().trim();
  const currentAreaInOptions = !!currentArea && (AREA_OPTIONS as readonly string[]).includes(currentArea);

  return (
    <Guard>
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Poblacion</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o documento…"
              className="w-full rounded-full border px-10 py-2 text-sm bg-white dark:bg-slate-950
                       focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-700"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          <button
            onClick={() => setShowImport(true)}
            className="rounded-xl bg-sky-700 text-white px-3 py-2 text-sm hover:bg-sky-800"
          >
            Importar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Formulario */}
          <form onSubmit={submit} className="border rounded-xl bg-white dark:bg-slate-900 p-4 space-y-3">
            <h2 className="font-medium">{editingId ? 'Editar usuario' : 'Nuevo usuario'}</h2>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-sm">Documento</label>
                <input
                  className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
                  value={form.documentId || ''}
                  onChange={(e) => setForm({ ...form, documentId: e.target.value })}
                />
              </div>

              <div className="grid gap-1.5">
                <label className="text-sm">Tipo de usuario</label>
                <select
                  className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
                  value={form.type || 'PACIENTE'}
                  onChange={(e) => {
                    const nextType = normalizeType(e.target.value);
                    setForm((f) => ({
                      ...f,
                      type: nextType,
                      area: nextType === 'NOMINA' ? (f.area ?? null) : null,
                    }));
                  }}
                >
                  <option value="NOMINA">Nómina</option>
                  <option value="OPS">OPS</option>
                  <option value="PACIENTE">Paciente</option>
                  <option value="TERCERO">Tercero</option>
                </select>
              </div>

              {/* ✅ Área SOLO NOMINA */}
              {isNominaForm && (
                <div className="grid gap-1.5 sm:col-span-2">
                  <label className="text-sm">Área</label>

                  <Select
                    value={form.area ?? '__NONE__'}
                    onValueChange={(v) => setForm((f) => ({ ...f, area: v === '__NONE__' ? null : v }))}
                  >
                    <SelectTrigger className="w-full rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950 overflow-hidden">
                      <SelectValue placeholder="—" className="truncate" />
                    </SelectTrigger>

                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      sideOffset={6}
                      className="z-50 max-h-72 w-[var(--radix-select-trigger-width)] max-w-[min(520px,calc(100vw-2rem))] overflow-x-hidden"
                    >
                      <SelectItem value="__NONE__">—</SelectItem>

                      {currentArea && !currentAreaInOptions && (
                        <SelectItem value={currentArea} className="whitespace-normal break-words">
                          (Actual) {currentArea}
                        </SelectItem>
                      )}

                      {AREA_OPTIONS.map((a) => (
                        <SelectItem key={a} value={a} className="whitespace-normal break-words">
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid gap-1.5 sm:col-span-2">
                <label className="text-sm">Nombre</label>
                <input
                  className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
                  value={form.fullName || ''}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </div>

              {/* EPS */}
              <div className="grid gap-1.5">
                <label className="text-sm">EPS</label>

                <Select
                  value={form.eps ?? '__NONE__'}
                  onValueChange={(v) => setForm((f) => ({ ...f, eps: v === '__NONE__' ? null : v }))}
                >
                  <SelectTrigger className="w-full rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950 overflow-hidden">
                    <SelectValue placeholder="—" className="truncate" />
                  </SelectTrigger>

                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    sideOffset={6}
                    className="z-50 max-h-72 w-[var(--radix-select-trigger-width)] max-w-[min(520px,calc(100vw-2rem))] overflow-x-hidden"
                  >
                    <SelectItem value="__NONE__">—</SelectItem>

                    {currentEps && !currentEpsInOptions && (
                      <SelectItem value={currentEps} className="whitespace-normal break-words">
                        (Actual) {currentEps}
                      </SelectItem>
                    )}

                    {EPS_OPTIONS.map((e) => (
                      <SelectItem key={e} value={e} className="whitespace-normal break-words">
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Departamento */}
              <div className="grid gap-1.5">
                <label className="text-sm">Departamento</label>

                <Select
                  value={form.department ?? '__NONE__'}
                  onValueChange={(v) => {
                    const nextDept = v === '__NONE__' ? null : v;
                    setForm((f) => ({ ...f, department: nextDept, municipality: null }));
                  }}
                >
                  <SelectTrigger className="w-full rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950 overflow-hidden">
                    <SelectValue placeholder="—" className="truncate" />
                  </SelectTrigger>

                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    sideOffset={6}
                    className="z-50 max-h-72 w-[var(--radix-select-trigger-width)] max-w-[min(520px,calc(100vw-2rem))] overflow-x-hidden"
                  >
                    <SelectItem value="__NONE__">—</SelectItem>

                    {currentDepartment && !currentDepartmentInOptions && (
                      <SelectItem value={currentDepartment} className="whitespace-normal break-words">
                        (Actual) {currentDepartment}
                      </SelectItem>
                    )}

                    {CO_DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d} className="whitespace-normal break-words">
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Municipio dependiente */}
              <div className="grid gap-1.5">
                <label className="text-sm">Municipio</label>

                <Select
                  value={form.municipality ?? '__NONE__'}
                  onValueChange={(v) => setForm((f) => ({ ...f, municipality: v === '__NONE__' ? null : v }))}
                  disabled={!form.department}
                >
                  <SelectTrigger className="w-full rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950 disabled:opacity-60 overflow-hidden">
                    <SelectValue
                      placeholder={!form.department ? 'Seleccione departamento…' : '—'}
                      className="truncate"
                    />
                  </SelectTrigger>

                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    sideOffset={6}
                    className="z-50 max-h-72 w-[var(--radix-select-trigger-width)] max-w-[min(520px,calc(100vw-2rem))] overflow-x-hidden"
                  >
                    <SelectItem value="__NONE__">—</SelectItem>

                    {currentMunicipality && !currentMunicipalityInOptions && (
                      <SelectItem value={currentMunicipality} className="whitespace-normal break-words">
                        (Actual) {currentMunicipality}
                      </SelectItem>
                    )}

                    {municipioOptions.map((m) => (
                      <SelectItem key={m} value={m} className="whitespace-normal break-words">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {!form.department && (
                  <p className="text-xs text-slate-500">
                    Primero selecciona un departamento para ver sus municipios.
                  </p>
                )}
              </div>

              {/* Dirección */}
              <div className="grid gap-1.5 sm:col-span-2">
                <label className="text-sm">Dirección</label>
                <input
                  className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
                  value={form.address || ''}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Carrera 10 # 20-30 Apto 101"
                />
              </div>

              {/* Estado final */}
              <div className="grid gap-1.5">
                <label className="text-sm">Estado final</label>
                <select
                  className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
                  value={normalizeFinalStatus(form.finalStatus) ?? 'ACTIVO'}
                  onChange={(e) => onChangeFinalStatus(e.target.value as 'ACTIVO' | 'INACTIVO')}
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </div>

              {isInactive && (
                <>
                  <div className="grid gap-1.5">
                    <label className="text-sm">Tipo de inactivación</label>
                    <select
                      className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
                      value={form.inactivityType || ''}
                      onChange={(e) => setForm((f) => ({ ...f, inactivityType: e.target.value || null }))}
                    >
                      <option value="">Seleccione…</option>
                      {INACTIVITY_TYPES.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-1.5">
                    <label className="text-sm">Fecha inactividad</label>
                    <input
                      type="date"
                      className="rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-950"
                      value={form.inactivityDate || ''}
                      onChange={(e) => setForm((f) => ({ ...f, inactivityDate: e.target.value }))}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ type: 'PACIENTE', finalStatus: 'ACTIVO', area: null });
                  }}
                  className="rounded-xl border px-4 py-2 text-sm"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                {editingId ? 'Guardar cambios' : 'Crear usuario'}
              </button>
            </div>
          </form>

          {/* Tabla */}
          <div className="border rounded-xl bg-white dark:bg-slate-900 p-0 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="font-medium">
                Usuarios {people.data ? `${people.data.total} resultado(s)` : ''}
              </h2>

              <div className="flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span>Mostrar:</span>
                  <select
                    className="rounded-lg border px-2 py-1 text-xs bg-white dark:bg-slate-950"
                    value={pageSize === 'ALL' ? 'ALL' : String(pageSize)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPageSize(v === 'ALL' ? 'ALL' : (parseInt(v, 10) as PageSizeOption));
                    }}
                  >
                    <option value="10">10</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="ALL">Todos</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span>
                    {totalItems === 0
                      ? 'Sin usuarios para mostrar.'
                      : pageSize === 'ALL'
                      ? `Mostrando ${totalItems} usuarios`
                      : `Mostrando ${showingCount} de ${totalItems} usuarios`}
                  </span>

                  {totalItems > 0 && pageSize !== 'ALL' && totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-2 py-1 rounded-lg border disabled:opacity-40"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                      >
                        Anterior
                      </button>
                      <span>
                        Página {currentPage} de {totalPages}
                      </span>
                      <button
                        type="button"
                        className="px-2 py-1 rounded-lg border disabled:opacity-40"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-auto" style={{ maxHeight: '68vh' }}>
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-slate-600">
                  <tr>
                    <th className="text-left p-3">Documento</th>
                    <th className="text-left p-3">Nombre</th>
                    <th className="text-left p-3">Tipo</th>
                    <th className="text-left p-3">Área</th>
                    <th className="text-left p-3">EPS</th>
                    <th className="text-left p-3">Departamento</th>
                    <th className="text-left p-3">Municipio</th>
                    <th className="text-left p-3">Dirección</th>
                    <th className="text-left p-3">Estado Final</th>
                    <th className="text-left p-3">Tipo inactivación</th>
                    <th className="text-left p-3">Fecha inactividad</th>
                    <th className="p-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.length > 0 ? (
                    rows
                  ) : (
                    <tr>
                      <td className="p-6 text-center text-slate-500" colSpan={12}>
                        {people.isLoading ? 'Cargando…' : 'Sin usuarios.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <ImportPeopleModal open={showImport} onClose={() => setShowImport(false)} />
      </section>
    </Guard>
  );
}