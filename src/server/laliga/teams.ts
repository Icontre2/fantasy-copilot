import type { Team } from '@/src/domain/fantasy';

/**
 * LALIGA Fantasy no publica un endpoint de equipos sin autenticar: los equipos
 * solo llegan embebidos en el calendario, y el calendario devuelve unicamente
 * la jornada en curso. Este mapa (extraido de la propia API) garantiza que
 * todo `teamId` del listado de jugadores se puede resolver a nombre y escudo,
 * incluso fuera de temporada o si un equipo no juega esa jornada.
 *
 * El calendario en vivo siempre tiene prioridad sobre estos valores.
 */
export const FALLBACK_TEAMS: Record<string, Team> = {
  '2': { id: '2', name: 'Atlético de Madrid', shortName: 'ATM', slug: 'atletico-de-madrid', badge: 'https://assets-fantasy.llt-services.com/teambadge/t175/color/t175_atletico-de-madrid.png' },
  '3': { id: '3', name: 'Athletic Club', shortName: 'ATH', slug: 'athletic-club', badge: 'https://assets-fantasy.llt-services.com/teambadge/t174/color/t174_athletic-club.png' },
  '4': { id: '4', name: 'FC Barcelona', shortName: 'BAR', slug: 'fc-barcelona', badge: 'https://assets-fantasy.llt-services.com/teambadge/t178/color/t178_fc-barcelona.png' },
  '5': { id: '5', name: 'Real Betis', shortName: 'BET', slug: 'real-betis', badge: 'https://assets-fantasy.llt-services.com/teambadge/t185/color/t185_real-betis.png' },
  '6': { id: '6', name: 'Celta', shortName: 'CEL', slug: 'rc-celta', badge: 'https://assets-fantasy.llt-services.com/teambadge/t176/color/t176_rc-celta.png' },
  '7': { id: '7', name: 'Elche CF', shortName: 'ELC', slug: 'elche-c-f', badge: 'https://assets-fantasy.llt-services.com/teambadge/t954/color/t954_elche-c-f.png' },
  '8': { id: '8', name: 'RCD Espanyol de Barcelona', shortName: 'ESP', slug: 'rcd-espanyol', badge: 'https://assets-fantasy.llt-services.com/teambadge/t177/color/t177_rcd-espanyol.png' },
  '9': { id: '9', name: 'Getafe CF', shortName: 'GET', slug: 'getafe-cf', badge: 'https://assets-fantasy.llt-services.com/teambadge/t1450/color/t1450_getafe-cf.png' },
  '11': { id: '11', name: 'Levante UD', shortName: 'LEV', slug: 'levante-ud', badge: 'https://assets-fantasy.llt-services.com/teambadge/t855/color/t855_levante-ud.png' },
  '13': { id: '13', name: 'C.A. Osasuna', shortName: 'OSA', slug: 'c-a-osasuna', badge: 'https://assets-fantasy.llt-services.com/teambadge/t450/color/t450_c-a-osasuna.png' },
  '14': { id: '14', name: 'Rayo Vallecano', shortName: 'RAY', slug: 'rayo-vallecano', badge: 'https://assets-fantasy.llt-services.com/teambadge/t184/color/t184_rayo-vallecano.png' },
  '15': { id: '15', name: 'Real Madrid', shortName: 'RMA', slug: 'real-madrid', badge: 'https://assets-fantasy.llt-services.com/teambadge/t186/color/t186_real-madrid.png' },
  '16': { id: '16', name: 'Real Sociedad', shortName: 'RSO', slug: 'real-sociedad', badge: 'https://assets-fantasy.llt-services.com/teambadge/t188/color/t188_real-sociedad.png' },
  '17': { id: '17', name: 'Sevilla FC', shortName: 'SEV', slug: 'sevilla-fc', badge: 'https://assets-fantasy.llt-services.com/teambadge/t179/color/t179_sevilla-fc.png' },
  '18': { id: '18', name: 'Valencia CF', shortName: 'VAL', slug: 'valencia-cf', badge: 'https://assets-fantasy.llt-services.com/teambadge/t191/color/t191_valencia-cf.png' },
  '20': { id: '20', name: 'Villarreal CF', shortName: 'VIL', slug: 'villarreal-cf', badge: 'https://assets-fantasy.llt-services.com/teambadge/t449/color/t449_villarreal-cf.png' },
  '21': { id: '21', name: 'Deportivo Alavés', shortName: 'ALA', slug: 'd-alaves', badge: 'https://assets-fantasy.llt-services.com/teambadge/t173/color/t173_d-alaves.png' },
  /*
   * Los tres ascendidos de 26/27. Faltaban, y por eso el calendario enseñaba
   * once partidos contra un rival sin nombre.
   *
   * Identificados sin adivinar, cruzando DOS fuentes independientes:
   *   1. La plantilla que LALIGA da para cada id contra la que publica
   *      FutbolFantasy: 21 de 37 jugadores del id 12 estan en el Malaga, 21 de
   *      43 del 26 en el Deportivo y 21 de 40 del 49 en el Racing. El segundo
   *      equipo mas parecido no pasa de 4 coincidencias en ninguno.
   *   2. El escudo: pedir la URL y comprobar que responde 200. Asi salieron
   *      `t182_malaga-cf` y `t180_rc-deportivo`.
   *
   * Del Racing no se ha dado con el nombre de su escudo, asi que va vacio: la
   * interfaz pinta un hueco neutro. Un escudo equivocado seria peor.
   */
  '12': { id: '12', name: 'Málaga CF', shortName: 'MAL', slug: 'malaga-cf', badge: 'https://assets-fantasy.llt-services.com/teambadge/t182/color/t182_malaga-cf.png' },
  '26': { id: '26', name: 'RC Deportivo', shortName: 'DEP', slug: 'rc-deportivo', badge: 'https://assets-fantasy.llt-services.com/teambadge/t180/color/t180_rc-deportivo.png' },
  '49': { id: '49', name: 'Racing de Santander', shortName: 'RAC', slug: 'racing', badge: '' },
  /*
   * Girona, Mallorca y Oviedo NO aparecen en el calendario de 26/27. Se dejan
   * porque un id viejo que asome en algun sitio se lee mejor con nombre que sin
   * el, pero no cuentan como equipos de esta temporada.
   */
  '28': { id: '28', name: 'Girona FC', shortName: 'GIR', slug: 'girona-fc', badge: 'https://assets-fantasy.llt-services.com/teambadge/t2893/color/t2893_girona-fc.png' },
  '33': { id: '33', name: 'RCD Mallorca', shortName: 'MLL', slug: 'rcd-mallorca', badge: 'https://assets-fantasy.llt-services.com/teambadge/t181/color/t181_rcd-mallorca.png' },
  '157': { id: '157', name: 'Real Oviedo', shortName: 'OVI', slug: 'real-oviedo', badge: 'https://assets-fantasy.llt-services.com/teambadge/t187/color/t187_real-oviedo.png' },
};

export function resolveTeam(teamId: string, live: Map<string, Team>): Team {
  return (
    live.get(teamId) ??
    FALLBACK_TEAMS[teamId] ?? {
      id: teamId,
      name: `Equipo ${teamId}`,
      shortName: '—',
      slug: `team-${teamId}`,
      badge: '',
    }
  );
}
