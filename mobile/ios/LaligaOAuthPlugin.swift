import Foundation
import AuthenticationServices
import Capacitor
import UIKit

/**
 * Puente nativo mínimo para el login social de LALIGA Fantasy.
 *
 * La web entrega solo la URL de autorización. ASWebAuthenticationSession abre
 * el dominio oficial de LALIGA y captura dentro de ESTA sesión el callback
 * `authredirect://...`. Al JavaScript vuelve únicamente esa URL con `code` y
 * `state`; el intercambio por tokens se hace en el backend de LigaLab.
 */
@objc(LaligaOAuthPlugin)
public class LaligaOAuthPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "LaligaOAuthPlugin"
    public let jsName = "LaligaOAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise)
    ]

    private var authSession: ASWebAuthenticationSession?

    @objc func start(_ call: CAPPluginCall) {
        guard let rawUrl = call.getString("url"),
              let url = URL(string: rawUrl),
              let scheme = url.scheme?.lowercased(),
              scheme == "https" else {
            call.reject("La URL de acceso de LALIGA no es válida.")
            return
        }

        guard url.host?.lowercased() == "login.laliga.es" else {
            call.reject("Solo se permite abrir el dominio oficial de acceso de LALIGA.")
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let self else {
                call.reject("No se pudo iniciar el acceso.")
                return
            }

            let session = ASWebAuthenticationSession(
                url: url,
                callback: .customScheme("authredirect")
            ) { [weak self] callbackURL, error in
                defer { self?.authSession = nil }

                if let authError = error as? ASWebAuthenticationSessionError,
                   authError.code == .canceledLogin {
                    call.reject("Acceso cancelado.")
                    return
                }

                if let error {
                    call.reject("No se pudo completar el acceso: \(error.localizedDescription)")
                    return
                }

                guard let callbackURL,
                      callbackURL.scheme?.lowercased() == "authredirect",
                      callbackURL.host?.lowercased() == "com.lfp.laligafantasy" else {
                    call.reject("LALIGA no devolvió el callback esperado.")
                    return
                }

                call.resolve(["callbackUrl": callbackURL.absoluteString])
            }

            session.presentationContextProvider = self
            // Conserva la sesión del proveedor para que Google/Apple/Facebook
            // puedan reutilizar el login que ya tenga el usuario en iOS.
            session.prefersEphemeralWebBrowserSession = false
            self.authSession = session

            guard session.start() else {
                self.authSession = nil
                call.reject("iOS no pudo abrir la sesión de acceso.")
                return
            }
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        if let window = bridge?.viewController?.view.window {
            return window
        }

        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        if let window = scenes.flatMap({ $0.windows }).first(where: { $0.isKeyWindow }) {
            return window
        }

        return ASPresentationAnchor()
    }
}
