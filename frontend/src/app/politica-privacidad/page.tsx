import Link from "next/link";

export default function PoliticaPrivacidadPage() {
  return (
    <main className="bg-background-light dark:bg-background-dark min-h-screen px-4 py-10 sm:py-14 transition-colors duration-300">
      <div className="mx-auto w-full max-w-4xl space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27] sm:p-10">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Trust · SupplyMax</p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Política de Privacidad</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Última actualización: {new Date().toLocaleDateString("es-PA")}
          </p>
        </header>

        <section className="space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">1. Responsable del tratamiento</h2>
          <p>
            Esta plataforma es operada por <strong>SupplyMax de Panamá</strong>, con sede en Ciudad de Panamá, Panamá,
            para la gestión de soporte y mantenimiento de productos de limpieza profesional y dosificadores. Para
            cualquier solicitud sobre datos personales puedes escribir a <strong>privacidad@supplymax.net</strong>.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">2. Datos que recopilamos</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Datos de cuenta: nombre, correo electrónico, teléfono, empresa y rol.</li>
            <li>Datos técnicos: dirección IP, tipo de dispositivo, sistema operativo y registros de acceso.</li>
            <li>Datos de uso: acciones realizadas en la plataforma, tickets, visitas y mantenimientos.</li>
            <li>Cookies y tecnologías similares para sesión, seguridad y analítica.</li>
            <li>
              Ubicación (cuando aplica): para comprobar visitas en sucursales y validar rutas de atención técnica.
            </li>
            <li>
              Cámara y galería (cuando aplica): para evidencias fotográficas o de video en reportes técnicos.
            </li>
            <li>Micrófono (cuando aplica): para adjuntar notas de voz o evidencia audiovisual de incidencias.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">3. Para qué usamos los datos</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Autenticación de usuarios y control de accesos por rol.</li>
            <li>Planificación y seguimiento de visitas, incidencias y mantenimiento de dosificadores.</li>
            <li>Generación de reportes de servicio y trazabilidad operacional por sucursal/área.</li>
            <li>Mejora continua de la plataforma, soporte técnico y seguridad.</li>
            <li>Cumplimiento legal y prevención de fraude o uso indebido.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">4. Permisos de la app y su finalidad</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Ubicación:</strong> validar presencia en sitio durante visitas técnicas y registrar evidencia de
              cumplimiento de servicio.
            </li>
            <li>
              <strong>Cámara:</strong> capturar evidencia visual de instalaciones, incidencias y mantenimientos.
            </li>
            <li>
              <strong>Micrófono:</strong> grabar notas de voz para diagnósticos y reportes cuando el usuario lo decida.
            </li>
            <li>
              <strong>Almacenamiento/galería:</strong> adjuntar archivos de evidencia previamente capturados.
            </li>
            <li>
              <strong>Notificaciones:</strong> alertar sobre tareas, incidencias y visitas programadas.
            </li>
          </ul>
          <p>
            Los permisos se solicitan bajo el principio de mínimo acceso y solo cuando son necesarios para una función
            específica.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">5. Compartición con terceros</h2>
          <p>
            Podemos usar proveedores tecnológicos para operar el servicio (infraestructura, analítica, mensajería o
            soporte). Cuando aplique, se podrán compartir datos mínimos necesarios con terceros como proveedores de
            pagos, analítica o monitoreo (por ejemplo: Stripe, Google Analytics o Meta), siempre bajo acuerdos de
            confidencialidad y medidas de seguridad.
          </p>
          <p>No vendemos datos personales.</p>
        </section>

        <section className="space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">6. Seguridad de la información</h2>
          <p>
            Aplicamos controles técnicos y organizativos para proteger la información. Los datos se almacenan y
            transmiten con mecanismos de seguridad, incluyendo cifrado en tránsito y controles de acceso. Además,
            mantenemos políticas internas para minimizar accesos no autorizados.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">7. Derechos del usuario</h2>
          <p>
            Puedes solicitar acceso, rectificación, actualización o eliminación de tus datos personales, así como
            oponerte a determinados tratamientos. También puedes solicitar el cierre de tu cuenta.
          </p>
          <p>
            Para ejercer estos derechos escribe a <strong>privacidad@supplymax.net</strong> indicando tu nombre,
            correo asociado y detalle de la solicitud.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">8. Retención de datos</h2>
          <p>
            Conservamos los datos solo durante el tiempo necesario para prestar el servicio, cumplir obligaciones
            contractuales y legales, y resolver disputas.
          </p>
        </section>

        <footer className="border-t border-slate-200 pt-5 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
          <p>
            Si no estás de acuerdo con esta política, por favor deja de utilizar la plataforma. También puedes revisar
            nuestros{" "}
            <Link className="font-semibold text-primary hover:underline" href="/terminos-condiciones">
              Términos y Condiciones
            </Link>
            .
          </p>
        </footer>
      </div>
    </main>
  );
}
