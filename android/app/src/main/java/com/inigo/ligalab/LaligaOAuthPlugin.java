package com.inigo.ligalab;

import android.content.Intent;
import android.net.Uri;
import androidx.browser.customtabs.CustomTabsIntent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Puente nativo mínimo para el login social de LALIGA Fantasy, versión Android.
 *
 * Igual que en iOS: la web entrega la URL de autorización, aquí se abre en una
 * Custom Tab (el navegador del sistema; Google no deja iniciar sesión dentro de
 * una WebView) y al JavaScript solo vuelve la URL `authredirect://...` con
 * `code` y `state`. El canje por tokens lo hace el backend de LigaLab.
 *
 * La vuelta llega como un Intent a MainActivity, que declara ese esquema en el
 * manifiesto. Si en el móvil también está la app oficial de LALIGA Fantasy,
 * Android preguntará con cuál abrirlo: hay que elegir LigaLab.
 */
@CapacitorPlugin(name = "LaligaOAuth")
public class LaligaOAuthPlugin extends Plugin {

    private static final String LOGIN_HOST = "login.laliga.es";
    private static final String CALLBACK_SCHEME = "authredirect";
    private static final String CALLBACK_HOST = "com.lfp.laligafantasy";

    private PluginCall pendiente;
    /** La Custom Tab llegó a abrirse: volver sin callback es cancelar. */
    private boolean tabAbierta = false;

    @PluginMethod
    public void start(PluginCall call) {
        String raw = call.getString("url");
        Uri url = raw == null ? null : Uri.parse(raw);
        if (url == null || !"https".equalsIgnoreCase(url.getScheme())) {
            call.reject("La URL de acceso de LALIGA no es válida.");
            return;
        }
        if (!LOGIN_HOST.equalsIgnoreCase(url.getHost())) {
            call.reject("Solo se permite abrir el dominio oficial de acceso de LALIGA.");
            return;
        }

        if (pendiente != null) pendiente.reject("Se ha iniciado otro acceso.");
        pendiente = call;
        tabAbierta = false;
        call.setKeepAlive(true);

        getActivity().runOnUiThread(() -> {
            try {
                new CustomTabsIntent.Builder().build().launchUrl(getActivity(), url);
            } catch (Exception error) {
                terminar(null, "Android no pudo abrir el acceso de LALIGA.");
            }
        });
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        Uri data = intent == null ? null : intent.getData();
        if (data == null
            || !CALLBACK_SCHEME.equalsIgnoreCase(data.getScheme())
            || !CALLBACK_HOST.equalsIgnoreCase(data.getHost())) {
            return;
        }
        if (pendiente == null) return;
        JSObject resultado = new JSObject();
        resultado.put("callbackUrl", data.toString());
        terminar(resultado, null);
    }

    @Override
    protected void handleOnPause() {
        super.handleOnPause();
        if (pendiente != null) tabAbierta = true;
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        // Android entrega el Intent de vuelta ANTES de reanudar la actividad: si
        // al volver sigue pendiente, es que se cerró la pestaña sin terminar.
        if (pendiente != null && tabAbierta) terminar(null, "Acceso cancelado.");
    }

    private void terminar(JSObject resultado, String error) {
        PluginCall call = pendiente;
        pendiente = null;
        tabAbierta = false;
        if (call == null) return;
        call.setKeepAlive(false);
        if (error != null) call.reject(error);
        else call.resolve(resultado);
    }
}
