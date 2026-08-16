/**
 * Slugs de FútbolFantasy por id de equipo de LALIGA.
 *
 * Faltaban los tres ascendidos (12 Málaga, 26 Deportivo, 49 Racing) y con ellos
 * faltaba su alineación probable entera: sin slug no hay página que leer, así
 * que sus jugadores se quedaban sin porcentaje de titularidad. Los tres slugs
 * están comprobados: sus páginas responden 200 y sus plantillas coinciden con
 * las que LALIGA da para esos ids.
 *
 * Girona, Mallorca y Oviedo no juegan esta temporada; se dejan por si algún id
 * viejo asoma, pero no se consultan.
 */
export const FUTBOLFANTASY_TEAM_SLUGS: Record<string, string> = {
  '2': 'atletico', '3': 'athletic', '4': 'barcelona', '5': 'betis',
  '6': 'celta', '7': 'elche', '8': 'espanyol', '9': 'getafe',
  '11': 'levante', '12': 'malaga', '13': 'osasuna', '14': 'rayo-vallecano',
  '15': 'real-madrid', '16': 'real-sociedad', '17': 'sevilla',
  '18': 'valencia', '20': 'villarreal', '21': 'alaves', '26': 'deportivo',
  '49': 'racing', '28': 'girona', '33': 'mallorca', '157': 'real-oviedo',
};
