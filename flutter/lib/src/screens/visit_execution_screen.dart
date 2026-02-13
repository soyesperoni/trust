import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:latlong2/latlong.dart';
import 'package:mime/mime.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:signature/signature.dart';
import 'package:video_compress/video_compress.dart';

import '../models/visit.dart';
import '../services/api_client.dart';
import '../services/trust_repository.dart';
import '../theme/app_colors.dart';

class VisitExecutionScreen extends StatefulWidget {
  const VisitExecutionScreen({required this.visit, required this.email, super.key});

  final Visit visit;
  final String email;

  @override
  State<VisitExecutionScreen> createState() => _VisitExecutionScreenState();
}

class _VisitExecutionScreenState extends State<VisitExecutionScreen> {
  final SignatureController _signatureController = SignatureController(
    penStrokeWidth: 2,
    penColor: const Color(0xFF111827),
  );
  final TextEditingController _commentsController = TextEditingController();
  final TextEditingController _responsibleNameController = TextEditingController();
  final MapController _mapController = MapController();
  final TrustRepository _repository = TrustRepository();

  static const int _maxEvidenceItems = 4;
  static const int _maxEvidenceBytes = 10 * 1024 * 1024;

  int _step = 1;
  bool _loading = true;
  bool _isSubmitting = false;
  String? _error;

  Visit? _visit;
  Position? _startPosition;
  bool _locationValidated = false;
  bool _locationCheck = false;
  final List<_ChecklistDispenser> _checklistDispensers = <_ChecklistDispenser>[];
  final List<File> _evidenceFiles = <File>[];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _signatureController.dispose();
    _commentsController.dispose();
    _responsibleNameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final progress = _step * 0.25;

