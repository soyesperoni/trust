import Link from "next/link";

export default function TerminosCondicionesPage() {
  return (
    <main className="bg-background-light dark:bg-background-dark min-h-screen px-4 py-10 sm:py-14 transition-colors duration-300">
      <div className="mx-auto w-full max-w-4xl space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27] sm:p-10">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Trust · SupplyMax</p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Términos y Condiciones</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Última actualización: {new Date().toLocaleDateString("es-PA")}
          </p>
        </header>

        <section className="space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">1. Objeto de la plataforma</h2>
          <p>
            Trust es una plataforma SaaS de SupplyMax de Panamá para gestionar soporte, seguimiento y mantenimiento de
            productos de limpieza profesional y dosificadores en áreas y sucursales de clientes empresariales.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">2. Uso permitido y responsabilidades del usuario</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Usar la plataforma de forma legal, diligente y conforme a estos términos.</li>
            <li>Mantener la confidencialidad de sus credenciales y acceso.</li>
            <li>Proporcionar información veraz en tickets, formularios y reportes.</li>
            <li>No manipular ni alterar evidencias técnicas (fotos, videos, notas o geolocalización).</li>
            <li>Reportar incidentes de seguridad o accesos no autorizados de forma inmediata.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">3. Uso indebido</h2>
          <p>Está prohibido:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Intentar acceder a cuentas o datos sin autorización.</li>
            <li>Interferir con la disponibilidad o integridad de la plataforma.</li>
            <li>Subir contenido ilegal, ofensivo, fraudulento o que infrinja derechos de terceros.</li>
            <li>Usar la plataforma para fines distintos al soporte y gestión operativa acordada.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">4. Permisos del dispositivo</h2>
          <p>
            Para funcionalidades móviles, la app puede solicitar permisos como ubicación, cámara, micrófono,
            almacenamiento y notificaciones. Cada permiso se utiliza exclusivamente para evidencias, seguimiento de
            servicio y comunicación operativa, de acuerdo con la Política de Privacidad.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">5. Limitación de responsabilidad</h2>
          <p>
            SupplyMax realiza esfuerzos razonables para mantener la plataforma disponible y segura; sin embargo, no
            garantiza operación ininterrumpida ni ausencia total de errores. En la máxima medida permitida por la ley,
            no será responsable por daños indirectos, lucro cesante o pérdida de datos causada por uso indebido,
            terceros, fallas de conectividad o fuerza mayor.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">6. Suspensión y terminación de cuentas</h2>
          <p>
            Podemos suspender o cancelar cuentas temporal o definitivamente ante incumplimientos de estos términos,
            riesgos de seguridad, requerimientos legales o falta de autorización contractual.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">7. Propiedad intelectual</h2>
          <p>
            El software, diseño, marcas, documentación y contenidos de Trust pertenecen a SupplyMax o a sus
            licenciantes. No se concede cesión de propiedad, solo un derecho de uso limitado según contrato.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">8. Jurisdicción y ley aplicable</h2>
          <p>
            Estos términos se rigen por las leyes de la República de Panamá. Cualquier controversia será conocida por
            los tribunales competentes de la Ciudad de Panamá, salvo pacto distinto por escrito.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">9. Contacto</h2>
          <p>
            Para soporte legal, privacidad o términos de uso, contáctanos en <strong>legal@supplymax.net</strong>.
          </p>
        </section>

        <footer className="border-t border-slate-200 pt-5 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
          <p>
            Al usar Trust también aceptas nuestra{" "}
            <Link className="font-semibold text-primary hover:underline" href="/politica-privacidad">
              Política de Privacidad
            </Link>
            .
          </p>
        </footer>
      </div>
    </main>
  );
}
