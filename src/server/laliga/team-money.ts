/**
 * Completar la caja que falta en las plantillas de la liga.
 *
 * Por que hace falta esto:
 *
 * La app lee las plantillas del endpoint PLURAL (`/teams`), que devuelve la liga
 * entera de una vez. En esa respuesta LALIGA solo rellena `teamMoney` del
 * manager conectado; para los demas llega vacio. De ahi salia el guion en las
 * tarjetas de los rivales.
 *
 * Lo que nunca se habia probado es el endpoint INDIVIDUAL (`/teams/{id}`), que
 * en este proyecto solo se usaba como plan B cuando el plural fallaba. Son dos
 * respuestas distintas de la API y no tienen por que traer los mismos campos.
 *
 * Asi que ahora se pregunta: si tras el plural queda alguna caja sin conocer, se
 * pide ese equipo por separado. Si viene, se usa —es un dato oficial de LALIGA,
 * no una estimacion—. Si tampoco viene, la caja se queda sin conocer y la
 * pantalla lo dice. En ningun caso se rellena con un numero calculado.
 */

type ConCaja = { teamId: string; teamMoney?: number };

/**
 * Equipos cuya caja no conocemos todavia y que merece la pena volver a pedir.
 */
export function equiposSinCaja<T extends ConCaja>(teams: T[]): T[] {
  return teams.filter((team) => team.teamMoney === undefined);
}

/**
 * Mezcla las cajas obtenidas por separado sobre la lista original.
 *
 * Solo pisa lo que falta: una caja que ya venia en el plural no se toca, y un
 * equipo del que la segunda consulta tampoco sepa nada se queda igual.
 */
export function mezclarCajas<T extends ConCaja>(
  teams: T[],
  encontradas: Map<string, number | undefined>,
): T[] {
  return teams.map((team) => {
    if (team.teamMoney !== undefined) return team;
    const caja = encontradas.get(team.teamId);
    return caja === undefined ? team : { ...team, teamMoney: caja };
  });
}