    return Scaffold(
      appBar: AppBar(title: const Text('Realizar visita')),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Paso $_step de 4', style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.yellowDark)),
                        Text('${(progress * 100).round()}%', style: const TextStyle(color: AppColors.gray500)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    LinearProgressIndicator(value: progress, color: AppColors.yellow, backgroundColor: AppColors.gray300),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(10)),
                        child: Text(_error!, style: const TextStyle(color: Color(0xFFB91C1C))),
                      ),
                    ],
                    const SizedBox(height: 14),
                    Expanded(child: _buildStep()),
                    const SizedBox(height: 12),
                    _buildFooter(),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildStep() {
    switch (_step) {
      case 1:
        return _buildLocationStep();
      case 2:
        return _buildChecklistStep();
      case 3:
        return _buildEvidenceStep();
      default:
        return _buildSignatureStep();
    }
  }

  Widget _buildLocationStep() {
    final visit = _visit ?? widget.visit;
    final center = _startPosition == null
        ? const LatLng(-12.046374, -77.042793)
        : LatLng(_startPosition!.latitude, _startPosition!.longitude);

    return ListView(
      children: [
        const Text('Iniciar Visita', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 24)),
        const SizedBox(height: 4),
        const Text('Valida tu ubicación para comenzar la inspección.', style: TextStyle(color: AppColors.gray500)),
        const SizedBox(height: 12),
        _infoCard(visit),
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: SizedBox(
            height: 220,
            child: FlutterMap(
              mapController: _mapController,
              key: ValueKey<String>(
                _startPosition == null
                    ? 'location-pending'
                    : '${_startPosition!.latitude}-${_startPosition!.longitude}',
              ),
              options: MapOptions(initialCenter: center, initialZoom: _startPosition == null ? 14 : 17),
              children: [
                TileLayer(
                  urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.trust.mobile',
                ),
                if (_startPosition != null)
                  MarkerLayer(
                    markers: [
                      Marker(
                        point: center,
                        width: 44,
                        height: 44,
                        child: const Icon(Icons.location_on, color: AppColors.yellowDark, size: 36),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: _isSubmitting ? null : _onStartVisit,
          child: Text(_isSubmitting ? 'Validando...' : 'Validar ubicación'),
        ),
      ],
    );
  }

  Widget _infoCard(Visit visit) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.gray300)),
      child: Column(
        children: [
          _kvRow('Hora', _formatTime(visit.visitedAt), isHeader: true),
          const Divider(height: 18),
          _kvRow('Cliente', visit.client),
          _kvRow('Sucursal', visit.branch),
          _kvRow('Área', visit.area),
        ],
      ),
    );
  }

  Widget _kvRow(String key, String value, {bool isHeader = false}) {
    return Row(
      children: [
        SizedBox(width: 80, child: Text(key, style: TextStyle(color: AppColors.gray500, fontWeight: isHeader ? FontWeight.w700 : FontWeight.w500))),
        Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w700))),
      ],
    );
  }

  Widget _buildChecklistStep() {
    return ListView(
      children: [
        const Text('Revisión de Dosificadores', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 24)),
        const SizedBox(height: 4),
        const Text('Marca cada elemento verificado en el área.', style: TextStyle(color: AppColors.gray500)),
        const SizedBox(height: 12),
        ..._checklistDispensers.map(_buildDispenserCard),
      ],
    );
  }

  Widget _buildDispenserCard(_ChecklistDispenser item) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppColors.gray50, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.gray300)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item.identifier, style: const TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text(item.location, style: const TextStyle(color: AppColors.gray500, fontSize: 12)),
                  ],
                ),
              ),
              IconButton(
                onPressed: () => setState(() => item.checked = !item.checked),
                icon: Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: item.checked ? AppColors.yellow : Colors.white,
                    border: Border.all(color: item.checked ? AppColors.yellowDark : AppColors.gray300, width: 2),
                  ),
                  child: Icon(Icons.check, size: 18, color: item.checked ? AppColors.black : Colors.transparent),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _buildReferenceTile(title: 'Modelo del dosificador', name: item.modelName, imageUrl: item.modelPhoto),
          if (item.products.isNotEmpty) ...[
            const SizedBox(height: 8),
            ...item.products.map(
              (product) => Padding(
                padding: const EdgeInsets.only(left: 16, top: 6),
                child: _buildReferenceTile(title: 'Producto', name: product.name, imageUrl: product.photo),
              ),
            ),
          ] else ...[
            const SizedBox(height: 8),
            const Padding(
              padding: EdgeInsets.only(left: 16),
              child: Text('Este dosificador no tiene productos registrados.', style: TextStyle(color: AppColors.gray500, fontSize: 12)),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildReferenceTile({required String title, required String name, String? imageUrl}) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.gray300)),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: SizedBox(
              width: 48,
              height: 48,
              child: imageUrl == null || imageUrl.isEmpty
                  ? Container(
                      color: AppColors.gray50,
                      alignment: Alignment.center,
                      child: const Text('Sin\nfoto', textAlign: TextAlign.center, style: TextStyle(fontSize: 10, color: AppColors.gray500)),
                    )
                  : Image.network(
                      imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: AppColors.gray50,
                        alignment: Alignment.center,
                        child: const Text('Sin\nfoto', textAlign: TextAlign.center, style: TextStyle(fontSize: 10, color: AppColors.gray500)),
                      ),
                    ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: AppColors.gray500, fontSize: 11)),
                Text(name, style: const TextStyle(fontWeight: FontWeight.w700), overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEvidenceStep() {
    return ListView(
      children: [
        const Text('Hallazgos y Evidencias', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 24)),
        const SizedBox(height: 4),
        const Text('Registra comentarios y captura evidencias de la inspección.', style: TextStyle(color: AppColors.gray500)),
        const SizedBox(height: 12),
        TextField(
          controller: _commentsController,
          maxLines: 4,
          decoration: const InputDecoration(labelText: 'Comentarios', hintText: 'Escribe observaciones de la visita...'),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: _openMiniCamera,
          icon: const Icon(Icons.add_a_photo_outlined),
          label: const Text('Agregar evidencia'),
        ),
        const SizedBox(height: 10),
        ..._evidenceFiles.asMap().entries.map(
          (entry) => ListTile(
            dense: true,
            contentPadding: EdgeInsets.zero,
            leading: Icon(entry.value.path.toLowerCase().endsWith('.mp4') ? Icons.videocam_outlined : Icons.image_outlined),
            title: Text(entry.value.uri.pathSegments.last, maxLines: 1, overflow: TextOverflow.ellipsis),
            trailing: IconButton(
              onPressed: () => setState(() => _evidenceFiles.removeAt(entry.key)),
              icon: const Icon(Icons.delete_outline),
            ),
          ),
        ),
        CheckboxListTile(
          value: _locationCheck,
          onChanged: (value) => setState(() => _locationCheck = value ?? false),
          title: const Text('Verificación de ubicación'),
          subtitle: const Text('Confirmo que me encuentro físicamente en el sitio de inspección.'),
          contentPadding: EdgeInsets.zero,
        ),
      ],
    );
  }

  Widget _buildSignatureStep() {
    return ListView(
      children: [
        const Text('Finalizar Inspección', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 24)),
        const SizedBox(height: 4),
        const Text('Firma del responsable del área.', style: TextStyle(color: AppColors.gray500)),
        const SizedBox(height: 12),
        Container(
          height: 210,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.gray300),
            color: AppColors.gray50,
          ),
          child: Signature(controller: _signatureController, backgroundColor: Colors.transparent),
        ),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(onPressed: _signatureController.clear, child: const Text('Limpiar firma')),
        ),
        TextField(
          controller: _responsibleNameController,
          decoration: const InputDecoration(labelText: 'Nombre del Responsable', hintText: 'Ej. Juan Pérez'),
        ),
      ],
    );
  }

  Widget _buildFooter() {
    final allDispensersChecked = _checklistDispensers.isEmpty || _checklistDispensers.every((item) => item.checked);
    final canContinue = switch (_step) {
      1 => _locationValidated,
      2 => allDispensersChecked,
      3 => _locationCheck,
      _ => true,
    };

    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: _isSubmitting
                ? null
                : () {
                    if (_step == 1) {
                      Navigator.of(context).pop(true);
                      return;
                    }
                    setState(() => _step -= 1);
                  },
            child: Text(_step == 1 ? 'Cancelar' : 'Atrás'),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: FilledButton(
            onPressed: !_isSubmitting && canContinue ? _next : null,
            child: Text(_step == 4 ? (_isSubmitting ? 'Finalizando...' : 'Finalizar visita') : 'Siguiente'),
          ),
        ),
      ],
    );
  }

  Future<void> _loadData() async {
    try {
      final visit = await _repository.loadVisitById(widget.email, widget.visit.id);
      final dispensers = await _repository.loadDispensers(widget.email);
      final areaDispensers = dispensers.where((item) {
        final area = item['area'];
        return area is Map<String, dynamic> && area['id'] == visit.areaId;
      }).toList();

      if (!mounted) return;
      setState(() {
        _visit = visit;
        _checklistDispensers
          ..clear()
          ..addAll(
            areaDispensers.map(
              (item) {
                final model = item['model'] as Map<String, dynamic>?;
                final products = (item['products'] as List<dynamic>? ?? const <dynamic>[])
                    .whereType<Map<String, dynamic>>()
                    .map(
                      (product) => _ChecklistProduct(
                        name: product['name'] as String? ?? 'Producto',
                        photo: _normalizeMediaUrl(product['photo'] as String?),
                      ),
                    )
                    .toList(growable: false);

                return _ChecklistDispenser(
                  id: item['id'] as int? ?? 0,
                  identifier: item['identifier'] as String? ?? 'Dosificador',
                  location: (item['area'] as Map<String, dynamic>?)?['name'] as String? ?? visit.area,
                  modelName: model?['name'] as String? ?? 'Sin modelo',
                  modelPhoto: _normalizeMediaUrl(model?['photo'] as String?),
                  products: products,
                );
              },
            ),
          );
      });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _precacheChecklistImages();
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _onStartVisit() async {
    try {
      setState(() {
        _error = null;
        _isSubmitting = true;
      });
      await _requestInitialFlowPermissions();
      final position = await _validatePhoneLocation();
      await _repository.startVisit(
        email: widget.email,
        visitId: widget.visit.id,
        latitude: position.latitude,
        longitude: position.longitude,
      );
      if (!mounted) return;
      setState(() {
        _startPosition = position;
        _locationValidated = true;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        final target = LatLng(position.latitude, position.longitude);
        _mapController.move(target, 17);
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = _toError(error));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _openMiniCamera() async {
    final mode = await showModalBottomSheet<_EvidenceMode>(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Capturar evidencia', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
                const SizedBox(height: 6),
                const Text('Selecciona el tipo de captura.', style: TextStyle(color: AppColors.gray500)),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.of(context).pop(_EvidenceMode.photo),
                        child: const Text('Foto'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.of(context).pop(_EvidenceMode.video),
                        child: const Text('Video'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );

    if (mode == null) return;
    await _captureEvidence(mode);
  }

  Future<void> _captureEvidence(_EvidenceMode mode) async {
    if (_evidenceFiles.length >= _maxEvidenceItems) {
      setState(() => _error = 'Solo puedes adjuntar hasta $_maxEvidenceItems evidencias.');
      return;
    }

    try {
      await _ensureCapturePermissions(requireMicrophone: mode == _EvidenceMode.video);
      if (!mounted) return;

      final XFile? capturedFile = await showDialog<XFile>(
        context: context,
        barrierDismissible: false,
        builder: (_) => _MiniCameraCaptureDialog(mode: mode),
      );
      if (capturedFile == null) return;

      final selectedFile = mode == _EvidenceMode.photo
          ? await _compressPhoto(File(capturedFile.path))
          : await _compressVideo(File(capturedFile.path));

      if (!mounted) return;

      setState(() {
        _error = null;
        _evidenceFiles.add(selectedFile);
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = _toError(error));
    }
  }

  Future<File> _compressPhoto(File file) async {
    final qualities = <int>[80, 65, 50, 35, 20];
    final basePath = file.path;

    for (final quality in qualities) {
      final compressed = await FlutterImageCompress.compressWithFile(
        file.absolute.path,
        quality: quality,
        minWidth: 1280,
        minHeight: 1280,
        format: CompressFormat.jpeg,
      );
      if (compressed == null) continue;

      final target = File('${basePath}_q$quality.jpg');
      await target.writeAsBytes(compressed, flush: true);
      if (await target.length() <= _maxEvidenceBytes) {
        return target;
      }
    }

    throw Exception('No se pudo comprimir la foto por debajo de 10MB.');
  }

  Future<File> _compressVideo(File file) async {
    MediaInfo? mediaInfo;
    try {
      mediaInfo = await VideoCompress.compressVideo(
        file.path,
        quality: VideoQuality.MediumQuality,
        includeAudio: true,
        deleteOrigin: false,
      );
      final compressedPath = mediaInfo?.file?.path ?? file.path;
      final compressedFile = File(compressedPath);
      if (await compressedFile.length() > _maxEvidenceBytes) {
        throw Exception('El video comprimido supera 10MB. Intenta con menos movimiento o mejor iluminación.');
      }
      return compressedFile;
    } finally {
      await VideoCompress.cancelCompression();
    }
  }

  Future<void> _next() async {
    if (_step < 4) {
      final targetStep = _step + 1;
      try {
        if (targetStep == 3) {
          await _ensureCapturePermissions(requireMicrophone: true);
        }
        if (targetStep == 4) {
          await _requestLocationPermission();
          await _validatePhoneLocation();
        }
        if (!mounted) return;
        setState(() {
          _error = null;
          _step = targetStep;
        });
      } catch (error) {
        if (!mounted) return;
        setState(() => _error = _toError(error));
      }
      return;
    }

    await _finishVisit();
  }

  Future<void> _finishVisit() async {
    final messenger = ScaffoldMessenger.of(context);

    try {
      setState(() {
        _error = null;
        _isSubmitting = true;
      });

      final signatureBytes = await _signatureController.toPngBytes();
      if (signatureBytes == null || signatureBytes.isEmpty) {
        throw Exception('Debes registrar la firma del responsable para finalizar.');
      }

      final responsibleName = _responsibleNameController.text.trim();
      if (responsibleName.isEmpty) {
        throw Exception('Debes registrar el nombre del responsable para finalizar.');
      }
      if (!_locationCheck) {
        throw Exception('Debes confirmar tu ubicación en sitio para finalizar la visita.');
      }

      final endPosition = await _validatePhoneLocation();
      final checklist = _checklistDispensers
          .map((item) => {
                'id': 'dispenser-${item.id}',
                'label': item.identifier,
                'location': item.location,
                'checked': item.checked,
                'photo': null,
              })
          .toList(growable: false);

      final files = await Future.wait(
        _evidenceFiles.map((file) async {
          final fileName = file.uri.pathSegments.last;
          final mimeType = lookupMimeType(file.path) ?? lookupMimeType(fileName);
          final mimeParts = mimeType?.split('/');
          final mediaType = mimeParts != null && mimeParts.length == 2 ? MediaType(mimeParts[0], mimeParts[1]) : null;

          return http.MultipartFile.fromBytes(
            'evidence_files',
            await file.readAsBytes(),
            filename: fileName,
            contentType: mediaType,
          );
        }),
      );

      await _repository.completeVisit(
        email: widget.email,
        visitId: widget.visit.id,
        latitude: endPosition.latitude,
        longitude: endPosition.longitude,
        visitReport: {
          'checklist': checklist,
          'comments': _commentsController.text.trim(),
          'location_verified': _locationCheck,
          'responsible_name': responsibleName,
          'responsible_signature': 'data:image/png;base64,${base64Encode(signatureBytes)}',
        },
        evidenceFiles: files,
      );

      if (!mounted) return;
      messenger.showSnackBar(const SnackBar(content: Text('Visita finalizada correctamente.')));
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = _toError(error));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _requestCameraPermissions({required bool requireMicrophone}) async {
    final requestedPermissions = <Permission>[Permission.camera];
    if (requireMicrophone) {
      requestedPermissions.add(Permission.microphone);
    }

    final statuses = await requestedPermissions.request();
    final cameraPermission = statuses[Permission.camera] ?? PermissionStatus.denied;
    final microphonePermission = requireMicrophone
        ? (statuses[Permission.microphone] ?? PermissionStatus.denied)
        : PermissionStatus.granted;

    if (!cameraPermission.isGranted || !microphonePermission.isGranted) {
      throw Exception(requireMicrophone
          ? 'Debes otorgar permisos para cámara y micrófono para continuar.'
          : 'Debes otorgar permisos para cámara para continuar.');
    }
  }

  Future<void> _ensureCapturePermissions({required bool requireMicrophone}) async {
    await _requestCameraPermissions(requireMicrophone: requireMicrophone);
  }

  Future<void> _requestInitialFlowPermissions() async {
    await _requestLocationPermission();
  }

  Future<void> _requestLocationPermission() async {
    final locationPermission = await Permission.locationWhenInUse.request();
    if (!locationPermission.isGranted) {
      throw Exception('Debes otorgar permisos de ubicación para continuar.');
    }
  }

  Future<Position> _validatePhoneLocation() async {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) {
      throw Exception('Activa el servicio de ubicación para continuar.');
    }

    const locationSettings = LocationSettings(accuracy: LocationAccuracy.high);
    return Geolocator.getCurrentPosition(locationSettings: locationSettings);
  }

  String _formatTime(String input) {
    final date = DateTime.tryParse(input)?.toLocal();
    if (date == null) return '--:--';
    final localizations = MaterialLocalizations.of(context);
    return localizations.formatTimeOfDay(
      TimeOfDay(hour: date.hour, minute: date.minute),
      alwaysUse24HourFormat: false,
    );
  }

  String _toError(Object error) {
    final message = error.toString();
    return message.startsWith('Exception: ') ? message.replaceFirst('Exception: ', '') : message;
  }

  String? _normalizeMediaUrl(String? rawUrl) {
    if (rawUrl == null || rawUrl.isEmpty) return null;
    if (rawUrl.startsWith('data:')) return rawUrl;
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;

    final backendBase = Uri.parse(ApiClient.baseUrl);
    final origin = Uri(
      scheme: backendBase.scheme,
      host: backendBase.host,
      port: backendBase.hasPort ? backendBase.port : null,
    );
    return origin.resolve(rawUrl).toString();
  }

  Future<void> _precacheChecklistImages() async {
    final imageUrls = <String>{
      for (final dispenser in _checklistDispensers)
        if (dispenser.modelPhoto != null && dispenser.modelPhoto!.isNotEmpty) dispenser.modelPhoto!,
      for (final dispenser in _checklistDispensers)
        for (final product in dispenser.products)
          if (product.photo != null && product.photo!.isNotEmpty) product.photo!,
    };

    await Future.wait(
      imageUrls.map(
        (url) => precacheImage(NetworkImage(url), context).catchError((_) {}),
      ),
    );
  }
}

class _ChecklistDispenser {
  _ChecklistDispenser({
    required this.id,
    required this.identifier,
    required this.location,
    required this.modelName,
    this.modelPhoto,
    this.products = const <_ChecklistProduct>[],
  });

  final int id;
  final String identifier;
  final String location;
  final String modelName;
  final String? modelPhoto;
  final List<_ChecklistProduct> products;
  bool checked = false;
}

class _ChecklistProduct {
  _ChecklistProduct({required this.name, this.photo});

  final String name;
  final String? photo;
}


class _MiniCameraCaptureDialog extends StatefulWidget {
  const _MiniCameraCaptureDialog({required this.mode});

  final _EvidenceMode mode;

  @override
  State<_MiniCameraCaptureDialog> createState() => _MiniCameraCaptureDialogState();
}

class _MiniCameraCaptureDialogState extends State<_MiniCameraCaptureDialog> {
  static const Duration _maxVideoDuration = Duration(seconds: 30);

  CameraController? _controller;
  bool _initializing = true;
  bool _capturing = false;
  bool _recording = false;
  Timer? _videoTimer;
  Duration _elapsed = Duration.zero;
  String? _error;

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  @override
  void dispose() {
    _videoTimer?.cancel();
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _initCamera() async {
    try {
      final cameras = await availableCameras();
      final camera = cameras.firstWhere(
        (item) => item.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );
      final controller = CameraController(
        camera,
        ResolutionPreset.medium,
        enableAudio: widget.mode == _EvidenceMode.video,
      );
      await controller.initialize();
      if (!mounted) return;
      setState(() {
        _controller = controller;
        _initializing = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = 'No se pudo iniciar la cámara: $error';
        _initializing = false;
      });
    }
  }

  Future<void> _capture() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized || _capturing) return;

    try {
      setState(() {
        _capturing = true;
        _error = null;
      });
      if (widget.mode == _EvidenceMode.photo) {
        final file = await controller.takePicture();
        if (!mounted) return;
        Navigator.of(context).pop(file);
        return;
      }

      if (!_recording) {
        await controller.startVideoRecording();
        _startVideoTimer();
        if (!mounted) return;
        setState(() {
          _capturing = false;
          _recording = true;
        });
        return;
      }

      final file = await controller.stopVideoRecording();
      _videoTimer?.cancel();
      if (!mounted) return;
      Navigator.of(context).pop(file);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _capturing = false;
        _recording = false;
        _error = 'No se pudo capturar evidencia: $error';
      });
    }
  }

  void _startVideoTimer() {
    _elapsed = Duration.zero;
    _videoTimer?.cancel();
    _videoTimer = Timer.periodic(const Duration(seconds: 1), (timer) async {
      if (!mounted || !_recording) {
        timer.cancel();
        return;
      }
      final next = _elapsed + const Duration(seconds: 1);
      setState(() => _elapsed = next);
      if (next >= _maxVideoDuration) {
        timer.cancel();
        await _capture();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    final canCapture = !_initializing && !_capturing && controller != null && controller.value.isInitialized;

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 18),
      child: SizedBox(
        width: 360,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      widget.mode == _EvidenceMode.photo ? 'Mini cámara (Foto)' : 'Mini cámara (Video 30s máx.)',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                  IconButton(
                    onPressed: _recording ? null : () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: AspectRatio(
                  aspectRatio: controller?.value.aspectRatio ?? (16 / 9),
                  child: _initializing
                      ? const Center(child: CircularProgressIndicator())
                      : _error != null
                          ? Center(child: Padding(padding: const EdgeInsets.all(8), child: Text(_error!, textAlign: TextAlign.center)))
                          : CameraPreview(controller!),
                ),
              ),
              if (widget.mode == _EvidenceMode.video)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text('Duración: ${_elapsed.inSeconds}s / 30s', style: const TextStyle(color: AppColors.gray500)),
                ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: canCapture ? _capture : null,
                  icon: Icon(widget.mode == _EvidenceMode.photo ? Icons.camera_alt_outlined : (_recording ? Icons.stop_circle_outlined : Icons.videocam_outlined)),
                  label: Text(widget.mode == _EvidenceMode.photo ? 'Tomar foto' : (_recording ? 'Detener grabación' : 'Iniciar grabación')),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

enum _EvidenceMode { photo, video }
