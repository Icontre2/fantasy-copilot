package com.inigo.ligalab

import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Puente nativo minimo para el login social de LALIGA Fantasy en Android.
 *
 * Es el gemelo de `mobile/ios/LaligaOAuthPlugin.swift` y expone EXACTAMENTE el
 * mismo contrato (`LaligaOAuth.start({url}) -> {callbackUrl}`), porque el lado
 * web no distingue plataforma: `app/fantasy/mobile-auth.ts` solo busca
 * `Capacitor.Plugins.LaligaOAuth`. Dos contratos distintos obligarian a meter
 * ramas por sistema operativo en la web, que es justo lo que no hace falta.
 *
 * ── Por que existe esto y no basta la web ───────────────────────────────────
 * LALIGA solo acepta como redirect el esquema nativo
 * `authredirect://com.lfp.laligafantasy`. Un navegador no puede recibir ese
 * callback, asi que quien creo su cuenta de LALIGA con Google, Apple o Facebook
 * no tiene forma de entrar desde la web sin pegar un token a mano. Dentro de una
 * app que declara ese esquema, si.
 *
 * ── Que NO pasa por aqui ────────────────────────────────────────────────────
 * Ni la contraseña ni el `code_verifier` de PKCE. Al JavaScript vuelve solo la
 * URL de callback con `code` y `state`; el intercambio por tokens lo hace el
 * backend, que guarda el verifier en una cookie HttpOnly que este plugin nunca
 * ve. Aqui solo se abre una pantalla y se recoge una URL.
 */
@CapacitorPlugin(name = "LaligaOAuth")
class LaligaOAuthPlugin : Plugin() {

    /** La llamada en curso. Solo puede haber una: dos logins a la vez no existen. */
    private var pendiente: PluginCall? = null

    /**
     * Se ha abierto la pestaña y todavia no ha vuelto el callback.
     *
     * Es lo que permite distinguir «el usuario ha cerrado la pestaña» de «ha
     * terminado bien»: Android no avisa de que se cierre un Custom Tab, asi que
     * la unica señal es volver a `onResume` sin haber recibido el `Intent`.
     */
    private var esperandoRedireccion = false

    /**
     * La actividad ha llegado a pausarse desde que se abrio la pestaña.
     *
     * Sin esta segunda bandera el plugin se cancela solo en algunos
     * dispositivos: lanzar un Custom Tab puede disparar un `onResume` de la
     * actividad ANTES de que llegue el `onPause`, y ese resume se leeria como
     * «el usuario ha cerrado la pestaña» cuando en realidad todavia no la ha
     * visto. Solo cuenta como cancelacion volver despues de haber salido.
     */
    private var haSalido = false

    @PluginMethod
    fun start(call: PluginCall) {
        val cruda = call.getString("url")
        if (cruda.isNullOrBlank()) {
            call.reject("La URL de acceso de LALIGA no es válida.")
            return
        }

        val url = try {
            Uri.parse(cruda)
        } catch (_: Exception) {
            call.reject("La URL de acceso de LALIGA no es válida.")
            return
        }

        /*
         * La lista blanca es la misma que en iOS, y no es una formalidad: esta
         * URL la construye el servidor, pero si algun dia llegara manipulada
         * abririamos una pantalla de acceso ajena con la apariencia de la
         * nuestra. Lo que no es HTTPS contra el dominio oficial, no se abre.
         */
        if (!"https".equals(url.scheme, ignoreCase = true)) {
            call.reject("La URL de acceso de LALIGA no es válida.")
            return
        }
        if (!"login.laliga.es".equals(url.host, ignoreCase = true)) {
            call.reject("Solo se permite abrir el dominio oficial de acceso de LALIGA.")
            return
        }

        // Una llamada nueva cancela la anterior en vez de dejarla colgada: si no,
        // su promesa no se resolveria nunca y la pantalla se quedaria esperando.
        pendiente?.reject("Acceso cancelado.")

        call.setKeepAlive(true)
        pendiente = call
        esperandoRedireccion = true
        haSalido = false

        try {
            val pestana = CustomTabsIntent.Builder()
                .setShowTitle(true)
                .build()
            pestana.intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
            pestana.launchUrl(activity, url)
        } catch (error: Exception) {
            // Sin navegador compatible con Custom Tabs no hay nada que abrir.
            limpiar()
            call.reject("Android no pudo abrir la pantalla de acceso: ${error.message ?: "sin navegador disponible"}")
        }
    }

    /**
     * Llega el `authredirect://com.lfp.laligafantasy?...`.
     *
     * Requiere que la actividad declare ese esquema y use `singleTask`; con el
     * modo por defecto Android abriria una instancia nueva y este metodo no se
     * llamaria nunca. Ver `mobile/android/README.md`.
     */
    override fun handleOnNewIntent(intent: Intent) {
        super.handleOnNewIntent(intent)

        val datos = intent.data ?: return
        if (!"authredirect".equals(datos.scheme, ignoreCase = true)) return
        if (!"com.lfp.laligafantasy".equals(datos.host, ignoreCase = true)) return

        val call = pendiente ?: return
        // Antes de resolver: si no se baja la bandera aqui, el `onResume` que
        // viene justo despues rechazaria la llamada por «cancelada».
        limpiar()

        val respuesta = JSObject()
        respuesta.put("callbackUrl", datos.toString())
        call.resolve(respuesta)
    }

    /**
     * Volver aqui con una llamada viva y sin callback significa que el usuario
     * cerro la pestaña. Sin esto, la promesa se quedaria pendiente para siempre
     * y el boton de la pantalla no volveria de «Entrando…».
     */
    override fun handleOnPause() {
        super.handleOnPause()
        if (esperandoRedireccion) haSalido = true
    }

    override fun handleOnResume() {
        super.handleOnResume()
        if (!esperandoRedireccion || !haSalido) return

        val call = pendiente ?: return
        limpiar()
        call.reject("Acceso cancelado.")
    }

    private fun limpiar() {
        pendiente = null
        esperandoRedireccion = false
        haSalido = false
    }
}
