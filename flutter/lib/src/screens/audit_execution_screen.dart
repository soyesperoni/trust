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

import '../models/audit.dart';
import '../services/trust_repository.dart';
import '../theme/app_colors.dart';

class AuditExecutionScreen extends StatefulWidget {
  const AuditExecutionScreen({required this.audit, required this.email, super.key});

  final Audit audit;
  final String email;

  @override
  State<AuditExecutionScreen> createState() => _AuditExecutionScreenState();
}

class _AuditExecutionScreenState extends State<AuditExecutionScreen> {
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
  bool _isSubmitting = false;
  bool _showUploadProgress = false;
  double _uploadProgress = 0;
  String _uploadStatus = 'Preparando auditoría...';
  Timer? _uploadTimer;
  String? _error;

  Position? _startPosition;
  bool _locationValidated = false;
  bool _locationCheck = false;
  final List<_AuditQuestionAnswer> _answers = <_AuditQuestionAnswer>[];
  final List<File> _evidenceFiles = <File>[];

  @override
  void initState() {
    super.initState();
    _loadQuestions();
  }

  @override
  void dispose() {
    _uploadTimer?.cancel();
    _signatureController.dispose();
    _commentsController.dispose();
    _responsibleNameController.dispose();
    super.dispose();
  }

  void _loadQuestions() {
    final questions = (widget.audit.formSchema['questions'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<String, dynamic>>()
        .toList(growable: false);

    _answers
      ..clear()
      ..addAll(
        questions.asMap().entries.map(
              (entry) => _AuditQuestionAnswer(
                id: entry.key + 1,
                label: entry.value['label'] as String? ?? 'Pregunta ${entry.key + 1}',
                responseType: entry.value['response_type'] as String? ?? 'yes_no',
                required: entry.value['required'] as bool? ?? true,
                options: (entry.value['options'] as List<dynamic>? ?? const ['Sí', 'No', 'No aplica'])
                    .map((item) => item.toString())
                    .toList(growable: false),
                questionWeight: (entry.value['question_weight'] as num?)?.toDouble() ?? 0,
                responseScores: ((entry.value['response_scores'] as Map<String, dynamic>?) ?? const <String, dynamic>{})
                    .map((key, value) => MapEntry(key, (value as num?)?.toDouble() ?? 0)),
              ),
            ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final progress = _step * 0.25;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(title: const Text('Realizar auditoría')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Paso $_step de 4', style: TextStyle(fontWeight: FontWeight.w700, color: isDark ? AppColors.yellow : AppColors.yellowDark)),
                  Text('${(progress * 100).round()}%', style: TextStyle(color: isDark ? AppColors.darkMuted : AppColors.gray500)),
                ],
              ),
              const SizedBox(height: 8),
              LinearProgressIndicator(value: progress, color: AppColors.yellow, backgroundColor: isDark ? AppColors.darkCardBorder : AppColors.gray300),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: isDark ? const Color(0xFF3F1D1D) : const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(10)),
                  child: Text(_error!, style: const TextStyle(color: Color(0xFFB91C1C))),
                ),
              ],
              const SizedBox(height: 14),
              Expanded(child: _buildStep(isDark)),
              const SizedBox(height: 12),
              _buildFooter(),
            ],
          ),
        ),
      ),
      bottomSheet: _showUploadProgress
          ? Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 18),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkCard : Colors.white,
                border: Border(top: BorderSide(color: isDark ? AppColors.darkCardBorder : AppColors.gray300)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Finalizando auditoría...', style: TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(_uploadStatus, style: TextStyle(color: isDark ? AppColors.darkMuted : AppColors.gray500)),
                  const SizedBox(height: 10),
                  LinearProgressIndicator(value: _uploadProgress, color: AppColors.yellow, backgroundColor: isDark ? AppColors.darkCardBorder : AppColors.gray300),
                  const SizedBox(height: 6),
                  Text('${(_uploadProgress * 100).round()}%', style: const TextStyle(fontWeight: FontWeight.w600)),
                ],
              ),
            )
          : null,
    );
  }

  Widget _buildStep(bool isDark) {
    switch (_step) {
      case 1:
        return _buildLocationStep(isDark);
      case 2:
        return _buildQuestionsStep(isDark);
      case 3:
        return _buildEvidenceStep(isDark);
      default:
        return _buildSignatureStep(isDark);
    }
  }

  Widget _buildLocationStep(bool isDark) {
    final center = _startPosition == null
        ? const LatLng(-12.046374, -77.042793)
        : LatLng(_startPosition!.latitude, _startPosition!.longitude);

    return ListView(
      children: [
        const Text('Iniciar Auditoría', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 24)),
        const SizedBox(height: 4),
        Text('Valida tu ubicación para comenzar la auditoría.', style: TextStyle(color: isDark ? AppColors.darkMuted : AppColors.gray500)),
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
                TileLayer(urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName: 'com.trust.mobile'),
                if (_startPosition != null)
                  MarkerLayer(markers: [Marker(point: center, width: 44, height: 44, child: const Icon(Icons.location_on, color: AppColors.yellowDark, size: 36))]),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        FilledButton(onPressed: _isSubmitting ? null : _onStartAudit, child: Text(_isSubmitting ? 'Validando...' : 'Validar ubicación')),
      ],
    );
  }

  Widget _buildQuestionsStep(bool isDark) {
    return ListView(
      children: [
        const Text('Preguntas de plantilla', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 24)),
        const SizedBox(height: 4),
        Text('Responde cada pregunta como un paso de la auditoría.', style: TextStyle(color: isDark ? AppColors.darkMuted : AppColors.gray500)),
        const SizedBox(height: 12),
        ..._answers.map((answer) => _buildQuestionCard(answer, isDark)),
      ],
    );
  }

  Widget _buildQuestionCard(_AuditQuestionAnswer answer, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : AppColors.gray50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? AppColors.darkCardBorder : AppColors.gray300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Paso ${answer.id}', style: TextStyle(color: isDark ? AppColors.darkMuted : AppColors.gray500, fontSize: 12)),
          const SizedBox(height: 4),
          Text(answer.label, style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          if (answer.responseType == 'yes_no')
            Wrap(
              spacing: 8,
              children: answer.options
                  .map(
                    (option) => ChoiceChip(
                      label: Text(option),
                      selected: answer.value == option,
                      onSelected: (_) => setState(() => answer.value = option),
                    ),
                  )
                  .toList(),
            )
          else if (answer.responseType == 'number')
            Slider(
              min: 1,
              max: 10,
              divisions: 9,
              value: (double.tryParse(answer.value ?? '5') ?? 5).clamp(1, 10),
              label: answer.value ?? '5',
              onChanged: (value) => setState(() => answer.value = value.round().toString()),
            )
          else
            TextField(
              onChanged: (value) => answer.value = value,
              decoration: const InputDecoration(hintText: 'Respuesta'),
            ),
        ],
      ),
    );
  }

  Widget _buildEvidenceStep(bool isDark) {
    return ListView(
      children: [
        const Text('Hallazgos y Evidencias', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 24)),
        const SizedBox(height: 4),
        Text('Registra comentarios y captura evidencias únicamente con fotos.', style: TextStyle(color: isDark ? AppColors.darkMuted : AppColors.gray500)),
        const SizedBox(height: 12),
        TextField(controller: _commentsController, maxLines: 4, decoration: const InputDecoration(labelText: 'Comentarios')),
        const SizedBox(height: 12),
        OutlinedButton.icon(onPressed: _openMiniCamera, icon: const Icon(Icons.add_a_photo_outlined), label: const Text('Agregar evidencia')),
        ..._evidenceFiles.asMap().entries.map(
          (entry) => ListTile(
            dense: true,
            contentPadding: EdgeInsets.zero,
            leading: Icon(entry.value.path.toLowerCase().endsWith('.mp4') ? Icons.videocam_outlined : Icons.image_outlined),
            title: Text(entry.value.uri.pathSegments.last, maxLines: 1, overflow: TextOverflow.ellipsis),
            trailing: IconButton(onPressed: () => setState(() => _evidenceFiles.removeAt(entry.key)), icon: const Icon(Icons.delete_outline)),
          ),
        ),
        CheckboxListTile(
          value: _locationCheck,
          onChanged: (value) => setState(() => _locationCheck = value ?? false),
          title: const Text('Verificación de ubicación'),
          subtitle: const Text('Confirmo que me encuentro físicamente en el sitio de auditoría.'),
          contentPadding: EdgeInsets.zero,
        ),
      ],
    );
  }

  Widget _buildSignatureStep(bool isDark) {
    return ListView(
      children: [
        const Text('Finalizar Auditoría', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 24)),
        const SizedBox(height: 4),
        Text('Firma y nombre del responsable del área.', style: TextStyle(color: isDark ? AppColors.darkMuted : AppColors.gray500)),
        const SizedBox(height: 12),
        Container(
          height: 210,
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), border: Border.all(color: isDark ? AppColors.darkCardBorder : AppColors.gray300), color: Colors.white),
          child: Signature(controller: _signatureController, backgroundColor: Colors.transparent),
        ),
        Align(alignment: Alignment.centerRight, child: TextButton(onPressed: _signatureController.clear, child: const Text('Limpiar firma'))),
        TextField(controller: _responsibleNameController, decoration: const InputDecoration(labelText: 'Nombre del Responsable')),
      ],
    );
  }

  Widget _buildFooter() {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: _step > 1 && !_isSubmitting ? () => setState(() => _step -= 1) : null,
            child: const Text('Anterior'),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: FilledButton(
            onPressed: _isSubmitting ? null : _next,
            child: Text(_step == 4 ? (_isSubmitting ? 'Finalizando...' : 'Finalizar auditoría') : 'Siguiente'),
          ),
        ),
      ],
    );
  }

  Future<void> _onStartAudit() async {
    try {
      setState(() {
        _error = null;
        _isSubmitting = true;
      });
      await _requestLocationPermission();
      final position = await _validatePhoneLocation();
      await _repository.startAudit(email: widget.email, auditId: widget.audit.id, latitude: position.latitude, longitude: position.longitude);
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

  Future<void> _next() async {
    if (_step == 1 && !_locationValidated) {
      setState(() => _error = 'Debes validar ubicación para continuar.');
      return;
    }
    if (_step == 2 && _answers.any((item) => item.required && (item.value == null || item.value!.trim().isEmpty))) {
      setState(() => _error = 'Debes responder todas las preguntas obligatorias.');
      return;
    }
    if (_step == 3 && !_locationCheck) {
      setState(() => _error = 'Debes marcar la verificación de ubicación para continuar.');
      return;
    }
    if (_step < 4) {
      setState(() {
        _error = null;
        _step += 1;
      });
      return;
    }
    await _finishAudit();
  }

  Future<void> _finishAudit() async {
    try {
      setState(() {
        _error = null;
        _isSubmitting = true;
      });
      _startUploadProgress();
      final signatureBytes = await _signatureController.toPngBytes();
      if (signatureBytes == null || signatureBytes.isEmpty) {
        throw Exception('Debes registrar la firma del responsable para finalizar.');
      }
      final responsibleName = _responsibleNameController.text.trim();
      if (responsibleName.isEmpty) {
        throw Exception('Debes registrar el nombre del responsable para finalizar.');
      }
      if (!_locationCheck) {
        throw Exception('Debes confirmar ubicación para finalizar la auditoría.');
      }

      final endPosition = await _validatePhoneLocation();
      final files = await Future.wait(
        _evidenceFiles.map((file) async {
          final fileName = file.uri.pathSegments.last;
          final mimeType = lookupMimeType(file.path) ?? lookupMimeType(fileName);
          final mimeParts = mimeType?.split('/');
          final mediaType = mimeParts != null && mimeParts.length == 2 ? MediaType(mimeParts[0], mimeParts[1]) : null;
          return http.MultipartFile.fromBytes('evidence_files', await file.readAsBytes(), filename: fileName, contentType: mediaType);
        }),
      );

      await _repository.completeAudit(
        email: widget.email,
        auditId: widget.audit.id,
        latitude: endPosition.latitude,
        longitude: endPosition.longitude,
        auditReport: {
          'answers': _answers
              .map((item) => {
                    'id': item.id,
                    'label': item.label,
                    'response_type': item.responseType,
                    'value': item.value ?? '',
                    'question_weight': item.questionWeight,
                    'response_scores': item.responseScores,
                  })
              .toList(growable: false),
          'comments': _commentsController.text.trim(),
          'location_verified': _locationCheck,
          'responsible_name': responsibleName,
          'responsible_signature': 'data:image/png;base64,${base64Encode(signatureBytes)}',
        },
        evidenceFiles: files,
      );

      _completeUploadProgress();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Auditoría finalizada correctamente.')));
      Navigator.of(context).pop(true);
    } catch (error) {
      _hideUploadProgress();
      if (!mounted) return;
      setState(() => _error = _toError(error));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _startUploadProgress() {
    _uploadTimer?.cancel();
    setState(() {
      _showUploadProgress = true;
      _uploadProgress = 0.08;
      _uploadStatus = 'Preparando evidencias y respuestas...';
    });
    _uploadTimer = Timer.periodic(const Duration(milliseconds: 450), (timer) {
      if (!mounted) return;
      setState(() {
        if (_uploadProgress < 0.35) {
          _uploadStatus = 'Subiendo evidencias a servidores seguros...';
        } else if (_uploadProgress < 0.7) {
          _uploadStatus = 'Procesando análisis de Trust AI...';
        } else {
          _uploadStatus = 'Cerrando auditoría y confirmando datos...';
        }
        _uploadProgress = (_uploadProgress + 0.05).clamp(0, 0.92);
      });
    });
  }

  void _completeUploadProgress() {
    _uploadTimer?.cancel();
    if (!mounted) return;
    setState(() {
      _uploadProgress = 1;
      _uploadStatus = 'Auditoría finalizada con éxito.';
    });
    Future.delayed(const Duration(milliseconds: 450), _hideUploadProgress);
  }

  void _hideUploadProgress() {
    _uploadTimer?.cancel();
    if (!mounted) return;
    setState(() {
      _showUploadProgress = false;
      _uploadProgress = 0;
      _uploadStatus = 'Preparando auditoría...';
    });
  }

  Future<void> _openMiniCamera() async {
    if (_evidenceFiles.length >= _maxEvidenceItems) {
      setState(() => _error = 'Solo puedes adjuntar hasta $_maxEvidenceItems evidencias.');
      return;
    }

    try {
      await _requestCameraPermissions();
      if (!mounted) return;
      final XFile? capturedFile = await showDialog<XFile>(context: context, barrierDismissible: false, builder: (_) => const _MiniCameraCaptureDialog());
      if (capturedFile == null) return;
      final selectedFile = await _compressPhoto(File(capturedFile.path));
      if (!mounted) return;
      setState(() => _evidenceFiles.add(selectedFile));
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = _toError(error));
    }
  }

  Future<File> _compressPhoto(File file) async {
    final compressed = await FlutterImageCompress.compressWithFile(file.absolute.path, quality: 70, minWidth: 1280, minHeight: 1280, format: CompressFormat.jpeg);
    if (compressed == null) {
      throw Exception('No se pudo comprimir la foto.');
    }
    final target = File('${file.path}_audit.jpg');
    await target.writeAsBytes(compressed, flush: true);
    if (await target.length() > _maxEvidenceBytes) {
      throw Exception('La foto comprimida supera 10MB.');
    }
    return target;
  }

  Future<void> _requestCameraPermissions() async {
    final status = await Permission.camera.request();
    if (!status.isGranted) {
      throw Exception('Debes otorgar permisos de cámara para continuar.');
    }
  }

  Future<void> _requestLocationPermission() async {
    var locationPermission = await Geolocator.checkPermission();
    if (locationPermission == LocationPermission.denied) {
      locationPermission = await Geolocator.requestPermission();
    }
    if (locationPermission == LocationPermission.denied || locationPermission == LocationPermission.deniedForever) {
      throw Exception('Debes otorgar permisos de ubicación para continuar.');
    }
  }

  Future<Position> _validatePhoneLocation() async {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) {
      throw Exception('Activa el servicio de ubicación para continuar.');
    }
    return Geolocator.getCurrentPosition(locationSettings: const LocationSettings(accuracy: LocationAccuracy.high));
  }

  String _toError(Object error) {
    final message = error.toString();
    return message.startsWith('Exception: ') ? message.replaceFirst('Exception: ', '') : message;
  }
}

class _AuditQuestionAnswer {
  _AuditQuestionAnswer({
    required this.id,
    required this.label,
    required this.responseType,
    required this.required,
    this.options = const <String>[],
    this.questionWeight = 0,
    this.responseScores = const <String, double>{},
  });

  final int id;
  final String label;
  final String responseType;
  final bool required;
  final List<String> options;
  final double questionWeight;
  final Map<String, double> responseScores;
  String? value;
}

class _MiniCameraCaptureDialog extends StatefulWidget {
  const _MiniCameraCaptureDialog();

  @override
  State<_MiniCameraCaptureDialog> createState() => _MiniCameraCaptureDialogState();
}

class _MiniCameraCaptureDialogState extends State<_MiniCameraCaptureDialog> {
  CameraController? _controller;
  bool _initializing = true;
  bool _capturing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _initCamera() async {
    try {
      final cameras = await availableCameras();
      final camera = cameras.first;
      final controller = CameraController(camera, ResolutionPreset.medium, enableAudio: false);
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
      setState(() => _capturing = true);
      Navigator.of(context).pop(await controller.takePicture());
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = 'No se pudo capturar evidencia: $error';
        _capturing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    final canCapture = !_initializing && !_capturing && controller != null && controller.value.isInitialized;
    return Dialog(
      child: SizedBox(
        width: double.infinity,
        height: MediaQuery.sizeOf(context).height * 0.82,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              Row(children: [Expanded(child: Text('Mini cámara (Foto)', style: const TextStyle(fontWeight: FontWeight.w700))), IconButton(onPressed: () => Navigator.of(context).pop(), icon: const Icon(Icons.close))]),
              Expanded(
                child: Center(
                  child: AspectRatio(
                    aspectRatio: 9 / 16,
                    child: _initializing
                        ? const Center(child: CircularProgressIndicator())
                        : _error != null
                            ? Center(child: Text(_error!, textAlign: TextAlign.center))
                            : CameraPreview(controller!),
                  ),
                ),
              ),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: canCapture ? _capture : null,
                  icon: const Icon(Icons.camera_alt_outlined),
                  label: const Text('Tomar foto'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
