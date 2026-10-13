"use client";

import { useSyncExternalStore } from "react";

/**
 * Jugadores que sigues. Se guardan en este navegador (localStorage): es una
 * preferencia tuya, no un dato de la liga. Si el navegador no deja guardar,
 * la lista funciona igual mientras la app esté abierta.
 */

const CLAVE = "ll_seguidos";
const EVENTO = "ll-seguidos";
let enMemoria: string[] | null = null;

function leer(): string[] {
  if (enMemoria) return enMemoria;
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    const lista = crudo ? (JSON.parse(crudo) as unknown) : [];
    enMemoria = Array.isArray(lista) ? lista.filter((x): x is string => typeof x === "string") : [];
  } catch {
    enMemoria = [];
  }
  return enMemoria;
}

function escribir(lista: string[]) {
  enMemoria = lista;
  try { window.localStorage.setItem(CLAVE, JSON.stringify(lista)); } catch { /* sigue en memoria */ }
  window.dispatchEvent(new Event(EVENTO));
}

export function alternarSeguido(id: string) {
  const lista = leer();
  escribir(lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);
}

const suscribir = (aviso: () => void) => {
  window.addEventListener(EVENTO, aviso);
  window.addEventListener("storage", aviso);
  return () => { window.removeEventListener(EVENTO, aviso); window.removeEventListener("storage", aviso); };
};
const VACIO: string[] = [];

export function useSeguidos(): string[] {
  return useSyncExternalStore(suscribir, leer, () => VACIO);
}
