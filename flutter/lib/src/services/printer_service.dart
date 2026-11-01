import 'package:printing/printing.dart';

/// Resultado de comprobar el servicio de impresion del dispositivo.
class PrinterAvailability {
  const PrinterAvailability({
    required this.available,
    required this.message,
    this.canPrint = false,
    this.canShare = false,
  });

  final bool available;
  final String message;
  final bool canPrint;
  final bool canShare;
}

/// Comprueba si la plataforma puede abrir la hoja de impresión o compartir el
/// PDF del informe. La app usa el servicio del sistema operativo, por lo que
/// también cubre impresoras térmicas vinculadas por Bluetooth o USB.
class PrinterService {
  const PrinterService();

  Future<PrinterAvailability> checkAvailability() async {
    try {
      final info = await Printing.info();
      final available = info.canPrint || info.canShare;
      if (available) {
        return PrinterAvailability(
          available: true,
          canPrint: info.canPrint,
          canShare: info.canShare,
          message: 'Servicio de impresión disponible.',
        );
      }
      return const PrinterAvailability(
        available: false,
        message: 'Este dispositivo no tiene disponible el servicio de impresión o de compartir archivos.',
      );
    } catch (_) {
      return const PrinterAvailability(
        available: false,
        message: 'No se pudo consultar el servicio de impresión del dispositivo.',
      );
    }
  }
}
