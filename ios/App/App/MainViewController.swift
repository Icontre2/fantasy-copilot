import Capacitor
import UIKit

/**
 * Controlador principal de LigaLab.
 *
 * Existe solo para registrar los plugins propios de la app. Capacitor carga
 * solo los plugins que vienen en paquetes; uno que vive dentro del target de la
 * app hay que darlo de alta a mano aquí, o `window.Capacitor.Plugins.LaligaOAuth`
 * no existe y el acceso social nunca aparece.
 */
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(LaligaOAuthPlugin())
    }
}
